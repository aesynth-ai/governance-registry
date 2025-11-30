#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const reportsDir = path.join(repoRoot, "reports");
const jurisdiction = process.env.BBC_JUR || "BBC.v0.1.0.TW";
const rulesPath = path.join(repoRoot, "codes", jurisdiction, "bbc.rules.yaml");
const planSchemaPath = path.join(repoRoot, "schemas", "plan.schema.json");
const constitutionHashesPath = path.join(reportsDir, "constitution.hashes.txt");
const summaryPath = path.join(reportsDir, "bbc-summary.json");
const plansDir = path.join(reportsDir, "plans");

mkdirSync(reportsDir, { recursive: true });

const rulesDoc = parseYaml(readFileSync(rulesPath, "utf8"));
const summary = existsSync(summaryPath)
  ? JSON.parse(readFileSync(summaryPath, "utf8"))
  : null;

const provenance = {
  commit: process.env.GIT_SHA || null,
  workflow_ref: process.env.WORKFLOW_REF || null,
  generated_at: new Date().toISOString(),
  jurisdiction,
  rules_version: rulesDoc?.meta?.version ?? "unknown",
  bbc_rules_sha256: sha256File(rulesPath),
  plan_schema_sha256: sha256File(planSchemaPath),
  constitution_hashes: readConstitutionHashes(constitutionHashesPath),
  plan_artifacts: summarizePlans(plansDir),
  bbc_summary: summary,
  node: process.version
};

writeFileSync(path.join(reportsDir, "provenance.json"), JSON.stringify(provenance, null, 2));
console.log("Wrote provenance.json");

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readConstitutionHashes(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .map((line) => {
      const match = line.match(/^([0-9a-f]{64})\s+(.+)$/i);
      if (!match) {
        return null;
      }
      return { hash: match[1], path: match[2] };
    })
    .filter(Boolean);
}

function summarizePlans(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => {
      const full = path.join(dir, entry);
      const data = JSON.parse(readFileSync(full, "utf8"));
      return {
        file: path.relative(repoRoot, full).replace(/\\/g, "/"),
        hash: sha256File(full),
        det_seed: data?.meta?.det_seed ?? null,
        tool_versions: data?.meta?.tool_versions ?? null
      };
    });
}


