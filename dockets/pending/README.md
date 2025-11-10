# Pending Dockets

Use this directory for proposed amendments or policy updates initiated by Aesynth. Each docket **must**:

1. Include the policy or artifact being amended.
2. Provide a CRR link in the front-matter (`crr: CRR-YYYY-SEQ`).
3. Reference the relevant policy IDs (e.g., `MOP-001`, `BBC-001`).

A lightweight CI workflow (`verify-dockets.yml`) ensures every docket contains a CRR reference before reviewers are requested. Dockets remain here until a human steward merges or archives them.
