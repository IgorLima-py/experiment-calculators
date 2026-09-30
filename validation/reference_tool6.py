"""Reference values for tool 6, the test readout, from statsmodels, scipy and a
numpy Monte Carlo.

Run this, then `node check_tool6.js`. Pinned: statsmodels 0.14.6 / scipy 1.17.1
(see README.md).

Four things are checked, each against an implementation that shares no code
with the page:

- the sample ratio mismatch test, against scipy.stats.chisquare with the
  expected counts taken from the planned split;
- the p-value, against statsmodels' proportions_ztest;
- the intervals, against statsmodels' confint_proportions_2indep (Newcombe for
  the difference, the log method for the ratio; Wald and the log-adjusted
  ratio are recorded too, only to publish how far they sit from the ones used);
- the type M error, against Lu, Qiu & Deng's closed form evaluated here in
  scipy, against a seeded Monte Carlo in numpy, and against two figures
  Gelman & Carlin (2014) print.
"""
import json
import math
import os

import numpy as np
from scipy.stats import chisquare, norm
from statsmodels.stats.proportion import (
    confint_proportions_2indep,
    proportions_ztest,
)

HERE = os.path.dirname(os.path.abspath(__file__))

# (control users, control conversions, variant users, variant conversions,
#  planned share in control, alpha)
READOUTS = [
    (31500, 1575, 31500, 1740, 0.5, 0.05),   # a test the size tool 1 plans at its defaults
    (10000, 500, 10800, 560, 0.5, 0.05),     # the SRM case: 800 users short on a 50/50 plan
    (90000, 4500, 10000, 540, 0.9, 0.05),    # 90/10 planned, 90/10 observed: no SRM
    (90000, 4500, 10000, 540, 0.5, 0.05),    # the same traffic read against a 50/50 plan
    (4000, 200, 4000, 245, 0.5, 0.05),       # underpowered for a 10% lift
    (200, 5, 200, 12, 0.5, 0.05),            # small arms: Wald and Newcombe part ways
    (50, 0, 50, 6, 0.5, 0.05),               # a zero cell: no ratio interval exists
    (500000, 350000, 500000, 351500, 0.5, 0.05),  # large n, a high rate
    (20000, 1000, 20000, 1100, 0.5, 0.01),
    (20000, 1000, 20000, 1100, 0.5, 0.10),
    (12000, 600, 8000, 470, 0.6, 0.05),      # unequal arms on an unequal plan
    (31500, 1575, 31500, 1500, 0.5, 0.05),   # the variant loses
]


def interval(method, compare, cb, nb, ca, na, alpha):
    lo, hi = confint_proportions_2indep(cb, nb, ca, na, method=method,
                                        compare=compare, alpha=alpha)
    return float(lo), float(hi)


readouts = []
for na, ca, nb, cb, split, alpha in READOUTS:
    total = na + nb
    chi2, srm_p = chisquare([na, nb], f_exp=[total * split, total * (1 - split)])
    z, p = proportions_ztest([cb, ca], [nb, na])
    row = {
        "na": na, "ca": ca, "nb": nb, "cb": cb, "split": split, "alpha": alpha,
        "srm_chi2": float(chi2), "srm_p": float(srm_p),
        "z": float(z), "p": float(p),
        "newcombe": interval("newcomb", "diff", cb, nb, ca, na, alpha),
        "wald": interval("wald", "diff", cb, nb, ca, na, alpha),
        "ratio_log": None,
        "ratio_log_adjusted": None,
    }
    if ca > 0 and cb > 0:
        lo, hi = interval("log", "ratio", cb, nb, ca, na, alpha)
        row["ratio_log"] = (lo - 1, hi - 1)
        lo, hi = interval("log-adjusted", "ratio", cb, nb, ca, na, alpha)
        row["ratio_log_adjusted"] = (lo - 1, hi - 1)
    readouts.append(row)


def closed_form(lam, alpha):
    """Lu, Qiu & Deng (2019), Theorem 1, in the paper's own arrangement."""
    z = norm.ppf(1 - alpha / 2)
    power = 1 - norm.cdf(z - lam) + norm.cdf(-z - lam)
    type_s = norm.cdf(-z - lam) / power
    m = (norm.pdf(lam + z) + norm.pdf(lam - z)
         + lam * (norm.cdf(lam + z) + norm.cdf(lam - z) - 1)) / (
        lam * (1 - norm.cdf(lam + z) + norm.cdf(lam - z)))
    return float(power), float(type_s), float(m)


DRAWS = 1_000_000
rng = np.random.default_rng(20260929)


def monte_carlo(lam, alpha):
    """Gelman & Carlin's own recipe: draw estimates around the true effect,
    keep the significant ones, average their size. Returns the ratio and its
    Monte Carlo standard error."""
    z = norm.ppf(1 - alpha / 2)
    est = rng.normal(lam, 1.0, DRAWS)
    kept = np.abs(est[np.abs(est) > z])
    return (float(kept.mean() / lam),
            float(kept.std(ddof=1) / math.sqrt(kept.size) / lam),
            float(kept.size / DRAWS))


# (true effect over its standard error, alpha)
TYPE_M = [(lam, a) for a in (0.01, 0.05, 0.10)
          for lam in (0.25, 0.5, 1.0, 1.5, 2.0, 2.8, 4.0)]

type_m = []
for lam, alpha in TYPE_M:
    power, type_s, m = closed_form(lam, alpha)
    mc, mc_se, mc_power = monte_carlo(lam, alpha)
    type_m.append({
        "lambda": lam, "alpha": alpha,
        "power": power, "type_s": type_s, "exaggeration": m,
        "mc_exaggeration": mc, "mc_se": mc_se, "mc_power": mc_power,
    })

# Two figures Gelman & Carlin print, as (D, s, alpha, what they report).
# 80% power gives an exaggeration of 1.12; the beauty-and-sex-ratio example,
# a plausible true effect of 0.1 percentage points measured with a standard
# error of 3.3, gives power 0.05, type S 0.46 and exaggeration 77.
published = [
    {"D": 2.8, "s": 1.0, "alpha": 0.05, "exaggeration": 1.12, "digits": 2},
    {"D": 0.1, "s": 3.3, "alpha": 0.05, "exaggeration": 77, "digits": 0,
     "power": 0.05, "type_s": 0.46},
]

# The page's own composition: the planned relative lift taken on the observed
# control rate, against the unpooled standard error of the observed
# difference. (control users, conversions, variant users, conversions,
# planned relative lift, alpha)
PLANNED = [
    (31500, 1575, 31500, 1740, 0.10, 0.05),
    (4000, 200, 4000, 245, 0.10, 0.05),   # the underpowered example on the page
    (4000, 200, 4000, 230, 0.10, 0.05),
    (20000, 1000, 20000, 1100, 0.05, 0.01),
]

planned = []
for na, ca, nb, cb, mde, alpha in PLANNED:
    pa, pb = ca / na, cb / nb
    effect = pa * mde
    se = math.sqrt(pa * (1 - pa) / na + pb * (1 - pb) / nb)
    power, type_s, m = closed_form(effect / se, alpha)
    planned.append({"na": na, "ca": ca, "nb": nb, "cb": cb, "mde": mde,
                    "alpha": alpha, "effect": effect, "se": se,
                    "power": power, "type_s": type_s, "exaggeration": m})

out = os.path.join(HERE, "reference_tool6.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"readouts": readouts, "type_m": type_m, "published": published,
               "planned": planned}, fh, indent=1)

print("wrote", out,
      f"({len(readouts)} readouts, {len(type_m)} type M cases, {DRAWS:,} draws each)")
