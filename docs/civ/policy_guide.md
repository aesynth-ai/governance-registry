# CivSynth Policy Guide (CIV.v0.1.0.CITY)

CivSynth encodes municipal obligations aligned with the CIV.v0.1.0.CITY rulebook.
The current experimental release enforces three guardrails.

## C1.01 — PGZ crowd density
- Applies when `design.type == "PGZ"`.
- Flags any projected density above **4.0 persons/m²**.
- Ensures evacuation corridors and emergency planning share the same deterministic inputs as BBC egress.

## C1.02 — Greenspace access
- Examines every residence entry and ensures access to a park/greenspace within **500 m** walking distance.
- Violations return the offending `residence[i].id` to keep remediation precise.

## C1.03 — Public housing access to transit & clinics
- Applies when `housing.type == "public"` (public or mixed-income blocks).
- Requires mass-transit access within **800 m** and primary medical care within **1.2 km**.
- Emits separate findings so city planners can solve transit and clinic gaps independently.

> CivSynth is marked **EXPERIMENTAL** in Phase IV: thresholds will tighten as
> we calibrate them against regional ordinances, and multi-unit housing arrays
> will be added before general deployment.
