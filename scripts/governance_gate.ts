#!/usr/bin/env -S node --enable-source-maps
const fs = require("node:fs");
const crypto = require("node:crypto");
const YAML = require("js-yaml");
const { execSync } = require("node:child_process");

const must = (cond, msg) => {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
};

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const canonicalHash = (obj) =>
  "sha256:" +
  crypto.createHash("sha256").update(JSON.stringify(canonicalize(obj))).digest("hex");

const loadYaml = (p) => YAML.load(fs.readFileSync(p, "utf8"));

const A4 = "docs/addendums/A-4.v1.2.1.yaml";
const REG = "docs/addendums/AmendmentRegistry.yaml";
const POL = "docs/policies/PolicyRegistry.yaml";
const MAN = "docs/policies/RegistryManifest.yaml";
const REQUIRED = [
  "docs/constitutions/AI_Technical_Constitution.yaml",
  "docs/specs/SystemSpecification_v1.0.yaml",
  A4,
  REG,
  POL,
  MAN
];
REQUIRED.forEach((file) => must(fs.existsSync(file), `Missing ${file}`));

const a4Doc = loadYaml(A4);
const regDoc = loadYaml(REG) || [];
const manDoc = loadYaml(MAN);
const polDoc = loadYaml(POL);

const cloned = JSON.parse(JSON.stringify(a4Doc));
if (cloned?.bindings?.sha_chain) cloned.bindings.sha_chain.current = null;
cloned.hash = null;
const a4Hash = canonicalHash(cloned);
must(a4Doc.hash === a4Hash, `A-4 hash mismatch file=${a4Hash} doc=${a4Doc.hash}`);
must(regDoc.find((entry) => entry.id === "A-4" && entry.version === "1.2.1" && entry.sha256 === a4Hash), "A-4 not registered");

const manifestHash = manDoc?.registry_sha256 || manDoc?.registry?.hash;
const manifestCanonical = manDoc?.registry?.canonical_hash || manifestHash;
must(manifestHash && manifestCanonical, "RegistryManifest missing hashes");
must(manifestHash === manifestCanonical, "RegistryManifest hash mismatch");
const policyHash = execSync("node scripts/policy/canonicalize-hash.ts", { encoding: "utf8" }).trim();
must(manifestHash === policyHash, "PolicyRegistry hash does not match RegistryManifest");

if (process.argv.includes("--snapshot")) {
  fs.writeFileSync(
    "logs/audit-snapshot-A4.json",
    JSON.stringify(
      { ts: new Date().toISOString(), a4: { hash: a4Hash }, manifest: manDoc, policy_registry: { hash: policyHash } },
      null,
      2
    )
  );
  console.log("Snapshot written: logs/audit-snapshot-A4.json");
}

console.log("governance_gate: OK");

