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
