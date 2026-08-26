/*
 * sequential.js - group-sequential boundaries and the cost of peeking.
 *
 * The core is the Armitage-McPherson recursion: the exact numerical
 * integration behind every published table of repeated-significance-test error
 * rates. As far as I can find, no client-side implementation of it existed
 * before this one, which is why the numbers here are checked against the
 * published tables by two further independent routes in validation/.
 *
 * Model. Information accrues in K equal increments. Write S_k for the sum of k
 * independent standard normal increments, so the test statistic at look k is
 * Z_k = S_k / sqrt(k). The experimenter stops the first time |Z_k| >= c_k, so
 * the boundary on S_k is b_k = c_k * sqrt(k).
 *
 * The recursion carries the sub-density of S_k restricted to "has not stopped
 * yet". Convolving it with the standard normal advances one look; the mass
 * that falls outside the new boundary is the alpha spent at that look.
 */
var Sequential = (function () {
  'use strict';

  /* Simpson weights: 1, 4, 2, 4, ..., 4, 1 over an even number of intervals. */
  function simpsonWeight(i, n) {
    if (i === 0 || i === n) return 1;
    return i % 2 === 1 ? 4 : 2;
  }

  /*
   * Overall two-sided type I error for a run that tests at every look with the
   * given critical values.
   *
   * Each look gets its own grid spanning exactly [-b_k, b_k], rather than one
   * shared lattice. A shared lattice would let the normal kernel be tabulated
   * once and make this much faster, but the boundary would then fall between
   * grid points and the truncation error is precisely what this function is
   * measuring - the speed is not worth biasing the answer.
   */
  function overallAlpha(bounds, intervals) {
    var K = bounds.length;
    if (K === 0) return 0;
    var n = intervals || 200;
    if (n % 2 === 1) n += 1;

    var b = bounds[0];
    var h = 2 * b / n;
    var x = new Float64Array(n + 1);
    var f = new Float64Array(n + 1);
    for (var i = 0; i <= n; i++) {
      x[i] = -b + i * h;
      f[i] = Stats.normalPdf(x[i]);
    }

    /* Look 1 is exact - no quadrature needed for a single normal tail. */
    var alpha = 2 * Stats.normalCdf(-b);
    var mass = 1 - alpha;

    for (var k = 2; k <= K; k++) {
      var bNew = bounds[k - 1] * Math.sqrt(k);
      var hNew = 2 * bNew / n;
      var yGrid = new Float64Array(n + 1);
      var fNew = new Float64Array(n + 1);

      for (var j = 0; j <= n; j++) {
        var y = -bNew + j * hNew;
        yGrid[j] = y;
        var acc = 0;
        for (var m = 0; m <= n; m++) {
          acc += simpsonWeight(m, n) * f[m] * Stats.normalPdf(y - x[m]);
        }
        fNew[j] = acc * h / 3;
      }

      var survived = 0;
      for (var q = 0; q <= n; q++) {
        survived += simpsonWeight(q, n) * fNew[q];
      }
      survived *= hNew / 3;

      /* Convolution conserves total mass, so whatever is no longer inside the
       * new boundary was spent rejecting at this look. */
      alpha += mass - survived;
      mass = survived;
      x = yGrid;
      f = fNew;
      h = hNew;
    }

    return alpha;
  }

  /* Inflated error rate from testing at a fixed nominal level at every look. */
  function alphaInflation(looks, nominalAlpha, intervals) {
    var z = Stats.normalQuantile(1 - nominalAlpha / 2);
    var bounds = [];
    for (var i = 0; i < looks; i++) bounds.push(z);
    return overallAlpha(bounds, intervals);
  }

  /*
   * Pocock (1977): one constant critical value used at every look, chosen so
   * the whole run spends exactly the target alpha. This is the headline
   * correction because it is a single number somebody can act on.
   */
  function pocockBound(looks, targetAlpha, intervals) {
    if (looks <= 1) return Stats.normalQuantile(1 - targetAlpha / 2);
    var f = function (c) {
      var bounds = [];
      for (var i = 0; i < looks; i++) bounds.push(c);
      return overallAlpha(bounds, intervals) - targetAlpha;
    };
    return Stats.bisect(f, Stats.normalQuantile(1 - targetAlpha / 2), 5, 1e-5, 60);
  }

  /* Per-look nominal significance implied by a critical value. */
  function nominalAlphaFor(z) {
    return 2 * Stats.normalCdf(-z);
  }

  /*
   * O'Brien-Fleming (1979): c_k = C * sqrt(K/k). Severe early, close to the
   * uncorrected level at the end, which is why trials that must not stop early
   * on noise prefer it.
   */
  function obrienFlemingBounds(looks, targetAlpha, intervals) {
    var shape = [];
    for (var i = 1; i <= looks; i++) shape.push(Math.sqrt(looks / i));
    if (looks <= 1) return [Stats.normalQuantile(1 - targetAlpha / 2)];
    var f = function (C) {
      var bounds = shape.map(function (s) { return C * s; });
      return overallAlpha(bounds, intervals) - targetAlpha;
    };
    var C = Stats.bisect(f, 0.5, 4, 1e-5, 60);
    return shape.map(function (s) { return C * s; });
  }

  /*
   * Lan-DeMets (1983) alpha-spending functions, in closed form. These decouple
   * the boundary from a fixed schedule of looks, which is what makes unequally
   * spaced peeks analysable at all. t is the information fraction in [0, 1].
   */
  function spendOBrienFleming(t, alpha) {
    if (t <= 0) return 0;
    if (t >= 1) return alpha;
    return 2 - 2 * Stats.normalCdf(Stats.normalQuantile(1 - alpha / 2) / Math.sqrt(t));
  }

  function spendPocock(t, alpha) {
    if (t <= 0) return 0;
    if (t >= 1) return alpha;
    return alpha * Math.log(1 + (Math.E - 1) * t);
  }

  /*
   * Boundaries for looks at arbitrary information fractions, from a spending
   * function. Each look's critical value is chosen so the cumulative error
   * spent matches what the spending function allows by that point.
   */
  function spendingBounds(fractions, targetAlpha, spend, intervals) {
    var bounds = [];
    for (var k = 0; k < fractions.length; k++) {
      var budget = spend(fractions[k], targetAlpha);
      var prefix = bounds.slice();
      var f = function (c) {
        return overallAlphaUneven(prefix.concat([c]), fractions.slice(0, k + 1),
                                  intervals) - budget;
      };
      bounds.push(Stats.bisect(f, 0.3, 8, 1e-5, 60));
    }
    return bounds;
  }

  /*
   * The same recursion for looks at arbitrary information fractions. The
   * increment between consecutive looks has variance equal to the gap in
   * information, so the boundary on the running sum is c_k * sqrt(t_k).
   */
  function overallAlphaUneven(bounds, fractions, intervals) {
    var K = bounds.length;
    if (K === 0) return 0;
    var n = intervals || 200;
    if (n % 2 === 1) n += 1;

    var b = bounds[0] * Math.sqrt(fractions[0]);
    var sd0 = Math.sqrt(fractions[0]);
    var h = 2 * b / n;
    var x = new Float64Array(n + 1);
    var f = new Float64Array(n + 1);
    for (var i = 0; i <= n; i++) {
      x[i] = -b + i * h;
      f[i] = Stats.normalPdf(x[i] / sd0) / sd0;
    }
    var alpha = 2 * Stats.normalCdf(-bounds[0]);
    var mass = 1 - alpha;

    for (var k = 2; k <= K; k++) {
      var gap = Math.sqrt(fractions[k - 1] - fractions[k - 2]);
      var bNew = bounds[k - 1] * Math.sqrt(fractions[k - 1]);
      var hNew = 2 * bNew / n;
      var yGrid = new Float64Array(n + 1);
      var fNew = new Float64Array(n + 1);

      for (var j = 0; j <= n; j++) {
        var y = -bNew + j * hNew;
        yGrid[j] = y;
        var acc = 0;
        for (var m = 0; m <= n; m++) {
          acc += simpsonWeight(m, n) * f[m] * Stats.normalPdf((y - x[m]) / gap) / gap;
        }
        fNew[j] = acc * h / 3;
      }

      var survived = 0;
      for (var q = 0; q <= n; q++) survived += simpsonWeight(q, n) * fNew[q];
      survived *= hNew / 3;

      alpha += mass - survived;
      mass = survived;
      x = yGrid;
      f = fNew;
      h = hNew;
    }
    return alpha;
  }

  /*
   * Monte Carlo of the same experiment, simulated at the level of the test
   * statistic rather than individual visitors. For the normal-approximation
   * model the two are identical and this is a thousand times cheaper, which is
   * what makes it fast enough to animate.
   *
   * Returns the count of runs that crossed, so a caller can accumulate batches
   * across animation frames.
   */
  function simulateBatch(looks, criticalValues, reps) {
    var crossed = 0;
    for (var r = 0; r < reps; r++) {
      var sum = 0;
      for (var k = 1; k <= looks; k++) {
        sum += Stats.randNormal();
        var z = sum / Math.sqrt(k);
        var c = typeof criticalValues === 'number'
          ? criticalValues : criticalValues[k - 1];
        if (Math.abs(z) >= c) {
          crossed++;
          break;
        }
      }
    }
    return crossed;
  }

  return {
    overallAlpha: overallAlpha,
    overallAlphaUneven: overallAlphaUneven,
    alphaInflation: alphaInflation,
    pocockBound: pocockBound,
    obrienFlemingBounds: obrienFlemingBounds,
    nominalAlphaFor: nominalAlphaFor,
    spendOBrienFleming: spendOBrienFleming,
    spendPocock: spendPocock,
    spendingBounds: spendingBounds,
    simulateBatch: simulateBatch
  };
})();
