/*
 * Run the judgement sentences in assets/judgement.js against a table of cases.
 *
 * The sentence under each result is what this site is for, and it has been
 * wrong once already: the sample size page quoted "14%" for the cost of
 * peeking at every significance level, when that is only true at 5%. That
 * shipped because prose had no test. This is the test.
 *
 * Three kinds of case:
 *   - pinned: the sentence each tool shows at its defaults, word for word, so
 *     a change to the wording has to be made here too, on purpose;
 *   - has / lacks: figures and phrases a given input must or must not
 *     produce, one case per branch of every sentence;
 *   - agreement: where a sentence quotes a figure another tool on this site
 *     also shows, it must be the same figure.
 *
 * Inputs go through the same modules the pages use (Experiments, Geo, Cuped,
 * Sequential), so a case is written in the units a visitor types.
 *
 * No reference JSON: the expected values are the sentences themselves.
 *
 * Usage: node check_judgement.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const assets = path.join(__dirname, '..', 'assets');
const load = f => (0, eval)(fs.readFileSync(path.join(assets, f), 'utf8'));
['stats.js', 'sequential.js', 'experiments.js', 'geo.js', 'cuped.js', 'ui.js',
 'judgement.js'].forEach(load);
const { Experiments, Geo, Cuped, Sequential, UI, Judgement } = global;

/* ---- the pages' own arithmetic, in the units the inputs are typed in ---- */

/* tools/sample-size.html: baseline %, relative lift %, visitors a day. */
function sampleSize(o) {
  const q = Object.assign({ base: 5, mde: 10, traffic: 2000, power: 80,
                            alpha: 5, tails: 2 }, o);
  const p1 = q.base / 100;
  const delta = Experiments.absoluteEffect(p1, q.mde / 100, true);
  const n = Experiments.sampleSizePooled(p1, delta, q.alpha / 100,
                                         q.power / 100, q.tails);
  const days = Experiments.durationDays(n, q.traffic);
  return Judgement.sampleSize(days, q.alpha);
}

/* tools/mde.html */
function mde(o) {
  const q = Object.assign({ traffic: 2000, days: 14, base: 5, power: 80,
                            alpha: 5, tails: 2 }, o);
  const p1 = q.base / 100;
  const n = q.traffic * q.days / 2;
  const delta = Experiments.mdeFromSampleSize(p1, n, q.alpha / 100,
                                              q.power / 100, q.tails);
  return Judgement.mde(q.days, delta / p1 * 100);
}

/* tools/peeking.html */
function peeking(o) {
  const q = Object.assign({ looks: 5, alpha: 5 }, o);
  const real = Sequential.alphaInflation(q.looks, q.alpha / 100);
  return Judgement.peeking(q.looks, q.alpha, real);
}

/* tools/geo-holdout.html */
function geo(o) {
  const q = Object.assign({ geos: 40, holdout: 10, cv: 10, rho: 0, lift: 10,
                            alpha: 10, power: 80 }, o);
  const cv = q.cv / 100, alpha = q.alpha / 100, target = q.power / 100;
  return Judgement.geoHoldout({
    holdout: q.holdout,
    geos: q.geos,
    mde: Geo.mde(q.geos, q.holdout, cv, q.rho, alpha, target),
    power: Geo.power(q.geos, q.holdout, cv, q.rho, q.lift / 100, alpha),
    smallest: Geo.smallestHoldout(q.geos, cv, q.rho, q.lift / 100, alpha, target),
    liftPercent: q.lift,
    powerPercent: q.power
  });
}

/* tools/cuped.html, the ratio-metric section: the same seeded simulation the
 * page runs in its worker, about 80 ms here. */
const USERS = 1200;
function ratio(o) {
  const q = Object.assign({ spread: 1, sessions: 6 }, o);
  const result = Cuped.ratioMetricComparison({
    users: USERS, spread: q.spread, meanSessions: q.sessions,
    baseRate: 0.12, reps: 300, seed: 20260826
  });
  return Judgement.ratioMetric(q.spread, result, USERS);
}

/* Tool 1 quotes the peeking checker's headline; they must print the same. */
const inflation = (looks, alphaPercent) =>
  UI.percent(Sequential.alphaInflation(looks, alphaPercent / 100) * 100, 1);

/* ---- pinned: what each tool says at its defaults, as captured from the
 * pages on 2026-09-29 before the sentences moved out of the HTML ---- */

const PINNED = {
  sampleSize:
    '<strong>What would make this number a lie.</strong>It assumes you look ' +
    'at the result once, after day 32. Check it five times along the way and ' +
    'stop the moment one of those looks is significant, and the 5.0% ' +
    'false-positive rate you think you have is really 14.2%. The test did not ' +
    'get more sensitive; you just gave yourself five chances to catch it at a ' +
    'lucky moment. <a href="peeking.html">See exactly what peeking cost you ' +
    '→</a>',
  mde:
    '<strong>Read this before you run it.</strong>In 14 days you can only ' +
    'detect a lift of 15.1% or larger. That is within reach of a substantial ' +
    'change, though still well above what most single tweaks deliver. If the ' +
    'effect you realistically expect is smaller than this, do not run the ' +
    'test: you will get an inconclusive result and file it as a failure, when ' +
    'what you ran was a test too small to see the answer. Find more traffic, ' +
    'run longer, or test something bolder.',
  peeking:
    '<strong>You looked 5 times.</strong>Your real chance of calling a dead ' +
    'change a winner is 14.2%, not 5.0%. You are 2.8× more likely to have been ' +
    'fooled than you believed. The test did not get less reliable because the ' +
    'data changed; it got less reliable because you gave yourself 5 chances to ' +
    'catch it at a lucky moment. This assumes your looks were evenly spaced ' +
    'and that you would have stopped at the first significant result.',
  geo:
    '<strong>What would make this number a lie.</strong>Holding out 10 of 40 ' +
    'markets, the smallest lift you could detect is 9.2%. That is enough to ' +
    'see the 10.0% lift you are expecting, at 85% power. All of it assumes ' +
    'your markets do not leak into each other and that nothing but your ' +
    'campaign changed between the groups. IP-based geo targeting is commonly ' +
    'cited as only 55–80% accurate, and every bit of leakage pushes the ' +
    'measured effect toward zero. A real win can still come back looking like ' +
    'nothing. Treat this as the design-stage estimate and run GeoLift on your ' +
    'own history before the budget moves.',
  ratio:
    '<strong>The naive standard error is understating the noise by ' +
    '1.3×.</strong>Every confidence interval you build from it is that much ' +
    'too narrow, and every p-value that much too small. Nothing about the data ' +
    'looks wrong: you simply counted 7,200 independent observations when you ' +
    'had 1,200. The delta method lands on 0.558 pp against a true 0.555 pp. ' +
    'Drag the sessions slider: the more sessions each user brings, the less ' +
    'the naive count of them has to do with how much information you have.'
};

/* ---- the table ---- */

const CASES = [
  // Tool 1: the figure that shipped wrong. At 1% and 10% the same five looks
  // cost 3.3% and 26.0%, not the 14.2% that is only true at 5%.
  { tool: 1, name: 'defaults, pinned', html: sampleSize({}), exact: PINNED.sampleSize },
  { tool: 1, name: 'alpha 1%: five looks cost 3.3%', html: sampleSize({ alpha: 1 }),
    has: ['the 1.0% false-positive rate', 'is really 3.3%', 'five times',
          'href="peeking.html?alpha=1"'],
    lacks: ['14.2%', '14%'] },
  { tool: 1, name: 'alpha 10%: five looks cost 26.0%', html: sampleSize({ alpha: 10 }),
    has: ['the 10.0% false-positive rate', 'is really 26.0%',
          'href="peeking.html?alpha=10"'],
    lacks: ['14.2%'] },
  { tool: 1, name: 'agrees with the peeking checker at 1%, 5% and 10%',
    html: [1, 5, 10].map(a => sampleSize({ alpha: a })).join('\n'),
    has: [1, 5, 10].map(a => 'is really ' + inflation(5, a) + '.') },
  { tool: 1, name: 'a one-day run is described as two looks, not five',
    html: sampleSize({ traffic: 1000000 }),
    has: ['after day 1.', 'Check it twice', 'two chances',
          'href="peeking.html?looks=2"', 'is really ' + inflation(2, 5) + '.'],
    lacks: ['five'] },
  { tool: 1, name: 'a three-day run is three looks',
    html: sampleSize({ traffic: 22000 }),
    has: ['after day 3.', 'three times', 'three chances',
          'href="peeking.html?looks=3"', 'is really ' + inflation(3, 5) + '.'] },

  // Tool 2: three verdicts, split at 20% and 100% relative lift.
  { tool: 2, name: 'defaults, pinned', html: mde({}), exact: PINNED.mde },
  { tool: 2, name: 'under 20%: within reach', html: mde({ traffic: 200000 }),
    has: ['a lift of 1.5% or larger', 'within reach of a substantial change'],
    lacks: ['big effect', 'formality'] },
  { tool: 2, name: '20% to 100%: a big effect to demand', html: mde({ traffic: 100 }),
    has: ['a lift of 75.8% or larger', 'a big effect to demand',
          'a conversion rate by 76%.'],
    lacks: ['within reach', 'formality'] },
  { tool: 2, name: '100% and over: a formality', html: mde({ traffic: 10 }),
    has: ['a lift of 314.4% or larger', 'not a test, it is a formality',
          'convert 4.1× the control rate'],
    lacks: ['within reach', 'big effect'] },
  { tool: 2, name: 'boundary: exactly 20% is a big effect',
    html: Judgement.mde(14, 20), has: ['a big effect to demand', 'by 20%.'] },
  { tool: 2, name: 'boundary: just under 20% is within reach',
    html: Judgement.mde(14, 19.99), has: ['within reach'] },
  { tool: 2, name: 'boundary: exactly 100% is a formality',
    html: Judgement.mde(14, 100), has: ['a formality', 'convert 2.0×'] },

  // Tool 3.
  { tool: 3, name: 'defaults, pinned', html: peeking({}), exact: PINNED.peeking },
  { tool: 3, name: 'one look is not peeking', html: peeking({ looks: 1 }),
    has: ['One look is not peeking', 'the 5.0% level', 'nothing is inflated'],
    lacks: ['You looked', '×'] },
  { tool: 3, name: 'ten looks at 1%', html: peeking({ looks: 10, alpha: 1 }),
    has: ['You looked 10 times', 'is 4.7%, not 1.0%', '4.7× more likely',
          '10 chances'] },

  // Tool 4: enough power, not enough but a bigger holdout gets there, and no
  // holdout gets there at all.
  { tool: 4, name: 'defaults, pinned', html: geo({}), exact: PINNED.geo },
  { tool: 4, name: 'enough power', html: geo({ holdout: 20 }),
    has: ['Holding out 20 of 40', 'detect is 8.0%', 'enough to see the 10.0% lift',
          'at 93% power.', '55–80%'],
    lacks: ['not enough', 'No holdout size'] },
  { tool: 4, name: 'not enough, but a bigger holdout is', html: geo({ holdout: 3 }),
    has: ['Holding out 3 of 40', 'not enough to see the 10.0% lift',
          'you would have 50% power, not 80%', 'Holding out 9 markets instead'],
    lacks: ['No holdout size'] },
  { tool: 4, name: 'no holdout gets there', html: geo({ geos: 10, holdout: 3, cv: 100 }),
    has: ['Holding out 3 of 10', 'detect is 188.2%',
          'No holdout size reaches 80% power for a 10.0% lift'],
    lacks: ['enough to see', 'instead would get you there'] },

  // Tool 5, the ratio-metric demonstration: the delta-method branch, and the
  // no-heterogeneity branch below a spread of 0.05.
  { tool: 5, name: 'defaults, pinned', html: ratio({}), exact: PINNED.ratio },
  { tool: 5, name: 'twelve sessions a user', html: ratio({ sessions: 12 }),
    has: ['understating the noise by', 'when you had 1,200.'],
    lacks: ['nothing to correct'] },
  { tool: 5, name: 'spread 0: nothing to correct', html: ratio({ spread: 0 }),
    has: ['At zero, there is nothing to correct.'],
    lacks: ['understating'] },
  { tool: 5, name: 'boundary: spread 0.05 is the ratio branch',
    html: ratio({ spread: 0.05 }), has: ['understating the noise by'],
    lacks: ['nothing to correct'] }
];

/* ---- run ---- */

/* Anything that means a formatter was handed something that is not a number. */
const BROKEN = ['NaN', 'undefined', 'Infinity', '--', 'null'];

let failed = 0;
const rows = [];

for (const c of CASES) {
  const problems = [];

  if (c.exact !== undefined && c.html !== c.exact) {
    let at = 0;
    while (at < c.html.length && c.html[at] === c.exact[at]) at++;
    problems.push('differs from the pinned text at character ' + at + ': got "' +
      c.html.slice(Math.max(0, at - 20), at + 40) + '", pinned "' +
      c.exact.slice(Math.max(0, at - 20), at + 40) + '"');
  }
  for (const s of c.has || []) {
    if (c.html.indexOf(s) === -1) problems.push('missing "' + s + '"');
  }
  for (const s of c.lacks || []) {
    if (c.html.indexOf(s) !== -1) problems.push('should not contain "' + s + '"');
  }
  for (const s of BROKEN) {
    if (c.html.indexOf(s) !== -1) problems.push('contains "' + s + '"');
  }
  for (const sentence of c.html.split('\n')) {
    if (!/^<strong>[^<]+<\/strong>\S/.test(sentence)) {
      problems.push('does not open with a bold lead-in');
    }
  }

  if (problems.length) failed++;
  rows.push({ c, problems });
}

console.log('');
console.log('| Tool | Case | Result |');
console.log('|---:|---|---|');
for (const { c, problems } of rows) {
  console.log(`| ${c.tool} | ${c.name} | ${problems.length ? 'FAIL' : 'ok'} |`);
}
console.log('');

for (const { c, problems } of rows) {
  for (const p of problems) console.error(`Tool ${c.tool}, ${c.name}: ${p}`);
}

if (failed) {
  console.error(`${failed} of ${CASES.length} case(s) FAILED`);
  process.exit(1);
}
console.log(`All ${CASES.length} judgement cases pass.`);
