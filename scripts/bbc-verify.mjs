#!/usr/bin/env node
/**
 * BBC verifier (CLI ? Wasm ? JS)
 * Inputs:
 *   - env BBC_JUR (e.g., 'BBC.v0.1.0.TW')
 *   - env PLAN_PATHS="reports/plans/*.json,extra/*.json" or CLI args
 * Outputs:
 *   - reports/bbc-<plan>.json (per plan)
 *   - reports/bbc-summary.json (rollup)
 *   - reports/bbc-history.jsonl (append-only)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const JUR = process.env.BBC_JUR || 'BBC.v0.1.0.TW';
const enginePref = process.env.BBC_ENGINE || 'auto'; // 'auto'|'cli'|'wasm'|'js'
const rulesPath = `codes/${JUR}/bbc.rules.yaml`;
const waiversPath = `policy/waivers.yaml`;
const severityMapPath = `policy/severity-map.json`;
const wasmPath = `policy/build/bbc.wasm`;
fs.mkdirSync('reports', { recursive: true });

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function safeRead(p, def){ try { return fs.readFileSync(p,'utf8'); } catch { return def; } }
function parseYAML(text){ const yaml = require('yaml'); return yaml.parse(text); }
function hist(list){ const h={}; for(const v of list) h[v.code]=(h[v.code]||0)+1; return h; }

function collectPlans() {
  const argv = process.argv.slice(2);
  const env = (process.env.PLAN_PATHS || '').split(',').filter(Boolean);
  const specs = [...argv, ...env];
  if (!specs.length) {
    const dir='reports/plans'; if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>path.join(dir,f));
  }
  const out=new Set();
  for (const s of specs) {
    if (s.endsWith('*.json')) {
      const d=path.dirname(s);
      if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) out.add(path.join(d,f));
    } else out.add(s);
  }
  return [...out];
}

function applyWaivers(violations, plan, waivers) {
  const now = Date.now();
  const remain=[], suppressed=[];
  for (const v of violations) {
    const hit=(waivers.items||[]).find(w =>
      w.violation_code===v.code &&
      (w.plan_id===plan.project_id || w.plan_id==='*') &&
      new Date(w.expires_utc).getTime()>now
    );
    if (hit) suppressed.push({...v, suppressed:true, waiver_id:hit.id});
    else remain.push(v);
  }
  return {remain, suppressed};
}

function evalCLI(plan, rules) {
  const res = spawnSync('opa',['eval','--format','json','--data','policy/bbc.rego','data.bbc.violation','--stdin-input'],
    {input: JSON.stringify({plan, rules}), encoding:'utf8'});
  if (res.status!==0) return {engine:'cli', ok:false, violations:[], error:res.stderr||res.stdout};
  const out = JSON.parse(res.stdout)?.result?.[0]?.expressions?.[0]?.value || [];
  return {engine:'cli', ok:true, violations:out};
}

async function evalWasm(plan, rules) {
  const wasm = fs.readFileSync(wasmPath);
  const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
  const policy = await loadPolicy(wasm);
  policy.setData({}); // we pass rules/plan via input only
  const res = policy.evaluate(JSON.stringify({ input: { plan, rules } }));
  const out = res?.[0]?.result || [];
  return {engine:'wasm', ok:true, violations:out};
}

function evalJS(plan, rules) {
  const tol = rules.meta?.tolerance_mm ?? 0;
  const v=[];
  // corridors
  const minC=(rules.egress?.corridor_min_clear_mm??0)-tol;
  (plan.corridors||[]).forEach((c,i)=>{ if (c.clear_width_mm<minC) v.push({code:'BBC-EGR-COR-001',msg:`Corridor ${c.clear_width_mm} < ${minC}`,path:`corridors[${i}].clear_width_mm`});});
  // travel distance
  (plan.travel_paths||[]).forEach((t,i)=>{ const max=plan.sprinklered?rules.egress.max_travel_distance_m_sprink:rules.egress.max_travel_distance_m_unsprink; if (t.distance_m>max) v.push({code:'BBC-EGR-TRV-001',msg:`Travel ${t.distance_m} > ${max}`,path:`travel_paths[${i}].distance_m`});});
  // exits
  if (plan.occupant_load!=null){ const div=rules.egress.exit_factor_ol_divisor, th=rules.occupancy.min_exits_if_ol_gt; const req=Math.max(Math.ceil(plan.occupant_load/div),(plan.occupant_load>th?2:1)); const got=plan.exits?.count ?? 1; if (req>got) v.push({code:'BBC-EGR-EXIT-001',msg:`Required exits ${req}, provided ${got}`,path:'exits.count'}); }
  // stairs
  (plan.stairs||[]).forEach((s,i)=>{ const rmax=rules.stairs.riser_max_mm,tmin=rules.stairs.tread_min_mm,vmax=rules.stairs.variation_max_mm; const rh=s.risers?.[0]?.height_mm??0, td=s.treads?.[0]?.depth_mm??0, vr=s.variation_riser_mm??0, vt=s.variation_tread_mm??0; if (rh>rmax+tol||td+tol<tmin||vr>vmax+tol||vt>vmax+tol) v.push({code:'BBC-STR-DIM-001',msg:'Stair dimensions out of bounds',path:`stairs[${i}]`}); const hdrMin=rules.stairs.headroom_min_mm-tol; const h=s.headroom_mm??0; if (h<hdrMin) v.push({code:'BBC-STR-HDR-001',msg:`Headroom ${h} < ${hdrMin}`,path:`stairs[${i}].headroom_mm`});});
  // handrails
  (plan.handrails||[]).forEach((h,i)=>{ const [hmin,hmax]=rules.handrails.height_mm_range,[dmin,dmax]=rules.handrails.grasp_diameter_mm_range; const reqc=rules.handrails.continuous_required; const ok=(h.height_mm>=hmin-tol&&h.height_mm<=hmax+tol&&(!reqc||h.continuous===true)&&h.grasp_diameter_mm>=dmin-tol&&h.grasp_diameter_mm<=dmax+tol); if(!ok) v.push({code:'BBC-HRL-001',msg:'Handrail nonconforming',path:`handrails[${i}]`});});
  // guards
  (plan.guards||[]).forEach((g,i)=>{ const hmin=rules.guards.height_min_mm, omax=rules.guards.opening_max_mm; if ((g.height_mm+tol)<hmin || g.opening_mm>omax+tol) v.push({code:'BBC-GRD-001',msg:'Guard nonconforming',path:`guards[${i}]`});});
  return {engine:'js', ok:true, violations:v};
}

(async function main(){
  const plans = collectPlans(); if (!plans.length){ console.error('No plans found'); process.exit(1); }
  const rules = parseYAML(fs.readFileSync(rulesPath,'utf8'));
  const waivers = parseYAML(safeRead(waiversPath,'items: []\n')) || {items:[]};
  const results=[]; let suppressedTotal=0;
  const hasCLI = spawnSync('opa',['version'], {encoding:'utf8'}).status===0;
  const hasWasm = fs.existsSync(wasmPath);

  async function runEngine(plan){
    if ((enginePref==='auto'&&hasCLI)||enginePref==='cli') return evalCLI(plan, rules);
    if ((enginePref==='auto'&&hasWasm)||enginePref==='wasm') return evalWasm(plan, rules);
    return evalJS(plan, rules);
  }

  let allPass=true;
  for (const p of plans){
    const plan = loadJSON(p);
    const res = await runEngine(plan);
    const {remain, suppressed} = applyWaivers(res.violations, plan, waivers);
    suppressedTotal += suppressed.length;
    const out = {
      plan: plan.project_id || path.basename(p),
      engine: res.engine,
      jurisdiction: JUR,
      status: remain.length? 'FAIL':'PASS',
      count: remain.length,
      violations: [...remain, ...suppressed],
      histogram: hist(remain)
    };
    fs.writeFileSync(`reports/bbc-${out.plan.replace(/[^a-z0-9_-]/gi,'_')}.json`, JSON.stringify(out,null,2));
    fs.appendFileSync('reports/bbc-history.jsonl', JSON.stringify({ts:new Date().toISOString(),plan:out.plan,status:out.status,count:out.count,engine:out.engine})+'\n');
    results.push(out); if (out.status!=='PASS') allPass=false;
  }

  const merged={}; for (const r of results) for (const [k,v] of Object.entries(r.histogram)) merged[k]=(merged[k]||0)+v;
  const summary={jurisdiction:JUR, plans:results.length, failing:results.filter(r=>r.status==='FAIL').length, suppressed:suppressedTotal, counts_by_code:merged};
  fs.writeFileSync('reports/bbc-summary.json', JSON.stringify(summary,null,2));
  console.log(`BBC: ${summary.plans} plan(s), failures=${summary.failing}, suppressed=${summary.suppressed}`);
  process.exit(allPass?0:2);
})().catch(e=>{ console.error(e); process.exit(1); });
