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

## 9. The fold — Creation of Adam, inverted

**Status: concept locked. Nothing built.** Waiting on Nathan's two images.

### Composition

- **Human — enters BOTTOM LEFT, straining up-left, SHAKING.** Anatomically
  imperfect, never resolving, trembling continuously. Nathan draws it.
- **Machine — TOP RIGHT, descending, holding back slightly.** Converges on an
  anatomically perfect hand and then holds still.
- They meet left of centre, off the dead-centre axis. The gap is small.

### The machine self-improves on load

Nathan, 2026-08-30. The ouroboros, but temporal rather than drawn.

**On load the machine hand is a jumbled mess, and over several discrete
generations it corrects itself into a perfect hand — which then does not
reach.** The recursion is the mechanism, not an illustration of one: the page
load IS the training run. The literal snake-eating-tail is dropped.

**Why this passes the insider test.** The payload is that AI cannot draw hands —
the canonical joke, and every practitioner has seen the six-fingered results. A
machine hand that begins malformed and iterates into anatomical perfection is
instantly legible to exactly that audience, and invisible as a gag to everyone
else, who simply sees something resolve.

**Why the asymmetry is the thesis.** The machine achieves perfection and holds
still, withholding. The human is imperfect and shaking, and never resolves. In
the original, Adam is an idealised body receiving from the divine; here the
machine is the perfect one and the human is the flawed thing straining. One hand
is still because it is finished; the other never stops because it cannot arrive.

### Three rules this depends on

1. **Iteration, not a glitch reveal.** Five to eight DISCRETE generations, each
   recognisably a better attempt, with a beat between them. Smooth noise
   dissolving into clarity is the loading-spinner version and reads as
   decoration. Wrong fingers → fewer wrong → nearly right → right.
2. **The resting state is the PERFECT hand, never the jumbled one.** Reduced
   motion, blocked JS or any failure shows the finished hand holding back. The
   mess is only for people who are there for it.
3. **Runs once, stays converged.** Looping back to jumbled would undo the
   statement. If it needs life afterwards, a micro-refinement that never quite
   settles is the honest version.

### Assets needed from Nathan

- **One image: the final, perfect machine hand**, top-right, slightly withheld.
  The failed generations are derived BACKWARDS from it by programmatic
  degradation — so it converges on exactly the approved hand, he makes it once,
  and generation count and severity stay tunable without regenerating.
- **The human hand.** The tremor is added in code: a shake must be continuous
  and must never repeat identically, which a static asset cannot do.

### Build notes

- 1-bit Atkinson dither in code over both sources (see the rendering section
  above). Threshold, dot scale and tint stay adjustable.
- The gap is COMPUTED from the human fingertip, never typed. The deleted
  attempt hard-coded endpoints and two landed past the finger, inverting the
  meaning.
- Anatomy is checked BEFORE the dither: five fingers, plausible joints. Dither
  preserves silhouette, so it hides nothing structural.
- Silhouette first. The deleted attempt was texture with no outline and read as
  grey noise at fold scale.

## 7. Log

- **2026-08-30** — Machine locked: an ouroboros expressed as SELF-IMPROVEMENT
  ON LOAD — jumbled hand iterating into a perfect one that then withholds,
  against a human hand that shakes and never resolves. Diffusion dropped,
  literal snake dropped, node-web and logic gates rejected as cliché.
  Machine is TOP RIGHT, human bottom-left. See §9.

- **2026-08-30** — Rendering decided: generate the source, then 1-bit dither
  it in code. Logged as a deliberate exception to the no-AI-art rule, with
  the anatomy check that the exception depends on. See §9.

- **2026-08-30** — Fold attempt built, shown, and DELETED. Failure was
  silhouette: texture with no outline reads as noise at fold scale.
- **2026-08-30** — Machine locked as a diffusion denoise. Human hand is
  Nathan's to draw; he will specify, I build. Direction corrected again:
  bottom-LEFT reaching to top-left. Holds back *slightly*, not hugely.

- **2026-08-30** — Fold built. Machine = causal attention mask (chosen on the
  insider-recognition test). Hand = Adam's gesture under load, redrawn from
  Nathan's reference photo rather than used, because it is unlicensed stock.
  Direction taken from the newer instruction: arm enters bottom-RIGHT,
  reaching up-left. His first message said bottom-left — unconfirmed.

- **2026-08-30** — Creation of Adam concept for the fold, inverted: human
  straining from bottom-left, AI descending and withholding. See §9.

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
- GSAP is installed but unused. The fold is still static — the retraction is
  drawn, not animated. Motion is the obvious next step.
- **Arm direction unconfirmed.** First instruction said bottom-LEFT, the later
  one said bottom-right to top-left. Built to the later one.
- The hand is contour/wireframe, not filled anatomy. Deliberate — a badly drawn
  realistic hand at fold size is far worse than a deliberately abstract one —
  but it is a style choice Nathan has not seen yet.
