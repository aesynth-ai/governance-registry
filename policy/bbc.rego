package bbc

default allow := false

violation[v] { v := egress_corridor_violation[_] }
violation[v] { v := egress_travel_violation[_] }
violation[v] { v := egress_exit_violation }
violation[v] { v := stair_dim_violation[_] }
violation[v] { v := stair_headroom_violation[_] }
violation[v] { v := handrail_violation[_] }
violation[v] { v := guard_violation[_] }

allow { count(violation) == 0 }

tol := input.rules.meta.tolerance_mm

# Corridor width

egress_corridor_violation[v] {
  some i
  min := input.rules.egress.corridor_min_clear_mm - tol
  cw := input.plan.corridors[i].clear_width_mm
  cw < min
  v := {
    "code":"BBC-EGR-COR-001",
    "msg": sprintf("Corridor %.0f < %.0f", [cw, min]),
    "path": sprintf("corridors[%d].clear_width_mm", [i])
  }
}

# Travel distance (unsprinklered)

egress_travel_violation[v] {
  some i
  not input.plan.sprinklered
  d := input.plan.travel_paths[i].distance_m
  max := input.rules.egress.max_travel_distance_m_unsprink
  d > max
  v := {
    "code":"BBC-EGR-TRV-001",
    "msg": sprintf("Travel %.1f > %.1f", [d, max]),
    "path": sprintf("travel_paths[%d].distance_m", [i])
  }
}

# Travel distance (sprinklered)

egress_travel_violation[v] {
  some i
  input.plan.sprinklered
  d := input.plan.travel_paths[i].distance_m
  max := input.rules.egress.max_travel_distance_m_sprink
  d > max
  v := {
    "code":"BBC-EGR-TRV-001",
    "msg": sprintf("Travel %.1f > %.1f", [d, max]),
    "path": sprintf("travel_paths[%d].distance_m", [i])
  }
}

# Exit count

egress_exit_violation := {
  "code":"BBC-EGR-EXIT-001",
  "msg": sprintf("Required exits %d, provided %d (OL %d)", [req_final, got, ol]),
  "path": "exits.count"
} {
  ol := input.plan.occupant_load
  divisor := input.rules.egress.exit_factor_ol_divisor
  threshold := input.rules.occupancy.min_exits_if_ol_gt
  req_final := required_exit_count(ol, divisor, threshold)
  got := provided_exit_count()
  req_final > got
}

required_exit_count(ol, divisor, threshold) := result {
  base := ceil(ol / divisor)
  ol <= threshold
  result := base
}

required_exit_count(ol, divisor, threshold) := result {
  base := ceil(ol / divisor)
  ol > threshold
  result := max([base, 2])
}

provided_exit_count() := value {
  value := input.plan.exits.count
}

provided_exit_count() := 1 {
  not input.plan.exits.count
}

# Stair riser/tread

stair_dim_violation[v] {
  some i
  riserMax := input.rules.stairs.riser_max_mm
  rh := input.plan.stairs[i].risers[0].height_mm
  rh > riserMax + tol
  v := {"code":"BBC-STR-DIM-001","msg":"Stair riser out of bounds","path":sprintf("stairs[%d]",[i])}
}

stair_dim_violation[v] {
  some i
  treadMin := input.rules.stairs.tread_min_mm
  td := input.plan.stairs[i].treads[0].depth_mm
  td + tol < treadMin
  v := {"code":"BBC-STR-DIM-001","msg":"Stair tread out of bounds","path":sprintf("stairs[%d]",[i])}
}

stair_dim_violation[v] {
  some i
  vmax := input.rules.stairs.variation_max_mm
  vr := input.plan.stairs[i].variation_riser_mm
  vr > vmax + tol
  v := {"code":"BBC-STR-DIM-001","msg":"Stair riser variation out of bounds","path":sprintf("stairs[%d]",[i])}
}

stair_dim_violation[v] {
  some i
  vmax := input.rules.stairs.variation_max_mm
  vt := input.plan.stairs[i].variation_tread_mm
  vt > vmax + tol
  v := {"code":"BBC-STR-DIM-001","msg":"Stair tread variation out of bounds","path":sprintf("stairs[%d]",[i])}
}

stair_headroom_violation[v] {
  some i
  min := input.rules.stairs.headroom_min_mm - tol
  h := input.plan.stairs[i].headroom_mm
  h < min
  v := {"code":"BBC-STR-HDR-001","msg":sprintf("Headroom %.0f < %.0f",[h,min]),"path":sprintf("stairs[%d].headroom_mm",[i])}
}

# Handrails

handrail_violation[v] {
  some i
  hmin := input.rules.handrails.height_mm_range[0]
  h := input.plan.handrails[i].height_mm
  h < hmin - tol
  v := {"code":"BBC-HRL-001","msg":"Handrail height too low","path":sprintf("handrails[%d]",[i])}
}

handrail_violation[v] {
  some i
  hmax := input.rules.handrails.height_mm_range[1]
  h := input.plan.handrails[i].height_mm
  h > hmax + tol
  v := {"code":"BBC-HRL-001","msg":"Handrail height too high","path":sprintf("handrails[%d]",[i])}
}

handrail_violation[v] {
  some i
  input.rules.handrails.continuous_required == true
  cont := input.plan.handrails[i].continuous
  cont != true
  v := {"code":"BBC-HRL-001","msg":"Handrail must be continuous","path":sprintf("handrails[%d]",[i])}
}

handrail_violation[v] {
  some i
  dmin := input.rules.handrails.grasp_diameter_mm_range[0]
  d := input.plan.handrails[i].grasp_diameter_mm
  d < dmin - tol
  v := {"code":"BBC-HRL-001","msg":"Handrail grasp diameter too small","path":sprintf("handrails[%d]",[i])}
}

handrail_violation[v] {
  some i
  dmax := input.rules.handrails.grasp_diameter_mm_range[1]
  d := input.plan.handrails[i].grasp_diameter_mm
  d > dmax + tol
  v := {"code":"BBC-HRL-001","msg":"Handrail grasp diameter too large","path":sprintf("handrails[%d]",[i])}
}

# Guards

guard_violation[v] {
  some i
  hmin := input.rules.guards.height_min_mm
  h := input.plan.guards[i].height_mm
  h + tol < hmin
  v := {"code":"BBC-GRD-001","msg":"Guard height too low","path":sprintf("guards[%d]",[i])}
}

guard_violation[v] {
  some i
  omax := input.rules.guards.opening_max_mm
  o := input.plan.guards[i].opening_mm
  o > omax + tol
  v := {"code":"BBC-GRD-001","msg":"Guard opening too large","path":sprintf("guards[%d]",[i])}
}
