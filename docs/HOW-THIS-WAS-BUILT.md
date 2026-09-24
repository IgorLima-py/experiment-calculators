# How this was built

A short account of the method, the decisions that were not obvious, and who
did what. It exists because the interesting part of this project is not the
arithmetic: it is the process that makes the arithmetic checkable.

## The problem

There are dozens of free A/B test calculators. Almost all of them return a
number and stop. The number is usually right and almost always useless on its
own, because the thing that decides whether it was worth computing is a
question the calculator never asks: did you look at the results early? Is the
effect you are hoping for even inside what this traffic can detect? Is the
metric you are measuring the unit you randomised?

So the product is not the calculator. It is the sentence attached to it: what
this number means, and what would make it a lie. Every result on the site has
one, and the tools are ordered so that each one hands you off to the tool that
answers the objection it just raised.

## The rule everything else hangs off

**Nothing ships without a cross-check against an independent reference
implementation, and the comparison is published in the repository.**

Not "tested". Cross-checked: the same quantity computed a second time by
something that shares no code with the browser, usually `scipy` or
`statsmodels`, sometimes a published table from the 1970s, sometimes a Monte
Carlo simulation of the underlying experiment. The results live in
[validation/RESULTS.md](../validation/RESULTS.md) and are rendered as
[a page on the site](../validation/index.html).

The reasoning is defensive. A calculator that is subtly wrong is worse than no
calculator, because it is publicly checkable and permanently embarrassing.
Anyone can run `statsmodels` and find out. Better to have run it first.

This is also the only honest answer to "why should I trust a stats tool built
by someone I have never heard of". You should not. You should check, and the
check is already done and published, including the places where the answer is
uncomfortable.

## What the rule caught

None of these were found by reading the code. All of them were found by a
reference implementation disagreeing, which is the entire argument for the
harness existing.

1. **The Student *t* CDF lost every significant digit near zero at large
   degrees of freedom.** The textbook identity uses `x = nu/(nu + t²)`, which
   rounds to exactly 1 once `t²` is negligible against `nu`, so the CDF came
   back flat at 0.5 across a whole neighbourhood of the origin, capping the
   quantile function at about 2.4e-7. Switching to the algebraically equivalent
   `x = t²/(nu + t²)` in that regime took it to 2.5e-12.

2. **The inverse normal cancelled away its own correction.** The Halley
   refinement differences the CDF against *p*; for *p* near 1 both are near 1
   and the subtraction destroys the correction it was applying. Fixed by always
   solving in the lower tail and mirroring.

3. **The detectable-effect formula that cluster-trial guidance publishes does
   not deliver the power it claims.** Adding two central-*t* quantiles,
   `(t_α + t_β)·SE`, is not the inverse of noncentral-*t* power. It is out by
   up to 0.65 percentage points, and the error grows as the degrees of freedom
   fall, which is exactly the regime geo tests operate in. The site inverts the
   exact power function numerically instead and publishes both, with the
   difference measured.

4. **A parser read the digit in "Market 1" as that market's revenue**, giving a
   mean of 13 where the answer was 53,806. It now reads numbers from the end of
   the line and uses the median ratio between the last two to tell a
   pre-period column from a stray row number.

A later audit added a fifth, of a different kind: the sample size page's
judgement sentence quoted a fixed "closer to 14% after five looks" at every
significance level. That figure is only true at 5% (the same five looks cost
3.3% at 1% and 26.0% at 10%), so the page contradicted this site's own peeking
checker one click away. It now computes the figure. Prose can be wrong in
exactly the way arithmetic can, and it is not covered by a test suite unless
someone thinks to point one at it.

## Decisions worth explaining

**Pooled variance under the null, for sample size.** This matches
`statsmodels.stats.proportion.samplesize_proportions_2indep_onetail` to the
decimal. Evan Miller's widely used calculator puts both arms at the baseline
rate instead and returns about 6% fewer users. Neither is wrong; they answer
slightly different questions. The difference is documented rather than hidden,
and his convention is implemented alongside so the comparison is exact rather
than asserted.

**Bisection rather than closed forms**, in two places. The detectable effect
appears inside the alternative-hypothesis variance as well as in the
denominator, so there is no closed-form inverse; the usual shortcut drops it
from the variance and returns a number that looks right and is not. Geo power
has the same shape of problem. Both are solved numerically against the exact
function.

**The Armitage-McPherson recursion, in the browser.** The peeking checker is
the tool that carries the site, so it gets the exact numerical integration
behind every published table of repeated-significance error rates, rather than
a simulation or an approximation. As far as could be found, no client-side
implementation of it existed before this one, which is precisely why it is
checked four ways: against a multivariate-normal integration in scipy, against
the tables published by Armitage, McPherson & Rowe (1969), Pocock (1977) and
O'Brien & Fleming (1979), against a million-run Monte Carlo, and, for the
Lan-DeMets alpha-spending boundaries, on the stricter test of whether the
boundary actually spends the error it promises.

**A locked stack.** Plain HTML and vanilla JavaScript, no framework, no build
step, no backend, no dependencies. Not nostalgia: it means the site has no
maintenance surface, cannot rot when a package is deprecated, and will keep
working as long as browsers do. Two Python scripts generate the validation page
and the link-preview images, and they are development tools: what ships is
static files. Node appears only as a test runner, which is why there is no
`package.json`.

**Web workers for the expensive parts.** The sequential boundaries and the
ratio-metric simulation are seconds of arithmetic. Run inline they froze the
page, on the phones the site was written for. They run off the main thread now,
with a synchronous fallback for when a worker cannot be constructed, and both
paths run literally the same code so they cannot drift.

## Who did what

The implementation and the background research were done by an AI agent
(Claude, in Claude Code) working inside a standing set of constraints: the
locked stack, the validation rule, English for everything in the repository, no
data from any employer, and no calculator ships without its published
cross-check. Those constraints, the scope, and the judgement calls (what to
build, what to cut, what "good enough" meant) are Igor Lima's.

This is said plainly because the alternative is worse. The work is public,
checkable, and either right or not; anyone can run the reference scripts and
find out. What matters about a statistics tool is whether its numbers survive
being checked against an independent implementation, and that question has the
same answer regardless of who typed the code. The validation harness is not
decoration on the project. It *is* the project, and it would be the right way
to build this by hand too.

What an agent does not do is decide that a published formula is not good enough
and that the exact function should be inverted instead, or that a contradiction
between two pages is worth stopping for. Those came from holding the work to a
rule that was written down in advance.

## What is deliberately not here

- **No tracking, no analytics, no email gate.** Nothing about who visits is
  collected, so there is nothing to report about usage.
- **One browser engine.** Everything was tested in Chromium. Not Safari, not
  Firefox.
- **No human review of the English prose** beyond the author's own reading.
- **Only design-stage estimates for geo tests.** GeoLift and Trimmed Match do
  it properly by fitting a synthetic control to your actual market history;
  the page says so and links to them rather than pretending otherwise.
- **No always-valid inference.** The peeking checker is retrospective by
  design. If you want to monitor continuously and stop whenever you like, you
  need confidence sequences set up before the test starts, and the page points
  at the platforms that implement them.
