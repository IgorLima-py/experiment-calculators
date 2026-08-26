/*
 * Compare assets/geo.js against reference_tool4.json.
 *
 * Usage: python reference_tool4.py && node check_tool4.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
load('stats.js');
load('geo.js');
const G = global.Geo;

const refPath = path.join(__dirname, 'reference_tool4.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool4.json missing - run: python reference_tool4.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

const TOL_POWER = 1e-9;
const TOL_CLOSED = 1e-9;   // closed form vs the same closed form in scipy
const TOL_ROUNDTRIP = 1e-7; // the shipped MDE must deliver the power it claims
const TOL_STATS = 1e-12;

let failed = 0;
let worstPower = 0, worstSm = 0, worstClosed = 0, worstRound = 0, worstClosedRound = 0;

console.log('');
console.log('### Power with markets as units');
console.log('');
console.log('| Markets | Held out | Variation | Pre-period ρ | Lift | Alpha | This tool | scipy nct | statsmodels |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|---:|');

const mdeRows = [];

for (const r of ref.cases) {
  const jsPower = G.power(r.total, r.holdout, r.cv, r.rho, r.lift, r.alpha);
  const jsClosed = G.mdeClosedForm(r.total, r.holdout, r.cv, r.rho, r.alpha, r.power);
  const jsMde = G.mde(r.total, r.holdout, r.cv, r.rho, r.alpha, r.power);

  const dPower = Math.abs(jsPower - r.scipy_power);
  const dSm = Math.abs(jsPower - r.statsmodels_power);
  const dClosed = Math.abs(jsClosed - r.scipy_mde) / r.scipy_mde;

  /* Both candidate effects are fed back through the exact power function. The
   * shipped one has to land on the requested power; the closed form is measured
   * to show what it costs, not to pass or fail. */
  const backExact = G.power(r.total, r.holdout, r.cv, r.rho, jsMde, r.alpha);
  const backClosed = G.power(r.total, r.holdout, r.cv, r.rho, jsClosed, r.alpha);
  const dRound = Math.abs(backExact - r.power);
  const dClosedRound = Math.abs(backClosed - r.power);

  if (dPower > worstPower) worstPower = dPower;
  if (dSm > worstSm) worstSm = dSm;
  if (dClosed > worstClosed) worstClosed = dClosed;
  if (dRound > worstRound) worstRound = dRound;
  if (dClosedRound > worstClosedRound) worstClosedRound = dClosedRound;

  if (!(dPower <= TOL_POWER)) { failed++; console.error(`FAIL power N=${r.total} h=${r.holdout}: ${jsPower} vs ${r.scipy_power}`); }
  if (!(dSm <= TOL_POWER)) { failed++; console.error(`FAIL power vs statsmodels N=${r.total} h=${r.holdout}: ${jsPower} vs ${r.statsmodels_power}`); }
  if (!(dClosed <= TOL_CLOSED)) { failed++; console.error(`FAIL closed-form mde N=${r.total} h=${r.holdout}: ${jsClosed} vs ${r.scipy_mde}`); }
  if (!(dRound <= TOL_ROUNDTRIP)) { failed++; console.error(`FAIL roundtrip N=${r.total} h=${r.holdout}: ${backExact} vs ${r.power}`); }

  console.log(
    `| ${r.total} | ${r.holdout} | ${(r.cv * 100).toFixed(0)}% | ${r.rho.toFixed(2)} | ` +
    `${(r.lift * 100).toFixed(0)}% | ${(r.alpha * 100).toFixed(0)}% | ` +
    `${jsPower.toFixed(5)} | ${r.scipy_power.toFixed(5)} | ${r.statsmodels_power.toFixed(5)} |`
  );

  mdeRows.push({ r, jsClosed, jsMde, backClosed, backExact });
}

console.log('');
console.log('### Detectable lift: the textbook closed form against an exact inversion');
console.log('');
console.log('| Markets | Held out | df | Target power | Closed form | Power it really gives | Exact inversion | Power it really gives |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const m of mdeRows) {
  const df = m.r.total - 2;
  console.log(
    `| ${m.r.total} | ${m.r.holdout} | ${df} | ${(m.r.power * 100).toFixed(0)}% | ` +
    `${(m.jsClosed * 100).toFixed(3)}% | ${(m.backClosed * 100).toFixed(2)}% | ` +
    `${(m.jsMde * 100).toFixed(3)}% | ${(m.backExact * 100).toFixed(2)}% |`
  );
}

/* ---- the paste-your-data helper ---- */

const p = ref.paste;
const text = p.values.map((v, i) => `Market ${i + 1}\t${v}\t${p.priors[i]}`).join('\n');
const parsed = G.parsePasted(text);

const statChecks = [
  ['count', parsed.n, p.values.length],
  ['mean', parsed.mean, p.mean],
  ['standard deviation', parsed.sd, p.sd],
  ['coefficient of variation', parsed.cv, p.cv],
  ['pre-period correlation', parsed.rho, p.rho]
];

console.log('');
console.log('### Descriptive statistics from pasted market data');
console.log('');
console.log('| Quantity | This tool | numpy | Difference |');
console.log('|---|---:|---:|---:|');
for (const [name, got, want] of statChecks) {
  const d = Math.abs(got - want) / (Math.abs(want) > 1e-12 ? Math.abs(want) : 1);
  if (!(d <= TOL_STATS)) { failed++; console.error(`FAIL ${name}: ${got} vs ${want}`); }
  const fmt = x => (Math.abs(x) >= 1000 ? x.toFixed(1) : x.toFixed(6));
  console.log(`| ${name} | ${fmt(got)} | ${fmt(want)} | ${d.toExponential(1)} |`);
}
console.log('');
console.log('Market names and a third column are parsed away; 25 lognormal markets with a correlated earlier period.');

console.log('');
console.log(`Worst absolute error vs scipy.stats.nct: ${worstPower.toExponential(1)} (tolerance ${TOL_POWER.toExponential(1)})`);
console.log(`Worst absolute error vs statsmodels TTestIndPower: ${worstSm.toExponential(1)}`);
console.log(`Worst relative error on the closed form vs scipy: ${worstClosed.toExponential(1)}`);
console.log(`Worst power error of the shipped (exact) detectable effect: ${worstRound.toExponential(1)}`);
console.log(`Worst power error of the textbook closed form: ${(worstClosedRound * 100).toFixed(2)} percentage points`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 4 agrees with scipy and statsmodels within tolerance.');
