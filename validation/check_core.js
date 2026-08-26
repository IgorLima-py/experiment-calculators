/*
 * Compare assets/stats.js against the scipy values in reference_core.json.
 *
 * Usage: python reference_core.py && node check_core.js
 *
 * Node is a test runner here and nothing more - the site itself ships as plain
 * HTML and JS with no dependencies and no build step.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'stats.js'), 'utf8');
const Stats = eval(src + ';Stats');

const refPath = path.join(__dirname, 'reference_core.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_core.json missing - run: python reference_core.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/*
 * Two error measures, because either one alone flatters the result. Absolute
 * error is what a probability is actually used for; relative error is the
 * honest measure in the tails, but only where the reference is large enough for
 * the ratio to mean anything - a 1e-9 relative miss on a probability of 1e-12
 * is noise, not an error worth a tolerance.
 */
const RELEVANT = 1e-6;

const suites = [
  {
    name: 'normalCdf',
    tolAbs: 1e-15, tolRel: 1e-10,
    rows: ref.scipy_norm_cdf,
    label: r => `x=${r[0]}`,
    call: r => Stats.normalCdf(r[0]),
    want: r => r[1]
  },
  {
    name: 'normalQuantile',
    tolAbs: 1e-9, tolRel: 1e-9,
    rows: ref.scipy_norm_ppf,
    label: r => `p=${r[0]}`,
    call: r => Stats.normalQuantile(r[0]),
    want: r => r[1]
  },
  {
    name: 'tCdf',
    tolAbs: 1e-12, tolRel: 1e-11,
    rows: ref.scipy_t_cdf,
    label: r => `t=${r[0]}, nu=${r[1]}`,
    call: r => Stats.tCdf(r[0], r[1]),
    want: r => r[2]
  },
  {
    name: 'tQuantile',
    tolAbs: 1e-9, tolRel: 1e-10,
    rows: ref.scipy_t_ppf,
    label: r => `p=${r[0]}, nu=${r[1]}`,
    call: r => Stats.tQuantile(r[0], r[1]),
    want: r => r[2]
  },
  {
    name: 'noncentralTCdf',
    tolAbs: 1e-11, tolRel: 1e-9,
    rows: ref.scipy_nct_cdf,
    label: r => `t=${r[0]}, nu=${r[1]}, delta=${r[2]}`,
    call: r => Stats.noncentralTCdf(r[0], r[1], r[2]),
    want: r => r[3]
  }
];

let failed = 0;
const summary = [];

for (const suite of suites) {
  let worstAbs = 0, worstRel = 0;
  let rowAbs = null, rowRel = null;
  for (const row of suite.rows) {
    const got = suite.call(row);
    const want = suite.want(row);
    if (!isFinite(got)) {
      worstAbs = Infinity;
      rowAbs = row;
      continue;
    }
    const abs = Math.abs(got - want);
    if (abs > worstAbs) {
      worstAbs = abs;
      rowAbs = row;
    }
    if (Math.abs(want) > RELEVANT) {
      const rel = abs / Math.abs(want);
      if (rel > worstRel) {
        worstRel = rel;
        rowRel = row;
      }
    }
  }
  const ok = worstAbs <= suite.tolAbs && worstRel <= suite.tolRel;
  if (!ok) failed++;
  summary.push({
    name: suite.name,
    n: suite.rows.length,
    worstAbs, worstRel, ok,
    tolAbs: suite.tolAbs, tolRel: suite.tolRel,
    whereAbs: rowAbs ? suite.label(rowAbs) : '-',
    whereRel: rowRel ? suite.label(rowRel) : '-'
  });
}

const fmt = e => (e === 0 ? '0' : e.toExponential(1));

console.log('');
console.log('| Routine | Cases | Worst abs err | Worst rel err (ref > 1e-6) | Tolerance abs / rel | Worst case | Status |');
console.log('|---|---:|---:|---:|---|---|---|');
for (const s of summary) {
  console.log(
    `| \`${s.name}\` | ${s.n} | ${fmt(s.worstAbs)} | ${fmt(s.worstRel)} | ` +
    `${fmt(s.tolAbs)} / ${fmt(s.tolRel)} | ${s.whereAbs} | ${s.ok ? 'PASS' : 'FAIL'} |`
  );
}
console.log('');

if (failed) {
  console.error(`${failed} suite(s) FAILED`);
  process.exit(1);
}
console.log('All primitives agree with scipy within tolerance.');
