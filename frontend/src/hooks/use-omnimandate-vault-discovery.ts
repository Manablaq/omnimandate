"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import {
  calculateOwnedVaultAggregates,
  discoverOmniMandateVaultPage,
  type OmniMandateVault,
  type VaultScanRange,
} from "@/lib/omnimandate-reads";

export type OmniMandateVaultDiscoveryState = "idle" | "loading" | "success" | "partial" | "error";

type VaultDiscoveryData = {
  account: Address;
  ownedVaults: OmniMandateVault[];
  agentVaults: OmniMandateVault[];
  scannedVaults: OmniMandateVault[];
  scannedCount: bigint;
  scannedRange: VaultScanRange | null;
  currentPageRange: VaultScanRange | null;
  totalVaultCount: bigint;
  isComplete: boolean;
};

type UseOmniMandateVaultDiscoveryOptions = {
  address: Address | null;
  enabled: boolean;
};

type PendingPage = {
  startId: bigint;
  reset: boolean;
};

function classifyVaults(vaults: readonly OmniMandateVault[], account: Address) {
  const normalizedAccount = account.toLowerCase();
  const ownedVaults = vaults.filter((vault) => vault.owner.toLowerCase() === normalizedAccount);
  const agentVaults = vaults.filter((vault) => (
    vault.owner.toLowerCase() !== normalizedAccount
    && vault.authorizedAgent.toLowerCase() === normalizedAccount
  ));

  return { ownedVaults, agentVaults };
}

function mergeVaults(
  existingVaults: readonly OmniMandateVault[],
  pageVaults: readonly OmniMandateVault[],
  reset: boolean,
) {
  const byId = new Map<bigint, OmniMandateVault>();
  if (!reset) {
    existingVaults.forEach((vault) => byId.set(vault.id, vault));
  }
  pageVaults.forEach((vault) => byId.set(vault.id, vault));

  return [...byId.values()].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

export function useOmniMandateVaultDiscovery({ address, enabled }: UseOmniMandateVaultDiscoveryOptions) {
  const [state, setState] = useState<OmniMandateVaultDiscoveryState>("idle");
  const [data, setData] = useState<VaultDiscoveryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const dataRef = useRef<VaultDiscoveryData | null>(null);
  const pendingPageRef = useRef<PendingPage>({ startId: BigInt(1), reset: true });
  const canRead = enabled && address !== null;

  const setDiscoveryData = useCallback((nextData: VaultDiscoveryData | null) => {
    dataRef.current = nextData;
    setData(nextData);
  }, []);

  const readPage = useCallback(async (startId: bigint, reset: boolean) => {
    if (!canRead || !address) return;

    const currentRequest = ++requestId.current;
    pendingPageRef.current = { startId, reset };
    setState("loading");
    setError(null);

    try {
      const page = await discoverOmniMandateVaultPage(address, startId);
      if (requestId.current !== currentRequest) return;

      const previousData = reset ? null : dataRef.current;
      const scannedVaults = mergeVaults(previousData?.scannedVaults ?? [], page.vaults, reset);
      const { ownedVaults, agentVaults } = classifyVaults(scannedVaults, address);
      const endId = page.scannedRange?.endId ?? previousData?.scannedRange?.endId ?? BigInt(0);
      const scannedRange = endId > BigInt(0) ? { startId: BigInt(1), endId } : null;
      const isComplete = endId >= page.totalVaultCount;
      const nextData: VaultDiscoveryData = {
        account: address,
        ownedVaults,
        agentVaults,
        scannedVaults,
        scannedCount: BigInt(scannedVaults.length),
        scannedRange,
        currentPageRange: page.scannedRange,
        totalVaultCount: page.totalVaultCount,
        isComplete,
      };

      setDiscoveryData(nextData);
      setState(isComplete ? "success" : "partial");
    } catch {
      if (requestId.current !== currentRequest) return;
      setError("Vault discovery could not be completed from Bradbury right now. Retry to scan this page again.");
      setState("error");
    }
  }, [address, canRead, setDiscoveryData]);

  const startDiscovery = useCallback(async () => {
    pendingPageRef.current = { startId: BigInt(1), reset: true };
    await readPage(BigInt(1), true);
  }, [readPage]);

  const refresh = useCallback(async () => {
    // Refresh deliberately starts a fresh bounded discovery. Retaining older
    // pages here could make complete aggregates combine fresh and stale data.
    setDiscoveryData(null);
    await readPage(BigInt(1), true);
  }, [readPage, setDiscoveryData]);

  const loadNextPage = useCallback(async () => {
    const previousData = dataRef.current;
    if (!previousData || previousData.account.toLowerCase() !== address?.toLowerCase()) return;
    const previousRange = previousData.scannedRange;
    if (!previousRange || previousData.isComplete) return;

    await readPage(previousRange.endId + BigInt(1), false);
  }, [address, readPage]);

  const retry = useCallback(async () => {
    const pendingPage = pendingPageRef.current;
    await readPage(pendingPage.startId, pendingPage.reset);
  }, [readPage]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (canRead) {
        void startDiscovery();
        return;
      }

      if (requestId.current !== currentRequest) return;
      setDiscoveryData(null);
      setError(null);
      setState("idle");
      pendingPageRef.current = { startId: BigInt(1), reset: true };
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canRead, setDiscoveryData, startDiscovery]);

  // Do not expose prior-account in-memory data while a new wallet is loading.
  const currentData = data?.account.toLowerCase() === address?.toLowerCase() ? data : null;
  const aggregates = currentData?.isComplete
    ? calculateOwnedVaultAggregates(currentData.ownedVaults)
    : null;

  return {
    state,
    data: currentData,
    error,
    ownedVaults: currentData?.ownedVaults ?? [],
    agentVaults: currentData?.agentVaults ?? [],
    scannedCount: currentData?.scannedCount ?? BigInt(0),
    scannedRange: currentData?.scannedRange ?? null,
    totalVaultCount: currentData?.totalVaultCount ?? null,
    isComplete: currentData?.isComplete ?? false,
    aggregates,
    refresh,
    loadNextPage,
    retry,
  };
}
