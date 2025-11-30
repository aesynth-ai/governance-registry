# Aesynth Governance Registry

Public, immutable catalog of Aesynth's foundational laws, governing bodies, signers, and ledgered proceedings. The registry is readable by anyone, write-controlled through review, and intended to be the durable root of trust for Aesynth governance.

- **What** exists: constitutions, charters, protocols, manifestos, and ratified resolutions.
- **Who** approved it: actors, signing keys, and the governing bodies they represent.
- **When** it changed: explicit versioning, supersession history, and append-only ledger events.
- **How** to verify: canonical hashes, provenance envelopes, and detached signatures.

All assets live directly in Git for transparency and reproducibility. The `index/` and `schemas/` folders provide machine validation and navigation aids that keep the registry coherent.

## Repository Layout

```
registry/
|- docs/                         # Ratified texts (Markdown + provenance envelope per version)
|- resolutions/                  # JSON records of ratifications, amendments, vetoes, interpretations
|- bodies/                       # Governing body manifests and seat definitions
|- actors/                       # Signers and key material used for attestations
|- ledger/                       # Immutable ledger events (append-only, sequence numbered)
|- index/                        # Machine-readable catalog + sitemap for static publishing
|- schemas/                      # JSON Schemas powering validation + CI enforcement
|- tools/                        # CLI helpers (hashing, signature checks, renderers)
|- GOVERNANCE.md                 # Maintainer and branch policy
|- SECURITY.md                   # Key management, disclosure, and verification policy
|- CONTRIBUTING.md               # How to propose changes safely
`- LICENSE                       # Repository licensing
```

Key identifiers follow stable namespaces:

- `aesynth:gov:doc/*`: constitutional documents, charters, protocols, manifestos, policies.
- `aesynth:gov:res/*`: resolutions and official actions.
- `aesynth:gov:body/*`: governing councils and committees.
- `aesynth:gov:seat/*`: seats and roles bound to bodies.
- `aesynth:gov:actor/*`: people or agents with signing keys.
- `aesynth:gov:ledger/*`: ordered ledger events anchoring provenance.

## Public API

Static endpoints (CDN-friendly) expose the registry for read-only consumers:

- `GET /index/catalog.json`: catalog of documents, bodies, actors, resolutions, and ledger pointers.
- `GET /docs/<slug>/<version>/provenance.json`: provenance envelope for a specific document version.
- `GET /ledger/<sequence>.json`: immutable ledger event.
- `GET /resolutions/<slug>.json`: resolution payload (ratify, amend, veto, interpret).

HTML mirrors of ratified documents will be published under `/registry/docs/<slug>/<version>/` to satisfy public visibility requirements.

## Maintainer CLI

A Node/TypeScript CLI (`registry-cli`) will orchestrate write operations via PRs. Planned commands:

```bash
registry doc new <slug> --version <semver> --file <path>
registry doc propose <slug>@<semver>
registry res ratify --target <slug>@<semver> --minutes <path>
registry ledger append --event <type> --subject <urn>
registry sign <path> --key ./keys/provisional.json
registry verify --all
```

The CLI will normalize Markdown, refresh provenance envelopes, generate ledger entries, and update `index/` snapshots. All writes still land in Git and require review.

## Governance Hooks

- Every normative change records `requiredBodies` so dual-ratification can be enforced once new councils activate.
- Resolutions capture `minHumanReviewMinutes`; CI can block merges until the cooling period elapses.
- Ledger events remain append-only, and each ratification references its sealing event.
- Public HTML views surface content, hash, signatures, and supersession chains for every ratified document.

## Current Seed Data (MVP)

- Aesynth Constitution v1.0.0 (`evt-000125`/`evt-000126`).
- Human Constitution v1.0.0 (`evt-000127`/`evt-000128`).
- Semantic Charter v1.1.0 (`evt-000123`/`evt-000124`).
- Joint Semantic Assembly Protocol v1.0.0 (`evt-000129`/`evt-000130`).
- Founders Manifesto v1.0.0 (`evt-000131`/`evt-000132`).
- Governing bodies: Joint Semantic Assembly (provisioned) and Provisional Stewardship Body (active).
- Actor: Provisional Steward of Meaning with DID key material.

The machine index at `index/catalog.json` is the canonical bundle for downstream automation. `index/sitemap.json` offers a lightweight navigation layout for static site renderers.

## Validation & CI Expectations

Pull requests must pass automated checks before merge:

1. Schema validation: every JSON document must conform to its schema under `schemas/`.
2. Hash integrity: recomputed hashes must match the values stored in provenance envelopes and ledger events.
3. Signature verification: detached JWS signatures must validate against current actor keys.
4. State machine checks: status transitions for documents, resolutions, and bodies must follow the allowed lifecycle.
5. Ledger append-only rule: existing ledger entries cannot be modified or deleted; only new events may be appended.
6. Cooling-period guard: CI confirms `minHumanReviewMinutes` has elapsed before promoting to `main`.

Run `npm run verify` locally before opening a PR; it executes the same pipeline as `.github/workflows/verify.yml` (`validate-schemas`, `verify-hashes`, `verify-signatures`, `verify-state`, and a deterministic `build-index` pass). The `Enforce Latency Gap` workflow blocks merges until the cooling period elapses.

## Verification Ritual

Any third party can re-derive trust in five steps:

1. Fetch `index/catalog.json` plus the relevant Markdown file and `provenance.json`.
2. Normalize the Markdown (`md-normalized-v1`) and compute a SHA-256 digest; compare with the provenance entry.
3. Verify each JWS signature against the keys listed in `actors/` (the CLI will offer `registry verify --all`).
4. Confirm the document status is `ratified`, not `superseded`, and that `requiredBodies` obligations are satisfied.
5. Walk the ledger events referencing the URN to ensure monotonic IDs and matching hashes for every ratification.

## Working With the Registry

1. Branch from `draft` for collaborative edits. Production artifacts land in `main` only after review.
2. Normalize Markdown before hashing (`md-normalized-v1`) and update the sidecar provenance envelope.
3. Populate `requiredBodies` and `minHumanReviewMinutes` whenever you introduce normative changes.
4. Append new ledger entries instead of editing historical records; IDs increment monotonically.
5. Update `index/catalog.json` and `index/sitemap.json` so downstream consumers stay consistent.
6. Run `npm run build:index` (if needed) and `npm run verify` to ensure the repository is internally consistent.
7. Include minutes and supporting evidence for resolutions and body changes.

Refer to [GOVERNANCE.md](GOVERNANCE.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for deeper policy details.

## Releases

Stable snapshots are tagged `registry-vX.Y.Z`. Each release should include a registry bundle (Merkle-rooted JSON) once the tooling is ready.

## Contact

Security disclosures: security@aesynth.ai  
General governance inquiries: governance@aesynth.ai
![verify-governance](https://github.com/aesynth-ai/governance-registry/actions/workflows/verify-governance.yml/badge.svg)

Aesynth Governance Registry

Public Root of Trust for the Aesynth Intelligence System
Repository: aesynth-ai/governance-registry






Overview

The Governance Registry is the Root of Trust for the Aesynth ecosystem.
It provides an immutable, version-controlled record of all constitutional documents, resolutions, governing bodies, and provenance events that define and protect Aesynth’s lawful operation.

This repository ensures the integrity, transparency, and continuity required for Explainable Artificial Intelligence (XAI) governance, auditing, and compliance.

1. Core Purpose

The Registry tracks and verifies four fundamental dimensions of lawful operation:

Function	Description
What exists	Constitutional Documents, Charters, and Protocols.
Who approved it	Signers, Governing Bodies, and Authorized Roles.
When it changed	Versions, Amendments, and Supersessions.
How to verify it	Content Hashes, Digital Signatures, and Provenance Envelopes.

The system is read-public and write-controlled, ensuring transparency for all participants and permanence of the historical record.

2. Canonical Namespaces

All entities in the Registry follow a strict URN-based naming convention.
These namespaces serve as immutable identifiers across all Aesynth subsystems.

Namespace	Example ID	Purpose
aesynth:gov:doc/*	aesynth:gov:doc/aesynth-constitution@1.0.0	Foundational constitutional documents.
aesynth:gov:res/*	aesynth:gov:res/2025-11-01-ratify-semantic-charter-1-1	Resolutions, ratifications, amendments, and vetoes.
aesynth:gov:body/*	aesynth:gov:body/jsa	Governing assemblies and councils.
aesynth:gov:actor/*	aesynth:gov:actor/provisional-steward	Individuals or agents with signing authority.
aesynth:gov:seat/*	aesynth:gov:seat/jsa-synthlex-1	Assigned roles within governing bodies.
aesynth:gov:ledger/*	(Implied via Git commits and ledger entries)	Immutable record of events and attestations.
3. Workflow & Branch Policy

To preserve the integrity of the Registry, a strict two-branch model is enforced.

Branch	Status	Access	Content Type
main	Production	Write-controlled (via Pull Requests)	Ratified, immutable, and verified documents.
draft	Staging	Open for collaboration	Proposed documents, pending resolutions, and unratified changes.

No direct commits are permitted to main.
All changes must be submitted via Pull Request and pass automated integrity checks, including:

Schema validation

Hash and signature verification

Required-body approvals

Latency-gap (human reflection) enforcement

4. Transparency & Verification

Every ratified document includes a Provenance Envelope containing:

Canonical content hash (sha256)

Signing key ID (did:key)

Signature (JWS detached payload)

Timestamp and signing algorithm

Reference to the corresponding ledger event

Verification scripts are provided under /tools
 and automatically executed via GitHub Actions CI.
The verification ritual can also be performed manually using registry-cli (coming soon).

5. Governance Principles

The Registry embodies the foundational oaths defined in the Aesynth Founder’s Manifesto:

Clarity — Every law and policy must remain interpretable.

Friction — Every action must preserve time for human reflection.

Continuity — Every record must remain public, immutable, and auditable.

6. Repository Structure
governance-registry/
 ├─ docs/              # Ratified documents (constitutions, charters, protocols)
 ├─ resolutions/       # Governance resolutions and amendments
 ├─ bodies/            # Councils and assemblies (JSA, Aesynth Council, etc.)
 ├─ actors/            # Registered signers and keys
 ├─ ledger/            # Immutable event records
 ├─ index/             # Catalogs, sitemaps, and HTML views
 ├─ schemas/           # JSON Schemas for validation
 ├─ tools/             # CLI and CI automation scripts
 ├─ GOVERNANCE.md      # Internal workflow and branch protections
 ├─ CONTRIBUTING.md    # Collaboration and ratification process
 ├─ SECURITY.md        # Key management and disclosure procedures
 ├─ LICENSE            # Legal license for registry data
 └─ README.md          # This file

7. Status

✅ Phase I: Governance & Legitimacy — Complete
All foundational documents have been ratified and registered with full provenance.
Phase II (Synthlex Specification) will now proceed under this established legal framework.

8. License

This repository and its contents are released under the Aesynth Open Governance License v1.0 (AOG-1.0) — a permissive license designed to preserve legal traceability, attribution, and public transparency for constitutional and provenance data.

The AOG-1.0 license permits unrestricted public reading, verification, and educational use of registry materials, provided all provenance data and signatures remain intact and unaltered.

See the LICENSE
 file for full terms.

“Transparency is law.
Reflection is safety.
Memory is a right.”
— Aesynth Governance Charter, 2025
