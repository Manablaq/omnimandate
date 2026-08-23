"use client";

import { ClipboardList, Gavel, LoaderCircle, Plus } from "lucide-react";
import { formatEther } from "viem";
import type {
  OmniMandateSpendRequest,
  OmniMandateVault,
} from "@/lib/omnimandate-reads";
import type { OmniMandateRequestDiscoveryState } from "@/hooks/use-omnimandate-request-discovery";

type Props = {
  state: OmniMandateRequestDiscoveryState;
  error: string | null;
  requests: OmniMandateSpendRequest[];
  isComplete: boolean;
  totalRequestCount: bigint | null;
  associatedVaults: OmniMandateVault[];
  canCreate: boolean;
  isTransactionRunning: boolean;
  onCreate: () => void;
  onRetry: () => void;
  onLoadNext: () => void;
  canAdjudicate: (request: OmniMandateSpendRequest) => boolean;
  onAdjudicate: (request: OmniMandateSpendRequest) => void;
};

function formatGen(value: bigint) {
  return `${formatEther(value)} GEN`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function RequestPanel({
  state,
  error,
  requests,
  isComplete,
  totalRequestCount,
  associatedVaults,
  canCreate,
  isTransactionRunning,
  onCreate,
  onRetry,
  onLoadNext,
  canAdjudicate,
  onAdjudicate,
}: Props) {
  const vaultTitle = new Map(
    associatedVaults.map((vault) => [vault.id.toString(), vault.title]),
  );

  return (
    <div className="app-panel app-panel--requests request-panel" id="requests">
      <div className="app-panel__head">
        <div>
          <span className="technical-label">Spend requests</span>
          <h2>Wallet request activity</h2>
        </div>
        <button
          className="small-action"
          type="button"
          disabled={!canCreate}
          onClick={onCreate}
        >
          <Plus size={14} /> New request
        </button>
      </div>

      {state === "loading" && requests.length === 0 && (
        <div className="request-empty">
          <LoaderCircle size={25} className="is-spinning" />
          <p>Loading accepted-state requests for your discovered vaults.</p>
        </div>
      )}

      {state === "error" && (
        <section className="overview-read-error request-read-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Retry</button>
        </section>
      )}

      {state !== "loading" && state !== "error" && requests.length === 0 && (
        <div className="request-empty">
          <ClipboardList size={25} />
          <p>
            {isComplete
              ? "No spend requests are associated with your discovered vaults."
              : "No matching requests were found in the scanned range yet."}
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="request-list">
          <p className="vault-discovery__summary">
            Showing {requests.length} wallet-associated request{requests.length === 1 ? "" : "s"}.
            {totalRequestCount !== null ? ` Global total: ${totalRequestCount.toString()}.` : ""}
            {!isComplete ? " Discovery is partial." : ""}
          </p>

          {requests.map((request) => (
            <article className="request-card" key={request.id.toString()}>
              <div className="request-card__head">
                <div>
                  <span className="technical-label">
                    Request #{request.id.toString()} · Vault #{request.vaultId.toString()}
                  </span>
                  <h3>{request.purpose}</h3>
                  <p>{vaultTitle.get(request.vaultId.toString()) ?? "Associated vault"}</p>
                </div>
                <span className={`request-state request-state--${request.state.toLowerCase()}`}>
                  {request.state}
                </span>
              </div>

              <div className="request-card__metrics">
                <div><span>Amount</span><strong>{formatGen(request.amount)}</strong></div>
                <div><span>Category</span><strong>{request.category}</strong></div>
                <div><span>Recipient</span><strong title={request.recipient}>{shortAddress(request.recipient)}</strong></div>
                <div><span>Mandate</span><strong>v{request.mandateVersion.toString()}</strong></div>
              </div>

              {(request.policyStatus || request.evidenceStatus || request.reason) && (
                <div className="request-decision">
                  <span>{request.policyStatus || "—"}</span>
                  <span>{request.evidenceStatus || "—"}</span>
                  {request.reason && <p>{request.reason}</p>}
                </div>
              )}

              {request.state === "SUBMITTED" && (
                <div className="request-card__actions">
                  <button
                    className="quiet-button"
                    type="button"
                    disabled={isTransactionRunning || !canAdjudicate(request)}
                    onClick={() => onAdjudicate(request)}
                  >
                    <Gavel size={14} />
                    Adjudicate
                  </button>
                </div>
              )}
            </article>
          ))}

          {!isComplete && (
            <button
              className="quiet-button request-load-more"
              type="button"
              onClick={onLoadNext}
              disabled={state === "loading"}
            >
              Load next request page
            </button>
          )}
        </div>
      )}
    </div>
  );
}
