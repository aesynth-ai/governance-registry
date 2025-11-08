Branch Protection Rules Summary

These rules are enforced on the main branch to guarantee the immutability and verifiable integrity of the Governance Registry data, serving the XAI's root of trust requirement.


1. Branch: main (Production / Ratified)

Rule

Requirement

Purpose

Require pull request reviews before merging

ON (Minimum 1 reviewer)

Enforces manual peer review of legal and structural changes.

Require status checks to pass before merging

ON

Mandates successful execution of CI/CD workflows (see Section 2).

Require branches to be up to date before merging

ON

Prevents merging stale changes and ensures all checks run against the latest main.

Do not allow bypassing the above settings

ON

Prevents administrative override, preserving the audit trail.

Restrict who can push to matching branches

ON (Limited to Admin/CI Bot)

Ensures all changes go through a Pull Request flow.


2. Required Status Checks (CI Workflows)

The following GitHub Actions must successfully pass before any Pull Request can merge into main:

schema_validation: Confirms that all new/modified YAML/JSON files adhere to their defined schemas (/schema/*).

content_hash_integrity: Confirms the content_hash metadata field matches the actual SHA-256 of the associated text file.

provenance_check: Verifies that the digital signatures/actor IDs referenced in the change are valid and authorized.


3. Branch: draft (Staging / Proposed)

No protection rules are strictly enforced on draft. This is the environment for open collaboration and initial documentation of proposed changes.

The draft branch is not considered ratified or binding.
