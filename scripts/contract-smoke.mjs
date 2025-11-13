#!/usr/bin/env node
/**
 * Enforces required Synthlex?BBC contract fields exist in plan artifacts.
 * Fails with pinpointed messages if missing.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'reports/plans';
const req = [
  ['project_id'],
  ['corridors'],
  ['travel_paths'],
  ['exits','count'],
];

function has(obj, pathArr){
  let cur=obj;
  for(const k of pathArr){
    if (cur==null || !(k in cur)) return false;
    cur = cur[k];
  }
  return true;
}

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.endsWith('.json')) : [];
if (!files.length) {
  console.error('No plan artifacts found at', dir);
  process.exit(1);
}

let ok = true;
for (const f of files){
  const p = path.join(dir,f);
  const plan = JSON.parse(fs.readFileSync(p,'utf8'));
  for (const pathArr of req){
    if (!has(plan, pathArr)){
      console.error(`[contract] ${f} missing ${pathArr.join('.')}`);
      ok = false;
    }
  }
  if (!Array.isArray(plan.corridors) || plan.corridors.length<1){
    console.error(`[contract] ${f} corridors must be non-empty array`);
    ok=false;
  }
  if (!Array.isArray(plan.travel_paths) || plan.travel_paths.length<1){
    console.error(`[contract] ${f} travel_paths must be non-empty array`);
    ok=false;
  }
}
process.exit(ok?0:2);