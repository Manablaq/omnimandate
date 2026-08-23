"use client";

import {
  Activity,
  BookOpen,
  ExternalLink,
  FileCheck2,
  FileText,
  Fingerprint,
} from "lucide-react";
import { formatEther } from "viem";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import type { TransactionState } from "@/hooks/use-genlayer-transaction";
import type {
  OmniMandateSpendRequest,
  OmniMandateVault,
} from "@/lib/omnimandate-reads";

type WorkspaceSectionsProps = {
  canRead: boolean;
  associatedVaults: OmniMandateVault[];
  requests: OmniMandateSpendRequest[];
  transactionState: TransactionState;
  transactionHash: string | null;
  transactionError: string | null;
};

const REPOSITORY = "https://github.com/Manablaq/omnimandate";
const CONTRACT =
  "https://explorer-bradbury.genlayer.com/address/0x04c1E361ec0Da96a263794F1f582989c2419267C";

const documentation = [
  ["Project overview", `${REPOSITORY}#readme`, "Product model, verified status, and delivery record."],
  ["v1 specification", `${REPOSITORY}/blob/main/docs/SPEC_V1.md`, "Normative OmniMandate behavior and invariants."],
  ["Architecture", `${REPOSITORY}/blob/main/docs/ARCHITECTURE.md`, "System boundaries, storage model, and consensus architecture."],
  ["Threat model", `${REPOSITORY}/blob/main/docs/THREAT_MODEL.md`, "Security assumptions, trust boundaries, and mitigations."],
  ["Test matrix", `${REPOSITORY}/blob/main/docs/TEST_MATRIX.md`, "Direct Mode and Bradbury verification coverage."],
  ["Bradbury verification", `${REPOSITORY}/blob/main/docs/BRADBURY_LIVE_VERIFICATION.md`, "Live testnet evidence for approval, denial, finality, and withdrawal."],
  ["Runtime compatibility", `${REPOSITORY}/blob/main/docs/RUNTIME_COMPATIBILITY.md`, "Verified GenVM/runtime constraints and compatibility notes."],
  ["Intelligent Contract", `${REPOSITORY}/blob/main/contracts/omnimandate.py`, "Frozen deployed contract source."],
  ["Bradbury contract", CONTRACT, "Deployed OmniMandate contract on the Bradbury explorer."],
] as const;

function formatGen(value: bigint) {
  return `${formatEther(value)} GEN`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function shortHash(value: string) {
  if (value.length <= 22) return value;
  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

function formatPeriod(seconds: bigint) {
  if (seconds > BigInt(0) && seconds % BigInt(86400) === BigInt(0)) {
    const days = seconds / BigInt(86400);
    return `${days.toString()} day${days === BigInt(1) ? "" : "s"}`;
  }
  if (seconds > BigInt(0) && seconds % BigInt(3600) === BigInt(0)) {
    const hours = seconds / BigInt(3600);
    return `${hours.toString()} hour${hours === BigInt(1) ? "" : "s"}`;
  }
  return `${seconds.toString()} seconds`;
}

function EmptySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <FileText size={21} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function WorkspaceSections({
  canRead,
  associatedVaults,
  requests,
  transactionState,
  transactionHash,
  transactionError,
}: WorkspaceSectionsProps) {
  const orderedRequests = [...requests].sort((left, right) =>
    left.id > right.id ? -1 : left.id < right.id ? 1 : 0,
  );

  return (
    <div className="workspace-sections">
      <section className="workspace-section" id="mandates" aria-labelledby="mandates-heading">
        <div className="workspace-section__head">
          <div>
            <span className="technical-label">Mandates</span>
            <h2 id="mandates-heading">Policy bindings in force</h2>
          </div>
          <span className="workspace-section__count">
            {canRead ? associatedVaults.length : "—"}
          </span>
        </div>
        <p className="workspace-section__intro">
          Active mandate references come from the latest accepted vault state. Request-bound
          mandate hashes show the immutable policy snapshot used for adjudication.
        </p>

        {!canRead ? (
          <EmptySection title="Connect to inspect mandates">
            Connect a Bradbury wallet to load the mandate references for its discovered vaults.
          </EmptySection>
        ) : associatedVaults.length === 0 ? (
          <EmptySection title="No associated mandates">
            No vaults are currently associated with this wallet in the discovered range.
          </EmptySection>
        ) : (
          <div className="mandate-grid">
            {associatedVaults.map((vault) => {
              const snapshot = orderedRequests.find(
                (request) =>
                  request.vaultId === vault.id &&
                  request.mandateVersion === vault.activeMandateVersion,
              );

              return (
                <article className="mandate-card" key={vault.id.toString()}>
                  <div className="mandate-card__head">
                    <div>
                      <span className="technical-label">Vault #{vault.id.toString()}</span>
                      <h3>{vault.title}</h3>
                    </div>
                    <span className={`vault-status vault-status--${vault.status.toLowerCase()}`}>
                      {vault.status}
                    </span>
                  </div>
                  <div className="mandate-card__metrics">
                    <div>
                      <span>Active mandate</span>
                      <strong>
                        #{vault.activeMandateId.toString()} · v
                        {vault.activeMandateVersion.toString()}
                      </strong>
                    </div>
                    <div>
                      <span>Period</span>
                      <strong>{formatPeriod(vault.periodSeconds)}</strong>
                    </div>
                    <div>
                      <span>Period spent</span>
                      <strong>{formatGen(vault.currentPeriodSpent)}</strong>
                    </div>
                    <div>
                      <span>Period reserved</span>
                      <strong>{formatGen(vault.currentPeriodReserved)}</strong>
                    </div>
                  </div>
                  <div className="mandate-card__identity">
                    <span>Owner</span>
                    <code title={vault.owner}>{shortAddress(vault.owner)}</code>
                    <span>Agent</span>
                    <code title={vault.authorizedAgent}>{shortAddress(vault.authorizedAgent)}</code>
                  </div>
                  <div className="mandate-card__hash">
                    <span>Latest request-bound mandate hash</span>
                    {snapshot ? (
                      <code title={snapshot.mandateHash}>{shortHash(snapshot.mandateHash)}</code>
                    ) : (
                      <em>No request snapshot for the active version yet.</em>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="workspace-section" id="evidence" aria-labelledby="evidence-heading">
        <div className="workspace-section__head">
          <div>
            <span className="technical-label">Evidence</span>
            <h2 id="evidence-heading">Immutable request evidence</h2>
          </div>
          <span className="workspace-section__count">
            {canRead ? orderedRequests.length : "—"}
          </span>
        </div>
        <p className="workspace-section__intro">
          Every discovered request exposes both evidence locations and the exact SHA-256
          digests bound to the contract record.
        </p>

        {!canRead ? (
          <EmptySection title="Connect to inspect evidence">
            Connect a Bradbury wallet to load evidence bound to its associated spend requests.
          </EmptySection>
        ) : orderedRequests.length === 0 ? (
          <EmptySection title="No evidence records">
            Evidence appears here after a spend request is discovered for one of your vaults.
          </EmptySection>
        ) : (
          <div className="evidence-list">
            {orderedRequests.map((request) => (
              <article className="evidence-card" key={request.id.toString()}>
                <div className="evidence-card__head">
                  <div>
                    <span className="technical-label">
                      Request #{request.id.toString()} · Vault #{request.vaultId.toString()}
                    </span>
                    <h3>{request.purpose}</h3>
                  </div>
                  <span className={`request-state request-state--${request.state.toLowerCase()}`}>
                    {request.evidenceStatus || request.state}
                  </span>
                </div>

                <div className="evidence-record">
                  <div className="evidence-record__label">
                    <Fingerprint size={15} aria-hidden="true" />
                    <strong>Primary evidence</strong>
                    <a
                      href={request.primaryEvidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open primary evidence for request ${request.id.toString()}`}
                    >
                      Open record <ExternalLink size={13} />
                    </a>
                  </div>
                  <code className="evidence-url">{request.primaryEvidenceUrl}</code>
                  <span>SHA-256</span>
                  <code className="evidence-hash">{request.primaryEvidenceSha256}</code>
                </div>

                <div className="evidence-record">
                  <div className="evidence-record__label">
                    <FileCheck2 size={15} aria-hidden="true" />
                    <strong>Corroboration</strong>
                    <a
                      href={request.corroborationUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open corroborating evidence for request ${request.id.toString()}`}
                    >
                      Open record <ExternalLink size={13} />
                    </a>
                  </div>
                  <code className="evidence-url">{request.corroborationUrl}</code>
                  <span>SHA-256</span>
                  <code className="evidence-hash">{request.corroborationSha256}</code>
                </div>

                <div className="evidence-card__meta">
                  <span>Observed</span>
                  <strong>{request.evidenceObservedAt}</strong>
                  <span>Mandate</span>
                  <strong>v{request.mandateVersion.toString()}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="workspace-section" id="activity" aria-labelledby="activity-heading">
        <div className="workspace-section__head">
          <div>
            <span className="technical-label">Activity</span>
            <h2 id="activity-heading">Decision and transaction activity</h2>
          </div>
          <Activity size={19} aria-hidden="true" />
        </div>
        <p className="workspace-section__intro">
          Historical request outcomes are separated from the active wallet transaction journey,
          so accepted state and network finality remain easy to distinguish.
        </p>

        {canRead && orderedRequests.length > 0 ? (
          <div className="activity-list">
            {orderedRequests.map((request) => (
              <article className="activity-item" key={request.id.toString()}>
                <span className={`activity-dot activity-dot--${request.state.toLowerCase()}`} />
                <div>
                  <span className="technical-label">
                    Request #{request.id.toString()} · {request.state}
                  </span>
                  <h3>{request.purpose}</h3>
                  <p>
                    Vault #{request.vaultId.toString()} · {formatGen(request.amount)} ·{" "}
                    {request.category}
                  </p>
                  {(request.policyStatus || request.evidenceStatus) && (
                    <div className="activity-item__decision">
                      {request.policyStatus && <span>{request.policyStatus}</span>}
                      {request.evidenceStatus && <span>{request.evidenceStatus}</span>}
                    </div>
                  )}
                  <small>
                    Created: {request.createdAt}
                    {request.resolvedAt ? ` · Resolved: ${request.resolvedAt}` : ""}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptySection title={canRead ? "No request activity yet" : "Connect to load activity"}>
            {canRead
              ? "Spend-request history will appear here as it is discovered."
              : "Connect a Bradbury wallet to load its associated request history."}
          </EmptySection>
        )}

        <div className="activity-journey">
          <span className="technical-label">Active transaction</span>
          <TransactionJourney
            state={transactionState}
            transactionHash={transactionHash}
            error={transactionError}
          />
        </div>
      </section>

      <section
        className="workspace-section"
        id="documentation"
        aria-labelledby="workspace-documentation-heading"
      >
        <div className="workspace-section__head">
          <div>
            <span className="technical-label">Documentation</span>
            <h2 id="workspace-documentation-heading">Source, specification, and verification</h2>
          </div>
          <BookOpen size={19} aria-hidden="true" />
        </div>
        <p className="workspace-section__intro">
          These are real project resources, not placeholder navigation. Each link opens the
          exact source or verification record in a new tab.
        </p>
        <div className="workspace-doc-grid">
          {documentation.map(([title, href, description]) => (
            <a href={href} target="_blank" rel="noreferrer" key={title}>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
