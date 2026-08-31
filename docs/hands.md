# The two hands — how they get built and animated

Research pass, 2026-08-30. Nathan: *"I want them to both be animated... the human
hand, I literally want the fingers to be reaching out to the best of their
ability. Like, the hand to literally be shaking... the AI hand to just be loosely
dangling, maybe reaching out a finger then pulling back, maybe saying it's gonna
grab then not."*

This file is the technical answer. `DESIGN.md` §9 stays the concept.

---

## 1. Technique — segment rig, driven by GSAP

Five candidates were considered. One survives.

| Approach | Verdict |
|---|---|
| **Segment ("cutout") rig** — the hand is cut into palm + phalanges, each an `<image>` in a nested `<g>`, rotated at its joint | ✅ **This one.** Photoreal source, full articulation, no new dependency |
| Frame sequence / sprite | ❌ A continuous irregular tremor cannot be looped frames without reading as a GIF |
| MorphSVG between poses | ❌ Only morphs outlines. Cannot carry interior shading, and the machine hand needs to look rendered |
| Rive state machine | ❌ Right *shape* of tool — "idle → feint → retract" is literally a state machine — but **~200 KB gzipped of WASM** against GSAP core at 27 KB, and it needs the Rive editor to author. Two hands do not amortise that |
| WebGL / three.js | ❌ Overkill, and rule 6 already bans WebGL for decoration |

**Why the segment rig is the right one:** it is how every professional 2D
character rig works (Spine, Live2D, After Effects DUIK). It takes a raster image
— including one that came out of an image model — and makes it articulate. So we
keep the photoreal, dither-friendly source *and* get real finger motion.

### The rig

Nested `<g>` per joint, each rotating about its own knuckle:

```
g#hand              → wrist rotation, whole-hand drift
  image (palm)
  g#index-prox      → svgOrigin at the MCP knuckle
    image
    g#index-mid     → svgOrigin at the PIP joint
      image
      g#index-dist  → svgOrigin at the DIP joint
        image
  ... ×5 fingers
```

GSAP `svgOrigin: "412 318"` sets the pivot in viewBox coordinates, which is
exactly what a joint is. `smoothOrigin` prevents the jump when an origin changes
mid-animation. 16 animatable rotations per hand; GSAP drives all of them from one
timeline.

**Seams:** overlap each segment ~15% into its parent and round the proximal end,
so rotation never opens a gap. Standard rig practice; costs nothing, but it has
to be done at cut time, not later.

---

## 2. 🔴 What this means for the artwork — read before generating

The rig, not the image, creates the pose. That inverts what to generate:

1. **Generate a NEUTRAL, RELAXED pose. Not the strained one.** A hand already
   clenched at maximum reach cannot be rigged into anything else — the segments
   are foreshortened and overlapping. Generate the hand slightly open, fingers
   separated, palm roughly flat to camera. The strain gets posed in code, which
   also means it stays tunable without regenerating.
2. **Fingers must not overlap each other.** Any two fingers touching in the
   source is a cut that cannot be made cleanly.
3. **Clean, flat background.** Cutting 16 segments out of a busy background is
   hours of masking.
4. **Generous resolution — 2048px on the long edge minimum.** Segments get
   scaled and rotated independently; a soft source shows it.
5. **Both hands lit from the same side.** They share a frame. Two different light
   directions reads as a collage.

Same rules for the machine hand, plus: it must be the *perfect* one — the failed
generations are still derived backwards from it (`DESIGN.md` §9).

---

## 3. The human hand — strain is TWO layers, not one

The obvious approach is to shake it. That is wrong, and the physiology says why.

**Real physiological tremor is 8–12 Hz** — roughly 90% of people peak between 7
and 11 Hz, and intrinsic hand muscles sit at 6–12 Hz. Amplitude climbs sharply
with force: tremor amplitude increases at an increasing rate as you approach
maximum voluntary contraction. So a straining hand really does buzz at ~10 Hz.

**But 10 Hz on a 60 fps screen is 6 frames per cycle.** Rendered literally, it
reads as *vibration* — a buzzing phone, a glitch — not as effort. Effort is not
legible at that frequency.

**So it needs two layers running at once:**

| Layer | Frequency | Amplitude | What it reads as |
|---|---|---|---|
| **Effort** | 0.6–1.2 Hz | 8–14 px, mostly along the reach axis | The surge — pushing, gaining a little, losing it, pushing again |
| **Tremor** | 9–11 Hz | 1–2 px | The buzz of a muscle at its limit |

The **effort layer is what sells it**, and it is the one people leave out. Its
shape matters more than its size: a fast asymmetric push toward the machine, a
held moment at full extension where the tremor amplitude *doubles*, then a slower
involuntary sag. Not a sine wave — a sine reads as a machine, which is the wrong
hand.

Per-finger detail on top:

- Fingers splay and hyperextend at peak effort, then curl slightly on the sag.
- Each finger lags the palm by 30–60 ms (follow-through). Uniform motion is the
  single biggest tell of a fake rig.
- The **index finger reaches furthest and shakes most** — it is the one nearest
  the machine, and the eye goes to the gap.

**Implementation:** a `gsap.ticker` callback summing two noise sources into the
rotations, rather than a tween. `CustomWiggle` (`type: "random"`, free since
2025) and `RoughEase` are the right tools for the irregularity of the effort
layer; the tremor is cheaper as raw summed noise at incommensurate frequencies,
so it never visibly repeats.

---

## 4. The machine hand — dangle, then feint

Opposite construction. Nothing about it is driven by effort; everything is driven
by weight and by choice.

**The dangle.** Motion originates at the wrist and *propagates outward with
delay*. Fingers do not initiate — they follow, each one 60–120 ms behind its
parent, with a little overshoot. This is overlapping action, and it is the entire
difference between hanging loosely and hanging stiffly. `InertiaPlugin` (also
free now) gives the overshoot for free.

**The feint.** This is the gesture that does the work, so its timing is the whole
argument:

- **Slow out, hold, slow back.** A fast snap-back reads as flinching — as if it
  were startled, or afraid of us. Nothing about this hand should look reactive.
- **The hold is at near-contact**, close enough that the gap is the subject, and
  it lasts *just* long enough to feel deliberate — 400–700 ms.
- **Then withdraw slower than it extended.** Unbothered. It is not refusing, it
  is simply done.
- **One finger, usually the index.** The whole hand moving is a decision; one
  finger is a consideration.
- **Randomised interval, 6–14 s, never the same twice.** A fixed loop reads as a
  GIF and kills the illusion instantly. Vary which finger, how far, and whether
  it commits at all — some feints should stop halfway and never reach the hold.

**The asymmetry runs through every parameter.** Human: high frequency, small
amplitude, involuntary, continuous, never resolves. Machine: low frequency, large
amplitude, deliberate, intermittent, perfectly composed. Nobody will read those
words off the screen, but everyone will feel them.

---

## 5. 🔴 The dither conflict — and how it resolves

`DESIGN.md` locks a 1-bit dither over both hands. Animation breaks the obvious
implementation of that, and it needs deciding before any art is made.

**The technique exists.** A four-primitive SVG filter does real ordered
dithering: `feImage` loads a 4×4 Bayer matrix, `feTile` repeats it,
`feComposite operator="arithmetic"` adds it to the source, and
`feComponentTransfer` with `tableValues="0 1"` thresholds each channel to 1-bit.

**Two things kill it as a live filter:**

1. **Cost.** Applying a filter to an element that also animates forces the
   browser to recompute the whole filter graph every frame, instead of
   compositing a cached layer. Over a hero-sized region on a 2× display that is
   millions of pixels through four primitives, sixty times a second.
2. **Firefox.** It fails to render `feImage` from a data URI, and drops `feTile`
   on local references — the exact two primitives this needs. An 8-year-old open
   bug covers the fragment case.

**Also worth knowing:** *Atkinson* dithering specifically cannot be done as a
filter or a shader at all. It is error diffusion — the error at each pixel is
pushed into pixels not yet processed — which is inherently serial. Any GPU-side
dither is *ordered* (Bayer) or noise-thresholded. The reference images look
ordered anyway.

### The resolution: bake it into the segments

Dither each of the ~32 cut segments **once, at build time**, as a static asset,
then animate the segments. Runtime cost of the dither: zero. Works in every
browser. Survives JS being off.

The tradeoff is honest and worth stating. A baked dither is **locked to the
object** — the pattern is the material of the hand, and moves with it, like an
etching on a moving surface. A live filter is **locked to the screen** — the hand
moving *through* a fixed grid, which reads as something being displayed on a
1-bit monitor.

Screen-locked is thematically better for the machine (it is being *rendered*),
and object-locked is right for the human (it is *engraved*). If we want that
split, apply the live filter to the machine hand only — a much smaller region,
with a static PNG fallback for Firefox. That is an upgrade, not the first build.

---

## 6. Degradation — non-negotiable, per rules 4 and 5

- **No JS:** both hands render as plain static `<image>` segments in their
  neutral rig pose. A complete, composed picture. Nothing is hidden pending JS.
- **`prefers-reduced-motion`:** the machine skips the self-improvement sequence
  and starts converged; both hands hold still. Handled by a `gsap.matchMedia()`
  condition, never an `if`, so toggling the OS setting re-evaluates instead of
  stranding the page.
- **The tremor is never the resting state.** If the ticker dies, the hands are
  posed and still, not caught mid-shake.
- One ticker for both hands. Two `requestAnimationFrame` loops is how the two
  hands drift out of sync with each other.

---

## 7. Build order

1. Cut the machine hand into segments, rig it, get the dangle right. It is the
   harder motion, and it validates the whole rig approach.
2. Add the feint, with randomised timing.
3. Human hand: rig, then the two-layer strain.
4. Bake the dither into the segments.
5. The self-improvement load sequence (`DESIGN.md` §9), derived backwards from
   the finished machine hand.
6. Only then consider the screen-locked filter for the machine.

## 8. Sources

- Physiological tremor 8–12 Hz, amplitude vs MVC — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0304394017300447), [J Neurophysiol](https://journals.physiology.org/doi/full/10.1152/jn.00519.2014), [J Appl Physiol](https://journals.physiology.org/doi/full/10.1152/japplphysiol.90851.2008)
- Fatigue and load dependence of tremor — [PubMed 10656518](https://pubmed.ncbi.nlm.nih.gov/10656518/), [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/016794579190022P)
- SVG dither filter, working markup — [dither-with-css](https://github.com/tomren1/dither-with-css), [Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering), [Codrops feComponentTransfer](https://tympanus.net/codrops/2019/01/29/svg-filter-effects-poster-image-effect-with-fecomponenttransfer/)
- feImage / feTile browser bugs — [MDN feImage](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feImage), [Bugzilla 455986](https://bugzilla.mozilla.org/show_bug.cgi?id=455986), [Bugzilla 1538554](https://bugzilla.mozilla.org/show_bug.cgi?id=1538554)
- Filter cost on animated elements — [svg-filter-lab](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md), [Codrops feTurbulence](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)
- GSAP svgOrigin, CustomWiggle — [GSAP SVG docs](https://gsap.com/resources/svg/), [CustomWiggle docs](https://gsap.com/docs/v3/Eases/CustomWiggle/)
- Rive vs Lottie runtime weight — [Unicorn Icons](https://unicornicons.com/blog/lottie-vs-rive-performance), [PkgPulse](https://www.pkgpulse.com/guides/lottie-vs-rive-vs-css-animations-web-animation-formats-2026)
