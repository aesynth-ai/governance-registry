#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const specs = process.argv.slice(2);
const files = specs.flatMap(expandGlob);
if (!files.length) {
  console.error('No BBC plan reports supplied');
  process.exit(1);
}

const sev = JSON.parse(fs.readFileSync('policy/severity-map.json', 'utf8'));
const ruleRegistry = new Map();
const results = [];

for (const file of files) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const planUri = typeof report.plan === 'string' ? report.plan : report.plan?.path || report.plan?.id || file;
  for (const violation of report.violations || []) {
    if (!ruleRegistry.has(violation.code)) {
      const meta = sev[violation.code] || {};
      ruleRegistry.set(violation.code, {
        id: violation.code,
        name: violation.code,
        helpUri: meta.helpUri,
        defaultConfiguration: { level: meta.level || 'warning' },
        shortDescription: { text: violation.code },
        fullDescription: { text: meta.description || violation.code }
      });
    }

    const suppressions = violation.suppressed
      ? [{ kind: 'inSource', justification: `Waiver ${violation.waiver_id || ''}` }]
      : undefined;

    results.push({
      ruleId: violation.code,
      level: sev[violation.code]?.level || 'warning',
      message: { text: `${violation.code}: ${violation.msg}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: planUri },
            region: violation.path ? { snippet: { text: violation.path } } : undefined
          }
        }
      ],
      suppressions
    });
  }
}

const sarif = {
  $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'Aesynth BBC',
          informationUri: 'https://github.com/aesynth-ai/governance-registry',
          rules: Array.from(ruleRegistry.values())
        }
      },
      results
    }
  ]
};

process.stdout.write(JSON.stringify(sarif, null, 2));

function expandGlob(pattern) {
  if (!pattern.includes('*')) {
    return fs.existsSync(pattern) ? [pattern] : [];
  }
  const dir = path.dirname(pattern) || '.';
  const base = path.basename(pattern);
  if (!fs.existsSync(dir)) return [];
  const regex = globToRegExp(base);
  return fs.readdirSync(dir)
    .filter((entry) => regex.test(entry))
    .map((entry) => path.join(dir, entry));
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
}