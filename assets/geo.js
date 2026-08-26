/*
 * geo.js - power for geo holdout tests, where the unit of analysis is a market.
 *
 * The model is the standard cluster-randomised one (Hayes & Bennett 1999): with
 * markets as the units, the between-geo coefficient of variation is the entire
 * variance story, and the comparison is a two-sample t-test on geo-level
 * outcomes. Small numbers of geos mean the t distribution matters - the normal
 * approximation used elsewhere in this suite would understate what you need -
 * so power uses the noncentral t exactly.
 *
 * This is a design-stage estimate and the page says so. Production tools
 * (GeoLift, Trimmed Match) get better precision out of the same markets by
 * fitting a synthetic control and simulating on your actual history. What they
 * cannot do is answer from summary statistics, which is the whole reason this
 * exists.
 */
var Geo = (function () {
  'use strict';

  /*
   * Relative standard error of the difference in means.
   *
   * rho is the correlation between a geo's pre-period and test-period metric.
   * Adjusting for the pre-period deflates the variance by (1 - rho^2), which is
   * the same term that appears in Vaver & Koehler's geo regression and the same
   * idea as CUPED. Pass rho = 0 when the CV already describes the adjusted
   * metric.
   */
  function relativeStandardError(cv, rho, nTreat, nControl) {
    var cvEff = cv * Math.sqrt(1 - rho * rho);
    return cvEff * Math.sqrt(1 / nTreat + 1 / nControl);
  }

  function degreesOfFreedom(nTreat, nControl) {
    return nTreat + nControl - 2;
  }

  function split(totalGeos, holdout) {
    return { treat: totalGeos - holdout, control: holdout };
  }

  /*
   * The textbook closed form, as published by Hayes & Bennett and used by most
   * cluster-trial guidance: MDE = (t_{1-alpha/2} + t_{1-beta}) * SE.
   *
   * Kept because it is the formula the literature states, and because the
   * published comparison shows what it costs. It is an approximation: adding
   * two central-t quantiles is not the inverse of noncentral-t power, and at
   * the small degrees of freedom geo tests live at it lands up to about half a
   * percentage point away from the power it claims.
   */
  function mdeClosedForm(totalGeos, holdout, cv, rho, alpha, power) {
    var s = split(totalGeos, holdout);
    if (!(s.treat >= 1 && s.control >= 1)) return NaN;
    var nu = degreesOfFreedom(s.treat, s.control);
    if (nu < 1) return NaN;
    var se = relativeStandardError(cv, rho, s.treat, s.control);
    return (Stats.tQuantile(1 - alpha / 2, nu) + Stats.tQuantile(power, nu)) * se;
  }

  /*
   * Smallest relative lift detectable at the given significance and power.
   *
   * Solved by inverting the exact power function rather than using the closed
   * form above, so that the effect this returns is genuinely the one that
   * achieves the requested power. Quoting a detectable effect that delivers
   * 80.6% power when it says 80% is a small error, but it is the kind that is
   * checkable from outside, and a calculator that is quietly off is worse than
   * no calculator.
   */
  function mde(totalGeos, holdout, cv, rho, alpha, targetPower) {
    var seed = mdeClosedForm(totalGeos, holdout, cv, rho, alpha, targetPower);
    if (!isFinite(seed) || seed <= 0) return NaN;
    var f = function (lift) {
      return power(totalGeos, holdout, cv, rho, lift, alpha) - targetPower;
    };
    /* Power rises monotonically with the effect, so bracket around the closed
     * form and widen until the target is straddled. */
    var lo = seed * 0.5;
    var hi = seed * 1.5;
    var guard = 0;
    while (f(lo) > 0 && guard++ < 40) lo *= 0.5;
    guard = 0;
    while (f(hi) < 0 && guard++ < 40) hi *= 1.5;
    if (f(lo) > 0 || f(hi) < 0) return seed;
    return Stats.bisect(f, lo, hi, 1e-12, 200);
  }

  /*
   * Power to detect a given relative lift.
   *
   * Both rejection regions are counted: with few geos and a modest effect the
   * far tail is not always negligible, and leaving it out would quietly
   * overstate how demanding the test is.
   */
  function power(totalGeos, holdout, cv, rho, lift, alpha) {
    var s = split(totalGeos, holdout);
    if (!(s.treat >= 1 && s.control >= 1)) return NaN;
    var nu = degreesOfFreedom(s.treat, s.control);
    if (nu < 1) return NaN;
    var se = relativeStandardError(cv, rho, s.treat, s.control);
    if (!(se > 0)) return NaN;
    var lambda = Math.abs(lift) / se;
    var tCrit = Stats.tQuantile(1 - alpha / 2, nu);
    return 1 - Stats.noncentralTCdf(tCrit, nu, lambda) +
           Stats.noncentralTCdf(-tCrit, nu, lambda);
  }

  /*
   * Smallest holdout that reaches the target power.
   *
   * Power is a hill peaking at an even split, so the qualifying holdouts form a
   * contiguous run around half the markets and the interesting end is the
   * cheapest one - holding out fewer markets means less business foregone. A
   * scan is used rather than a solver because the domain is a few dozen
   * integers and a scan cannot converge to the wrong side of the hill.
   */
  function smallestHoldout(totalGeos, cv, rho, lift, alpha, targetPower) {
    for (var h = 1; h <= totalGeos - 1; h++) {
      if (power(totalGeos, h, cv, rho, lift, alpha) >= targetPower) return h;
    }
    return null;
  }

  /* MDE across every possible holdout size, for the trade-off curve. */
  function mdeCurve(totalGeos, cv, rho, alpha, pw) {
    var points = [];
    for (var h = 1; h <= totalGeos - 1; h++) {
      var value = mde(totalGeos, h, cv, rho, alpha, pw);
      if (isFinite(value)) points.push({ holdout: h, mde: value });
    }
    return points;
  }

  /*
   * Descriptive statistics from pasted geo-level numbers.
   *
   * One market per line, with the figures at the end: the metric to be
   * measured, then optionally the same market's earlier period. Anything
   * before them is ignored.
   *
   * Numbers are taken from the end of the line rather than the start because
   * market names routinely contain digits - "Market 1", "Region 2" - and
   * reading left to right silently turns that digit into the data. That is not
   * a hypothetical: it is what the first version of this function did, and the
   * validation caught a mean of 13 where the answer was 53,806.
   *
   * Deciding whether the last two numbers are a pair or a stray name-digit
   * followed by one value needs a judgement call. A market's earlier period is
   * within a small factor of its current one, while a row number sitting next
   * to a revenue figure is orders of magnitude away, so the median ratio across
   * lines separates the two cases cleanly.
   */
  function parsePasted(text) {
    var rows = [];
    var lines = String(text).split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      var numbers = lines[i]
        .split(/[\s,;|]+/)
        .map(function (token) { return parseFloat(token); })
        .filter(function (n) { return isFinite(n); });
      if (numbers.length > 0) rows.push(numbers);
    }

    var result = { n: 0, mean: NaN, sd: NaN, cv: NaN, rho: 0, pairs: 0,
                   paired: false };
    if (rows.length < 2) return result;

    var ratios = [];
    for (var r = 0; r < rows.length; r++) {
      if (rows[r].length < 2) continue;
      var last = rows[r][rows[r].length - 1];
      var prev = rows[r][rows[r].length - 2];
      if (prev !== 0) ratios.push(Math.abs(last / prev));
    }

    var paired = false;
    if (ratios.length === rows.length && ratios.length >= 3) {
      var mid = median(ratios);
      paired = mid >= 0.2 && mid <= 5;
    }

    var values = [];
    var priors = [];
    for (var k = 0; k < rows.length; k++) {
      var row = rows[k];
      if (paired) {
        values.push(row[row.length - 2]);
        priors.push(row[row.length - 1]);
      } else {
        values.push(row[row.length - 1]);
      }
    }

    result.n = values.length;
    result.paired = paired;
    result.mean = mean(values);
    result.sd = sampleSd(values, result.mean);
    result.cv = result.mean === 0 ? NaN : result.sd / Math.abs(result.mean);

    if (paired && priors.length >= 3) {
      result.pairs = priors.length;
      result.rho = correlation(values, priors);
    }
    return result;
  }

  function median(a) {
    var sorted = a.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function mean(a) {
    var total = 0;
    for (var i = 0; i < a.length; i++) total += a[i];
    return total / a.length;
  }

  function sampleSd(a, m) {
    var acc = 0;
    for (var i = 0; i < a.length; i++) acc += (a[i] - m) * (a[i] - m);
    return Math.sqrt(acc / (a.length - 1));
  }

  function correlation(a, b) {
    var ma = mean(a), mb = mean(b);
    var num = 0, da = 0, db = 0;
    for (var i = 0; i < a.length; i++) {
      var xa = a[i] - ma, xb = b[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    if (da === 0 || db === 0) return 0;
    return num / Math.sqrt(da * db);
  }

  return {
    relativeStandardError: relativeStandardError,
    mde: mde,
    mdeClosedForm: mdeClosedForm,
    power: power,
    smallestHoldout: smallestHoldout,
    mdeCurve: mdeCurve,
    parsePasted: parsePasted
  };
})();
