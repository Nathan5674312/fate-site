/**
 * TESTS FOR THE HANDS RIG.
 *
 * These assert BEHAVIOUR, not source text. The distinction is not academic: on
 * the app, a test suite for the canvas group feature asserted that the right
 * lines of code existed, they did, every test passed, and the feature was
 * broken the whole time. So nothing below greps a file. Each test drives the
 * real functions and measures what comes out — the tremor's frequency is
 * counted from its zero crossings, the gap is solved and then re-measured, and
 * the feint's timing rule is checked across five hundred generated gestures.
 *
 * Run: npm test
 */

import { build } from 'esbuild'

/* Bundle the TypeScript through esbuild and import it from memory. Node can
 * strip types on its own, but only with explicit file extensions on every
 * import, and contorting the source's import style to suit the test runner is
 * the tail wagging the dog. No temp files: the bundle goes straight to a data
 * URI. */
const out = await build({
  entryPoints: ['src/hands/motion.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
})
const H = await import(
  'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
)

/* ------------------------------------------------------------- harness --- */

let passed = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    passed++
  } catch (e) {
    failures.push(`${name}\n    ${e.message}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function near(a, b, tol, what) {
  assert(Math.abs(a - b) <= tol, `${what}: expected ~${b} (±${tol}), got ${a}`)
}

function inRange(v, lo, hi, what) {
  assert(v >= lo && v <= hi, `${what}: expected ${lo}..${hi}, got ${v}`)
}

/* ------------------------------------------------------- the two layers --- */

check('tremor runs at physiological frequency (8-12Hz band)', () => {
  // Zero crossings per second is twice the effective frequency, so a ~10Hz
  // tremor should cross about 20 times a second. This is the claim in
  // docs/hands.md measured directly off the function rather than trusted.
  const secs = 20
  const rate = 4000
  let crossings = 0
  let prev = H.tremor(0)
  for (let i = 1; i <= secs * rate; i++) {
    const v = H.tremor(i / rate)
    if ((prev < 0 && v >= 0) || (prev > 0 && v <= 0)) crossings++
    prev = v
  }
  const perSecond = crossings / secs
  inRange(perSecond, 16, 30, 'tremor zero crossings/sec')
})

/**
 * Does this signal ever repeat itself?
 *
 * Takes the first five seconds as a signature and slides it along the next five
 * minutes looking for a match. THIS TEST EARNED ITS KEEP: the first version of
 * `tremor` used 9.3, 10.7 and 14.9Hz — all multiples of 0.1 — and so looped
 * exactly every ten seconds. Nobody would have seen that by watching it, and by
 * the time it was noticeable the whole hero would read as a GIF.
 *
 * The same flaw was then found in the effort envelope and the machine's sway,
 * both of which looped every 100s. Hence: every oscillator gets checked.
 */
function bestRecurrence(fn, maxSec = 180) {
  const rate = 100
  const win = 5 * rate
  const sig = []
  for (let i = 0; i < win; i++) sig.push(fn(i / rate))

  let best = Infinity
  let at = 0
  for (let off = 2 * rate; off < maxSec * rate; off += 5) {
    let err = 0
    for (let i = 0; i < win; i++) err += Math.abs(fn((off + i) / rate) - sig[i])
    if (err / win < best) { best = err / win; at = off / rate }
  }
  return { best, at }
}

/*
 * CALIBRATION. Any sum of sines has near-recurrences — that is unavoidable and
 * harmless. What matters is the difference in kind between "comes close again"
 * and "is bit-for-bit identical again". The commensurate version below is the
 * bug as it originally shipped, and it matches itself to about 1e-14. Anything
 * built the right way sits around 1e-2, twelve orders of magnitude away, so the
 * threshold is nowhere near either the real signals or a tuning tweak.
 */
const COMMENSURATE = (t) =>
  0.55 * Math.sin(Math.PI * 2 * 9.3 * t) +
  0.32 * Math.sin(Math.PI * 2 * 10.7 * t + 0.9) +
  0.13 * Math.sin(Math.PI * 2 * 14.9 * t + 2.4)

const REPEAT_FLOOR = 1e-3

check('the repetition test can actually detect a repeat', () => {
  // A test for non-repetition that cannot fail is worse than no test at all.
  // This is the exact signal that shipped, proving the check has teeth.
  const { best } = bestRecurrence(COMMENSURATE)
  assert(best < 1e-6, `control should look periodic, matched at only ${best.toExponential(2)}`)
})

function assertNeverRepeats(label, fn) {
  const { best, at } = bestRecurrence(fn)
  assert(
    best > REPEAT_FLOOR,
    `${label} effectively repeats at ~${at.toFixed(1)}s (differs by ${best.toExponential(2)})`,
  )
}

check('tremor never repeats', () => {
  assertNeverRepeats('tremor', (t) => H.tremor(t))
})

check('the effort envelope never repeats', () => {
  // The surge RATE is deliberately regular — a straining hand does have a
  // rhythm. What must not repeat is the sequence of how far each surge gets.
  assertNeverRepeats('effort', (t) => H.effort(t))
})

check('the machine dangle never repeats', () => {
  assertNeverRepeats('sway', (t) => H.sway(t))
})

/* --------------------------------------------------- noise not sines --- */

check('the drift is aperiodic, not a sine in disguise', () => {
  /*
   * Nathan: the hands "just go in a back and fourth movement like there
   * swaying". A sum of sines cannot fix that however the frequencies are
   * chosen - irrational ratios stop it REPEATING but not being smooth and
   * symmetric, and the eye reads a sine in about two cycles.
   *
   * A sine spends its time at the extremes (its value distribution is
   * U-shaped, densest near +/-1). Noise spends its time in the middle. So
   * bucketing the values apart tells the two families of signal apart, which is
   * a test of the property that actually matters rather than of the numbers.
   */
  const sampleHist = (fn) => {
    const bins = new Array(10).fill(0)
    const n = 40000
    for (let i = 0; i < n; i++) {
      const v = fn(i / 40)
      bins[Math.min(9, Math.max(0, Math.floor((v + 1) / 2 * 10)))]++
    }
    return bins.map((b) => b / n)
  }
  const middle = (h) => h[3] + h[4] + h[5] + h[6]
  const edges = (h) => h[0] + h[9]

  const sine = sampleHist((t) => Math.sin(t * 1.7) * 0.6 + Math.sin(t * 1.1) * 0.4)
  const drifted = sampleHist((t) => H.drift(t, 5, 0.4))

  assert(
    middle(drifted) > middle(sine),
    `noise should sit mid-range more than a sine does (${middle(drifted).toFixed(2)} vs ${middle(sine).toFixed(2)})`,
  )
  assert(
    edges(drifted) < edges(sine),
    `noise should pin to the extremes less than a sine does (${edges(drifted).toFixed(2)} vs ${edges(sine).toFixed(2)})`,
  )
})

check('fractal noise carries detail at several scales', () => {
  /*
   * "All the little random things add up" is what octaves ARE. One octave is a
   * slow wander with nothing inside it; four have structure at every scale.
   *
   * Compared as fine detail RELATIVE TO the signal's own size, not in absolute
   * terms — fbm normalises its octaves, so the base octave of a four-octave sum
   * is quieter than a one-octave sum and an absolute comparison mostly measures
   * that normalisation instead of the property being claimed.
   */
  const roughness = (fn) => {
    let e = 0
    let sq = 0
    const n = 4000
    const step = 0.02
    let prev = fn(0)
    for (let i = 1; i < n; i++) {
      const v = fn(i * step)
      e += Math.abs(v - prev)
      sq += v * v
      prev = v
    }
    return e / n / Math.sqrt(sq / n)
  }
  const one = roughness((t) => H.fbm(t, 1, 3))
  const four = roughness((t) => H.fbm(t, 4, 3))
  assert(
    four > one * 1.5,
    `four octaves should be much rougher per unit amplitude (${four.toFixed(4)} vs ${one.toFixed(4)})`,
  )
})

check('drift stays in range and never repeats', () => {
  let lo = 9
  let hi = -9
  for (let i = 0; i < 60000; i++) {
    const v = H.drift(i / 40, 5, 0.3)
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  inRange(lo, -1.01, -0.2, 'drift minimum')
  inRange(hi, 0.2, 1.01, 'drift maximum')
  assertNeverRepeats('drift', (t) => H.drift(t, 5, 0.3))
})

check('every finger wanders on its own path', () => {
  // Shared noise across the fingers would be a sine with extra steps: all five
  // would drift as one rigid piece.
  const t = 12.34
  const paths = H.FINGER_IDS.map((id) => H.drift(t, 900 + id.length * 37, 0.09))
  const distinct = new Set(paths.map((v) => v.toFixed(6)))
  assert(distinct.size >= 3, `fingers share drift paths: ${paths.map((v) => v.toFixed(3))}`)
})

check('effort surges at the configured rate', () => {
  const secs = 40
  const rate = 500
  let rises = 0
  let prev = H.effort(0)
  for (let i = 1; i <= secs * rate; i++) {
    const v = H.effort(i / rate)
    if (prev < 0.5 && v >= 0.5) rises++
    prev = v
  }
  near(rises / secs, H.HUMAN_CFG.effortHz, 0.06, 'effort cycles/sec')
})

check('effort is asymmetric — pushes faster than it sags', () => {
  // A sine here reads as a machine, which is the wrong hand. Time spent rising
  // must be clearly less than time spent falling.
  const rate = 2000
  let rising = 0
  let falling = 0
  for (let i = 1; i <= 40 * rate; i++) {
    const d = H.effort(i / rate) - H.effort((i - 1) / rate)
    if (d > 0) rising++
    else if (d < 0) falling++
  }
  assert(rising < falling * 0.75, `push (${rising}) should be much shorter than sag (${falling})`)
})

check('tremor amplitude roughly doubles at full extension', () => {
  /*
   * Amplitude scales with force, so it is largest exactly when the hand is at
   * its limit — the (1 + reach) term.
   *
   * The waxing envelope is DIVIDED OUT before comparing. It varies independently
   * of effort, so a raw peak-vs-trough comparison measures both at once and
   * reports whatever the two happened to be doing together: it read 1.55 after
   * the envelope was widened, which looked like the doubling had broken when
   * nothing about it had changed. Isolate the claim, then test the claim.
   */
  // Sampled over 300s rather than 90s: the tremor gate now leaves the envelope
  // at exactly zero for most of its life, and those samples are unusable here
  // (dividing them out is a division by zero), so a short window could fail to
  // catch a peak and a trough that both coincide with an active burst.
  const rate = 600
  let highPeak = 0
  let lowPeak = 0
  let sawHigh = false
  let sawLow = false
  for (let i = 0; i < 300 * rate; i++) {
    const t = i / rate
    const e = H.effort(t)
    const full = H.humanPose(t, -38, undefined, { effort: 1, tremor: 1 })
    const none = H.humanPose(t, -38, undefined, { effort: 1, tremor: 0 })
    const env = H.tremorEnvelope(t)
    if (env < 0.05) continue
    const shake = Math.abs(full.wrist.dx - none.wrist.dx) / env
    if (e > 0.95) { highPeak = Math.max(highPeak, shake); sawHigh = true }
    if (e < 0.03) { lowPeak = Math.max(lowPeak, shake); sawLow = true }
  }
  assert(sawHigh && sawLow, 'never sampled both a peak and a trough')
  inRange(highPeak / lowPeak, 1.6, 2.15, 'tremor amplitude ratio peak:trough')
})

check('layers can be soloed', () => {
  const t = 3.37
  const noTremor = H.humanPose(t, -38, undefined, { effort: 1, tremor: 0 })
  const noEffort = H.humanPose(t, -38, undefined, { effort: 0, tremor: 1 })
  const both = H.humanPose(t, -38, undefined, { effort: 1, tremor: 1 })
  assert(noTremor.wrist.dx !== both.wrist.dx, 'tremor gain had no effect')
  assert(noEffort.wrist.dx !== both.wrist.dx, 'effort gain had no effect')
  // With effort off there is no reach at all, only the residual buzz.
  assert(Math.abs(noEffort.wrist.dx) < 3, 'effort:0 should leave only the tremor')
})

/* --------------------------------------------------------- the fingers --- */

check('fingers lag the palm (follow-through is real)', () => {
  const t = 0.15 // mid-push, where effort is changing fastest
  const cfg = H.HUMAN_CFG
  const pose = H.humanPose(t, -38, undefined, { effort: 1, tremor: 0 })
  const spread = (e) => -cfg.extend.index * e + cfg.curl.index * (1 - e)

  /*
   * The aimless wander is SUBTRACTED before comparing. It is a separate,
   * deliberate component on its own seed, so leaving it in makes this measure
   * lag and drift at once — which is how it started reading 0.279 against 0.942
   * and looked like follow-through had broken when nothing about it had.
   */
  const wander = H.drift(t, 900 + 'index'.length * 37, 0.09) * H.FINGER_WANDER
  const lagged = spread(H.effort(t - cfg.lag.index))
  const instant = spread(H.effort(t))
  near(pose.fingers.index[0] - wander, lagged, 1e-9, 'index MCP should follow the lagged effort')
  assert(
    Math.abs(instant - lagged) > 0.5,
    'test is inconclusive — pick a moment where effort moves faster',
  )
})

check('every finger has a distinct delay', () => {
  const lags = Object.values(H.HUMAN_CFG.lag)
  assert(new Set(lags).size === lags.length, 'two fingers share a lag; motion will look uniform')
  for (const l of lags) inRange(l, 0.03, 0.06, 'follow-through delay (seconds)')
})

check('the index finger reaches furthest', () => {
  // It is the one nearest the gap, and the gap is where the eye goes.
  let peak = 0
  let best = 0
  for (let i = 0; i < 4000; i++) {
    const t = i / 200
    const e = H.effort(t)
    if (e > peak) { peak = e; best = t }
  }
  const pose = H.humanPose(best, -38, undefined, { effort: 1, tremor: 0 })
  for (const id of ['middle', 'ring', 'pinky', 'thumb']) {
    assert(
      pose.fingers.index[0] < pose.fingers[id][0],
      `index (${pose.fingers.index[0]}) should extend past ${id} (${pose.fingers[id][0]})`,
    )
  }
})

/* --------------------------------------------------------- the machine --- */

check('machine motion propagates outward — the tip trails furthest', () => {
  const peak = [0, 0, 0]
  for (let i = 0; i < 20000; i++) {
    const p = H.machinePose(i / 200, null)
    for (let j = 0; j < 3; j++) peak[j] = Math.max(peak[j], Math.abs(p.fingers.middle[j]))
  }
  assert(peak[0] < peak[1] && peak[1] < peak[2], `amplitude should rise distally, got ${peak}`)
})

check('machine sways an order of magnitude slower than the human trembles', () => {
  assert(
    H.MACHINE_CFG.swayHz * 20 < 9,
    'the two hands must not share a frequency band, or the contrast collapses',
  )
})

/* ----------------------------------------------------------- the feint --- */

check('a feint always withdraws slower than it reached', () => {
  // THE character rule. A fast snap-back reads as flinching, which makes the
  // machine look reactive — startled, even afraid of us. It is not refusing;
  // it is simply done. Very easy to tune away by accident, so: asserted.
  const rand = H.rng(12345)
  let t = 0
  for (let i = 0; i < 500; i++) {
    const f = H.nextFeint(rand, t)
    assert(f.back > f.out, `feint ${i}: back ${f.back} must exceed out ${f.out}`)
    t = H.feintEnd(f)
  }
})

check('an uncommitted feint never reaches the hold', () => {
  const rand = H.rng(999)
  let t = 0
  let aborted = 0
  for (let i = 0; i < 500; i++) {
    const f = H.nextFeint(rand, t)
    if (f.commit < H.ABORT) { assert(f.hold === 0, 'an aborted gesture must not hold'); aborted++ }
    else assert(f.hold > 0, 'a committed gesture must hold at near-contact')
    t = H.feintEnd(f)
  }
  assert(aborted > 20, `expected a decent share of aborted feints, saw ${aborted}`)
})

check('feint amount stays within its commitment and returns to zero', () => {
  const rand = H.rng(7)
  let t = 0
  for (let i = 0; i < 200; i++) {
    const f = H.nextFeint(rand, t)
    assert(H.feintAmount(f, f.start - 0.01) === 0, 'must be zero before it starts')
    assert(H.feintAmount(f, H.feintEnd(f) + 0.01) === 0, 'must return to zero')
    let max = 0
    for (let s = 0; s <= 200; s++) {
      max = Math.max(max, H.feintAmount(f, f.start + (s / 200) * (H.feintEnd(f) - f.start)))
    }
    near(max, f.commit, 1e-6, `feint ${i} peak`)
    t = H.feintEnd(f)
  }
})

check('gestures are irregular — never the same twice', () => {
  const rand = H.rng(4242)
  let t = 0
  const gaps = new Set()
  const fingers = new Set()
  for (let i = 0; i < 100; i++) {
    const f = H.nextFeint(rand, t)
    gaps.add((f.start - t).toFixed(3))
    fingers.add(f.finger)
    inRange(f.start - t, H.FEINT_CFG.gap[0], H.FEINT_CFG.gap[1], 'interval between gestures')
    t = H.feintEnd(f)
  }
  assert(gaps.size > 90, `intervals repeat (${gaps.size}/100 distinct) — will read as a GIF`)
  assert(fingers.size >= 3, `only ${fingers.size} finger(s) ever used`)
})

check('the pinky never feints', () => {
  // A pinky offered to anything is comic. Weighted to zero on purpose.
  const rand = H.rng(31337)
  let t = 0
  for (let i = 0; i < 400; i++) {
    const f = H.nextFeint(rand, t)
    assert(f.finger !== 'pinky', 'the pinky should never be the one that reaches')
    t = H.feintEnd(f)
  }
})

check('a feint straightens the chosen finger and no other', () => {
  const f = { start: 0, finger: 'index', commit: 1, out: 0.9, hold: 0.5, back: 1.5 }
  const held = H.machinePose(1.2, f) // inside the hold
  const idle = H.machinePose(1.2, null)
  assert(held.fingers.index[0] < idle.fingers.index[0] - 20, 'index should straighten out')
  near(held.fingers.middle[0], idle.fingers.middle[0], 1e-9, 'middle must be untouched')
})

check('the tremor comes in bursts, with real stillness between', () => {
  /*
   * Nathan: "shaky then stops trying not shaky then even more then shaky then
   * stops then imedently shaking like crazy."
   *
   * That is bursts, and a smooth envelope cannot produce them however wide its
   * range — on the way between two levels it is always somewhere in the middle.
   * The gate is what buys genuine stillness, and the stillness is what makes
   * the next burst read as sudden. So: it must hit EXACTLY zero, spend a real
   * share of its life there, and peak high.
   */
  const rate = 20
  const vals = []
  for (let i = 0; i < 600 * rate; i++) vals.push(H.tremorEnvelope(i / rate))
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const stillShare = vals.filter((v) => v === 0).length / vals.length

  assert(lo === 0, `must go completely still, quietest was ${lo}`)
  inRange(hi, 1.4, 2.1, 'strongest the tremor gets')
  // Ceiling raised from 0.7 to 0.92 deliberately: after five rounds of "turn it
  // down" the hand is SUPPOSED to be still most of the time, and the bursts are
  // supposed to be occasional. A test that failed on that would be enforcing an
  // intent that has since been overruled.
  inRange(stillShare, 0.15, 0.92, 'share of time completely still')
})

check('the bursts arrive often enough to read as a pattern of stops and starts', () => {
  const rate = 20
  let bursts = 0
  let inBurst = false
  const secs = 120
  for (let i = 0; i < secs * rate; i++) {
    const on = H.tremorEnvelope(i / rate) > 0
    if (on && !inBurst) bursts++
    inBurst = on
  }
  const perMinute = bursts / (secs / 60)
  inRange(perMinute, 3, 40, 'tremor bursts per minute')
})

check('the tremor fluctuation is fast enough to notice', () => {
  // The first version swung over ~25s and ~40s and Nathan could not see it at
  // all. A fluctuation nobody notices within one viewing is not a fluctuation,
  // so this asserts the thing that was actually wrong rather than that the
  // numbers merely differ.
  const rate = 50
  const secs = 60
  let crossings = 0
  const mid = 0.6
  let prev = H.tremorEnvelope(0)
  for (let i = 1; i <= secs * rate; i++) {
    const v = H.tremorEnvelope(i / rate)
    if ((prev < mid && v >= mid) || (prev > mid && v <= mid)) crossings++
    prev = v
  }
  assert(crossings >= 8, `only ${crossings} swings in a minute — too slow to read`)
})

check('the tremor envelope is biased toward calm', () => {
  // Calm is the default state and shaking is the event. A symmetric envelope
  // would read as a slow throb instead.
  const rate = 20
  let below = 0
  let n = 0
  for (let i = 0; i < 600 * rate; i++, n++) {
    if (H.tremorEnvelope(i / rate) < 0.8) below++
  }
  assert(below / n > 0.5, `should sit calm most of the time, was ${(below / n * 100).toFixed(0)}%`)
})

/*
 * No never-repeats check on the envelope any more, and deliberately: it now
 * returns EXACTLY zero for seconds at a time, so two quiet windows are
 * legitimately identical and the test would fail on the feature working. The
 * noise underneath it is still covered by the drift and fbm checks.
 */

check('poses HOLD, then cross quickly', () => {
  /*
   * The glowstick needs both halves. A per-pixel dissolve has no path at all -
   * pixels are reassigned, nothing travels - and a SLOW move leaves no smear
   * even when something does travel. So the sequence must sit still for
   * seconds and then cross in a fraction of one.
   */
  const rand = H.rng(88)
  let t = 0
  let from = 0
  let holds = 0
  let crossings = 0
  for (let i = 0; i < 300; i++) {
    const s = H.nextPoseStep(rand, t, 4, from)
    inRange(s.start - t, H.POSE_CFG.hold[0], H.POSE_CFG.hold[1], 'hold before a crossing')
    inRange(s.dur, H.POSE_CFG.cross[0], H.POSE_CFG.cross[1], 'crossing duration')
    assert(s.to !== s.from, `step ${i} crosses to the pose it is already on`)
    assert(s.dur < (s.start - t) * 0.3, 'a crossing must be far shorter than the hold before it')
    holds += s.start - t
    crossings += s.dur
    from = s.to
    t = H.poseStepEnd(s)
  }
  assert(crossings / (holds + crossings) < 0.15, 'should spend most of its life holding, not crossing')
})

check('the pose is exactly still while holding', () => {
  // If it creeps during the hold, the crossing stops being an event.
  const s = { start: 10, from: 0, to: 3, dur: 0.4 }
  near(H.poseAt(s, 0), 0, 0, 'held at the start pose')
  near(H.poseAt(s, 9.99), 0, 0, 'still held just before the crossing')
  near(H.poseAt(s, 10.4), 3, 0, 'settled on the target')
  near(H.poseAt(s, 60), 3, 0, 'stays settled')
  near(H.poseSpeed(s, 5), 0, 0, 'no speed while holding')
  near(H.poseSpeed(s, 60), 0, 0, 'no speed after settling')
})

check('crossing speed peaks mid-sweep, which is what the trail draws', () => {
  const s = { start: 0, from: 0, to: 3, dur: 0.4 }
  const mid = H.poseSpeed(s, 0.2)
  const early = H.poseSpeed(s, 0.02)
  const late = H.poseSpeed(s, 0.38)
  assert(mid > early && mid > late, 'speed should peak mid-crossing')
  assert(mid > 4, `crossing too slow to leave a trail: ${mid.toFixed(2)} poses/sec`)
})

/* -------------------------------------------------- the degradation --- */

check('degradation is rarer than once a minute', () => {
  // Nathan asked for less than once a minute, and that IS the effect: something
  // every few seconds is a loop, something occasional is an event. Nobody would
  // catch a regression here by watching - it would just quietly become a tic.
  const rand = H.rng(2026)
  let t = 0
  for (let i = 0; i < 300; i++) {
    const d = H.nextDegrade(rand, t)
    assert(d.start - t >= 60, `gap ${i} was only ${(d.start - t).toFixed(1)}s`)
    inRange(d.start - t, H.DEGRADE_CFG.gap[0], H.DEGRADE_CFG.gap[1], 'gap between degradations')
    t = H.degradeEnd(d)
  }
})

check('degradation steps fine to brutal and back to fine', () => {
  const d = { start: 10 }
  assert(H.degradeBlock(d, 9.9) === 1, 'must be fine before it starts')
  assert(H.degradeBlock(d, H.degradeEnd(d) + 0.01) === 1, 'must return to fine')
  assert(H.degradeBlock(null, 500) === 1, 'no event means fine')

  const seen = []
  const rate = 200
  for (let i = 0; i <= H.degradeDuration() * rate; i++) {
    const b = H.degradeBlock(d, 10 + i / rate)
    if (seen[seen.length - 1] !== b) seen.push(b)
  }
  assert(Math.max(...seen) === 5, `should reach the coarsest level, peaked at ${Math.max(...seen)}`)
  // Monotonic down then monotonic up: no flicker between levels.
  const peak = seen.indexOf(5)
  for (let i = 1; i <= peak; i++) assert(seen[i] > seen[i - 1], `not monotonic down at ${i}: ${seen}`)
  for (let i = peak + 1; i < seen.length; i++) assert(seen[i] < seen[i - 1], `not monotonic up at ${i}: ${seen}`)
})

check('a degradation is over in a couple of seconds', () => {
  // Long enough to read, short enough not to become the look of the page.
  inRange(H.degradeDuration(), 1.5, 4, 'degradation duration (seconds)')
})

/* ---------------------------------------------------------- at rest --- */

check('the resting pose is composed, never mid-shake', () => {
  const rest = H.restPose()
  near(rest.wrist.dx, 0, 0, 'rest dx')
  near(rest.wrist.dy, 0, 0, 'rest dy')
  near(rest.wrist.rot, 0, 0, 'rest rotation')
  near(rest.elbow, 0, 0, 'rest elbow')
  for (const id of H.FINGER_IDS) {
    for (const a of rest.fingers[id]) near(a, 0, 0, `rest angle for ${id}`)
  }
})

check('every pose is finite for the first ten minutes', () => {
  const rand = H.rng(1)
  const f = H.nextFeint(rand, 0)
  for (let i = 0; i < 6000; i++) {
    const t = i / 10
    for (const p of [H.humanPose(t), H.machinePose(t, f)]) {
      assert(Number.isFinite(p.wrist.dx + p.wrist.dy + p.wrist.rot + p.elbow), `non-finite pose at t=${t}`)
      for (const id of H.FINGER_IDS) {
        for (const a of p.fingers[id]) assert(Number.isFinite(a), `non-finite angle at t=${t}`)
      }
    }
  }
})

check('the hand never travels absurdly far from its placement', () => {
  let max = 0
  for (let i = 0; i < 20000; i++) {
    const p = H.humanPose(i / 100)
    max = Math.max(max, Math.hypot(p.wrist.dx, p.wrist.dy))
  }
  inRange(max, 5, 30, 'peak wrist travel (hand units)')
})

/* ------------------------------------------------------------- report --- */

if (failures.length) {
  console.error(`\n  ${failures.length} FAILED, ${passed} passed\n`)
  for (const f of failures) console.error(`  ✗ ${f}\n`)
  process.exit(1)
}
console.log(`  ${passed}/${passed} passed`)
