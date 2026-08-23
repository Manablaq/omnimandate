import { getAddress, isAddress, type Address } from "viem";
import { TransactionHashVariant } from "genlayer-js/types";
import { OMNIMANDATE_CONTRACT_ADDRESS, genlayerReadClient } from "@/lib/genlayer";

export const VAULT_SCAN_PAGE_SIZE = 100;
export const VAULT_READ_BATCH_SIZE = 10;
export const VAULT_READ_CONCURRENCY = 5;

export type OmniMandateOverview = {
  vaultCount: bigint;
  mandateCount: bigint;
  requestCount: bigint;
  claimable: bigint;
};

export type OmniMandateVaultStatus = "ACTIVE" | "PAUSED";

export type OmniMandateVault = {
  id: bigint;
  owner: Address;
  authorizedAgent: Address;
  title: string;
  balance: bigint;
  reservedBalance: bigint;
  lifetimeSpent: bigint;
  currentPeriodSpent: bigint;
  currentPeriodReserved: bigint;
  periodStartedAt: bigint;
  periodSeconds: bigint;
  activeMandateId: bigint;
  activeMandateVersion: bigint;
  status: OmniMandateVaultStatus;
  createdAt: string;
};

export type VaultScanRange = {
  startId: bigint;
  endId: bigint;
};

export type OmniMandateVaultPage = {
  totalVaultCount: bigint;
  scannedRange: VaultScanRange | null;
  vaults: OmniMandateVault[];
  ownedVaults: OmniMandateVault[];
  agentVaults: OmniMandateVault[];
  isComplete: boolean;
};

// genlayer-js 1.1.8 exposes read state selection as transactionHashVariant,
// rather than the README's undocumented stateStatus field. latest-final is the
// SDK's final-state variant; it is not an accepted/non-final read.
const finalizedReadOptions = {
  address: OMNIMANDATE_CONTRACT_ADDRESS,
  transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
};

function requireUint256(value: unknown, functionName: string): bigint {
  if (typeof value !== "bigint") {
    throw new Error(`${functionName} returned an unexpected value type.`);
  }

  return value;
}

async function readUint256(functionName: string, args: readonly (string | bigint)[] = []) {
  const result = await genlayerReadClient.readContract({
    ...finalizedReadOptions,
    jsonSafeReturn: false,
    functionName,
    args: [...args],
  });

  return requireUint256(result, functionName);
}

export async function readOmniMandateOverview(account: Address): Promise<OmniMandateOverview> {
  const [vaultCount, mandateCount, requestCount, claimable] = await Promise.all([
    readUint256("get_vault_count"),
    readUint256("get_mandate_count"),
    readUint256("get_request_count"),
    readUint256("get_claimable", [account]),
  ]);

  return { vaultCount, mandateCount, requestCount, claimable };
}

function requireRecord(value: unknown, functionName: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${functionName} returned an unexpected value type.`);
  }

  return value as Record<string, unknown>;
}

function requireStringField(record: Record<string, unknown>, field: string, functionName: string) {
  const value = record[field];
  if (typeof value !== "string") {
    throw new Error(`${functionName} returned an invalid ${field} field.`);
  }

  return value;
}

function requireAddressField(record: Record<string, unknown>, field: string, functionName: string): Address {
  const value = requireStringField(record, field, functionName);
  if (!isAddress(value)) {
    throw new Error(`${functionName} returned an invalid ${field} address.`);
  }

  return getAddress(value);
}

function requireUint256Field(record: Record<string, unknown>, field: string, functionName: string): bigint {
  const value = record[field];
  if (typeof value === "bigint" && value >= BigInt(0)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);

  throw new Error(`${functionName} returned an invalid ${field} field.`);
}

function requireVaultStatus(record: Record<string, unknown>, functionName: string): OmniMandateVaultStatus {
  const status = requireStringField(record, "status", functionName);
  if (status !== "ACTIVE" && status !== "PAUSED") {
    throw new Error(`${functionName} returned an invalid status field.`);
  }

  return status;
}

function toVault(id: bigint, value: unknown): OmniMandateVault {
  const functionName = "get_vault";
  const record = requireRecord(value, functionName);

  return {
    id,
    owner: requireAddressField(record, "owner", functionName),
    authorizedAgent: requireAddressField(record, "authorized_agent", functionName),
    title: requireStringField(record, "title", functionName),
    balance: requireUint256Field(record, "balance", functionName),
    reservedBalance: requireUint256Field(record, "reserved_balance", functionName),
    lifetimeSpent: requireUint256Field(record, "lifetime_spent", functionName),
    currentPeriodSpent: requireUint256Field(record, "current_period_spent", functionName),
    currentPeriodReserved: requireUint256Field(record, "current_period_reserved", functionName),
    periodStartedAt: requireUint256Field(record, "period_started_at", functionName),
    periodSeconds: requireUint256Field(record, "period_seconds", functionName),
    activeMandateId: requireUint256Field(record, "active_mandate_id", functionName),
    activeMandateVersion: requireUint256Field(record, "active_mandate_version", functionName),
    status: requireVaultStatus(record, functionName),
    createdAt: requireStringField(record, "created_at", functionName),
  };
}

async function readVault(id: bigint): Promise<OmniMandateVault> {
  // Structured GenVM values are JSON-safe only when returned with this option.
  // Numeric fields are validated and converted back to bigint in toVault.
  const result = await genlayerReadClient.readContract({
    ...finalizedReadOptions,
    jsonSafeReturn: true,
    functionName: "get_vault",
    args: [id],
  });

  return toVault(id, result);
}

async function readVaultBatch(ids: readonly bigint[]): Promise<OmniMandateVault[]> {
  const results = new Array<OmniMandateVault>(ids.length);
  let nextIndex = 0;
  const workerCount = Math.min(VAULT_READ_CONCURRENCY, ids.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < ids.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await readVault(ids[index]);
    }
  }));

  return results;
}

async function readVaultsBounded(ids: readonly bigint[]): Promise<OmniMandateVault[]> {
  const vaults: OmniMandateVault[] = [];

  for (let offset = 0; offset < ids.length; offset += VAULT_READ_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + VAULT_READ_BATCH_SIZE);
    vaults.push(...await readVaultBatch(batch));
  }

  return vaults;
}

function sameAddress(left: Address, right: Address) {
  return left.toLowerCase() === right.toLowerCase();
}

export async function discoverOmniMandateVaultPage(
  account: Address,
  startId = BigInt(1),
): Promise<OmniMandateVaultPage> {
  const totalVaultCount = await readUint256("get_vault_count");
  if (startId < BigInt(1) || startId > totalVaultCount) {
    return {
      totalVaultCount,
      scannedRange: null,
      vaults: [],
      ownedVaults: [],
      agentVaults: [],
      isComplete: startId > totalVaultCount,
    };
  }

  const endId = startId + BigInt(VAULT_SCAN_PAGE_SIZE - 1) > totalVaultCount
    ? totalVaultCount
    : startId + BigInt(VAULT_SCAN_PAGE_SIZE - 1);
  const ids = Array.from({ length: Number(endId - startId + BigInt(1)) }, (_, index) => startId + BigInt(index));
  const vaults = await readVaultsBounded(ids);
  const ownedVaults = vaults.filter((vault) => sameAddress(vault.owner, account));
  const agentVaults = vaults.filter((vault) => (
    !sameAddress(vault.owner, account) && sameAddress(vault.authorizedAgent, account)
  ));

  return {
    totalVaultCount,
    scannedRange: { startId, endId },
    vaults,
    ownedVaults,
    agentVaults,
    isComplete: endId === totalVaultCount,
  };
}

export function calculateOwnedVaultAggregates(vaults: readonly OmniMandateVault[]) {
  return vaults.reduce((totals, vault) => ({
    availableTreasury: totals.availableTreasury + (vault.balance - vault.reservedBalance),
    reserved: totals.reserved + vault.reservedBalance,
    lifetimeSpent: totals.lifetimeSpent + vault.lifetimeSpent,
  }), {
    availableTreasury: BigInt(0),
    reserved: BigInt(0),
    lifetimeSpent: BigInt(0),
  });
}
