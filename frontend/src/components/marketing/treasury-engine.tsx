"use client";

import { motion, useReducedMotion } from "motion/react";

const nodes = ["Vault", "Mandate", "Evidence", "Validator consensus", "Settlement"];

export function TreasuryEngine() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="engine" aria-label="Treasury workflow: vault, mandate, evidence, validator consensus, settlement">
      <div className="engine__topline"><span>OmniMandate / decision engine</span><span className="engine__live"><i /> constrained intelligence</span></div>
      <div className="engine__grid" />
      <div className="engine__nodes">
        {nodes.map((node, index) => (
          <div className="engine__node-wrap" key={node}>
            <motion.div
              className={`engine__node engine__node--${index}`}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.12 + 0.15 }}
            >
              <span className="engine__node-index">0{index + 1}</span>
              <strong>{node}</strong>
              <em>{index === 0 ? "Treasury boundary" : index === 1 ? "Operating rules" : index === 2 ? "Exact record" : index === 3 ? "Recomputed" : "Finality-aware"}</em>
            </motion.div>
            {index < nodes.length - 1 && <div className="engine__connector" aria-hidden="true"><motion.i animate={reduceMotion ? {} : { x: [0, 18, 0], opacity: [0.25, 1, 0.25] }} transition={{ duration: 2.5, repeat: Infinity, delay: index * 0.2 }} /></div>}
          </div>
        ))}
      </div>
      <div className="engine__footer"><span>MANDATE_ID · 05F1…9B2A</span><span>DECISION / FINAL</span></div>
    </div>
  );
}
