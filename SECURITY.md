# Security Policy

OmniMandate is a Bradbury testnet project with an explicit security model around treasury authority, evidence binding, bounded validator output, and transaction finality.

## Reporting a vulnerability

Please **do not publish sensitive vulnerability details, private keys, wallet recovery material, or an active exploit in a public issue**.

Use a private maintainer contact or GitHub's private security-reporting mechanism if it is enabled for this repository. Include:

- affected commit;
- affected contract/frontend component;
- reproduction steps;
- expected vs. observed behavior;
- whether funds or authorization boundaries are involved;
- whether the issue requires a live Bradbury transaction;
- any relevant logs or transaction hashes with secrets removed.

## Security-sensitive areas

Changes deserve additional review when they affect:

- owner or authorized-agent checks;
- vault balances/reservations;
- mandate versioning/hashes;
- request recipient or amount;
- evidence references/digests/freshness;
- nondeterministic prompts or validator logic;
- approval/denial settlement;
- claimable balances;
- withdrawal;
- accepted/finalized state handling;
- wallet connection/write flow;
- deployed contract address/network configuration.

## Core security principles

### Fixed monetary authority

The validator does not choose the payment amount. A request fixes the amount before adjudication and contract code determines whether that exact amount or zero can settle.

### Fail closed

Malformed, inaccessible, stale, inconsistent, or insufficient evidence should not silently become an approval path.

### Independent evaluation

Validator reasoning is not accepted from the agent. Validators recompute the decision from the bound mandate/request/evidence.

### Evidence binding

Evidence references and SHA-256 digests belong to the contract record. The frontend displays those fields but does not create authority by displaying them.

### Finality awareness

Accepted state is not irreversible finality. Withdrawal and irreversible claims must respect the implemented finality model.

### No secret-bearing frontend

The public frontend must not contain private keys or wallet seed material. User-authorized writes flow through the connected wallet.

## Testnet scope

The current deployment is Bradbury testnet only.

Do not treat this repository as:

- an audited production custody system;
- a mainnet deployment;
- a guarantee that validators cannot be fooled;
- a substitute for organizational treasury controls.

## Responsible testing

Prefer:

- local/unit/Direct Mode reproduction;
- read-only Bradbury calls;
- isolated test wallets;
- minimum-value testnet transactions only when a live write is genuinely required.

Avoid creating unnecessary network writes during reviewer verification.

## Reference documents

- [Threat model](docs/THREAT_MODEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [v1 specification](docs/SPEC_V1.md)
- [Runtime compatibility](docs/RUNTIME_COMPATIBILITY.md)
- [Bradbury verification](docs/BRADBURY_LIVE_VERIFICATION.md)
