#!/usr/bin/env -S node --enable-source-maps
const fs = require("node:fs");
const YAML = require("js-yaml");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const REGISTRY = "docs/policies/PolicyRegistry.yaml";
const SCHEMA = "schemas/policy.schema.json";

const registry = YAML.load(fs.readFileSync(REGISTRY, "utf8"));
const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let ok = true;
for (const entry of registry.policies || []) {
  const policyDoc = YAML.load(fs.readFileSync(entry.path, "utf8"));
  const valid = validate(policyDoc);
  if (!valid) {
    ok = false;
    console.error(`Policy ${entry.id} failed schema validation:`);
    console.error(JSON.stringify(validate.errors, null, 2));
  }
}

if (!ok) {
  process.exit(1);
}

const bad = (registry.policies || []).filter((p) => !/^\d+\.\d+\.\d+$/.test(p.current_version ?? p.semver ?? ""));
if (bad.length) {
  console.error("Invalid semver in registry entries:", bad.map((p) => p.id).join(", "));
  process.exit(1);
}

console.log("Policy registry + policies validated: OK");
