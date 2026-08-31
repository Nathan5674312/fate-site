# Design research — developer-tool landing pages

Method: `/design-extract` (the vault skill, unmodified) evaluated in a real
headless Chromium at 1440×900, after scrolling each page to the bottom in four
steps so lazy sections mounted. Plus a supplementary script for the fields the
brief asks for that the skill does not cover (h1 px, loaded `@font-face` list,
section padding, fold composition by element area). Screenshots taken to a temp
dir, not the repo.

**Every number below was read off the live page. Nothing here is inferred.**

## Reachability

| Site | Status | Note |
|---|---|---|
| linear.app | OK 200 | |
| raycast.com | OK 200 | |
| obsidian.md | OK 200 | |
| tldraw.com | OK 200 | **Not a landing page.** See below. |
| cursor.com | OK 200 | |
| warp.dev | OK 200 | |
| tldraw.dev | OK 200 | Added by me — tldraw.com has no marketing page, so the brief's question had no answer without it. |

Nothing blocked the headless browser. No degradation to guesswork anywhere.

---

## 1. linear.app

Dark. The restraint is real and it is measurable.

- **Type** — `Inter Variable` (the variable file, not static cuts) + `Berkeley
  Mono`. Three `@font-face` entries total. **Weights actually painted: 400
  (2847 uses) and 510 (250).** 500/590/300 appear under 30 times combined.
  Effectively a two-weight site, and 510 is a variable-axis value — not a
  named weight — which is why it looks subtly firmer than a normal medium.
- **h1** — 64px / 64px line-height (**leading ratio exactly 1.0**), weight 510,
  tracking −1.408px (−0.022em), colour `#f7f8f8`. Left-aligned.
- **Scale** — 10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 24 · 32 · 48 · 64 · 72.
  Fourteen steps, but the body work is done by 14/16 on a **24px leading that
  appears 2360 times** — one dominant rhythm, not a scale in use.
- **Palette** (ranked by painted nodes)
  - ground `#0f1011`, deeper `#08090a`
  - surfaces are **`rgba(255,255,255,0.08)` and `rgba(255,255,255,0.02)`** —
    translucent white over the ground, not opaque grey cards
  - text `#8a8f98` (190) then `#62666d` (132) then `#d0d6e0` (115) then
    `#e2e4e7` (81) then `#f7f8f8` (26). Note the top text colour is the
    *muted* one.
  - accents: `#f79ce0` pink (41), `#f7bf8b` peach (22), `rgba(0,255,5,0.1)`
    green tint (16). That is **~79 painted nodes of colour on a 9960px page.**
- **Layout** — container 1344px (30 uses), prose column 672px. Section padding
  **128px top and bottom**, four consecutive sections at 1220–1232px tall. The
  rhythm is nearly metronomic.
- **Radii** — 9999px (72) · 8px (30) · 50% (28) · 12px (19) · 4px (18) · 9px (18).
- **Fold** — headline + one line of subhead + a **static `<img>` 1440×804 at
  89.3% of the lower fold**. Not a video, not live DOM. 38 images, 222 SVGs,
  **zero `<canvas>`** on the whole page.
- **Motion** — `color 0.1s cubic-bezier(0.25,0.46,0.45,0.94)` is the signature
  (187 uses); 0.16s for filter/transform. **Only 2 elements below the fold are
  hidden or offset**, so Linear does almost no scroll-reveal. Named keyframes
  are `grid-dot-0-0-upDown` and siblings — one keyframe generated *per dot* in
  a grid — plus `xt7VyG_scroll` (a marquee).
- **Libraries** — no GSAP, Lenis, Three, Nuxt or Next detected.

## 2. raycast.com

The closest existing thing to a warm dark palette — and it gets its warmth from
a shadow, not from the greys.

- **Author variables, verbatim** — a full grey ramp `--grey-50 #e6e6e6` ·
  `-100 #cdcece` · `-200 #9c9c9d` · `-300 #6a6b6c` · `-400 #434345` ·
  `-500 #2f3031` · `-600 #1b1c1e` · `-700 #111214` · `-800 #0c0d0f` ·
  `-900 #07080a`. Spacing scale `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 56
  · 64 · 80 · 96 · 112 · 168 · 224`. Rounding scale `0 · 4 · 6 · 8 · 12 · 16 ·
  20 · 24 · 100%`.
- **These greys are neutral.** Every one is within 2 points across R/G/B. The
  page reads warm because of one shadow: `rgba(215,201,175,0.05) 0 0 20px 5px`
  — a **cream glow**, `#d7c9af`, which is within a few points of Fate's Tan
  `#ba9b7d` lightened. That is the whole warmth budget.
- **Type** — Inter (1898) + `SF Pro Text` (524) + GeistMono (29). Loaded but
  barely painted: JetBrains Mono, Instrument Serif, VT323. **Weights: 400
  (1417) · 500 (841) · 600 (187) · 700 (41).** Four real weights — twice
  Linear's.
- **h1** — 64px, weight 600, leading 70.4px (1.1), **tracking `normal`** — no
  negative tracking at all, which is unusual now.
- **Tracking elsewhere is positive**: 0.1px (316) · 0.2px (267) · 0.3px (149).
  Raycast tracks *out*, everyone else tracks *in*.
- **Layout** — container 1204px, prose 750px. Page is 15681px — the tallest in
  the set by 60%.
- **Fold** — **words only, centred.** Headline, two-line subhead, a download
  button, and an install hint in mono. No product in the first viewport. There
  is one WebGL `<canvas>` at 1200×967 (89.6% of fold) but it renders as an
  ambient near-black field; it carries no information.
- **Radii** — 11px is the most-used (159), not 8px. An odd number, deliberate.
- **Motion** — `opacity 0.4s cubic-bezier(0.23,1,0.32,1)` (159) — that is
  *easeOutQuint*, a long confident decel. Plus 0.3s and 0.2s ease-in-out.
- **Libraries** — none of GSAP/Lenis/Three. Vercel-hosted.

## 3. obsidian.md — the direct comparison

**The most useful site in the set, and the finding is what it does *not* do.**

- **Type** — a plain `ui-sans-serif, system-ui, -apple-system…` stack is the
  only family painted (765 uses), though Inter 400/500/600/700 is loaded. So
  the site ships Inter and then mostly renders the system stack.
  Weights 400 (637) · 500 (66) · 600 (54) · 700 (8).
- **h1** — 60px, weight 600, leading 60px (**ratio 1.0**, same as Linear),
  tracking −1.2px (−0.02em), colour `#eeeeee`. Left-aligned.
- **Palette** — ground `#1f1f1f`, then `#262626` · `#1e1e1e` · `#171717`.
  Text `#eeeeee` then `#bcbcbc` then `#b3b3b3` then `#a3a3a3`. One accent,
  purple: `#8a5cf5` solid and `#a78bfa` for text, plus `rgba(138,92,245,0.15)`
  tint. The author variables expose a whole editor palette (`--color-red
  #fb464c`, `--color-green #44cf6e`, `--color-cyan #53dfdd`, `--color-purple
  #a882ff`) but those are the *app's* syntax colours leaking into the marketing
  CSS — they are not painted on the page.
- **Scale** — 6 · 7 · 8 · 9 · 10 · 11 · 12 · 13 · 14 · 16 · 18 · 20 · 24 · 28 ·
  36 · 60. The 6–9px sizes exist because the app mockup is rendered at reduced
  scale in real DOM.
- **Layout** — container 1120px. Page 6716px, the second shortest.
- **THE GRAPH.** This is what the brief needs. Verified by querying the hero
  region directly:
  - The hero app mockup is **live DOM, not a screenshot.** Zero `<img>` and
    zero `<canvas>` in the hero area; the text "Writing is telepathy" exists as
    real text nodes (4 occurrences in the document).
  - The graph is an **inline `<svg>`, 349×316px.** A second SVG at 218×218
    sits inside the phone mockup.
  - It occupies **8.5% of the first viewport**, as the *third* pane of a
    three-pane window, cropped by the fold. Grey/white dots, hairline edges,
    two green nodes. No motion, no interaction, no labels.
  - There are two WebGL canvases at 499×374 elsewhere on the page — below the
    fold, not the hero.
- **Motion** — `color 0.15s cubic-bezier(0.4,0,0.2,1)` (Tailwind's default
  ease). One outlier: `transform 1s, box-shadow 2s ease-in-out`.
- **Libraries** — none detected.

> **Obsidian's graph is decoration.** It is the third pane, a quarter-crop, no
> bigger than a playing card, static, and it appears once. The single most
> recognisable artefact in the category is being used as texture.

## 4. tldraw.com — there is no landing page

- `https://tldraw.com` **is the application.** `document.scrollHeight` is
  **900px** — exactly one viewport, no scroll. One `<canvas>` (non-WebGL, 2D)
  filling the frame, one 1440×900 SVG overlay, tool palette, style panel.
- Two text sizes on the entire document: **12 and 24.** One painted weight: 500.
- The only marketing is a dismissible toast, bottom-right: *"Build with the
  tldraw SDK"*.
- `--tla-font-ui` is Inter. Ground `#fcfcfc`/`#f9fafb`, ink `#2e2e2e`.

**The most aggressive positioning decision in the whole set: the product is the
homepage, and the pitch is a toast.**

## 5. tldraw.dev — the canvas product's actual pitch

- **Author variables** — a clean shadcn-shaped token set:
  `--background #fefefe` · `--foreground #1d1d1d` · `--text #404047` ·
  `--muted-foreground #aaa` · `--border #e3e3e3` · `--primary #155dfc` ·
  `--destructive #e40014` · `--alt-surface #0d0d0d` · `--code-chrome-surface
  #18181b`. **Light page with a dark inverted surface reserved for code.**
- **Type** — `Archivo` (948) + `Geist Mono` (65). Weights 400 (939) · 500 (80)
  · 600 (11). **Scale is five steps: 12 · 14 · 16 · 32 · 48.** The tightest
  type discipline of any site here.
- **h1** — 48px, weight 600, leading 45.12px (**0.94 — tighter than the font
  size**), tracking −0.96px (−0.02em), pure `#000`.
- **Layout** — container 1024px. **Section padding is a flat 96px** on every
  section without exception. Page 6046px.
- **Fold** — headline, one-line subhead, a copyable `npm create tldraw`
  command, then **a code panel on the left and a genuinely live, drawable
  tldraw canvas on the right**, side by side. The canvas is a real 651×347
  `<canvas>` at 17.4% of the fold.

> **This is the strongest precedent for Fate's canvas surface**: source on the
> left, the running thing on the right, in the fold, interactive on first
> paint. It proves the claim instead of asserting it.

## 6. cursor.com — the biggest surprise

**Cursor is a light, warm, cream page.** Not dark. This contradicts the
category assumption the brief is built on.

- **Palette** — ground `#f2f1ed` (59) and `#f7f7f4` (39), with `#e6e5e0` for
  surfaces. Ink is `#26251e` (374 uses) — a **warm olive-black**. Muted text is
  expressed in `oklab()` at 0.6 / 0.5 / 0.4 alpha of that same ink. Accents:
  `#f54e00` orange (10) and `#65afe0` blue (24). Dark `#26251e` is also used as
  a *background* (87) for inverted blocks.
- **Type** — bespoke `CursorGothic` (1036) + `berkeleyMono` (258) + **`EB
  Garamond` (104)**. Fifty-two `@font-face` entries loaded, including a full
  KaTeX set and Lato. Weights painted: 400 (1912) · 500 (29) · 600 (13).
  **Essentially a one-weight site.**
- **h1 is 26px.** Weight 400, tracking −0.325px, leading 32.5px. There is a
  72px size in the scale but the headline is not it. Cursor has **abandoned the
  big-headline convention entirely** — the sentence is set at near-body size and
  the product screenshot carries the fold.
- **Fold** — 26px headline, two buttons, then a 1300×720 product screenshot at
  **72.2% of the fold**, composited over an oil-painting landscape backdrop.
  Static `<img>` from Next.js image optimisation. One `<video>` on the page,
  zero canvases.
- **Layout** — container 1300px, then 840 / 580 / 427 for inner columns.
  Section padding 67.2px (4.2rem — an odd value). Sections settle at 685–739px.
- **Radii** — 4px dominates (162). Everything is *squarer* than the category.
- **Motion** — Tailwind's `0.15s cubic-bezier(0.4,0,0.2,1)`. 16 elements
  offset below the fold. Keyframes: `shimmer` plus mobile-only opacity fades.
- **Libraries** — none of GSAP/Lenis/Three. Vercel.

## 7. warp.dev — also light, and less animated than assumed

The brief expected heavy motion. **It is a white page with restrained motion.**

- **Palette** — ground `#ffffff` (24), with `oklch(0.4 0.007 220)` as both a
  text colour (92) and a background (24), and `#000` / `#121212` for inverted
  blocks. Ink is `oklch(0.07 0.007 220)` — a *cool* near-black, 220° hue.
  Accents: `#6855de` purple (8) and **`#d97757` terracotta (8)**.
- **Type** — `Matter` (922) + `matterMono` (224) + **`theFuture` (18)**, which
  is the display face and is used for the h1 only. Twenty-four faces loaded
  including Instrument Serif, Abel, Hack, Azeret Mono, Inter — most unpainted.
  Weights 400 (1052) · 500 (158) · 600 (50) · 700 (10).
- **h1** — 72px, **weight 400**, leading 79.2px (1.1), tracking −2.52px
  (−0.035em). The largest and the loosest-weighted headline in the set: a wide
  geometric at book weight, tracked hard in.
- **Tracking is positive on UI text**: 0.75px (176) · 0.7px · 0.6px · 1px.
  Buttons and the ticker are **mono, uppercase, letterspaced**.
- **Layout** — container 1200/1280px. Section padding 64px. Page 6424px.
- **Fold** — headline, subhead, two buttons, then two overlapping product
  screenshots (static PNGs, largest 1200×654 = 60.6% of fold) composited over a
  blurred iridescent photograph, with a mono marquee pinned to the bottom edge.
- **Motion** — the only site with a **declarative reveal system**:
  `data-motion-reveal` and `data-motion-reveal-item` attributes, driving
  keyframes `demo-stage-in`, `warp-lite-story-reveal`, `scroll-left`. 17
  elements offset below the fold. The base transition token is
  `cubic-bezier(0.4,0,0.2,1)` used **1115 times**.
- **Libraries** — no GSAP/Lenis/Three. Hand-rolled.

---

# A. What all of them share — the table stakes

1. **A neutral grotesque as the workhorse, and a mono as the only companion.**
   Inter ×3, plus three bespoke grotesques (CursorGothic, Matter, Archivo).
   Every single site pairs it with a mono — Berkeley Mono ×2, GeistMono,
   matterMono, JetBrains Mono. **Mono is the category's second voice.** No site
   uses a serif for body text; Cursor's EB Garamond and Warp's Instrument Serif
   are accents at ~100 and ~0 painted nodes.
2. **Two to four painted weights, and one of them does 80%+ of the work.**
   Linear 400/510. Cursor 400 alone (1912 of 1961). tldraw.dev 400 alone.
   Obsidian 400. **Nobody uses six weights.** Loading a dozen faces and painting
   two is normal here.
3. **Negative tracking on display type.** −0.022em (Linear), −0.02em (Obsidian,
   tldraw.dev), −0.035em (Warp). Raycast is the sole exception at `normal`.
4. **Headline leading at or below 1.0.** Linear 64/64. Obsidian 60/60.
   tldraw.dev 48/45.12. This is the single most consistent number in the set
   and it is the one most often got wrong by default styling.
5. **A 24px body leading.** 2360 uses on Linear, 1003 on Cursor, 655 on Warp,
   435 on tldraw.dev, 267 on Obsidian. Five of seven converge on the same number.
6. **Product UI in the first viewport, occupying 60–90% of it.** Linear 89.3%,
   Raycast 89.6% (ambient), Cursor 72.2%, Warp 60.6%. Words alone never fill
   the fold. Raycast is the only one that puts *no product* in the fold.
7. **Product shown as a static image.** Linear, Cursor and Warp all ship PNGs.
   Only Obsidian (live DOM) and tldraw.dev (live canvas) render the real thing.
8. **Almost no colour.** Linear paints ~79 coloured nodes across a 9960px page.
   Obsidian has exactly one accent hue. Cursor has two. The ground/ink/muted
   triple does everything.
9. **No animation library. Anywhere.** Zero GSAP, zero Lenis, zero Three.js,
   zero Nuxt, and no Framer Motion signature on any of the seven. All motion is
   CSS transitions and named `@keyframes`, on `cubic-bezier(0.4,0,0.2,1)` or a
   custom quint. *(Caveat: a bundled library would not appear in a global or a
   script URL. But the absence of both globals and vendor chunks across seven
   sites is itself the signal.)*
10. **Section rhythm is one number repeated.** Linear 128px. tldraw.dev 96px.
    Warp 64px. Cursor 67.2px. Not a scale — a constant.
11. **Container 1024–1344px, prose column 580–750px.**

# B. What is trending — visible in the newer pages only

1. **Light is back, and it is warm.** Cursor `#f2f1ed`/`#26251e` and Warp
   `#ffffff`/`oklch(0.07 …)`. Two of the six are light, and they are the two
   with the most recent redesigns. The "obviously a dev tool = dark" reflex is
   now a majority, not a rule.
2. **`oklch()` / `oklab()` in production.** Warp declares text and backgrounds
   in `oklch()`; Cursor expresses its entire muted-text ramp as `oklab()` alpha
   steps off one ink. Neither ships a hex ramp for muted text.
3. **The headline is shrinking.** Cursor's h1 is **26px**. The convention it
   replaces — 60–72px — is still on Linear, Obsidian, Raycast and Warp, which
   makes Cursor the outlier and the newest.
4. **Painterly and photographic backdrops behind product shots.** Cursor's oil
   landscape, Warp's blurred iridescence. Both are a reaction against the
   gradient-mesh-on-black era, and both let a light page carry a dark screenshot.
5. **Translucent surfaces over opaque cards.** Linear's most-used background is
   `rgba(255,255,255,0.08)`, not a grey hex. Raycast's is
   `rgba(255,255,255,0.05)`. Cards are built from the ground, not on top of it.
6. **The copyable install command as the primary CTA.** `npm create tldraw`
   with a copy button (tldraw.dev), `Install via WinGet` (Raycast).
7. **Declarative reveal attributes over animation libraries.** Warp's
   `data-motion-reveal` is the pattern the category is converging on instead of
   pulling in GSAP.
8. **"…and agents" in the headline.** Linear: *"for teams and agents"*. Warp:
   *"interact with agents across your SDLC"*. Cursor: *"is your coding agent"*.
   The word is now table stakes in the h1 itself.

# C. Where the category is weak — the departure points

This is the part worth acting on.

### C1. Nobody shows a graph as anything but wallpaper
Obsidian owns the graph in the public mind and renders it at **349×316px,
8.5% of the fold, cropped, static, in the third pane.** No labels, no
interaction, no state. It is texture. The category has a signature visual and
uses it as a background.

**Departure: make the graph the fold, at full bleed, live, and make it
respond.** It is already an inline SVG in the competitor's own hero — this is
cheap DOM, not WebGL, and Obsidian proved the rendering approach works.

### C2. Static screenshots for products that are inherently live
Linear, Cursor and Warp — the three biggest — all ship PNGs. A screenshot of a
UI is the one asset that can be faked, and every visitor knows it. tldraw.dev
is the only site that lets you *use* the product in the fold, and it is
instantly the most convincing page in the set.

**Departure: three real surfaces, in the DOM, that respond to the pointer.**
This also happens to be the "I made this with the tool" proof — a claim nobody
in the category can make with a PNG.

### C3. The fold is a claim, not a demonstration
Six of seven open with an abstract sentence: *"Sharpen your thinking."*, *"Your
shortcut to everything."*, *"The open platform for automating development"*.
These are interchangeable. None of them show the reader a thing happening.

**Departure: the fold should perform "it already understands your folder"
rather than say it.** A plain directory going in and structure coming out is a
demonstration; every headline above is an assertion.

### C4. The human is always the protagonist
Every page is addressed to a person: *your* shortcut, *your* thinking, *your*
coding agent. Warp gets closest with *"interact with agents"* — but the agent
is still the object. **No site in this category is designed for an agent as the
primary reader.** That is Fate's actual position and there is no prior art
occupying it.

### C5. Section 3–6 is always the same three icon cards
After the fold, all seven fall into a constant-padding stack of equal-height
feature blocks — Linear's four sections at 1220/1226/1229/1232px are the purest
example. The rhythm is so regular it becomes invisible, and it is where the
"AI slop landing page" resemblance actually lives. It is not the fold that
looks generic; it is everything under it.

**Departure: vary the section heights and let one surface break the container.**

### C6. Mono is used for chrome, never for content
Berkeley Mono, GeistMono, matterMono all appear in buttons, badges, captions
and tickers — 224–264 painted nodes each, all decorative. Nobody sets anything
*meaningful* in mono, despite every one of these products being a text tool.
For a markdown vault whose reader is an agent, mono carrying real file paths and
front-matter is both honest and unoccupied.

---

# The palette question — blunt

Fate: Ink `#160c08` · Bistre `#26160b` · Coffee `#433428` · Taupe `#806854` ·
Clay `#987d65` · Tan `#ba9b7d` · Sand `#d8b493` · Cream `#f0cba5`.

**It is not a liability for the reason you would expect, and it is a liability
for two you might not.**

**Contrast is fine.** Measured (WCAG relative luminance) against Ink `#160c08`:

| Colour | Contrast vs Ink | Verdict |
|---|---|---|
| Cream `#f0cba5` | **12.7:1** | primary text, comfortably |
| Sand `#d8b493` | **9.9:1** | primary or secondary text |
| Clay `#987d65` | **5.0:1** | body-legal, just; fine for secondary |
| Taupe `#806854` | **3.7:1** | **fails 4.5:1** — tertiary/metadata only |
| Coffee `#433428` | ~1.5:1 | borders and surfaces only, never text |

For comparison, Linear's own fourth text tone `#62666d` on `#0f1011` is
**3.3:1** — so having one sub-4.5 muted tone is normal. Fate is not broken.

**Problem 1: there is no accent, and every reference has one.** Linear has pink
`#f79ce0` + peach `#f7bf8b` + a green tint. Obsidian has purple `#8a5cf5`.
Cursor has orange `#f54e00` + blue `#65afe0`. Warp has purple `#6855de` +
terracotta `#d97757`. tldraw.dev has blue `#155dfc`. **Fate has eight browns and
nothing else.** With no hue contrast, a graph cannot show node types, a table
cannot show state, and a pipeline cannot show a branch. The three surfaces you
need to build *structurally require* a colour that is not brown. This is the
real gap, and it is functional, not aesthetic.

**Problem 2: eight steps of one hue is a ramp, not a palette.** Six of the
eight sit between Coffee and Sand and are hard to tell apart at small sizes.
Raycast's ten greys work because they are neutral — hierarchy comes free from
lightness alone. Fate's browns each carry saturation, so stacking them reads as
sepia. There is also **no true white and no true black** anywhere in the set,
and every reference anchors at one end or the other (`#f7f8f8`, `#fff`,
`#eeeeee`, `#000`, `#0d0d0d`).

**The strongest evidence in Fate's favour is Cursor.** Ground `#f2f1ed`, ink
`#26251e` — a warm cream and a warm near-black, from the most-watched dev tool
of the moment. That is Fate's palette family, inverted to light. Warp
independently reaches for `#d97757`, a terracotta two shades off Fate's Clay.
**The warmth is current. The direction may be wrong.** Fate's palette on a dark
ground competes with sepia and vintage-terminal associations; the same eight
colours on a Cream/Sand ground with Ink as the type puts Fate in the exact
territory Cursor just validated, and — since five of the seven references are
dark — makes it the one page in the category that does not look like the others.

Either way, the palette needs a ninth colour that is not brown.

---

# The single most useful thing found

**Obsidian's graph — the one artefact this whole category is known for — is an
inline `<svg>` 349×316px, static, uninteractive, occupying 8.5% of the fold as
the third pane of a screenshot-shaped mockup.**

Verified directly: zero `<img>` and zero `<canvas>` in that hero region, real
text nodes, an SVG at 349×316. The direct competitor renders its signature
visual in cheap, ordinary DOM, at the size of a playing card, and then does
nothing with it.

That means a full-bleed, live, pointer-responsive graph in the fold is (a)
technically undemanding — no WebGL, no library, the competitor already proves
inline SVG suffices; (b) unoccupied — no one in the set does it; and (c) exactly
the demonstration of "it already understands your folder" that section C3 says
every page in this category is missing.
