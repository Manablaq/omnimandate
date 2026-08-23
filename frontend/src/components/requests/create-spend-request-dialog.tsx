"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { isAddress, parseEther, type Address } from "viem";
import { FileCheck2, LoaderCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { GenLayerWriteClient } from "@/components/wallet/wallet-provider";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import type { TransactionState } from "@/hooks/use-genlayer-transaction";
import type { OmniMandateVault } from "@/lib/omnimandate-reads";
import { OMNIMANDATE_CONTRACT_ADDRESS } from "@/lib/genlayer";

const MAX_U256 = (BigInt(1) << BigInt(256)) - BigInt(1);
const GEN_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
const SHA256 = /^[0-9a-fA-F]{64}$/;
const DEMO_WALLET = "0x1f87Ae197af539253978d435aD45cCf28Fb95024";
const DEMO_COMMIT = "92fc0527b2984d768af196771960939b5949c5fd";
const DEMO_PRIMARY =
  `https://raw.githubusercontent.com/Manablaq/omnimandate/${DEMO_COMMIT}/evidence/approved-primary.txt`;
const DEMO_CORROBORATION =
  `https://raw.githubusercontent.com/Manablaq/omnimandate/${DEMO_COMMIT}/evidence/approved-corroboration.txt`;

type Form = {
  vaultId: string;
  recipient: string;
  amount: string;
  purpose: string;
  category: string;
  primaryEvidenceUrl: string;
  primaryEvidenceSha256: string;
  corroborationUrl: string;
  corroborationSha256: string;
  evidenceObservedAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address;
  eligibleVaults: OmniMandateVault[];
  writeClient: GenLayerWriteClient;
  state: TransactionState;
  transactionHash: string | null;
  transactionError: string | null;
  submit: (options: {
    writeClient: GenLayerWriteClient;
    request: Parameters<GenLayerWriteClient["writeContract"]>[0];
  }) => Promise<boolean>;
  onSuccess: () => Promise<void>;
};

function localDateTimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function initialForm(address: Address, eligibleVaults: OmniMandateVault[]): Form {
  return {
    vaultId: eligibleVaults[0]?.id.toString() ?? "",
    recipient: address,
    amount: "",
    purpose: "",
    category: "",
    primaryEvidenceUrl: "",
    primaryEvidenceSha256: "",
    corroborationUrl: "",
    corroborationSha256: "",
    evidenceObservedAt: localDateTimeNow(),
  };
}

function parseGen(value: string) {
  if (!GEN_DECIMAL.test(value)) return null;
  try {
    const parsed = parseEther(value);
    return parsed <= MAX_U256 ? parsed : null;
  } catch {
    return null;
  }
}

function validHttpsUrl(value: string) {
  if (value.length === 0 || value.length > 4096 || /\s/.test(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function CreateSpendRequestDialog({
  open,
  onOpenChange,
  address,
  eligibleVaults,
  writeClient,
  state,
  transactionHash,
  transactionError,
  submit,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<Form>(() => initialForm(address, eligibleVaults));
  const [submitValidationError, setSubmitValidationError] = useState<string | null>(null);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const amount = parseGen(form.amount);
    const selectedVault = eligibleVaults.find(
      (vault) => vault.id.toString() === form.vaultId,
    );

    if (!selectedVault) errors.push("Choose an active vault where this wallet is the authorized agent.");
    if (!isAddress(form.recipient)) errors.push("Enter a valid recipient address.");
    if (amount === null || amount === BigInt(0)) errors.push("Amount must be a positive GEN value.");
    if (
      selectedVault &&
      amount !== null &&
      amount > selectedVault.balance - selectedVault.reservedBalance
    ) {
      errors.push("Amount exceeds the vault’s currently unreserved balance.");
    }
    if (form.purpose.trim().length === 0 || form.purpose.length > 1000) {
      errors.push("Purpose must be 1–1,000 characters.");
    }
    if (form.category.trim().length === 0 || form.category.length > 128) {
      errors.push("Category must be 1–128 characters.");
    }
    if (!validHttpsUrl(form.primaryEvidenceUrl)) {
      errors.push("Primary evidence must be a valid HTTPS URL.");
    }
    if (!SHA256.test(form.primaryEvidenceSha256)) {
      errors.push("Primary evidence SHA-256 must be exactly 64 hexadecimal characters.");
    }
    if (!validHttpsUrl(form.corroborationUrl)) {
      errors.push("Corroboration evidence must be a valid HTTPS URL.");
    }
    if (!SHA256.test(form.corroborationSha256)) {
      errors.push("Corroboration SHA-256 must be exactly 64 hexadecimal characters.");
    }
    if (
      form.primaryEvidenceUrl.length > 0 &&
      form.primaryEvidenceUrl === form.corroborationUrl
    ) {
      errors.push("Primary and corroboration evidence URLs must differ.");
    }

    const observedMs = Date.parse(form.evidenceObservedAt);
    const observedSeconds =
      Number.isFinite(observedMs) ? Math.floor(observedMs / 1000) : null;
    if (observedSeconds === null || observedSeconds < 0) {
      errors.push("Enter a valid evidence observation time.");
    }

    return {
      errors,
      values:
        errors.length === 0 &&
        amount !== null &&
        selectedVault &&
        observedSeconds !== null &&
        isAddress(form.recipient)
          ? {
              vaultId: selectedVault.id,
              recipient: form.recipient as Address,
              amount,
              observedAt: BigInt(observedSeconds),
            }
          : null,
    };
  }, [form, eligibleVaults]);

  const isSubmitting = ["awaiting_wallet", "submitted", "consensus"].includes(state);

  const update = (field: keyof Form, value: string) => {
    setSubmitValidationError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadDemo = () => {
    const demoVault =
      eligibleVaults.find(
        (vault) =>
          vault.id === BigInt(1) &&
          vault.balance - vault.reservedBalance >= BigInt(3000),
      ) ??
      eligibleVaults.find(
        (vault) => vault.balance - vault.reservedBalance >= BigInt(3000),
      );

    setForm({
      vaultId: demoVault?.id.toString() ?? eligibleVaults[0]?.id.toString() ?? "",
      recipient: DEMO_WALLET,
      amount: "0.000000000000003",
      purpose: "Pay production API service invoice",
      category: "API_SERVICES",
      primaryEvidenceUrl: DEMO_PRIMARY,
      primaryEvidenceSha256:
        "82203716411f5261eeccaac0be07af1d90d95dd92afebc55fd377eba2872018f",
      corroborationUrl: DEMO_CORROBORATION,
      corroborationSha256:
        "36805e0b09bb8aed2e0289d9c98da94a3b4b750c37f29dcd19c9c07285b449e0",
      evidenceObservedAt: localDateTimeNow(),
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.values || isSubmitting) return;

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (validation.values.observedAt > nowSeconds) {
      setSubmitValidationError("Evidence observation time cannot be in the future.");
      return;
    }

    setSubmitValidationError(null);

    const succeeded = await submit({
      writeClient,
      request: {
        address: OMNIMANDATE_CONTRACT_ADDRESS,
        functionName: "create_spend_request",
        args: [
          validation.values.vaultId,
          validation.values.recipient,
          validation.values.amount,
          form.purpose,
          form.category,
          form.primaryEvidenceUrl,
          form.primaryEvidenceSha256.toLowerCase(),
          form.corroborationUrl,
          form.corroborationSha256.toLowerCase(),
          validation.values.observedAt,
        ],
        value: BigInt(0),
      },
    });

    if (succeeded) {
      await onSuccess();
      onOpenChange(false);
    }
  };

  const demoAvailable = address.toLowerCase() === DEMO_WALLET.toLowerCase();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="vault-dialog__overlay" />
        <Dialog.Content
          className="vault-dialog__content request-dialog__content"
          aria-describedby="create-request-description"
        >
          <div className="vault-dialog__head">
            <div>
              <span className="technical-label">Evidence-bound spend</span>
              <Dialog.Title>Create spend request</Dialog.Title>
              <Dialog.Description id="create-request-description">
                Reserve an exact amount against a vault and bind two immutable evidence records before validator adjudication.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="vault-dialog__close"
              disabled={isSubmitting}
              aria-label="Close create spend request dialog"
            >
              <X size={17} />
            </Dialog.Close>
          </div>

          {demoAvailable && (
            <button
              className="demo-fixture-button"
              type="button"
              onClick={loadDemo}
              disabled={isSubmitting}
            >
              <FileCheck2 size={15} />
              Load verified Bradbury approval demo
            </button>
          )}

          <form className="vault-form" onSubmit={handleSubmit}>
            <div className="vault-form__grid">
              <label>
                Vault
                <select
                  value={form.vaultId}
                  onChange={(event) => update("vaultId", event.target.value)}
                  disabled={isSubmitting}
                >
                  {eligibleVaults.map((vault) => (
                    <option value={vault.id.toString()} key={vault.id.toString()}>
                      #{vault.id.toString()} · {vault.title}
                    </option>
                  ))}
                </select>
                <small>Only active vaults where this wallet is the current authorized agent are listed.</small>
              </label>
              <label>
                Amount (GEN)
                <input
                  value={form.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  inputMode="decimal"
                  placeholder="0.000000000000003"
                  disabled={isSubmitting}
                />
                <small>The exact amount is immutable once submitted.</small>
              </label>
            </div>

            <label>
              Recipient
              <input
                value={form.recipient}
                onChange={(event) => update("recipient", event.target.value)}
                placeholder="0x…"
                autoComplete="off"
                disabled={isSubmitting}
              />
            </label>

            <div className="vault-form__grid">
              <label>
                Purpose
                <input
                  value={form.purpose}
                  onChange={(event) => update("purpose", event.target.value)}
                  maxLength={1000}
                  placeholder="Pay production API service invoice"
                  disabled={isSubmitting}
                />
              </label>
              <label>
                Category
                <input
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  maxLength={128}
                  placeholder="API_SERVICES"
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <label>
              Primary evidence URL
              <input
                value={form.primaryEvidenceUrl}
                onChange={(event) => update("primaryEvidenceUrl", event.target.value)}
                placeholder="https://…"
                disabled={isSubmitting}
              />
            </label>
            <label>
              Primary evidence SHA-256
              <input
                className="mono-input"
                value={form.primaryEvidenceSha256}
                onChange={(event) => update("primaryEvidenceSha256", event.target.value)}
                maxLength={64}
                placeholder="64 hex characters"
                disabled={isSubmitting}
              />
            </label>
            <label>
              Corroboration URL
              <input
                value={form.corroborationUrl}
                onChange={(event) => update("corroborationUrl", event.target.value)}
                placeholder="https://…"
                disabled={isSubmitting}
              />
            </label>
            <label>
              Corroboration SHA-256
              <input
                className="mono-input"
                value={form.corroborationSha256}
                onChange={(event) => update("corroborationSha256", event.target.value)}
                maxLength={64}
                placeholder="64 hex characters"
                disabled={isSubmitting}
              />
            </label>

            <label>
              Evidence observed at
              <input
                type="datetime-local"
                value={form.evidenceObservedAt}
                onChange={(event) => update("evidenceObservedAt", event.target.value)}
                disabled={isSubmitting}
              />
              <small>The contract rejects future or stale observations according to the bound mandate.</small>
            </label>

            {(validation.errors.length > 0 || submitValidationError) && (
              <div className="vault-form__validation" aria-live="polite">
                {submitValidationError ?? validation.errors[0]}
              </div>
            )}
            {transactionError && (
              <div className="vault-form__error" role="alert">
                {transactionError}
              </div>
            )}
            {state !== "idle" && (
              <TransactionJourney
                compact
                state={state}
                transactionHash={transactionHash}
                error={transactionError}
              />
            )}

            <div className="vault-form__actions">
              <Dialog.Close
                type="button"
                className="quiet-button"
                disabled={isSubmitting}
              >
                Cancel
              </Dialog.Close>
              <button
                className="app-primary-button"
                type="submit"
                disabled={!validation.values || isSubmitting}
              >
                {isSubmitting && <LoaderCircle className="is-spinning" size={15} />}
                {isSubmitting ? "Transaction in progress" : "Submit request"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
