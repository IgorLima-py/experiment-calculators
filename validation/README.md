# Validation

Reference-implementation cross-checks for every calculator in this suite.
**No calculator ships without its comparison table published here.**

These scripts were seeded during the planning session (2026-08-26) and already
reproduce the canonical numbers; they will grow into one script per tool with
committed markdown output during implementation.

## Scripts

- `verify_tool1.py` — A/B sample size: exact port of Evan Miller's
  `sample-size-fixed.js` formula vs. statsmodels
  (`samplesize_proportions_2indep_onetail`, Cohen's h route), the classic
  pooled-p̄ formula, and Fleiss with continuity correction. Documents *why*
  the implementations disagree (null-variance convention), not just that they do.
- `verify_tool3_mvn.py` — Peeking: overall type-I error under k interim looks
  via the exact multivariate-normal representation (scipy Genz MVN),
  plus Pocock constants and O'Brien-Fleming bounds by root-finding.
- `verify_tool3_recursion.py` — Peeking, independent second route:
  Armitage–McPherson recursion (numerical integration of the sub-density),
  plus a Monte Carlo check. Agreement of both routes with the published
  Armitage/Pocock/OBF tables is the acceptance criterion for the JS port.

## Environment

Verified with Python 3.14.3 on Windows:

```
numpy
scipy==1.17.1
statsmodels==0.14.6
```

Run any script directly, e.g. `python verify_tool3_recursion.py`.
