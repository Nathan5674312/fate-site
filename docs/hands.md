# The two hands — how they get built and animated

Research pass, 2026-08-30. Nathan: *"I want them to both be animated... the human
hand, I literally want the fingers to be reaching out to the best of their
ability. Like, the hand to literally be shaking... the AI hand to just be loosely
dangling, maybe reaching out a finger then pulling back, maybe saying it's gonna
grab then not."*

This file is the technical answer. `DESIGN.md` §9 stays the concept.

---

## 1. Technique — animate the photograph, never redraw it

**Superseded 2026-08-30.** The first version of this file specified cutting a
generated hand into ~32 rigged segments. That was built as a placeholder and it
was bad, because it amounted to drawing a hand from scratch in vector, and a
hand drawn from scratch reads as a cartoon at any level of care.

Nathan: *"stop trying to draw the hand from scratch... everytime you make it
from scratch its really bad we need to do a different way."* Correct, and the
new direction makes almost all of the rigging unnecessary:

- **The human is Michelangelo's Adam hand**, fingers reaching further.
- **The machine is the SAME image, mirrored** — not shaking, *"relaxed and
  calculated."*

One asset, used twice. The asymmetry stops being two drawings and becomes two
*behaviours* applied to one picture, which is both far less work and a stronger
idea: the machine is literally our own reflection, declining to close the gap.

### What that needs, technically

| Requirement | Technique | Cost |
|---|---|---|
| Machine: relaxed drift, no shake | Whole-image `transform` on one `<img>` | **Nothing.** No cutting, no warping |
| Human: the shake | Whole-image `transform`, two-layer noise | **Nothing.** Already built and tested |
| Human: fingers reaching further | ONE cut — the index finger only | An hour of masking |

**The shake does not need the image touched at all.** A tremor is a rigid-body
motion: the whole hand moves, it does not deform. Animating `translate` and
`rotate` on a single element is GPU-composited and costs nothing per frame.

**The reach is the only thing that deforms**, and even then only one finger.
Adam's index finger is the subject of the entire painting, so cutting that one
finger out, rigging it at two joints, and leaving the rest of the hand as a
single untouched image gets the whole effect for about 1/16th of the work.

### Warping was considered and rejected

Two ways exist to bend part of a photograph without cutting it:

- **`feDisplacementMap`** — displaces pixels by the colour values of a second
  image. Good for ripples and warps; it has no notion of a joint, so it cannot
  extend a finger in a controlled way.
- **A triangle mesh with pins** (After Effects Puppet, Photoshop Puppet Warp,
  Live2D). This is the real tool for the job, using As-Rigid-As-Possible
  deformation. On the web it means a WebGL or canvas mesh renderer.

Both are far more machinery than one cut finger requires. Revisit only if the
whole hand needs to deform.

### Licensing

The *Creation of Adam* is Michelangelo, c. 1512 — public domain. Faithful
photographic reproductions of a 2D public-domain work carry no new copyright in
the US (*Bridgeman v. Corel*). So the source is safe to use and to modify.

## 2. What is needed to build it

1. **The Adam hand image** — cropped to the hand and forearm, background
   removed or removable, as large as can be found. This is the only blocking
   asset.
2. Nothing else. The machine is this image with `scaleX(-1)`.

If the fingers should visibly extend, one extra deliverable: the index finger
cut onto its own layer, with the gap behind it filled. That can come later —
the shake and the drift work without it.

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

## 7. What already exists

`src/hands/motion.ts` and `tests/hands.test.mjs` survive the change of approach
intact, because they were written as pure functions of time that output offsets
and rotations. Nothing in them knows or cares whether the thing being moved is a
vector path or a photograph — which is the one part of the placeholder detour
that was worth keeping.

Built and tested (23 assertions, all passing):

- `effort(t)` — the 0.85Hz surge: push, hold, sag, with a non-repeating envelope
- `tremor(t)` — the 9-11Hz physiological buzz
- `humanPose(t)` — both layers combined, with per-finger follow-through
- `sway(t)` / `machinePose(t)` — the relaxed drift and the feint
- `nextFeint` / `feintAmount` — gesture scheduling, with the withdraw-slower rule
- `restPose()` — the composed state for reduced motion and any failure

Deleted: the from-scratch vector rig (`rig.ts`, `scene.ts`, `Hands.tsx`,
`Lab.tsx`). It drew a hand, and drawing the hand is the thing we are not doing.

## 8. Build order

1. Get the Adam hand image.
2. Human: one `<img>`, whole-image shake driven by `humanPose`.
3. Machine: the same `<img>` mirrored, drift driven by `machinePose`.
4. Compose — the gap between the fingertips is the subject.
5. Bake the 1-bit dither into the two images at build time (section 5).
6. Only if needed: cut the index finger and rig it for the reach.

## 9. Sources

- Physiological tremor 8–12 Hz, amplitude vs MVC — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0304394017300447), [J Neurophysiol](https://journals.physiology.org/doi/full/10.1152/jn.00519.2014), [J Appl Physiol](https://journals.physiology.org/doi/full/10.1152/japplphysiol.90851.2008)
- Fatigue and load dependence of tremor — [PubMed 10656518](https://pubmed.ncbi.nlm.nih.gov/10656518/), [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/016794579190022P)
- SVG dither filter, working markup — [dither-with-css](https://github.com/tomren1/dither-with-css), [Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering), [Codrops feComponentTransfer](https://tympanus.net/codrops/2019/01/29/svg-filter-effects-poster-image-effect-with-fecomponenttransfer/)
- feImage / feTile browser bugs — [MDN feImage](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feImage), [Bugzilla 455986](https://bugzilla.mozilla.org/show_bug.cgi?id=455986), [Bugzilla 1538554](https://bugzilla.mozilla.org/show_bug.cgi?id=1538554)
- Filter cost on animated elements — [svg-filter-lab](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md), [Codrops feTurbulence](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)
- GSAP svgOrigin, CustomWiggle — [GSAP SVG docs](https://gsap.com/resources/svg/), [CustomWiggle docs](https://gsap.com/docs/v3/Eases/CustomWiggle/)
- Rive vs Lottie runtime weight — [Unicorn Icons](https://unicornicons.com/blog/lottie-vs-rive-performance), [PkgPulse](https://www.pkgpulse.com/guides/lottie-vs-rive-vs-css-animations-web-animation-formats-2026)
