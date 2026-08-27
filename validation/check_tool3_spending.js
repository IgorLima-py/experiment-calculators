/*
 * Compare the Lan-DeMets alpha-spending boundaries in assets/sequential.js
 * against reference_tool3_spending.json.
 *
 * Three things are checked, in increasing order of what they prove:
 *   1. the boundaries agree with scipy's, solved by a different integrator;
 *   2. the error the browser's boundaries actually spend, measured by scipy,
 *      matches what the browser's own recursion thinks it spends;
 *   3. that figure matches the closed-form spending function the boundary was
 *      chosen to satisfy.
 *
 * Check 2 is the one that would catch a solver that is self-consistently wrong.
 *
 * Usage: python reference_tool3_spending.py && node check_tool3_spending.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
load('stats.js');
load('sequential.js');
const Seq = global.Sequential;

const refPath = path.join(__dirname, 'reference_tool3_spending.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool3_spending.json missing - run: ' +
                'python reference_tool3_spending.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/*
 * Tolerances. The browser bisects each boundary to 1e-5 in z and integrates on
 * a 200-point Simpson grid; scipy's Genz algorithm is quasi-Monte Carlo and
 * carries its own error. 3e-3 in z is well inside the third decimal the page
 * prints, and 5e-4 in a probability is an order of magnitude below the
 * hundredth of a percent it displays.
 */
const TOL_BOUND = 3e-3;
const TOL_ALPHA = 5e-4;

let failed = 0;
const fail = (what, got, want, tol) => {
  failed++;
  console.error(`FAIL ${what}: got ${got}, want ${want} (tolerance ${tol})`);
};

const SHAPES = {
  obf: Seq.spendOBrienFleming,
  pocock: Seq.spendPocock
};

const NAMES = { obf: "O'Brien-Fleming", pocock: 'Pocock' };

let worstBound = 0;
let worstVsScipy = 0;
let worstVsTarget = 0;

console.log('## Lan-DeMets alpha spending at unequal information fractions\n');
console.log('| Spending | Schedule | Looks | Worst z gap vs scipy | ' +
            'Worst spent-alpha gap vs scipy | Worst gap vs the spending function |');
console.log('|---|---|---:|---:|---:|---:|');

for (const c of ref.cases) {
  const spend = SHAPES[c.shape];
  const bounds = Seq.spendingBounds(c.fractions, c.alpha, spend);

  let caseBound = 0;
  let caseScipy = 0;
  let caseTarget = 0;

  for (let k = 0; k < c.fractions.length; k++) {
    const gap = Math.abs(bounds[k] - c.bounds[k]);
    caseBound = Math.max(caseBound, gap);
    if (!(gap <= TOL_BOUND)) {
      fail(`${c.shape} ${c.name} bound ${k + 1}`, bounds[k], c.bounds[k], TOL_BOUND);
    }

    /* What this boundary actually spends, by the browser's own recursion... */
    const spent = Seq.overallAlphaUneven(bounds.slice(0, k + 1),
                                         c.fractions.slice(0, k + 1));
    /* ...against scipy's integration of the same thing... */
    const vsScipy = Math.abs(spent - c.cumulative[k]);
    caseScipy = Math.max(caseScipy, vsScipy);
    if (!(vsScipy <= TOL_ALPHA)) {
      fail(`${c.shape} ${c.name} spent by look ${k + 1}`, spent,
           c.cumulative[k], TOL_ALPHA);
    }

    /* ...and against the promise the spending function made. */
    const vsTarget = Math.abs(spent - c.targets[k]);
    caseTarget = Math.max(caseTarget, vsTarget);
    if (!(vsTarget <= TOL_ALPHA)) {
      fail(`${c.shape} ${c.name} target by look ${k + 1}`, spent,
           c.targets[k], TOL_ALPHA);
    }
  }

  worstBound = Math.max(worstBound, caseBound);
  worstVsScipy = Math.max(worstVsScipy, caseScipy);
  worstVsTarget = Math.max(worstVsTarget, caseTarget);

  const pct = v => (v * 100).toFixed(4) + ' pp';
  console.log(`| ${NAMES[c.shape]} | ${c.name} | ${c.fractions.length} | ` +
              `${caseBound.toExponential(1)} | ${pct(caseScipy)} | ${pct(caseTarget)} |`);
}

console.log('\n### The boundaries themselves, at the schedule the page ships with\n');
console.log('| Spending | Look | Data seen | Critical z (browser) | Critical z (scipy) | Alpha spent by here |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const c of ref.cases.filter(x => x.name === 'page default')) {
  const bounds = Seq.spendingBounds(c.fractions, c.alpha, SHAPES[c.shape]);
  for (let k = 0; k < bounds.length; k++) {
    console.log(`| ${NAMES[c.shape]} | ${k + 1} | ${(c.fractions[k] * 100).toFixed(0)}% | ` +
                `${bounds[k].toFixed(4)} | ${c.bounds[k].toFixed(4)} | ` +
                `${(c.cumulative[k] * 100).toFixed(3)}% |`);
  }
}

console.log(`\nWorst disagreement on a critical value: ${worstBound.toExponential(1)}`);
console.log(`Worst disagreement on the error actually spent: ` +
            `${(worstVsScipy * 100).toFixed(5)} percentage points`);
console.log(`Worst gap between what is spent and what the spending function ` +
            `promises: ${(worstVsTarget * 100).toFixed(5)} percentage points`);

if (failed) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\nThe spending boundaries agree with scipy, and they spend the ' +
            'error they claim to.');
