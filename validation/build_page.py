"""Generate validation/index.html from RESULTS.md.

RESULTS.md stays the single source of truth: it is what GitHub renders and what
the validation scripts are written against. This turns it into a first-class
page on the site, because a relative link to a .md file is served as
text/markdown and browsers download that instead of rendering it — which would
leave the one link that backs every claim on the site pointing at a file
download.

This is a development tool, run by hand like the other scripts in this
directory. What the site serves is still plain static HTML with no build step.

    python build_page.py            # write index.html
    python build_page.py --check    # exit 1 if index.html is out of date

The Markdown subset covered is exactly what RESULTS.md uses: headings h1-h3,
paragraphs, unordered and ordered lists with indented continuations, fenced
code, pipe tables with alignment, horizontal rules, and inline code, links,
bold and italic. Anything outside that subset raises rather than being dropped
or mangled — a validation page that silently loses a row would defeat its own
purpose.
"""

import html
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = HERE / "RESULTS.md"
TARGET = HERE / "index.html"

BASE_URL = "https://igorlima-py.github.io/experiment-calculators"
PAGE_URL = BASE_URL + "/validation/"
DESCRIPTION = (
    "Every formula in the experimentation calculator suite, cross-checked "
    "against scipy, statsmodels and numpy, with the worst disagreement in "
    "each table and the defects the process caught."
)


class MarkdownError(Exception):
    """Raised on any construct this generator does not cover."""


# ---------------------------------------------------------------- inline

INLINE_CODE = re.compile(r"`([^`]+)`")
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
BOLD = re.compile(r"\*\*(.+?)\*\*")
ITALIC = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")


def inline(text):
    """Render inline Markdown, escaping everything that is not a construct.

    Code spans are extracted first and restored last, so that their contents
    are escaped as text and never reinterpreted: RESULTS.md contains
    `<value>` inside a code span, which would otherwise become a stray tag.
    """
    spans = []

    def stash(match):
        spans.append(html.escape(match.group(1)))
        return "\x00%d\x00" % (len(spans) - 1)

    text = INLINE_CODE.sub(stash, text)
    text = html.escape(text)

    # Escaping turned the link syntax's characters into entities only for
    # &, < and >; brackets and parens survive, so the patterns still match.
    text = LINK.sub(
        lambda m: '<a href="%s">%s</a>' % (html.escape(m.group(2), quote=True),
                                           m.group(1)),
        text,
    )
    text = BOLD.sub(r"<strong>\1</strong>", text)
    text = ITALIC.sub(r"<em>\1</em>", text)

    if "*" in text:
        raise MarkdownError("unbalanced emphasis in: %r" % text)

    return re.sub(r"\x00(\d+)\x00", lambda m: "<code>%s</code>" % spans[int(m.group(1))],
                  text)


# ---------------------------------------------------------------- blocks

HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
FENCE = re.compile(r"^```(\w*)\s*$")
HR = re.compile(r"^---+$")
UL = re.compile(r"^[-*]\s+(.*)$")
OL = re.compile(r"^(\d+)\.\s+(.*)$")
TABLE_ROW = re.compile(r"^\|(.*)\|\s*$")
TABLE_RULE = re.compile(r"^[\s|:-]+$")


def split_row(line):
    return [cell.strip() for cell in TABLE_ROW.match(line).group(1).split("|")]


def alignment(cell):
    left, right = cell.startswith(":"), cell.endswith(":")
    if left and right:
        return "center"
    if right:
        return "right"
    if left:
        return "left"
    return None


def convert(source):
    lines = source.split("\n")
    out = []
    headings = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i].rstrip()

        if not line.strip():
            i += 1
            continue

        fence = FENCE.match(line)
        if fence:
            i += 1
            body = []
            while i < n and not lines[i].startswith("```"):
                body.append(lines[i])
                i += 1
            if i >= n:
                raise MarkdownError("unclosed code fence")
            i += 1
            out.append("<pre><code>%s</code></pre>" %
                       html.escape("\n".join(body)))
            continue

        if HR.match(line):
            out.append("<hr>")
            i += 1
            continue

        heading = HEADING.match(line)
        if heading:
            level = len(heading.group(1))
            if level > 3:
                raise MarkdownError("heading deeper than h3: %r" % line)
            text = inline(heading.group(2))
            slug = slugify(heading.group(2))
            out.append('<h%d id="%s">%s</h%d>' % (level, slug, text, level))
            if level == 2:
                headings.append((slug, text))
            i += 1
            continue

        if TABLE_ROW.match(line):
            i, table = read_table(lines, i)
            out.append(table)
            continue

        if UL.match(line) or OL.match(line):
            i, lst = read_list(lines, i)
            out.append(lst)
            continue

        # Paragraph: consume until a blank line or the start of another block.
        body = []
        while i < n and lines[i].strip() and not starts_block(lines[i]):
            body.append(lines[i].strip())
            i += 1
        out.append("<p>%s</p>" % inline(" ".join(body)))

    return "\n".join(out), headings


def starts_block(line):
    stripped = line.rstrip()
    return bool(
        HEADING.match(stripped) or FENCE.match(stripped) or HR.match(stripped)
        or TABLE_ROW.match(stripped) or UL.match(stripped.lstrip())
        or OL.match(stripped.lstrip())
    )


def read_table(lines, i):
    header = split_row(lines[i])
    i += 1
    if i >= len(lines) or not TABLE_RULE.match(lines[i]) or "|" not in lines[i]:
        raise MarkdownError("table header not followed by an alignment row")
    aligns = [alignment(cell) for cell in split_row(lines[i])]
    if len(aligns) != len(header):
        raise MarkdownError("alignment row does not match the header width")
    i += 1

    rows = []
    while i < len(lines) and TABLE_ROW.match(lines[i].rstrip()):
        cells = split_row(lines[i].rstrip())
        if len(cells) != len(header):
            raise MarkdownError("table row width %d != header width %d: %r"
                                % (len(cells), len(header), lines[i]))
        rows.append(cells)
        i += 1

    def cell(tag, text, align):
        klass = ' class="ta-%s"' % align if align else ""
        return "<%s%s>%s</%s>" % (tag, klass, inline(text), tag)

    head = "".join(cell("th", h, a) for h, a in zip(header, aligns))
    body = "".join(
        "<tr>%s</tr>" % "".join(cell("td", c, a) for c, a in zip(row, aligns))
        for row in rows
    )
    return i, ('<div class="table-scroll"><table><thead><tr>%s</tr></thead>'
               "<tbody>%s</tbody></table></div>" % (head, body))


def read_list(lines, i):
    ordered = bool(OL.match(lines[i]))
    tag = "ol" if ordered else "ul"
    items = []

    while i < len(lines):
        raw = lines[i].rstrip()
        if not raw.strip():
            # A blank line ends the list unless an indented item follows.
            nxt = i + 1
            if nxt < len(lines) and lines[nxt][:1] in (" ", "\t") \
                    and lines[nxt].strip():
                i = nxt
                continue
            break

        match = (OL if ordered else UL).match(raw)
        if match:
            items.append([match.group(2 if ordered else 1)])
            i += 1
            continue

        if raw[:1] in (" ", "\t") and items:
            items[-1].append(raw.strip())
            i += 1
            continue

        if (UL if ordered else OL).match(raw):
            raise MarkdownError("list type changes without a blank line: %r" % raw)
        break

    body = "".join("<li>%s</li>" % inline(" ".join(parts)) for parts in items)
    return i, "<%s>%s</%s>" % (tag, body, tag)


def slugify(text):
    text = re.sub(r"[`*_]", "", text).strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "section"


# ---------------------------------------------------------------- page

SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Validation results</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{url}">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article">
<meta property="og:url" content="{url}">
<meta property="og:title" content="Validation results">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{base}/assets/og/validation.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Validation results">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{base}/assets/og/validation.png">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div class="wrap">

<header class="site-header">
  <a class="home" href="../index.html">Experimentation calculators</a>
  <nav class="site-nav">
    <a href="../tools/sample-size.html">Sample size</a>
    <a href="../tools/mde.html">Detectable effect</a>
    <a href="../tools/peeking.html">Peeking checker</a>
    <a href="../tools/geo-holdout.html">Geo holdout</a>
    <a href="../tools/cuped.html">CUPED &amp; ratio metrics</a>
    <a href="index.html" aria-current="page">Validation</a>
  </nav>
</header>

<main class="prose">
{title}
<nav class="toc" aria-label="Contents">
  <p class="toc-title">On this page</p>
  <ol>
{toc}
  </ol>
</nav>

{body}
</main>

<footer class="site-footer">
  <p>This page is generated from
  <a href="https://github.com/IgorLima-py/experiment-calculators/blob/main/validation/RESULTS.md">validation/RESULTS.md</a>
  by <code>validation/build_page.py</code>. The Markdown file is the source of
  truth; reproduce any table in it by running the script it names.</p>
  <p>Built by <a href="https://github.com/IgorLima-py">Igor Lima</a>.
  <a href="https://github.com/IgorLima-py/experiment-calculators">Source and
  validation on GitHub.</a></p>
</footer>

</div>
</body>
</html>
"""


def render():
    body, headings = convert(SOURCE.read_text(encoding="utf-8"))
    # Lift the h1 out of the flow so it can sit above the contents list, and so
    # the page is guaranteed exactly one.
    match = re.match(r"^(<h1[^>]*>.*?</h1>)\n", body)
    if not match:
        raise MarkdownError("RESULTS.md must open with an h1")
    title, body = match.group(1), body[match.end():]
    if "<h1" in body:
        raise MarkdownError("RESULTS.md has more than one h1")
    toc = "\n".join('    <li><a href="#%s">%s</a></li>' % (slug, text)
                    for slug, text in headings)
    return SHELL.format(title=title, body=body, toc=toc, url=PAGE_URL,
                        base=BASE_URL, description=DESCRIPTION)


def main(argv):
    try:
        page = render()
    except MarkdownError as err:
        print("build_page.py: %s" % err, file=sys.stderr)
        return 1

    if "--check" in argv:
        current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else None
        if current != page:
            print("build_page.py: validation/index.html is out of date; "
                  "run python build_page.py", file=sys.stderr)
            return 1
        print("validation/index.html is up to date")
        return 0

    TARGET.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s (%d bytes)" % (TARGET.name, len(page)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
