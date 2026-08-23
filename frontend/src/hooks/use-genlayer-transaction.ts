"use client";

import { ExecutionResult, TransactionStatus, type Hash } from "genlayer-js/types";
import { useCallback, useRef, useState } from "react";
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
  const operationId = useRef(0);

  const reset = useCallback(() => {
    operationId.current += 1;
    setState("idle");
    setTransactionHash(null);
    setError(null);
  }, []);

  const monitorFinalization = useCallback(
    async (writeClient: GenLayerWriteClient, hash: Hash, id: number) => {
      try {
        const finalizedReceipt = await writeClient.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 5000,
          retries: 900,
        });

        if (operationId.current !== id) return;

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
        if (operationId.current !== id) return;
        setState("accepted");
        setError(null);
      }
    },
    [],
  );

  const submit = useCallback(
    async ({ writeClient, request }: SubmitTransactionOptions) => {
      const id = operationId.current + 1;
      operationId.current = id;

      setState("awaiting_wallet");
      setTransactionHash(null);
      setError(null);

      let hash: Hash;
      try {
        hash = (await writeClient.writeContract(request)) as Hash;
      } catch (caughtError) {
        if (operationId.current !== id) return false;
        setState("error");
        setError(submissionError(caughtError));
        return false;
      }

      if (operationId.current !== id) return false;
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
        if (operationId.current !== id) return false;
        setState("consensus");
        setError(
          "Transaction submitted to Bradbury and is still processing. Its transaction hash remains valid.",
        );
        return false;
      }

      if (operationId.current !== id) return false;

      // waitForTransactionReceipt({ status: ACCEPTED }) is itself the acceptance
      // gate. Do not compare receipt.statusName back to the enum here: the SDK
      // receipt representation can differ from the requested enum value. If the
      // waiter resolves, Bradbury has reached at least the requested ACCEPTED
      // lifecycle state.
      if (
        acceptedReceipt.txExecutionResultName ===
        ExecutionResult.FINISHED_WITH_ERROR
      ) {
        setState("error");
        setError("The contract execution failed.");
        return false;
      }

      setState("accepted");
      setError(null);
      void monitorFinalization(writeClient, hash, id);
      return true;
    },
    [monitorFinalization],
  );

  return { state, transactionHash, error, reset, submit };
}
