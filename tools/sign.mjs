import fs from "node:fs";
import nacl from "tweetnacl";
import { canonicalizeMd } from "./canonicalize-md.mjs";
import { sha256Hex } from "./hash.mjs";

const [, , subjectPath, envelopePath, keyFile] = process.argv;

if (!subjectPath || !envelopePath || !keyFile) {
  console.error(
    "Usage: npm run sign -- <subject.md> <envelope.json> <key.json>"
  );
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(keyFile, "utf8"));
if (!key.secretKeyHex || !key.keyId) {
  console.error("Key file must provide keyId and secretKeyHex");
  process.exit(1);
}

const canonical = canonicalizeMd(subjectPath);
const digest = sha256Hex(Buffer.from(canonical, "utf8"));
const secretKey = Buffer.from(key.secretKeyHex, "hex");

const signature = nacl.sign.detached(Buffer.from(digest, "utf8"), secretKey);
const signatureEntry = {
  keyId: key.keyId,
  alg: "ed25519",
  jws: Buffer.from(signature).toString("base64url"),
  signedAt: new Date().toISOString()
};

let envelope = {
  subject: subjectPath,
  canonicalization: "md-normalized-v1",
  sha256: digest,
  signatures: []
};

if (fs.existsSync(envelopePath)) {
  envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
  envelope.subject = subjectPath;
  envelope.canonicalization = "md-normalized-v1";
  envelope.sha256 = digest;
  envelope.signatures = envelope.signatures ?? [];
  envelope.signatures = envelope.signatures.filter(
    (sig) => sig.keyId !== signatureEntry.keyId
  );
}

envelope.signatures.push(signatureEntry);
fs.writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
console.log("Wrote envelope:", envelopePath);
