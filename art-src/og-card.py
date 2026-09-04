"""Builds the two icon assets Pillow is better at than sharp:

    python art-src/og-card.py

  * public/favicon.ico  — 16/32/48 in one file. sharp cannot write ICO, and the
    bare /favicon.ico path is still what several crawlers GET without reading a
    single tag of HTML.
  * public/og.png       — the 1200x630 link-preview card.

Run art-src/icons.mjs FIRST: this reads art-src/mark-1024.png, which that
script renders from public/favicon.svg. One source of truth for the mark.

THE CARD IS NOT A SCREENSHOT OF THE PAGE, on purpose. The page is a dark field
with two photographed hands moving across it; at 1200x630 scaled into a Discord
embed that reads as grey noise. The card carries the mark, the name and the one
sentence from HERO.headline, which is what someone scrolling a feed can
actually take in. Copy is duplicated from src/content.ts by hand — if the
headline changes there, change it here and re-run.

Fraunces is vendored beside this file rather than pulled from Google Fonts, so
the card renders the same offline and in two years. It is the site's display
face (index.css) and is OFL-licensed. Body text is Segoe UI because Inter is
not installed on this machine and Segoe is the closest neutral grotesque; the
difference is invisible at 38px in a feed.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MARK = ROOT / "art-src" / "mark-1024.png"

# The site's own tokens, from src/index.css. Do not invent a colour here.
INK = "#08080a"      # ground
SAND = "#f4f4f5"     # display + primary text
CLAY = "#b0b0b8"     # body muted
TAUPE = "#5c5c63"  # metadata only (unused on the card; kept as the token list)

HEADLINE = "A workspace your coding agent"
HEADLINE_2 = "already knows how to use."

# ---------------------------------------------------------------- favicon.ico
# 48 included because Windows taskbar and several feed readers ask for it; the
# whole file is under 10KB, so there is no reason to be clever about the list.
mark = Image.open(MARK).convert("RGB")
mark.save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# ------------------------------------------------------------------- og.png
W, H = 1200, 630
PAD = 96  # keeps everything clear of the edge crop Twitter and Discord apply

card = Image.new("RGB", (W, H), INK)

# The transparent cut, pasted through its own alpha — the tile version would
# show as a pale square, its #0b0b0e ground against the card's #08080a.
#
# 140: large enough to count the fingers in a feed, small enough that the words
# are still the first thing read.
size = 140
hand = Image.open(ROOT / "art-src" / "mark-alpha-1024.png").convert("RGBA")
hand = hand.resize((size, size), Image.LANCZOS)
card.paste(hand, (PAD, 84), hand)

draw = ImageDraw.Draw(card)
display = ImageFont.truetype(str(ROOT / "art-src" / "Fraunces-Regular.ttf"), 128)
body = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 40)

# No domain line: every surface that renders this card (X, Discord, iMessage,
# Slack) prints the host under it already, and the earlier version collided
# with the second line of the headline.
draw.text((PAD, 268), "Fate", font=display, fill=SAND)
draw.text((PAD, 438), HEADLINE, font=body, fill=CLAY)
draw.text((PAD, 490), HEADLINE_2, font=body, fill=CLAY)

card.save(ROOT / "public" / "og.png", optimize=True)
print("og-card: public/favicon.ico and public/og.png written")
