#!/usr/bin/env node
import { mkdirSync, readdirSync, statSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
let customOutput;
const sourceArgs = [];
for (let i = 0; i < args.length; i += 1) {
  const token = args[i];
  if (token === "--out") {
    const next = args[++i];
    if (!next) {
      throw new Error("--out requires a path argument");
    }
    customOutput = path.resolve(repoRoot, next);
  } else {
    sourceArgs.push(token);
  }
}

const outputDir = customOutput ?? path.join(repoRoot, "reports", "plans");
const jurisdiction = process.env.BBC_JUR || "BBC.v0.1.0.TW";
const defaultSource = path.join(repoRoot, "codes", jurisdiction, "examples");
const envSources = (process.env.PLAN_SOURCES ?? "")
  .split(path.delimiter)
  .map((segment) => segment.trim())
  .filter(Boolean);
const sources = [...sourceArgs, ...envSources];
const usingFallback = sources.length === 0;
const detSeed = process.env.SYNTHLEX_SEED || "local-dev";
const toolVersions = {
  synthlex_analyzer: process.env.SYNTHLEX_ANALYZER_VERSION || "unknown",
  cli: process.env.SYNTHLEX_CLI_VERSION || "unknown"
};

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const planFiles = new Set();

if (sources.length === 0) {
  collectFromPath(defaultSource);
} else {
  for (const input of sources) {
    collectFromPath(path.resolve(repoRoot, input));
  }
}

if (planFiles.size === 0) {
  collectFromPath(defaultSource);
}

if (usingFallback) {
  const preferred = Array.from(planFiles).filter((file) =>
    path.basename(file).toLowerCase().includes("passing")
  );
  if (preferred.length > 0) {
    planFiles.clear();
    preferred.forEach((file) => planFiles.add(file));
  }
}

if (planFiles.size === 0) {
  const fallbackPlan = path.join(defaultSource, "passing.plan.json");
  planFiles.add(fallbackPlan);
}

for (const file of planFiles) {
  const destination = path.join(outputDir, path.basename(file));
  const plan = readPlan(file);
  plan.meta = {
    ...(plan.meta ?? {}),
    det_seed: detSeed,
    jurisdiction,
    tool_versions: {
      ...(plan.meta?.tool_versions ?? {}),
      ...toolVersions
    },
    source: path.relative(repoRoot, file).replace(/\\/g, "/")
  };
  writeFileSync(destination, JSON.stringify(plan, null, 2) + "\n");
}

const relativeOutput = path.relative(repoRoot, outputDir) || outputDir;
console.log(`Copied ${planFiles.size} plan file(s) into ${relativeOutput} (jurisdiction=${jurisdiction})`);

function collectFromPath(targetPath) {
  if (!targetPath) return;
  const normalizedTarget = path.resolve(targetPath);
  if (normalizedTarget === outputDir) {
    return;
  }

  try {
    const stats = statSync(normalizedTarget);
    if (stats.isDirectory()) {
      const entries = readdirSync(normalizedTarget);
      for (const entry of entries) {
        const child = path.join(normalizedTarget, entry);
        const childStats = statSync(child);
        if (childStats.isDirectory()) {
          collectFromPath(child);
        } else if (childStats.isFile() && isPlanFile(child)) {
          planFiles.add(child);
        }
      }
    } else if (stats.isFile() && isPlanFile(normalizedTarget)) {
      planFiles.add(normalizedTarget);
    }
  } catch (error) {
    console.warn(`Skipping ${normalizedTarget}: ${error.message}`);
  }
}

function isPlanFile(filePath) {
  return filePath.endsWith(".json") && filePath.toLowerCase().includes("plan");
}

function readPlan(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse plan JSON at ${filePath}: ${error.message}`);
  }
}
