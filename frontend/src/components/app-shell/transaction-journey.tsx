"use client";

import { Check, CircleDotDashed, Send, WalletCards } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { TransactionState } from "@/hooks/use-genlayer-transaction";

const journey = [
  ["Prepare", CircleDotDashed],
  ["Wallet confirmation", WalletCards],
  ["Submitted", Send],
  ["Consensus", CircleDotDashed],
  ["Accepted", Check],
  ["Finalized", Check],
];

const stepStates: Record<TransactionState, number> = {
  idle: -1,
  awaiting_wallet: 1,
  submitted: 2,
  consensus: 3,
  accepted: 4,
  finalized: 5,
  error: -1,
};

type TransactionJourneyProps = {
  state?: TransactionState;
  transactionHash?: string | null;
  error?: string | null;
  compact?: boolean;
};

export function TransactionJourney({ state = "idle", transactionHash = null, error = null, compact = false }: TransactionJourneyProps) {
  const reduceMotion = useReducedMotion();
  const activeStep = stepStates[state];
  const title = state === "idle" ? "Awaiting a transaction" : state === "finalized" ? "Transaction finalized" : state === "error" ? "Transaction needs attention" : "Create vault in progress";
  const status = state.replaceAll("_", " ").toUpperCase();
  const detail = state === "accepted"
    ? "Accepted on Bradbury. The dashboard has been refreshed, but this transaction is still inside the finality window."
    : state === "consensus"
      ? "Consensus is in progress. Submitted is not final."
      : state === "finalized"
        ? "Finalized means the contract call completed successfully and is irreversible."
      : state === "error"
        ? error ?? "The transaction did not complete."
        : state === "idle"
          ? "This shared view will show the path from preparation to network finality once transactions are connected."
          : "Submitted is not final, and accepted is not irreversible.";

  return (
    <div className={`transaction-journey${compact ? " transaction-journey--compact" : ""}`} aria-label="Transaction journey: Prepare, Wallet confirmation, Submitted, Consensus, Accepted, Finalized">
      <div className="transaction-journey__top"><div><span className="technical-label">Transaction journey</span><h3>{title}</h3></div><span className={`journey-pending${state === "error" ? " journey-pending--error" : state === "finalized" ? " journey-pending--success" : ""}`}>{status}</span></div>
      <div className="journey-track">
        {journey.map(([label, Icon], index) => { const StepIcon = Icon as typeof Check; const isComplete = index < activeStep || (state === "finalized" && index <= activeStep); const isCurrent = index === activeStep && state !== "finalized"; return <div className={`journey-step${isComplete ? " is-complete" : ""}${isCurrent ? " is-current" : ""}`} key={label as string}><motion.span initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }}><StepIcon size={15} /></motion.span><b>{label as string}</b>{index < journey.length - 1 && <i />}</div>; })}
      </div>
      {transactionHash && <p className="transaction-journey__hash">Transaction: {transactionHash}</p>}
      <p>{detail}</p>
    </div>
  );
}
