"use client";

import { LoaderCircle, Plus, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { formatEther } from "viem";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AccountAccess } from "@/components/app-shell/account-access";
import { WorkspaceSections } from "@/components/workspace/workspace-sections";
import { CreateVaultDialog } from "@/components/vaults/create-vault-dialog";
import { CreateSpendRequestDialog } from "@/components/requests/create-spend-request-dialog";
import { RequestPanel } from "@/components/requests/request-panel";
import { useWallet } from "@/components/wallet/wallet-provider";
import { useGenLayerTransaction } from "@/hooks/use-genlayer-transaction";
import { useOmniMandateOverview } from "@/hooks/use-omnimandate-overview";
import { useOmniMandateVaultDiscovery } from "@/hooks/use-omnimandate-vault-discovery";
import { useOmniMandateRequestDiscovery } from "@/hooks/use-omnimandate-request-discovery";
import type { OmniMandateSpendRequest, OmniMandateVault } from "@/lib/omnimandate-reads";
import { OMNIMANDATE_CONTRACT_ADDRESS } from "@/lib/genlayer";

type ActionKind = "create_vault" | "create_request" | "adjudicate" | "withdraw" | null;

function formatGen(value: bigint) {
  return `${formatEther(value)} GEN`;
}

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function readValue(
  state: "idle" | "loading" | "success" | "error",
  value: bigint | undefined,
) {
  if (state === "loading") return "Loading…";
  if (state === "success" && value !== undefined) return value.toString();
  return "—";
}

function VaultCard({ vault }: { vault: OmniMandateVault }) {
  const available = vault.balance - vault.reservedBalance;
  const normalizedStatus = vault.status.toLowerCase();

  return (
    <article className="vault-card">
      <div className="vault-card__head">
        <div>
          <span className="technical-label">Vault #{vault.id.toString()}</span>
          <h4>{vault.title}</h4>
        </div>
        <span className={`vault-status vault-status--${normalizedStatus}`}>
          {vault.status}
        </span>
      </div>
      <div className="vault-card__metrics">
        <div><span>Available</span><strong>{formatGen(available)}</strong></div>
        <div><span>Reserved</span><strong>{formatGen(vault.reservedBalance)}</strong></div>
        <div><span>Lifetime spent</span><strong>{formatGen(vault.lifetimeSpent)}</strong></div>
        <div><span>Active mandate</span><strong>v{vault.activeMandateVersion.toString()}</strong></div>
      </div>
    </article>
  );
}

export default function AppOverview() {
  const { address, connectionState, isOnBradbury, writeClient } = useWallet();
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [lastAction, setLastAction] = useState<ActionKind>(null);
  const transaction = useGenLayerTransaction();

  const canRead = Boolean(address && isOnBradbury);
  const overview = useOmniMandateOverview({ address, enabled: canRead });
  const vaultDiscovery = useOmniMandateVaultDiscovery({ address, enabled: canRead });

  const associatedVaults = useMemo(
    () => [...vaultDiscovery.ownedVaults, ...vaultDiscovery.agentVaults],
    [vaultDiscovery.ownedVaults, vaultDiscovery.agentVaults],
  );
  const associatedVaultIds = useMemo(
    () => associatedVaults.map((vault) => vault.id),
    [associatedVaults],
  );

  const requestDiscovery = useOmniMandateRequestDiscovery({
    enabled: canRead && associatedVaultIds.length > 0,
    vaultIds: associatedVaultIds,
  });

  const isRefreshing =
    overview.state === "loading" ||
    vaultDiscovery.state === "loading" ||
    requestDiscovery.state === "loading";

  const claimableValue = overview.data?.claimable ?? BigInt(0);
  const claimable = overview.data
    ? formatGen(overview.data.claimable)
    : overview.state === "loading"
      ? "Loading…"
      : "—";
  const aggregates = vaultDiscovery.aggregates;

  const discoveryStatus = vaultDiscovery.isComplete
    ? "Complete"
    : vaultDiscovery.state === "partial"
      ? "Partial"
      : "Waiting";

  const welcomeCopy = canRead
    ? "Your connected Bradbury session reflects accepted contract state immediately while finality is tracked separately."
    : address
      ? "Switch to Bradbury Testnet to load your contract workspace."
      : "Connect a wallet to create vaults, submit evidence-bound spend requests, adjudicate them, and withdraw finalized claims.";

  const claimableDetail = overview.state === "success"
    ? "Available to this connected address from the latest accepted contract state."
    : canRead
      ? "Funds available to this connected address after the read completes."
      : address
        ? "Switch to Bradbury Testnet to load this value."
        : "Connect a wallet to load this value.";

  const aggregateDetail = vaultDiscovery.isComplete
    ? "Summed from latest accepted owned-vault state; pending writes remain subject to finality."
    : canRead
      ? "Shown after complete bounded owner discovery."
      : "Connect a Bradbury wallet to discover owned vaults.";

  const metrics = [
    ["Available treasury", aggregates ? formatGen(aggregates.availableTreasury) : "—", aggregateDetail],
    ["Reserved", aggregates ? formatGen(aggregates.reserved) : "—", aggregateDetail],
    ["Lifetime spent", aggregates ? formatGen(aggregates.lifetimeSpent) : "—", aggregateDetail],
    ["Claimable", claimable, claimableDetail],
  ];

  const refreshAll = async () => {
    await Promise.all([
      overview.refresh(),
      vaultDiscovery.refresh(),
      requestDiscovery.refresh(),
    ]);
  };

  const reconcileAfterAcceptedWrite = async () => {
    await refreshAll();
    window.setTimeout(() => void refreshAll(), 1500);
    window.setTimeout(() => void refreshAll(), 4000);
  };

  const isTransactionRunning = ["awaiting_wallet", "submitted", "consensus"].includes(
    transaction.state,
  );
  const canWrite =
    connectionState === "connected" &&
    Boolean(address && isOnBradbury && writeClient);

  const eligibleRequestVaults = useMemo(
    () =>
      address
        ? associatedVaults.filter(
            (vault) =>
              vault.status === "ACTIVE" &&
              sameAddress(vault.authorizedAgent, address),
          )
        : [],
    [address, associatedVaults],
  );

  const canCreateVault = canWrite && !isTransactionRunning;
  const canCreateRequest =
    canWrite && !isTransactionRunning && eligibleRequestVaults.length > 0;

  const scannedRange = vaultDiscovery.scannedRange;
  const scanSummary =
    scannedRange && vaultDiscovery.totalVaultCount !== null
      ? `Scanned global IDs ${scannedRange.startId.toString()}–${scannedRange.endId.toString()} of ${vaultDiscovery.totalVaultCount.toString()}.`
      : vaultDiscovery.totalVaultCount === BigInt(0)
        ? "The contract currently has no vault IDs to scan."
        : "Vault discovery has not started.";

  const canAdjudicate = (request: OmniMandateSpendRequest) => {
    if (!address || !canWrite || isTransactionRunning || request.state !== "SUBMITTED") {
      return false;
    }
    const vault = associatedVaults.find((candidate) => candidate.id === request.vaultId);
    return Boolean(
      vault &&
      (sameAddress(vault.owner, address) ||
        sameAddress(vault.authorizedAgent, address)),
    );
  };

  const adjudicate = async (request: OmniMandateSpendRequest) => {
    if (!writeClient || !canAdjudicate(request)) return;
    transaction.reset();
    setLastAction("adjudicate");

    const accepted = await transaction.submit({
      writeClient,
      request: {
        address: OMNIMANDATE_CONTRACT_ADDRESS,
        functionName: "adjudicate_spend_request",
        args: [request.id],
        value: BigInt(0),
      },
    });

    if (accepted) await reconcileAfterAcceptedWrite();
  };

  const withdraw = async () => {
    if (!writeClient || !canWrite || isTransactionRunning || claimableValue === BigInt(0)) {
      return;
    }
    transaction.reset();
    setLastAction("withdraw");

    const accepted = await transaction.submit({
      writeClient,
      request: {
        address: OMNIMANDATE_CONTRACT_ADDRESS,
        functionName: "withdraw",
        args: [],
        value: BigInt(0),
      },
    });

    if (accepted) await reconcileAfterAcceptedWrite();
  };

  return (
    <AppShell>
      <section className="app-welcome" id="overview">
        <div>
          <span className="eyebrow">OmniMandate workspace</span>
          <h1>Build a treasury<br /><em>with a point of view.</em></h1>
          <p>{welcomeCopy}</p>
        </div>
        <button
          className="app-primary-button"
          type="button"
          disabled={!canCreateVault}
          onClick={() => {
            transaction.reset();
            setLastAction("create_vault");
            setIsCreateVaultOpen(true);
          }}
        >
          <Plus size={16} /> Create vault
        </button>
      </section>

      <AccountAccess />

      {transaction.state === "accepted" && (
        <section className="overview-read-status accepted-state-banner" aria-live="polite">
          <span className="technical-label">Accepted · pending finality</span>
          <span>
            {lastAction === "withdraw"
              ? "Withdrawal accepted. The external GEN transfer executes only when this transaction reaches finalization."
              : "Accepted contract state is reflected below. The finality window is still open."}
          </span>
        </section>
      )}

      {canRead && (
        <section className="overview-read-status" aria-live="polite">
          <span className="technical-label">Live overview · latest accepted state</span>
          <button
            className="small-action overview-refresh"
            type="button"
            onClick={() => void refreshAll()}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? <RefreshCw size={14} className="is-spinning" />
              : <RefreshCw size={14} />}
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </section>
      )}

      {overview.state === "error" && (
        <section className="overview-read-error" role="alert">
          <span>{overview.error}</span>
          <button type="button" onClick={() => void overview.refresh()}>
            Retry overview
          </button>
        </section>
      )}

      <section className="app-metrics" aria-label="Treasury metrics">
        {metrics.map(([label, value, detail]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      {(claimableValue > BigInt(0) ||
        (lastAction === "withdraw" && transaction.state === "accepted")) && (
        <section className="claimable-action">
          <div>
            <span className="technical-label">Pull payment</span>
            <h3>
              {claimableValue > BigInt(0)
                ? `${formatGen(claimableValue)} ready to withdraw`
                : "Withdrawal accepted · awaiting finality"}
            </h3>
            <p>
              External value transfer is a finalization-layer action. An accepted withdrawal is not yet irreversible.
            </p>
          </div>
          {claimableValue > BigInt(0) && (
            <button
              className="app-primary-button"
              type="button"
              disabled={!canWrite || isTransactionRunning}
              onClick={() => void withdraw()}
            >
              <WalletCards size={16} /> Withdraw claimable
            </button>
          )}
        </section>
      )}

      <section className="overview-counts" aria-label="Global contract overview counts">
        <span className="technical-label">Global contract totals</span>
        <p>
          Accepted-aware totals across the deployed OmniMandate contract. Pending transactions remain subject to finality.
        </p>
        <div>
          <article><span>Vaults</span><strong>{readValue(overview.state, overview.data?.vaultCount)}</strong></article>
          <article><span>Mandates</span><strong>{readValue(overview.state, overview.data?.mandateCount)}</strong></article>
          <article><span>Requests</span><strong>{readValue(overview.state, overview.data?.requestCount)}</strong></article>
        </div>
      </section>

      <section className="app-grid workspace-core-grid">
        <div className="app-panel workspace-section app-panel--vault" id="vaults">
          <div className="app-panel__head">
            <div>
              <span className="technical-label">Vaults</span>
              <h2>Wallet vault discovery</h2>
            </div>
            {canRead && (
              <span className={`vault-discovery-status${vaultDiscovery.isComplete ? " is-complete" : ""}`}>
                {discoveryStatus}
              </span>
            )}
          </div>

          {!canRead && (
            <div className="empty-panel">
              <span><ShieldCheck size={19} /></span>
              <div>
                <h3>Connect to discover vaults</h3>
                <p>Connect a wallet on Bradbury Testnet to identify owned or authorized-agent vaults.</p>
              </div>
            </div>
          )}

          {canRead &&
            vaultDiscovery.state === "loading" &&
            vaultDiscovery.scannedCount === BigInt(0) && (
              <div className="empty-panel">
                <span><LoaderCircle size={19} className="is-spinning" /></span>
                <div>
                  <h3>Discovering vaults</h3>
                  <p>Reading the current bounded accepted-state vault page from Bradbury.</p>
                </div>
              </div>
            )}

          {canRead && vaultDiscovery.state === "error" && (
            <section className="overview-read-error vault-discovery-error" role="alert">
              <span>{vaultDiscovery.error}</span>
              <button type="button" onClick={() => void vaultDiscovery.retry()}>Retry</button>
            </section>
          )}

          {canRead && vaultDiscovery.data && (
            <div className="vault-discovery">
              <p className="vault-discovery__summary">
                {scanSummary}{" "}
                {vaultDiscovery.isComplete
                  ? "Wallet discovery is complete."
                  : "More vault pages may contain additional matches."}
              </p>

              <section className="vault-group" aria-labelledby="owned-vaults-heading">
                <div className="vault-group__head">
                  <div>
                    <span className="technical-label">Owned vaults</span>
                    <h3 id="owned-vaults-heading">Treasury you control</h3>
                  </div>
                  <span>{vaultDiscovery.ownedVaults.length}</span>
                </div>
                {vaultDiscovery.ownedVaults.length > 0 ? (
                  <div className="vault-list">
                    {vaultDiscovery.ownedVaults.map((vault) => (
                      <VaultCard vault={vault} key={vault.id.toString()} />
                    ))}
                  </div>
                ) : vaultDiscovery.isComplete ? (
                  <p className="vault-empty">No owned vaults found.</p>
                ) : (
                  <p className="vault-empty">No owned vaults found in the scanned range yet.</p>
                )}
              </section>

              {vaultDiscovery.agentVaults.length > 0 && (
                <section className="vault-group" aria-labelledby="agent-vaults-heading">
                  <div className="vault-group__head">
                    <div>
                      <span className="technical-label">Authorized-agent vaults</span>
                      <h3 id="agent-vaults-heading">Vaults you can operate</h3>
                    </div>
                    <span>{vaultDiscovery.agentVaults.length}</span>
                  </div>
                  <p className="vault-group__note">
                    You can submit/adjudicate requests for these vaults, but you do not own their treasury.
                  </p>
                  <div className="vault-list">
                    {vaultDiscovery.agentVaults.map((vault) => (
                      <VaultCard vault={vault} key={vault.id.toString()} />
                    ))}
                  </div>
                </section>
              )}

              {!vaultDiscovery.isComplete && vaultDiscovery.state !== "loading" && (
                <button
                  className="quiet-button vault-discovery__next"
                  type="button"
                  onClick={() => void vaultDiscovery.loadNextPage()}
                >
                  Load next vault page
                </button>
              )}
            </div>
          )}
        </div>

        <RequestPanel
          state={requestDiscovery.state}
          error={requestDiscovery.error}
          requests={requestDiscovery.requests}
          isComplete={requestDiscovery.isComplete}
          totalRequestCount={requestDiscovery.totalRequestCount}
          associatedVaults={associatedVaults}
          canCreate={Boolean(canCreateRequest)}
          isTransactionRunning={isTransactionRunning}
          onCreate={() => {
            transaction.reset();
            setLastAction("create_request");
            setIsCreateRequestOpen(true);
          }}
          onRetry={() => void requestDiscovery.retry()}
          onLoadNext={() => void requestDiscovery.loadNextPage()}
          canAdjudicate={canAdjudicate}
          onAdjudicate={(request) => void adjudicate(request)}
        />
      </section>
      <WorkspaceSections
        canRead={canRead}
        associatedVaults={associatedVaults}
        requests={requestDiscovery.requests}
        transactionState={transaction.state}
        transactionHash={transaction.transactionHash}
        transactionError={transaction.error}
      />

      {writeClient && (
        <CreateVaultDialog
          open={isCreateVaultOpen}
          onOpenChange={setIsCreateVaultOpen}
          writeClient={writeClient}
          state={transaction.state}
          transactionHash={transaction.transactionHash}
          transactionError={transaction.error}
          submit={transaction.submit}
          onSuccess={reconcileAfterAcceptedWrite}
        />
      )}

      {writeClient && address && isCreateRequestOpen && (
        <CreateSpendRequestDialog
          open={isCreateRequestOpen}
          onOpenChange={setIsCreateRequestOpen}
          address={address}
          eligibleVaults={eligibleRequestVaults}
          writeClient={writeClient}
          state={transaction.state}
          transactionHash={transaction.transactionHash}
          transactionError={transaction.error}
          submit={transaction.submit}
          onSuccess={reconcileAfterAcceptedWrite}
        />
      )}
    </AppShell>
  );
}
