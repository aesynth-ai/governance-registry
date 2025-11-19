# Project Governance

This document defines how the Aesynth Governance Registry is maintained, who is empowered to approve changes, and which controls keep the registry trustworthy.

## Stewardship

- **Registry Maintainers**: members of the Provisional Stewardship Body (`aesynth:gov:body/provisional-stewardship`) hold write authority to `main` after review.
- **Joint Semantic Assembly (JSA)**: once activated, JSA delegates review and co-sign normative changes (constitutions, charters, protocols).
- **Community Contributors**: anyone may propose edits via pull request against the `draft` branch.

## Branch Policy

- `main`: ratified, immutable state. Protected by 2 approving reviews, passing status checks, up-to-date merges, and no force pushes.
- `draft`: staging for collaboration. CI must pass before merge, but protections are lighter to encourage iteration.
- Release tags `registry-vX.Y.Z` point to signed snapshots that include a generated registry bundle.

All governance artifacts originate on `draft`, receive stakeholder approval, and promote to `main` once ledger and provenance entries are complete.

## Change Control Workflow

1. **Proposal**: open an issue or PR describing the change, linking all affected URNs.
2. **Authoring**: add or update documents, resolutions, bodies, actors, and ledger entries. Never rewrite historical JSON once merged.
3. **Validation**: run `npm run verify` (schema, hash, signature, state checks, and deterministic index rebuild) and confirm the cooling-period timer passes (`latency-gap` workflow enforces this in CI).
4. **Review**: obtain sign-off from
   - at least one maintainer for structural or non-normative updates, and
   - two maintainers or one maintainer plus one JSA delegate for normative artifacts.
5. **Ratification**: merge into `draft`, collect signatures, update `requiredBodies`, set `minHumanReviewMinutes`, and append ledger events.
6. **Promotion**: submit a PR from `draft` to `main` with final provenance evidence and wait for the cooling period enforced by CI.

## Status Lifecycles

- Documents: `draft -> proposed -> ratified -> (superseded | repealed)`
- Resolutions: `draft -> adopted -> logged`
- Bodies: `provisioned -> active -> dormant`

Transitions outside these paths are rejected by policy and automation.

## Dual-Ratification and Cooling Period

- Every normative change records `requiredBodies` so dual-ratification becomes enforceable as additional councils activate.
- Each resolution stores `minHumanReviewMinutes`, defining the minimum wall-clock delay before promotion to `main`.
- CI jobs fail if any required body signatures or cooling-period timers are unsatisfied (`.github/workflows/verify.yml` + `.github/workflows/latency-gap.yml`).

## Ledger Discipline

- Ledger files are strictly append-only. Corrections require a follow-up event describing the rectification.
- URNs increment monotonically (`evt-000001`, `evt-000002`, ...). Do not reuse IDs.
- Ratified changes must reference the sealing ledger event, and each ledger event must point back to the relevant documents or resolutions.

## Provenance and Signatures

- Normalize Markdown with `md-normalized-v1` before hashing.
- Sidecar provenance envelopes live next to each document version; they must include the canonical hash, canonicalization method, and detached signatures.
- JWS signatures must match keys published under `actors/` and may not be removed once published. Key revocations are handled in `SECURITY.md`.

## Incident Response

If an integrity incident is detected (compromised key, invalid signature, malicious PR):

1. Freeze merges to `main` via GitHub branch protection.
2. Publish an incident ledger event documenting the finding.
3. Rotate affected keys, update `actors/`, and re-sign impacted documents.
4. Issue an advisory in `SECURITY.md` and notify stakeholders through governance channels.

## Roadmap

- Automate Merkle-rooted registry bundles for releases.
- Expand CI checks for state-machine enforcement and cooling-period timers.
- Integrate Sigstore-based transparency logs when available.
