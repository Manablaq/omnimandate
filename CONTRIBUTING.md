# Contributing to OmniMandate

Thank you for improving OmniMandate.

The repository contains a frozen Bradbury-deployed Intelligent Contract and a public frontend. Treat contract changes, frontend changes, and documentation changes as separate risk classes.

## Before changing anything

```bash
git status -sb
git branch --show-current
```

Start from a clean branch and understand whether your change affects the frozen contract.

## Contract changes

Any change to `contracts/omnimandate.py` invalidates the assumption that the file still matches the currently documented Bradbury deployment.

Before proposing a contract change:

1. explain the security/behavioral reason;
2. update the specification if behavior changes;
3. run the complete Direct Mode suite;
4. run GenVM checks;
5. update the test matrix;
6. perform a new deployment/live-verification cycle before claiming equivalence to the existing Bradbury deployment.

Current frozen SHA-256:

```text
adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076
```

## Frontend changes

From `frontend/`:

```bash
npm ci
npm run lint
npm run build
npx tsc --noEmit
npm audit
```

For user-visible changes:

- test Light / Dark / System;
- test desktop and narrow/mobile layouts;
- test every affected workspace destination;
- do not trigger unnecessary Bradbury writes;
- replace documentation screenshots when the visible UI materially changes.

## Documentation changes

Run:

```bash
python3 scripts/verify_documentation.py
git diff --check
```

Documentation must distinguish:

- verified fact;
- evidence-backed inference;
- unresolved limitation.

Do not rewrite historical verification documents merely to make the project look newer. Preserve the evidence boundary and add a new record when appropriate.

## Pull requests

A good pull request should state:

- what changed;
- why it changed;
- security impact;
- whether the contract hash changed;
- tests executed;
- deployment impact;
- documentation/screenshots updated;
- remaining limitations.

Use `.github/pull_request_template.md`.

## Secrets

Never commit:

- private keys;
- seed phrases;
- API secrets;
- private RPC credentials;
- private evidence URLs;
- `.env` contents containing credentials.

## Style

Prefer small, reviewable changes. Avoid combining unrelated contract, frontend, and documentation refactors in the same commit.

## License

This contribution guide does not add a repository license. Check repository licensing status before contributing code intended for reuse or redistribution.
