# Withdrawal + Owner Treasury Recovery

Status: **integrated into the current v1 implementation**

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

Uses the production EOA transfer pattern exercised by the current OmniMandate implementation:

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

The current Direct Mode tests establish that setting `gl.message.value` exercises
payable contract accounting but does not itself populate `VMContext._balances`.

Therefore this slice can deterministically test:

- no-claim withdrawal rejection;
- insufficient actual chain-layer balance rejection;
- claim preservation after failed withdrawal;
- all owner-recovery accounting and reservation protections.

A successful external value transfer is **not claimed as Direct Mode PASS**.
That requires a full runtime/network execution where the contract actually
holds chain-layer balance.

## Current verified contract SHA-256

After request-input hardening and the complete Direct Mode regression:

```text
adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076
```

## Bradbury live verification

- successful external value transfer on Bradbury: verified;
- Bradbury deployment and finality verification: verified;
- live Bradbury withdrawal: verified by finalized 3000 wei ghost-balance decrease.
