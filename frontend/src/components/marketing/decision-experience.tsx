"use client";

import { ChevronDown, Check, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

type DecisionCardProps = { kind: "approved" | "denied"; title: string; explanation: string; policy: string; icon: React.ReactNode };

function DecisionCard({ kind, title, explanation, policy, icon }: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const approved = kind === "approved";
  return (
    <motion.article className={`decision-card decision-card--${kind}`} initial={reduceMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.55 }}>
      <div className="decision-card__head"><span className="decision-card__icon">{icon}</span><span className="technical-label">decision / {approved ? "001" : "002"}</span></div>
      <div className="decision-card__result"><strong>{approved ? "APPROVED" : "DENIED"}</strong><span>{title}</span></div>
      <p>{explanation}</p>
      <button className="disclosure-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        Technical decision record <ChevronDown size={16} className={expanded ? "is-open" : ""} />
      </button>
      <motion.div className="decision-card__details" initial={false} animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
        <div><span>Policy</span><b>{policy}</b></div><div><span>Evidence</span><b>CORROBORATED</b></div><div><span>Finality</span><b>FINALIZED</b></div>
      </motion.div>
    </motion.article>
  );
}

export function DecisionExperience() {
  return (
    <section className="section decision-section" aria-labelledby="decision-title">
      <div className="section-heading section-heading--split"><div><span className="eyebrow">Decision experience</span><h2 id="decision-title">Plain-English outcomes.<br />Inspectable reasoning.</h2></div><p>OmniMandate gives people a clear answer first. The underlying policy and evidence record remains available when they need to understand why.</p></div>
      <div className="decision-grid">
        <DecisionCard kind="approved" icon={<Check size={18} />} title="Verified API-service expense" explanation="The request matched the allowed operating category and stayed inside the mandate’s limits. Its supporting record was corroborated before settlement." policy="COMPLIANT" />
        <DecisionCard kind="denied" icon={<X size={18} />} title="Personal gaming entertainment" explanation="The evidence was available, but the expense did not match the vault’s permitted business purpose. Funds remain protected by the mandate." policy="NON_COMPLIANT" />
      </div>
    </section>
  );
}
