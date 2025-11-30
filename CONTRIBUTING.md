# Contributing to Aesynth Governance Registry

Welcome! This repository is the **governance spine** for Aesynth: it holds
building-code rules, constitutional specs, and the CI pipelines that verify
plans against those rules.

Because this code touches **safety**, **lawfulness**, and **auditability**, we
ask contributors to follow a few clear conventions.

---

## 1. What lives in this repo?

This repo is the canonical home for:

- **Base Building Code (BBC) rules**
  - e.g. `codes/BBC.v0.1.0.TW/bbc.rules.yaml`
- **Jurisdictions**
  - e.g. `BBC.v0.1.0.TW`, `BBC.v0.1.0.US`
- **Schemas & contracts**
  - e.g. `schemas/plan.schema.json`,
    `docs/contracts/synthlex-plan-contract.md`
- **Policy & tests**
  - e.g. `policy/bbc.rego`, `policy/bbc_test.rego`
- **Verification tooling**
  - e.g. `scripts/bbc-verify.mjs`, `scripts/bbc-to-sarif.mjs`,
    GitHub workflow `.github/workflows/verify.yml`
- **Provenance & constitutions**
  - e.g. `docs/constitutions/...`, `scripts/write-provenance.mjs`

> If your change affects **rules**, **schemas**, **policy**, or **CI logic**,
> it must pass the governance checks described below.

---

## 2. Getting started

### 2.1. Requirements

- Node.js 20+
- pnpm
- OPA CLI (for local policy tests)
- Git + GPG if you care about signed commits locally

### 2.2. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 2.3. Fast smoke vs. full CI

**Fast BBC smoke (JS engine only):**

```bash
pnpm run verify-fast
# internally: BBC_ENGINE=js pnpm run bbc:check
```

**Full CI-equivalent pipeline:**

```bash
pnpm run verify-ci
```

This performs the same checks as GitHub Actions:

1. Generate plan artifacts
2. Validate JSON/YAML with AJV
3. Enforce **Synthlex ? BBC contract** (`contract-smoke`)
4. Run **waiver sentinel** (expiring waivers)
5. Run **OPA tests** on Rego policy
6. Run **BBC verifier** (CLI ? Wasm ? JS)
7. Emit **SARIF** for GitHub Security
8. Hash constitutions and write **provenance**

If `pnpm run verify-ci` is green locally, you’re in good shape for a PR.

---

## 3. Types of contributions

### 3.1. Documentation / comments / non-governance code

Examples:

* Improving Markdown docs under `codes/**/docs`
* Fixing typos in comments
* Adjusting README-style content
* Tweaking non-governance scripts that don’t change behavior

**Expectations:**

* Open a PR with a clear title and short description.
* Ensure `pnpm run verify-ci` passes locally.
* CI will run **Verify & Reflect** and must be green before merge.

These are the easiest contributions and the best place to start.

---

### 3.2. Plan examples & schemas

Examples:

* Adding new plan fixtures
* Refining `schemas/plan.schema.json`
* Updating the Synthlex contract doc

**What to do:**

1. Update the schema or example.
2. Run:

   ```bash
   pnpm run verify-ci
   ```
3. Make sure:

   * AJV validation passes.
   * `contract-smoke` does **not** complain about missing fields.
   * BBC still passes (no unexpected violations).

Mention in your PR description which plans/schemas were touched and why.

---

### 3.3. Rule changes (BBC)

**Rule changes are the most sensitive contributions.** They directly affect
compliance outcomes.

You must:

1. Open a **“Rule change proposal”** issue using the template:

   * Choose **jurisdiction** (e.g. `BBC.v0.1.0.TW` or `BBC.v0.1.0.US`).
   * Describe the **rationale**, **before/after**, and **proposed version bump**.
2. Update the relevant rule file under `codes/<JUR>/bbc.rules.yaml`.
3. Update **`codes/CHANGELOG.md`** to record the change.
4. Bump **`meta.version`** in the corresponding `bbc.rules.yaml`.

If you change `bbc.rules.yaml` without:

* updating `codes/CHANGELOG.md`, and
* bumping `meta.version`,

then CI will **fail** at the **Rule changelog + version gate**.

After your edits:

```bash
pnpm run verify-ci
```

Confirm:

* `BBC: ... failures=0` in the summary.
* The rule change appears in `codes/CHANGELOG.md`.

Include a link to the rule-change issue in your PR description.

---

### 3.4. Waivers

Waivers provide **explicit, time-boxed exceptions** to BBC rules.

* Waivers live in `policy/waivers.yaml` and follow
  `policy/waivers.schema.json`.
* Each waiver has:

  * `id`
  * `plan_id` or `*`
  * `violation_code`
  * `justification`
  * `requested_by`, `approved_by`
  * `expires_utc`

The **waiver sentinel**:

* Reports waivers expiring within a configured window (default 14 days).
* Can be configured to soft- or hard-fail CI.

If you propose a waiver, treat it like a rule change:

1. Open/attach to an issue explaining **why** the waiver is justified.
2. Add an entry to `policy/waivers.yaml`.
3. Run `pnpm run verify-ci`.
4. Clearly document the waiver in the PR description.

---

### 3.5. Policy / Rego / engines / CI workflows

Changes to:

* `policy/bbc.rego`, `policy/bbc_test.rego`
* `scripts/bbc-verify.mjs`, `scripts/bbc-to-sarif.mjs`
* `.github/workflows/verify.yml`

are treated as **governance-level changes**.

**You should:**

1. Run both:

   ```bash
   pnpm run verify-fast
   pnpm run verify-ci
   ```
2. Confirm:

   * `opa test policy/ -v` passes.
   * BBC results are unchanged for existing fixtures, unless your change is
     explicitly intended to adjust behavior (and is documented).
3. In your PR, explain:

   * What changed.
   * Why it is safer / clearer / more auditable.
   * How you tested it.

These changes will be reviewed by **stewards** per `CODEOWNERS`.

---

## 4. PR checklist

Before you open or mark a PR as ready:

* [ ] **verify-fast**: `pnpm run verify-fast`
* [ ] **verify-ci**: `pnpm run verify-ci`
* [ ] For rule changes:

  * [ ] `codes/CHANGELOG.md` updated
  * [ ] `meta.version` bumped in the relevant `bbc.rules.yaml`
  * [ ] Rule-change issue linked in PR
* [ ] For waivers:

  * [ ] Justification recorded in `policy/waivers.yaml`
  * [ ] Expiry date and plan scope are precise
* [ ] Reflection and provenance:

  * [ ] CI’s **Verify & Reflect / reflection** check passes
  * [ ] Provenance step runs without errors

---

## 5. Reflection window & provenance

This repo enforces a **cooling-off period** via a reusable reflection workflow:

* A PR must pass **Verify & Reflect / reflection** before it can be merged.
* This ensures there is a **minimum time window** between verification and
  merge, reducing impulsive changes to safety rules.

Provenance is built as part of CI:

* `reports/provenance.json` records plan metadata, rule versions, and hashes.
* CI verifies a signature using a **public key** when configured.
* This makes it possible to verify later that a given run obeyed a specific
  **constitutional & rules snapshot**.

---

## 6. Code of conduct

Short version:

* Be respectful.
* Assume good faith.
* Treat governance discussions as **shared safety work**, not personal battles.

If you’re unsure how to propose a change, open an issue with your questions,
and a steward will help you frame it.

Thanks for helping make Aesynth’s governance stack **safer, clearer,
and more explainable**.
