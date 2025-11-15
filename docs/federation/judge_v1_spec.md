# Judge v1.0 — Unified Judicial Contract

Phase V introduces the Aesynth Federation layer: every governed jurisdiction must
publish a contract that satisfies `FEDS.v1.0.0.schema.json`. Judge v1.0 relies on
that contract to decide whether a domain is eligible for enforcement.

## Contract pillars

1. **Meta**
   - `jurisdiction_code` must be globally unique.
   - `domain` declares the top-level family (BBC, CIV, EDU, etc.).
   - `status` drives the gate (EXPERIMENTAL jurisdictions may be allowed only on
     non-critical repos; FATAL ones are blocked).
   - `stewards` enumerates responsible reviewers (TEMP_* allowed while seeding).
   - `provenance_mode` selects how determinism + attestation is enforced.

2. **Rules**
   - Each rule entry carries `rule_id`, `severity`, description, and the policy
     body/hash. Judge verifies that the referenced Rego bundle exists before it
     will evaluate plans.

3. **Schemas**
   - `plan_schema` and `waiver_schema` must point to resolvable files in-repo or
     immutable URIs. Judge validates them via AJV before any engine runs.

4. **Documentation**
   - `help_ref` links to human-readable guidance (e.g., docs/civ/policy_guide.md).
   - `waiver_guide` documents lawful escape hatches.

## Review workflow (stewards)

1. Author drafts the federation JSON for their jurisdiction and stores it under
   `governance/schemas/federation/`.
2. AJV validation must pass locally (`npx ajv validate ... FEDS.v1.0.0.schema.json`).
3. Stewards verify:
   - Changelog entry exists for the domain.
   - Rules match the referenced Rego hash.
   - Schemas + docs resolve.
4. Once merged, Judge v1.0 ingests the contract and exposes the jurisdiction in
   the cross-domain registry used by BBC, CivSynth, Synthlex, etc.

Future releases (Judge v1.1+) will add consistency checks across domains (e.g.,
shared severity registry, cross-jurisdiction waivers) but v1.0 focuses on the
minimum viable discipline required for Federation launch.
