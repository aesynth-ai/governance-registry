#!/usr/bin/env bash
set -euo pipefail

if ! command -v yq >/dev/null 2>&1; then
  echo "yq is required (https://mikefarah.gitbook.io/yq/)"; exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"; exit 1
fi

FILE="$1"
yq -o=json "$FILE" | jq -S .
