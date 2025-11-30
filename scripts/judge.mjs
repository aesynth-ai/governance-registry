#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const MODE = (process.env.AESYNTH_MODE || 'canonical').toLowerCase();
const CANONICAL = MODE === 'canonical';
const REPORTS_ROOT = path.join('reports', 'federation');
const DOMAINS_FILE = path.join('governance', 'domains', 'domains.json');

const domainData = readDomains();
const grouped = groupDomains(domainData.domains || []);

if (grouped.size === 0) {
  console.log('Judge: no actionable domains found.');
  process.exit(0);
}

fs.mkdirSync(REPORTS_ROOT, { recursive: true });

for (const [domainName, info] of grouped.entries()) {
  try {
    const result = runDomain(domainName, info);
    recordSummary(domainName, info, result);
    if (result.status === 'FAIL' && CANONICAL) {
      console.error(`[Judge] ${domainName} failed in canonical mode.`);
      process.exit(1);
    }
  } catch (error) {
    const summary = {
      status: 'FAIL',
      message: error.message || String(error)
    };
    recordSummary(domainName, info, summary);
    console.error(`[Judge] ${domainName} fatal error:`, error.message || error);
    process.exit(1);
  }
}

function readDomains() {
  try {
    return JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8'));
  } catch (error) {
    console.error('[Judge] Unable to read governance/domains/domains.json');
    throw error;
  }
}

function groupDomains(entries) {
  const considered = new Set(['ACTIVE', 'EXPERIMENTAL', 'RESERVED']);
  const grouped = new Map();
  for (const entry of entries) {
    if (!considered.has(entry.status)) continue;
    const domainKey = (entry.domain || '').toUpperCase();
    if (!domainKey) continue;
    if (!grouped.has(domainKey)) {
      grouped.set(domainKey, { entries: [] });
    }
    grouped.get(domainKey).entries.push(entry);
  }
  return grouped;
}

function runDomain(domainName, info) {
  const normalized = domainName.toUpperCase();
  switch (normalized) {
    case 'BBC':
      return runCommand('BBC verifier', 'node', ['scripts/bbc-verify.mjs']);
    case 'CIV':
      return runCommand('CivSynth verifier', 'node', ['scripts/civsynth-verify.mjs']);
    case 'SYNTHLEX':
      return runSynthlexValidation(info);
    case 'SANDBOX':
      return {
        status: 'SKIP',
        message: 'Sandbox domain reserved; skipping verification.'
      };
    default:
      return {
        status: 'SKIP',
        message: `No verifier registered for domain ${domainName}.`
      };
  }
}

function runCommand(label, command, args) {
  console.log(`[Judge] Running ${label}...`);
  const child = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env
  });
  const success = child.status === 0;
  return {
    status: success ? 'PASS' : CANONICAL ? 'FAIL' : 'WARN',
    message: success ? `${label} completed.` : `${label} exited with code ${child.status}`
  };
}

function runSynthlexValidation(info) {
  const schemaPath = path.join('governance', 'schemas', 'synthlex', 'sx_plan.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const synthlexDir = fs.existsSync(path.join('reports', 'synthlex'))
    ? path.join('reports', 'synthlex')
    : path.join('reports', 'plans');
  const plansRoot = path.join('reports', 'plans');
  const filterByName = path.resolve(synthlexDir) === path.resolve(plansRoot);

  const files = collectSynthlexPlans(synthlexDir, filterByName);
  if (files.length === 0) {
    return {
      status: 'SKIP',
      message: 'No Synthlex plan artifacts found.'
    };
  }

  const failures = [];
  for (const filePath of files) {
    try {
      const plan = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const valid = validate(plan);
      if (!valid) {
        failures.push({
          file: filePath,
          errors: validate.errors?.map((err) => `${err.instancePath || '/'} ${err.message}`) || []
        });
      }
    } catch (error) {
      failures.push({ file: filePath, errors: [error.message] });
    }
  }

  if (failures.length > 0) {
    const status = CANONICAL ? 'FAIL' : 'WARN';
    const message = `${failures.length} Synthlex plan(s) failed schema validation.`;
    return { status, message, details: failures };
  }

  return {
    status: 'PASS',
    message: `Validated ${files.length} Synthlex plan(s) against sx_plan.schema.json.`
  };
}

function collectSynthlexPlans(dir, filterByName) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const plans = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    if (!entry.endsWith('.json')) continue;
    if (filterByName && !/synth|sx/i.test(entry)) continue;
    plans.push(filePath);
  }
  return plans;
}

function recordSummary(domainName, info, result) {
  const summary = {
    domain: domainName,
    codes: info.entries.map((entry) => entry.code),
    statuses: info.entries.map((entry) => entry.status),
    mode: MODE,
    timestamp: new Date().toISOString(),
    status: result.status,
    message: result.message
  };
  if (result.details) {
    summary.details = result.details;
  }

  const summaryPath = path.join(REPORTS_ROOT, `${domainName.toLowerCase()}-summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  const historyPath = path.join(REPORTS_ROOT, `${domainName.toLowerCase()}-history.jsonl`);
  fs.appendFileSync(historyPath, JSON.stringify(summary) + '\n');
}
