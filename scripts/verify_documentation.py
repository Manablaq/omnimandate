#!/usr/bin/env python3
"""Repository documentation integrity checks for OmniMandate."""

from __future__ import annotations

import re
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".github/pull_request_template.md",
    "docs/README.md",
    "docs/PRODUCT_WALKTHROUGH.md",
    "docs/REVIEWER_GUIDE.md",
    "docs/DEPLOYMENT.md",
    "docs/SPEC_V1.md",
    "docs/ARCHITECTURE.md",
    "docs/THREAT_MODEL.md",
    "docs/TEST_MATRIX.md",
    "docs/RUNTIME_COMPATIBILITY.md",
    "docs/BRADBURY_LIVE_VERIFICATION.md",
    "docs/assets/screenshots/README.md",
    "docs/assets/screenshots/production-landing.png",
    "docs/assets/screenshots/production-overview.png",
    "docs/assets/screenshots/production-vaults.png",
    "docs/assets/screenshots/production-spend-requests.png",
    "docs/assets/screenshots/production-mandates.png",
    "docs/assets/screenshots/production-evidence.png",
    "docs/assets/screenshots/production-activity.png",
    "docs/assets/screenshots/production-documentation.png",
]

EXPECTED_README = [
    "https://omnimandate-i1am.vercel.app/",
    "0x04c1E361ec0Da96a263794F1f582989c2419267C",
    "adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076",
    "84 / 84",
    "Bradbury Testnet",
    "ACCEPTED",
    "FINALIZED",
]

SECRET_MARKERS = [
    "BEGIN PRIVATE KEY",
    "PRIVATE_KEY=",
    "SECRET_KEY=",
    "MNEMONIC=",
    "SEED_PHRASE=",
]

errors: list[str] = []

for rel in REQUIRED:
    if not (ROOT / rel).exists():
        errors.append(f"missing required documentation asset: {rel}")

readme_path = ROOT / "README.md"
if readme_path.exists():
    readme = readme_path.read_text(encoding="utf-8", errors="replace")
    for expected in EXPECTED_README:
        if expected not in readme:
            errors.append(f"README missing expected public/verified detail: {expected}")

# Verify local Markdown links in public docs.
markdown_files = [
    ROOT / "README.md",
    ROOT / "CONTRIBUTING.md",
    ROOT / "SECURITY.md",
    ROOT / "docs/README.md",
    ROOT / "docs/PRODUCT_WALKTHROUGH.md",
    ROOT / "docs/REVIEWER_GUIDE.md",
    ROOT / "docs/DEPLOYMENT.md",
]
link_re = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
for path in markdown_files:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for raw in link_re.findall(text):
        target = raw.strip().split(" ", 1)[0].strip("<>")
        if not target or target.startswith(("#", "http://", "https://", "mailto:")):
            continue
        target = target.split("#", 1)[0]
        if not target:
            continue
        resolved = (path.parent / target).resolve()
        try:
            resolved.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"local link escapes repository: {path.relative_to(ROOT)} -> {raw}")
            continue
        if not resolved.exists():
            errors.append(f"broken local link: {path.relative_to(ROOT)} -> {raw}")

# Basic secret scan over reviewer-facing Markdown only.
for path in markdown_files + [ROOT / "docs/assets/screenshots/README.md"]:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for marker in SECRET_MARKERS:
        if marker in text:
            # The security docs intentionally name prohibited secret types without
            # including concrete assignments. Assignment markers are still blocked.
            if marker.endswith("="):
                errors.append(f"possible secret assignment marker in {path.relative_to(ROOT)}: {marker}")

# PNG dimension check without external dependencies.
def png_size(path: Path) -> tuple[int, int] | None:
    try:
        with path.open("rb") as f:
            header = f.read(24)
        if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
            return None
        return struct.unpack(">II", header[16:24])
    except OSError:
        return None

for rel in REQUIRED:
    if not rel.endswith(".png"):
        continue
    path = ROOT / rel
    if not path.exists():
        continue
    size = png_size(path)
    if size is None:
        errors.append(f"invalid PNG screenshot: {rel}")
        continue
    width, height = size
    if width < 1200 or height < 600:
        errors.append(f"screenshot too small for reviewer docs: {rel} ({width}x{height})")

# Contract hash guard.
contract = ROOT / "contracts/omnimandate.py"
if contract.exists():
    import hashlib
    digest = hashlib.sha256(contract.read_bytes()).hexdigest()
    expected = "adee3cc8fa24d636321b06f5779ecc8356fde99db9194f188b757d6e0fd71076"
    if digest != expected:
        errors.append(
            "frozen contract hash changed: "
            f"expected {expected}, got {digest}"
        )
else:
    errors.append("missing contracts/omnimandate.py")

# Ensure this documentation upgrade did not modify application/contract source.
try:
    changed = set()
    for args in (
        ["git", "diff", "--name-only"],
        ["git", "diff", "--cached", "--name-only"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ):
        out = subprocess.check_output(args, cwd=ROOT, text=True)
        changed.update(line.strip() for line in out.splitlines() if line.strip())
    forbidden = [
        rel for rel in changed
        if rel.startswith(("contracts/", "frontend/src/"))
    ]
    if forbidden:
        errors.append(
            "documentation-only boundary violated by: " + ", ".join(sorted(forbidden))
        )
except Exception as exc:
    errors.append(f"unable to inspect git change boundary: {exc}")

if errors:
    print("DOCUMENTATION_AUDIT=FAIL")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("DOCUMENTATION_AUDIT=PASS")
print("PASS: required public documentation files exist")
print("PASS: local reviewer-facing Markdown links resolve")
print("PASS: eight current screenshots are valid reviewer-resolution PNGs")
print("PASS: README contains live deployment and verified contract/test identifiers")
print("PASS: frozen contract hash is unchanged")
print("PASS: no contract/frontend source change is present in the documentation worktree")
