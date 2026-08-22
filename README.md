# OmniMandate

**Policy-bound treasury control for autonomous agents on GenLayer.**

OmniMandate is a GenLayer Intelligent Contract project for controlling treasury
spending by AI agents and automated operators.

A vault owner defines versioned natural-language spending mandates plus hard
deterministic limits. An authorized agent may submit evidence-bound spend
requests, but capital can be released only when deterministic controls pass and
GenLayer validators return:

```text
COMPLIANT + CORROBORATED
```

Everything else fails closed.

> Status: **v1 product/storage semantics frozen; reproducible GenLayer
> development baseline and static compatibility probe verified.**
> Contract implementation has intentionally not started yet.

## Core rule

**The validator never chooses the payment amount.**

The agent proposes a fixed amount. Validators return bounded policy/evidence
status. Contract code either credits the exact immutable request amount or
credits zero.

## Lifecycle

```text
SUBMITTED
  ├── APPROVED
  ├── DENIED
  └── CANCELLED
```

GenLayer transaction states such as `ACCEPTED` and `FINALIZED` are separate
network states, not OmniMandate application states.

## Treasury safety

OmniMandate reserves requested funds before adjudication.

Pending reservations survive period rollover, preventing requests from escaping
budget pressure simply because a period boundary passed.

The v1 period length is immutable per vault. New mandate versions may change
the period budget only if the new budget still covers synchronized current
spend plus pending reservations.

## Validator result

```text
policy_status:
  COMPLIANT | NON_COMPLIANT | UNCLEAR

evidence_status:
  CORROBORATED | CONFLICTING | INSUFFICIENT
```

Only the first two fields affect settlement. The explanatory reason may vary.

## Evidence

Every request binds:

- primary HTTPS URL + SHA-256;
- corroboration HTTPS URL + SHA-256;
- observation timestamp.

Different URLs do not by themselves prove independent publishers or
infrastructure.

Fetched records are treated as **UNTRUSTED EVIDENCE DATA**.

## Verified development baseline

```text
Python        3.12.14
genlayer-py   a3dc35e04898e3889cbfa855bcaf7d2664675b8f
genlayer-test 9c09578b143905471fb0657dd53bdaf18da8e35f
genvm-linter  fa4a4d4536b28fdc2730e13a983ba01b69ccc6f3
pytest        8.4.2
```

The complete sorted dependency lock matches the previously proven ProofSLA
environment exactly.

Static pinned-runtime probe:

```text
CORE_PROBE      PASS
NONDET_PROBE    PASS
Overall         PASS
```

This is a static compatibility result, not a Direct Mode or Bradbury execution
claim.

## Repository structure

```text
contracts/              Intelligent Contract implementation (next phase)
docs/
  SPEC_V1.md
  ARCHITECTURE.md
  THREAT_MODEL.md
  TEST_MATRIX.md
  DECISIONS.md
  RUNTIME_COMPATIBILITY.md
tests/                  Direct Mode/runtime tests (implementation phase)
scripts/                reproducible verification tooling
requirements-dev.txt    direct development pins
requirements-lock.txt   exact verified environment snapshot
```

## Development order

```text
scope
→ originality sanity check
→ v1 specification
→ architecture
→ threat model
→ runtime compatibility
→ local toolchain pinning
→ contract implementation
→ Direct Mode
→ independent review
→ supported runtime
→ Bradbury
→ live evidence
→ frontend
→ browser E2E
→ production
→ submission
```

## Links

- Repository: https://github.com/Manablaq/omnimandate
- Target network: GenLayer Bradbury Testnet
- Live app: not deployed yet
- Contract: not deployed yet

## Documentation

- [v1 Specification](docs/SPEC_V1.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Test Matrix](docs/TEST_MATRIX.md)
- [Architecture Decisions](docs/DECISIONS.md)
- [Runtime Compatibility](docs/RUNTIME_COMPATIBILITY.md)
