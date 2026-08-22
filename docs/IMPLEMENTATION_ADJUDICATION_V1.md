# Intelligent Adjudication + Deterministic Settlement

Status: **uncommitted implementation candidate**

This slice adds the first consensus-critical OmniMandate intelligence path.

## Public API additions

```text
adjudicate_spend_request(request_id)
get_claimable(account)
```

Expected public ABI after this slice: **18 methods (9 write, 9 view)**.

## Consensus boundary

Leader and validator independently:

1. fetch the primary evidence;
2. verify its bound SHA-256;
3. fetch the corroboration evidence;
4. verify its bound SHA-256;
5. run the same constrained structured-JSON classification.

Only these fields are compared for equivalence:

```text
policy_status
evidence_status
```

`reason` is deliberately excluded from consensus.

## Intelligent output

```text
policy_status:
  COMPLIANT | NON_COMPLIANT | UNCLEAR

evidence_status:
  CORROBORATED | CONFLICTING | INSUFFICIENT
```

Only:

```text
COMPLIANT + CORROBORATED
```

approves.

Every other valid combination denies.

The model never chooses a payment amount. Settlement uses the request's
immutable amount or zero.

## Adjudication authorization

A request may be adjudicated only when:

- request state is `SUBMITTED`;
- vault is `ACTIVE`;
- caller is vault owner or current authorized agent.

A revoked former agent cannot adjudicate an old request.

## Bound mandate semantics

Adjudication locates the request's immutable `mandate_version` and verifies the
stored policy hash still matches `request.mandate_hash`.

Both semantic policy text and `max_evidence_age_seconds` therefore come from the
request's original mandate, not a later active mandate.

## Freshness fail-closed rule

If evidence was fresh at submission but has become stale by adjudication, the
request is deterministically denied without invoking the LLM:

```text
state = DENIED
policy_status = UNCLEAR
evidence_status = INSUFFICIENT
reason = evidence stale at adjudication
```

The reservation is released and no recipient award is created.

External fetch/digest/LLM execution failures do not award funds and do not
silently consume the request. They raise before settlement, leaving the request
`SUBMITTED` so the owner can retry later or cancel.

## Approval accounting

Approval converts the exact reservation:

```text
reserved_balance            -= amount
current_period_reserved      -= amount
current_period_spent         += amount
lifetime_spent               += amount
vault.balance                -= amount
claimable[recipient]         += amount
```

## Denial accounting

```text
reserved_balance            -= amount
current_period_reserved      -= amount
recipient award               = 0
```

## Pull-payment boundary

This slice creates `claimable` accounting only. It intentionally does **not**
add external transfer/withdrawal yet.

That separation matters in Direct Mode because payable `gl.message.value`
updates contract storage logic but does not automatically populate
`VMContext._balances`; external transfer behavior is tested separately in the
withdrawal/finality slice.

## Candidate contract SHA-256

```text
08d3f01f0cb3929720c58176cb5f90d603fe89d6e85fdc224252a74015690833
```

## Still NOT RUN

- external EOA withdrawal;
- supported-runtime execution;
- Studio execution;
- Bradbury deployment/finality;
- live-web evidence.
