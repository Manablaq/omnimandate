# OmniMandate Documentation

This directory is the reviewer and maintainer documentation hub for OmniMandate.

## Start here

| Document | Purpose |
| --- | --- |
| [Product walkthrough](PRODUCT_WALKTHROUGH.md) | Current application screens and user-facing behavior |
| [Reviewer guide](REVIEWER_GUIDE.md) | Fast, evidence-based review path |
| [v1 specification](SPEC_V1.md) | Normative product and contract behavior |
| [Architecture](ARCHITECTURE.md) | System boundaries, state, and consensus design |
| [Threat model](THREAT_MODEL.md) | Security assumptions, attack surface, and mitigations |
| [Test matrix](TEST_MATRIX.md) | Verification scope and regression coverage |
| [Runtime compatibility](RUNTIME_COMPATIBILITY.md) | GenVM/runtime constraints and verified compatibility |
| [Bradbury live verification](BRADBURY_LIVE_VERIFICATION.md) | Live testnet deployment and lifecycle evidence |
| [Deployment](DEPLOYMENT.md) | Public frontend and contract deployment boundaries |

## Implementation records

The repository also contains implementation-specific records for the major contract phases. They are useful when reviewing how the v1 behavior was built and validated:

- `IMPLEMENTATION_CORE_V1.md`
- `IMPLEMENTATION_REQUESTS_V1.md`
- `IMPLEMENTATION_ADJUDICATION_V1.md`
- `IMPLEMENTATION_WITHDRAWAL_V1.md`

These documents supplement the normative specification; they do not replace it.

## Documentation hierarchy

When two documents appear to discuss the same behavior, use this order:

1. deployed contract source and reproducible test evidence;
2. v1 specification;
3. architecture and threat model;
4. Bradbury verification record;
5. implementation notes;
6. screenshots and product prose.

Screenshots are useful reviewer evidence for the public UX but are not cryptographic proof of on-chain state.

## Current public identifiers

- Live application: https://omnimandate-i1am.vercel.app/
- Network: GenLayer Bradbury Testnet
- Contract: `0x04c1E361ec0Da96a263794F1f582989c2419267C`
- Frozen contract SHA-256: `adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076`
- Direct Mode baseline: **84 / 84 passing tests**
- Documentation refresh: 2026-08-23

## Maintaining these docs

When product behavior changes:

1. update the relevant normative/implementation document;
2. rerun contract and frontend verification;
3. replace stale screenshots;
4. update `PRODUCT_WALKTHROUGH.md`;
5. update the verified-status table in the root README;
6. run `python3 scripts/verify_documentation.py`;
7. do not claim a new contract version is the Bradbury deployment until that exact source is deployed and verified.
