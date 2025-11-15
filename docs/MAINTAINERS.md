# Aesynth Governance Registry — Maintainer Guide

This guide is for **stewards and core maintainers** of the governance registry.
It assumes familiarity with the BBC rules, Rego policy, and CI workflows.

Your job is to keep three properties intact:

1. **Lawfulness** — Rules encode real constraints, not ad-hoc preferences.
2. **Determinism** — Same input plans ? same outputs across engines (CLI/Wasm/JS).
3. **Traceability** — Every change is explainable via issues, changelog, and hashes.

---

## 1. Review roles & CODEOWNERS

Key guarded areas:

- `codes/**` — BBC rules, jurisdictions, changelog, docs.
- `policy/**` — Rego policy, waivers, severity map.
- `schemas/**` — Plan schema, contract.
- `.github/**` — CI workflows and reflection wiring.

All of these paths are CODEOWNER-gated to stewards and CI maintainers.

**Principle:** contributors can propose, but only stewards can land changes that
alter **what the law says** or **how it is enforced**.

---

## 2. CI pipeline mental model

When a PR runs CI, the high-level flow is:

1. Checkout + pnpm install.
2. Install **OPA** (pinned by SHA).
3. Build + test packages (if present).
4. Generate plan artifacts.
5. AJV schema validation:
   - `schemas/plan.schema.json`
   - `codes/<JUR>/bbc.rules.schema.json`
   - `policy/waivers.schema.json`
6. **Contract smoke**:
   - `scripts/contract-smoke.mjs` verifies Synthlex?BBC field contract.
7. **Waiver sentinel**:
   - `scripts/waiver-sentinel.mjs` reports impending expiry.
8. `opa test policy/ -v`:
   - Rego regression tests.
9. **BBC verifier**:
   - `scripts/bbc-verify.mjs` (CLI ? Wasm ? JS) + waivers + history.
10. SARIF generation:
   - `scripts/bbc-to-sarif.mjs` with severity-map + helpUri + suppression.
11. Constitution hashing + **provenance**:
   - `scripts/hash-constitutions.mjs`
   - `scripts/write-provenance.mjs`
12. Signature verification:
   - GPG verification if `PROV_PUBLIC_KEY` is configured.
13. Artifacts upload + **reflection** job.

When you review a PR, always scan:

- BBC summary
- Waiver report
- Provenance status
- Reflection status

These four tell you if the system is still coherent.

---

## 3. Rule-change review checklist

When a PR changes any `codes/<JUR>/bbc.rules.yaml`:

### 3.1. Governance preconditions

- [ ] A **Rule change proposal** issue exists and is linked.
- [ ] Proposed jurisdiction(s) are explicit (e.g. `BBC.v0.1.0.TW`, `BBC.v0.1.0.US`).
- [ ] The rationale is grounded in:
  - Code requirements, or
  - Safety / accessibility needs, or
  - Known misalignment between intent and implementation.

### 3.2. Changelog & versioning

- [ ] `codes/CHANGELOG.md` contains an entry summarizing the change.
- [ ] `meta.version` in the relevant `bbc.rules.yaml` increased (semver-style).
- [ ] Version bump magnitude matches scope:
  - **Patch**: tightening language or fixing an obvious bug.
  - **Minor**: adding a new rule or materially changing thresholds within known scope.
  - **Major**: structural changes or backwards-incompatible semantics.

CI will already fail if the changelog/version aren’t present; your job is to
check **quality**, not just presence.

### 3.3. Behavioral impact

- [ ] CI is green except for the expected rule-change effects.
- [ ] BBC summary:
  - `failing` count is understood.
  - New violations are intentional and documented.
- [ ] SARIF shows:
  - Correct severity (from `policy/severity-map.json`).
  - `helpUri` resolves to the updated docs.

If the change is expected to **break** existing plans, make sure:

- That impact is explicitly described in the PR.
- There is a migration strategy or timeline discussed.

---

## 4. Waivers & sentinel

Waivers are **explicit exceptions**, not a way to silently bypass rules.

### 4.1. Waiver review

When a PR modifies `policy/waivers.yaml`:

- [ ] Each waiver includes `id`, `plan_id` or `*`, `violation_code`, `justification`, `expires_utc`.
- [ ] Justification is specific and non-trivial (e.g. temporary construction phase, legacy structure, etc.).
- [ ] Duration is reasonable; long-lived waivers are red flags.

CI’s **waiver sentinel** will output:

- A JSON file: `reports/waiver-expiring.json`.
- A count in the summary: `Expiring =N days: X`.

Use this to push back on accumulating long-tail waivers.

### 4.2. Sentinel enforcement

The sentinel can be configured in CI to:

- **Soft fail** (current default): just report.
- **Hard fail**: block merges when waivers are about to expire.

As a maintainer, you can propose tightening this setting when the waiver list grows.

---

## 5. Multi-jurisdiction handling

The code layout is:

- `codes/BBC.v0.1.0.TW/…`
- `codes/BBC.v0.1.0.US/…` (stub initially cloned from TW)

The env var `BBC_JUR` selects the active jurisdiction for BBC runs.

As you start diverging US rules from TW:

- Keep `bbc.rules.schema.json` aligned unless the structure truly diverges.
- Keep `docs/` in sync conceptually, but allow jurisdiction-specific text.
- Ensure `policy/severity-map.json` and SARIF `helpUri` mappings point to the correct docs per jurisdiction.

In future, CI can run a matrix over `BBC_JUR`. When that happens, you will:

- See multiple BBC summaries.
- Need to consider cross-jurisdiction impacts explicitly.

---

## 6. Policy & engine changes

When reviewing PRs that touch:

- `policy/bbc.rego` or `policy/bbc_test.rego`
- `scripts/bbc-verify.mjs`
- `scripts/bbc-to-sarif.mjs`
- `.github/workflows/verify.yml`

check:

1. **Tests**
   - `opa test policy/ -v` passes.
   - `pnpm run verify-fast` and `pnpm run verify-ci` behave as expected.

2. **Engine parity**
   - BBC results are consistent across **CLI**, **Wasm**, and **JS** paths:
     - If CLI is available, it should be the reference.
     - Wasm and JS must not “weaken” validation compared to CLI.

3. **Security**
   - OPA download URL is still pinned by SHA.
   - No new unpinned binaries or external calls were introduced.
   - SARIF output doesn’t leak sensitive paths or data beyond what is needed.

4. **Governance behavior**
   - Rule-changelog gate is intact.
   - Reflection and provenance steps still run and upload artifacts.

---

## 7. Provenance & keys

CI can enforce provenance signature verification when:

- `PROV_PUBLIC_KEY` is configured as a CI secret.
- `PROV_ENFORCE_SIGNATURE` is set to `true`.

As a maintainer, you should:

- Ensure any key rotation:
  - Is documented in a PR.
  - Updates the corresponding documentation (e.g. key fingerprint).
- Verify that `reports/provenance.json` includes:
  - `jurisdiction`
  - `rules_version`
  - Hashes of rules, Rego, Wasm, and plans.

If signature verification fails in CI, treat it as a **high-priority incident**.

---

## 8. Incident handling

Examples of incidents:

- A discovered misalignment between BBC rules and real-world code.
- A false negative (plan passes but should fail).
- A false positive that blocks valid plans.
- A compromised or misconfigured key.

For each incident:

1. Open or label an issue clearly (`bbc:fail`, `rules:change`, etc.).
2. Reproduce locally with `pnpm run verify-ci`.
3. Decide whether a **rule change**, **waiver**, or **tooling fix** is appropriate.
4. Ensure the fix:
   - Has tests (Rego or fixtures).
   - Is reflected in `codes/CHANGELOG.md`.
   - Is clearly explained in the PR.

---

## 9. Reflection as a governance tool

The reflection job exists to enforce a **time gap** between verification and merge.

As a maintainer, you should:

- Resist “racing” merges as soon as CI is green.
- Use the reflection window to:
  - Reread the PR.
  - Recheck impact in context of other open changes.
  - Confirm that waivers and rule edits still make sense.

The goal is not to slow work down arbitrarily, but to prevent **impulsive modification** of safety-critical logic.

---

## 10. Stewardship mindset

When in doubt, default to:

- **Explainability over cleverness.**
- **Smaller, traceable changes over big, tangled refactors.**
- **Explicit issues and changelog entries over silent edits.**

You’re not just maintaining a repo; you’re maintaining a **lawful memory of how
Aesynth reasons about the built environment**.

Treat it like an evolving building code: slow, clear, and relentlessly
auditable.
