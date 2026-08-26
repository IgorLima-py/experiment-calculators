"""Reference values for tool 3, by a route that shares no code with the browser.

The JavaScript uses the Armitage-McPherson recursion: numerical integration of
the sub-density of the running sum. This script instead writes the joint
distribution of the test statistics directly as a multivariate normal and
integrates it with scipy's Genz algorithm. Two unrelated methods landing on the
same numbers is a much stronger claim than either one matching itself.

Also carries the published table values, transcribed from the literature, as a
third check that owes nothing to either implementation.

A note on range. The multivariate route is deliberately capped at 12 looks.
Genz's algorithm is quasi-Monte Carlo, so in high dimensions it gets slow *and*
loses precision - at 50 looks it ran for over twenty minutes without returning a
usable figure. Past 12 looks the recursion is checked against the published
tables and against a million-run Monte Carlo instead, which is the honest split:
each method is used where it is actually trustworthy.

Run this, then `node check_tool3.js`.
"""
import json
import os
import time

import numpy as np
from scipy.optimize import brentq
from scipy.stats import multivariate_normal, norm

HERE = os.path.dirname(os.path.abspath(__file__))
MVN_MAX_LOOKS = 12


def crossing_prob(bounds):
    """P(|Z_k| >= c_k for some k) at equally spaced looks.

    With information accruing evenly, corr(Z_i, Z_j) = sqrt(t_i / t_j).
    """
    k = len(bounds)
    t = np.arange(1, k + 1) / k
    corr = np.sqrt(np.minimum.outer(t, t) / np.maximum.outer(t, t))
    b = np.asarray(bounds, dtype=float)
    mvn = multivariate_normal(mean=np.zeros(k), cov=corr, allow_singular=True, seed=1)
    return 1 - mvn.cdf(b, lower_limit=-b)


# Published values. Sources:
#   Armitage, McPherson & Rowe (1969), JRSS-A 132:235-244, as quoted in
#     Lakens, "Statistical Inferences" ch.10 (open textbook).
#   Pocock (1977), Biometrika 64:191-199.
#   O'Brien & Fleming (1979), Biometrics 35:549-556.
PUBLISHED_INFLATION = {1: 0.05, 2: 0.083, 3: 0.107, 4: 0.126, 5: 0.142,
                       10: 0.193, 20: 0.248, 50: 0.320}
PUBLISHED_POCOCK = {2: 2.178, 3: 2.289, 4: 2.361, 5: 2.413, 10: 2.555}
PUBLISHED_OBF = {3: [3.471, 2.454, 2.004],
                 5: [4.562, 3.226, 2.634, 2.281, 2.040]}

ALPHA = 0.05
z_nominal = float(norm.ppf(1 - ALPHA / 2))

started = time.time()


def log(msg):
    print(f"[{time.time() - started:6.1f}s] {msg}", flush=True)


inflation = []
for k in [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50]:
    row = {"looks": k, "nominal_alpha": ALPHA,
           "mvn": None, "published": PUBLISHED_INFLATION.get(k)}
    if k <= MVN_MAX_LOOKS:
        row["mvn"] = float(crossing_prob([z_nominal] * k))
    inflation.append(row)
log(f"inflation done ({len(inflation)} rows)")

pocock = []
for k in [2, 3, 4, 5, 6, 8, 10]:
    c = float(brentq(lambda c: crossing_prob([c] * k) - ALPHA, 1.9, 3.5, xtol=1e-6))
    pocock.append({"looks": k, "target_alpha": ALPHA, "mvn": c,
                   "per_look_alpha": float(2 * norm.sf(c)),
                   "published": PUBLISHED_POCOCK.get(k)})
    log(f"pocock k={k} -> {c:.4f}")

obf = []
for k in [2, 3, 4, 5, 8]:
    def excess(C, k=k):
        return crossing_prob([C * np.sqrt(k / i) for i in range(1, k + 1)]) - ALPHA
    C = float(brentq(excess, 1.6, 2.6, xtol=1e-6))
    obf.append({"looks": k, "target_alpha": ALPHA,
                "mvn": [float(C * np.sqrt(k / i)) for i in range(1, k + 1)],
                "published": PUBLISHED_OBF.get(k)})
    log(f"obf k={k} -> C={C:.4f}")

# A few non-default alphas, to show the recursion is not tuned to 0.05.
other_alphas = []
for alpha in [0.01, 0.10]:
    z = float(norm.ppf(1 - alpha / 2))
    for k in [3, 5, 10]:
        c = float(brentq(lambda c: crossing_prob([c] * k) - alpha, 1.9, 4.5, xtol=1e-6))
        other_alphas.append({"looks": k, "nominal_alpha": alpha,
                             "mvn_inflation": float(crossing_prob([z] * k)),
                             "mvn_pocock": c})
        log(f"alpha={alpha} k={k} -> pocock {c:.4f}")

out = os.path.join(HERE, "reference_tool3.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"inflation": inflation, "pocock": pocock, "obf": obf,
               "other_alphas": other_alphas, "mvn_max_looks": MVN_MAX_LOOKS}, fh, indent=1)

log(f"wrote {out}")
print()
print(f"{'looks':>6} | {'MVN route':>10} {'published':>10}")
print("-" * 30)
for r in inflation:
    mvn = f"{r['mvn']:.4f}" if r["mvn"] is not None else "(skipped)"
    pub = f"{r['published']:.3f}" if r["published"] else "-"
    print(f"{r['looks']:>6} | {mvn:>10} {pub:>10}")
