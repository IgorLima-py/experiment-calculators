"""Cross-check: Evan Miller sample-size formula vs statsmodels variants."""
import math
import numpy as np
from scipy.stats import norm
import statsmodels
from statsmodels.stats.power import NormalIndPower, zt_ind_solve_power, tt_ind_solve_power
from statsmodels.stats.proportion import (
    proportion_effectsize,
    samplesize_proportions_2indep_onetail,
    power_proportions_2indep,
)

print("statsmodels", statsmodels.__version__)

def evan_miller(alpha, power, p, delta):
    """Exact port of sample-size-fixed.js num_subjects()."""
    if p > 0.5:
        p = 1.0 - p
    t_alpha2 = norm.ppf(1.0 - alpha / 2)
    t_beta = norm.ppf(power)
    sd1 = math.sqrt(2 * p * (1 - p))                                # H0 variance: both arms at baseline p
    sd2 = math.sqrt(p * (1 - p) + (p + delta) * (1 - p - delta))    # H1 variance: unpooled
    return (t_alpha2 * sd1 + t_beta * sd2) ** 2 / delta ** 2

def pooled_pbar(alpha, power, p1, p2):
    """Classic 'Fleiss (1981) without continuity correction' with pooled pbar=(p1+p2)/2."""
    pbar = (p1 + p2) / 2
    za, zb = norm.ppf(1 - alpha / 2), norm.ppf(power)
    return (za * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2

def fleiss_cc(alpha, power, p1, p2):
    """Fleiss/Casagrande-Pike-Smith continuity correction applied to pooled formula."""
    n = pooled_pbar(alpha, power, p1, p2)
    d = abs(p2 - p1)
    return n / 4 * (1 + math.sqrt(1 + 4 / (n * d))) ** 2

cases = [
    (0.20, 0.05, 0.05, 0.80),   # Evan Miller's defaults -> he shows 1,030
    (0.10, 0.02, 0.05, 0.80),
    (0.05, 0.01, 0.05, 0.80),
    (0.50, 0.05, 0.05, 0.80),
    (0.20, 0.05, 0.05, 0.90),
    (0.03, 0.006, 0.05, 0.80),  # 20% relative lift on 3%
]

hdr = f"{'p1':>5} {'delta':>6} | {'EvanMiller':>10} {'sm_onetail':>10} {'Cohens_h':>9} {'pooled_pbar':>11} {'fleiss_cc':>9}"
print(hdr); print("-" * len(hdr))
for p1, d, alpha, power in cases:
    p2 = p1 + d
    em = evan_miller(alpha, power, p1, d)
    # statsmodels dedicated 2-proportion sample size (score/pooled under null)
    sm1 = samplesize_proportions_2indep_onetail(diff=d, prop2=p1, power=power,
                                                alpha=alpha, alternative='two-sided')
    # Cohen's h route
    h = proportion_effectsize(p2, p1)
    smh = NormalIndPower().solve_power(effect_size=h, alpha=alpha, power=power,
                                       ratio=1, alternative='two-sided')
    pp = pooled_pbar(alpha, power, p1, p2)
    fc = fleiss_cc(alpha, power, p1, p2)
    print(f"{p1:>5} {d:>6} | {em:>10.1f} {sm1:>10.1f} {smh:>9.1f} {pp:>11.1f} {fc:>9.1f}")

# Which variance does power_proportions_2indep use? Round-trip the default case.
print()
res = power_proportions_2indep(diff=0.05, prop2=0.20, nobs1=1030, alpha=0.05,
                               alternative='two-sided', return_results=True)
print("power_proportions_2indep(diff=.05, prop2=.20, nobs1=1030):")
print(res)
print()
# zt_ind_solve_power equivalence with NormalIndPower.solve_power
h = proportion_effectsize(0.25, 0.20)
print("Cohen's h(0.25, 0.20) =", h)
print("zt_ind_solve_power same as NormalIndPower:",
      zt_ind_solve_power(effect_size=h, alpha=0.05, power=0.8))
print("tt_ind_solve_power (t-based, for reference):",
      tt_ind_solve_power(effect_size=h, alpha=0.05, power=0.8))
