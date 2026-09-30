/*
 * Compare assets/geo-readout.js (tool 7, the geo test readout) and the pasted
 * data parser in assets/geo.js against the statsmodels OLS values in
 * reference_tool7.json.
 *
 * Usage: python reference_tool7.py && node check_tool7.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const load = f => (0, eval)(fs.readFileSync(path.join(root, 'assets', f), 'utf8'));
['stats.js', 'geo.js', 'geo-readout.js'].forEach(load);
const { Geo, GeoReadout } = global;

const refPath = path.join(__dirname, 'reference_tool7.json');
if (!fs.existsSync(refPath)) {
  console.error('reference_tool7.json missing - run: python reference_tool7.py');
  process.exit(2);
}
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/* Relative tolerance. The worst error measured on 2026-09-29 was 7.9e-12 (the
 * relative lift; 7.0e-12 on the coefficient), between two different routes
 * to the same least squares solution. TOL leaves two decades for another
 * platform's floating point. */
const TOL = 1e-9;

let failed = 0;
const worst = {};
function compare(name, js, py) {
  const err = py === 0 ? Math.abs(js - py) : Math.abs(js - py) / Math.abs(py);
  if (!(err <= TOL)) {
    failed++;
    console.error(`${name}: js ${js} vs statsmodels ${py} (relative error ${err})`);
  }
  worst[name] = Math.max(worst[name] || 0, err);
}
function fail(message) {
  failed++;
  console.error(message);
}

const toRows = d => d.groups.map((g, i) => ({
  group: g === 'test' ? 'treat' : 'control', pre: d.pre[i], post: d.post[i]
}));

/* ---- the regression, and the page's composition of it ---- */

const report = [];
for (const d of ref.datasets) {
  const rows = toRows(d);
  const fit = GeoReadout.ancova(rows, d.alpha);
  compare('Treatment coefficient', fit.b, d.b);
  compare('Standard error', fit.se, d.se);
  compare('t statistic', fit.t, d.t);
  compare('p-value', fit.p, d.p);
  compare('Interval', fit.ci.lo, d.ci[0]);
  compare('Interval', fit.ci.hi, d.ci[1]);
  if (fit.df !== d.df) fail(`${d.name}: ${fit.df} degrees of freedom, statsmodels has ${d.df}`);

  const a = GeoReadout.analyse({ rows, spend: d.spend, alpha: d.alpha, plannedRho: null });
  compare('Page: incremental revenue', a.incremental, d.incremental);
  compare('Page: incremental interval', a.ciIncremental.lo, d.incremental_ci[0]);
  compare('Page: incremental interval', a.ciIncremental.hi, d.incremental_ci[1]);
  compare('Page: iROAS', a.iroas, d.iroas);
  compare('Page: iROAS interval', a.ciIroas.lo, d.iroas_ci[0]);
  compare('Page: iROAS interval', a.ciIroas.hi, d.iroas_ci[1]);
  compare('Page: relative lift',
          a.relative, d.incremental / (d.treated_post - d.incremental));
  compare('Page: within-group pre-period correlation', a.rho, d.rho);
  compare('Page: pre-period variation', a.preCv, d.pre_cv);
  if (a.significant !== (d.p < d.alpha)) fail(`${d.name}: significance verdict differs`);
  if (a.nTreat !== d.n_treat || a.nControl !== d.n_control) {
    fail(`${d.name}: ${a.nTreat}/${a.nControl} markets, reference has ${d.n_treat}/${d.n_control}`);
  }
  report.push({ d, a });
}

/* No spend means no iROAS, not a division by zero. */
{
  const d = ref.datasets[0];
  const a = GeoReadout.analyse({ rows: toRows(d), spend: 0, alpha: d.alpha, plannedRho: null });
  if (a.iroas !== null || a.ciIroas !== null) fail('A spend of 0 still produced an iROAS');
}

/* The noise factor is the ratio of the standard errors the two correlations
 * imply: sqrt((1 - rho^2) / (1 - planned^2)). */
{
  const d = ref.datasets[0];
  const a = GeoReadout.analyse({ rows: toRows(d), spend: d.spend, alpha: d.alpha, plannedRho: 0.9999 });
  compare('Noise factor against the plan', a.noiseFactor,
          Math.sqrt((1 - d.rho * d.rho) / (1 - 0.9999 * 0.9999)));
}

/* ---- the parser ---- */

const ex = Geo.parseGroups(ref.example_text);
const exRef = toRows(ref.datasets[0]);
if (ex.errors.length) fail(`Example text: lines ${ex.errors.join(', ')} not read`);
if (ex.rows.length !== exRef.length) {
  fail(`Example text: ${ex.rows.length} markets read, ${exRef.length} written`);
} else {
  ex.rows.forEach((r, i) => {
    const w = exRef[i];
    if (r.group !== w.group || r.pre !== w.pre || r.post !== w.post) {
      fail(`Example text, market ${i + 1}: read ${JSON.stringify(r)}, wrote ${JSON.stringify(w)}`);
    }
  });
}

const parseCases = [
  { name: 'digits in the name are not data',
    text: 'Market 1  test  100  110\nMarket 2  control  200  205',
    rows: [['treat', 100, 110], ['control', 200, 205]], errors: [] },
  { name: 'tabs, CSV and a header row',
    text: 'market,group,pre,post\nNYC,treatment,482300,497100\nLA\tholdout\t356100\t359000',
    rows: [['treat', 482300, 497100], ['control', 356100, 359000]], errors: [] },
  { name: 'labels in any case, and the one-letter forms',
    text: 'a T 1 2\nb C 3 4\nc Holdout 5 6\nd TREATED 7 8',
    rows: [['treat', 1, 2], ['control', 3, 4], ['control', 5, 6], ['treat', 7, 8]], errors: [] },
  { name: 'a thousands comma is reported, not read',
    text: 'NYC test 471,900 482,300\nLA control 356100 359000',
    rows: [['control', 356100, 359000]], errors: [1] },
  { name: 'a digit is never a group',
    text: 'Market 1 100 110\nMarket 2 1 100 110',
    rows: [], errors: [1, 2] },
  { name: 'an unknown label is reported',
    text: 'NYC exposed 100 110',
    rows: [], errors: [1] },
];
for (const c of parseCases) {
  const got = Geo.parseGroups(c.text);
  const rows = got.rows.map(r => [r.group, r.pre, r.post]);
  if (JSON.stringify(rows) !== JSON.stringify(c.rows) ||
      JSON.stringify(got.errors) !== JSON.stringify(c.errors)) {
    fail(`Parser, ${c.name}: got ${JSON.stringify(rows)} errors ${JSON.stringify(got.errors)}`);
  }
}

/* ---- the page ships the reference example ---- */

const pagePath = path.join(root, 'tools', 'geo-readout.html');
const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
const area = /<textarea id="data"[^>]*>([\s\S]*?)<\/textarea>/.exec(html);
if (!area) {
  fail('tools/geo-readout.html has no <textarea id="data">');
} else if (area[1] !== ref.example_text) {
  fail('The example in tools/geo-readout.html is not the one reference_tool7.py wrote');
}
const spendDef = /spend:\s*\{\s*def:\s*([0-9.e+]+)/.exec(html);
if (!spendDef || Number(spendDef[1]) !== ref.datasets[0].spend) {
  fail(`The page's default spend is ${spendDef && spendDef[1]}, the example's is ${ref.datasets[0].spend}`);
}
const alphaDef = /alpha:\s*\{\s*def:\s*([0-9.]+)/.exec(html);
if (!alphaDef || Number(alphaDef[1]) / 100 !== ref.datasets[0].alpha) {
  fail(`The page's default alpha is ${alphaDef && alphaDef[1]}%, the example's is ${ref.datasets[0].alpha}`);
}

/* The honesty box quotes how far the weighted regression lands from this
 * page's estimate on these data sets, and that it stays inside the interval.
 * Held here so the prose moves when the references do. */
{
  const ratios = ref.datasets.map(d => d.wls_b / d.b - 1);
  const above = Math.round(Math.max(...ratios) * 100);
  const below = Math.round(-Math.min(...ratios) * 100);
  const prose = html.replace(/\s+/g, ' ');
  const claim = `from ${above}% above this one to ${below}% below it`;
  if (prose.indexOf(claim) === -1) fail(`The honesty box should say "${claim}"`);
  for (const d of ref.datasets) {
    if (!(d.wls_b >= d.ci[0] && d.wls_b <= d.ci[1])) {
      fail(`${d.name}: the weighted estimate ${d.wls_b} is outside the interval, and the page says it never is`);
    }
  }
}

/* ---- report, in the form validation/RESULTS.md quotes ---- */

const money = x => Math.round(x).toLocaleString('en-US');
const signed = x => (x < 0 ? '−' : '') + money(Math.abs(x));
const r2 = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);

console.log('');
console.log('| Data | Markets (treated / held out) | α | Effect per treated market | Standard error | p-value | Incremental revenue, interval | iROAS | iROAS interval | Pre-period ρ |');
console.log('|---|---|---:|---:|---:|---:|---|---:|---|---:|');
for (const { d, a } of report) {
  console.log(`| ${d.name} | ${d.n_treat} / ${d.n_control} | ${(d.alpha * 100).toFixed(0)}% | ` +
    `${signed(a.fit.b)} | ${money(a.fit.se)} | ${a.fit.p.toFixed(4)} | ` +
    `${signed(a.ciIncremental.lo)} to ${signed(a.ciIncremental.hi)} | ${r2(a.iroas)} | ` +
    `${r2(a.ciIroas.lo)} to ${r2(a.ciIroas.hi)} | ${a.rho.toFixed(4)} |`);
}
console.log('');
console.log('| Data | Classical SE (this page) | HC1 SE | WLS 1/pre: effect | WLS 1/pre: SE | Difference in means: SE | SE bought by the pre-period | 1/√(1−ρ²), what tool 4 predicts |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const { d } of report) {
  console.log(`| ${d.name} | ${money(d.se)} | ${money(d.hc1_se)} | ${signed(d.wls_b)} | ` +
    `${money(d.wls_se)} | ${money(d.diff_se)} | ${(d.diff_se / d.se).toFixed(1)}× | ` +
    `${(1 / Math.sqrt(1 - d.rho * d.rho)).toFixed(1)}× |`);
}
console.log('');
for (const k of Object.keys(worst)) {
  console.log(`Worst error, ${k}: ${worst[k].toExponential(1)} (tolerance ${TOL.toExponential(1)})`);
}
console.log('');

if (failed) {
  console.error(`${failed} comparison(s) FAILED`);
  process.exit(1);
}
console.log('Tool 7 agrees with statsmodels OLS within tolerance, and the page ships its example.');
