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

## Phase 2 — Minimum detectable effect (`tools/mde.html`)

Reproduce with:

```bash
python reference_tool2.py && node check_tool2.js
```

Checked two ways, because agreeing with one implementation proves less than
agreeing with two derived differently. The first column inverts statsmodels'
own sample-size function numerically — that is the value the tool must match.
The second is Cohen's h via `NormalIndPower`, back-transformed to a difference
in rates; it is an arcsine-stabilised approximation rather than the same
formula, so it is *expected* to differ.

| Baseline | n per variant | Alpha | Power | Tails | This tool (pp) | statsmodels inverted (pp) | Cohen's h (pp) | Cohen gap |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5.0% | 14,000.0 | 5% | 80% | 2 | 0.7553 | 0.7553 | 0.7549 | -0.05% |
| 20.0% | 1,093.7 | 5% | 80% | 2 | 5.0001 | 5.0001 | 4.9957 | -0.09% |
| 10.0% | 3,840.8 | 5% | 80% | 2 | 2.0000 | 2.0000 | 1.9983 | -0.08% |
| 5.0% | 8,157.7 | 5% | 80% | 2 | 1.0000 | 1.0000 | 0.9990 | -0.10% |
| 5.0% | 5,000.0 | 5% | 80% | 2 | 1.2932 | 1.2932 | 1.2911 | -0.16% |
| 2.0% | 50,000.0 | 5% | 80% | 2 | 0.2557 | 0.2557 | 0.2556 | -0.05% |
| 30.0% | 2,000.0 | 1% | 90% | 2 | 5.7261 | 5.7261 | 5.7245 | -0.03% |
| 50.0% | 1,000.0 | 5% | 80% | 2 | 6.2486 | 6.2486 | 6.2481 | -0.01% |
| 5.0% | 20,000.0 | 5% | 80% | 1 | 0.5559 | 0.5559 | 0.5558 | -0.03% |
| 1.0% | 100,000.0 | 5% | 80% | 2 | 0.1286 | 0.1286 | 0.1285 | -0.04% |
| 40.0% | 500.0 | 5% | 95% | 2 | 11.3229 | 11.3229 | 11.3314 | +0.08% |
| 15.0% | 250.0 | 5% | 80% | 2 | 9.9996 | 9.9996 | 9.9473 | -0.52% |

- Worst relative error vs inverted statsmodels: **1.5e-13**
- Worst relative error on the n → MDE → n round trip: **2.2e-13**
- Largest disagreement with the Cohen's h route: **0.52%**

Rows two through four are deliberate: they feed back the exact sample sizes
from the phase 1 table and recover the effects those sizes were computed from
(5.00 pp, 2.00 pp, 1.00 pp). The two tools are genuine inverses, not two
formulas that happen to look similar.

### On the Cohen's h gap

It stays under 0.2% across realistic inputs and widens to 0.52% only in the
last row, where n is 250 and the detectable effect is a third of the baseline.
The arcsine transform that stabilises Cohen's h is least faithful exactly where
the effect is large relative to the rate. This tool follows the direct formula,
so it inverts the sample-size calculator exactly; the h route is reported here
as an independent check, not as a competing answer.

### Why bisection rather than a closed form

The effect appears inside the alternative-hypothesis variance as well as in the
denominator, so there is no algebraic inverse. The common shortcut is to drop
it from the variance and invert what remains, which produces a number that
looks right and is not. The tool bisects the real function instead.

## Phase 3 — Peeking / sequential checker (`tools/peeking.html`)

Reproduce with:

```bash
python reference_tool3.py && node check_tool3.js
```

This is the tool the suite exists for, so it is checked four ways. Each is
independent of the others: they share no code, and two of them predate this
repository by decades.

1. **The Armitage-McPherson recursion**, in `assets/sequential.js` — the code
   that actually runs in the browser. It integrates the sub-density of the
   running sum forward one look at a time, and the mass falling outside each
   boundary is the error spent there.
2. **A multivariate-normal integration in scipy**, in `reference_tool3.py`. The
   test statistics at K looks are jointly normal with correlation
   √(tᵢ/tⱼ), so the same quantity is one call to Genz's algorithm. Completely
   different mathematics, same answer.
3. **The published tables**: Armitage, McPherson & Rowe (1969), Pocock (1977),
   O'Brien & Fleming (1979).
4. **A million-run Monte Carlo** per row, simulating null experiments and
   counting how often peeking finds a "winner" that does not exist.

### Type I error when testing at nominal 5% at every look

| Looks | This tool (recursion) | scipy (multivariate normal) | Published | Monte Carlo (1M) |
|---:|---:|---:|---:|---:|
| 1 | 0.0500 | 0.0500 | 0.050 | 0.0498 ± 0.0004 |
| 2 | 0.0831 | 0.0831 | 0.083 | 0.0833 ± 0.0006 |
| 3 | 0.1073 | 0.1073 | 0.107 | 0.1073 ± 0.0006 |
| 4 | 0.1262 | 0.1262 | 0.126 | 0.1261 ± 0.0007 |
| 5 | 0.1417 | 0.1417 | 0.142 | 0.1424 ± 0.0007 |
| 6 | 0.1548 | 0.1548 | — | 0.1549 ± 0.0007 |
| 8 | 0.1763 | 0.1763 | — | 0.1761 ± 0.0008 |
| 10 | 0.1934 | 0.1934 | 0.193 | 0.1938 ± 0.0008 |
| 12 | 0.2075 | 0.2075 | — | 0.2076 ± 0.0008 |
| 15 | 0.2251 | — | — | 0.2257 ± 0.0008 |
| 20 | 0.2479 | — | 0.248 | 0.2481 ± 0.0009 |
| 30 | 0.2802 | — | — | 0.2803 ± 0.0009 |
| 50 | 0.3205 | — | 0.320 | 0.3204 ± 0.0009 |

### Pocock constant critical value (overall alpha 5%)

| Looks | This tool | scipy | Published | Per-look alpha | Bonferroni would say |
|---:|---:|---:|---:|---:|---:|
| 2 | 2.178 | 2.178 | 2.178 | 0.0294 | 0.0250 |
| 3 | 2.289 | 2.289 | 2.289 | 0.0221 | 0.0167 |
| 4 | 2.361 | 2.361 | 2.361 | 0.0182 | 0.0125 |
| 5 | 2.413 | 2.413 | 2.413 | 0.0158 | 0.0100 |
| 6 | 2.453 | 2.453 | — | 0.0142 | 0.0083 |
| 8 | 2.512 | 2.512 | — | 0.0120 | 0.0063 |
| 10 | 2.555 | 2.555 | 2.555 | 0.0106 | 0.0050 |

The last column is there because Bonferroni is the correction people reach for
by instinct. It is valid but wasteful: at five looks it demands p < 0.010 where
the exact answer is p < 0.0158, throwing away real power for no gain in
protection. The looks are strongly correlated — they share most of their data —
and Bonferroni assumes they are not.

### O'Brien-Fleming boundaries (overall alpha 5%)

| Looks | This tool | scipy | Published |
|---:|---|---|---|
| 2 | 2.797 / 1.977 | 2.797 / 1.977 | — |
| 3 | 3.471 / 2.454 / 2.004 | 3.471 / 2.454 / 2.004 | 3.471 / 2.454 / 2.004 |
| 4 | 4.049 / 2.863 / 2.337 / 2.024 | 4.049 / 2.863 / 2.337 / 2.024 | — |
| 5 | 4.562 / 3.226 / 2.634 / 2.281 / 2.040 | 4.562 / 3.226 / 2.634 / 2.281 / 2.040 | 4.562 / 3.226 / 2.634 / 2.281 / 2.040 |
| 8 | 5.861 / 4.144 / 3.384 / 2.931 / 2.621 / 2.393 / 2.215 / 2.072 | (identical) | — |

### Other significance levels

Included to show the recursion is not quietly tuned to 5%.

| Looks | Nominal alpha | Inflated: this tool | Inflated: scipy | Pocock: this tool | Pocock: scipy |
|---:|---:|---:|---:|---:|---:|
| 3 | 0.01 | 0.0237 | 0.0237 | 2.873 | 2.873 |
| 5 | 0.01 | 0.0327 | 0.0327 | 2.986 | 2.986 |
| 10 | 0.01 | 0.0474 | 0.0474 | 3.117 | 3.117 |
| 3 | 0.10 | 0.2021 | 0.2021 | 1.992 | 1.992 |
| 5 | 0.10 | 0.2596 | 0.2596 | 2.122 | 2.122 |
| 10 | 0.10 | 0.3417 | 0.3417 | 2.270 | 2.270 |

### Worst disagreements

- Recursion vs multivariate normal: **8.1e-6**
- Recursion vs published inflation values: **4.5e-4** (the published figures are
  printed to three decimals, so this is their rounding, not an error here)
- Pocock constants: **1.6e-4**
- O'Brien-Fleming boundaries: **1.1e-4**

Every Monte Carlo estimate sits inside two standard errors of the exact value.

### Why the multivariate column stops at 12 looks

Genz's algorithm is quasi-Monte Carlo, so in high dimensions it becomes both
slow and less precise. At 50 looks the first version of this script ran for
over twenty minutes without returning a usable figure. Rather than publish a
number from a method operating outside its comfortable range, the comparison is
capped at 12 looks, and beyond that the recursion is checked against the
published tables and the Monte Carlo. Each method is used where it is actually
trustworthy — which is the same standard the tools themselves are held to.

## Phase 4 — Geo-holdout power

*Not started.*

## Phase 5 — CUPED & delta method

*Not started.*
