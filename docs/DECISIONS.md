# OmniMandate Architecture Decisions

These decisions should not be silently changed during implementation.

## ADR-001 — Binary financial outcome

Validators cannot choose payment amounts.

## ADR-002 — Fail closed

Only `COMPLIANT + CORROBORATED` approves.

## ADR-003 — Versioned mandates

Existing requests retain immutable policy version/hash and freshness rules.

## ADR-004 — Reserve at request creation

Pending requests cannot collectively oversubscribe the treasury.

## ADR-005 — Carry reservations across period rollover

At rollover, reset `current_period_spent` but keep
`current_period_reserved`.

Rationale: unresolved obligations remain budget pressure until they resolve.

## ADR-006 — Stable period length

`period_seconds` is vault-level and immutable in v1.

Rationale: policy updates must not redefine prior budget windows.

## ADR-007 — Safe mandate budget updates

A new mandate cannot activate with `period_budget` below synchronized current
spent + reserved.

## ADR-008 — Pull payments

Settlement credits claimable balances; external transfer is separate.

## ADR-009 — One current active agent per vault

Reduces authorization complexity while preserving the core use case.

## ADR-010 — Revocation removes adjudication authority

A former agent cannot adjudicate old requests after revocation. The owner or
new current agent can resolve them; owner can cancel them.

## ADR-011 — Pause blocks new adjudications

Pause is an emergency-control boundary, not merely a UI flag.

## ADR-012 — Different URLs are not proof of independence

URL distinction is an anti-duplication rule only.

## ADR-013 — Runtime verification precedes implementation

Do not freeze stale GenLayer APIs or dependency versions.

## ADR-014 — Evidence freshness rechecked at adjudication

A request that waits beyond its bound freshness window fails closed rather than
silently using stale evidence.
