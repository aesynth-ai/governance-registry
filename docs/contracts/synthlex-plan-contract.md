# Synthlex ? BBC Plan Contract

| Synthlex metric | BBC plan field |
| --- | --- |
| `analyzer.metrics.corridor_min_width_mm` | `plan.corridors[].clear_width_mm` |
| `analyzer.paths[].egress_distance_m` | `plan.travel_paths[].distance_m` |
| `analyzer.occupant_load.total` | `plan.occupant_load` |
| `analyzer.exits.count` | `plan.exits.count` |
| `analyzer.stairs[].risers_mm` | `plan.stairs[].risers[].height_mm` |
| `analyzer.stairs[].treads_mm` | `plan.stairs[].treads[].depth_mm` |
| `analyzer.stairs[].headroom_mm` | `plan.stairs[].headroom_mm` |
| `analyzer.handrails[].height_mm` | `plan.handrails[].height_mm` |
| `analyzer.handrails[].grasp_mm` | `plan.handrails[].grasp_diameter_mm` |
| `analyzer.guards[].height_mm` | `plan.guards[].height_mm` |
| `analyzer.guards[].opening_mm` | `plan.guards[].opening_mm` |

This contract guarantees the Synthlex analyzer emits every field BBC needs. When adding jurisdictions or metrics, extend this document and the plan schema together.
