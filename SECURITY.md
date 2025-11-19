# Security Policy

The Governance Registry is a critical trust anchor for Aesynth. This policy describes vulnerability disclosure expectations, key management practices, and verification guidance for downstream consumers.

## Vulnerability Reporting

- Email `security@aesynth.ai` with the subject `GOV-REGISTRY DISCLOSURE`.
- Include reproduction steps, affected files, and any ledger URNs involved.
- Please use encrypted mail when possible (PGP key fingerprint `C5A1 45C1 7E83 2E5C 9C1F  8F91 4A62 91FE A91D 5612`).
- We aim to acknowledge reports within 48 hours and provide remediation timelines within five business days.

## Key & Signature Management

- Authoritative signing keys are published under `actors/`. Each entry lists active DID-based keys (`did:key`).
- All ratified artifacts must ship with a provenance envelope (`provenance.json`) and appear in the ledger.
- Maintainer signing material is stored encrypted (age/mini-sign style) inside the repo; the decryption passphrase is distributed out of band and never committed.
- Compromised keys trigger immediate:
  1. Ledger event documenting revocation.
  2. Update to the corresponding actor record with a `revoked` timestamp.
  3. Re-signing of affected documents and resolutions.
- When we migrate to Sigstore, provenance entries will capture the Rekor log UUID under `provenance.attestations` for independent transparency verification.

## Verification Guidance

1. Clone the repository.
2. Normalize any Markdown files with `tools/md-normalize` (to be released).
3. Compute SHA-256 hashes and compare against the `sha256` fields in provenance envelopes and ledger events.
4. Verify detached JWS signatures using the DID keys provided in `actors/`.
5. Confirm the ledger sequence is append-only and that referenced URNs exist.

Automation scripts and reproducible workflows will live under `tools/`. Until then, manual verification steps are documented here.

## Disclosure Coordination

If a vulnerability affects broader Aesynth infrastructure, we coordinate disclosure with the Aesynth Security Response Team before public release. Do not share sensitive findings outside the coordinated channel.

## Historical Records

- Security advisories and mitigations should be logged as governance resolutions when they materially change policy.
- Ledger entries referencing security incidents must retain raw evidence links when feasible.
