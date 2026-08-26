/*
 * Compare assets/sequential.js against reference_tool3.json.
 *
 * Three independent routes have to agree:
 *   1. the Armitage-McPherson recursion in the browser code (this file),
 *   2. a multivariate-normal integration in scipy (reference_tool3.py),
 *   3. the values published in the literature since 1969.
 *
 * A fourth, Monte Carlo, is run here as a sanity check on the model itself.
 *
 * Usage: python reference_tool3.py && node check_tool3.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
load('stats.js');
load('sequential.js');
const Seq = global.Sequential;
const St = global.Stats;

const refPath = path.join(__dirname, 'reference_tool3.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool3.json missing - run: python reference_tool3.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

const TOL_MVN = 5e-4;        // recursion vs multivariate normal integration
const TOL_PUBLISHED = 1e-3;  // vs values printed to three decimals
const TOL_BOUND = 3e-3;      // critical values

let failed = 0;
const fail = (what, got, want, tol) => {
  failed++;
  console.error(`FAIL ${what}: got ${got}, want ${want} (tolerance ${tol})`);
};

/* ---- 1. Alpha inflation ---- */

console.log('');
console.log('### Type I error when testing at nominal 5% at every look');
console.log('');
console.log('| Looks | This tool (recursion) | scipy (multivariate normal) | Published | Monte Carlo (1M) |');
console.log('|---:|---:|---:|---:|---:|');

let worstMvn = 0, worstPub = 0;
const z95 = St.normalQuantile(0.975);

for (const r of ref.inflation) {
  const js = Seq.alphaInflation(r.looks, r.nominal_alpha);

  /* The multivariate route is only computed where Genz's algorithm is still
   * trustworthy; past that the published tables and Monte Carlo carry the
   * check. See the note in reference_tool3.py. */
  let mvnCell = '—';
  if (r.mvn !== null) {
    const dMvn = Math.abs(js - r.mvn);
    if (dMvn > worstMvn) worstMvn = dMvn;
    if (!(dMvn <= TOL_MVN)) fail(`inflation k=${r.looks} vs mvn`, js.toFixed(5), r.mvn.toFixed(5), TOL_MVN);
    mvnCell = r.mvn.toFixed(4);
  }

  let pubCell = '—';
  if (r.published !== null && r.published !== undefined) {
    const dPub = Math.abs(js - r.published);
    if (dPub > worstPub) worstPub = dPub;
    if (!(dPub <= TOL_PUBLISHED)) fail(`inflation k=${r.looks} vs published`, js.toFixed(4), r.published, TOL_PUBLISHED);
    pubCell = r.published.toFixed(3);
  }

  const reps = 1000000;
  const hits = Seq.simulateBatch(r.looks, z95, reps);
  const mc = hits / reps;
  const se2 = 2 * Math.sqrt(mc * (1 - mc) / reps);

  console.log(`| ${r.looks} | ${js.toFixed(4)} | ${mvnCell} | ${pubCell} | ${mc.toFixed(4)} ± ${se2.toFixed(4)} |`);
}

/* ---- 2. Pocock ---- */

console.log('');
console.log('### Pocock constant critical value (overall alpha 5%)');
console.log('');
console.log('| Looks | This tool | scipy | Published | Per-look alpha | Bonferroni would say |');
console.log('|---:|---:|---:|---:|---:|---:|');

let worstPocock = 0;
for (const r of ref.pocock) {
  const js = Seq.pocockBound(r.looks, r.target_alpha);
  const d = Math.abs(js - r.mvn);
  if (d > worstPocock) worstPocock = d;
  if (!(d <= TOL_BOUND)) fail(`pocock k=${r.looks}`, js.toFixed(4), r.mvn.toFixed(4), TOL_BOUND);
  const perLook = Seq.nominalAlphaFor(js);
  const pub = r.published === null || r.published === undefined ? '—' : r.published.toFixed(3);
  console.log(`| ${r.looks} | ${js.toFixed(3)} | ${r.mvn.toFixed(3)} | ${pub} | ${perLook.toFixed(4)} | ${(0.05 / r.looks).toFixed(4)} |`);
}

/* ---- 3. O'Brien-Fleming ---- */

console.log('');
console.log('### O\'Brien-Fleming boundaries (overall alpha 5%)');
console.log('');
console.log('| Looks | This tool | scipy | Published |');
console.log('|---:|---|---|---|');

let worstObf = 0;
for (const r of ref.obf) {
  const js = Seq.obrienFlemingBounds(r.looks, r.target_alpha);
  for (let i = 0; i < js.length; i++) {
    const d = Math.abs(js[i] - r.mvn[i]);
    if (d > worstObf) worstObf = d;
    if (!(d <= TOL_BOUND)) fail(`obf k=${r.looks}[${i}]`, js[i].toFixed(4), r.mvn[i].toFixed(4), TOL_BOUND);
  }
  const fmt = a => a.map(x => x.toFixed(3)).join(' / ');
  const pub = r.published ? fmt(r.published) : '—';
  console.log(`| ${r.looks} | ${fmt(js)} | ${fmt(r.mvn)} | ${pub} |`);
}

/* ---- 4. Other alpha levels ---- */

console.log('');
console.log('### Other significance levels');
console.log('');
console.log('| Looks | Nominal alpha | Inflated: this tool | Inflated: scipy | Pocock: this tool | Pocock: scipy |');
console.log('|---:|---:|---:|---:|---:|---:|');

for (const r of ref.other_alphas) {
  const jsInf = Seq.alphaInflation(r.looks, r.nominal_alpha);
  const jsPoc = Seq.pocockBound(r.looks, r.nominal_alpha);
  const dInf = Math.abs(jsInf - r.mvn_inflation);
  const dPoc = Math.abs(jsPoc - r.mvn_pocock);
  if (dInf > worstMvn) worstMvn = dInf;
  if (dPoc > worstPocock) worstPocock = dPoc;
  if (!(dInf <= TOL_MVN)) fail(`inflation k=${r.looks} a=${r.nominal_alpha}`, jsInf.toFixed(5), r.mvn_inflation.toFixed(5), TOL_MVN);
  if (!(dPoc <= TOL_BOUND)) fail(`pocock k=${r.looks} a=${r.nominal_alpha}`, jsPoc.toFixed(4), r.mvn_pocock.toFixed(4), TOL_BOUND);
  console.log(`| ${r.looks} | ${r.nominal_alpha} | ${jsInf.toFixed(4)} | ${r.mvn_inflation.toFixed(4)} | ${jsPoc.toFixed(3)} | ${r.mvn_pocock.toFixed(3)} |`);
}

console.log('');
console.log(`Worst gap, recursion vs multivariate normal: ${worstMvn.toExponential(1)} (tolerance ${TOL_MVN.toExponential(1)})`);
console.log(`Worst gap vs published inflation values: ${worstPub.toExponential(1)}`);
console.log(`Worst gap on Pocock constants: ${worstPocock.toExponential(1)}`);
console.log(`Worst gap on O'Brien-Fleming boundaries: ${worstObf.toExponential(1)}`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('All three routes agree.');
