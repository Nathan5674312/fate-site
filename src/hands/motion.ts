/**
 * THE MOTION — pure functions of time. No DOM, no GSAP, no React.
 *
 * Every number in here is tunable and every function is testable, which is the
 * reason this file exists separately from the component. A previous version of
 * this mistake, in the app, shipped tests that asserted the right LINES existed
 * while the feature was broken. Behaviour that can only be checked by looking
 * at it is behaviour that silently rots, so the tremor frequency, the feint
 * timing rule and the reduced-motion pose are all asserted in tests/hands.test.mjs
 * against these functions rather than against the rendering.
 *
 * The research behind the constants is in `docs/hands.md`. The short version:
 *
 *   HUMAN   two layers. An EFFORT surge at ~0.4Hz that pushes, holds and sags,
 *           with a 9-11Hz physiological TREMOR riding on top whose amplitude
 *           doubles at full extension. Real tremor is 8-12Hz, but at 60fps that
 *           alone reads as a buzzing phone; the slow layer is what reads as
 *           effort, and it is the one everybody leaves out.
 *
 *   MACHINE the inverse on every axis. Low frequency, large amplitude,
 *           deliberate, intermittent. Motion starts at the wrist and propagates
 *           outward with delay, so the fingers never initiate — they follow.
 */

export const FINGER_IDS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type FingerId = (typeof FINGER_IDS)[number]

/** Rotations for one finger: [MCP, PIP, DIP] - knuckle, middle, fingertip. */
export type FingerAngles = readonly [number, number, number]

export type Pose = {
  /**
   * Rotation at the elbow, degrees. This is where a reach comes from: a surge
   * driven from the elbow is a whole arm straining, while the same surge at
   * the wrist is a hand waving. The rig is rooted here for that reason.
   */
  elbow: number
  /** Whole-hand offset and rotation, in hand-local units and degrees. */
  wrist: { dx: number; dy: number; rot: number }
  fingers: Record<FingerId, FingerAngles>
}

/* ---------------------------------------------------------------- easing --- */

const TAU = Math.PI * 2

function easeOutCubic(p: number): number {
  const q = 1 - p
  return 1 - q * q * q
}

function easeInOutSine(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * p)
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * The golden ratio conjugate, 0.618..., used to space every pair of oscillators
 * in this file.
 *
 * It is the number furthest from any simple fraction, so two sines separated by
 * it have no common period and their sum never repeats. Round frequencies do
 * the opposite: 9.3 and 10.7Hz are both multiples of 0.1, so they realign every
 * ten seconds — which is exactly the bug that shipped in the first version of
 * `tremor` and got caught by a test rather than by anyone watching it.
 *
 * Anywhere two frequencies meet in this file, they are separated by PHI or by
 * an irrational root. Replacing one with a tidy decimal reintroduces the loop.
 */
const PHI = (Math.sqrt(5) - 1) / 2

/**
 * Mulberry32, seeded. Deliberately a local copy rather than shared with
 * lib/layout.ts: that module's RNG is an implementation detail whose output
 * must never change, and coupling the two means a tweak to feint randomness
 * could silently move every node in the graph.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------- noise --- */

/**
 * 🔴 WHY THIS FILE STOPPED BEING MADE OF SINES.
 *
 * Nathan: "the hands just go in a back and fourth movement like there swaying,
 * change that make it more random. all the little random things we can add up
 * the more realistic the hands will be moving."
 *
 * He is right and the diagnosis is exact. A sum of two or three sines IS a
 * sway — irrational frequency ratios stop it repeating, but they cannot stop it
 * being smooth, symmetric and endlessly predictable. The eye reads the shape of
 * a sine wave in about two cycles.
 *
 * The formal version of "lots of little random things adding up" is FRACTAL
 * NOISE: value noise summed over several octaves, each half the amplitude and
 * roughly double the frequency. That gives motion with structure at every
 * scale — slow wandering, medium corrections, small jitter — all at once, and
 * genuinely aperiodic rather than merely long-period.
 *
 * Deterministic, so it stays testable: same seed, same motion, every load.
 */

function hash1(i: number, seed: number): number {
  let a = (Math.imul(i, 0x9e3779b1) + Math.imul(seed, 0x85ebca6b)) >>> 0
  a ^= a >>> 15
  a = Math.imul(a, 0x2c1b3c6d) >>> 0
  a ^= a >>> 12
  a = Math.imul(a, 0x297a2d39) >>> 0
  a ^= a >>> 15
  return (a >>> 0) / 4294967296
}

/** Smooth value noise, -1 to 1. One unit of x is one random control point. */
export function noise(x: number, seed = 0): number {
  const i = Math.floor(x)
  const f = x - i
  // Smoothstep, so the curve has no corners where control points meet.
  const u = f * f * (3 - 2 * f)
  return (hash1(i, seed) * (1 - u) + hash1(i + 1, seed) * u) * 2 - 1
}

/**
 * Fractal noise: octaves of `noise` stacked. This is the "little random things
 * adding up" — each octave contributes detail at its own scale.
 *
 * The frequency step is 2.03 rather than 2 on purpose. Exact doubling makes the
 * octaves share control points, so they line up periodically and reintroduce
 * the very structure this exists to avoid.
 */
export function fbm(x: number, octaves = 4, seed = 0): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, seed + o * 101) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

/* ----------------------------------------------------------- the human --- */

export const HUMAN_CFG = {
  /**
   * Surges per second. Slow enough to read as effort rather than vibration.
   *
   * 0.85 -> 0.42 -> 0.21 across two rounds of Nathan watching it. This rate
   * drives the POSE SEQUENCE as well as the shake, so it sets how often the
   * hand walks through all four poses and back: about five seconds a cycle now,
   * against 1.2 seconds at the original rate.
   *
   * The tremor FREQUENCY underneath is untouched at 9-11Hz. Slowing a tremor
   * does not calm it, it turns it into a wobble - what needed to come down was
   * the amplitude, which is a separate set of numbers.
   */
  effortHz: 0.21,
  /** Fraction of the cycle spent pushing out. Fast, because effort is fast. */
  push: 0.28,
  /** Fraction spent held at full extension, where the tremor doubles. */
  hold: 0.24,
  /**
   * How far the WRIST travels along the reach axis. Small, because most of the
   * reach is now the elbow below — the hand is the end of the arm, not the
   * source of the effort.
   */
  reach: 5,
  /** Elbow swing toward the machine at full effort. */
  elbowDeg: -5.2,
  /** Tremor at the elbow. Small in degrees, large by the time it reaches the
   *  fingertips — which is exactly how a real arm shakes. */
  elbowTremor: 0.2,
  /** Baseline tremor displacement. Doubled at the hold by the effort term. */
  tremorAmp: 0.5,
  /** Wrist rotation added at full effort. */
  wristRot: -5,
  /**
   * Per-finger delay, seconds. 30-60ms of follow-through: uniform finger
   * motion is the single biggest tell of a fake rig.
   */
  lag: { index: 0.03, middle: 0.038, ring: 0.046, pinky: 0.054, thumb: 0.042 },
  /** Hyperextension at full effort, per finger. Index reaches furthest. */
  extend: { index: 20, middle: 16, ring: 13, pinky: 11, thumb: 9 },
  /** Curl the fingers fall back into on the sag. */
  curl: { index: 7, middle: 6, ring: 6, pinky: 5, thumb: 4 },
} as const

/**
 * The effort curve, 0 (slack) to 1 (full extension).
 *
 * Asymmetric on purpose: a fast push, a held moment, then a slower involuntary
 * sag. A sine wave here reads as a machine, which is precisely the wrong hand.
 *
 * The slow envelope stops the cycles being identical, so the reach varies from
 * surge to surge — two sines rather than a stateful per-cycle scheduler. Their
 * frequencies are irrational fractions of the surge rate (see PHI above), so
 * the envelope never realigns with the cycle it is modulating.
 */
/*
 * Derived FROM the surge rate rather than hard-coded, so slowing the hand slows
 * its variation with it. Left at the old literal 0.85 these would have kept
 * cycling at the original speed against a surge running at half of it - a
 * mismatch that is hard to spot and impossible to unsee once spotted.
 */
const ENV1 = HUMAN_CFG.effortHz * PHI * PHI * 0.44
const ENV2 = ENV1 * PHI

export function effort(t: number, cfg = HUMAN_CFG): number {
  const p = (t * cfg.effortHz) % 1
  const sag = 1 - cfg.push - cfg.hold

  let shaped: number
  if (p < cfg.push) shaped = easeOutCubic(p / cfg.push)
  else if (p < cfg.push + cfg.hold) shaped = 1
  else shaped = 1 - easeInOutSine((p - cfg.push - cfg.hold) / sag)

  const slow =
    0.6 * (0.5 + 0.5 * Math.sin(TAU * ENV1 * t)) +
    0.4 * (0.5 + 0.5 * Math.sin(TAU * ENV2 * t + 1.3))

  return shaped * (0.7 + 0.3 * slow)
}

/**
 * Slow aimless drift, -1 to 1. Layered under everything so no part of either
 * hand ever holds still in the way only a computed thing does.
 *
 * Separate seeds per caller, so the wrist, each finger and each hand wander
 * independently — which is the whole point. Shared noise is just a sine with
 * extra steps.
 */
export function drift(t: number, seed: number, rate = 0.11): number {
  return fbm(t * rate, 4, seed)
}

/**
 * Physiological tremor, roughly -1 to 1. Three sines in and just above the
 * 8-12Hz band, weighted so the dominant component sits around 10Hz.
 *
 * 🔴 THE RATIOS BETWEEN THEM ARE IRRATIONAL, AND THAT IS THE WHOLE POINT.
 *
 * The first version of this used 9.3, 10.7 and 14.9Hz, which are all multiples
 * of 0.1Hz — so their sum repeated EXACTLY every ten seconds. Ten seconds is
 * well within the time someone spends looking at a hero, and a tremor the eye
 * learns is a tremor that stops reading as alive. A test caught it; nobody
 * would have caught it by watching.
 *
 * Deriving the upper two from the base by 2/sqrt(3) and sqrt(2) means no common
 * period exists at all. Change these to round numbers and the loop comes back.
 */
const F1 = 9.3
const F2 = (F1 * 2) / Math.sqrt(3) // ~10.74Hz
const F3 = F1 * Math.SQRT2 * 1.13 // ~14.86Hz

export function tremor(t: number, phase = 0): number {
  return (
    0.55 * Math.sin(TAU * F1 * t + phase) +
    0.32 * Math.sin(TAU * F2 * t + phase * 1.7 + 0.9) +
    0.13 * Math.sin(TAU * F3 * t + phase * 2.3 + 2.4)
  )
}

/**
 * How strong the tremor is RIGHT NOW, roughly 0.25 to 1.4.
 *
 * Nathan: the tremor should fluctuate. It should — a constant tremor is a motor,
 * and a real hand at its limit wavers: mostly holding, then losing it for a few
 * seconds, then gathering again. Constant amplitude is the giveaway that a
 * shake was generated rather than fought.
 *
 * 🔴 THE FIRST VERSION WAS IMPERCEPTIBLE, and Nathan said so: "i don't notice a
 * fluctuation". Two reasons, both worth keeping written down.
 *
 * It was too SLOW — periods of ~25s and ~40s, so seeing the pattern meant
 * watching for a minute. And it was too NARROW — a 0.25 to 1.4 swing on an
 * amplitude already small enough to be subtle is a modulation of something
 * barely visible in the first place.
 *
 * Now ~8s and ~12s, which is perceptible inside one viewing, and a swing from
 * near-zero to well above the old constant. The BASE amplitude came down to pay
 * for it, so the hand is mostly still and trembles occasionally rather than
 * buzzing continuously — quieter on average AND far more noticeable, which
 * sounds contradictory and is not: contrast is what gets noticed, not level.
 *
 * Still biased low. Raising the mix to a power above 1 keeps calm as the
 * default state, so the tremble is an event. A symmetric envelope would read as
 * a slow throb.
 *
 * Driven by fBm now rather than a pair of sines, so the waxing is itself
 * irregular — a hand that trembles on a schedule is still a machine.
 */
const TREM1 = HUMAN_CFG.effortHz * PHI

/**
 * Below this the hand is COMPLETELY still. Above it the tremble comes on fast.
 *
 * Nathan wanted "shaky then stops trying not shaky then even more then shaky
 * then stops then imedently shaking like crazy" — bursts, not a swell. A smooth
 * envelope cannot do that however wide its range: it is always somewhere in the
 * middle on the way between. A gate is what buys the stillness, and the
 * stillness is what makes the next burst read as sudden.
 */
const TREMOR_GATE = 0.52

export function tremorEnvelope(t: number): number {
  const n = 0.5 + 0.5 * fbm(t * TREM1 * 5.2, 3, 401)
  if (n < TREMOR_GATE) return 0
  // Steep onset: a power below 1 rises fast off the gate, so crossing it is an
  // event rather than a fade-in. Peaks well above the old ceiling, which is the
  // "shaking like crazy" end — affordable only because of the zeros.
  const over = (n - TREMOR_GATE) / (1 - TREMOR_GATE)
  return Math.pow(over, 0.6) * 1.9
}

/**
 * Per-layer gain, so the two layers can be soloed.
 *
 * This is not a debug nicety — it is the evidence for the central claim in
 * docs/hands.md. Turn the effort layer off and the hand buzzes like a phone on
 * a table; turn the tremor off and it heaves like it is breathing. Neither one
 * alone reads as strain, and the lab lets that be checked rather than believed.
 */
export type Gain = { effort: number; tremor: number }
export const FULL: Gain = { effort: 1, tremor: 1 }

/**
 * The straining hand at time t.
 *
 * `axis` is the direction of the reach in degrees, so flipping which corner the
 * machine sits in is one argument rather than a rewrite. DESIGN.md still
 * carries an unresolved conflict here — Nathan said bottom-left reaching
 * top-LEFT, then put the machine top-RIGHT — and this is where that gets
 * settled once he picks.
 */
export function humanPose(t: number, axis = -38, cfg = HUMAN_CFG, gain = FULL): Pose {
  const reach = effort(t, cfg) * gain.effort
  // Amplitude scales with force, so it is at its largest exactly when the hand
  // is at its limit. This is the doubling: 1 + reach spans 1x to 2x.
  const shake = tremor(t) * cfg.tremorAmp * (1 + reach) * gain.tremor * tremorEnvelope(t)
  const r = (axis * Math.PI) / 180

  const fingers = {} as Record<FingerId, FingerAngles>
  for (const id of FINGER_IDS) {
    const lagged = effort(t - cfg.lag[id], cfg) * gain.effort
    // Straightens toward hyperextension at peak, curls back on the sag.
    const spread = -cfg.extend[id] * lagged + cfg.curl[id] * (1 - lagged)
    const jitter =
      tremor(t - cfg.lag[id], id.length) * 1.1 * (1 + lagged) * gain.tremor * tremorEnvelope(t)
    // Every finger wanders on its own seed. Shared noise would be a sine with
    // extra steps: all five would drift as one piece.
    const wander = drift(t, 900 + id.length * 37, 0.09) * 2.2
    fingers[id] = [spread + jitter + wander, spread * 0.45, spread * 0.3]
  }

  return {
    elbow:
      reach * cfg.elbowDeg +
      tremor(t) * cfg.elbowTremor * (1 + reach) * gain.tremor * tremorEnvelope(t),
    wrist: {
      dx: Math.cos(r) * reach * cfg.reach + shake * 0.7 + drift(t, 11, 0.08) * 3.2,
      dy: Math.sin(r) * reach * cfg.reach + shake * 0.5 + drift(t, 29, 0.07) * 2.6,
      rot: reach * cfg.wristRot + shake * 0.35 + drift(t, 53, 0.06) * 1.4,
    },
    fingers,
  }
}

/* --------------------------------------------------------- the machine --- */

export const MACHINE_CFG = {
  /**
   * The dangle. An order of magnitude slower than the human tremor, and the
   * second rate is PHI times the first so the hang never repeats.
   */
  swayHz: 0.22,
  swayHz2: 0.22 * PHI, // ~0.136Hz
  /** Wrist rotation range, degrees. Large, because nothing here is resisting. */
  swayDeg: 5,
  /** Elbow swing. The dangle starts here and propagates outward. */
  elbowDeg: 3.4,
  /** How far the wrist trails the elbow, seconds. */
  wristLag: 0.05,
  /** Delay before a finger picks up the wrist's motion, seconds. */
  fingerLag: { index: 0.06, middle: 0.075, ring: 0.09, pinky: 0.105, thumb: 0.12 },
  /** Extra delay per joint down the finger. This is what makes it whip. */
  jointLag: 0.04,
  /** Curl amplitude at each joint. Rising distally: the tip trails furthest. */
  jointGain: [0.6, 0.95, 1.25] as const,
  curlDeg: 6,
} as const

/**
 * The dangle, -1 to 1. Two slow sines, so the hand never hangs at exactly the
 * same angle twice and never settles.
 */
export function sway(t: number, cfg = MACHINE_CFG): number {
  // Was two sines, which is exactly the back-and-forth Nathan objected to.
  // Four octaves of noise wanders instead: it drifts, pauses, corrects, and
  // never arrives back where it was.
  return fbm(t * cfg.swayHz * 1.9, 4, 17)
}

/* ------------------------------------------------------------- the feint --- */

export type Feint = {
  start: number
  finger: FingerId
  /** How far it goes, 0 to 1. Below ABORT it never reaches the hold. */
  commit: number
  /** Seconds extending. */
  out: number
  /** Seconds held at near-contact. Zero for an aborted feint. */
  hold: number
  /** Seconds withdrawing. ALWAYS longer than `out` — see below. */
  back: number
}

/** Below this, the gesture thinks better of it and never reaches the hold. */
export const ABORT = 0.55

export const FEINT_CFG = {
  /** Seconds between gestures. Randomised: a fixed loop reads as a GIF. */
  gap: [6, 14] as const,
  out: [0.75, 1.05] as const,
  hold: [0.4, 0.7] as const,
  /** Withdrawal is this multiple of the extension. Never below 1. */
  backRatio: [1.4, 1.9] as const,
  /** An aborted gesture still withdraws slower than it reached. */
  abortBackRatio: 1.15,
  commit: [0.35, 1] as const,
  /** Weighted finger choice. The index is the one nearest the gap. */
  weights: { index: 0.55, middle: 0.25, ring: 0.12, thumb: 0.08, pinky: 0 },
  /** Straightening applied to the chosen finger at full commitment. */
  extendDeg: 26,
} as const

function pick(r: number, range: readonly [number, number]): number {
  return range[0] + r * (range[1] - range[0])
}

function pickFinger(r: number): FingerId {
  let acc = 0
  for (const id of FINGER_IDS) {
    acc += FEINT_CFG.weights[id]
    if (r < acc) return id
  }
  return 'index'
}

/**
 * The next gesture, scheduled after `after`.
 *
 * THE ONE INVARIANT: `back` is always longer than `out`. It withdraws more
 * slowly than it reached. A fast snap-back reads as flinching — startled, or
 * afraid of us — and nothing about this hand should look reactive. It is not
 * refusing; it is simply done. Tested, because it is the whole character of the
 * gesture and it would be very easy to tune away by accident.
 */
export function nextFeint(rand: () => number, after: number): Feint {
  const start = after + pick(rand(), FEINT_CFG.gap)
  const finger = pickFinger(rand())
  const commit = pick(rand(), FEINT_CFG.commit)
  const out = pick(rand(), FEINT_CFG.out)
  const aborted = commit < ABORT
  return {
    start,
    finger,
    commit,
    out,
    hold: aborted ? 0 : pick(rand(), FEINT_CFG.hold),
    back: out * (aborted ? FEINT_CFG.abortBackRatio : pick(rand(), FEINT_CFG.backRatio)),
  }
}

export function feintEnd(f: Feint): number {
  return f.start + f.out + f.hold + f.back
}

/** How far the gesture has extended at time t, 0 to `commit`. */
export function feintAmount(f: Feint, t: number): number {
  const e = t - f.start
  if (e <= 0) return 0
  if (e < f.out) return f.commit * easeOutCubic(e / f.out)
  const held = e - f.out
  if (held < f.hold) return f.commit
  const w = held - f.hold
  if (w < f.back) return f.commit * (1 - easeInOutSine(w / f.back))
  return 0
}

/**
 * The withholding hand at time t.
 *
 * The dangle is unconditional; the feint is layered on one finger when one is
 * active. Passing the feint in rather than storing it here keeps this function
 * pure and lets the tests drive it to any moment of any gesture directly.
 */
export function machinePose(t: number, feint: Feint | null, cfg = MACHINE_CFG): Pose {
  const s = sway(t, cfg)
  const reaching = feint ? clamp01(feintAmount(feint, t)) : 0

  const fingers = {} as Record<FingerId, FingerAngles>
  for (const id of FINGER_IDS) {
    const lag = cfg.fingerLag[id]
    const joints = cfg.jointGain.map((gain, j) => sway(t - lag - j * cfg.jointLag, cfg) * cfg.curlDeg * gain)
    // The gesture straightens the finger out of its hang, most at the knuckle.
    const straighten = feint && feint.finger === id ? reaching * FEINT_CFG.extendDeg : 0
    fingers[id] = [
      joints[0] - straighten,
      joints[1] - straighten * 0.55,
      joints[2] - straighten * 0.3,
    ]
  }

  return {
    elbow: s * cfg.elbowDeg,
    wrist: {
      dx: s * 2.2 + reaching * 3,
      dy: Math.abs(s) * -1.2 + reaching * 4,
      // Trails the elbow. Nothing here initiates; everything follows.
      rot: sway(t - cfg.wristLag, cfg) * cfg.swayDeg,
    },
    fingers,
  }
}

/* ------------------------------------------------- the pose sequence --- */

/**
 * 🔴 WHY SLOWING THE HAND DID NOT SLOW THE POSE CHANGES.
 *
 * Nathan, twice: the transitions are too fast, and after the last change they
 * were "still the same speed". He was right, and halving the surge rate could
 * never have fixed it.
 *
 * The pose position used to be `effort(t) * (poses - 1)`. Effort is a SHAPED
 * curve — a fast push, a hold, a slow sag — and the push is only 28% of the
 * cycle by design. So the hand walked through all four poses during that push,
 * in about 1.3 seconds, no matter how slow the surge itself was. Halving the
 * rate halved how OFTEN it happened and changed the transition speed barely at
 * all.
 *
 * So the sequence now has its own clock, and a slow aimless one: it wanders
 * through the poses over tens of seconds rather than being dragged through them
 * by the reach. The cost is that the pose change and the strain surge are no
 * longer the same gesture, which they were deliberately before — worth it,
 * because the old coupling made the strongest argument for a speed nobody
 * wanted.
 */
/**
 * 🔴 HOLD, THEN SWEEP. This shape is the whole reason the glowstick works.
 *
 * Nathan: "really show the transition like how when i move a glowstick you can
 * see the path from piont a to be, you just made the points a and b show up
 * better." Exactly right, and it was two separate failures.
 *
 * First, a per-pixel dissolve HAS NO PATH. Pixels are reassigned from one still
 * to the other; nothing travels between them, so a temporal trail can only make
 * A and B linger. Second, a slow continuous wander leaves no smear even when
 * something does move — a glowstick smears because it moves FAST.
 *
 * So the sequence holds a pose for several seconds and then crosses to the next
 * in a fraction of one. Infrequent, which is the "slow" he asked for twice, and
 * quick in the crossing, which is what the trail can actually draw.
 */
export const POSE_CFG = {
  /** Seconds spent holding a pose before moving. */
  hold: [3.5, 8] as const,
  /** Seconds to cross to the next. Short: this is the part that smears. */
  cross: [0.3, 0.5] as const,
} as const

export type PoseStep = { start: number; from: number; to: number; dur: number }

export function nextPoseStep(
  rand: () => number,
  after: number,
  count: number,
  from: number,
): PoseStep {
  const hold = POSE_CFG.hold[0] + rand() * (POSE_CFG.hold[1] - POSE_CFG.hold[0])
  const dur = POSE_CFG.cross[0] + rand() * (POSE_CFG.cross[1] - POSE_CFG.cross[0])
  // Never pick the pose it is already on, or the hold silently doubles.
  let to = Math.floor(rand() * (count - 1))
  if (to >= from) to += 1
  return { start: after + hold, from, to, dur }
}

export function poseStepEnd(s: PoseStep): number {
  return s.start + s.dur
}

/** Where along the sequence the hand is at time t. */
export function poseAt(s: PoseStep, t: number): number {
  if (t <= s.start) return s.from
  if (t >= s.start + s.dur) return s.to
  const p = (t - s.start) / s.dur
  // Eased both ends so the crossing accelerates and settles rather than
  // starting and stopping at full speed.
  return s.from + (s.to - s.from) * easeInOutSine(p)
}

/**
 * How fast the pose is changing, in poses per second. Zero while holding, high
 * during a crossing — which is what drives the physical sweep that the trail
 * then draws as a path.
 */
export function poseSpeed(s: PoseStep, t: number): number {
  if (t <= s.start || t >= s.start + s.dur) return 0
  const p = (t - s.start) / s.dur
  // Derivative of the ease, normalised: peaks at the midpoint of the crossing.
  const d = (Math.PI / 2) * Math.sin(Math.PI * p)
  return ((s.to - s.from) / s.dur) * d
}

/* --------------------------------------------------- the degradation --- */

/**
 * Every so often the picture loses resolution — fine, medium, coarse, brutal —
 * and then locks back in. Nathan's idea, and the read is signal degradation:
 * the image is being transmitted, not painted, and occasionally the link
 * struggles.
 *
 * RARE ON PURPOSE. He asked for less than once a minute, and that is the whole
 * effect: something that happens every few seconds is a loop, something that
 * happens once in a while is an event. A viewer should be able to miss it.
 */
export const DEGRADE_CFG = {
  /** Seconds between events. Comfortably over a minute at the low end. */
  gap: [70, 165] as const,
  /**
   * Block size and hold, in order. Down through the levels and back — stepping
   * out rather than snapping, because a snap back to fine reads as a dropped
   * frame while a step reads as recovery.
   */
  steps: [
    { block: 2, dur: 0.55 },
    { block: 3, dur: 0.5 },
    { block: 5, dur: 0.75 },
    { block: 3, dur: 0.26 },
    { block: 2, dur: 0.2 },
  ] as const,
} as const

export type Degrade = { start: number }

export function nextDegrade(rand: () => number, after: number): Degrade {
  return { start: after + DEGRADE_CFG.gap[0] + rand() * (DEGRADE_CFG.gap[1] - DEGRADE_CFG.gap[0]) }
}

export function degradeDuration(): number {
  return DEGRADE_CFG.steps.reduce((a, s) => a + s.dur, 0)
}

export function degradeEnd(d: Degrade): number {
  return d.start + degradeDuration()
}

/** Block size at time t. 1 — fine — whenever no event is running. */
export function degradeBlock(d: Degrade | null, t: number): number {
  if (!d) return 1
  let e = t - d.start
  if (e <= 0) return 1
  for (const s of DEGRADE_CFG.steps) {
    if (e < s.dur) return s.block
    e -= s.dur
  }
  return 1
}

/* ------------------------------------------------------------- at rest --- */

/**
 * The pose with nothing running: reduced motion, no JS, or a dead ticker.
 *
 * DESIGN.md rule — the resting state is never the mess and never mid-shake.
 * Whatever fails, the hands are found composed.
 */
export function restPose(): Pose {
  const fingers = {} as Record<FingerId, FingerAngles>
  for (const id of FINGER_IDS) fingers[id] = [0, 0, 0]
  return { elbow: 0, wrist: { dx: 0, dy: 0, rot: 0 }, fingers }
}
