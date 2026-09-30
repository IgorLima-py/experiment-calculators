/*
 * Compare assets/readout.js (tool 6, the test readout) against the statsmodels,
 * scipy and numpy values in reference_tool6.json.
 *
 * Usage: python reference_tool6.py && node check_tool6.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
['stats.js', 'readout.js'].forEach(load);
const { Readout } = global;

const refPath = path.join(__dirname, 'reference_tool6.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool6.json missing - run: python reference_tool6.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/* Everything below is closed-form arithmetic on top of normalCdf and
 * normalQuantile. The worst error measured on 2026-09-29 was 2.0e-15
 * (relative, the exaggeration ratio); TOL leaves three decades for another
 * platform's Math.exp and Math.log. The Monte Carlo is held to four of its own
 * standard errors: the worst of 21 cases sat at 2.1. */
const TOL = 1e-12;
const MC_SIGMAS = 4;

let failed = 0;
const worst = {};
function compare(name, js, py, relative) {
  let err;
  if (py === 0 || !relative) err = Math.abs(js - py);
  else err = Math.abs(js - py) / Math.abs(py);
  if (!(err <= TOL)) {
    failed++;
    console.error(`${name}: js ${js} vs reference ${py} (error ${err})`);
  }
  worst[name] = Math.max(worst[name] || 0, err);
}

const pct = (x, d) => (x * 100).toFixed(d);
const interval = (lo, hi, d) => `${pct(lo, d)} to ${pct(hi, d)}`;

/* ---- readouts ---- */

const readoutRows = [];
for (const r of ref.readouts) {
  const srm = Readout.srm(r.na, r.nb, r.split);
  compare('SRM chi-square (relative)', srm.chi2, r.srm_chi2, true);
  compare('SRM p-value', srm.p, r.srm_p, false);

  const t = Readout.zTest(r.na, r.ca, r.nb, r.cb);
  compare('z statistic (relative)', t.z, r.z, true);
  compare('p-value', t.p, r.p, false);

  const nc = Readout.diffNewcombe(r.na, r.ca, r.nb, r.cb, r.alpha);
  compare('Newcombe interval', nc.lo, r.newcombe[0], false);
  compare('Newcombe interval', nc.hi, r.newcombe[1], false);

  const w = Readout.diffWald(r.na, r.ca, r.nb, r.cb, r.alpha);
  compare('Wald interval', w.lo, r.wald[0], false);
  compare('Wald interval', w.hi, r.wald[1], false);

  const rl = Readout.ratioLog(r.na, r.ca, r.nb, r.cb, r.alpha);
  if (r.ratio_log === null) {
    if (rl !== null) {
      failed++;
      console.error(`ratio interval: expected none for ${r.ca}/${r.na} vs ${r.cb}/${r.nb}`);
    }
  } else {
    compare('Relative-lift interval', rl.lo, r.ratio_log[0], false);
    compare('Relative-lift interval', rl.hi, r.ratio_log[1], false);
  }

  readoutRows.push({ r, srm, t, nc, rl });
}

/* ---- type M ---- */

const typeMRows = [];
let worstSigmas = 0;
for (const c of ref.type_m) {
  const rd = Readout.retrodesign(c.lambda, 1, c.alpha);
  compare('Power', rd.power, c.power, false);
  compare('Type S', rd.typeS, c.type_s, false);
  compare('Exaggeration vs the closed form in scipy (relative)',
          rd.exaggeration, c.exaggeration, true);
  const sigmas = Math.abs(rd.exaggeration - c.mc_exaggeration) / c.mc_se;
  if (sigmas > worstSigmas) worstSigmas = sigmas;
  if (!(sigmas <= MC_SIGMAS)) {
    failed++;
    console.error(`Monte Carlo: lambda ${c.lambda}, alpha ${c.alpha}: ` +
                  `${rd.exaggeration} vs ${c.mc_exaggeration} (${sigmas.toFixed(1)} SE)`);
  }
  typeMRows.push({ c, rd, sigmas });
}

/* Gelman & Carlin print these rounded, and their exaggeration comes from a
 * 10,000-draw simulation (retrodesign's default), so it can sit a rounding
 * step away: their 1.12 at 80% power is 1.1252 in closed form. The check is
 * one unit in the last digit they print. */
const publishedRows = [];
const within = (ours, printed, digits) =>
  Math.abs(ours - printed) <= Math.pow(10, -digits) + 1e-12;
for (const p of ref.published) {
  const rd = Readout.retrodesign(p.D, p.s, p.alpha);
  const ok = within(rd.exaggeration, p.exaggeration, p.digits) &&
    (p.power === undefined || within(rd.power, p.power, 2)) &&
    (p.type_s === undefined || within(rd.typeS, p.type_s, 2));
  if (!ok) {
    failed++;
    console.error(`Gelman & Carlin's D=${p.D}, s=${p.s}: got exaggeration ` +
                  `${rd.exaggeration}, power ${rd.power}, type S ${rd.typeS}`);
  }
  publishedRows.push({ p, rd, ok });
}

/* ---- report, in the form validation/RESULTS.md quotes ---- */

const n = x => x.toLocaleString('en-US');

console.log('');
console.log('| Control | Variant | Plan | α | SRM p | p-value | Difference, Newcombe (pp) | Difference, Wald (pp) | Relative lift, log (%) | Relative lift, log-adjusted (%) |');
console.log('|---|---|---:|---:|---:|---:|---|---|---|---|');
for (const { r } of readoutRows) {
  console.log(
    `| ${n(r.ca)} / ${n(r.na)} | ${n(r.cb)} / ${n(r.nb)} | ` +
    `${pct(r.split, 0)}/${pct(1 - r.split, 0)} | ${pct(r.alpha, 0)}% | ` +
    `${r.srm_p < 1e-4 ? r.srm_p.toExponential(1) : r.srm_p.toFixed(4)} | ` +
    `${r.p.toFixed(4)} | ${interval(r.newcombe[0], r.newcombe[1], 3)} | ` +
    `${interval(r.wald[0], r.wald[1], 3)} | ` +
    `${r.ratio_log ? interval(r.ratio_log[0], r.ratio_log[1], 1) : '—'} | ` +
    `${r.ratio_log_adjusted ? interval(r.ratio_log_adjusted[0], r.ratio_log_adjusted[1], 1) : '—'} |`);
}
console.log('');
console.log('| λ = D/s | α | Power | Type S | Exaggeration, this tool | Monte Carlo (10⁶ draws) | Distance, in MC standard errors |');
console.log('|---:|---:|---:|---:|---:|---:|---:|');
for (const { c, rd, sigmas } of typeMRows) {
  console.log(`| ${c.lambda} | ${pct(c.alpha, 0)}% | ${rd.power.toFixed(4)} | ` +
    `${rd.typeS.toFixed(4)} | ${rd.exaggeration.toFixed(4)} | ` +
    `${c.mc_exaggeration.toFixed(4)} | ${sigmas.toFixed(1)} |`);
}
console.log('');
console.log('| Gelman & Carlin (2014) | They print | This tool |');
console.log('|---|---|---|');
for (const { p, rd } of publishedRows) {
  const theirs = [`exaggeration ${p.exaggeration}`];
  const ours = [`exaggeration ${rd.exaggeration.toFixed(p.digits === 0 ? 1 : 3)}`];
  if (p.power !== undefined) {
    theirs.push(`power ${p.power}`, `type S ${p.type_s}`);
    ours.push(`power ${rd.power.toFixed(3)}`, `type S ${rd.typeS.toFixed(3)}`);
  }
  console.log(`| D = ${p.D}, s = ${p.s} | ${theirs.join(', ')} | ${ours.join(', ')} |`);
}
console.log('');
for (const k of Object.keys(worst)) {
  console.log(`Worst error, ${k}: ${worst[k].toExponential(1)} (tolerance ${TOL.toExponential(1)})`);
}
console.log(`Furthest from the Monte Carlo: ${worstSigmas.toFixed(1)} of its standard errors (tolerance ${MC_SIGMAS})`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 6 agrees with statsmodels, scipy and the Monte Carlo within tolerance.');
