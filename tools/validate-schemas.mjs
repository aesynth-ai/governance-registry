import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaDir = "schemas";
const schemaIndex = new Map();

for (const file of fs.readdirSync(schemaDir)) {
  if (!file.endsWith(".schema.json")) continue;
  const fullPath = path.join(schemaDir, file);
  const schema = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const id = schema.$id || file;
  ajv.addSchema(schema, id);
  const name = path.basename(file, ".schema.json");
  schemaIndex.set(name, id);
}

addFormats(ajv);

function schemaId(name) {
  const id = schemaIndex.get(name);
  if (!id) throw new Error(`Schema not found for ${name}`);
  return id;
}

function validateDir(dir, schemaName) {
  const id = schemaId(schemaName);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    if (!ajv.validate(id, data)) {
      throw new Error(`${fullPath} invalid: ${ajv.errorsText(ajv.errors)}`);
    }
  }
}

function main() {
  const catalogId = schemaId("catalog");
  const sitemapId = schemaId("sitemap");
  const catalogData = JSON.parse(fs.readFileSync("index/catalog.json", "utf8"));
  if (!ajv.validate(catalogId, catalogData)) {
    throw new Error(`index/catalog.json invalid: ${ajv.errorsText(ajv.errors)}`);
  }
  const sitemapData = JSON.parse(fs.readFileSync("index/sitemap.json", "utf8"));
  if (!ajv.validate(sitemapId, sitemapData)) {
    throw new Error(`index/sitemap.json invalid: ${ajv.errorsText(ajv.errors)}`);
  }
  validateDir("resolutions", "resolution");
  validateDir("ledger", "ledger-event");
  validateDir("actors", "actor");
  validateDir("bodies", "body");
}

main();
