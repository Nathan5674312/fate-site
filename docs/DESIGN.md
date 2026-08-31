# DESIGN.md — divineconstruc.com

**Living document.** Nathan is drip-feeding direction; every instruction lands
here as it arrives, newest context wins. If something in the code disagrees with
this file, this file is right and the code is behind.

Evidence for the category claims below lives in `docs/design-research.md`
(measured off live pages, nothing inferred). This file is the decisions.

---

## 1. Locked

| Decision | Value | Source |
|---|---|---|
| Brand on the page | **DIVINE CONSTRUC** — no T | Nathan, 2026-08-30 |
| Relationship | Fate is the project; Divine Construc is the umbrella he ships everything under | Nathan |
| The one thing to remember | **It already understands your folder** | Nathan, chosen from four |
| ~~Hero composition~~ | ~~Arced type over a lit doorway~~ → **CUT 2026-08-30.** Built, then removed. No replacement concept yet | Nathan |
| ~~Graph in the doorway~~ | ~~The light is the product~~ → **CUT 2026-08-30** with the arch. Whether the graph returns lower down is open | Nathan |
| Three surfaces required | Graph · database/table · canvas pipeline board | Nathan |
| Surfaces are live DOM | Not screenshots. Also the "I made this with the tool" proof | Nathan + research §C2 |
| Quality bar | The work curated on recent.design / godly — award tier | Nathan |
| Mobile app | App Store + Play buttons at launch, **disabled until the listings are real** | Nathan + honesty rule |

## 2. Open — waiting on Nathan

- **What the fold is.** The arch and the graph are cut and nothing replaced
  them. It currently carries the claim, the sub and the CTA and nothing else.
- **Is the graph out of the whole site, or only the fold?** The three surfaces
  (graph, table, canvas) were a locked requirement; only the hero one was cut.
  `src/demo.ts` and `src/lib/layout.ts` are kept and unused pending the answer.
- **The palette.** See §4. Currently the single biggest unknown.
- Whether the giant wordmark repeats at the foot of the page (the Hermes move).
- Whether the page inverts to a light ground below the fold.

## 3. Hard rules

1. **No placeholder copy.** Every string is a real fact or a commented TODO.
   `src/content.ts` holds all of it; a visible sentence inside a component is a bug.
2. **The honesty block stays.** What is built and what is not. It is the most
   valuable thing on the page for this audience, and the roadmap is public.
3. **No stock photography, no AI hero illustration, no cookie banner, no popup,
   no carousel.** Roadmap note 12 lists these as things this audience punishes.
4. **Reduced motion is a `matchMedia` condition, never an `if`.** Content still
   arrives, it just does not travel.
5. **Nothing may depend on JS to become visible.** The `.motion` class gates every
   hidden start state; a blocked bundle must still render a complete page.
6. **No WebGL for a glow.** `vanta-backgrounds` §9. The competitor proves inline
   SVG is enough for a graph.

## 4. Palette — OPEN, and deliberately not the app's

**2026-08-30, Nathan: "the site shouldn't be the palette of the app"** and, of
the Hermes reference, **"not the same palette"** either. So both of these are
ruled out:

- ❌ The app's eight browns (Ink → Cream). Also independently criticised in
  `design-research.md`: it is a one-hue ramp with no accent, and six of the eight
  are hard to tell apart at small sizes. A graph cannot show node types with it.
- ❌ Hermes' electric blue. Reference for *structure*, not for hue.

**Current interim state:** a neutral high-contrast base — near-black ground,
near-white display type, and one cool accent (`--color-glow #dbe4ff`) that reads
as *light* rather than as a brand colour. This is the ASCENSION reference's own
scheme, so it is the safest place to sit while the real palette is undecided.

**Still true whatever we pick:** the palette needs **one hue that is not the
ground**, because the three surfaces structurally require it — node types in the
graph, state in the table, branches in the pipeline. Every reference site has
one (Linear pink, Obsidian purple, Cursor orange, Warp terracotta, Hermes blue).

## 5. Reference — Hermes Agent (2026-08-30)

Nathan's second reference. Take the **structure and typography**, not the colour.

What it does that we should take:

- **One saturated ground, flooded edge to edge.** No gradients, no sections in
  different colours. The confidence comes from committing to a single field.
- **High-contrast editorial serif, all caps, tight leading**, for display. Set
  large and left-aligned, not centred.
- **Monospace micro-labels** in uppercase with wide tracking (`#1 CONNECT`,
  `OPEN SOURCE · MIT LICENSE`). This is the detail that makes it read as a
  *tool* rather than a brochure, and it is nearly free.
- **A giant wordmark bleeding off both edges**, near the foot. Type as
  architecture rather than as a logo.
- **A white inset panel** for the dense content, floating on the flood. The
  contrast between flood and panel does the sectioning, so no icon cards are
  needed — which is exactly the failure `design-research.md` §C5 identified.
- **The product shown as a real window**, wide, with real text in it.

What it does that we should NOT take:

- The chrome/metallic 3D render. That is their brand, and an AI-generated
  equivalent is on the banned list.
- Feature blocks with empty coloured squares where images will go. We ship no
  placeholder assets.

## 6. Motion

Owned by `motion-system`; GSAP is the engine, per the `gsap` skill.

- Entry: staggered, `amount` not `each`, so the total does not change when the
  content does.
- `to()` from a CSS-hidden state, never `from()` — `from()` paints the finished
  position for one frame first.
- One ticker. If Lenis lands later, it drives `gsap.ticker`; never Lenis and
  ScrollSmoother together.
- Reveal once, then disconnect the observer. A page that dismantles itself on
  scroll-up looks broken.

## 7. Log

- **2026-08-30** — "completely remove the graph and the divine construc
  letters." Both cut. `Hero.tsx` and `hero.css` deleted; the brand eyebrow
  went too, reading "completely" literally. Dark ground confirmed as liked
  and kept. Bundle fell 272kB to 197kB with GSAP no longer imported - it is
  still installed, on the assumption motion returns.

- **2026-08-30** — ASCENSION reference: giant backlit arced type over a lit
  doorway. Built. Graph placed inside the doorway as the light source.
- **2026-08-30** — "construc, no t". Brand corrected on the page.
- **2026-08-30** — "the whole name doesn't bend enough, looks really rough."
  Arc increased and the letterform treatment reworked. See §8.
- **2026-08-30** — "the site shouldn't be the palette of the app." App browns
  dropped from the hero; palette reopened. See §4.
- **2026-08-30** — Hermes Agent reference added. See §5.

## 8. Known rough edges

- **The arch bend was too shallow** (13° at the outermost character) and Nathan
  called the result rough. Increased, and the per-character lift made properly
  circular rather than quadratic so the baseline sits on a real arc.
- **Fraunces is a placeholder display face.** It was chosen before any reference
  existed. The Hermes reference points at a higher-contrast Didone-ish caps
  face; revisit once the palette lands.
- The fold is bare. Deliberately: inventing a replacement concept would just be
  something else to remove. Waiting on direction.
- None of the three surfaces are built. The graph existed only in the doorway
  and went with it.
- GSAP is installed but unused. Remove it if motion is not coming back.
