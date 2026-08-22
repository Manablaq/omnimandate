# Spend Requests + Reservation Accounting Slice

Status: **integrated into the current v1 implementation**

This document records the deterministic request/reservation implementation
slice. Intelligent adjudication, settlement, recovery, and withdrawal are
implemented in the current v1 contract.

## Added storage

`SpendRequest` stores:

- immutable request ID / vault ID;
- requester and recipient;
- immutable amount;
- purpose and category;
- primary/corroboration URLs and SHA-256 digests;
- evidence observation timestamp;
- bound mandate version/hash;
- creation/resolution timestamps;
- request state;
- policy/evidence/reason result fields reserved for adjudication.

## Added public methods

```text
create_spend_request(...)
cancel_spend_request(request_id)
get_spend_request(request_id)
get_request_count()
```

## Deterministic creation rules

A request is rejected when:

- the vault is paused;
- the caller is not the current authorized agent;
- the recipient is the zero address;
- amount is zero;
- amount exceeds the bound mandate single-spend cap;
- purpose is empty or exceeds the deterministic size bound;
- category is empty or exceeds the deterministic size bound;
- either evidence URL exceeds the deterministic size bound;
- either evidence URL is non-HTTPS or obviously malformed;
- the two evidence URLs are identical;
- either SHA-256 digest is malformed;
- evidence time is in the future;
- evidence is already stale under the active mandate;
- unreserved vault balance is insufficient;
- current-period budget would be oversubscribed.

A valid request immediately reserves the exact requested amount in both
`reserved_balance` and `current_period_reserved`.

## Cancellation

Only a `SUBMITTED` request can cancel.

Caller must be:

- vault owner; or
- original request creator.

Cancellation synchronizes period state, releases the reservation exactly once,
marks `CANCELLED`, and creates no recipient award.

A revoked former agent retains only the frozen original-requester cancellation
right; revocation still blocks new requests and will block adjudication in the
next slice.

## Period rule

At rollover:

```text
current_period_spent = 0
current_period_reserved = unchanged
```

This slice now exercises that rule with real unresolved reservations rather
than synthetic state.

## Historical slice source fingerprint

```text
a489f8bafb1fa043f964a62140535af7af4a4a9fdcf8c123b558bdaac42d37c1
```

## Current integration status

The current v1 contract also includes:

- validator web fetch and SHA-256 verification;
- `adjudicate_spend_request`;
- `APPROVED` / `DENIED` settlement;
- claimable balances;
- owner recovery;
- external withdrawal.

The complete Direct Mode regression suite passed **84/84 tests** on
2026-08-22.
