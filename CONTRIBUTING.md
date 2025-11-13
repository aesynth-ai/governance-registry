# Contributing to the Aesynth Governance Registry

Thank you for helping steward Aesynth's public root of trust. This guide explains how to propose changes safely and how reviews are conducted.

## Getting Started

1. Fork the repository and create a feature branch from `draft`.
2. Install dependencies with `npm install` at the repository root.
3. Run `npm run verify` before opening a pull request.

## Making Changes

- **Documents**: add new versions under `docs/<slug>/<semver>/`. Include normalized Markdown and `provenance.json`. Populate `requiredBodies` in `index/catalog.json` for each normative change.
- **Resolutions**: create JSON records in `resolutions/` with `requiredBodies`, `minHumanReviewMinutes`, and references to meeting minutes.
- **Bodies and Actors**: update manifests under `bodies/` and `actors/`; append new seats or keys instead of rewriting history.
- **Ledger**: append new events with the next monotonic identifier (`ledger/000XYZ.json`). Never edit or delete earlier entries.
- **Index**: refresh `index/catalog.json` and `index/sitemap.json` so downstream mirrors stay consistent.
- **CLI support**: prefer `registry doc new`, `registry res ratify`, and `registry ledger append` (once available) to keep metadata in sync. Use `npm run sign -- <doc.md> <provenance.json> <key.json>` to refresh envelopes after drafting content.

## Validation Checklist

Before opening a pull request confirm:

- `npm run verify` succeeds (schemas, hashes, signatures, state machine, index rebuild).
- SHA-256 hashes in provenance envelopes match freshly computed hashes.
- JWS signatures verify against active keys in `actors/`.
- Status transitions obey lifecycle rules (documents, resolutions, bodies).
- Cooling period requirements (`minHumanReviewMinutes`) are satisfied for any ratifications.
- `index/catalog.json` reflects new ledger events, resolutions, and signatures.

## Pull Request Expectations

- Include a summary of the governance intent and enumerate affected URNs.
- Attach evidence links (ledger events, provenance envelopes, meeting minutes).
- Request reviews from:
  - A Provisional Stewardship maintainer for structural or tooling updates.
  - A Joint Semantic Assembly delegate for normative documents or resolutions.
- Draft PRs are welcome for early feedback; mark them ready once validation is green.

## Ratification and Promotion

1. Merge feature branches into `draft` after consensus and validation.
2. Collect final signatures, update envelopes, and append ledger events.
3. Open a promotion PR from `draft` to `main` containing only ratified artifacts.
4. Maintainers confirm no history rewrites occurred, verify the cooling period timer, and merge after all checks pass.

## Code of Conduct

Contributors must follow the [Aesynth Community Guidelines](https://aesynth.ai/community-guidelines). Harassment, discrimination, or abuse is not tolerated.

## Questions

- Governance process: governance@aesynth.ai
- Tooling help: devrel@aesynth.ai
- Security disclosures: security@aesynth.ai

We appreciate your diligence in keeping the registry accurate, reproducible, and trustworthy.
