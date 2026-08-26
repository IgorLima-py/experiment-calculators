/*
 * Compare assets/experiments.js (tool 1) against the statsmodels values in
 * reference_tool1.json.
 *
 * Usage: python reference_tool1.py && node check_tool1.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const Stats = eval(fs.readFileSync(path.join(assets, 'stats.js'), 'utf8') + ';Stats');
global.Stats = Stats;
const Experiments = eval(
  fs.readFileSync(path.join(assets, 'experiments.js'), 'utf8') + ';Experiments');

const refPath = path.join(__dirname, 'reference_tool1.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool1.json missing - run: python reference_tool1.py');
  process.exit(2);
}
const rows = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/* Sample sizes are compared relatively: an absolute miss of 0.01 users means
 * nothing at n=30000 and everything at n=12. */
const TOL_N = 1e-10;
const TOL_POWER = 1e-9;

let failed = 0;
let worstN = 0, worstEm = 0, worstPower = 0;

const table = [];

for (const r of rows) {
  const jsN = Experiments.sampleSizePooled(r.p1, r.delta, r.alpha, r.power, r.tails);
  const errN = Math.abs(jsN - r.statsmodels_n) / r.statsmodels_n;
  if (errN > worstN) worstN = errN;
  if (!(errN <= TOL_N)) failed++;

  let errEm = null;
  if (r.evan_miller_n !== null) {
    const jsEm = Experiments.sampleSizeEvanMiller(r.p1, r.delta, r.alpha, r.power);
    errEm = Math.abs(jsEm - r.evan_miller_n) / r.evan_miller_n;
    if (errEm > worstEm) worstEm = errEm;
    if (!(errEm <= TOL_N)) failed++;
  }

  const jsPower = Experiments.powerPooled(r.p1, r.delta, r.statsmodels_n, r.alpha, r.tails);
  const errPower = Math.abs(jsPower - r.statsmodels_power_at_n);
  if (errPower > worstPower) worstPower = errPower;
  if (!(errPower <= TOL_POWER)) failed++;

  table.push({
    p1: r.p1, delta: r.delta, alpha: r.alpha, power: r.power, tails: r.tails,
    jsN, smN: r.statsmodels_n, em: r.evan_miller_n,
    gap: r.evan_miller_n ? (r.statsmodels_n / r.evan_miller_n - 1) * 100 : null
  });
}

const f1 = n => n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

console.log('');
console.log('| Baseline | Effect | Alpha | Power | Tails | This tool | statsmodels | Evan Miller | Gap |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const t of table) {
  console.log(
    `| ${(t.p1 * 100).toFixed(1)}% | ${(t.delta * 100).toFixed(2)} pp | ` +
    `${(t.alpha * 100).toFixed(0)}% | ${(t.power * 100).toFixed(0)}% | ${t.tails} | ` +
    `${f1(t.jsN)} | ${f1(t.smN)} | ${t.em === null ? '—' : f1(t.em)} | ` +
    `${t.gap === null ? '—' : (t.gap >= 0 ? '+' : '') + t.gap.toFixed(1) + '%'} |`
  );
}
console.log('');
console.log(`Worst relative error vs statsmodels: ${worstN.toExponential(1)} (tolerance ${TOL_N.toExponential(1)})`);
console.log(`Worst relative error vs the Evan Miller port: ${worstEm.toExponential(1)}`);
console.log(`Worst absolute error on round-tripped power: ${worstPower.toExponential(1)}`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 1 agrees with statsmodels within tolerance.');
