#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_PYTHON="Python 3.12.14"
EXPECTED_REQ_HASH="c57433bd2ecb9862bf56b972382a3c6b01b00903497384c76d7cfe74a4853b0b"
EXPECTED_LOCK_HASH="335359f88dab8797196c3abcb3da494ab9389c4f76a2700de2aaa94c1e7599ae"

if [ ! -x ".venv/bin/python" ]; then
  echo "FAIL: .venv is missing" >&2
  exit 1
fi

actual_python="$(".venv/bin/python" --version 2>&1)"
[ "$actual_python" = "$EXPECTED_PYTHON" ] || {
  echo "FAIL: expected $EXPECTED_PYTHON, got $actual_python" >&2
  exit 1
}

req_hash="$(shasum -a 256 requirements-dev.txt | awk '{print $1}')"
[ "$req_hash" = "$EXPECTED_REQ_HASH" ] || {
  echo "FAIL: requirements-dev.txt hash mismatch" >&2
  exit 1
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
".venv/bin/python" -m pip freeze | sort > "$tmp"

freeze_hash="$(shasum -a 256 "$tmp" | awk '{print $1}')"
[ "$freeze_hash" = "$EXPECTED_LOCK_HASH" ] || {
  echo "FAIL: installed environment hash mismatch" >&2
  exit 1
}

diff -u requirements-lock.txt "$tmp"

".venv/bin/python" -m pip check

echo "TOOLCHAIN_BASELINE=PASS"
