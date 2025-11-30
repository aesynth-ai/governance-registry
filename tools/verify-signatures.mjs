import fs from "node:fs";
import path from "node:path";
import nacl from "tweetnacl";
import { canonicalizeMdBuffer } from "./canonicalize-md.mjs";
import { sha256Hex } from "./hash.mjs";

function loadActors() {
  const actorsDir = "actors";
  const actors = {};
  for (const file of fs.readdirSync(actorsDir)) {
    if (!file.endsWith(".json")) continue;
    const actor = JSON.parse(
      fs.readFileSync(path.join(actorsDir, file), "utf8")
    );
    if (!Array.isArray(actor.keys)) continue;
    for (const key of actor.keys) {
      if (!key.keyId || !key.publicKeyHex) continue;
      actors[key.keyId] = key;
    }
  }
  return actors;
}

function listProvenancePairs() {
  const pairs = [];
  for (const slug of fs.readdirSync("docs")) {
    const slugDir = path.join("docs", slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;
    for (const version of fs.readdirSync(slugDir)) {
      const versionDir = path.join(slugDir, version);
      if (!fs.statSync(versionDir).isDirectory()) continue;
      const mdFile = fs
        .readdirSync(versionDir)
        .find((f) => f.toLowerCase().endsWith(".md"));
      if (!mdFile) continue;
      const mdPath = path.join(versionDir, mdFile);
      const envelopePath = path.join(versionDir, "provenance.json");
      if (!fs.existsSync(envelopePath)) continue;
      pairs.push({ mdPath, envelopePath });
    }
  }
  return pairs;
}

function verifyEnvelope({ mdPath, envelopePath }, actors) {
  const envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
  const canonicalBuffer = canonicalizeMdBuffer(mdPath);
  const digest = sha256Hex(canonicalBuffer);
  if (digest !== envelope.sha256) {
    throw new Error(`Hash mismatch: ${mdPath}`);
  }
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length === 0) {
    throw new Error(`No signatures found for ${mdPath}`);
  }
  for (const signature of envelope.signatures) {
    const key = actors[signature.keyId];
    if (!key) {
      throw new Error(
        `Unknown keyId ${signature.keyId} referenced in ${envelopePath}`
      );
    }
    const ok = nacl.sign.detached.verify(
      Buffer.from(envelope.sha256, "utf8"),
      Buffer.from(signature.jws, "base64url"),
      Buffer.from(key.publicKeyHex, "hex")
    );
    if (!ok) {
      throw new Error(`Invalid signature for ${mdPath} by ${signature.keyId}`);
    }
  }
}

function main() {
  const actors = loadActors();
  if (Object.keys(actors).length === 0) {
    throw new Error("No actor keys found");
  }
  const pairs = listProvenancePairs();
  pairs.forEach((pair) => verifyEnvelope(pair, actors));
  console.log("Signatures OK");
}

main();
