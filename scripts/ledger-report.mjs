import fs from "fs";
import path from "path";
import { collectLedgerEntries } from "../server/ledger-append.mjs";

const ROOT = process.cwd();

function parseEntry(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function summarize(entries) {
  const byEvent = new Map();
  const bySubject = new Map();

  entries.forEach((entry) => {
    if (entry.event) {
      byEvent.set(entry.event, (byEvent.get(entry.event) ?? 0) + 1);
    }
    if (entry.subject) {
      bySubject.set(entry.subject, (bySubject.get(entry.subject) ?? 0) + 1);
    }
  });

  return {
    total: entries.length,
    events: Object.fromEntries(byEvent),
    subjects: Object.fromEntries(bySubject),
  };
}

function main() {
  const records = collectLedgerEntries()
    .map(({ id, path: entryPath }) => ({
      id,
      entry: parseEntry(entryPath),
    }))
    .sort((a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10));

  const stats = summarize(records.map((r) => r.entry));
  const report = { generated: new Date().toISOString(), ...stats };

  console.log(JSON.stringify(report, null, 2));

  const reportDir = path.join(ROOT, "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(path.join(reportDir, "ledger-report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

main();
