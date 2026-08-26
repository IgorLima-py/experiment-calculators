/*
 * Compare assets/experiments.js (tool 2) against the values in
 * reference_tool2.json.
 *
 * Usage: python reference_tool2.py && node check_tool2.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const Stats = eval(fs.readFileSync(path.join(assets, 'stats.js'), 'utf8') + ';Stats');
global.Stats = Stats;
const Experiments = eval(
  fs.readFileSync(path.join(assets, 'experiments.js'), 'utf8') + ';Experiments');

const refPath = path.join(__dirname, 'reference_tool2.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool2.json missing - run: python reference_tool2.py');
  process.exit(2);
}
const rows = JSON.parse(fs.readFileSync(refPath, 'utf8'));

const TOL_MDE = 1e-9;      // relative, against the inverted statsmodels value
const TOL_ROUNDTRIP = 1e-9; // relative, n -> MDE -> n within this suite

let failed = 0;
let worstMde = 0, worstRound = 0, worstCohen = 0;
const table = [];

for (const r of rows) {
  const jsMde = Experiments.mdeFromSampleSize(r.p1, r.n, r.alpha, r.power, r.tails);

  const errMde = Math.abs(jsMde - r.statsmodels_mde) / r.statsmodels_mde;
  if (errMde > worstMde) worstMde = errMde;
  if (!(errMde <= TOL_MDE)) failed++;

  /* Feed our own MDE back into our own sample-size formula: the pair has to be
   * self-consistent, not just each correct against an outside reference. */
  const backN = Experiments.sampleSizePooled(r.p1, jsMde, r.alpha, r.power, r.tails);
  const errRound = Math.abs(backN - r.n) / r.n;
  if (errRound > worstRound) worstRound = errRound;
  if (!(errRound <= TOL_ROUNDTRIP)) failed++;

  const cohenGap = (r.cohen_h_mde / r.statsmodels_mde - 1) * 100;
  if (Math.abs(cohenGap) > worstCohen) worstCohen = Math.abs(cohenGap);

  table.push({
    p1: r.p1, n: r.n, alpha: r.alpha, power: r.power, tails: r.tails,
    jsMde, smMde: r.statsmodels_mde, cohen: r.cohen_h_mde, cohenGap, backN
  });
}

const pp = x => (x * 100).toFixed(4);
const f1 = n => n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

console.log('');
console.log('| Baseline | n per variant | Alpha | Power | Tails | This tool (pp) | statsmodels inverted (pp) | Cohen\'s h (pp) | Cohen gap |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const t of table) {
  console.log(
    `| ${(t.p1 * 100).toFixed(1)}% | ${f1(t.n)} | ${(t.alpha * 100).toFixed(0)}% | ` +
    `${(t.power * 100).toFixed(0)}% | ${t.tails} | ${pp(t.jsMde)} | ${pp(t.smMde)} | ` +
    `${pp(t.cohen)} | ${(t.cohenGap >= 0 ? '+' : '') + t.cohenGap.toFixed(2)}% |`
  );
}
console.log('');
console.log(`Worst relative error vs inverted statsmodels: ${worstMde.toExponential(1)} (tolerance ${TOL_MDE.toExponential(1)})`);
console.log(`Worst relative error on the n -> MDE -> n round trip: ${worstRound.toExponential(1)}`);
console.log(`Largest disagreement with the Cohen's h route: ${worstCohen.toFixed(2)}%`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 2 agrees with statsmodels within tolerance.');
