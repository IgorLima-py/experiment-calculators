/*
 * readout.js - reading a finished two-arm conversion test.
 *
 * Planning a test is half the job; the other half is reading it without
 * fooling yourself. This file does the reading, in the order it has to be
 * done:
 *
 *   1. sample ratio mismatch, checked before anything else, because a test
 *      whose traffic did not split as planned has no lift worth reading;
 *   2. the difference and the relative lift, each with an interval;
 *   3. the p-value;
 *   4. the type M (exaggeration) error, but only against an effect that comes
 *      from outside the data - the effect the test was planned to detect.
 *      Feeding it the observed lift would be post-hoc power, which is a
 *      one-to-one function of the p-value and says nothing new (Hoenig &
 *      Heisey 2001).
 *
 * Rates, alpha, the planned split and the planned effect are fractions
 * throughout. Every routine is checked against statsmodels and scipy in
 * validation/check_tool6.js.
 */
var Readout = (function () {
  'use strict';

  /*
   * p < 0.001 flags a mismatch. Eppo and GrowthBook both use 0.001, and it is
   * Statsig's alert tier (docs checked 2026-09-29, sources in
   * validation/RESULTS.md). Microsoft's experimentation team uses the stricter
   * 0.0005; Lukas Vermeer's retired checker used a looser 0.01.
   */
  var SRM_ALPHA = 0.001;

  function zCrit(alpha) {
    return Stats.normalQuantile(1 - alpha / 2);
  }

  /*
   * Chi-square goodness of fit of the observed users against the planned
   * split, no continuity correction - the test Eppo, GrowthBook and
   * scipy.stats.chisquare run. Two arms means one degree of freedom, where the
   * chi-square tail is exactly 2 * Phi(-sqrt(chi2)), so no gamma function is
   * needed.
   */
  function srm(na, nb, splitA) {
    var total = na + nb;
    var ea = total * splitA;
    var eb = total * (1 - splitA);
    var chi2 = (na - ea) * (na - ea) / ea + (nb - eb) * (nb - eb) / eb;
    var p = 2 * Stats.normalCdf(-Math.sqrt(chi2));
    return { chi2: chi2, p: p, expectedA: ea, expectedB: eb,
             plannedShareA: splitA, observedShareA: na / total,
             flagged: p < SRM_ALPHA };
  }

  /*
   * Two-proportion z-test with the variance pooled under the null, two-sided:
   * statsmodels' proportions_ztest, and the same p-value as Evan Miller's
   * chi-squared test. z is positive when the variant converts better.
   */
  function zTest(na, ca, nb, cb) {
    var pooled = (ca + cb) / (na + nb);
    var se = Math.sqrt(pooled * (1 - pooled) * (1 / na + 1 / nb));
    var z = (cb / nb - ca / na) / se;
    return { z: z, p: 2 * Stats.normalCdf(-Math.abs(z)) };
  }

  /* Unpooled standard error of the difference in rates. */
  function seDiff(na, ca, nb, cb) {
    var pa = ca / na, pb = cb / nb;
    return Math.sqrt(pa * (1 - pa) / na + pb * (1 - pb) / nb);
  }

  /* Wald interval for variant minus control. Published next to Newcombe's in
   * the validation, not shown on the page: it misbehaves with small counts. */
  function diffWald(na, ca, nb, cb, alpha) {
    var d = cb / nb - ca / na;
    var half = zCrit(alpha) * seDiff(na, ca, nb, cb);
    return { lo: d - half, hi: d + half };
  }

  /* Wilson score interval for one proportion. */
  function wilson(x, n, z) {
    var p = x / n;
    var z2 = z * z;
    var centre = (x + z2 / 2) / (n + z2);
    var half = z * Math.sqrt(n) / (n + z2) * Math.sqrt(p * (1 - p) + z2 / (4 * n));
    return { lo: centre - half, hi: centre + half };
  }

  /*
   * Newcombe's hybrid score interval for variant minus control (method 10 of
   * Newcombe 1998), built from the two Wilson intervals, no continuity
   * correction. It is the default of statsmodels' confint_proportions_2indep,
   * and unlike Wald it keeps its coverage when a rate sits near zero or an arm
   * is small.
   */
  function diffNewcombe(na, ca, nb, cb, alpha) {
    var z = zCrit(alpha);
    var pa = ca / na, pb = cb / nb;
    var wa = wilson(ca, na, z);
    var wb = wilson(cb, nb, z);
    var d = pb - pa;
    return {
      lo: d - Math.sqrt((pb - wb.lo) * (pb - wb.lo) + (wa.hi - pa) * (wa.hi - pa)),
      hi: d + Math.sqrt((wb.hi - pb) * (wb.hi - pb) + (pa - wa.lo) * (pa - wa.lo))
    };
  }

  /*
   * Interval for the relative lift, variant / control - 1, from the log of the
   * risk ratio (Katz): statsmodels' compare='ratio', method='log'. Not the
   * 'log-adjusted' default, which adds 0.5 to every count and so centres the
   * interval on a ratio other than the one the page reports. Needs at least
   * one conversion in each arm.
   */
  function ratioLog(na, ca, nb, cb, alpha) {
    if (!(ca > 0 && cb > 0)) return null;
    var logRatio = Math.log((cb / nb) / (ca / na));
    var se = Math.sqrt(1 / cb - 1 / nb + 1 / ca - 1 / na);
    var half = zCrit(alpha) * se;
    return { lo: Math.exp(logRatio - half) - 1, hi: Math.exp(logRatio + half) - 1 };
  }

  /*
   * Gelman & Carlin (2014): if the true effect were D and the estimate has
   * standard error s, how often does a two-sided test at alpha reject (power),
   * how often does a rejection point the wrong way (type S), and by how much
   * does a significant estimate overstate |D| on average (type M, the
   * exaggeration ratio).
   *
   * Gelman & Carlin compute the exaggeration by simulation. This is the closed
   * form of Lu, Qiu & Deng (2019, Theorem 1), with lambda = |D|/s:
   *
   *   E[|Z| ; |Z| > z] = phi(lambda - z) + phi(lambda + z)
   *                      + lambda * (Phi(lambda - z) - Phi(-lambda - z))
   *
   * for Z ~ N(lambda, 1), divided by power and by lambda. Written with
   * Phi(lambda - z) - Phi(-lambda - z) rather than the paper's
   * Phi(lambda + z) + Phi(lambda - z) - 1, which is the same number without
   * subtracting from 1.
   */
  function retrodesign(D, s, alpha) {
    var lambda = Math.abs(D) / s;
    var z = zCrit(alpha);
    var hit = Stats.normalCdf(lambda - z);
    var miss = Stats.normalCdf(-lambda - z);
    var power = hit + miss;
    var tail = Stats.normalPdf(lambda - z) + Stats.normalPdf(lambda + z) +
               lambda * (hit - miss);
    return { power: power, typeS: miss / power, exaggeration: tail / (power * lambda) };
  }

  /*
   * The normal approximation needs a workable count of both outcomes in both
   * arms: the same threshold of 10 that Experiments.normalApproxOk applies at
   * the planning stage, here on the counts actually observed.
   */
  function countsOk(na, ca, nb, cb) {
    return Math.min(ca, na - ca, cb, nb - cb) >= 10;
  }

  /* Why a set of inputs cannot be read at all, or null when it can. */
  function invalid(v) {
    var whole = function (x) { return isFinite(x) && x >= 0 && Math.floor(x) === x; };
    if (!whole(v.na) || !whole(v.nb) || !whole(v.ca) || !whole(v.cb)) return 'counts';
    if (v.na === 0 || v.nb === 0) return 'empty';
    if (v.ca > v.na || v.cb > v.nb) return 'conversions';
    var pooled = (v.ca + v.cb) / (v.na + v.nb);
    if (pooled === 0 || pooled === 1) return 'degenerate';
    return null;
  }

  /*
   * Everything the page and its sentence need, in one place so the two can
   * never disagree. `mde` is the planned relative lift as a fraction, or null
   * when none was given; the effect it implies is taken on the observed
   * control rate.
   */
  function analyse(v) {
    var reason = invalid(v);
    if (reason) return { invalid: reason };

    var s = srm(v.na, v.nb, v.split);
    var rateA = v.ca / v.na, rateB = v.cb / v.nb;
    var test = zTest(v.na, v.ca, v.nb, v.cb);
    var ci = diffNewcombe(v.na, v.ca, v.nb, v.cb, v.alpha);
    var r = {
      invalid: null,
      srm: s,
      rateA: rateA,
      rateB: rateB,
      diff: rateB - rateA,
      relative: rateA > 0 ? rateB / rateA - 1 : NaN,
      ciDiff: ci,
      ciRelative: ratioLog(v.na, v.ca, v.nb, v.cb, v.alpha),
      z: test.z,
      p: test.p,
      alpha: v.alpha,
      significant: test.p < v.alpha,
      intervalExcludesZero: ci.lo > 0 || ci.hi < 0,
      countsOk: countsOk(v.na, v.ca, v.nb, v.cb),
      mde: v.mde,
      typeM: null
    };
    if (v.mde !== null && v.mde > 0) {
      var D = rateA * v.mde;
      var se = seDiff(v.na, v.ca, v.nb, v.cb);
      if (D > 0 && se > 0) {
        var rd = retrodesign(D, se, v.alpha);
        rd.effect = D;
        rd.se = se;
        r.typeM = rd;
      }
    }
    return r;
  }

  return {
    SRM_ALPHA: SRM_ALPHA,
    srm: srm,
    zTest: zTest,
    seDiff: seDiff,
    diffWald: diffWald,
    diffNewcombe: diffNewcombe,
    ratioLog: ratioLog,
    retrodesign: retrodesign,
    countsOk: countsOk,
    analyse: analyse
  };
})();
