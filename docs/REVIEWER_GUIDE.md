# Reviewer Guide

This guide gives a short, evidence-first path through OmniMandate without requiring a reviewer to create new funded Bradbury transactions.

## Project identifiers

| Item | Value |
| --- | --- |
| Live app | https://omnimandate-i1am.vercel.app/ |
| Network | GenLayer Bradbury Testnet |
| Contract | `0x04c1E361ec0Da96a263794F1f582989c2419267C` |
| Frozen contract SHA-256 | `adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076` |
| Direct Mode regression baseline | **84 / 84 passing** |
| Current UI documentation refresh | 2026-08-23 |

## Five-minute review path

### 1. Understand the safety model

Read the root README and focus on the central invariant:

> the validator never chooses the payment amount.

The agent fixes the request amount before adjudication. Validators classify the bound request/evidence. Deterministic contract code can settle the exact request amount or zero.

### 2. Inspect the live workspace

Open the live app and inspect the workspace in this order:

```text
Overview
→ Vaults
→ Spend Requests
→ Mandates
→ Evidence
→ Activity
→ Documentation
```

No transaction is required for this read-only review path.

The current UI should show:

- two discovered vaults for the demonstrated account;
- three associated requests;
- both approved and denied outcomes;
- versioned mandate information;
- evidence URLs and SHA-256 digests;
- historical activity;
- a distinct Accepted → Finalized transaction lifecycle.

### 3. Verify the exact deployed source

From the repository root:

```bash
shasum -a 256 contracts/omnimandate.py
```

Expected:

```text
adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076
```

A different hash means the local source must not be described as the frozen Bradbury deployment without a new deployment/verification record.

### 4. Review test coverage

Start with:

- [TEST_MATRIX.md](TEST_MATRIX.md)
- [RUNTIME_COMPATIBILITY.md](RUNTIME_COMPATIBILITY.md)

Known verified Direct Mode baseline:

```text
84 / 84 tests passed
```

The suite covers the v1 contract behavior, including approval and rejection paths.

### 5. Review live-network evidence

Read [BRADBURY_LIVE_VERIFICATION.md](BRADBURY_LIVE_VERIFICATION.md).

The live verification record is the authoritative repository document for Bradbury execution evidence. It documents approval, denial, finality behavior, and finalized withdrawal.

## Reproduce local checks

### Contract

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt

python3 -m pytest -q
genvm-lint check contracts/omnimandate.py
genvm-lint typecheck contracts/omnimandate.py
genvm-lint schema contracts/omnimandate.py --output abi.json
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
npx tsc --noEmit
npm audit
```

### Documentation

```bash
python3 scripts/verify_documentation.py
git diff --check
```

## Evidence map

| Claim | Primary repository evidence |
| --- | --- |
| Product semantics | [SPEC_V1.md](SPEC_V1.md) |
| Contract/system architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Security assumptions | [THREAT_MODEL.md](THREAT_MODEL.md) |
| Runtime support | [RUNTIME_COMPATIBILITY.md](RUNTIME_COMPATIBILITY.md) |
| Regression scope | [TEST_MATRIX.md](TEST_MATRIX.md) |
| Live Bradbury execution | [BRADBURY_LIVE_VERIFICATION.md](BRADBURY_LIVE_VERIFICATION.md) |
| Current UI | [PRODUCT_WALKTHROUGH.md](PRODUCT_WALKTHROUGH.md) |
| Deployment boundary | [DEPLOYMENT.md](DEPLOYMENT.md) |

## Important semantics

### Accepted is not finalized

The frontend may surface accepted contract state so the application remains usable while the network continues toward finality. The UI and docs must not describe acceptance as irreversible settlement.

### Evidence is bound, not merely displayed

The request carries evidence references and SHA-256 digests. The visible evidence screen is a human-facing representation of those bound fields; it is not the source of authority.

### Validator output is bounded

The validator evaluates policy/evidence status. It does not return an unconstrained transfer amount.

### A denial is a successful safety outcome

A denied request is not treated as a system failure. The rejection path demonstrates that a corroborated request can still fail when the spend violates the mandate.

## What is not claimed

OmniMandate does **not** claim:

- mainnet readiness;
- an external security audit;
- that accepted state equals finality;
- that validators are infallible;
- that screenshots replace on-chain evidence;
- that public evidence cannot disappear or be manipulated;
- that this testnet application should hold real-value production treasury funds.

These boundaries are intentional and should remain explicit in submission material.
