"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { isAddress, parseEther, type Address } from "viem";
import { LoaderCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TransactionJourney } from "@/components/app-shell/transaction-journey";
import type { GenLayerWriteClient } from "@/components/wallet/wallet-provider";
import type { TransactionState } from "@/hooks/use-genlayer-transaction";
import { OMNIMANDATE_CONTRACT_ADDRESS } from "@/lib/genlayer";

type CreateVaultForm = {
  authorizedAgent: string;
  title: string;
  policyText: string;
  maxSingleSpend: string;
  periodBudget: string;
  periodSeconds: string;
  maxEvidenceAgeSeconds: string;
  initialFunding: string;
};

type CreateVaultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const INITIAL_FORM: CreateVaultForm = {
  authorizedAgent: "",
  title: "",
  policyText: "",
  maxSingleSpend: "",
  periodBudget: "",
  periodSeconds: "",
  maxEvidenceAgeSeconds: "",
  initialFunding: "0",
};

const MAX_U256 = (BigInt(1) << BigInt(256)) - BigInt(1);
const GEN_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

function parseGen(value: string) {
  if (!GEN_DECIMAL.test(value)) return null;
  try {
    const parsed = parseEther(value);
    return parsed <= MAX_U256 ? parsed : null;
  } catch {
    return null;
  }
}

function parsePositiveU256(value: string) {
  if (!POSITIVE_INTEGER.test(value)) return null;
  try {
    const parsed = BigInt(value);
    return parsed <= MAX_U256 ? parsed : null;
  } catch {
    return null;
  }
}

function validateForm(form: CreateVaultForm) {
  const errors: string[] = [];
  const maxSingleSpend = parseGen(form.maxSingleSpend);
  const periodBudget = parseGen(form.periodBudget);
  const initialFunding = parseGen(form.initialFunding);
  const periodSeconds = parsePositiveU256(form.periodSeconds);
  const maxEvidenceAgeSeconds = parsePositiveU256(form.maxEvidenceAgeSeconds);

  if (!isAddress(form.authorizedAgent)) errors.push("Enter a valid authorized agent address.");
  if (form.title.trim().length === 0 || form.title.length > 120) errors.push("Title must be 1–120 characters.");
  if (form.policyText.trim().length === 0 || form.policyText.length > 20_000) errors.push("Policy text must be 1–20,000 characters.");
  if (maxSingleSpend === null || maxSingleSpend === BigInt(0)) errors.push("Maximum single spend must be a positive GEN amount.");
  if (periodBudget === null || periodBudget === BigInt(0)) errors.push("Period budget must be a positive GEN amount.");
  if (maxSingleSpend !== null && periodBudget !== null && maxSingleSpend > periodBudget) errors.push("Maximum single spend cannot exceed the period budget.");
  if (periodSeconds === null) errors.push("Period length must be a positive whole number of seconds.");
  if (maxEvidenceAgeSeconds === null) errors.push("Maximum evidence age must be a positive whole number of seconds.");
  if (initialFunding === null) errors.push("Initial funding must be a non-negative GEN amount with up to 18 decimals.");

  return {
    errors,
    values: maxSingleSpend !== null && periodBudget !== null && periodSeconds !== null && maxEvidenceAgeSeconds !== null && initialFunding !== null && isAddress(form.authorizedAgent)
      ? { authorizedAgent: form.authorizedAgent as Address, maxSingleSpend, periodBudget, periodSeconds, maxEvidenceAgeSeconds, initialFunding }
      : null,
  };
}

export function CreateVaultDialog({
  open,
  onOpenChange,
  writeClient,
  state,
  transactionHash,
  transactionError,
  submit,
  onSuccess,
}: CreateVaultDialogProps) {
  const [form, setForm] = useState<CreateVaultForm>(INITIAL_FORM);
  const validation = useMemo(() => validateForm(form), [form]);
  const isSubmitting = ["awaiting_wallet", "submitted", "consensus", "accepted"].includes(state);

  const update = (field: keyof CreateVaultForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.values || isSubmitting) return;

    const succeeded = await submit({
      writeClient,
      request: {
        address: OMNIMANDATE_CONTRACT_ADDRESS,
        functionName: "create_vault",
        args: [
          validation.values.authorizedAgent,
          form.title,
          form.policyText,
          validation.values.maxSingleSpend,
          validation.values.periodBudget,
          validation.values.periodSeconds,
          validation.values.maxEvidenceAgeSeconds,
        ],
        value: validation.values.initialFunding,
      },
    });

    if (succeeded) {
      await onSuccess();
      onOpenChange(false);
    }
  };

  return <Dialog.Root open={open} onOpenChange={handleOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="vault-dialog__overlay" />
      <Dialog.Content className="vault-dialog__content" aria-describedby="create-vault-description">
        <div className="vault-dialog__head">
          <div><span className="technical-label">New treasury</span><Dialog.Title>Create vault</Dialog.Title><Dialog.Description id="create-vault-description">Set the initial mandate and optional native GEN funding. This contract call is finalized only after consensus and successful execution.</Dialog.Description></div>
          <Dialog.Close className="vault-dialog__close" disabled={isSubmitting} aria-label="Close create vault dialog"><X size={17} /></Dialog.Close>
        </div>
        <form className="vault-form" onSubmit={handleSubmit}>
          <label>Authorized agent<input value={form.authorizedAgent} onChange={(event) => update("authorizedAgent", event.target.value)} placeholder="0x…" autoComplete="off" disabled={isSubmitting} /><small>Address permitted to operate this vault’s spend requests.</small></label>
          <label>Vault title<input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={120} placeholder="Operations reserve" disabled={isSubmitting} /><small>Required, up to 120 characters.</small></label>
          <label>Policy text<textarea value={form.policyText} onChange={(event) => update("policyText", event.target.value)} maxLength={20_000} placeholder="Describe the spending policy…" rows={4} disabled={isSubmitting} /><small>Required mandate text, up to 20,000 characters.</small></label>
          <div className="vault-form__grid">
            <label>Maximum single spend (GEN)<input value={form.maxSingleSpend} onChange={(event) => update("maxSingleSpend", event.target.value)} inputMode="decimal" placeholder="0.25" disabled={isSubmitting} /><small>Positive; cannot exceed the period budget.</small></label>
            <label>Period budget (GEN)<input value={form.periodBudget} onChange={(event) => update("periodBudget", event.target.value)} inputMode="decimal" placeholder="1" disabled={isSubmitting} /><small>Positive native GEN allocation per period.</small></label>
            <label>Period length (seconds)<input value={form.periodSeconds} onChange={(event) => update("periodSeconds", event.target.value)} inputMode="numeric" placeholder="86400" disabled={isSubmitting} /><small>Positive whole seconds.</small></label>
            <label>Maximum evidence age (seconds)<input value={form.maxEvidenceAgeSeconds} onChange={(event) => update("maxEvidenceAgeSeconds", event.target.value)} inputMode="numeric" placeholder="604800" disabled={isSubmitting} /><small>Positive whole seconds.</small></label>
          </div>
          <label>Initial funding (GEN)<input value={form.initialFunding} onChange={(event) => update("initialFunding", event.target.value)} inputMode="decimal" placeholder="0" disabled={isSubmitting} /><small>Native GEN sent with this payable call. Zero is allowed.</small></label>
          {validation.errors.length > 0 && <div className="vault-form__validation" aria-live="polite">{validation.errors[0]}</div>}
          {transactionError && <div className="vault-form__error" role="alert">{transactionError}</div>}
          {state !== "idle" && <TransactionJourney compact state={state} transactionHash={transactionHash} error={transactionError} />}
          <div className="vault-form__actions"><Dialog.Close type="button" className="quiet-button" disabled={isSubmitting}>Cancel</Dialog.Close><button className="app-primary-button" type="submit" disabled={!validation.values || isSubmitting}>{isSubmitting && <LoaderCircle className="is-spinning" size={15} />}{isSubmitting ? "Transaction in progress" : "Create vault"}</button></div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
