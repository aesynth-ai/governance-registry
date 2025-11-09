#!/usr/bin/env -S node --enable-source-maps
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ORG = process.env.AESYNTH_ORG || "aesynth-ai";
const DRY = process.argv.includes("--dry-run");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",") ?? null;
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "4", 10);

const allRepos = JSON.parse(fs.readFileSync("federation.repos.json", "utf8"));
const targets = ONLY ? allRepos.filter((r) => ONLY.includes(r)) : allRepos;

const regHash = exec("node scripts/policy/canonicalize-hash.ts").trim();
const branch = `chore/policy-genesis-${Date.now()}`;

log(`Policy registry hash: ${regHash}`);
log(`Targets: ${targets.length} repos${ONLY ? " (allowlist)" : ""}${DRY ? " [DRY RUN]" : ""}`);

let idx = 0;
let active = 0;
async function runQueue() {
  const batch = [];
  while (idx < targets.length && active < LIMIT) {
    const repo = targets[idx++];
    active++;
    batch.push(processRepo(repo).finally(() => active--));
  }
  await Promise.all(batch);
  if (idx < targets.length) await runQueue();
}

async function processRepo(repo) {
  try {
    const tmp = path.join(".tmp", repo);
    if (!DRY) exec(`rm -rf ${tmp}`);
    exec(`gh repo clone ${ORG}/${repo} ${tmp} -- --depth=1`);
    process.chdir(tmp);

    if (!DRY) exec(`git checkout -b ${branch}`);

    fs.mkdirSync(".aesynth", { recursive: true });
    fs.writeFileSync(
      ".aesynth/policy_ref.yaml",
      `policy_registry_hash: "${regHash}"
aip: "1.0.0"
apr: "1.0.0"
`,
      "utf8"
    );

    try {
      fs.mkdirSync(".github/workflows", { recursive: true });
      fs.copyFileSync(
        path.resolve("../../governance-registry/.github/workflows/verify-policy.yml"),
        ".github/workflows/verify-policy.yml"
      );
    } catch {}

    try {
      const badge = `![Policy](https://img.shields.io/badge/policy-AIP_1.0.0%20%7C%20APR_1.0.0-blue)`;
      const readmePath = "README.md";
      const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
      if (readme && !readme.includes("![Policy]")) {
        fs.writeFileSync(readmePath, `${badge}\n\n${readme}`, "utf8");
      }
    } catch {}

    if (DRY) {
      process.chdir("../../");
      log(`[dry-run] ${repo}`);
      return;
    }

    exec(`git add .`);
    exec(`git commit -m "chore(policy): seed policy_ref + CI (AIP-1.0.0, APR-1.0.0) [registry:${regHash}]"`);
    exec(`git push -u origin ${branch}`);

    try {
      exec(
        `gh pr create --fill --label governance --title "Policy Genesis: seed policy_ref + CI" --body "Adds .aesynth/policy_ref.yaml and verify-policy.yml. Registry: ${regHash} — enforces reflection window + semver."`
      );
    } catch (e) {
      warn(`PR create failed for ${repo}: ${e.message}`);
    }

    process.chdir("../../");
    log(`✔ ${repo}`);
  } catch (e) {
    warn(`✖ ${repo}: ${e.message}`);
    try {
      process.chdir("../../");
    } catch {}
  }
}

function exec(cmd) {
  return execSync(cmd, { stdio: DRY ? "pipe" : "inherit", encoding: "utf8" });
}
function log(msg) {
  console.log(msg);
}
function warn(msg) {
  console.error(msg);
}

runQueue().then(() => log("Propagation complete."));
