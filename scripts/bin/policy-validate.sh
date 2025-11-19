#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SCHEMA="$ROOT_DIR/schemas/policy.schema.json"
POLICY_DIR="$ROOT_DIR/docs/policies/policies"

for p in "$POLICY_DIR"/*.yaml; do
  [ -e "$p" ] || continue
  echo "Schema validate $p"
  npx ajv validate \
    --spec=draft2020 \
    --strict=false \
    -c ajv-formats \
    -s "$SCHEMA" \
    -d "$p"
done
