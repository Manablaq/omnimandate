# Deployment

This document defines the public frontend and Intelligent Contract deployment boundary for OmniMandate.

## Public frontend

- Production URL: https://omnimandate-i1am.vercel.app/
- Hosting: Vercel
- Production branch: `main`
- Framework: Next.js
- Current unified-workspace deployment prepared before this documentation refresh: commit `8eba49e`

The frontend deployment is independent from Intelligent Contract deployment. Pushing a frontend commit to Vercel does **not** redeploy or mutate the Bradbury contract.

## Intelligent Contract

- Network: GenLayer Bradbury Testnet
- Address: `0x04c1E361ec0Da96a263794F1f582989c2419267C`
- Frozen source: `contracts/omnimandate.py`
- SHA-256: `adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076`

The frozen hash is the repository boundary for claims about the currently verified Bradbury deployment.

## Frontend behavior

The public app:

- uses an explicit connected-wallet session;
- performs read-only Bradbury discovery for visible account/contract state;
- uses the injected wallet for user-authorized write transactions;
- does not embed a private key;
- separates accepted-state UX from finality tracking;
- exposes one workspace view at a time;
- links directly to repository specifications and verification evidence.

## Production quality gates

Before the current production release, the frontend was checked with:

```bash
npm run lint
npm run build
npx tsc --noEmit
npm audit
```

The documentation package should additionally pass:

```bash
python3 scripts/verify_documentation.py
git diff --check
```

## Safe deployment procedure

1. start from a clean `main`;
2. run contract hash verification;
3. run contract regression checks if contract-related material changed;
4. run frontend lint/build/typecheck/audit;
5. review the staged diff;
6. push to `main`;
7. confirm the new Vercel production deployment is `READY`;
8. verify `/` and `/app` return successfully;
9. perform read-only browser QA;
10. only then update reviewer/submission material.

## Rollback boundary

A frontend rollback should not modify the contract. If a frontend deployment is defective, roll back the Vercel release or revert the frontend commit while preserving the frozen contract source and Bradbury address.

A contract change is different: it requires a new contract verification cycle and must not inherit claims from the previous frozen deployment automatically.

## Environment and secret guidance

Do not commit:

- private keys;
- seed phrases;
- wallet recovery material;
- RPC credentials intended to remain private;
- API keys;
- private evidence URLs;
- Vercel secrets.

Public contract addresses, transaction hashes, testnet evidence URLs, and SHA-256 digests are expected reviewer data.

## Screenshot maintenance

Current screenshots live in `docs/assets/screenshots/`.

Replace them whenever the visible application changes materially. Do not retain screenshots that present a UI state no longer reachable in production.
