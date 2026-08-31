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
 *   HUMAN   two layers. An EFFORT surge at ~0.85Hz that pushes, holds and sags,
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

/* ----------------------------------------------------------- the human --- */

export const HUMAN_CFG = {
  /** Surges per second. Slow enough to read as effort rather than vibration. */
  effortHz: 0.85,
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
  elbowTremor: 0.6,
  /** Baseline tremor displacement. Doubled at the hold by the effort term. */
  tremorAmp: 1.5,
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
const ENV1 = 0.85 * PHI * PHI * 0.44 // ~0.1425Hz, incommensurate with the surge
const ENV2 = ENV1 * PHI // ~0.0881Hz

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
  const shake = tremor(t) * cfg.tremorAmp * (1 + reach) * gain.tremor
  const r = (axis * Math.PI) / 180

  const fingers = {} as Record<FingerId, FingerAngles>
  for (const id of FINGER_IDS) {
    const lagged = effort(t - cfg.lag[id], cfg) * gain.effort
    // Straightens toward hyperextension at peak, curls back on the sag.
    const spread = -cfg.extend[id] * lagged + cfg.curl[id] * (1 - lagged)
    const jitter = tremor(t - cfg.lag[id], id.length) * 1.1 * (1 + lagged) * gain.tremor
    fingers[id] = [spread + jitter, spread * 0.45, spread * 0.3]
  }

  return {
    elbow: reach * cfg.elbowDeg + tremor(t) * cfg.elbowTremor * (1 + reach) * gain.tremor,
    wrist: {
      dx: Math.cos(r) * reach * cfg.reach + shake * 0.7,
      dy: Math.sin(r) * reach * cfg.reach + shake * 0.5,
      rot: reach * cfg.wristRot + shake * 0.35,
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
  return (
    (Math.sin(TAU * cfg.swayHz * t) + 0.62 * Math.sin(TAU * cfg.swayHz2 * t + 2.1)) / 1.62
  )
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
