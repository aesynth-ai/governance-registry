import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();

function hashEntry(entry) {
  return crypto.createHash("sha256").update(JSON.stringify(entry)).digest("hex");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--manifest" && args[i + 1]) {
      out.manifest = args[i + 1];
      i += 1;
    } else if (arg === "--entries" && args[i + 1]) {
      out.entries = args[i + 1];
      i += 1;
    }
  }
  return out;
}

function pickLatestSnapshot() {
  const snapDir = path.join(ROOT, "ledger", "snapshots");
  if (!fs.existsSync(snapDir)) return null;
  const files = fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith(".json"))
    .map((name) => {
      const full = path.join(snapDir, name);
      return { name: full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.name ?? null;
}

function loadManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(raw);
}

function resolveEntryPath(item, entriesDir) {
  if (item.path) {
    const candidate = path.isAbsolute(item.path) ? item.path : path.join(ROOT, item.path);
    if (fs.existsSync(candidate)) return candidate;
  }
  const fallback = path.join(entriesDir, `${item.id}.json`);
  return fallback;
}

function main() {
  const { manifest: manifestArg, entries: entriesArg } = parseArgs();
  const manifestPath = manifestArg
    ? path.resolve(manifestArg)
    : pickLatestSnapshot() ?? (() => {
        throw new Error("No snapshot manifest found");
      })();

  const entriesDir = entriesArg
    ? path.resolve(entriesArg)
    : fs.existsSync(path.join(ROOT, "ledger", "entries"))
      ? path.join(ROOT, "ledger", "entries")
      : path.join(ROOT, "ledger");

  const manifest = loadManifest(manifestPath);
  const mismatches = [];

  manifest.items.forEach((item) => {
    const entryPath = resolveEntryPath(item, entriesDir);
    if (!fs.existsSync(entryPath)) {
      mismatches.push({ id: item.id, reason: "missing file", path: entryPath });
      return;
    }
    const entry = JSON.parse(fs.readFileSync(entryPath, "utf8"));
    const hash = hashEntry(entry);
    if (hash !== item.sha256) {
      mismatches.push({ id: item.id, reason: "hash mismatch", expected: item.sha256, actual: hash });
    }
  });

  if (mismatches.length) {
    console.error(`Snapshot verification failed for ${mismatches.length} item(s).`);
    console.error(JSON.stringify(mismatches, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(`Snapshot verified: ${manifestPath}`);
  console.log(`Entries directory: ${entriesDir}`);
}

main();
