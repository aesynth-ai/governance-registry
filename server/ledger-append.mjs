import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DEFAULT_ENTRY = {
  type: "LedgerEvent",
  event: "unspecified",
  subject: null,
  refs: [],
  actor: null,
  sha256: null,
  jws: null,
};

function resolveLedgerDir() {
  const entriesPath = path.join(ROOT, "ledger", "entries");
  if (fs.existsSync(entriesPath)) {
    return entriesPath;
  }
  return path.join(ROOT, "ledger");
}

function readLedgerFiles(ledgerDir) {
  return fs
    .readdirSync(ledgerDir, { withFileTypes: true })
    .filter((item) => item.isFile() && item.name.endsWith(".json"))
    .map((item) => item.name);
}

function nextLedgerId(filenames) {
  const numericIds = filenames
    .map((name) => name.replace(".json", ""))
    .map((id) => Number.parseInt(id, 10))
    .filter((n) => Number.isFinite(n));
  const currentMax = numericIds.length ? Math.max(...numericIds) : 0;
  return (currentMax + 1).toString().padStart(6, "0");
}

export function appendLedgerEntry(payload = {}, options = {}) {
  const ledgerDir = options.ledgerDir ?? resolveLedgerDir();
  if (!fs.existsSync(ledgerDir)) {
    fs.mkdirSync(ledgerDir, { recursive: true });
  }

  const filenames = readLedgerFiles(ledgerDir);
  const id = nextLedgerId(filenames);
  const urn = payload.urn ?? `aesynth:gov:ledger/evt-${id}`;

  if (!payload.event) {
    throw new Error("Missing required field: event");
  }
  if (!payload.subject) {
    throw new Error("Missing required field: subject");
  }

  const entry = {
    ...DEFAULT_ENTRY,
    ...payload,
    urn,
    refs: Array.isArray(payload.refs) ? payload.refs : DEFAULT_ENTRY.refs,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  const filePath = path.join(ledgerDir, `${id}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`);

  return { id, urn, entry, filePath };
}

export function collectLedgerEntries() {
  const ledgerDir = resolveLedgerDir();
  if (!fs.existsSync(ledgerDir)) {
    return [];
  }
  return readLedgerFiles(ledgerDir).map((name) => ({
    id: name.replace(".json", ""),
    path: path.join(ledgerDir, name),
  }));
}

export function resolveLedgerFile(id) {
  const ledgerDir = resolveLedgerDir();
  const safeId = id.replace(/\.json$/i, "").replace(/^evt-/, "");
  const candidate = path.join(ledgerDir, `${safeId}.json`);
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return null;
}

