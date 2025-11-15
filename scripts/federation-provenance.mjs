#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MODE = (process.env.AESYNTH_MODE || 'canonical').toLowerCase();
const REPORT_DIR = path.join('reports', 'federation');
const DOMAINS_FILE = path.join('governance', 'domains', 'domains.json');
const SUMMARY_DIR = REPORT_DIR;

fs.mkdirSync(REPORT_DIR, { recursive: true });

const run = () => {
  const domains = readDomains();
  const records = domains.map(buildRecord);
  const provenance = {
    run_id: randomUUID(),
    timestamp: new Date().toISOString(),
    mode: MODE,
    domains: records
  };

  const provenancePath = path.join(REPORT_DIR, 'provenance.json');
  fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));

  const ledgerPath = path.join(REPORT_DIR, 'ledger.jsonl');
  fs.appendFileSync(ledgerPath, JSON.stringify(provenance) + '\n');

  console.log('[Federation] Wrote provenance to', provenancePath);
};

function readDomains() {
  try {
    const raw = fs.readFileSync(DOMAINS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.domains) ? parsed.domains : [];
  } catch (error) {
    console.error('[Federation] Unable to read governance/domains/domains.json');
    throw error;
  }
}

function buildRecord(entry) {
  const summaryRef = path.join(SUMMARY_DIR, `${entry.domain?.toLowerCase() || 'unknown'}-summary.json`);
  const summary = safeReadJSON(summaryRef);
  return {
    code: entry.code,
    domain: entry.domain,
    status: entry.status,
    summary_ref: summary ? summaryRef : null,
    summary_status: summary?.status,
    summary_message: summary?.message,
    summary_timestamp: summary?.timestamp,
    mode: summary?.mode || MODE
  };
}

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn('[Federation] Failed to read summary', filePath, error.message);
    return null;
  }
}

run();
