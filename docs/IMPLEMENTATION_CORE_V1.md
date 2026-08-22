# Deterministic Core — Direct Mode Gate

This revision fixes one API mismatch discovered before runtime testing:

```text
Frozen semantic API:
get_mandate(vault_id, version)
```

The first core implementation exposed only `get_mandate(mandate_id)`. The contract
now preserves the frozen public semantics by walking the immutable linked
mandate history from the vault's active mandate.

`get_mandate_by_id(mandate_id)` remains an additional convenience view.

## Direct Mode tests in this slice

`test_omnimandate_core_direct.py` covers:

- zero-funded vault creation;
- funded vault creation;
- initial mandate/hash;
- counters;
- owner funding;
- zero funding rejection;
- non-owner funding rejection;
- agent replacement;
- integer-encoded address normalization;
- pause/resume;
- duplicate transition rejection;
- mandate v2 creation;
- immutable v1 preservation;
- non-owner mandate rejection;
- missing mandate version;
- hard policy bounds.

`test_omnimandate_period_direct.py` covers:

- no rollover before boundary;
- rollover at exact boundary;
- multiple elapsed periods;
- safe budget increase;
- immutable vault-level period length.

Reservation carry-over is now exercised through real unresolved spend requests in the current implementation. No test-only production backdoor is used.

## Current verification

This core slice is integrated into the current v1 contract.

On 2026-08-22 the complete Direct Mode regression suite passed **84/84 tests**.
