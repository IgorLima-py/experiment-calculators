"""Reference values for tool 7, the geo test readout, from statsmodels OLS.

Run this, then `node check_tool7.js`. Pinned: statsmodels 0.14.6 / numpy 2.4.3
(see README.md).

The readout fits the model tool 4 designs for: markets are the units, and each
market's pre-period is a covariate,

    post_i = a + b * treat_i + c * pre_i + e_i,

by ordinary least squares with the classical (homoskedastic) standard error
and a t distribution on n - 3 degrees of freedom. b is the effect per treated
market, so the incremental revenue is b times the number of treated markets,
and the iROAS is that divided by the spend, with the interval scaled the same
way (the spend is a known constant, not an estimate).

The references here are statsmodels' OLS on the raw, uncentred pre-period. The
page centres the pre-period before solving, which changes the intercept and
nothing else; matching statsmodels on the treatment coefficient is the check
that it really changes nothing else.

Recorded only for the published comparison, never shown on the page:
- the heteroskedasticity-robust HC1 standard error of the same fit;
- weighted least squares with weights 1/pre, the geo-based regression of Vaver
  & Koehler (2011), which lets big markets be noisier;
- the plain difference in means (post ~ treat), to show how much the
  pre-period covariate bought.

The data are synthetic, generated with fixed seeds and rounded to whole
numbers, as pasted data would be. Market sizes are lognormal(11, 0.8), the same
shape reference_tool4.py uses for its paste helper.
"""
import json
import math
import os

import numpy as np
import statsmodels.api as sm
from scipy.optimize import brentq
from scipy.stats import lognorm

HERE = os.path.dirname(os.path.abspath(__file__))

GROWTH = 1.03     # every market grows 3% from the pre-period to the test


def generate(seed, n, n_control, lift, noise, imbalanced=False):
    """Pre and post revenue for n markets, the first n_control of a random
    permutation held out. `lift` is the true relative effect in the treated
    markets, `noise` the market-level relative noise between the two periods.
    With `imbalanced`, the largest markets are held out instead, so the groups
    differ before the test starts."""
    rng = np.random.default_rng(seed)
    size = rng.lognormal(mean=11.0, sigma=0.8, size=n)
    if imbalanced:
        order = np.argsort(-size)
    else:
        order = rng.permutation(n)
    treat = np.ones(n, dtype=int)
    treat[order[:n_control]] = 0
    pre = np.round(size)
    post = np.round(size * GROWTH * (1 + rng.normal(0.0, noise, size=n)) *
                    (1 + lift * treat))
    true_incremental = float(np.sum(size * GROWTH * lift * treat))
    return treat, pre, post, true_incremental


# (name, seed, markets, held out, true lift, noise, alpha, true iROAS, imbalanced)
# The spend is set so that the true iROAS is the one listed; the estimate is
# whatever the noise makes of it. The first row is the page's example.
DATASETS = [
    ("example", 20260929, 40, 10, 0.05, 0.04, 0.10, 2.5, False),
    ("few markets", 11, 10, 5, 0.08, 0.04, 0.10, 3.0, False),
    ("all US DMAs", 210, 210, 30, 0.03, 0.05, 0.05, 1.8, False),
    ("no effect", 404, 40, 20, 0.0, 0.05, 0.10, None, False),
    ("biggest markets held out", 5, 30, 8, 0.05, 0.04, 0.20, 2.0, True),
]

# With no true effect there is no spend to back out; this is a round figure
# of the order the other rows use.
NULL_SPEND = 250000.0


def partial_rho(treat, pre, post):
    """Correlation of pre and post after removing each group's mean: the
    pre-period correlation within groups, which is what tool 4's (1 - rho^2)
    describes. Computed from residuals, independently of the page's route."""
    X = sm.add_constant(treat.astype(float))
    rp = sm.OLS(pre, X).fit().resid
    rq = sm.OLS(post, X).fit().resid
    return float(np.corrcoef(rp, rq)[0, 1])


def names(n):
    width = len(str(n))
    return [f"Market {str(i + 1).zfill(width)}" for i in range(n)]


def as_text(treat, pre, post):
    """The page's paste format: name, group, pre, post, one market a line."""
    labels = names(len(pre))
    lines = ["market     group    pre      post"]
    for name, t, a, b in zip(labels, treat, pre, post):
        group = "test" if t else "control"
        lines.append(f"{name:<10} {group:<8} {int(a):<8} {int(b)}")
    return "\n".join(lines)


rows = []
for name, seed, n, n_control, lift, noise, alpha, iroas, imbalanced in DATASETS:
    treat, pre, post, true_incr = generate(seed, n, n_control, lift, noise, imbalanced)
    spend = NULL_SPEND if iroas is None else float(round(true_incr / iroas, -3))
    n_treat = int(treat.sum())

    X = sm.add_constant(np.column_stack([treat.astype(float), pre]))
    fit = sm.OLS(post, X).fit()
    ci = fit.conf_int(alpha=alpha)[1]
    b, se = float(fit.params[1]), float(fit.bse[1])

    hc1 = sm.OLS(post, X).fit(cov_type="HC1")
    wls = sm.WLS(post, X, weights=1.0 / pre).fit()
    diff = sm.OLS(post, sm.add_constant(treat.astype(float))).fit()

    rows.append({
        "name": name,
        "seed": seed,
        "alpha": alpha,
        "spend": spend,
        "true_lift": lift,
        "true_iroas": iroas,
        "groups": ["test" if t else "control" for t in treat],
        "pre": [float(x) for x in pre],
        "post": [float(x) for x in post],
        "n": n,
        "n_treat": n_treat,
        "n_control": n - n_treat,
        "df": float(fit.df_resid),
        "b": b,
        "se": se,
        "t": float(fit.tvalues[1]),
        "p": float(fit.pvalues[1]),
        "ci": [float(ci[0]), float(ci[1])],
        "incremental": b * n_treat,
        "incremental_ci": [float(ci[0]) * n_treat, float(ci[1]) * n_treat],
        "iroas": b * n_treat / spend,
        "iroas_ci": [float(ci[0]) * n_treat / spend, float(ci[1]) * n_treat / spend],
        "treated_post": float(post[treat == 1].sum()),
        "rho": partial_rho(treat, pre, post),
        "pre_cv": float(np.std(pre, ddof=1) / np.mean(pre)),
        "hc1_se": float(hc1.bse[1]),
        "wls_b": float(wls.params[1]),
        "wls_se": float(wls.bse[1]),
        "diff_b": float(diff.params[1]),
        "diff_se": float(diff.bse[1]),
    })

# ---- the MMM prior: a lognormal with the iROAS as its mean and the iROAS's
# standard error as its standard deviation ----
#
# The page solves this in closed form. The reference does not: it asks
# scipy.stats.lognorm for the shape whose coefficient of variation is sd/mean
# (a root-find on scipy's own .std()/.mean(), scale 1), then for the scale
# that puts the mean where it belongs. So the two routes share nothing but the
# definition of the distribution.

def lognormal_by_scipy(mean, sd, level):
    target = sd / mean

    def gap(s):
        d = lognorm(s=s)
        return d.std() / d.mean() - target

    sigma = brentq(gap, 1e-6, 10.0, xtol=1e-300, rtol=4 * np.finfo(float).eps,
                   maxiter=500)
    scale = mean / lognorm(s=sigma).mean()
    d = lognorm(s=sigma, scale=scale)
    tail = (1 - level) / 2
    return {
        "mean_in": mean,
        "sd_in": sd,
        "level": level,
        "mu": float(math.log(scale)),
        "sigma": float(sigma),
        "scipy_mean": float(d.mean()),
        "scipy_std": float(d.std()),
        "scipy_median": float(d.median()),
        "scipy_interval": [float(d.ppf(tail)), float(d.ppf(1 - tail))],
    }


# One case per data set whose iROAS is above zero, at its own alpha, plus a
# grid of coefficients of variation from 1% to 500% at three means. Below a
# coefficient of variation of about 1% scipy's own .std() loses digits (it
# forms exp(s^2) - 1 without expm1), so the grid stops there.
prior_cases = []
for r in rows:
    if r["iroas"] > 0:
        se_iroas = r["se"] * r["n_treat"] / r["spend"]
        case = lognormal_by_scipy(r["iroas"], se_iroas, 1 - r["alpha"])
        case["name"] = r["name"]
        prior_cases.append(case)
for mean in (0.05, 2.0, 50.0):
    for cv in (0.01, 0.1, 0.3, 0.5, 1.0, 2.0, 5.0):
        case = lognormal_by_scipy(mean, mean * cv, 0.9)
        case["name"] = f"mean {mean:g}, cv {cv:g}"
        prior_cases.append(case)

worst_moment = max(max(abs(c["scipy_mean"] / c["mean_in"] - 1),
                       abs(c["scipy_std"] / c["sd_in"] - 1)) for c in prior_cases)

example = rows[0]
ex_treat = np.array([1 if g == "test" else 0 for g in example["groups"]])
example_text = as_text(ex_treat, np.array(example["pre"]), np.array(example["post"]))

out = os.path.join(HERE, "reference_tool7.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"datasets": rows, "example_text": example_text,
               "prior_cases": prior_cases}, fh, indent=1)

print("wrote", out, f"({len(rows)} datasets, {len(prior_cases)} prior cases)")
print(f"lognormal root-find: worst relative miss on the mean or sd {worst_moment:.1e}")
print()
hdr = (f"{'dataset':<26} {'n':>4} {'nT':>4} {'a':>5} | {'b':>10} {'se':>9} "
       f"{'p':>7} {'iROAS':>6} {'CI':>15} {'rho':>6} | {'HC1 se':>9} {'WLS b':>10} {'diff se':>9}")
print(hdr)
print("-" * len(hdr))
for r in rows:
    print(f"{r['name']:<26} {r['n']:>4} {r['n_treat']:>4} {r['alpha']:>5} | "
          f"{r['b']:>10.1f} {r['se']:>9.1f} {r['p']:>7.4f} {r['iroas']:>6.2f} "
          f"{r['iroas_ci'][0]:>7.2f}..{r['iroas_ci'][1]:<6.2f} {r['rho']:>6.3f} | "
          f"{r['hc1_se']:>9.1f} {r['wls_b']:>10.1f} {r['diff_se']:>9.1f}")
