import fs from "fs";
import path from "path";
import crypto from "crypto";
import { appendLedgerEntry } from "../server/ledger-append.mjs";

const ROOT = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--domain" && args[i + 1]) {
      out.domain = args[i + 1];
      i += 1;
    } else if (arg === "--repo" && args[i + 1]) {
      out.repo = args[i + 1];
      i += 1;
    } else if (arg === "--summary" && args[i + 1]) {
      out.summary = args[i + 1];
      i += 1;
    }
  }
  return out;
}

function ensureReportsFile() {
  const reportsDir = path.join(ROOT, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const loopsPath = path.join(reportsDir, "semantic-loops.json");
  if (!fs.existsSync(loopsPath)) {
    fs.writeFileSync(loopsPath, "[]\n");
  }
  return loopsPath;
}

function loadLoops(loopsPath) {
  const raw = fs.readFileSync(loopsPath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function main() {
  const { domain, repo, summary } = parseArgs();
  if (!domain || !repo) {
    console.error("Usage: node scripts/semantic-loop-runner.mjs --domain <DOMAIN> --repo <REPO> [--summary <TEXT>]");
    process.exitCode = 1;
    return;
  }

  const id = `loop-${Date.now().toString(36)}`;
  const loopRecord = {
    id,
    domain,
    repo,
    summary: summary ?? `Semantic loop for ${domain} in ${repo}`,
    timestamp: new Date().toISOString(),
    status: "generated",
  };

  const loopsPath = ensureReportsFile();
  const existing = loadLoops(loopsPath);
  existing.push(loopRecord);
  fs.writeFileSync(loopsPath, `${JSON.stringify(existing, null, 2)}\n`);

  const actor =
    process.env.GIT_AUTHOR_NAME ||
    process.env.USER ||
    process.env.USERNAME ||
    "semantic-loop-runner";

  const envelope = {
    event: "semantic-loop",
    subject: loopRecord.id,
    actor,
    refs: [loopRecord],
    payload_hash: crypto.createHash("sha256").update(JSON.stringify(loopRecord)).digest("hex"),
  };

  const appendResult = appendLedgerEntry(envelope);
  console.log(
    `Semantic loop recorded as ledger entry #${appendResult.id} (urn=${appendResult.urn})`
  );
  console.log(`Loop record persisted to ${loopsPath}`);
}

main();
