# Validation results

Every calculator in this suite is cross-checked against a reference
implementation before it ships, and the comparison is published here. A
subtly wrong calculator is worse than no calculator: it is publicly checkable
and permanently embarrassing.

Reference stack: Python 3.14.3, `scipy==1.17.1`, `statsmodels==0.14.6`.
Reproduce any table below by running the named script.

---

## Phase 0 — Numeric primitives (`assets/stats.js`)

Reproduce with:

```bash
python reference_core.py && node check_core.js
```

`reference_core.py` writes 546 reference values straight from scipy;
`check_core.js` evaluates `assets/stats.js` on the same inputs. Node is only a
test runner — the site itself ships as plain HTML and JS with no dependencies
and no build step.

| Routine | Cases | Worst abs err | Worst rel err (ref > 1e-6) | Tolerance abs / rel | Worst case | Status |
|---|---:|---:|---:|---|---|---|
| `normalCdf` | 13 | 1.1e-16 | 1.6e-14 | 1.0e-15 / 1.0e-10 | x=0.5 | PASS |
| `normalQuantile` | 17 | 1.6e-10 | 2.5e-11 | 1.0e-9 / 1.0e-9 | p=1e-10 | PASS |
| `tCdf` | 99 | 2.0e-13 | 1.3e-12 | 1.0e-12 / 1.0e-11 | t=-1, nu=1000 | PASS |
| `tQuantile` | 81 | 2.5e-12 | 1.5e-12 | 1.0e-9 / 1.0e-10 | p=0.05, nu=1000 | PASS |
| `noncentralTCdf` | 336 | 2.2e-12 | 7.7e-11 | 1.0e-11 / 1.0e-9 | t=5, nu=2, delta=1 | PASS |

Two error measures are reported because either one alone flatters the result.
Absolute error is what a probability is actually used for; relative error is
the honest measure in the tails, but only where the reference is large enough
for the ratio to mean anything — a 1e-9 relative miss on a probability of 1e-12
is noise, not an error.

### What the tolerances mean

They are set to the accuracy these published algorithms actually deliver, not
to a round number that would hide a defect. Two are worth naming:

- **`normalCdf` relative error reaches 1.6e-14** because Hart's rational
  approximation is built for absolute accuracy; deep in the tail (x = -8, where
  the value is 6e-16) the relative figure degrades while the absolute error
  stays at 1e-16. Nothing in this suite depends on tail probabilities to better
  than 10 significant figures.
- **`normalQuantile` absolute error reaches 1.6e-10 at p = 1e-10.** The Halley
  refinement is limited by the accuracy of `normalCdf` itself. Every quantile
  this suite actually asks for sits between p = 0.001 and p = 0.999, where the
  error is below 1e-11.

### Two defects this check caught

Both were found by the harness, not by inspection — which is the argument for
having it.

1. **`tCdf` lost all precision near t = 0 for large nu.** The textbook single
   form `x = nu/(nu + t²)` rounds to exactly 1.0 once t² is negligible against
   nu, so the CDF came back flat at 0.5 across a whole neighbourhood of the
   origin. That capped `tQuantile` at ~2.4e-7 absolute error. Fixed by
   switching to `x = t²/(nu + t²)` whenever `t² < nu`, keeping the beta
   argument below 1/2 in both regimes. `tQuantile` improved to 2.5e-12.
2. **`normalQuantile` cancelled away its own correction for p near 1.** The
   Halley step differences `normalCdf(x)` against `p`; when both are near 1 the
   subtraction destroys the correction. Fixed by always solving in the lower
   tail and mirroring.

---

## Phase 1 — A/B sample size & duration (`tools/sample-size.html`)

Reproduce with:

```bash
python reference_tool1.py && node check_tool1.js
```

Users per variant. "This tool" is `Experiments.sampleSizePooled`; "statsmodels"
is `samplesize_proportions_2indep_onetail`; "Evan Miller" is a verbatim port of
`num_subjects()` from
[sample-size-fixed.js](https://www.evanmiller.org/ab-testing/sample-size-fixed.js).

| Baseline | Effect | Alpha | Power | Tails | This tool | statsmodels | Evan Miller | Gap |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20.0% | 5.00 pp | 5% | 80% | 2 | 1,093.7 | 1,093.7 | 1,030.2 | +6.2% |
| 20.0% | 5.00 pp | 5% | 90% | 2 | 1,463.7 | 1,463.7 | 1,390.1 | +5.3% |
| 10.0% | 2.00 pp | 5% | 80% | 2 | 3,840.8 | 3,840.8 | 3,622.6 | +6.0% |
| 5.0% | 0.50 pp | 5% | 80% | 2 | 31,233.4 | 31,233.4 | 30,244.4 | +3.3% |
| 5.0% | 1.00 pp | 5% | 80% | 2 | 8,157.7 | 8,157.7 | 7,663.0 | +6.5% |
| 5.0% | 1.00 pp | 1% | 90% | 2 | 15,464.7 | 15,464.7 | 14,568.8 | +6.1% |
| 3.0% | 0.60 pp | 5% | 80% | 2 | 13,913.6 | 13,913.6 | 13,050.2 | +6.6% |
| 50.0% | 5.00 pp | 5% | 80% | 2 | 1,564.7 | 1,564.7 | 1,567.4 | -0.2% |
| 70.0% | 5.00 pp | 5% | 80% | 2 | 1,250.7 | 1,250.7 | 1,335.0 | -6.3% |
| 20.0% | 5.00 pp | 5% | 80% | 1 | 861.4 | 861.4 | — | — |
| 5.0% | 1.00 pp | 5% | 80% | 1 | 6,425.7 | 6,425.7 | — | — |
| 2.0% | 0.20 pp | 5% | 80% | 2 | 80,681.4 | 80,681.4 | 78,039.0 | +3.4% |

- Worst relative error vs statsmodels: **7.9e-16**
- Worst relative error vs the Evan Miller port: **4.4e-16**
- Worst absolute error on round-tripped power vs
  `power_proportions_2indep`: **3.3e-16**

All three are at double-precision machine epsilon, so this is agreement rather
than approximation.

### Why Evan Miller's calculator returns a different number

His tool is the one most practitioners check against, so the gap deserves an
explanation rather than a shrug. It is **not** a continuity correction and
**not** Cohen's h — both were tested and neither reproduces it.

The whole difference is the variance convention under the null hypothesis.
This tool pools at p̄ = (p₁+p₂)/2, matching statsmodels; Evan Miller puts both
arms at the baseline rate p₁. Since the null standard error is the larger of
the two under a pooled convention, his formula asks for roughly 6% fewer users
at typical baselines. Neither is wrong — they answer slightly different
questions about what "no effect" means. The consequence is worth stating
plainly: at his defaults, `power_proportions_2indep` puts the power of his
1,030 users at **0.776**, not 0.80.

The sign flips above a 50% baseline (−6.3% at 70%) because his code folds
p > 0.5 to 1 − p while leaving the effect unmirrored.

### A documented inconsistency in the standard formula

`sampleSizePooled` and `powerPooled` are not exact inverses of each other. The
closed-form sample size ignores the possibility that a two-sided test rejects
in the direction opposite the true effect; the power calculation counts it. The
round trip therefore differs by under 1e-6 in power. This is a property of the
textbook formula, not of the implementation — statsmodels behaves identically,
which is why both functions match it to machine precision.

## Phase 2 — Minimum detectable effect

*Not started.*

## Phase 3 — Peeking / sequential checker

*Not started. Seed scripts `verify_tool3_mvn.py` and
`verify_tool3_recursion.py` already reproduce the published
Armitage / Pocock / O'Brien-Fleming tables.*

## Phase 4 — Geo-holdout power

*Not started.*

## Phase 5 — CUPED & delta method

*Not started.*
