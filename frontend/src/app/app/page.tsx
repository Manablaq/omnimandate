"use client";

import { ClipboardList, LoaderCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { formatEther } from "viem";
import { AppShell } from "@/components/app-shell/app-shell";
import { AccountAccess } from "@/components/app-shell/account-access";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import { useWallet } from "@/components/wallet/wallet-provider";
import { useOmniMandateOverview } from "@/hooks/use-omnimandate-overview";
import { useOmniMandateVaultDiscovery } from "@/hooks/use-omnimandate-vault-discovery";
import type { OmniMandateVault } from "@/lib/omnimandate-reads";

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

function VaultCard({ vault }: { vault: OmniMandateVault }) {
  const available = vault.balance - vault.reservedBalance;
  const normalizedStatus = vault.status.toLowerCase();

  return <article className="vault-card">
    <div className="vault-card__head"><div><span className="technical-label">Vault #{vault.id.toString()}</span><h4>{vault.title}</h4></div><span className={`vault-status vault-status--${normalizedStatus}`}>{vault.status}</span></div>
    <div className="vault-card__metrics"><div><span>Available</span><strong>{formatGen(available)}</strong></div><div><span>Reserved</span><strong>{formatGen(vault.reservedBalance)}</strong></div><div><span>Lifetime spent</span><strong>{formatGen(vault.lifetimeSpent)}</strong></div><div><span>Active mandate</span><strong>v{vault.activeMandateVersion.toString()}</strong></div></div>
  </article>;
}

export default function AppOverview() {
  const { address, isOnBradbury } = useWallet();
  const canRead = Boolean(address && isOnBradbury);
  const overview = useOmniMandateOverview({ address, enabled: canRead });
  const vaultDiscovery = useOmniMandateVaultDiscovery({ address, enabled: canRead });
  const isRefreshing = overview.state === "loading" || vaultDiscovery.state === "loading";
  const claimable = overview.data ? formatGen(overview.data.claimable) : (overview.state === "loading" ? "Loading…" : "—");
  const aggregates = vaultDiscovery.aggregates;
  const discoveryStatus = vaultDiscovery.isComplete
    ? "Complete"
    : vaultDiscovery.state === "partial"
      ? "Partial"
      : "Waiting";
  const welcomeCopy = canRead
    ? "Your connected Bradbury session can read the contract’s latest final overview and bounded vault discovery."
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
  const aggregateDetail = vaultDiscovery.isComplete
    ? "Summed from latest-final owned vault fields."
    : canRead
      ? "Shown after complete bounded owner discovery."
      : "Connect a Bradbury wallet to discover owned vaults.";
  const metrics = [
    ["Available treasury", aggregates ? formatGen(aggregates.availableTreasury) : "—", aggregateDetail],
    ["Reserved", aggregates ? formatGen(aggregates.reserved) : "—", aggregateDetail],
    ["Lifetime spent", aggregates ? formatGen(aggregates.lifetimeSpent) : "—", aggregateDetail],
    ["Claimable", claimable, claimableDetail],
  ];

  const refreshAll = () => {
    void Promise.all([overview.refresh(), vaultDiscovery.refresh()]);
  };

  const scannedRange = vaultDiscovery.scannedRange;
  const scanSummary = scannedRange && vaultDiscovery.totalVaultCount !== null
    ? `Scanned global IDs ${scannedRange.startId.toString()}–${scannedRange.endId.toString()} of ${vaultDiscovery.totalVaultCount.toString()}.`
    : vaultDiscovery.totalVaultCount === BigInt(0)
      ? "The contract currently has no vault IDs to scan."
      : "Vault discovery has not started.";

  return <AppShell>
    <section className="app-welcome"><div><span className="eyebrow">OmniMandate workspace</span><h1>Build a treasury<br /><em>with a point of view.</em></h1><p>{welcomeCopy}</p></div><button className="app-primary-button" type="button" disabled title="Vault creation will be enabled with contract write integration" aria-label="Vault creation will be enabled with contract write integration"><Plus size={16} /> Create vault</button></section>
    <AccountAccess />
    {canRead && <section className="overview-read-status" aria-live="polite"><span className="technical-label">Read-only overview · latest final state</span><button className="small-action overview-refresh" type="button" onClick={refreshAll} disabled={isRefreshing}>{isRefreshing ? <RefreshCw size={14} className="is-spinning" /> : <RefreshCw size={14} />}{isRefreshing ? "Refreshing" : "Refresh"}</button></section>}
    {overview.state === "error" && <section className="overview-read-error" role="alert"><span>{overview.error}</span><button type="button" onClick={() => void overview.refresh()}>Retry overview</button></section>}
    <section className="app-metrics" aria-label="Treasury metrics">{metrics.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong className={!address && value === "—" ? "metric-connect" : ""}>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="overview-counts" aria-label="Global contract overview counts"><span className="technical-label">Global contract totals</span><p>Latest-final totals across the deployed OmniMandate contract.</p><div><article><span>Vaults</span><strong>{readValue(overview.state, overview.data?.vaultCount)}</strong></article><article><span>Mandates</span><strong>{readValue(overview.state, overview.data?.mandateCount)}</strong></article><article><span>Requests</span><strong>{readValue(overview.state, overview.data?.requestCount)}</strong></article></div></section>
    <section className="app-grid"><div className="app-panel app-panel--vault" id="vaults"><div className="app-panel__head"><div><span className="technical-label">Vaults</span><h2>Wallet vault discovery</h2></div>{canRead && <span className={`vault-discovery-status${vaultDiscovery.isComplete ? " is-complete" : ""}`}>{discoveryStatus}</span>}</div>
      {!canRead && <div className="empty-panel"><span><ShieldCheck size={19} /></span><div><h3>Connect to discover vaults</h3><p>Connect a wallet on Bradbury Testnet to scan bounded global vault IDs and identify your owned or authorized-agent vaults.</p></div></div>}
      {canRead && vaultDiscovery.state === "loading" && vaultDiscovery.scannedCount === BigInt(0) && <div className="empty-panel"><span><LoaderCircle size={19} className="is-spinning" /></span><div><h3>Discovering vaults</h3><p>Reading the current bounded latest-final vault page.</p></div></div>}
      {canRead && vaultDiscovery.state === "error" && <section className="overview-read-error vault-discovery-error" role="alert"><span>{vaultDiscovery.error}</span><button type="button" onClick={() => void vaultDiscovery.retry()}>Retry</button></section>}
      {canRead && vaultDiscovery.data && <div className="vault-discovery"><p className="vault-discovery__summary">{scanSummary} {vaultDiscovery.isComplete ? "Wallet discovery is complete." : "More vault pages may contain additional matches."}</p>
        <section className="vault-group" aria-labelledby="owned-vaults-heading"><div className="vault-group__head"><div><span className="technical-label">Owned vaults</span><h3 id="owned-vaults-heading">Treasury you control</h3></div><span>{vaultDiscovery.ownedVaults.length}</span></div>
          {vaultDiscovery.ownedVaults.length > 0 ? <div className="vault-list">{vaultDiscovery.ownedVaults.map((vault) => <VaultCard vault={vault} key={vault.id.toString()} />)}</div> : vaultDiscovery.isComplete ? <p className="vault-empty">No owned vaults found.</p> : <p className="vault-empty">No owned vaults found in the scanned range yet.</p>}
        </section>
        {vaultDiscovery.agentVaults.length > 0 && <section className="vault-group" aria-labelledby="agent-vaults-heading"><div className="vault-group__head"><div><span className="technical-label">Authorized-agent vaults</span><h3 id="agent-vaults-heading">Vaults you can operate</h3></div><span>{vaultDiscovery.agentVaults.length}</span></div><p className="vault-group__note">You can submit/adjudicate requests for these vaults, but you do not own their treasury.</p><div className="vault-list">{vaultDiscovery.agentVaults.map((vault) => <VaultCard vault={vault} key={vault.id.toString()} />)}</div></section>}
        {!vaultDiscovery.isComplete && vaultDiscovery.state !== "loading" && <button className="quiet-button vault-discovery__next" type="button" onClick={() => void vaultDiscovery.loadNextPage()}>Load next vault page</button>}
      </div>}
    </div><div className="app-panel app-panel--requests" id="requests"><div className="app-panel__head"><div><span className="technical-label">Recent requests</span><h2>No wallet requests loaded</h2></div></div><div className="request-empty"><ClipboardList size={25} /><p>Global request totals are available. Wallet-specific request discovery will use the discovered vault IDs in a future read-only view.</p></div></div></section>
    <TransactionJourney />
  </AppShell>;
}
