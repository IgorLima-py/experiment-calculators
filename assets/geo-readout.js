/*
 * geo-readout.js - reading a finished geo holdout test.
 *
 * The geo holdout page designs a test with markets as the units and each
 * market's pre-period as a covariate: the (1 - rho^2) it takes off the
 * variation is exactly what adjusting for the pre-period buys. This reads the
 * finished test with the same model, fitted by ordinary least squares
 * (analysis of covariance):
 *
 *   post_i = a + b * treat_i + c * pre_i + e_i
 *
 * b is the effect per treated market. The incremental revenue is b times the
 * number of treated markets, and the iROAS is that divided by what the test
 * spent, with the interval scaled the same way: the spend is known, not
 * estimated. The standard error is the classical one, on n - 3 degrees of
 * freedom. The heteroskedasticity-robust (HC1) error and the weighted
 * regression of Vaver & Koehler (2011) are published next to it in
 * validation/RESULTS.md, not used here.
 *
 * Alpha, rho and the relative lift are fractions throughout. Checked against
 * statsmodels OLS in validation/check_tool7.js.
 */
var GeoReadout = (function () {
  'use strict';

  function mean(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s / a.length;
  }

  /* Inverse of a small symmetric positive-definite matrix, by Gauss-Jordan
   * elimination with partial pivoting. Returns null when it is singular. */
  function invert(m) {
    var n = m.length;
    var a = m.map(function (row, i) {
      var id = [];
      for (var j = 0; j < n; j++) id.push(i === j ? 1 : 0);
      return row.slice().concat(id);
    });
    for (var col = 0; col < n; col++) {
      var pivot = col;
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
      }
      if (a[pivot][col] === 0) return null;
      var tmp = a[col]; a[col] = a[pivot]; a[pivot] = tmp;
      var p = a[col][col];
      for (var c = 0; c < 2 * n; c++) a[col][c] /= p;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var f = a[r2][col];
        if (f === 0) continue;
        for (var c2 = 0; c2 < 2 * n; c2++) a[r2][c2] -= f * a[col][c2];
      }
    }
    return a.map(function (row) { return row.slice(n); });
  }

  /*
   * The treatment coefficient of post ~ 1 + treat + pre.
   *
   * The pre-period is centred before solving. That moves the intercept and
   * nothing else - the treatment coefficient and its standard error are the
   * same - but market revenue runs to millions, and centring keeps X'X from
   * mixing entries twelve orders of magnitude apart.
   */
  function ancova(rows, alpha) {
    var n = rows.length;
    var treat = rows.map(function (r) { return r.group === 'treat' ? 1 : 0; });
    var preMean = mean(rows.map(function (r) { return r.pre; }));
    var X = rows.map(function (r, i) { return [1, treat[i], r.pre - preMean]; });
    var y = rows.map(function (r) { return r.post; });

    var xtx = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var xty = [0, 0, 0];
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < 3; j++) {
        xty[j] += X[i][j] * y[i];
        for (var k = 0; k < 3; k++) xtx[j][k] += X[i][j] * X[i][k];
      }
    }
    var inv = invert(xtx);
    if (!inv) return null;
    var beta = [0, 0, 0];
    for (var j2 = 0; j2 < 3; j2++) {
      for (var k2 = 0; k2 < 3; k2++) beta[j2] += inv[j2][k2] * xty[k2];
    }

    var rss = 0;
    for (var i2 = 0; i2 < n; i2++) {
      var e = y[i2] - (beta[0] + beta[1] * X[i2][1] + beta[2] * X[i2][2]);
      rss += e * e;
    }
    var df = n - 3;
    var se = Math.sqrt(rss / df * inv[1][1]);
    var b = beta[1];
    var t = b / se;
    var half = Stats.tQuantile(1 - alpha / 2, df) * se;
    return {
      b: b, se: se, t: t, df: df,
      p: 2 * (1 - Stats.tCdf(Math.abs(t), df)),
      ci: { lo: b - half, hi: b + half }
    };
  }

  /*
   * The pre-period correlation within groups: pre and post each taken from
   * their own group's mean, then correlated. It is the partial correlation
   * given the group, and the rho whose (1 - rho^2) the geo holdout page takes
   * off the variation.
   */
  function withinRho(rows) {
    var sums = { treat: { n: 0, pre: 0, post: 0 }, control: { n: 0, pre: 0, post: 0 } };
    rows.forEach(function (r) {
      var s = sums[r.group];
      s.n++; s.pre += r.pre; s.post += r.post;
    });
    var sxy = 0, sxx = 0, syy = 0;
    rows.forEach(function (r) {
      var s = sums[r.group];
      var dx = r.pre - s.pre / s.n, dy = r.post - s.post / s.n;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    });
    if (sxx === 0 || syy === 0) return NaN;
    return sxy / Math.sqrt(sxx * syy);
  }

  /* Coefficient of variation of the pre-period across every market: the
   * between-market variation the geo holdout page asks for. */
  function preCv(rows) {
    var pre = rows.map(function (r) { return r.pre; });
    var m = mean(pre);
    var acc = 0;
    for (var i = 0; i < pre.length; i++) acc += (pre[i] - m) * (pre[i] - m);
    return Math.sqrt(acc / (pre.length - 1)) / Math.abs(m);
  }

  /* Why a set of markets cannot be read at all, or null when it can. */
  function invalid(rows) {
    var nT = 0, nC = 0;
    for (var i = 0; i < rows.length; i++) {
      if (!isFinite(rows[i].pre) || !isFinite(rows[i].post)) return 'numbers';
      if (rows[i].group === 'treat') nT++; else nC++;
    }
    if (nT < 2 || nC < 2) return 'groups';
    var first = rows[0].pre;
    if (rows.every(function (r) { return r.pre === first; })) return 'flat';
    return null;
  }

  /*
   * Everything the page and its sentence need, in one place so the two can
   * never disagree. `spend` is what the test spent in the treated markets (0
   * for none given); `plannedRho` is the pre-period correlation the test was
   * designed with, or null.
   */
  function analyse(v) {
    var reason = invalid(v.rows);
    if (reason) return { invalid: reason };

    var fit = ancova(v.rows, v.alpha);
    if (!fit || !(fit.se > 0)) return { invalid: 'flat' };

    var nT = 0, treatedPost = 0;
    v.rows.forEach(function (r) {
      if (r.group === 'treat') { nT++; treatedPost += r.post; }
    });
    var n = v.rows.length;
    var incremental = fit.b * nT;
    var rho = withinRho(v.rows);
    var r = {
      invalid: null,
      n: n,
      nTreat: nT,
      nControl: n - nT,
      alpha: v.alpha,
      fit: fit,
      incremental: incremental,
      ciIncremental: { lo: fit.ci.lo * nT, hi: fit.ci.hi * nT },
      spend: v.spend,
      iroas: null,
      ciIroas: null,
      relative: incremental / (treatedPost - incremental),
      significant: fit.p < v.alpha,
      rho: rho,
      preCv: preCv(v.rows),
      plannedRho: v.plannedRho,
      noiseFactor: null
    };
    if (v.spend > 0) {
      r.iroas = incremental / v.spend;
      r.ciIroas = { lo: r.ciIncremental.lo / v.spend, hi: r.ciIncremental.hi / v.spend };
    }
    /* How much noisier the test came out than it was designed to be: the ratio
     * of the standard errors the two correlations imply, the rest equal. */
    if (v.plannedRho !== null && v.plannedRho > 0 && isFinite(rho)) {
      var realised = Math.min(Math.abs(rho), 0.999999);
      r.noiseFactor = Math.sqrt((1 - realised * realised) /
                                (1 - v.plannedRho * v.plannedRho));
    }
    return r;
  }

  return {
    ancova: ancova,
    withinRho: withinRho,
    preCv: preCv,
    analyse: analyse
  };
})();
