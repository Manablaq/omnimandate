"use client";

import { Check, CircleDotDashed, Send, WalletCards } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const journey = [
  ["Prepare", CircleDotDashed],
  ["Wallet confirmation", WalletCards],
  ["Submitted", Send],
  ["Consensus", CircleDotDashed],
  ["Accepted", Check],
  ["Finalized", Check],
];

export function TransactionJourney() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="transaction-journey" aria-label="Transaction journey: Prepare, Wallet confirmation, Submitted, Consensus, Accepted, Finalized">
      <div className="transaction-journey__top"><div><span className="technical-label">Transaction journey</span><h3>Awaiting a transaction</h3></div><span className="journey-pending">NOT STARTED</span></div>
      <div className="journey-track">
        {journey.map(([label, Icon], index) => { const StepIcon = Icon as typeof Check; return <div className="journey-step" key={label as string}><motion.span initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }}><StepIcon size={15} /></motion.span><b>{label as string}</b>{index < journey.length - 1 && <i />}</div>; })}
      </div>
      <p>This shared view will show the path from preparation to network finality once transactions are connected.</p>
    </div>
  );
}
