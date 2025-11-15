import fs from "node:fs";
import path from "node:path";
import { canonicalizeMdBuffer } from "./canonicalize-md.mjs";
import { sha256Hex } from "./hash.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listDocVersions() {
  const root = "docs";
  const docs = [];
  for (const slug of fs.readdirSync(root)) {
    const slugDir = path.join(root, slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;
    for (const version of fs.readdirSync(slugDir)) {
      const versionDir = path.join(slugDir, version);
      if (!fs.statSync(versionDir).isDirectory()) continue;
      const mdFile = fs
        .readdirSync(versionDir)
        .find((f) => f.toLowerCase().endsWith(".md"));
      if (!mdFile) continue;
      const mdPath = path.join(versionDir, mdFile);
      const provenancePath = path.join(versionDir, "provenance.json");
      if (!fs.existsSync(provenancePath)) {
        throw new Error(`Missing provenance for ${mdPath}`);
      }
      docs.push({
        slug,
        version,
        mdPath,
        provenancePath,
        urn: `aesynth:gov:doc/${slug}`,
        versionUrn: `aesynth:gov:doc/${slug}@${version}`
      });
    }
  }
  return docs;
}

function docSubjectToPath(subject) {
  const match = subject.match(/^aesynth:gov:doc\/([a-z0-9-]+)@(\d+\.\d+\.\d+)$/);
  if (!match) {
    throw new Error(`Unsupported document subject: ${subject}`);
  }
  const [, slug, version] = match;
  return {
    mdPath: path.join("docs", slug, version, `${slug}.md`),
    provenancePath: path.join("docs", slug, version, "provenance.json")
  };
}

function resolutionUrnToPath(urn) {
  const match = urn.match(/^aesynth:gov:res\/(.+)$/);
  if (!match) {
    throw new Error(`Unsupported resolution urn: ${urn}`);
  }
  return path.join("resolutions", `${match[1]}.json`);
}

function verifyDocuments(docEntries) {
  const digestByVersionUrn = {};
  for (const doc of docEntries) {
    const canonical = canonicalizeMdBuffer(doc.mdPath);
    const digest = sha256Hex(canonical);
    const provenance = readJson(doc.provenancePath);
    if (provenance.canonicalization !== "md-normalized-v1") {
      throw new Error(
        `Unexpected canonicalization for ${doc.provenancePath}: ${provenance.canonicalization}`
      );
    }
    if (digest !== provenance.sha256) {
      throw new Error(
        `Canonical hash mismatch for ${doc.mdPath}: expected ${provenance.sha256}, got ${digest}`
      );
    }
    digestByVersionUrn[doc.versionUrn] = digest;
  }
  return digestByVersionUrn;
}

function canonicalizeResolution(obj) {
  const cloned = JSON.parse(JSON.stringify(obj));
  if (cloned.provenance) {
    delete cloned.provenance.sha256;
  }
  return Buffer.from(JSON.stringify(cloned), "utf8");
}

function verifyResolutions() {
  const digestByUrn = {};
  for (const file of fs.readdirSync("resolutions")) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join("resolutions", file);
    const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const canonicalBuffer = canonicalizeResolution(json);
    const digest = sha256Hex(canonicalBuffer);
    if (!json.provenance || json.provenance.sha256 !== digest) {
      throw new Error(`Resolution hash mismatch: ${fullPath}`);
    }
    digestByUrn[json.urn] = digest;
  }
  return digestByUrn;
}

function verifyLedger(docDigests, resolutionDigests) {
  for (const file of fs.readdirSync("ledger")) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join("ledger", file);
    const entry = readJson(fullPath);
    if (!entry.sha256) continue;
    if (entry.event.startsWith("document.") || entry.event === "document.publish") {
      const { mdPath } = docSubjectToPath(entry.subject);
      const canonical = canonicalizeMdBuffer(mdPath);
      const digest = sha256Hex(canonical);
      if (digest !== entry.sha256) {
        throw new Error(
          `Ledger hash mismatch for ${entry.urn}: expected ${entry.sha256}, got ${digest}`
        );
      }
    } else if (entry.event.startsWith("resolution.")) {
      const resolutionPath = resolutionUrnToPath(entry.subject);
      const digest = resolutionDigests[entry.subject];
      if (!digest) {
        throw new Error(`Missing resolution digest for ${entry.subject}`);
      }
      if (digest !== entry.sha256) {
        throw new Error(
          `Ledger hash mismatch for ${entry.urn}: expected ${entry.sha256}, got ${digest}`
        );
      }
      if (!fs.existsSync(resolutionPath)) {
        throw new Error(`Missing resolution file ${resolutionPath}`);
      }
    }
  }
}

function verifyCatalog(docDigests, resolutionDigests) {
  const catalog = readJson("index/catalog.json");
  for (const doc of catalog.documents) {
    const versionUrn = `${doc.urn}@${doc.version}`;
    const digest = docDigests[versionUrn];
    if (!digest) {
      throw new Error(`Catalog document missing digest: ${versionUrn}`);
    }
    if (doc.provenance.sha256 !== digest) {
      throw new Error(
        `Catalog digest mismatch for ${versionUrn}: ${doc.provenance.sha256} !== ${digest}`
      );
    }
  }
  for (const res of catalog.resolutions) {
    const digest = resolutionDigests[res.urn];
    if (!digest) {
      throw new Error(`Catalog resolution missing digest: ${res.urn}`);
    }
  }
}

function main() {
  const docEntries = listDocVersions();
  const docDigests = verifyDocuments(docEntries);
  const resolutionDigests = verifyResolutions();
  verifyLedger(docDigests, resolutionDigests);
  verifyCatalog(docDigests, resolutionDigests);
  console.log("Hashes OK");
}

main();
