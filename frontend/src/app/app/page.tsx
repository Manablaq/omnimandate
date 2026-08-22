"use client";

import { ArrowUpRight, ClipboardList, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AccountAccess } from "@/components/app-shell/account-access";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import { useWallet } from "@/components/wallet/wallet-provider";

const baseMetrics = [
  ["Reserved", "—", "Funds reserved while spend requests await resolution"],
  ["Lifetime spent", "—", "Settled spending from connected vaults"],
  ["Claimable", "—", "Funds available to claim after finality"],
];

export default function AppOverview() {
  const { address } = useWallet();
  const metrics = [
    ["Available treasury", address ? "—" : "Connect wallet", address ? "Treasury balance will load when contract reads are enabled" : "Funds available across your vaults"],
    ...baseMetrics,
  ];

  return <AppShell>
    <section className="app-welcome"><div><span className="eyebrow">OmniMandate workspace</span><h1>Build a treasury<br /><em>with a point of view.</em></h1><p>{address ? "Your wallet is connected. Vault and mandate activity will load when contract reads are enabled." : "Connect a wallet to view your vaults, mandates, and the request activity bound to them."}</p></div><button className="app-primary-button" type="button" disabled title="Vault creation will be enabled with contract write integration" aria-label="Vault creation will be enabled with contract write integration"><Plus size={16} /> Create vault</button></section>
    <AccountAccess />
    <section className="app-metrics" aria-label="Treasury metrics">{metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong className={!address && value === "Connect wallet" ? "metric-connect" : ""}>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="app-grid"><div className="app-panel app-panel--vault"><div className="app-panel__head"><div><span className="technical-label">Vaults</span><h2>No vaults loaded</h2></div><button className="small-action">View vaults <ArrowUpRight size={15} /></button></div><div className="empty-panel"><span><ShieldCheck size={19} /></span><div><h3>Start with a spending boundary</h3><p>A vault holds the mandate that defines how treasury funds may be considered and settled.</p></div><button className="quiet-button" type="button" disabled title="Vault creation will be enabled with contract write integration" aria-label="Vault creation will be enabled with contract write integration"><Plus size={15} /> Create a vault</button></div></div><div className="app-panel app-panel--requests"><div className="app-panel__head"><div><span className="technical-label">Recent requests</span><h2>Nothing to review</h2></div><button className="small-action">All activity <ArrowUpRight size={15} /></button></div><div className="request-empty"><ClipboardList size={25} /><p>Spend requests will appear here with their decision and finality status.</p></div></div></section>
    <TransactionJourney />
  </AppShell>;
}
