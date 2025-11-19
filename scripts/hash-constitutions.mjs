#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const reportsDir = path.join(repoRoot, "reports");
const outputPath = path.join(reportsDir, "constitution.hashes.txt");
const globPattern = process.env.CONSTITUTION_GLOB || "docs/constitutions";
const baseDir = path.join(repoRoot, globPattern);

mkdirSync(reportsDir, { recursive: true });

if (!existsSync(baseDir)) {
  console.warn(`Constitution directory ${globPattern} not found; skipping hash generation.`);
  writeFileSync(outputPath, "# no constitutions found\n");
  process.exit(0);
}

const files = listYamlFiles(baseDir);
if (files.length === 0) {
  console.warn("No constitution YAML files found; writing placeholder report.");
  writeFileSync(outputPath, "# no constitutions found\n");
  process.exit(0);
}

const lines = files.map((file) => {
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
  const hash = sha256(readFileSync(file));
  return `${hash}  ${rel}`;
});

writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(`Wrote constitution hashes for ${files.length} file(s) to ${path.relative(repoRoot, outputPath)}`);

function listYamlFiles(targetDir) {
  if (!existsSync(targetDir)) {
    return [];
  }
  const entries = readdirSync(targetDir);
  const results = [];
  for (const entry of entries) {
    const full = path.join(targetDir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      results.push(...listYamlFiles(full));
    } else if (stats.isFile() && entry.toLowerCase().match(/\.(ya?ml)$/)) {
      results.push(full);
    }
  }
  return results.sort();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}


