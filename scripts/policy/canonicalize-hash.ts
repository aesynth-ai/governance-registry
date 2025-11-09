#!/usr/bin/env -S node --enable-source-maps
const fs = require("node:fs");
const crypto = require("node:crypto");
const YAML = require("js-yaml");

function canonicalJSONStringify(obj) {
  const sorter = (v) =>
    Array.isArray(v)
      ? v.map(sorter)
      : v && typeof v === "object"
      ? Object.keys(v)
          .sort()
          .reduce((acc, k) => {
            acc[k] = sorter(v[k]);
            return acc;
          }, {})
      : v;
  return JSON.stringify(sorter(obj));
}

const targetPath = process.argv[2] || "docs/policies/PolicyRegistry.yaml";
const raw = fs.readFileSync(targetPath, "utf8");
const parsed = YAML.load(raw);
const canon = canonicalJSONStringify(parsed);
const hash = crypto.createHash("sha256").update(canon).digest("hex");
console.log(`sha256:${hash}`);
