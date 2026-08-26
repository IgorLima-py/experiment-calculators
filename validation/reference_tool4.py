"""Reference values for tool 4 (geo holdout power).

Two references, because the tool makes two separate claims:

1. That its power figure is the exact noncentral-t power for a two-sample
   comparison with markets as units. Checked against statsmodels'
   TTestIndPower, which is an independent implementation of the same quantity,
   and against a direct scipy.stats.nct call.
2. That the detectable-effect formula inverts that correctly. Checked by
   feeding the returned effect back through the power calculation and
   confirming it lands on the requested power.

Translation between this tool's inputs and Cohen's d: the market-level metric
has standard deviation cv x mean and the difference in means is lift x mean, so
d = lift / cv_eff, with cv_eff = cv x sqrt(1 - rho^2).

Run this, then `node check_tool4.js`.
"""
import json
import math
import os

import numpy as np
from scipy.stats import nct, t as student_t
from statsmodels.stats.power import TTestIndPower

HERE = os.path.dirname(os.path.abspath(__file__))


def scipy_power(n_treat, n_control, cv, rho, lift, alpha):
    cv_eff = cv * math.sqrt(1 - rho ** 2)
    se = cv_eff * math.sqrt(1 / n_treat + 1 / n_control)
    df = n_treat + n_control - 2
    ncp = abs(lift) / se
    t_crit = student_t.ppf(1 - alpha / 2, df)
    return float(nct.sf(t_crit, df, ncp) + nct.cdf(-t_crit, df, ncp))


def statsmodels_power(n_treat, n_control, cv, rho, lift, alpha):
    cv_eff = cv * math.sqrt(1 - rho ** 2)
    d = abs(lift) / cv_eff
    return float(TTestIndPower().power(
        effect_size=d, nobs1=n_treat, alpha=alpha,
        ratio=n_control / n_treat, alternative="two-sided"))


def scipy_mde(n_treat, n_control, cv, rho, alpha, power):
    cv_eff = cv * math.sqrt(1 - rho ** 2)
    se = cv_eff * math.sqrt(1 / n_treat + 1 / n_control)
    df = n_treat + n_control - 2
    return float((student_t.ppf(1 - alpha / 2, df) +
                  student_t.ppf(power, df)) * se)


# (total markets, held out, cv, rho, expected lift, alpha, target power)
CASES = [
    (40, 10, 0.10, 0.00, 0.10, 0.10, 0.80),   # this tool's defaults
    (40, 20, 0.10, 0.00, 0.10, 0.10, 0.80),   # even split
    (40,  5, 0.10, 0.00, 0.10, 0.10, 0.80),   # small holdout
    (40, 10, 0.10, 0.70, 0.10, 0.10, 0.80),   # with pre-period adjustment
    (20,  6, 0.15, 0.00, 0.15, 0.10, 0.80),
    (12,  6, 0.20, 0.00, 0.25, 0.10, 0.80),   # few markets, small df
    (10,  5, 0.25, 0.50, 0.30, 0.05, 0.80),
    (100, 25, 0.08, 0.00, 0.05, 0.05, 0.90),
    (210, 30, 0.12, 0.60, 0.04, 0.05, 0.80),  # all US DMAs
    (8,   4, 0.30, 0.00, 0.50, 0.10, 0.80),   # tiny, df = 6
    (60, 30, 0.05, 0.00, 0.02, 0.01, 0.95),
    (40, 10, 0.10, 0.00, 0.03, 0.10, 0.80),   # underpowered on purpose
]

rows = []
for total, holdout, cv, rho, lift, alpha, power in CASES:
    treat = total - holdout
    rows.append({
        "total": total, "holdout": holdout, "treat": treat,
        "cv": cv, "rho": rho, "lift": lift, "alpha": alpha, "power": power,
        "scipy_power": scipy_power(treat, holdout, cv, rho, lift, alpha),
        "statsmodels_power": statsmodels_power(treat, holdout, cv, rho, lift, alpha),
        "scipy_mde": scipy_mde(treat, holdout, cv, rho, alpha, power),
    })

# Descriptive statistics for the paste-your-data helper.
rng = np.random.default_rng(7)
base = rng.lognormal(mean=11.0, sigma=0.8, size=25)
prior = base * rng.normal(loc=1.0, scale=0.06, size=25)
paste = {
    "values": [float(x) for x in base],
    "priors": [float(x) for x in prior],
    "mean": float(np.mean(base)),
    "sd": float(np.std(base, ddof=1)),
    "cv": float(np.std(base, ddof=1) / np.mean(base)),
    "rho": float(np.corrcoef(base, prior)[0, 1]),
}

out = os.path.join(HERE, "reference_tool4.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"cases": rows, "paste": paste}, fh, indent=1)

print("wrote", out, f"({len(rows)} cases)")
print()
hdr = f"{'N':>4} {'out':>4} {'cv':>6} {'rho':>5} {'lift':>6} | {'scipy pw':>9} {'statsmodels':>11} {'MDE':>8}"
print(hdr)
print("-" * len(hdr))
for r in rows:
    print(f"{r['total']:>4} {r['holdout']:>4} {r['cv']:>6} {r['rho']:>5} "
          f"{r['lift']:>6} | {r['scipy_power']:>9.5f} {r['statsmodels_power']:>11.5f} "
          f"{r['scipy_mde'] * 100:>7.3f}%")
