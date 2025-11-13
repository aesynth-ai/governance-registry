import fs from "node:fs";
import path from "node:path";

const catalogPath = "index/catalog.json";
const sitemapPath = "index/sitemap.json";

function sortByKey(arr, keyExtractor) {
  return [...arr].sort((a, b) => {
    const aKey = keyExtractor(a);
    const bKey = keyExtractor(b);
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });
}

function loadEnvelope(doc) {
  const relPath =
    doc.provenance?.envelope ||
    path.join(path.dirname(doc.source.path), "provenance.json");
  const envelopePath = path.normalize(relPath);
  if (!fs.existsSync(envelopePath)) return null;
  return JSON.parse(fs.readFileSync(envelopePath, "utf8"));
}

function hydrateDocuments(documents) {
  for (const doc of documents) {
    const envelope = loadEnvelope(doc);
    if (!envelope) continue;
    doc.provenance.sha256 = envelope.sha256;
    doc.provenance.contentCanonicalization = envelope.canonicalization;
    doc.signatures = envelope.signatures ?? [];
  }
}

function titleForResolution(res) {
  return res.urn.split("/").pop().replace(/-/g, " ");
}

function titleForLedger(entry) {
  const id = entry.urn.split("evt-").pop();
  return `Event ${id} - ${entry.event}`;
}

function build() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  hydrateDocuments(catalog.documents);

  catalog.documents = sortByKey(
    catalog.documents,
    (d) => `${d.urn}@${d.version}`
  );
  catalog.resolutions = sortByKey(catalog.resolutions, (r) => r.urn);
  catalog.bodies = sortByKey(catalog.bodies, (b) => b.urn);
  catalog.actors = sortByKey(catalog.actors, (a) => a.urn);
  catalog.ledger = sortByKey(catalog.ledger, (l) => l.urn);

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const sitemap = {
    root: "/registry",
    sections: [
      {
        label: "Documents",
        items: catalog.documents.map((doc) => ({
          title: `${doc.title} v${doc.version}`,
          path: `/${doc.source.path}`
        }))
      },
      {
        label: "Bodies",
        items: catalog.bodies.map((body) => ({
          title: body.name,
          path: `/${body.record}`
        }))
      },
      {
        label: "Resolutions",
        items: catalog.resolutions.map((res) => ({
          title: titleForResolution(res),
          path: `/${res.record}`
        }))
      },
      {
        label: "Ledger",
        items: catalog.ledger.map((entry) => ({
          title: titleForLedger(entry),
          path: `/${entry.record}`
        }))
      }
    ]
  };

  fs.writeFileSync(sitemapPath, `${JSON.stringify(sitemap, null, 2)}\n`);
}

build();
