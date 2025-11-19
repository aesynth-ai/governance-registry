#!/usr/bin/env node
import { mkdirSync, readdirSync, rmSync, statSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const defaultSource = path.join(repoRoot, "codes", "CIV.v0.1.0.CITY", "examples");
const defaultOutput = path.join(repoRoot, "reports", "civsynth", "city_plans");

const sourceDir = path.resolve(process.env.CIVSYNTH_PLAN_SOURCE || defaultSource);
const outputDir = path.resolve(process.env.CIVSYNTH_PLAN_OUT || defaultOutput);

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const planFiles = collectJsonFiles(sourceDir);
if (planFiles.length === 0) {
  throw new Error(`No CivSynth plan examples found under ${sourceDir}`);
}

for (const filePath of planFiles) {
  const plan = JSON.parse(readFileSync(filePath, "utf8"));
  plan.meta = {
    ...(plan.meta ?? {}),
    source: path.relative(repoRoot, filePath).replace(/\\/g, "/")
  };
  const destination = path.join(outputDir, path.basename(filePath));
  writeFileSync(destination, JSON.stringify(plan, null, 2));
}

console.log(`Copied ${planFiles.length} CivSynth plan(s) into ${path.relative(repoRoot, outputDir)}`);

function collectJsonFiles(targetDir) {
  let files = [];
  try {
    const entries = readdirSync(targetDir);
    for (const entry of entries) {
      const entryPath = path.join(targetDir, entry);
      const stats = statSync(entryPath);
      if (stats.isDirectory()) {
        files = files.concat(collectJsonFiles(entryPath));
      } else if (stats.isFile() && entryPath.endsWith(".json")) {
        files.push(entryPath);
      }
    }
  } catch (error) {
    console.warn(`Skipping ${targetDir}: ${error.message}`);
  }
  return files;
}
