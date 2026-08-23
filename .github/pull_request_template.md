## Summary

Describe the change and why it is needed.

## Scope

- [ ] Contract
- [ ] Frontend
- [ ] Documentation
- [ ] Tests / tooling
- [ ] Deployment configuration

## Contract safety

- [ ] `contracts/omnimandate.py` is unchanged
- [ ] If changed, I understand the existing Bradbury deployment claims no longer apply automatically
- [ ] Frozen hash checked when applicable

## Verification

List the exact commands/tests run.

```text
<commands and results>
```

- [ ] `git diff --check`
- [ ] Direct Mode / contract tests where applicable
- [ ] GenVM checks where applicable
- [ ] Frontend lint/build/typecheck where applicable
- [ ] `npm audit` where applicable
- [ ] `python3 scripts/verify_documentation.py` for docs changes

## Browser / UX

- [ ] Desktop checked
- [ ] Mobile/narrow layout checked
- [ ] Light/Dark/System checked where applicable
- [ ] No unnecessary Bradbury write was performed
- [ ] Screenshots updated if visible UI changed

## Security / finality

Explain any effect on authorization, evidence, monetary authority, accepted state, finality, or withdrawal.

## Documentation

List updated docs and any intentionally unchanged historical evidence.

## Remaining limitations

State anything that is not verified or intentionally out of scope.
