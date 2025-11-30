# Governance Registry Tooling

This directory will host command-line utilities for maintaining the Aesynth Governance Registry. Planned tooling includes:

- Schema validation helpers
- Provenance envelope generators (canonicalization + hashing)
- Signature verification utilities
- Static site builders for registry snapshots
- The `registry-cli` maintainer toolchain described below

## `registry-cli` roadmap

Initial commands will orchestrate all write-path operations via Git-based workflows:

- `registry doc new <slug> --version <semver> --file <path>`: scaffold a new document version and provenance envelope.
- `registry doc propose <slug>@<semver>`: promote a document draft with updated metadata (status, required bodies).
- `registry res ratify --target <slug>@<semver> --minutes <path>`: generate a ratification resolution with `requiredBodies` and `minHumanReviewMinutes`.
- `registry ledger append --event <type> --subject <urn>`: append an immutable ledger entry with monotonic IDs.
- `registry sign <path> --key ./keys/<actor>.json`: apply detached JWS signatures and update envelopes.
- `registry verify --all`: run schema validation, hash diffing, signature verification, and cooling-period checks.

Support scripts will also surface static HTML renders for `/registry/docs/<slug>/<version>/` so the CDN mirror remains current.

## Available scripts (today)

- `npm run sign -- <subject.md> <provenance.json> <key.json>` — canonicalize Markdown, compute the hash, and append a detached signature.
- `npm run build:index` — regenerate `index/catalog.json` and `index/sitemap.json` from the current repository state.
- `npm run verify` — execute schema validation, hash verification, signature verification, state checks, and the deterministic index rebuild (mirrors the Verify Registry GitHub Action).
