package bbc

rules_ok := {
  "meta": {"version": "0.1.0", "units": "metric", "tolerance_mm": 5},
  "egress": {
    "corridor_min_clear_mm": 914,
    "max_travel_distance_m_unsprink": 61,
    "max_travel_distance_m_sprink": 76,
    "exit_factor_ol_divisor": 50
  },
  "stairs": {
    "riser_max_mm": 197,
    "tread_min_mm": 254,
    "variation_max_mm": 10,
    "headroom_min_mm": 2032
  },
  "handrails": {
    "height_mm_range": [864, 965],
    "continuous_required": true,
    "grasp_diameter_mm_range": [30, 60]
  },
  "guards": {"height_min_mm": 1067, "opening_max_mm": 102},
  "occupancy": {"min_exits_if_ol_gt": 49}
}

plan_ok := {
  "corridors": [{"clear_width_mm": 1000}],
  "travel_paths": [{"distance_m": 10}],
  "occupant_load": 40,
  "sprinklered": false,
  "stairs": [{
    "risers": [{"height_mm": 180}],
    "treads": [{"depth_mm": 260}],
    "variation_riser_mm": 4,
    "variation_tread_mm": 4,
    "headroom_mm": 2100
  }],
  "handrails": [{"height_mm": 900, "continuous": true, "grasp_diameter_mm": 40}],
  "guards": [{"height_mm": 1100, "opening_mm": 90}],
  "exits": {"count": 2}
}

plan_corridor_fail := {
  "corridors": [{"clear_width_mm": 800}],
  "travel_paths": plan_ok.travel_paths,
  "occupant_load": plan_ok.occupant_load,
  "sprinklered": plan_ok.sprinklered,
  "stairs": plan_ok.stairs,
  "handrails": plan_ok.handrails,
  "guards": plan_ok.guards,
  "exits": plan_ok.exits
}

plan_exit_fail := {
  "corridors": plan_ok.corridors,
  "travel_paths": plan_ok.travel_paths,
  "occupant_load": 200,
  "sprinklered": plan_ok.sprinklered,
  "stairs": plan_ok.stairs,
  "handrails": plan_ok.handrails,
  "guards": plan_ok.guards,
  "exits": {"count": 2}
}

plan_tolerance := {
  "corridors": [{"clear_width_mm": 909}],
  "travel_paths": plan_ok.travel_paths,
  "occupant_load": plan_ok.occupant_load,
  "sprinklered": plan_ok.sprinklered,
  "stairs": plan_ok.stairs,
  "handrails": plan_ok.handrails,
  "guards": plan_ok.guards,
  "exits": plan_ok.exits
}

codes(input) = {v.code | v := data.bbc.violation with input as input}

input_ok := {"plan": plan_ok, "rules": rules_ok}
input_corridor_fail := {"plan": plan_corridor_fail, "rules": rules_ok}
input_exit_fail := {"plan": plan_exit_fail, "rules": rules_ok}
input_tolerance := {"plan": plan_tolerance, "rules": rules_ok}

test_pass_minimal {
  codes(input_ok) == {}
}

test_fail_corridor_too_narrow {
  "BBC-EGR-COR-001" in codes(input_corridor_fail)
}

test_fail_exit_count {
  "BBC-EGR-EXIT-001" in codes(input_exit_fail)
}

test_tolerance_applied {
  not ("BBC-EGR-COR-001" in codes(input_tolerance))
}
