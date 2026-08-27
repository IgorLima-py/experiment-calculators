"""Generate the Open Graph preview images in assets/og/.

Shared links are the distribution mechanism for this suite, so a link pasted
into Slack, LinkedIn or a DM should arrive as a card rather than a bare URL.
That needs a real raster image: SVG is not rendered by any of the major link
unfurlers.

Run by hand when a page's title or description changes:

    python build_og.py

Requires Pillow, which is a development dependency only — nothing that ships
uses it, and the generated PNGs are committed.
"""

import pathlib
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover - developer machine only
    sys.exit("build_og.py needs Pillow: python -m pip install Pillow")

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "og"

W, H = 1200, 630
MARGIN = 84
BAR = 14
GUTTER = 330   # right-hand column reserved for the watermark

BG = (20, 22, 26)
SURFACE = (28, 31, 37)
ACCENT = (125, 162, 255)
TEXT = (233, 236, 241)
SOFT = (162, 170, 184)

FONT_DIR = pathlib.Path("C:/Windows/Fonts")
BOLD = FONT_DIR / "segoeuib.ttf"
REGULAR = FONT_DIR / "segoeui.ttf"

FOOTER = "igorlima-py.github.io/experiment-calculators"

PAGES = [
    ("home", "Calculators are a commodity. Judgement is not.",
     "Five free A/B testing calculators. Every result comes with the caveat "
     "that would invalidate it."),
    ("sample-size", "A/B test sample size & duration",
     "How many users a test needs, how long that takes at your traffic, and "
     "what peeking early would cost you."),
    ("mde", "Minimum detectable effect",
     "The smallest lift your traffic can actually detect — and whether the "
     "test is worth running at all."),
    ("peeking", "Peeking checker",
     "You checked the results early. This is what it cost you, the threshold "
     "that fixes it, and 200,000 simulated tests proving it."),
    ("geo-holdout", "Geo holdout power",
     "How many markets to go dark in for an incrementality test, and the "
     "smallest lift that design could honestly detect."),
    ("cuped", "CUPED & ratio metrics",
     "Why session-level metrics need different maths than conversion rates, "
     "and how to buy traffic you do not have."),
    ("validation", "Validation results",
     "Every formula cross-checked against scipy, statsmodels and numpy — "
     "including the defects the process caught."),
]


def font(path, size):
    return ImageFont.truetype(str(path), size)


def wrap(draw, text, fnt, width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        probe = (line + " " + word).strip()
        if draw.textlength(probe, font=fnt) <= width or not line:
            line = probe
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def curve(image, x0, y0, w, h):
    """The favicon's motif: a normal density with its rejection region shaded.

    Drawn on its own translucent layer so it reads as a watermark behind the
    type rather than competing with it.
    """
    import math

    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer)

    points = []
    for i in range(161):
        t = -3.4 + i * 6.8 / 160
        y = math.exp(-0.5 * t * t)
        points.append((x0 + (t + 3.4) / 6.8 * w, y0 + h - y * h))

    cut = int((1.75 + 3.4) / 6.8 * 160)
    tail = points[cut:] + [(points[-1][0], y0 + h), (points[cut][0], y0 + h)]
    pen.polygon(tail, fill=ACCENT + (58,))
    pen.line(points, fill=ACCENT + (110,), width=5, joint="curve")
    pen.line([(points[cut][0], y0 + 6), (points[cut][0], y0 + h)],
             fill=ACCENT + (90,), width=3)
    pen.line([(x0 - 10, y0 + h), (x0 + w + 10, y0 + h)],
             fill=ACCENT + (60,), width=3)

    image.alpha_composite(layer)


def build(slug, title, subtitle):
    image = Image.new("RGBA", (W, H), BG + (255,))

    # The watermark sits in a reserved right-hand column that the type never
    # enters, so nothing is ever drawn on top of anything else.
    curve(image, W - MARGIN - GUTTER + 20, 214, GUTTER - 40, 250)

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle([MARGIN, MARGIN, MARGIN + BAR, H - MARGIN],
                           radius=BAR // 2, fill=ACCENT)

    left = MARGIN + BAR + 40
    box = W - left - MARGIN - GUTTER

    title_font = font(BOLD, 62)
    lines = wrap(draw, title, title_font, box)
    if len(lines) > 3:
        title_font = font(BOLD, 52)
        lines = wrap(draw, title, title_font, box)

    y = MARGIN + 26
    for line in lines:
        draw.text((left, y), line, font=title_font, fill=TEXT)
        y += int(title_font.size * 1.24)

    y += 20
    sub_font = font(REGULAR, 33)
    for line in wrap(draw, subtitle, sub_font, box)[:3]:
        draw.text((left, y), line, font=sub_font, fill=SOFT)
        y += int(sub_font.size * 1.42)

    foot_font = font(REGULAR, 27)
    fy = H - MARGIN - foot_font.size
    draw.text((left, fy), FOOTER, font=foot_font, fill=ACCENT)

    OUT.mkdir(exist_ok=True)
    path = OUT / ("%s.png" % slug)
    image.convert("RGB").save(path, "PNG", optimize=True)
    return path


def main():
    for slug, title, subtitle in PAGES:
        path = build(slug, title, subtitle)
        print("wrote %s (%d KB)" % (path.name, path.stat().st_size // 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
