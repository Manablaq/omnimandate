# Bradbury Live Verification — 2026-08-22

## Verified deployment

- Network: GenLayer Bradbury Testnet
- Contract: `0x04c1E361ec0Da96a263794F1f582989c2419267C`
- Owner / authorized agent / test recipient: `0x1f87Ae197af539253978d435aD45cCf28Fb95024`
- Contract source SHA-256: `adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076`
- Contract checkpoint commit: `a0d39725321a607b6e3f00681affafa1199cd23f`
- Evidence commit: `92fc0527b2984d768af196771960939b5949c5fd`
- Runner pin: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

The deployed vault reported an initial native balance of `1000000000000000000` wei, or 1 GEN.

## Immutable demo evidence

These fixtures are Bradbury demo evidence. They demonstrate immutable URL binding, SHA-256 verification, validator adjudication, settlement, and finality. They are not presented as organizationally independent real-world authorities.

| Fixture | SHA-256 |
| --- | --- |
| `approved-primary.txt` | `82203716411f5261eeccaac0be07af1d90d95dd92afebc55fd377eba2872018f` |
| `approved-corroboration.txt` | `36805e0b09bb8aed2e0289d9c98da94a3b4b750c37f29dcd19c9c07285b449e0` |
| `denied-primary.txt` | `48a409e0ec9968b2f0dca2a72924245f30d222a9f36dd2ba4b2b70ee5ece4958` |
| `denied-corroboration.txt` | `0131f1d44235e25a085ca260bff49d0567648d1b34dfcc19da25dd0b440052c4` |

All four files were fetched through commit-pinned raw GitHub URLs and reproduced the committed SHA-256 values before the Bradbury requests were submitted.

## Finalized transaction trail

| Step | Transaction | Verified result |
| --- | --- | --- |
| Contract deployment | `0xc6d2846e20aafe38d0b7fc7b093e0b1fe89868e7fc4cc8ef83a7c48aaf931a5c` | OmniMandate deployed on Bradbury |
| Create funded vault | `0x706d8f2546b3e6cd7280291441a47542f7eee9396160297ddb8dfc44e9365e68` | Vault 1 and mandate v1 created |
| Create approval request | `0x58a14e3c67ee9b707e065feef39eb6654f85ffac81e8191d4fecff12ed70ee10` | Request 1 submitted with exact 3000 wei reservation |
| Approval adjudication | `0x17ce3ebcd2a1ebbd8f36b8b9901409e9225bf67c097a8fcd38dd5892e949409f` | `COMPLIANT` + `CORROBORATED` -> `APPROVED` |
| Create denial request | `0x8a1e25d7117c378a47a8f927aef2bc279976e60b1dacda97584fdf800ad7041f` | Request 2 submitted with exact 3000 wei reservation |
| Denial adjudication | `0x9ee580c4183ff125f3e550b24a2967bb6c205674d80ac4012b69b4be934fcbd9` | `NON_COMPLIANT` + `CORROBORATED` -> `DENIED` |
| Withdraw approved claim | `0x443bad9086b580acb855ea7599a7a44b7b3a1b2c50506f9805c617cf55f4d4f2` | Finalized external 3000 wei transfer |

## Approval path

Request 1 used:

- amount: `3000` wei
- category: `API_SERVICES`
- purpose: `Pay production API service invoice`
- mandate version: `1`

Final state:

- request state: `APPROVED`
- policy status: `COMPLIANT`
- evidence status: `CORROBORATED`
- lifetime spent: `3000`
- reserved balance: `0`
- claimable balance after approval: `3000`
- vault accounting balance: `999999999999997000`

## Denial path

Request 2 used:

- amount: `3000` wei
- category: `ENTERTAINMENT`
- purpose: `Purchase personal gaming entertainment`

Final state:

- request state: `DENIED`
- policy status: `NON_COMPLIANT`
- evidence status: `CORROBORATED`
- reservation released to `0`
- lifetime spent remained `3000`
- claimable remained `3000`
- vault accounting balance remained `999999999999997000`

## Finalized external withdrawal

Before withdrawal:

- claimable: `3000` wei
- ghost / chain-layer contract balance: `1000000000000000000` wei

After transaction `0x443bad9086b580acb855ea7599a7a44b7b3a1b2c50506f9805c617cf55f4d4f2` reached GenLayer status `Finalized` with status code `7`:

- claimable: `0`
- ghost / chain-layer contract balance: `999999999999997000` wei

The ghost balance therefore decreased by exactly `3000` wei, matching the approved claim. The recipient wallet balance is not used as the exact transfer invariant because other Bradbury transaction costs changed that wallet balance during the verification run.

## Final contract state

- vault status: `ACTIVE`
- vault balance: `999999999999997000`
- reserved balance: `0`
- current-period reserved: `0`
- lifetime spent: `3000`
- claimable for the test recipient: `0`

## Local verification baseline

The same frozen contract version passed the complete 84-test Direct Mode regression suite, GenVM lint and validation, normal type checking, and fresh ABI generation with 20 public methods before Bradbury deployment.

Frontend deployment is outside this live contract-verification record and remains a separate delivery step.
