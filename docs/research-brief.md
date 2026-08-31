# BRIEF — design research for the Fate landing page

Read this whole file before running anything. Your output is one markdown file;
you write no site code.

## OBJECTIVE

Find out what the best developer-tool landing pages actually do — real fonts,
real palettes, real spacing, real motion — so the Fate page can be designed
against evidence instead of taste. Produce ONE report at:

    .\docs\design-research.md

## USE THE SKILL THAT ALREADY DOES THIS

Invoke `/design-extract` before writing any scraping of your own. It pulls the
computed palette ranked by usage, type families and scale, tracking, radii,
shadows, motion, the site author's own CSS custom properties, and which
libraries the page actually runs (GSAP, Lenis, Three, Nuxt). That is the whole
job. Do not hand-roll a scraper if the skill covers it.

The browse binary is at `~/.claude/skills/gstack/browse/dist/browse` and is
already built. `$B goto <url>`, `$B screenshot <path>`, `$B snapshot`.

## SITES, AND WHY EACH ONE

Do these six, in this order. If one blocks a headless browser, say so in the
report and move on — do not spend time defeating it.

1. `https://linear.app` — the reference for restraint and craft in this
   category. Look at type scale and how little colour it uses.
2. `https://www.raycast.com` — dark, dense, warm-ish. Closest existing thing to
   the palette Fate already has.
3. `https://obsidian.md` — the direct comparison. Fate opens the same folders.
   Pay attention to how it shows the GRAPH, which is the visual we need most.
4. `https://tldraw.com` — a canvas product showing a canvas. We need a canvas
   pipeline board on the page and this is the closest prior art.
5. `https://www.cursor.com` — an agent-adjacent dev tool, so the closest thing
   to Fate's actual pitch.
6. `https://warp.dev` — heavy motion, and worth seeing where that tips into
   noise.

## WHAT THE REPORT MUST CONTAIN

Per site, and keep it factual — quote numbers, not impressions:

- Fonts actually loaded (family, weights, and the px size of the h1)
- Palette as hex, ranked by how much of the page uses it
- Page width, section rhythm, and the vertical space between sections
- What the FIRST viewport contains — is it a claim, a screenshot, a live demo,
  a video? How much of the fold is product versus words?
- Motion: what animates, on what trigger, and which library if any
- Whether product UI is shown as a static image, a video, or live DOM

Then three synthesis sections, which are the actual point:

**A. What they all share.** The table stakes. If all six do it, we probably do
it too or have a reason not to.

**B. What is trending.** Anything appearing in the newer ones only.

**C. Where the category is weak.** The most valuable part. Where do these sites
converge on something lazy or generic? Fate's audience punishes the standard
"dark background, big serif headline, three icon cards" template, and we need
somewhere deliberate to depart from it.

## CONSTRAINTS

- Read-only. Do not edit any file in `fate-site` except creating
  `docs/design-research.md`.
- Do not propose the Fate design. Do not pick fonts for us. Report what is out
  there; the design decision is being made separately against your evidence.
- No screenshots into the repo. Put them in your temp dir and reference the
  findings in prose. The repo stays free of binary assets for now.
- If `/design-extract` needs a browser tool that is unavailable, say so plainly
  at the top of the report rather than silently degrading to guesswork.

## CONTEXT YOU NEED

Fate is a markdown vault whose PRIMARY USER IS AN AI AGENT — you point Claude,
Codex or Gemini at a folder and it works out what it is without configuration.
The human is secondary. The site must show three product surfaces: a
force-directed graph, a database/table view, and a canvas pipeline board.

The one thing a visitor should remember: **it already understands your folder.**

Existing palette, taken from the app itself, and unlikely to change:
Ink `#160c08`, Bistre `#26160b`, Sand `#d8b493`, Tan `#ba9b7d`,
Clay `#987d65`, Taupe `#806854`, Coffee `#433428`, Cream `#f0cba5`.

Say in the report whether that palette is a liability against the six sites, and
be blunt if it is.

## WHEN DONE

Report back with: the six sites and whether each was reachable, the three
synthesis sections in full, and the single most useful thing you found. If a
site blocked you, say which and why.
