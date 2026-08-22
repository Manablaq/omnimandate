"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export function DashboardShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [38, -38]);
  const reduceMotion = useReducedMotion();
  return (
    <section ref={sectionRef} className="showcase-section" aria-labelledby="showcase-title">
      <div className="section showcase-intro"><span className="eyebrow">One operating surface</span><h2 id="showcase-title">The treasury view,<br />without the guesswork.</h2><p>Built to keep the live work legible: vault policy, a request’s place in the workflow, and the journey to finality.</p></div>
      <motion.div className="dashboard-wrap" style={reduceMotion ? undefined : { y }}>
        <div className="dashboard-mockup">
          <div className="dashboard-mockup__side"><div className="mock-mark"><i /><i /><i /></div><span className="active">Overview</span><span>Vaults</span><span>Requests</span><span>Mandates</span><span>Evidence</span><span>Activity</span></div>
          <div className="dashboard-mockup__main">
            <div className="mock-top"><span>Operations / Overview</span><div className="mock-top__meta"><span className="mock-preview-label">INTERFACE PREVIEW</span><span className="mock-network"><i /> Bradbury</span></div></div>
            <div className="mock-title"><div><small>VAULT OVERVIEW</small><h3>Operating treasury</h3></div><span className="mock-tag">MANDATE —</span></div>
            <div className="mock-metrics"><div><small>AVAILABLE</small><b>—</b><em>Connect wallet to view</em></div><div><small>RESERVED</small><b>—</b><em>Awaiting account access</em></div><div><small>CLAIMABLE</small><b>—</b><em>Awaiting account access</em></div></div>
            <div className="mock-request"><div className="mock-request__heading"><span><i /> REQUEST WORKFLOW</span><small>PREPARE → FINALIZED</small></div><div className="mock-request__body"><div><strong>Illustrative request</strong><p>Workflow and evidence states shown for layout only</p></div><div className="mock-journey"><i /><i /><i /><i /><i /></div><span className="mock-status">EXAMPLE STATE</span></div></div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
