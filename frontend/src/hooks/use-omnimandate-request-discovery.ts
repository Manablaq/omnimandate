"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  discoverOmniMandateRequestPage,
  type OmniMandateSpendRequest,
  type VaultScanRange,
} from "@/lib/omnimandate-reads";

export type OmniMandateRequestDiscoveryState =
  | "idle"
  | "loading"
  | "success"
  | "partial"
  | "error";

type RequestDiscoveryData = {
  scopeKey: string;
  scannedRequests: OmniMandateSpendRequest[];
  requests: OmniMandateSpendRequest[];
  scannedRange: VaultScanRange | null;
  totalRequestCount: bigint;
  isComplete: boolean;
};

type Options = {
  enabled: boolean;
  vaultIds: readonly bigint[];
};

function mergeRequests(
  existing: readonly OmniMandateSpendRequest[],
  page: readonly OmniMandateSpendRequest[],
  reset: boolean,
) {
  const byId = new Map<bigint, OmniMandateSpendRequest>();
  if (!reset) existing.forEach((request) => byId.set(request.id, request));
  page.forEach((request) => byId.set(request.id, request));
  return [...byId.values()].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
}

export function useOmniMandateRequestDiscovery({ enabled, vaultIds }: Options) {
  const scopeKey = [...new Set(vaultIds.map((id) => id.toString()))]
    .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0))
    .join(",");

  const [state, setState] = useState<OmniMandateRequestDiscoveryState>("idle");
  const [data, setData] = useState<RequestDiscoveryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const dataRef = useRef<RequestDiscoveryData | null>(null);
  const pendingStart = useRef(BigInt(1));

  const canRead = enabled && scopeKey.length > 0;

  const setDiscoveryData = useCallback((next: RequestDiscoveryData | null) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const readPage = useCallback(async (startId: bigint, reset: boolean) => {
    if (!canRead) return;

    const currentRequest = ++requestId.current;
    pendingStart.current = startId;
    setState("loading");
    setError(null);

    try {
      const page = await discoverOmniMandateRequestPage(startId);
      if (requestId.current !== currentRequest) return;

      const previous =
        !reset && dataRef.current?.scopeKey === scopeKey ? dataRef.current : null;
      const scannedRequests = mergeRequests(
        previous?.scannedRequests ?? [],
        page.requests,
        reset,
      );

      const allowedVaultIds = new Set(scopeKey.split(",").filter(Boolean));
      const requests = scannedRequests
        .filter((request) => allowedVaultIds.has(request.vaultId.toString()))
        .sort((left, right) =>
          left.id > right.id ? -1 : left.id < right.id ? 1 : 0
        );

      const endId =
        page.scannedRange?.endId ??
        previous?.scannedRange?.endId ??
        BigInt(0);
      const scannedRange =
        endId > BigInt(0) ? { startId: BigInt(1), endId } : null;
      const isComplete = endId >= page.totalRequestCount;

      const nextData: RequestDiscoveryData = {
        scopeKey,
        scannedRequests,
        requests,
        scannedRange,
        totalRequestCount: page.totalRequestCount,
        isComplete,
      };

      setDiscoveryData(nextData);
      setState(isComplete ? "success" : "partial");
    } catch {
      if (requestId.current !== currentRequest) return;
      setState("error");
      setError(
        "Request discovery could not be completed from Bradbury right now. Retry this page.",
      );
    }
  }, [canRead, scopeKey, setDiscoveryData]);

  const refresh = useCallback(async () => {
    setDiscoveryData(null);
    await readPage(BigInt(1), true);
  }, [readPage, setDiscoveryData]);

  const retry = useCallback(async () => {
    await readPage(pendingStart.current, pendingStart.current === BigInt(1));
  }, [readPage]);

  const loadNextPage = useCallback(async () => {
    const previous = dataRef.current;
    if (!previous || previous.scopeKey !== scopeKey || previous.isComplete) return;
    if (!previous.scannedRange) return;
    await readPage(previous.scannedRange.endId + BigInt(1), false);
  }, [readPage, scopeKey]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (canRead) {
        setDiscoveryData(null);
        void readPage(BigInt(1), true);
        return;
      }

      if (requestId.current !== currentRequest) return;
      setDiscoveryData(null);
      setError(null);
      setState("idle");
      pendingStart.current = BigInt(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canRead, readPage, scopeKey, setDiscoveryData]);

  const currentData = data?.scopeKey === scopeKey ? data : null;

  return {
    state,
    data: currentData,
    error,
    requests: currentData?.requests ?? [],
    scannedRange: currentData?.scannedRange ?? null,
    totalRequestCount: currentData?.totalRequestCount ?? null,
    isComplete: currentData?.isComplete ?? false,
    refresh,
    retry,
    loadNextPage,
  };
}
