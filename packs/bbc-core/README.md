# BBC Core Pack

This pack encodes the baseline checks required by `BBC-001.v1.0.0`. Repositories that output plans, assemblies, or geometry reference this pack via `bbc/manifest.yaml` so CI can confirm the correct safety proofs are gathered before merge.

Checks included:

- `structural-envelope`: validates load, span, and stress limits
- `ingress-egress`: enforces redundant escape routes
- `annotations`: guarantees BBC annotations + provenance are attached to manifests

The reusable workflow `_reusable-bbc-verify.yml` validates consuming repositories against `schemas/bbc/manifest.schema.json` and confirms this pack definition remains canonical.
