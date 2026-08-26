/*
 * stats.js - numeric primitives for the experimentation calculator suite.
 *
 * No dependencies and no build step, by design. Every routine below is a
 * published algorithm, named in its comment, and every one is cross-checked
 * against scipy/statsmodels in validation/ before the tool using it ships.
 */
var Stats = (function () {
  'use strict';

  var SQRT_2PI = 2.5066282746310002;

  function normalPdf(x) {
    return Math.exp(-0.5 * x * x) / SQRT_2PI;
  }

  /*
   * Cumulative standard normal, Hart (1968) rational approximation in the
   * arrangement published by West (2005), "Better approximations to cumulative
   * normal functions". Accurate to roughly 1e-15 over the whole range, which
   * matters because sample-size formulas evaluate it far into the tail.
   */
  function normalCdf(x) {
    var z = Math.abs(x);
    var c;
    if (z > 37) {
      c = 0;
    } else {
      var e = Math.exp(-z * z / 2);
      var n, d;
      if (z < 7.07106781186547) {
        n = 3.52624965998911e-02 * z + 0.700383064443688;
        n = n * z + 6.37396220353165;
        n = n * z + 33.912866078383;
        n = n * z + 112.079291497871;
        n = n * z + 221.213596169931;
        n = n * z + 220.206867912376;
        d = 8.83883476483184e-02 * z + 1.75566716318264;
        d = d * z + 16.064177579207;
        d = d * z + 86.7807322029461;
        d = d * z + 296.564248779674;
        d = d * z + 637.333633378831;
        d = d * z + 793.826512519948;
        d = d * z + 440.413735824752;
        c = e * n / d;
      } else {
        n = z + 0.65;
        n = z + 4 / n;
        n = z + 3 / n;
        n = z + 2 / n;
        n = z + 1 / n;
        c = e / (n * SQRT_2PI);
      }
    }
    return x > 0 ? 1 - c : c;
  }

  var ACKLAM_A = [-3.969683028665376e+01, 2.209460984245205e+02,
                  -2.759285104469687e+02, 1.383577518672690e+02,
                  -3.066479806614716e+01, 2.506628277459239e+00];
  var ACKLAM_B = [-5.447609879822406e+01, 1.615858368580409e+02,
                  -1.556989798598866e+02, 6.680131188771972e+01,
                  -1.328068155288572e+01];
  var ACKLAM_C = [-7.784894002430293e-03, -3.223964580411365e-01,
                  -2.400758277161838e+00, -2.549732539343734e+00,
                  4.374664141464968e+00, 2.938163982698783e+00];
  var ACKLAM_D = [7.784695709041462e-03, 3.224671290700398e-01,
                  2.445134137142996e+00, 3.754408661907416e+00];

  /*
   * Inverse standard normal CDF: Acklam's rational approximation (relative
   * error ~1.15e-9) followed by one Halley step against normalCdf.
   *
   * Always solved in the lower tail and mirrored, because the Halley step
   * differences normalCdf(x) against p: for p near 1 both are near 1 and the
   * subtraction would cancel away the correction it is meant to apply.
   */
  function normalQuantile(p) {
    if (!(p > 0 && p < 1)) return NaN;
    if (p > 0.5) return -normalQuantileLower(1 - p);
    return normalQuantileLower(p);
  }

  function normalQuantileLower(p) {
    var q, r, x;
    var pLow = 0.02425;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q +
             ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
          ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q +
            ACKLAM_D[3]) * q + 1);
    } else if (p <= 1 - pLow) {
      q = p - 0.5;
      r = q * q;
      x = (((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r +
             ACKLAM_A[3]) * r + ACKLAM_A[4]) * r + ACKLAM_A[5]) * q /
          (((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r +
             ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q +
              ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
           ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q +
             ACKLAM_D[3]) * q + 1);
    }
    var e = normalCdf(x) - p;
    var u = e * SQRT_2PI * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }

  var LANCZOS = [676.5203681218851, -1259.1392167224028,
                 771.32342877765313, -176.61502916214059,
                 12.507343278686905, -0.13857109526572012,
                 9.9843695780195716e-6, 1.5056327351493116e-7];

  /* Log gamma, Lanczos approximation (g=7, n=9) with the reflection formula. */
  function logGamma(x) {
    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    var a = 0.99999999999980993;
    var t = x + 7.5;
    for (var i = 0; i < 8; i++) {
      a += LANCZOS[i] / (x + i + 1);
    }
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /* Continued fraction for the incomplete beta, evaluated by Lentz's method. */
  function betacf(x, a, b) {
    var MAXIT = 300, EPS = 3e-16, FPMIN = 1e-300;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  /* Regularized incomplete beta I_x(a,b). */
  function incompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lbeta = logGamma(a + b) - logGamma(a) - logGamma(b) +
                a * Math.log(x) + b * Math.log(1 - x);
    if (x < (a + 1) / (a + b + 2)) {
      return Math.exp(lbeta) * betacf(x, a, b) / a;
    }
    return 1 - Math.exp(lbeta) * betacf(1 - x, b, a) / b;
  }

  /*
   * Student t CDF via the incomplete beta identity, in whichever of its two
   * equivalent forms keeps the beta argument below 1/2.
   *
   * The textbook single form x = nu/(nu+t^2) is unusable near t=0 for large nu:
   * t^2 becomes negligible against nu, x rounds to exactly 1, and the CDF comes
   * back flat at 0.5 over a whole neighbourhood of the origin - which in turn
   * caps how finely tQuantile can bisect. Swapping to x = t^2/(nu+t^2) there
   * keeps every significant digit.
   */
  function tCdf(t, nu) {
    if (t === 0) return 0.5;
    if (t * t < nu) {
      var xc = t * t / (nu + t * t);
      var half = 0.5 * incompleteBeta(xc, 0.5, nu / 2);
      return t > 0 ? 0.5 + half : 0.5 - half;
    }
    var xt = nu / (nu + t * t);
    var tail = 0.5 * incompleteBeta(xt, nu / 2, 0.5);
    return t > 0 ? 1 - tail : tail;
  }

  /* Student t quantile by bisection on tCdf. */
  function tQuantile(p, nu) {
    if (!(p > 0 && p < 1)) return NaN;
    var lo = -300, hi = 300;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (tCdf(mid, nu) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-14) break;
    }
    return (lo + hi) / 2;
  }

  /*
   * Noncentral t CDF. Using T = (Z + delta) / sqrt(V/nu) with Z standard normal
   * and V chi-square on nu df, P(T <= t) = E_W[Phi(t*W/sqrt(nu) - delta)] where
   * W = sqrt(V) follows a chi distribution. Integrating in W rather than V
   * removes the singularity chi-square has at the origin for small nu, which is
   * exactly the regime geo tests live in.
   *
   * Composite Simpson over +/-9 units around sqrt(nu). The chi distribution's
   * sd stays below 1 for every nu, so 9 units is far past where the density
   * underflows, while a wider window would only spend nodes on nothing and
   * coarsen h where the mass actually is.
   */
  function noncentralTCdf(t, nu, delta) {
    var lo = Math.max(0, Math.sqrt(nu) - 9);
    var hi = Math.sqrt(nu) + 9;
    var n = 4000;
    var h = (hi - lo) / n;
    var logNorm = (nu / 2 - 1) * Math.LN2 + logGamma(nu / 2);
    var sqrtNu = Math.sqrt(nu);
    var sum = 0;
    for (var i = 0; i <= n; i++) {
      var w = lo + i * h;
      var f = 0;
      if (w > 0) {
        var logDens = (nu - 1) * Math.log(w) - w * w / 2 - logNorm;
        f = Math.exp(logDens) * normalCdf(t * w / sqrtNu - delta);
      }
      var coef = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
      sum += coef * f;
    }
    return sum * h / 3;
  }

  var spareNormal = null;

  /* Standard normal deviate, Marsaglia polar method (no trig, one cached spare). */
  function randNormal() {
    if (spareNormal !== null) {
      var s = spareNormal;
      spareNormal = null;
      return s;
    }
    var u, v, s2;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s2 = u * u + v * v;
    } while (s2 >= 1 || s2 === 0);
    var mul = Math.sqrt(-2 * Math.log(s2) / s2);
    spareNormal = v * mul;
    return u * mul;
  }

  /*
   * Seeded generator, for demonstrations that redraw as a control is dragged.
   * With Math.random the whole sample would resample on every frame and the
   * picture would boil, hiding the one thing the control is meant to show.
   * mulberry32, then Marsaglia polar for normals.
   */
  function makeRng(seed) {
    var state = seed >>> 0;
    var spare = null;

    function uniform() {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function normal() {
      if (spare !== null) {
        var s = spare;
        spare = null;
        return s;
      }
      var u, v, s2;
      do {
        u = uniform() * 2 - 1;
        v = uniform() * 2 - 1;
        s2 = u * u + v * v;
      } while (s2 >= 1 || s2 === 0);
      var mul = Math.sqrt(-2 * Math.log(s2) / s2);
      spare = v * mul;
      return u * mul;
    }

    return { uniform: uniform, normal: normal };
  }

  /*
   * Bisection root-finder. Deliberately not Newton: the functions it is pointed
   * at here (sample size in the effect size, crossing probability in the
   * boundary) have no cheap derivative, and bisection cannot diverge.
   */
  function bisect(f, lo, hi, tol, maxIter) {
    tol = tol === undefined ? 1e-12 : tol;
    maxIter = maxIter === undefined ? 200 : maxIter;
    var flo = f(lo);
    var fhi = f(hi);
    if (flo === 0) return lo;
    if (fhi === 0) return hi;
    if (flo * fhi > 0) return NaN;
    var mid = lo;
    for (var i = 0; i < maxIter; i++) {
      mid = (lo + hi) / 2;
      var fmid = f(mid);
      if (fmid === 0 || (hi - lo) / 2 < tol) return mid;
      if (fmid * flo > 0) {
        lo = mid;
        flo = fmid;
      } else {
        hi = mid;
      }
    }
    return mid;
  }

  return {
    normalPdf: normalPdf,
    normalCdf: normalCdf,
    normalQuantile: normalQuantile,
    logGamma: logGamma,
    incompleteBeta: incompleteBeta,
    tCdf: tCdf,
    tQuantile: tQuantile,
    noncentralTCdf: noncentralTCdf,
    randNormal: randNormal,
    makeRng: makeRng,
    bisect: bisect
  };
})();
