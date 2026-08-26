/*
 * experiments.js - the experiment-design formulas themselves.
 *
 * Distribution primitives live in stats.js; this file is only the experiment
 * math, so that each function here maps one-to-one onto a row in
 * validation/RESULTS.md.
 *
 * Rates are proportions (0.05, not 5) throughout.
 */
var Experiments = (function () {
  'use strict';

  function zAlpha(alpha, tails) {
    return Stats.normalQuantile(1 - alpha / (tails === 1 ? 1 : 2));
  }

  /*
   * Sample size per variant for two independent proportions.
   *
   * n = [z_a * sqrt(2 * pbar * (1-pbar)) + z_b * sqrt(p1(1-p1) + p2(1-p2))]^2 / d^2
   *
   * Variance is pooled at pbar = (p1+p2)/2 under the null and left unpooled
   * under the alternative. That convention is what makes this agree to the
   * decimal with statsmodels' samplesize_proportions_2indep_onetail; Evan
   * Miller's widely-used calculator instead puts both arms at the baseline rate
   * under the null and so returns roughly 6% fewer users. Neither is wrong,
   * they answer slightly different questions - see sampleSizeEvanMiller and the
   * comparison table in validation/RESULTS.md.
   */
  function sampleSizePooled(p1, delta, alpha, power, tails) {
    var p2 = p1 + delta;
    if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || delta === 0) return NaN;
    var pbar = (p1 + p2) / 2;
    var za = zAlpha(alpha, tails);
    var zb = Stats.normalQuantile(power);
    var sdNull = Math.sqrt(2 * pbar * (1 - pbar));
    var sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    var num = za * sdNull + zb * sdAlt;
    return num * num / (delta * delta);
  }

  /*
   * Evan Miller's convention, ported verbatim from his sample-size-fixed.js so
   * the published comparison is exact. Two quirks are his and are kept: the
   * null variance uses the baseline rate in both arms, and a baseline above 0.5
   * is folded to 1-p, which mirrors the alternative.
   */
  function sampleSizeEvanMiller(p1, delta, alpha, power) {
    var p = p1 > 0.5 ? 1 - p1 : p1;
    if (!(p > 0 && p < 1) || delta === 0) return NaN;
    if (!(p + delta > 0 && p + delta < 1)) return NaN;
    var za = Stats.normalQuantile(1 - alpha / 2);
    var zb = Stats.normalQuantile(power);
    var sdNull = Math.sqrt(2 * p * (1 - p));
    var sdAlt = Math.sqrt(p * (1 - p) + (p + delta) * (1 - p - delta));
    var num = za * sdNull + zb * sdAlt;
    return num * num / (delta * delta);
  }

  /*
   * Power actually achieved by n per variant.
   *
   * A two-sided test can also reject in the direction opposite the true effect,
   * and this counts that far tail. The sample-size formula above does not - it
   * is the standard closed form, and inverting it exactly would mean dropping
   * the term. So the two functions are not perfect inverses of each other: the
   * round trip differs by under 1e-6 in power. That gap is a property of the
   * textbook formula, not of this implementation, and both functions match
   * their statsmodels counterparts to machine precision.
   */
  function powerPooled(p1, delta, n, alpha, tails) {
    var p2 = p1 + delta;
    if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || !(n > 0)) return NaN;
    var pbar = (p1 + p2) / 2;
    var za = zAlpha(alpha, tails);
    var sdNull = Math.sqrt(2 * pbar * (1 - pbar));
    var sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    var shift = Math.abs(delta) * Math.sqrt(n);
    var upper = Stats.normalCdf((shift - za * sdNull) / sdAlt);
    if (tails === 1) return upper;
    return upper + Stats.normalCdf((-shift - za * sdNull) / sdAlt);
  }

  /*
   * Smallest absolute effect detectable with n users per variant - the inverse
   * of sampleSizePooled.
   *
   * Solved by bisection rather than in closed form, because the effect appears
   * inside the alternative-hypothesis variance as well as in the denominator.
   * The usual shortcut is to drop it from the variance and invert what is left;
   * that returns a number that looks right and is not, which is precisely the
   * kind of quiet error this suite exists to avoid.
   *
   * Returns NaN when even the largest arithmetically possible effect would
   * still need more users than are available: at that point the honest answer
   * is that no effect is detectable, not a number.
   */
  function mdeFromSampleSize(p1, nPerVariant, alpha, power, tails) {
    if (!(p1 > 0 && p1 < 1) || !(nPerVariant > 0)) return NaN;
    var hi = (1 - p1) * 0.999999;
    var f = function (d) {
      return sampleSizePooled(p1, d, alpha, power, tails) - nPerVariant;
    };
    if (!(f(hi) < 0)) return NaN;
    return Stats.bisect(f, 1e-12, hi, 1e-15, 300);
  }

  /* Both variants share the daily traffic, so the run needs 2n users total. */
  function durationDays(nPerVariant, dailyTraffic) {
    if (!(dailyTraffic > 0) || !isFinite(nPerVariant)) return NaN;
    return Math.ceil(2 * nPerVariant / dailyTraffic);
  }

  /*
   * Absolute effect implied by an MDE expressed either in percentage points or
   * as a relative lift on the baseline.
   */
  function absoluteEffect(baseline, mde, isRelative) {
    return isRelative ? baseline * mde : mde;
  }

  /*
   * The normal approximation to the binomial needs a workable number of
   * expected successes and failures per arm. Under about 10 the interval it
   * implies stops being trustworthy, and the honest move is to say so rather
   * than print a confident number.
   */
  function normalApproxOk(p1, delta, n) {
    var p2 = p1 + delta;
    var worst = Math.min(p1, 1 - p1, p2, 1 - p2);
    return worst * n >= 10;
  }

  return {
    sampleSizePooled: sampleSizePooled,
    sampleSizeEvanMiller: sampleSizeEvanMiller,
    powerPooled: powerPooled,
    mdeFromSampleSize: mdeFromSampleSize,
    durationDays: durationDays,
    absoluteEffect: absoluteEffect,
    normalApproxOk: normalApproxOk
  };
})();
