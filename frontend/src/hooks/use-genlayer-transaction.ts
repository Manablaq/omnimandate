"use client";

import { ExecutionResult, TransactionStatus, type Hash } from "genlayer-js/types";
import { useCallback, useState } from "react";
import type { GenLayerWriteClient } from "@/components/wallet/wallet-provider";

export type TransactionState =
  | "idle"
  | "awaiting_wallet"
  | "submitted"
  | "consensus"
  | "accepted"
  | "finalized"
  | "error";

type WriteContractRequest = Parameters<GenLayerWriteClient["writeContract"]>[0];

type SubmitTransactionOptions = {
  writeClient: GenLayerWriteClient;
  request: WriteContractRequest;
};

function submissionError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === 4001) return "Wallet confirmation was declined.";
  return "The transaction was not submitted. Check your wallet and try again.";
}

export function useGenLayerTransaction() {
  const [state, setState] = useState<TransactionState>("idle");
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTransactionHash(null);
    setError(null);
  }, []);

  const monitorFinalization = useCallback(
    async (writeClient: GenLayerWriteClient, hash: Hash) => {
      try {
        const finalizedReceipt = await writeClient.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 5000,
          retries: 900,
        });

        if (
          finalizedReceipt.txExecutionResultName !==
          ExecutionResult.FINISHED_WITH_RETURN
        ) {
          setState("error");
          setError(
            "The transaction finalized, but the contract execution did not complete successfully.",
          );
          return;
        }

        setState("finalized");
        setError(null);
      } catch {
        // A receipt-monitor timeout/network interruption is not a chain failure.
        // Keep the truthful ACCEPTED state instead of falsely reporting an error.
        setState("accepted");
        setError(null);
      }
    },
    [],
  );

  const submit = useCallback(
    async ({ writeClient, request }: SubmitTransactionOptions) => {
      setState("awaiting_wallet");
      setTransactionHash(null);
      setError(null);

      let hash: Hash;

      try {
        hash = (await writeClient.writeContract(request)) as Hash;
      } catch (caughtError) {
        setState("error");
        setError(submissionError(caughtError));
        return false;
      }

      setTransactionHash(hash);
      setState("submitted");

      let acceptedReceipt;

      try {
        setState("consensus");
        acceptedReceipt = await writeClient.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.ACCEPTED,
          interval: 3000,
          retries: 240,
        });
      } catch {
        setState("consensus");
        setError(
          "Transaction submitted to Bradbury and still processing. Its transaction hash remains valid.",
        );
        return false;
      }

      if (acceptedReceipt.statusName === TransactionStatus.FINALIZED) {
        if (
          acceptedReceipt.txExecutionResultName !==
          ExecutionResult.FINISHED_WITH_RETURN
        ) {
          setState("error");
          setError(
            "The transaction finalized, but the contract execution did not complete successfully.",
          );
          return false;
        }

        setState("finalized");
        setError(null);
        return true;
      }

      if (acceptedReceipt.statusName !== TransactionStatus.ACCEPTED) {
        setState("consensus");
        setError(
          "Transaction submitted to Bradbury and is still progressing toward acceptance.",
        );
        return false;
      }

      if (
        acceptedReceipt.txExecutionResultName ===
        ExecutionResult.FINISHED_WITH_ERROR
      ) {
        setState("error");
        setError("The contract execution failed before finalization.");
        return false;
      }

      setState("accepted");
      setError(null);

      // Return control to the UI immediately at ACCEPTED so it can refresh
      // contract state without waiting through Bradbury's finality window.
      void monitorFinalization(writeClient, hash);
      return true;
    },
    [monitorFinalization],
  );

  return { state, transactionHash, error, reset, submit };
}
