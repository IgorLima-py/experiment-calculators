"""Emit reference values for the stats.js primitives, straight from scipy.

Run this, then `node check_core.js`, which compares assets/stats.js against the
JSON written here. Pinned: scipy 1.17.1 (see README.md).
"""
import json
import os

from scipy.stats import norm, t as student_t, nct

HERE = os.path.dirname(os.path.abspath(__file__))

ref = {"scipy_norm_cdf": [], "scipy_norm_ppf": [], "scipy_t_cdf": [],
       "scipy_t_ppf": [], "scipy_nct_cdf": []}

# Standard normal CDF: spans the far tails, where sample-size formulas live.
for x in [-8, -5, -3, -1.959963984540054, -1, -0.5, 0, 0.5, 1,
          1.959963984540054, 3, 5, 8]:
    ref["scipy_norm_cdf"].append([x, float(norm.cdf(x))])

# Inverse normal CDF.
for p in [1e-10, 1e-6, 0.001, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 0.8, 0.9,
          0.95, 0.975, 0.99, 0.999, 1 - 1e-6, 1 - 1e-10]:
    ref["scipy_norm_ppf"].append([p, float(norm.ppf(p))])

# Student t CDF and quantile. Small nu is the geo-holdout regime (tool 4).
for nu in [1, 2, 3, 5, 8, 10, 30, 100, 1000]:
    for x in [-4, -3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, 4]:
        ref["scipy_t_cdf"].append([x, nu, float(student_t.cdf(x, nu))])
    for p in [0.005, 0.025, 0.05, 0.1, 0.5, 0.9, 0.95, 0.975, 0.995]:
        ref["scipy_t_ppf"].append([p, nu, float(student_t.ppf(p, nu))])

# Noncentral t CDF: the exact-power path for tool 4.
for nu in [2, 3, 5, 8, 10, 18, 30, 60]:
    for delta in [0, 0.5, 1, 2, 3, 4]:
        for x in [-1, 0, 1, 2, 2.5, 3, 5]:
            ref["scipy_nct_cdf"].append([x, nu, delta, float(nct.cdf(x, nu, delta))])

out = os.path.join(HERE, "reference_core.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(ref, fh)

print("wrote", out)
for key, rows in ref.items():
    print(f"  {key}: {len(rows)} values")
