#!/usr/bin/env node
import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('No BBC plan reports supplied');
  process.exit(1);
}

const severityMap = JSON.parse(fs.readFileSync('policy/severity-map.json', 'utf8'));
const ruleMap = new Map();
const results = [];

for (const file of files) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  const planUri = report.plan?.path || report.plan?.id || file;
  for (const violation of report.violations || []) {
    if (!ruleMap.has(violation.code)) {
      const meta = severityMap[violation.code] || {};
      ruleMap.set(violation.code, {
        id: violation.code,
        name: violation.code,
        shortDescription: { text: violation.code },
        fullDescription: { text: meta.description || violation.code },
        helpUri: meta.helpUri,
        defaultConfiguration: { level: meta.level || meta.severity || 'warning' }
      });
    }

    const suppressions = violation.suppressed
      ? [{ kind: 'inSource', justification: `Waiver ${violation.waiver_id || ''}` }]
      : undefined;

    results.push({
      ruleId: violation.code,
      level: severityMap[violation.code]?.level || severityMap[violation.code]?.severity || 'warning',
      message: { text: violation.msg || violation.code },
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
          rules: Array.from(ruleMap.values())
        }
      },
      results
    }
  ]
};

process.stdout.write(JSON.stringify(sarif, null, 2));
