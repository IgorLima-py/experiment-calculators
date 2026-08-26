"""Reference sample sizes for tool 1, from statsmodels plus a verbatim port of
Evan Miller's formula.

Run this, then `node check_tool1.js`. Pinned: statsmodels 1.14.6 / scipy 1.17.1
(see README.md).
"""
import json
import math
import os

from scipy.stats import norm
from statsmodels.stats.proportion import (
    power_proportions_2indep,
    samplesize_proportions_2indep_onetail,
)

HERE = os.path.dirname(os.path.abspath(__file__))


def evan_miller(alpha, power, p, delta):
    """Verbatim port of num_subjects() in evanmiller.org/ab-testing/sample-size-fixed.js"""
    if p > 0.5:
        p = 1.0 - p
    t_alpha2 = norm.ppf(1.0 - alpha / 2)
    t_beta = norm.ppf(power)
    sd1 = math.sqrt(2 * p * (1 - p))
    sd2 = math.sqrt(p * (1 - p) + (p + delta) * (1 - p - delta))
    return (t_alpha2 * sd1 + t_beta * sd2) ** 2 / delta ** 2


# (baseline, absolute effect, alpha, power, tails)
CASES = [
    (0.20, 0.05,  0.05, 0.80, 2),   # Evan Miller's own defaults
    (0.20, 0.05,  0.05, 0.90, 2),
    (0.10, 0.02,  0.05, 0.80, 2),
    (0.05, 0.005, 0.05, 0.80, 2),   # this suite's defaults: 5% baseline, 10% relative
    (0.05, 0.01,  0.05, 0.80, 2),
    (0.05, 0.01,  0.01, 0.90, 2),
    (0.03, 0.006, 0.05, 0.80, 2),
    (0.50, 0.05,  0.05, 0.80, 2),
    (0.70, 0.05,  0.05, 0.80, 2),   # above 0.5, where Evan Miller folds p
    (0.20, 0.05,  0.05, 0.80, 1),
    (0.05, 0.01,  0.05, 0.80, 1),
    (0.02, 0.002, 0.05, 0.80, 2),
]

rows = []
for p1, delta, alpha, power, tails in CASES:
    alternative = "two-sided" if tails == 2 else "larger"
    sm_n = float(samplesize_proportions_2indep_onetail(
        diff=delta, prop2=p1, power=power, ratio=1, alpha=alpha,
        value=0, alternative=alternative))
    # Power that statsmodels reports back at that n, as a round-trip check.
    sm_power = float(power_proportions_2indep(
        diff=delta, prop2=p1, nobs1=sm_n, ratio=1, alpha=alpha, value=0,
        alternative=alternative, return_results=False))
    rows.append({
        "p1": p1, "delta": delta, "alpha": alpha, "power": power, "tails": tails,
        "statsmodels_n": sm_n,
        "statsmodels_power_at_n": sm_power,
        "evan_miller_n": evan_miller(alpha, power, p1, delta) if tails == 2 else None,
    })

out = os.path.join(HERE, "reference_tool1.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(rows, fh, indent=1)

print("wrote", out, f"({len(rows)} cases)")
print()
hdr = f"{'p1':>6} {'delta':>7} {'alpha':>6} {'power':>6} {'tails':>5} | {'statsmodels':>12} {'EvanMiller':>11} {'gap':>7}"
print(hdr)
print("-" * len(hdr))
for r in rows:
    em = r["evan_miller_n"]
    gap = f"{(r['statsmodels_n'] / em - 1) * 100:+.1f}%" if em else "-"
    em_s = f"{em:11.1f}" if em else " " * 11
    print(f"{r['p1']:>6} {r['delta']:>7} {r['alpha']:>6} {r['power']:>6} "
          f"{r['tails']:>5} | {r['statsmodels_n']:>12.1f} {em_s} {gap:>7}")
