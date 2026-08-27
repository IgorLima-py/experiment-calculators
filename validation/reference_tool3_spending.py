"""Reference values for the Lan-DeMets alpha-spending boundaries in tool 3.

The browser solves these with the Armitage-McPherson recursion generalised to
unequal information increments (`Sequential.spendingBounds` over
`overallAlphaUneven`). This script solves the same problem by writing the joint
distribution of the test statistics as a multivariate normal and integrating it
with scipy's Genz algorithm - the same independent route `reference_tool3.py`
uses for the equally spaced case, extended to arbitrary information fractions.

What is being checked is stronger than "the two agree on a number". A spending
boundary makes a specific promise: by look k, the cumulative probability of
having crossed under the null is exactly what the spending function allocates
to t_k. So the check compares three things:

  1. the boundaries themselves, browser against scipy;
  2. the cumulative error the browser's boundaries actually spend, measured by
     scipy rather than by the recursion that chose them;
  3. that cumulative against the closed-form spending function it is meant to
     match.

Point 2 is the one that matters. A boundary solver checked only against its own
integrator can be self-consistently wrong.

Run this, then `node check_tool3_spending.js`.
"""
import json
import os

import numpy as np
from scipy.optimize import brentq
from scipy.stats import multivariate_normal, norm

HERE = os.path.dirname(os.path.abspath(__file__))
ALPHA = 0.05


def crossing_prob(bounds, fractions):
    """P(|Z_k| >= c_k for some k <= K) at the given information fractions.

    Z_k is the standardised running sum at information time t_k, so
    corr(Z_i, Z_j) = sqrt(min(t_i, t_j) / max(t_i, t_j)).
    """
    k = len(bounds)
    t = np.asarray(fractions[:k], dtype=float)
    corr = np.sqrt(np.minimum.outer(t, t) / np.maximum.outer(t, t))
    b = np.asarray(bounds, dtype=float)
    mvn = multivariate_normal(mean=np.zeros(k), cov=corr,
                              allow_singular=True, seed=1)
    return float(1 - mvn.cdf(b, lower_limit=-b))


def spend_obf(t, alpha):
    """Lan-DeMets (1983) O'Brien-Fleming-like spending function."""
    if t <= 0:
        return 0.0
    if t >= 1:
        return alpha
    return float(2 - 2 * norm.cdf(norm.ppf(1 - alpha / 2) / np.sqrt(t)))


def spend_pocock(t, alpha):
    """Lan-DeMets (1983) Pocock-like spending function."""
    if t <= 0:
        return 0.0
    if t >= 1:
        return alpha
    return float(alpha * np.log(1 + (np.e - 1) * t))


SHAPES = {"obf": spend_obf, "pocock": spend_pocock}

# Equally spaced schedules are here so the result can be read against the
# familiar published boundaries; the unequal ones are the point of the feature.
SCHEDULES = [
    ("equal 3", [1 / 3, 2 / 3, 1.0]),
    ("equal 5", [0.2, 0.4, 0.6, 0.8, 1.0]),
    ("page default", [0.3, 0.6, 1.0]),
    ("late peek", [0.8, 1.0]),
    ("early peek", [0.1, 0.55, 1.0]),
    ("front loaded", [0.1, 0.25, 0.5, 1.0]),
    ("truncated", [0.3, 0.6, 0.8]),
]


def solve(fractions, spend, alpha):
    """Boundaries by the same rule the browser uses, integrated differently.

    Each look's critical value is chosen so that the cumulative crossing
    probability up to that look equals the budget the spending function has
    released by then.
    """
    bounds = []
    for k, t in enumerate(fractions):
        budget = spend(t, alpha)
        prefix = list(bounds)
        bounds.append(float(brentq(
            lambda c: crossing_prob(prefix + [c], fractions[:k + 1]) - budget,
            0.5, 9.0, xtol=1e-10)))
    return bounds


cases = []
for shape, spend in SHAPES.items():
    for name, fractions in SCHEDULES:
        bounds = solve(fractions, spend, ALPHA)
        cumulative = [crossing_prob(bounds[:k + 1], fractions[:k + 1])
                      for k in range(len(bounds))]
        targets = [spend(t, ALPHA) for t in fractions]
        cases.append({
            "shape": shape,
            "name": name,
            "fractions": fractions,
            "alpha": ALPHA,
            "bounds": bounds,
            "cumulative": cumulative,
            "targets": targets,
        })
        print(f"{shape:>7} {name:>14}  "
              f"z = {', '.join(f'{b:.4f}' for b in bounds)}", flush=True)

out = os.path.join(HERE, "reference_tool3_spending.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"alpha": ALPHA, "cases": cases}, fh, indent=1)

print(f"\nwrote {os.path.basename(out)} ({len(cases)} cases)")
print("\nThe spending boundaries are close to, but not the same object as, the")
print("original O'Brien-Fleming and Pocock boundaries in reference_tool3.py:")
print("Lan-DeMets chooses a boundary to match a continuous spending schedule,")
print("which is what makes unequal looks analysable at all.")
