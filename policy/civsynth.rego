package civsynth.city

default allow := false

pgz_density_limit := 4.0
greenspace_distance_limit := 500.0
transit_distance_limit := 800.0
clinic_distance_limit := 1200.0

violation[v] {
  v := pgz_density_violation
}

violation[v] {
  v := greenspace_violation[_]
}

violation[v] {
  v := housing_transit_violation
}

violation[v] {
  v := housing_clinic_violation
}

allow {
  count(violation) == 0
}

pgz_density_violation := {
  "code": "CIV-C1.01",
  "msg": sprintf("PGZ density %.2f exceeds limit %.2f", [input.design.density, pgz_density_limit]),
  "path": "design.density"
} {
  lower(input.design.type) == "pgz"
  input.design.density > pgz_density_limit
}

greenspace_violation[v] {
  some i
  residences := input.residence
  residences[i].dist_to_greenspace > greenspace_distance_limit
  v := {
    "code": "CIV-C1.02",
    "msg": sprintf("Residence %s is %.0fm from greenspace (limit %.0fm)", [residences[i].id, residences[i].dist_to_greenspace, greenspace_distance_limit]),
    "path": sprintf("residence[%d].dist_to_greenspace", [i])
  }
}

housing_transit_violation := {
  "code": "CIV-C1.03-TRANSIT",
  "msg": sprintf("Public housing transit access %.0fm exceeds limit %.0fm", [input.housing.dist_to_transit, transit_distance_limit]),
  "path": "housing.dist_to_transit"
} {
  lower(input.housing.type) == "public"
  input.housing.dist_to_transit > transit_distance_limit
}

housing_clinic_violation := {
  "code": "CIV-C1.03-CLINIC",
  "msg": sprintf("Public housing clinic access %.0fm exceeds limit %.0fm", [input.housing.dist_to_clinic, clinic_distance_limit]),
  "path": "housing.dist_to_clinic"
} {
  lower(input.housing.type) == "public"
  input.housing.dist_to_clinic > clinic_distance_limit
}
