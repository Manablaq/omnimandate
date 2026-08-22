import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, FileCheck2, Fingerprint, LockKeyhole, Network, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { TreasuryEngine } from "@/components/marketing/treasury-engine";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DecisionExperience } from "@/components/marketing/decision-experience";
import { DashboardShowcase } from "@/components/marketing/dashboard-showcase";
import { documentation } from "@/components/marketing/data";
import { OmniMark } from "@/components/ui/omni-mark";

const productCards = [
  [Scale, "Policy-bound execution", "Turn operational intent into a spending boundary. The rules are established before a request is ever evaluated."],
  [Fingerprint, "Hash-bound evidence", "Anchor the exact supporting record used in a decision, so the evidence trail remains precise and reviewable."],
  [Network, "Consensus-controlled settlement", "Independent validator recomputation informs a decision before deterministic contract logic handles reservation and settlement."],
];

const verification = ["deployment", "approval path", "denial path", "finalized external withdrawal"];

export default function Home() {
  return (
    <main className="marketing-page">
      <MarketingNav />
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__ambient hero__ambient--one" /><div className="hero__ambient hero__ambient--two" />
        <div className="hero__copy">
          <span className="eyebrow eyebrow--light"><i /> Intelligent treasury control</span>
          <h1 id="hero-title">Autonomous spending.<br /><em>Bound by your mandate.</em></h1>
          <p>OmniMandate gives teams a way to let approved work move forward without giving up the rules. Every spend request is evaluated against the boundary you define.</p>
          <div className="hero__actions"><Link className="button button--ivory" href="/app">Launch OmniMandate <ArrowUpRight size={16} /></Link><a className="text-link text-link--light" href="#how-it-works">See how it works <ArrowDownRight size={17} /></a></div>
        </div>
        <TreasuryEngine />
        <div className="hero__bottom"><span>BUILT FOR ACCOUNTABLE AUTONOMY</span><span>GENLAYER / BRADBURY TESTNET</span></div>
      </section>

      <section className="credibility-rail" aria-label="Verified OmniMandate milestones">
        <span>GenLayer Bradbury</span><span>84 Direct Mode tests</span><span>Approval finalized</span><span>Denial finalized</span><span>Native withdrawal finalized</span>
      </section>

      <section className="section problem-section" id="product" aria-labelledby="problem-title">
        <div className="section-heading section-heading--split"><div><span className="eyebrow">Why OmniMandate</span><h2 id="problem-title">Policy and execution<br />should share a system.</h2></div><p>Most treasuries set policy in one place and execute spending somewhere else. OmniMandate connects the rule, its evidence, and the final outcome in one control loop.</p></div>
        <div className="product-grid">{productCards.map(([Icon, title, description], index) => { const CardIcon = Icon as typeof Scale; return <article className="product-card" key={title as string}><span className="product-card__number">0{index + 1}</span><span className="product-card__icon"><CardIcon size={21} strokeWidth={1.55} /></span><h3>{title as string}</h3><p>{description as string}</p><span className="product-card__corner" /></article>; })}</div>
      </section>

      <HowItWorks />
      <DecisionExperience />
      <DashboardShowcase />

      <section className="section security-section" id="security" aria-labelledby="security-title">
        <div className="security-panel"><div className="security-panel__lead"><span className="eyebrow eyebrow--light">Security and verifiability</span><h2 id="security-title">A boundary that<br />keeps its receipts.</h2><p>The system is designed so a decision is more than a conclusion. It is a record of the governing rules, the evidence used, and the settlement path that followed.</p></div><div className="security-points"><div><LockKeyhole size={19} /><h3>Immutable mandate versions</h3><p>The rule set used for a request is a fixed version, not a moving target.</p></div><div><FileCheck2 size={19} /><h3>Exact evidence hashes</h3><p>The record points to the precise evidence considered in the decision.</p></div><div><ShieldCheck size={19} /><h3>Independent recomputation</h3><p>Validators independently assess constrained classifications against the mandate.</p></div><div><Sparkles size={19} /><h3>Deterministic accounting</h3><p>Reservations, budget accounting, and settlement remain in contract logic.</p></div><div><CheckCircle2 size={19} /><h3>Finality-aware settlement</h3><p>Settlement follows the system’s finality path, not an assumed instant result.</p></div></div></div>
      </section>

      <section className="section verification-section" aria-labelledby="verification-title">
        <div><span className="eyebrow">Live verification</span><h2 id="verification-title">Verified on<br />Bradbury Testnet.</h2><p>OmniMandate&apos;s intelligent contract was exercised on GenLayer Bradbury. This is a testnet verification record, not a mainnet claim.</p></div>
        <div className="verification-panel"><div className="verification-panel__top"><span><i /> NETWORK</span><b>Bradbury Testnet</b></div><div className="verification-contract"><span>CONTRACT</span><code>0x04c1E361ec0Da96a263794F1f582989c2419267C</code></div><div className="verification-list"><span>VERIFIED</span>{verification.map(item => <div key={item}><CheckCircle2 size={15} /> {item}</div>)}</div><p className="verification-caveat">Bradbury verification used immutable demo evidence fixtures and does not claim independent institutional evidence providers.</p></div>
      </section>

      <section className="section docs-section" id="documentation" aria-labelledby="docs-title">
        <div className="docs-heading"><div><span className="eyebrow">Documentation</span><h2 id="docs-title">A clear path in.</h2></div><p>Explore the concepts behind the operating model. Documentation links are being prepared.</p></div>
        <div className="docs-grid">{documentation.map((item, index) => <a href="#documentation" key={item} className="doc-card"><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><ArrowUpRight size={17} /></a>)}</div>
      </section>

      <section className="section faq-section" aria-labelledby="faq-title">
        <div><span className="eyebrow">FAQ</span><h2 id="faq-title">A few useful<br />distinctions.</h2></div>
        <div className="faq-list">
          <details><summary>What is a mandate?<span>+</span></summary><p>A mandate is the operating rule set for a vault. It defines what kinds of spending can be considered, the conditions that matter, and the limits that apply.</p></details>
          <details><summary>Who can submit a spending request?<span>+</span></summary><p>Requests are submitted by the authorized participants your treasury workflow permits. The mandate remains the boundary for the request itself.</p></details>
          <details><summary>Does AI control the money?<span>+</span></summary><p>AI/validator intelligence determines constrained classifications. Deterministic contract logic controls amount, reservation, accounting and settlement.</p></details>
          <details><summary>What happens when a request is denied?<span>+</span></summary><p>The request does not settle. Its evidence and decision record remain available so the outcome can be understood and reviewed.</p></details>
          <details><summary>What does finalized mean?<span>+</span></summary><p>Finalized means the relevant decision or settlement path has reached the network&apos;s finality condition rather than being treated as a provisional result.</p></details>
          <details><summary>Is OmniMandate live on mainnet?<span>+</span></summary><p>No. The verification described here was performed on GenLayer Bradbury Testnet, not mainnet.</p></details>
        </div>
      </section>

      <section className="final-cta"><div><span className="eyebrow eyebrow--light">OmniMandate</span><h2>Create an intelligent spending boundary<br /><em>that can explain itself.</em></h2></div><Link href="/app" className="button button--ivory">Launch OmniMandate <ArrowUpRight size={17} /></Link></section>

      <footer className="footer"><div className="footer__brand"><OmniMark inverse /><p>Intelligent treasury control.<br />Built on GenLayer.</p></div><div><span>PRODUCT</span><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#security">Security</a></div><div><span>DOCUMENTATION</span>{["Overview", "Quick start", "Security model", "FAQ"].map(item => <a href="#documentation" key={item}>{item}</a>)}</div><div><span>NETWORK</span><p>Bradbury Testnet</p><code>0x04c1…267C</code><p>Built on GenLayer</p></div></footer>
    </main>
  );
}
