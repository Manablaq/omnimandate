import type { Address } from "viem";
import { TransactionHashVariant } from "genlayer-js/types";
import { OMNIMANDATE_CONTRACT_ADDRESS, genlayerReadClient } from "@/lib/genlayer";

export type OmniMandateOverview = {
  vaultCount: bigint;
  mandateCount: bigint;
  requestCount: bigint;
  claimable: bigint;
};

// genlayer-js 1.1.8 exposes read state selection as transactionHashVariant,
// rather than the README's undocumented stateStatus field. latest-final is the
// SDK's final-state variant; it is not an accepted/non-final read.
const finalizedReadOptions = {
  address: OMNIMANDATE_CONTRACT_ADDRESS,
  jsonSafeReturn: false,
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
