# Validation

Every formula on the site is cross-checked here against a reference
implementation, and no calculator ships without its comparison published in
[RESULTS.md](RESULTS.md), which the site also serves as
[a page](index.html).

## How the checks work

Most of them come in pairs. A Python script computes reference values with
scipy, statsmodels or numpy and writes them to a JSON file. A Node script then
loads the site's own JavaScript from `assets/`, runs it on the same inputs,
and exits with an error if any result falls outside its stated tolerance.

```bash
python reference_tool1.py && node check_tool1.js
```

The JSON files are committed, so the Node half runs without the Python stack
installed. CI regenerates every one of them on each push.

| Pair | What it checks | Against |
|---|---|---|
| `reference_core.py` / `check_core.js` | The distribution functions in `stats.js` | scipy |
| `reference_tool1.py` / `check_tool1.js` | Sample size | statsmodels, and a port of Evan Miller's formula |
| `reference_tool2.py` / `check_tool2.js` | Minimum detectable effect | statsmodels' sample-size function, inverted numerically, and Cohen's h |
| `reference_tool3.py` / `check_tool3.js` | The cost of peeking, and the Pocock and O'Brien-Fleming thresholds | A multivariate-normal integration in scipy, the published tables, and a Monte Carlo run |
| `reference_tool3_spending.py` / `check_tool3_spending.js` | Alpha spending at unevenly spaced looks | scipy, including how much error each boundary really spends |
| `reference_tool4.py` / `check_tool4.js` | Geo holdout power and detectable lift | statsmodels' `TTestIndPower` and scipy's noncentral t |
| `reference_tool5.py` / `check_tool5.js` | CUPED and the delta method | numpy on identical datasets, and large Monte Carlo runs |

`reference_tool3.py` takes about seven minutes. The rest finish in seconds.

Two checks have no Python half. `check_judgement.js` runs the sentence under
each result (`assets/judgement.js`) against a table of cases: the exact text
each tool shows at its defaults, one case per branch, and the peeking figure
on the sample size page against the one the peeking checker shows.
`check_site.js` fails if a tool is missing from any page's nav, the home page,
the 404, the sitemap, the README or the link-preview generator, if a page
references a file that does not exist or loads anything from another domain,
or if a check here is left out of CI.

## Running all of it

```bash
python -m pip install -r ../requirements-dev.txt
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
python reference_tool2.py && node check_tool2.js
python reference_tool3.py && node check_tool3.js
python reference_tool3_spending.py && node check_tool3_spending.js
python reference_tool4.py && node check_tool4.js
python reference_tool5.py && node check_tool5.js
node check_judgement.js
node check_site.js
```

The reference stack is pinned in `requirements-dev.txt`: Python 3.14.3,
`scipy==1.17.1`, `statsmodels==0.14.6`. Node 24 runs the checks, and nothing
that ships uses it.

## The seed scripts

`verify_tool1.py`, `verify_tool3_mvn.py` and `verify_tool3_recursion.py` are
the first cross-checks, written during the planning session on 2026-08-26.
They already reproduced the canonical numbers then, and grew into the
`reference_*.py` scripts above. They are kept for the record and are not part
of the suite.
