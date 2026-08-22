import { ArrowUpRight, ClipboardList, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";

const metrics = [
  ["Available treasury", "Connect wallet", "Funds available across your vaults"],
  ["Reserved", "—", "Funds reserved while spend requests await resolution"],
  ["Lifetime spent", "—", "Settled spending from connected vaults"],
  ["Claimable", "—", "Funds available to claim after finality"],
];

export default function AppOverview() {
  return <AppShell>
    <section className="app-welcome"><div><span className="eyebrow">OmniMandate workspace</span><h1>Build a treasury<br /><em>with a point of view.</em></h1><p>Connect a wallet to view your vaults, mandates, and the request activity bound to them.</p></div><button className="app-primary-button"><Plus size={16} /> Create vault</button></section>
    <section className="wallet-empty"><div className="wallet-empty__icon"><WalletCards size={22} /></div><div><span className="technical-label">Account access</span><h2>Your treasury is ready when you are.</h2><p>Connect a wallet to load the vaults and mandate activity associated with your account.</p></div><button className="connect-button connect-button--large">Connect wallet <ArrowUpRight size={16} /></button></section>
    <section className="app-metrics" aria-label="Treasury metrics">{metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong className={value === "Connect wallet" ? "metric-connect" : ""}>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="app-grid"><div className="app-panel app-panel--vault"><div className="app-panel__head"><div><span className="technical-label">Vaults</span><h2>No vaults loaded</h2></div><button className="small-action">View vaults <ArrowUpRight size={15} /></button></div><div className="empty-panel"><span><ShieldCheck size={19} /></span><div><h3>Start with a spending boundary</h3><p>A vault holds the mandate that defines how treasury funds may be considered and settled.</p></div><button className="quiet-button"><Plus size={15} /> Create a vault</button></div></div><div className="app-panel app-panel--requests"><div className="app-panel__head"><div><span className="technical-label">Recent requests</span><h2>Nothing to review</h2></div><button className="small-action">All activity <ArrowUpRight size={15} /></button></div><div className="request-empty"><ClipboardList size={25} /><p>Spend requests will appear here with their decision and finality status.</p></div></div></section>
    <TransactionJourney />
  </AppShell>;
}
