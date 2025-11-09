#!/usr/bin/env bash
set -euo pipefail

if ! command -v ajv >/dev/null 2>&1; then
  echo "ajv-cli is required: npm i -g ajv-cli"; exit 1
fi

SCHEMA="schemas/policy.schema.json"
FILE="$1"
ajv validate -s "$SCHEMA" -d "$FILE" --strict=true
