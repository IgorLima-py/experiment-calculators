# BRIEF — The Experimentation Calculator Suite

**What this is:** a suite of five free, static, mobile-first calculators for people who
run A/B tests and marketing experiments — each output paired with one plain-English
sentence of judgement about what the number means and what would invalidate it.

**Effort:** 6–8h · **Stack:** plain HTML + vanilla JS, GitHub Pages, zero backend.

---

## THE CORE INSIGHT

**Calculators are a commodity. There are fifty free A/B test calculators.**

What almost none of them have: **judgement attached to the number.**

> Every single result must come with one plain-English sentence explaining what it
> means and — critically — **what would invalidate it.**

That sentence is the entire product. A number alone proves nothing about the author.
A number plus the caveat that most practitioners get wrong proves everything.

---

## SCOPE — a suite, not one calculator

A single calculator reads as a toy. A suite reads as authority.

### Tool 1 — A/B test sample size & duration
**Input:** baseline conversion rate, minimum detectable effect, daily traffic,
power (default 80%), alpha (default 5%), one/two-tailed.
**Output:** users per variant, total users, days to run.
**Judgement line:** *"This assumes you don't look at the results before day X. If you
check early and stop when it looks significant, your real false-positive rate is
roughly 3× what you think it is."*

### Tool 2 — Minimum Detectable Effect
**Input:** traffic available, time window, baseline rate.
**Output:** the smallest lift the test could actually detect.
**Judgement line:** *"If this number is bigger than the effect you realistically
expect, don't run the test. You'll get an inconclusive result and call it a failure."*

### Tool 3 — ⭐ Peeking / sequential testing checker
**Input:** how many times they've looked at the data, nominal alpha.
**Output:** actual inflated false-positive rate, plus a corrected threshold.
**Why this is the differentiator:** almost nobody builds this, and peeking is the
single most common way real teams fool themselves.

### Tool 4 — Geo-holdout power
**Input:** number of geos available, historical variance, expected lift.
**Output:** how many markets to hold out, expected precision.
(Companion to the geo-holdout-testing project.)

### Tool 5 — Ratio metrics / CUPED explainer
Not a calculator — a short interactive explainer on why revenue-per-user tests need
different maths than conversion-rate tests (delta method), and how CUPED reduces
variance. Demonstrates depth beyond the standard toolkit.

---

## HOW TO BUILD

- **Stack:** plain HTML + vanilla JS + one small stats helper. No React, no build
  step, no dependencies. Loads instantly, works forever, zero maintenance.
- **Statistical core:** normal approximation for proportions is fine for tools 1–3;
  document that assumption. For tool 3, implement alpha-spending
  (O'Brien-Fleming style) or a simulation-based correction — **and show the
  simulation**, because showing beats asserting.
- **Mobile-first.** Half the traffic is someone checking on their phone in a meeting.
- **Sensible defaults** in every input, so the page is useful before anyone types.
- **Shareable URLs** — encode inputs in the query string so people can send results
  to colleagues. This is the distribution mechanism.
- One understated footer line on every tool linking to the author.

## VALIDATION — do not skip

Cross-check every calculator against a known reference implementation
(e.g. Evan Miller's tools, statsmodels) and **publish the comparison in this repo.**
Someone will check, and being right is the point. A subtly wrong calculator is worse
than none — it is publicly checkable and permanently embarrassing.

---

## OPEN QUESTIONS FOR THE PLANNING SESSION

Research thoroughly before building:

1. **Survey the field.** What do the existing free calculators (Evan Miller,
   VWO, Optimizely, Statsig, SurveyMonkey, etc.) offer, and what do they get wrong
   or leave out? The gaps are the positioning.
2. **Reference implementations** for validation: which exact functions in
   statsmodels / scipy match each tool?
3. **Sequential testing method** for Tool 3: alpha-spending vs. simulation —
   which is more defensible AND more explainable to a non-statistician?
4. **Geo power method** for Tool 4: what is the standard approach and what public
   references document it?
5. **CUPED and the delta method:** collect the canonical references to link from
   Tool 5.
6. UX patterns for shareable-URL calculators worth copying.

---

## DEFINITION OF DONE

- [ ] 5 tools working, mobile-responsive
- [ ] Every output has its judgement sentence
- [ ] Shareable URLs implemented
- [ ] Validation vs. a reference implementation, published in the repo
- [ ] Repo public with a clear README
- [ ] Live on GitHub Pages

## PITFALLS

- **Don't gold-plate the design.** Clean and fast beats beautiful. This is a utility.
- **Don't gate anything behind an email form.** Frictionless sharing is the value.
- **Don't skip the validation.**
