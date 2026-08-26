"""Validate repeated-significance-testing numbers via the Armitage-McPherson
recursion (exact numerical integration) and Monte Carlo.

Model: standardized test statistic Z_k at K equally spaced looks.
S_k = sum of k iid N(0,1) increments; Z_k = S_k / sqrt(k).
Reject at look k if |Z_k| >= c_k. Overall alpha = P(reject at any look | H0).

Recursion on the sub-density of S_k restricted to 'not yet rejected':
  f_1 = phi(s) on |s| < c_1
  f_{k+1}(s) = int_{|u| < c_k sqrt(k)} f_k(u) phi(s - u) du, restricted to |s| < c_{k+1} sqrt(k+1)
alpha_spent_k = mass lost at each truncation.
"""
import time
import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq

H = 0.01  # grid step


def overall_alpha(crit, K=None):
    """crit: array of per-look critical z values (two-sided). Returns overall alpha."""
    crit = np.asarray(crit, dtype=float)
    K = len(crit)
    # grid wide enough for all looks
    alpha_total = 0.0
    # look 1
    b = crit[0]  # boundary on Z_1 = S_1
    x = np.arange(-b, b + H, H)
    f = norm.pdf(x)
    alpha_total += 2 * norm.sf(b)
    for k in range(2, K + 1):
        bk = crit[k - 1] * np.sqrt(k)  # boundary on S_k
        y = np.arange(-bk, bk + H, H)
        # convolution: f_new(y) = sum_x f(x) phi(y-x) * H   -> O(n*m) via outer
        f_new = (norm.pdf(y[:, None] - x[None, :]) @ f) * H
        mass_before = np.trapezoid(f, x) if hasattr(np, 'trapezoid') else np.trapz(f, x)
        # total mass that survived convolution over all reals = mass_before;
        # mass inside new boundary:
        mass_inside = np.trapezoid(f_new, y)
        alpha_total += mass_before - mass_inside
        x, f = y, f_new
    return alpha_total


def armitage_table():
    print("=== Armitage/McPherson/Rowe-style inflation: repeated two-sided z-tests at nominal alpha=0.05 (z=1.96) ===")
    t0 = time.time()
    for K in [1, 2, 3, 4, 5, 10, 20, 50]:
        a = overall_alpha([1.96] * K)
        print(f"K={K:3d} looks -> overall alpha = {a:.4f}")
    print(f"(elapsed {time.time()-t0:.2f}s)")


def pocock_constants():
    print("\n=== Pocock: constant nominal per-look alpha s.t. overall alpha = 0.05 ===")
    t0 = time.time()
    for K in [2, 3, 4, 5, 10]:
        f = lambda c: overall_alpha([c] * K) - 0.05
        c = brentq(f, 1.96, 3.5, xtol=1e-4)
        print(f"K={K:2d}: critical z = {c:.3f}, nominal per-look alpha = {2*norm.sf(c):.4f}")
    print(f"(elapsed {time.time()-t0:.2f}s)")


def obf_bounds():
    print("\n=== O'Brien-Fleming: c_k = C*sqrt(K/k), C s.t. overall alpha = 0.05 ===")
    for K in [2, 3, 4, 5]:
        f = lambda C: overall_alpha([C * np.sqrt(K / k) for k in range(1, K + 1)]) - 0.05
        C = brentq(f, 1.9, 3.0, xtol=1e-4)
        crit = [C * np.sqrt(K / k) for k in range(1, K + 1)]
        print(f"K={K}: final crit={C:.3f}; per-look z = {[round(c,3) for c in crit]}; "
              f"per-look nominal alpha = {[round(2*norm.sf(c),4) for c in crit]}")


def monte_carlo(K=10, reps=100_000, z=1.96, seed=1):
    print(f"\n=== Monte Carlo check: K={K} looks, {reps} reps ===")
    rng = np.random.default_rng(seed)
    t0 = time.time()
    inc = rng.standard_normal((reps, K))
    S = np.cumsum(inc, axis=1)
    Z = S / np.sqrt(np.arange(1, K + 1))
    rej = (np.abs(Z) >= z).any(axis=1)
    a = rej.mean()
    se = np.sqrt(a * (1 - a) / reps)
    print(f"alpha_hat = {a:.4f} +/- {2*se:.4f} (2 SE), elapsed {time.time()-t0:.2f}s")


if __name__ == "__main__":
    armitage_table()
    pocock_constants()
    obf_bounds()
    monte_carlo()
