"use client";

import { ArrowUpRight, ClipboardList, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { formatEther } from "viem";
import { AppShell } from "@/components/app-shell/app-shell";
import { AccountAccess } from "@/components/app-shell/account-access";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import { useWallet } from "@/components/wallet/wallet-provider";
import { useOmniMandateOverview } from "@/hooks/use-omnimandate-overview";

function formatGen(value: bigint) {
  // Contract tests describe value inputs as wei, so balances are displayed as
  // 18-decimal native GEN without converting the bigint through Number.
  return `${formatEther(value)} GEN`;
}

function readValue(state: "idle" | "loading" | "success" | "error", value: bigint | undefined) {
  if (state === "loading") return "Loading…";
  if (state === "success" && value !== undefined) return value.toString();
  return "—";
}

export default function AppOverview() {
  const { address, isOnBradbury } = useWallet();
  const overview = useOmniMandateOverview({ address, enabled: Boolean(address && isOnBradbury) });
  const canRead = Boolean(address && isOnBradbury);
  const isLoading = overview.state === "loading";
  const claimable = overview.data ? formatGen(overview.data.claimable) : (isLoading ? "Loading…" : "—");
  const welcomeCopy = canRead
    ? "Your connected Bradbury session can read the contract’s latest final overview."
    : address
      ? "Switch to Bradbury Testnet to load your read-only contract overview."
      : "Connect a wallet to view your vaults, mandates, and the request activity bound to them.";
  const claimableDetail = overview.state === "success"
    ? "Available to this connected address from the latest final contract state."
    : canRead
      ? "Funds available to this connected address after the read completes."
      : address
        ? "Switch to Bradbury Testnet to load this value."
        : "Connect a wallet to load this value.";
  const metrics = [
    ["Available treasury", address ? "—" : "Connect wallet", "Vault balances will appear after safe vault discovery and details are available."],
    ["Reserved", "—", "A verified aggregate requires safely discoverable vault details."],
    ["Lifetime spent", "—", "A verified aggregate requires safely discoverable vault details."],
    ["Claimable", claimable, claimableDetail],
  ];

  return <AppShell>
    <section className="app-welcome"><div><span className="eyebrow">OmniMandate workspace</span><h1>Build a treasury<br /><em>with a point of view.</em></h1><p>{welcomeCopy}</p></div><button className="app-primary-button" type="button" disabled title="Vault creation will be enabled with contract write integration" aria-label="Vault creation will be enabled with contract write integration"><Plus size={16} /> Create vault</button></section>
    <AccountAccess />
    {canRead && <section className="overview-read-status" aria-live="polite"><span className="technical-label">Read-only overview · latest final state</span><button className="small-action overview-refresh" type="button" onClick={() => void overview.refresh()} disabled={isLoading}>{isLoading ? <RefreshCw size={14} className="is-spinning" /> : <RefreshCw size={14} />}{isLoading ? "Refreshing" : "Refresh"}</button></section>}
    {overview.state === "error" && <section className="overview-read-error" role="alert"><span>{overview.error}</span><button type="button" onClick={() => void overview.refresh()}>Retry</button></section>}
    <section className="app-metrics" aria-label="Treasury metrics">{metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong className={!address && value === "Connect wallet" ? "metric-connect" : ""}>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="overview-counts" aria-label="Global contract overview counts"><span className="technical-label">Global contract totals</span><p>Latest-final totals across the deployed OmniMandate contract.</p><div><article><span>Vaults</span><strong>{readValue(overview.state, overview.data?.vaultCount)}</strong></article><article><span>Mandates</span><strong>{readValue(overview.state, overview.data?.mandateCount)}</strong></article><article><span>Requests</span><strong>{readValue(overview.state, overview.data?.requestCount)}</strong></article></div></section>
    <section className="app-grid"><div className="app-panel app-panel--vault"><div className="app-panel__head"><div><span className="technical-label">Vaults</span><h2>Wallet vaults not discovered</h2></div><button className="small-action">View vaults <ArrowUpRight size={15} /></button></div><div className="empty-panel"><span><ShieldCheck size={19} /></span><div><h3>Start with a spending boundary</h3><p>OmniMandate currently exposes vaults by global ID. Wallet-owned vault discovery will be enabled when a safe ownership index or discovery path is available.</p></div><button className="quiet-button" type="button" disabled title="Vault creation will be enabled with contract write integration" aria-label="Vault creation will be enabled with contract write integration"><Plus size={15} /> Create a vault</button></div></div><div className="app-panel app-panel--requests"><div className="app-panel__head"><div><span className="technical-label">Recent requests</span><h2>No wallet requests loaded</h2></div><button className="small-action">All activity <ArrowUpRight size={15} /></button></div><div className="request-empty"><ClipboardList size={25} /><p>Global request totals are available, but wallet-specific request discovery is not enabled yet.</p></div></div></section>
    <TransactionJourney />
  </AppShell>;
}
