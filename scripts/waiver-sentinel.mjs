#!/usr/bin/env node
import fs from 'node:fs';
import { parse } from 'yaml';

const FILE = process.env.WAIVER_FILE || 'policy/waivers.yaml';
const DAYS = Number(process.env.WAIVER_WINDOW_DAYS || '14');
const ENFORCE = String(process.env.WAIVER_ENFORCE || 'false').toLowerCase() === 'true';

const raw = fs.readFileSync(FILE, 'utf8');
const waivers = parse(raw) || { items: [] };
const now = Date.now();
const windowMs = DAYS * 24 * 60 * 60 * 1000;

const expiring = (waivers.items || [])
  .filter((item) => {
    const expiry = Date.parse(item.expires_utc || '');
    if (!Number.isFinite(expiry)) return false;
    return expiry > now && expiry - now <= windowMs;
  })
  .map((item) => {
    const expiry = Date.parse(item.expires_utc);
    return {
      id: item.id,
      plan_id: item.plan_id,
      violation_code: item.violation_code,
      expires_utc: item.expires_utc,
      days_left: Math.ceil((expiry - now) / 86_400_000),
    };
  });

fs.mkdirSync('reports', { recursive: true });
const report = { window_days: DAYS, count: expiring.length, items: expiring };
fs.writeFileSync('reports/waiver-expiring.json', JSON.stringify(report, null, 2));
console.log('Waivers expiring \u2264' + DAYS + 'd: ' + expiring.length);

if (ENFORCE && expiring.length > 0) {
  process.exit(3);
}




