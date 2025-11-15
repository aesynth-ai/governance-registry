#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const reportsDir = path.join(repoRoot, "reports");
const plansDir = path.join(reportsDir, "plans");

if (!existsSync(plansDir)) {
  console.error("Plan directory missing; run generate-plan-artifacts first.");
  process.exit(1);
}

const baseline = readPlanMap(plansDir);
const tmpBase = mkdtempSync(path.join(tmpdir(), "bbc-plans-"));
const generator = path.join(repoRoot, "scripts", "generate-plan-artifacts.mjs");
const result = spawnSync("node", [generator, "--out", tmpBase], { cwd: repoRoot, stdio: "inherit" });
if (result.status !== 0) {
  console.error("Failed to regenerate plans for determinism check.");
  cleanup();
  process.exit(result.status ?? 1);
}

const regenerated = readPlanMap(tmpBase);
let mismatch = false;
const keys = new Set([...baseline.keys(), ...regenerated.keys()]);
for (const key of keys) {
  const a = baseline.get(key);
  const b = regenerated.get(key);
  if (!a || !b || a !== b) {
    console.error(`Plan determinism mismatch for ${key}`);
    mismatch = true;
  }
}

cleanup();

if (mismatch) {
  process.exit(2);
}
console.log("Plan determinism check passed");

function readPlanMap(dir) {
  const map = new Map();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const full = path.join(dir, file);
    map.set(file, readFileSync(full, "utf8"));
  }
  return map;
}

function cleanup() {
  try {
    rmSync(tmpBase, { recursive: true, force: true });
  } catch (error) {
    console.warn("Failed to clean temp directory", error.message);
  }
}
