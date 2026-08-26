/*
 * cuped.js - the two simulations behind the variance-reduction explainer.
 *
 * Tool 5 is a teaching page rather than a calculator, but the numbers it shows
 * still have to be right, so the demonstrations are real simulations checked
 * against theory in validation/ rather than hand-drawn illustrations.
 */
var Cuped = (function () {
  'use strict';

  /*
   * CUPED, from Deng, Xu, Kohavi & Walker (WSDM 2013).
   *
   *   Y_cv = Y - theta * (X - E[X]),  theta = cov(Y, X) / var(X)
   *   var(Y_cv) = var(Y) * (1 - rho^2)
   *
   * X is a pre-experiment covariate, which is what makes this legitimate:
   * randomisation guarantees the two arms have the same E[X], so subtracting a
   * multiple of it cannot bias the treatment effect. Use an in-experiment
   * covariate instead and that guarantee is gone - the original paper reports a
   * case where doing so reversed the sign of a known-positive effect and
   * reported it confidently.
   *
   * Returns a sample plus the quantities the page displays. theta and the
   * variance reduction are computed from the sample, not asserted from rho, so
   * that what is drawn and what is claimed cannot drift apart.
   */
  /* The CUPED adjustment itself, over a covariate and a metric. Kept separate
   * from data generation so the formula can be checked against an outside
   * implementation on identical numbers. */
  function cupedAdjust(xs, ys) {
    var n = xs.length;
    var mx = mean(xs), my = mean(ys);
    var vx = variance(xs, mx), vy = variance(ys, my);
    var cxy = covariance(xs, mx, ys, my);
    var theta = vx === 0 ? 0 : cxy / vx;

    var adjusted = new Float64Array(n);
    for (var i = 0; i < n; i++) adjusted[i] = ys[i] - theta * (xs[i] - mx);
    var vAdj = variance(adjusted, mean(adjusted));

    return {
      theta: theta,
      varianceRaw: vy,
      varianceAdjusted: vAdj,
      empiricalReduction: vy === 0 ? 0 : 1 - vAdj / vy,
      correlation: Math.sqrt(vx * vy) === 0 ? 0 : cxy / Math.sqrt(vx * vy)
    };
  }

  function cupedSample(rho, n, seed) {
    var rng = Stats.makeRng(seed || 12345);
    var xs = new Float64Array(n);
    var ys = new Float64Array(n);
    var k = Math.sqrt(1 - rho * rho);

    for (var i = 0; i < n; i++) {
      var x = rng.normal();
      xs[i] = x;
      ys[i] = rho * x + k * rng.normal();
    }

    var result = cupedAdjust(xs, ys);
    result.xs = xs;
    result.ys = ys;
    result.theoreticalReduction = rho * rho;
    return result;
  }

  /*
   * What variance reduction buys, in the units people actually plan in.
   * Microsoft's experimentation platform frames it as an effective traffic
   * multiplier, which is the most legible version: cutting variance by a
   * factor is worth exactly that much extra traffic.
   */
  function trafficMultiplier(reduction) {
    return reduction >= 1 ? Infinity : 1 / (1 - reduction);
  }

  /*
   * Ratio metrics and the delta method, from Deng, Knoblich & Lu (KDD 2018).
   *
   * The setup is the one that trips people up: users are randomised, but the
   * metric is measured per session. Each user brings several sessions and their
   * own conversion propensity, so sessions from the same user are correlated
   * and are not the independent observations the textbook standard error
   * assumes.
   *
   * Writing the metric as a ratio of per-user averages restores independence,
   * because users are independent even when their sessions are not:
   *
   *   Var(C_bar / S_bar) ~ (1/n)(1/mu_s^2)[var(C) - 2(mu_c/mu_s)cov(C,S)
   *                                        + (mu_c^2/mu_s^2)var(S)]
   *
   * `spread` controls how much conversion propensity varies between users. At
   * zero every user is identical, sessions really are independent, and the
   * naive standard error is correct - which is the honest half of the lesson.
   */
  function simulateRatioExperiment(options) {
    var users = options.users;
    var spread = options.spread;
    var meanSessions = options.meanSessions;
    var baseRate = options.baseRate;
    var rng = options.rng;

    var conversions = new Float64Array(users);
    var sessions = new Float64Array(users);
    var totalConversions = 0;
    var totalSessions = 0;

    /* Propensity on the logit scale keeps it inside (0, 1) at any spread. */
    var baseLogit = Math.log(baseRate / (1 - baseRate));

    for (var i = 0; i < users; i++) {
      var p = 1 / (1 + Math.exp(-(baseLogit + spread * rng.normal())));
      var s = 1 + poisson(rng, meanSessions - 1);
      var c = 0;
      for (var j = 0; j < s; j++) if (rng.uniform() < p) c++;
      conversions[i] = c;
      sessions[i] = s;
      totalConversions += c;
      totalSessions += s;
    }

    return ratioStandardErrors(conversions, sessions);
  }

  /*
   * The two competing standard errors for a ratio metric, over per-user
   * numerators and denominators. Pure so that the formula can be checked
   * against an outside implementation on identical numbers.
   */
  function ratioStandardErrors(conversions, sessions) {
    var users = conversions.length;
    var totalConversions = 0;
    var totalSessions = 0;
    for (var i = 0; i < users; i++) {
      totalConversions += conversions[i];
      totalSessions += sessions[i];
    }
    var ratio = totalSessions === 0 ? 0 : totalConversions / totalSessions;

    var mc = mean(conversions), ms = mean(sessions);
    var vc = variance(conversions, mc), vs = variance(sessions, ms);
    var ccs = covariance(conversions, mc, sessions, ms);

    var deltaVar = (1 / users) * (1 / (ms * ms)) *
                   (vc - 2 * (mc / ms) * ccs + (mc * mc) / (ms * ms) * vs);

    return {
      ratio: ratio,
      sessions: totalSessions,
      naiveSe: Math.sqrt(ratio * (1 - ratio) / totalSessions),
      deltaSe: Math.sqrt(Math.max(0, deltaVar))
    };
  }

  /*
   * Run the experiment many times to get the standard error that actually
   * obtains, which is the only arbiter between the two formulas above.
   */
  function ratioMetricComparison(options) {
    var reps = options.reps || 300;
    var rng = Stats.makeRng(options.seed || 99991);
    var ratios = [];
    var naive = 0;
    var delta = 0;
    var sessions = 0;

    for (var r = 0; r < reps; r++) {
      var run = simulateRatioExperiment({
        users: options.users,
        spread: options.spread,
        meanSessions: options.meanSessions,
        baseRate: options.baseRate,
        rng: rng
      });
      ratios.push(run.ratio);
      naive += run.naiveSe;
      delta += run.deltaSe;
      sessions += run.sessions;
    }

    var m = mean(ratios);
    var trueSe = Math.sqrt(variance(ratios, m));

    return {
      naiveSe: naive / reps,
      deltaSe: delta / reps,
      trueSe: trueSe,
      /* The simulated truth is itself an estimate. The standard deviation of a
       * standard deviation over r replications is about sd / sqrt(2(r-1)), and
       * quoting the figure without it would invite reading noise as bias. */
      trueSeUncertainty: trueSe / Math.sqrt(2 * (reps - 1)),
      meanRatio: m,
      meanSessions: sessions / reps,
      reps: reps
    };
  }

  /* Knuth's method; the counts here are small enough that it is the cheapest. */
  function poisson(rng, lambda) {
    if (lambda <= 0) return 0;
    var limit = Math.exp(-lambda);
    var k = 0;
    var p = 1;
    do {
      k++;
      p *= rng.uniform();
    } while (p > limit);
    return k - 1;
  }

  function mean(a) {
    var total = 0;
    for (var i = 0; i < a.length; i++) total += a[i];
    return total / a.length;
  }

  function variance(a, m) {
    var acc = 0;
    for (var i = 0; i < a.length; i++) acc += (a[i] - m) * (a[i] - m);
    return acc / (a.length - 1);
  }

  function covariance(a, ma, b, mb) {
    var acc = 0;
    for (var i = 0; i < a.length; i++) acc += (a[i] - ma) * (b[i] - mb);
    return acc / (a.length - 1);
  }

  return {
    cupedAdjust: cupedAdjust,
    cupedSample: cupedSample,
    trafficMultiplier: trafficMultiplier,
    ratioStandardErrors: ratioStandardErrors,
    simulateRatioExperiment: simulateRatioExperiment,
    ratioMetricComparison: ratioMetricComparison
  };
})();
