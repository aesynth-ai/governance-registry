import fs from "fs";
import path from "path";
import crypto from "crypto";
import { collectLedgerEntries } from "../server/ledger-append.mjs";

const ROOT = process.cwd();
const SNAPSHOT_DIR = path.join(ROOT, "ledger", "snapshots");

function parseJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function hashEntry(entry) {
  return crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex");
}

function main() {
  const entries = collectLedgerEntries().map(({ id, path: entryPath }) => {
    const entry = parseJson(entryPath);
    return {
      id,
      path: path.relative(ROOT, entryPath),
      sha256: hashEntry(entry),
      timestamp: entry.timestamp,
      subject: entry.subject,
      event: entry.event,
    };
  });

  const generated = new Date().toISOString();
  const manifest = {
    type: "CivicLedgerSnapshot",
    name: `ledger-snapshot-${generated}`,
    generated,
    total: entries.length,
    items: entries,
  };

  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  const safeName = manifest.name.replace(/[:]/g, "-");
  const target = path.join(SNAPSHOT_DIR, `${safeName}.json`);
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Snapshot written to ${target}`);
}

main();
