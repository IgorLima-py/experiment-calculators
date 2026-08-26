"""Tool 3 ground truth: alpha inflation under repeated looks + Pocock/OBF constants.

Z-statistics at k equally spaced interim looks on accumulating data follow a
multivariate normal with corr(Z_i, Z_j) = sqrt(t_i/t_j), t_i = i/k.
Overall type I error = 1 - P(all |Z_i| <= c_i). Computed with scipy Genz MVN.
"""
import numpy as np
from scipy.stats import norm, multivariate_normal
from scipy.optimize import brentq

def crossing_prob(bounds):
    k = len(bounds)
    t = np.arange(1, k + 1) / k
    corr = np.sqrt(np.minimum.outer(t, t) / np.maximum.outer(t, t))
    b = np.asarray(bounds, dtype=float)
    mvn = multivariate_normal(mean=np.zeros(k), cov=corr, allow_singular=True, seed=1)
    p_all_inside = mvn.cdf(b, lower_limit=-b)
    return 1 - p_all_inside

alpha = 0.05
z = norm.ppf(1 - alpha / 2)
print(f"alpha inflation, fixed nominal z={z:.4f} at every look (two-sided 0.05):")
for k in [1, 2, 3, 4, 5, 10, 20]:
    infl = crossing_prob([z] * k)
    print(f"  k={k:>2}: overall alpha = {infl:.4f}")

print("\nPocock constant c (same bound every look, overall alpha=0.05):")
for k in [2, 3, 4, 5, 10]:
    c = brentq(lambda c: crossing_prob([c] * k) - alpha, 1.9, 3.5, xtol=1e-6)
    print(f"  k={k:>2}: c = {c:.3f}  (Pocock 1977 table: 2:2.178 3:2.289 4:2.361 5:2.413 10:2.555)")

print("\nO'Brien-Fleming bounds c*sqrt(k/i), overall alpha=0.05:")
for k in [2, 3, 4, 5]:
    def obf_excess(c, k=k):
        bounds = [c * np.sqrt(k / i) for i in range(1, k + 1)]
        return crossing_prob(bounds) - alpha
    c = brentq(obf_excess, 1.6, 2.5, xtol=1e-6)
    bounds = [c * np.sqrt(k / i) for i in range(1, k + 1)]
    print(f"  k={k}: bounds = {[round(b, 3) for b in bounds]}")

# Bonferroni and Sidak corrected per-look alpha for comparison (simple corrections)
print("\nCorrected per-look nominal alpha so overall=0.05 (exact, equal bounds):")
for k in [2, 3, 5, 10]:
    c = brentq(lambda c: crossing_prob([c] * k) - alpha, 1.9, 3.5, xtol=1e-6)
    a_look = 2 * (1 - norm.cdf(c))
    print(f"  k={k:>2}: per-look alpha = {a_look:.4f} (Bonferroni would give {alpha/k:.4f})")
