# OmniMandate v1 Architecture

Status: product/storage semantics frozen; implementation syntax awaits target
GenLayer runtime verification.

## 1. System boundary

```text
Vault owner
   |
   | configuration / funding / emergency controls
   v
OmniMandate Intelligent Contract
   ^
   | spend request + bound evidence
   |
Current authorized agent

request
  -> deterministic validation
  -> reserve requested amount
  -> GenLayer validator adjudication
  -> bounded policy/evidence result
  -> deterministic APPROVED or DENIED
  -> claimable accounting
```

## 2. Deterministic responsibilities

- ownership;
- current-agent authorization;
- pause state;
- balance accounting;
- reservation accounting;
- period rollover;
- mandate versioning;
- numeric limits;
- evidence field validation;
- evidence freshness checks;
- request lifecycle;
- approval mapping;
- claimable balances;
- withdrawal bookkeeping.

## 3. Intelligent responsibilities

Validators decide only:

- whether the claimed purpose/category complies with the immutable
  natural-language mandate;
- whether the bound evidence supports the claimed expenditure;
- whether the records substantively corroborate each other;
- whether compliance is clear enough for a bounded result.

They do not choose an amount.

## 4. Storage domains

### Global

- vault count;
- request count;
- vault mapping;
- versioned mandate mapping/namespace;
- request mapping;
- claimable mapping.

### Vault

Owns treasury/budget state, the stable period anchor, and points to the active
mandate version.

### Mandate version

Immutable semantic policy and request-creation controls.

### Spend request

Immutable request/evidence facts plus mutable resolution fields.

## 5. Stable period anchor

`period_seconds` belongs to the vault, not to individual mandate versions.

This prevents a mandate update from retroactively redefining the meaning of
existing period accounting.

Before any operation that uses period counters, `_sync_period(vault)` should
conceptually:

```text
elapsed = transaction_time - period_started_at

if elapsed >= period_seconds:
    periods = floor(elapsed / period_seconds)
    period_started_at += periods * period_seconds
    current_period_spent = 0
    current_period_reserved = unchanged
```

Reservations carry across boundaries.

Approval after rollover converts reservation to spent in the new period.
Denial/cancellation releases it.

## 6. Mandate updates

A new mandate version applies immediately to new requests.

Before activation:

1. synchronize the vault period;
2. require its budget to cover existing period pressure:

```text
new_budget >= current_period_spent + current_period_reserved
```

Existing requests retain their original mandate snapshot for semantic
adjudication and evidence freshness.

## 7. Reservation model

Reserve on request creation.

This prevents concurrent pending requests from each passing an independent
budget check and collectively oversubscribing the treasury.

Core invariants:

```text
reserved_balance <= balance

current_period_spent + current_period_reserved
<= active_mandate.period_budget
```

The second invariant is preserved when changing mandate versions by rejecting a
new period budget below existing pressure.

## 8. Pause semantics

Pause is an emergency-control boundary.

While paused:

- no new spend request;
- no new adjudication;
- owner can cancel pending requests;
- owner can revoke/replace agent;
- owner can publish a mandate version;
- owner can fund/recover unreserved funds;
- existing claimable balances remain withdrawable.

## 9. Adjudication

Before adjudication:

1. require request state `SUBMITTED`;
2. require vault active;
3. require caller owner or current active agent;
4. synchronize the period;
5. re-check evidence freshness using the request's bound mandate;
6. copy required storage records into memory as required by the runtime;
7. enter the nondeterministic/consensus block.

Validator output:

```text
policy_status
evidence_status
reason
```

Only policy/evidence status affect settlement.

## 10. Evidence path

The validator receives immutable:

- policy text/hash;
- amount/recipient/purpose/category;
- evidence URLs/digests;
- evidence observation time/freshness rule.

Validators independently fetch the evidence, verify its digests, and reason
over the contents.

The prompt marks fetched content as `UNTRUSTED EVIDENCE DATA`.

## 11. Settlement

Binary financial mapping:

```text
COMPLIANT + CORROBORATED -> APPROVED
anything else            -> DENIED
```

APPROVED:

```text
reservation -> spent
vault balance decreases
claimable[recipient] increases
```

DENIED:

```text
reservation released
recipient claimable unchanged
```

## 12. Pull payments

Semantic adjudication does not directly choose or execute an arbitrary external
payment.

The deterministic settlement step credits claimable balances.

`withdraw()` later handles the external transfer according to target GenLayer
message/finality semantics.

## 13. Transaction-state separation

Application:

- `SUBMITTED`
- `APPROVED`
- `DENIED`
- `CANCELLED`

Network transaction lifecycle:

- may include `ACCEPTED`, `FINALIZED`, appeals, and execution results.

The UI/test reports must not conflate the two.

## 14. Implementation gate

Before writing the contract, verify exact target-runtime support for:

- `@allow_storage` dataclasses;
- `TreeMap` / `DynArray`;
- `Address`;
- `u256`;
- `@gl.public.write.payable`;
- `gl.message.value`;
- transaction datetime semantics;
- storage-to-memory copy before nondeterministic work;
- web fetch inside an equivalence-principle block;
- comparative consensus for classification/settlement;
- JSON prompt responses;
- external EOA transfer/finality behavior;
- Direct Mode time/balance/web mocks;
- schema/ABI generation.
