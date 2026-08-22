# OmniMandate v1 Threat Model

Status: frozen pre-implementation threat model.

## Assets

- GEN attributed to vault balances;
- reserved amounts;
- recipient/owner claimable balances;
- mandate history;
- request history;
- policy/evidence resolution fields.

## Key threats and controls

### T1 — Unauthorized request
Only the current active agent can create requests.

### T2 — Owner drains reserved funds
Owner recovery is limited to `balance - reserved_balance`.

### T3 — Concurrent budget oversubscription
Reserve the full amount when a request is created.

### T4 — Period boundary erases pending obligations
Carry `current_period_reserved` across every period rollover until requests
resolve.

### T5 — Unsafe mandate budget reduction
Reject a new mandate if its `period_budget` is below current spent + reserved
after period synchronization.

### T6 — Period redefinition by policy update
`period_seconds` is immutable vault state rather than a mutable mandate field.

### T7 — Retroactive semantic-policy rewrite
Each request stores immutable mandate version/hash.

### T8 — Prompt injection
Fetched documents are explicitly untrusted evidence data. Evidence cannot alter
the task, roles, output schema, or policy.

### T9 — Evidence mutation
Bind URL + SHA-256 and require validator refetch/hash verification.

### T10 — Same-source pseudo-corroboration
Require distinct URLs but never claim organizational independence from URL
difference alone.

### T11 — Stale evidence
Check freshness at request creation and again at adjudication against the
request's bound mandate version.

### T12 — Future-dated evidence
Reject observation timestamps later than the transaction time.

### T13 — Ambiguous result releases capital
Fail closed: only `COMPLIANT + CORROBORATED` approves.

### T14 — Validator invents transfer amount
Validator output contains no transfer amount. The immutable requested amount is
either credited exactly or not credited.

### T15 — Double adjudication/release
Only `SUBMITTED` requests can adjudicate.

### T16 — Double cancellation/reservation release
Only `SUBMITTED` requests can cancel; release occurs once.

### T17 — Double withdrawal
Claimable bookkeeping must prevent a second transfer of the same balance and
follow the target runtime's safe external-transfer ordering.

### T18 — Agent compromise
Owner can pause the vault, revoke/replace the agent, and cancel unresolved
requests. A revoked former agent cannot adjudicate old requests.

### T19 — Pause bypass
Paused vault blocks both new requests and new adjudications. Existing claimable
withdrawals remain unaffected.

## Core invariants

- INV-01: `reserved_balance <= vault.balance`
- INV-02: period spent + reserved <= active period budget
- INV-03: approved amount == immutable requested amount
- INV-04: request mandate version/hash never changes
- INV-05: resolved/cancelled request cannot resolve again
- INV-06: denied/cancelled request creates no recipient award
- INV-07: denial/cancellation releases reservation exactly once
- INV-08: only `COMPLIANT + CORROBORATED` approves
- INV-09: owner recovery never consumes reserved funds
- INV-10: agent cannot directly withdraw treasury funds
- INV-11: period rollover never clears unresolved reservations
- INV-12: mandate update cannot set budget below current spent + reserved
