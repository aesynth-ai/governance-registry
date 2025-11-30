import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("index/catalog.json", "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyDocuments() {
  for (const doc of catalog.documents) {
    assert(
      Array.isArray(doc.requiredBodies) && doc.requiredBodies.length > 0,
      `Document missing requiredBodies: ${doc.urn}@${doc.version}`
    );
    const status = doc.status;
    const allowed = ["draft", "proposed", "ratified", "superseded", "repealed"];
    assert(
      allowed.includes(status),
      `Invalid document status for ${doc.urn}: ${status}`
    );
    if (status === "superseded") {
      assert(
        doc.supersededBy,
        `Superseded document missing supersededBy: ${doc.urn}`
      );
    }
    if (status === "ratified") {
      assert(
        !doc.supersededBy,
        `Ratified document lists supersededBy: ${doc.urn}`
      );
    }
    assert(
      doc.provenance && doc.provenance.sha256,
      `Document missing provenance hash: ${doc.urn}`
    );
  }
}

function verifyResolutions() {
  for (const res of catalog.resolutions) {
    assert(
      Array.isArray(res.requiredBodies) && res.requiredBodies.length > 0,
      `Resolution missing requiredBodies: ${res.urn}`
    );
    assert(
      Number.isInteger(res.minHumanReviewMinutes) &&
        res.minHumanReviewMinutes >= 0,
      `Resolution missing latency gap: ${res.urn}`
    );
    assert(
      res.subjectRefs && res.subjectRefs.length > 0,
      `Resolution ${res.urn} missing subjectRefs`
    );
  }
}

function verifyLedger() {
  const pattern = /^aesynth:gov:ledger\/evt-(\d{6})$/;
  let last = -1;
  for (const entry of catalog.ledger) {
    const match = entry.urn.match(pattern);
    assert(match, `Ledger URN malformed: ${entry.urn}`);
    const current = Number.parseInt(match[1], 10);
    assert(current > last, `Ledger events out of order: ${entry.urn}`);
    last = current;
  }
}

function main() {
  verifyDocuments();
  verifyResolutions();
  verifyLedger();
  console.log("State OK");
}

main();
