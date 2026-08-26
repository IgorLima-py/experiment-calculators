"""Reference values for tool 5 (CUPED and the delta method).

Tool 5 is a teaching page rather than a calculator, but the numbers it draws
still have to be right, so both demonstrations are checked.

Two kinds of check, and the distinction matters:

* Implementation. Fixed datasets are generated here and written out, so the
  browser code and numpy compute the same formulas over identical numbers.
  Any disagreement is a coding error.
* Theory. Large Monte Carlo runs confirm that the formulas themselves describe
  reality - that CUPED removes the rho^2 share of the variance it promises, and
  that the delta-method standard error is the one that actually obtains while
  the naive one is not.

Run this, then `node check_tool5.js`.
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def cuped_adjust(xs, ys):
    theta = np.cov(ys, xs, ddof=1)[0, 1] / np.var(xs, ddof=1)
    adjusted = ys - theta * (xs - np.mean(xs))
    var_raw = float(np.var(ys, ddof=1))
    var_adj = float(np.var(adjusted, ddof=1))
    return {
        "theta": float(theta),
        "variance_raw": var_raw,
        "variance_adjusted": var_adj,
        "empirical_reduction": 1 - var_adj / var_raw,
        "correlation": float(np.corrcoef(xs, ys)[0, 1]),
    }


def ratio_standard_errors(conversions, sessions):
    """Deng, Knoblich & Lu (2018): variance of a ratio of per-user averages."""
    n = len(conversions)
    total_c = float(np.sum(conversions))
    total_s = float(np.sum(sessions))
    ratio = total_c / total_s

    mc, ms = float(np.mean(conversions)), float(np.mean(sessions))
    vc, vs = float(np.var(conversions, ddof=1)), float(np.var(sessions, ddof=1))
    ccs = float(np.cov(conversions, sessions, ddof=1)[0, 1])

    delta_var = (1 / n) * (1 / ms ** 2) * (vc - 2 * (mc / ms) * ccs
                                           + (mc ** 2 / ms ** 2) * vs)
    return {
        "ratio": ratio,
        "sessions": total_s,
        "naive_se": float(np.sqrt(ratio * (1 - ratio) / total_s)),
        "delta_se": float(np.sqrt(max(0.0, delta_var))),
    }


rng = np.random.default_rng(20260826)

# ---- fixed datasets, for the implementation check ----

cuped_cases = []
for rho in [0.0, 0.3, 0.6, 0.85, 0.95]:
    n = 400
    xs = rng.normal(size=n)
    ys = rho * xs + np.sqrt(1 - rho ** 2) * rng.normal(size=n)
    case = cuped_adjust(xs, ys)
    case["rho"] = rho
    case["n"] = n
    case["xs"] = [float(v) for v in xs]
    case["ys"] = [float(v) for v in ys]
    cuped_cases.append(case)

ratio_cases = []
for spread in [0.0, 0.5, 1.0, 2.0]:
    users = 800
    base_logit = np.log(0.12 / 0.88)
    p = 1 / (1 + np.exp(-(base_logit + spread * rng.normal(size=users))))
    sessions = 1 + rng.poisson(2.0, size=users)
    conversions = rng.binomial(sessions, p)
    case = ratio_standard_errors(conversions.astype(float), sessions.astype(float))
    case["spread"] = spread
    case["users"] = users
    case["conversions"] = [float(v) for v in conversions]
    case["session_counts"] = [float(v) for v in sessions]
    ratio_cases.append(case)

# ---- theory checks, by large Monte Carlo ----

theory_cuped = []
for rho in [0.3, 0.6, 0.85]:
    n = 200000
    xs = rng.normal(size=n)
    ys = rho * xs + np.sqrt(1 - rho ** 2) * rng.normal(size=n)
    got = cuped_adjust(xs, ys)
    theory_cuped.append({
        "rho": rho,
        "expected_reduction": rho ** 2,
        "measured_reduction": got["empirical_reduction"],
        "expected_theta": rho,
        "measured_theta": got["theta"],
        "n": n,
    })

theory_ratio = []
for spread in [0.0, 0.5, 1.0, 2.0]:
    users, reps = 800, 4000
    base_logit = np.log(0.12 / 0.88)
    ratios = np.empty(reps)
    naive_acc = 0.0
    delta_acc = 0.0
    for r in range(reps):
        p = 1 / (1 + np.exp(-(base_logit + spread * rng.normal(size=users))))
        sessions = 1 + rng.poisson(2.0, size=users)
        conversions = rng.binomial(sessions, p)
        got = ratio_standard_errors(conversions.astype(float), sessions.astype(float))
        ratios[r] = got["ratio"]
        naive_acc += got["naive_se"]
        delta_acc += got["delta_se"]
    true_se = float(np.std(ratios, ddof=1))
    theory_ratio.append({
        "spread": spread,
        "naive_se": naive_acc / reps,
        "delta_se": delta_acc / reps,
        "true_se": true_se,
        "true_se_uncertainty": true_se / np.sqrt(2 * (reps - 1)),
        "reps": reps,
        "users": users,
    })

out = os.path.join(HERE, "reference_tool5.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"cuped_cases": cuped_cases, "ratio_cases": ratio_cases,
               "theory_cuped": theory_cuped, "theory_ratio": theory_ratio}, fh)

print("wrote", out)
print()
print("CUPED, variance reduction against theory (n = 200,000)")
print(f"{'rho':>6} {'rho^2':>10} {'measured':>10} {'theta':>10}")
for t in theory_cuped:
    print(f"{t['rho']:>6} {t['expected_reduction']:>10.4f} "
          f"{t['measured_reduction']:>10.4f} {t['measured_theta']:>10.4f}")
print()
print("Ratio metric standard errors (800 users, 4,000 replications)")
print(f"{'spread':>7} {'naive':>10} {'delta':>10} {'true':>10} {'+/-':>8}")
for t in theory_ratio:
    print(f"{t['spread']:>7} {t['naive_se']:>10.6f} {t['delta_se']:>10.6f} "
          f"{t['true_se']:>10.6f} {t['true_se_uncertainty']:>8.6f}")
