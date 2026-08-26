/*
 * Compare assets/cuped.js against reference_tool5.json.
 *
 * Usage: python reference_tool5.py && node check_tool5.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
load('stats.js');
load('cuped.js');
const C = global.Cuped;

const refPath = path.join(__dirname, 'reference_tool5.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool5.json missing - run: python reference_tool5.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

const TOL_IMPL = 1e-12;

let failed = 0;
let worstCuped = 0, worstRatio = 0;

const rel = (got, want) =>
  Math.abs(got - want) / (Math.abs(want) > 1e-12 ? Math.abs(want) : 1);

/* ---- 1. Implementation: identical data, both languages ---- */

console.log('');
console.log('### CUPED adjustment on identical data');
console.log('');
console.log('| ρ | n | θ (this tool) | θ (numpy) | Variance removed (this tool) | Variance removed (numpy) | Worst error |');
console.log('|---:|---:|---:|---:|---:|---:|---:|');

for (const c of ref.cuped_cases) {
  const got = C.cupedAdjust(Float64Array.from(c.xs), Float64Array.from(c.ys));
  const errors = [
    rel(got.theta, c.theta),
    rel(got.varianceRaw, c.variance_raw),
    rel(got.varianceAdjusted, c.variance_adjusted),
    rel(got.empiricalReduction, c.empirical_reduction),
    rel(got.correlation, c.correlation)
  ];
  const worst = Math.max(...errors);
  if (worst > worstCuped) worstCuped = worst;
  if (!(worst <= TOL_IMPL)) { failed++; console.error(`FAIL cuped rho=${c.rho}: worst ${worst}`); }

  console.log(
    `| ${c.rho} | ${c.n} | ${got.theta.toFixed(6)} | ${c.theta.toFixed(6)} | ` +
    `${(got.empiricalReduction * 100).toFixed(3)}% | ${(c.empirical_reduction * 100).toFixed(3)}% | ` +
    `${worst.toExponential(1)} |`
  );
}

console.log('');
console.log('### Ratio-metric standard errors on identical data');
console.log('');
console.log('| User spread | Users | Naive (this tool) | Naive (numpy) | Delta (this tool) | Delta (numpy) | Worst error |');
console.log('|---:|---:|---:|---:|---:|---:|---:|');

for (const c of ref.ratio_cases) {
  const got = C.ratioStandardErrors(
    Float64Array.from(c.conversions), Float64Array.from(c.session_counts));
  const errors = [
    rel(got.ratio, c.ratio),
    rel(got.naiveSe, c.naive_se),
    rel(got.deltaSe, c.delta_se)
  ];
  const worst = Math.max(...errors);
  if (worst > worstRatio) worstRatio = worst;
  if (!(worst <= TOL_IMPL)) { failed++; console.error(`FAIL ratio spread=${c.spread}: worst ${worst}`); }

  console.log(
    `| ${c.spread} | ${c.users} | ${(got.naiveSe * 100).toFixed(4)} pp | ` +
    `${(c.naive_se * 100).toFixed(4)} pp | ${(got.deltaSe * 100).toFixed(4)} pp | ` +
    `${(c.delta_se * 100).toFixed(4)} pp | ${worst.toExponential(1)} |`
  );
}

/* ---- 2. Theory: do the formulas describe reality ---- */

console.log('');
console.log('### Does CUPED remove the variance it promises? (numpy, n = 200,000)');
console.log('');
console.log('| ρ | ρ² promised | Measured | θ expected | θ measured |');
console.log('|---:|---:|---:|---:|---:|');
let worstTheoryCuped = 0;
for (const t of ref.theory_cuped) {
  const d = Math.abs(t.measured_reduction - t.expected_reduction);
  if (d > worstTheoryCuped) worstTheoryCuped = d;
  console.log(
    `| ${t.rho} | ${(t.expected_reduction * 100).toFixed(2)}% | ` +
    `${(t.measured_reduction * 100).toFixed(2)}% | ${t.expected_theta.toFixed(4)} | ` +
    `${t.measured_theta.toFixed(4)} |`
  );
}

console.log('');
console.log('### Which standard error is the real one? (numpy, 800 users, 4,000 replications)');
console.log('');
console.log('| User spread | Naive | Delta method | Truth | Truth ± | Naive understates by |');
console.log('|---:|---:|---:|---:|---:|---:|');
let worstDeltaVsTruth = 0;
for (const t of ref.theory_ratio) {
  const deltaGap = Math.abs(t.delta_se - t.true_se) / t.true_se;
  if (deltaGap > worstDeltaVsTruth) worstDeltaVsTruth = deltaGap;
  console.log(
    `| ${t.spread} | ${(t.naive_se * 100).toFixed(4)} pp | ${(t.delta_se * 100).toFixed(4)} pp | ` +
    `${(t.true_se * 100).toFixed(4)} pp | ${(t.true_se_uncertainty * 100).toFixed(4)} pp | ` +
    `${(t.true_se / t.naive_se).toFixed(2)}× |`
  );
}

console.log('');
console.log(`Worst error, CUPED formula vs numpy on identical data: ${worstCuped.toExponential(1)} (tolerance ${TOL_IMPL.toExponential(1)})`);
console.log(`Worst error, ratio standard errors vs numpy on identical data: ${worstRatio.toExponential(1)}`);
console.log(`Worst gap, measured CUPED reduction vs rho^2: ${worstTheoryCuped.toExponential(1)}`);
console.log(`Worst gap, delta-method standard error vs simulated truth: ${(worstDeltaVsTruth * 100).toFixed(2)}%`);
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 5 agrees with numpy within tolerance.');
