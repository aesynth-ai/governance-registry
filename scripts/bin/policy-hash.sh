#!/usr/bin/env bash
set -euo pipefail

if ! command -v shasum >/dev/null 2>&1 && ! command -v sha256sum >/dev/null 2>&1; then
  echo "shasum or sha256sum required"; exit 1
fi

CANON_JSON="$(scripts/bin/policy-canonicalize.sh "$1")"
HASH="$(printf "%s" "$CANON_JSON" | (shasum -a 256 2>/dev/null || sha256sum) | awk '{print $1}')"
echo "$HASH"
