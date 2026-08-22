# Withdrawal + Owner Treasury Recovery

Status: **uncommitted implementation candidate**

This slice adds the final pull-payment primitives to the deterministic treasury
accounting layer.

## Public API additions

```text
withdraw_unreserved(vault_id, amount)
withdraw()
```

Expected public ABI after this slice:

```text
20 methods total
11 write
9 view
```

Both new methods are non-payable writes.

## `withdraw_unreserved`

Owner-only accounting operation.

It does **not** emit an external value transfer inline. Instead:

```text
vault.balance      -= amount
claimable[owner]   += amount
```

The amount must be positive and cannot exceed:

```text
vault.balance - vault.reserved_balance
```

Therefore unresolved spend-request reservations cannot be recovered by the
owner.

Recovery is intentionally permitted while the vault is paused, matching the
frozen v1 architecture.

Recovery does not increment:

- `lifetime_spent`
- `current_period_spent`

because it is treasury recovery, not an autonomous-agent spend.

## `withdraw`

Uses the exact production transfer pattern already proven by ProofSLA:

```python
caller = gl.message.sender_address
amount = self.claimable.get(caller, u256(0))

if amount == u256(0):
    raise gl.vm.UserError("nothing to withdraw")
if amount > self.balance:
    raise gl.vm.UserError("contract balance is insufficient")

self.claimable[caller] = u256(0)
_Recipient(caller).emit_transfer(value=amount)
```

This preserves effects-before-interaction.

## Direct Mode boundary

The pinned ProofSLA tests establish that setting `gl.message.value` in Direct
Mode exercises payable contract accounting but does not itself populate
`VMContext._balances`.

Therefore this slice can deterministically test:

- no-claim withdrawal rejection;
- insufficient actual chain-layer balance rejection;
- claim preservation after failed withdrawal;
- all owner-recovery accounting and reservation protections.

A successful external value transfer is **not claimed as Direct Mode PASS**.
That requires a full runtime/network execution where the contract actually
holds chain-layer balance.

## Candidate contract SHA-256

```text
eac48e0305f64572747ec6ab703235162c819f4f437339bc875c5aa2ed5ce11f
```

## Still NOT RUN

- successful external value transfer in a full runtime;
- supported-runtime integration/finality;
- Studio/localnet chain-layer transfer;
- Bradbury deployment/finality;
- live Bradbury withdrawal.
