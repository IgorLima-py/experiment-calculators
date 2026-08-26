"""Reference minimum detectable effects for tool 2.

Two independent routes, because agreeing with one implementation proves less
than agreeing with two that were derived differently:

1. Invert statsmodels' own sample-size function numerically. This is the
   ground truth the tool is required to match.
2. Cohen's h via NormalIndPower, back-transformed to a rate difference. This
   is an arcsine-stabilised approximation rather than the same formula, so it
   is expected to differ slightly - the published gap is the point.

Run this, then `node check_tool2.js`.
"""
import json
import math
import os

from scipy.optimize import brentq
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import samplesize_proportions_2indep_onetail

HERE = os.path.dirname(os.path.abspath(__file__))


def sm_sample_size(p1, delta, alpha, power, tails):
    alt = "two-sided" if tails == 2 else "larger"
    return float(samplesize_proportions_2indep_onetail(
        diff=delta, prop2=p1, power=power, ratio=1, alpha=alpha,
        value=0, alternative=alt))


def sm_mde(p1, n, alpha, power, tails):
    """Invert the sample-size function for the effect."""
    hi = (1 - p1) * 0.999999
    f = lambda d: sm_sample_size(p1, d, alpha, power, tails) - n
    if f(hi) > 0:
        return None
    return float(brentq(f, 1e-10, hi, xtol=1e-14))


def cohen_h_mde(p1, n, alpha, power, tails):
    """Cohen's h route, back-transformed to a difference in rates."""
    alt = "two-sided" if tails == 2 else "larger"
    h = float(NormalIndPower().solve_power(
        nobs1=n, alpha=alpha, power=power, ratio=1, alternative=alt))
    p2 = math.sin(math.asin(math.sqrt(p1)) + h / 2) ** 2
    return p2 - p1


# (baseline, n per variant, alpha, power, tails)
CASES = [
    (0.05, 14000.0, 0.05, 0.80, 2),   # this tool's defaults: 2000/day for 14 days
    (0.20,  1093.7, 0.05, 0.80, 2),   # should recover 0.05, the tool 1 case
    (0.10,  3840.8, 0.05, 0.80, 2),   # should recover 0.02
    (0.05,  8157.7, 0.05, 0.80, 2),   # should recover 0.01
    (0.05,  5000.0, 0.05, 0.80, 2),
    (0.02, 50000.0, 0.05, 0.80, 2),
    (0.30,  2000.0, 0.01, 0.90, 2),
    (0.50,  1000.0, 0.05, 0.80, 2),
    (0.05, 20000.0, 0.05, 0.80, 1),
    (0.01, 100000.0, 0.05, 0.80, 2),
    (0.40,   500.0, 0.05, 0.95, 2),
    (0.15,   250.0, 0.05, 0.80, 2),   # small n, large effect
]

rows = []
for p1, n, alpha, power, tails in CASES:
    mde = sm_mde(p1, n, alpha, power, tails)
    rows.append({
        "p1": p1, "n": n, "alpha": alpha, "power": power, "tails": tails,
        "statsmodels_mde": mde,
        "cohen_h_mde": cohen_h_mde(p1, n, alpha, power, tails),
        # Round trip: feeding the MDE back in must return the n we started from.
        "n_roundtrip": sm_sample_size(p1, mde, alpha, power, tails) if mde else None,
    })

out = os.path.join(HERE, "reference_tool2.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(rows, fh, indent=1)

print("wrote", out, f"({len(rows)} cases)")
print()
hdr = f"{'p1':>6} {'n':>10} {'alpha':>6} {'power':>6} {'tails':>5} | {'MDE (pp)':>9} {'Cohen h':>9} {'diff':>7}"
print(hdr)
print("-" * len(hdr))
for r in rows:
    m, c = r["statsmodels_mde"], r["cohen_h_mde"]
    diff = f"{(c / m - 1) * 100:+.2f}%" if m else "-"
    print(f"{r['p1']:>6} {r['n']:>10.1f} {r['alpha']:>6} {r['power']:>6} "
          f"{r['tails']:>5} | {m * 100:>9.4f} {c * 100:>9.4f} {diff:>7}")
