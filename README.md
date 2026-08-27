# Experimentation calculators

Five free calculators for people who run A/B tests and marketing experiments.
Every result comes with one plain sentence explaining what it means and what
would invalidate it, and every formula is cross-checked against a reference
implementation with [the comparison published](validation/RESULTS.md) — also
rendered as [a page on the site](validation/index.html).

[How this was built](docs/HOW-THIS-WAS-BUILT.md) covers the method, the
decisions that were not obvious, and what the validation caught.

Plain HTML and JavaScript. No framework, no build step, no backend, no
dependencies, no tracking, no email form in front of anything.

## The tools

| Tool | What it answers |
|---|---|
| [Sample size & duration](tools/sample-size.html) | How many users a test needs, and how long that takes at your traffic |
| [Minimum detectable effect](tools/mde.html) | The smallest lift your traffic can detect — and whether to run the test at all |
| [Peeking checker](tools/peeking.html) | What checking early did to your false-positive rate, and the threshold that fixes it |
| [Geo holdout power](tools/geo-holdout.html) | How many markets to hold out of an incrementality test |
| [CUPED & ratio metrics](tools/cuped.html) | Why session-level metrics need different maths, and how to buy traffic you don't have |

Inputs are encoded in the query string, so any result can be shared as a link.
Defaults are omitted from the URL to keep shared links short.

## Running it

It is a static site. Anything that serves files will do:

```bash
python serve.py 8000
```

`serve.py` is `http.server` with caching switched off, which matters only when
editing. For a plain look at the site, `python -m http.server` is equivalent.

## Validating it

This is the part that makes the rest worth trusting. A calculator that is
subtly wrong is worse than no calculator: it is publicly checkable and
permanently embarrassing.

```bash
cd validation
python reference_core.py  && node check_core.js     # distribution primitives
python reference_tool1.py && node check_tool1.js    # sample size
python reference_tool2.py && node check_tool2.js    # detectable effect
python reference_tool3.py && node check_tool3.js    # peeking (slow, ~7 min)
python reference_tool3_spending.py && node check_tool3_spending.js  # alpha spending
python reference_tool4.py && node check_tool4.js    # geo holdout
python reference_tool5.py && node check_tool5.js    # CUPED and delta method
```

Python generates reference values from `scipy`, `statsmodels` and `numpy`; Node
runs the site's own JavaScript against them. **Node is a test runner only** —
nothing that ships uses it, and there is no `package.json` by design.

## Regenerating the built files

Two files in the repository are generated. Both are committed, and both are
built by hand — the site itself is still plain static files with no build step.

```bash
python validation/build_page.py    # validation/index.html, from RESULTS.md
python validation/build_page.py --check   # fails if it is out of date
python assets/build_og.py          # assets/og/*.png link-preview images
```

`RESULTS.md` is the source of truth for the validation page; edit it and
rebuild rather than editing the HTML. `build_og.py` needs Pillow, which is a
development dependency only.

Pinned versions: Python 3.14.3, `scipy==1.17.1`, `statsmodels==0.14.6`.

The peeking checker is validated four ways, since it is the one that carries
the site: the recursion in the browser, an independent multivariate-normal
integration in scipy, the tables published by Armitage, McPherson & Rowe
(1969), Pocock (1977) and O'Brien & Fleming (1979), and a million-run Monte
Carlo. Worst disagreement between the browser code and scipy: 8.1e-6.

Its alpha-spending boundaries, for looks that are not evenly spaced, are
checked on the stricter question of whether a boundary actually spends the
error it promises — measured by scipy rather than by the recursion that chose
it. Worst gap between promised and spent: 0.00006 percentage points.

Full results, including the defects this process caught and the places where
established implementations legitimately disagree, are in
[validation/RESULTS.md](validation/RESULTS.md).

## Statistical assumptions

Each tool states its own assumptions on the page, and what it does not cover.
The load-bearing ones:

- **Tools 1 and 2** use the normal approximation to the binomial with pooled
  variance under the null and no continuity correction, matching
  `statsmodels.stats.proportion.samplesize_proportions_2indep_onetail`. They
  assume a 50/50 split, one primary metric, and a single analysis at the end.
- **Tool 3** assumes a two-sided z-test on accruing data, and the standard
  model of peeking: that you would have stopped at the first significant
  result. The headline figure and the corrected threshold assume equally spaced
  looks; the Lan-DeMets alpha-spending section drops that assumption and solves
  for the schedule you actually had. It is retrospective — it cannot rescue a
  test you have already stopped.
- **Tool 4** treats markets as independent units in a two-sample t-test, in the
  Hayes & Bennett cluster-trial tradition, with exact noncentral-t power. It
  assumes no spillover between markets and a stable pre-period, both of which
  are approximations in the real world.
- **Tool 5** is an explainer rather than a calculator. Its simulations are real
  and validated, but it computes nothing about your experiment.

Where a better method exists, the page says so and links to it: GeoLift and
Trimmed Match for geo tests, always-valid inference for continuous monitoring.

## Licence

MIT. See [LICENSE](LICENSE).
