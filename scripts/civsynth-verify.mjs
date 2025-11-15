#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const reportsDir = path.join("reports", "civsynth");
const plansDir = path.join(reportsDir, "city_plans");

if (!fs.existsSync(plansDir)) {
  console.log("No CivSynth plans found; skipping CivSynth verify.");
  process.exit(0);
}

fs.mkdirSync(reportsDir, { recursive: true });

const planFiles = fs
  .readdirSync(plansDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => path.join(plansDir, file));

if (planFiles.length === 0) {
  console.log("No CivSynth plans found; skipping CivSynth verify.");
  process.exit(0);
}

const results = [];

for (const filePath of planFiles) {
  const plan = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const planId = plan.meta?.plan_id || path.basename(filePath, ".json");
  const evalResult = evalPlan(plan);
  const status = evalResult.violations.length ? "FAIL" : "PASS";
  const report = {
    plan: planId,
    status,
    violations: evalResult.violations
  };

  const fileSafeId = planId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const destination = path.join(reportsDir, `city-${fileSafeId}.json`);
  fs.writeFileSync(destination, JSON.stringify(report, null, 2));

  appendHistory(planId, status, evalResult.violations.length);
  results.push(report);
}

const summary = {
  plans: results.length,
  failing: results.filter((r) => r.status === "FAIL").length,
  counts_by_code: aggregateCounts(results)
};

fs.writeFileSync(path.join(reportsDir, "civsynth-summary.json"), JSON.stringify(summary, null, 2));
console.log(`CivSynth: ${summary.plans} plan(s), failures=${summary.failing}`);

process.exit(summary.failing === 0 ? 0 : 1);

function evalPlan(plan) {
  const input = JSON.stringify(plan);
  const result = spawnSync("opa", ["eval", "--format", "json", "--data", "policy/civsynth.rego", "data.civsynth.city.violation", "--stdin-input"], {
    input,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error(`OPA evaluation failed for CivSynth plan ${plan.meta?.plan_id || "unknown"}`);
  }
  const parsed = JSON.parse(result.stdout);
  const violations = parsed?.result?.[0]?.expressions?.[0]?.value || [];
  return { violations };
}

function appendHistory(planId, status, count) {
  const historyPath = path.join(reportsDir, "civsynth-history.jsonl");
  const row = {
    ts: new Date().toISOString(),
    plan: planId,
    status,
    count
  };
  fs.appendFileSync(historyPath, JSON.stringify(row) + "\n");
}

function aggregateCounts(reports) {
  const counts = {};
  for (const report of reports) {
    for (const violation of report.violations) {
      counts[violation.code] = (counts[violation.code] || 0) + 1;
    }
  }
  return counts;
}
