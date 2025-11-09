#!/usr/bin/env -S node --enable-source-maps
const fs = require("node:fs");
const YAML = require("js-yaml");

const LOG = "logs/POLICY_LOG.yaml";
const evt = {
  ts: new Date().toISOString(),
  event: process.argv[2] || "policy_registry_initialized",
  registry_version: process.argv[3] || "1.0.0",
  registry_hash: process.argv[4] || "",
  policies: (process.argv[5]?.split(",") ?? ["AIP-1.0.0", "APR-1.0.0"])
};
const doc = fs.existsSync(LOG) ? YAML.load(fs.readFileSync(LOG, "utf8")) : [];
doc.push(evt);
fs.writeFileSync(LOG, YAML.dump(doc), "utf8");
console.log("Logged:", evt);
