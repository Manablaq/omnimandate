# GenLayer Runtime Compatibility Check

Verified on **2026-08-22** against the pinned OmniMandate development toolchain.

## Frozen development baseline

Python:

```text
3.12.14
```

Direct dependencies:

```text
genlayer-py   @ a3dc35e04898e3889cbfa855bcaf7d2664675b8f
genlayer-test @ 9c09578b143905471fb0657dd53bdaf18da8e35f
genvm-linter  @ fa4a4d4536b28fdc2730e13a983ba01b69ccc6f3
pytest        == 8.4.2
```

Installed package versions:

```text
genlayer-py   0.18.0
genlayer-test 0.29.2
genvm-linter  0.10.0
pytest        8.4.2
```

`requirements-dev.txt` SHA-256:

```text
c57433bd2ecb9862bf56b972382a3c6b01b00903497384c76d7cfe74a4853b0b
```

Full sorted `pip freeze` SHA-256:

```text
335359f88dab8797196c3abcb3da494ab9389c4f76a2700de2aaa94c1e7599ae
```

The OmniMandate environment is pinned by `requirements-dev.txt` and
`requirements-lock.txt`; toolchain verification passed with no broken requirements.

## Static pinned-runtime probe

A two-contract compatibility probe was run outside the repository.

### Core probe

Confirmed static acceptance/schema generation for:

- `@gl.evm.contract_interface`
- `@allow_storage`
- `@dataclass`
- `TreeMap`
- `Address`
- `u256`
- `@gl.public.write.payable`
- `gl.message.value`
- `gl.message.sender_address`
- transaction-time use through `datetime.now(timezone.utc)`
- `gl.storage.copy_to_memory`
- `_Recipient(...).emit_transfer(value=...)`
- public view/write ABI generation

Result:

```text
CHECK_EXIT=0
TYPECHECK summary: 0 error(s), 0 warning(s)
TYPECHECK_EXIT=1
SCHEMA_EXIT=0
ABI_JSON_EXIT=0
```

Core ABI SHA-256:

```text
499ad78c488feb9466c28f0209a74fb3066a684f256590ada6ec848b5a28dbfc
```

Core probe source SHA-256:

```text
e7145ef32e75781542bbf22ad30fe1748cd81d02c636781433de2fc47f409e82
```

### Nondeterministic probe

Confirmed static acceptance/schema generation for:

- `gl.nondet.web.get`
- SHA-256 evidence checking
- `gl.nondet.exec_prompt(..., response_format="json")`
- `gl.vm.Return`
- `leaders_res.calldata`
- validator recomputation
- `gl.vm.run_nondet_unsafe`
- bounded comparative result matching

Result:

```text
CHECK_EXIT=0
TYPECHECK summary: 0 error(s), 0 warning(s)
TYPECHECK_EXIT=1
SCHEMA_EXIT=0
ABI_JSON_EXIT=0
```

Nondeterministic ABI SHA-256:

```text
74444f843d08f4db7ba30a699d67c0346741f43cb0c4eb91de43b33042eef6d3
```

Nondeterministic probe source SHA-256:

```text
5ddc34401a1fd937193667f6242190fb4a9079cd63032e873c821fb61d767653
```

Overall:

```text
STATIC_RUNTIME_PROBE=PASS
```

## Known pinned-linter behavior

`genvm-lint typecheck --strict` on this pinned toolchain can return process
exit status `1` while still printing:

```text
0 error(s), 0 warning(s)
```

Verification must therefore inspect the semantic summary and must not hide the
status with a generic `|| true`.

## Current design compatibility

The frozen v1 architecture is compatible with the verified static forms for:

- persistent storage records;
- mapping-like storage;
- address/value types;
- payable GEN entrypoints;
- caller identity;
- transaction-time arithmetic;
- storage-to-memory copies before nondeterministic work;
- evidence web fetching;
- structured LLM output;
- comparative validator recomputation;
- pull-payment withdrawal interface;
- schema/ABI generation.

## Current execution verification

Verified on 2026-08-22:

- complete Direct Mode regression suite: **84/84 PASS**;
- period rollover and reservation carry-over: **PASS in Direct Mode**;
- payable and internal balance-accounting behavior: **PASS in Direct Mode**;
- mocked evidence fetch and SHA-256 verification: **PASS in Direct Mode**;
- bounded leader/validator agreement and disagreement logic: **PASS in Direct Mode**;
- `genvm-lint check`: **PASS**;
- normal `genvm-lint typecheck`: **PASS**;
- ABI/schema generation: **PASS**, 20 methods.

Current contract SHA-256:

```text
adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076
```

These results do not claim live-network validator consensus or successful external value transfer.

## Bradbury verification remaining

1. deploy the verified contract to Bradbury;
2. exercise real validator adjudication against live, hash-bound evidence;
3. verify approval and denial through transaction finality;
4. verify real contract GEN balance behavior and successful EOA withdrawal;
5. record the deployed address, transaction evidence, and final states for review.
