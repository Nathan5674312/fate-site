/**
 * THE TWO HANDS — two photographs, moved and dithered. Nothing is drawn.
 *
 * Both crops come from Michelangelo's Creation of Adam (public domain), and the
 * casting is Nathan's, 2026-08-30: GOD'S hand is the human, ADAM'S hand is the
 * machine. That inversion is doing real work —
 *
 *   God's hand is the one straining. The arm is extended to its limit, the
 *   index finger thrust out ahead of the others, tendons up. It is the reach.
 *
 *   Adam's hand is limp. The wrist droops, the fingers hang unsupported, the
 *   whole thing is unbothered. It is the withholding, already painted.
 *
 * So the human occupies the creator's pose while the machine takes the posture
 * of the one being created and cannot be troubled to reach back. Both gestures
 * were already in the fresco; only the labels swap.
 *
 * HOW THE FINGERS REACH FURTHER, without the image ever being cut: a second
 * pose is dissolved in per pixel under the dither (see dither.ts), driven by
 * the same effort curve that drives the shake. Until that art exists, the
 * POSE_B constants are undefined and each hand simply holds its one pose.
 */

import { useEffect, useRef } from 'react'
import { Hand } from './Hand'
import { modulate, type DitherOptions, type LookMod } from './dither'
import { HUMAN_PINS, MACHINE_PINS, type Pin } from './warp'
import {
  type Degrade,
  type Feint,
  type Gain,
  type Pose,
  FULL,
  degradeBlock,
  degradeEnd,
  nextDegrade,
  effort,
  feintAmount,
  drift,
  sway,
  tremor,
  tremorEnvelope,
  feintEnd,
  humanPose,
  machinePose,
  nextFeint,
  restPose,
  rng,
} from './motion'

/**
 * The dither treatment for ONE hand.
 *
 * Per hand rather than shared, because the two are not the same picture: the
 * fresco lit them differently, the crops came from different parts of the
 * plaster, and Nathan tuned the human to a dense, high-contrast bone treatment
 * that would not suit the machine. Sharing one setting forces a compromise on
 * both.
 */
export type HandLook = {
  look: DitherOptions
  /** Dot size, as a fraction of native resolution. */
  pixelScale: number
  /** How the treatment moves with the animation. See dither.ts. */
  mod: LookMod
  /**
   * After-image persistence, 0..1. The pose dissolve is instant at 0; higher
   * values leave a decaying ghost so a change of pose smears into the next.
   */
  trail: number
}

export type HandsOptions = {
  playing: boolean
  speed: number
  gain: Gain
  reduced: boolean
  feintNonce: number
  /** Bumped by the lab to trigger a degradation immediately. */
  degradeNonce: number
  ditherOn: boolean
  human: HandLook
  machine: HandLook
}

/*
 * THE HUMAN. Dialled in by Nathan, 2026-08-30, against the Hermes reference.
 *
 * Very high contrast with a low ink threshold: dense, bold, blown out. The low
 * threshold (0.24) is what floods it - the test is `v + (0.5 - threshold) > t`,
 * so a LOWER number means MORE ink, which is the opposite of what the name
 * suggests. Fine dots at 0.8 keep the halftone tight rather than chunky.
 */
export const HUMAN_LOOK: HandLook = {
  look: {
    threshold: 0.24,
    contrast: 3.45,
    gamma: 1,
    pivot: 0.59,
    ink: [244, 244, 245],
  },
  pixelScale: 0.8,
  /*
   * The glowstick. Long enough that a pose change reads as one motion smearing
   * into the next rather than four stills being cut between - which is what the
   * dissolve alone still looked like, because the poses differ enough that even
   * a per-pixel mix arrives suddenly.
   */
  trail: 0.42,
  /*
   * Densifies hard at the peak of a surge and thins on the sag, so the hand
   * looks like it is tensing rather than sliding. The jitter term is the boil:
   * a sub-perceptual threshold wobble that keeps individual dots flickering,
   * without which a dithered still slid around the screen reads as a decal.
   */
  mod: {
    pivotByDrive: -0.045,
    contrastByDrive: 0.5,
    // The boil follows the tremor down; a shimmer louder than the shake it is
    // meant to accompany reads as noise on the image rather than life in it.
    pivotByJitter: 0.002,
    thresholdByDrive: -0.03,
  },
}

/*
 * THE MACHINE. Also dialled in by Nathan, 2026-08-30, and it answers the open
 * question: no colour split. Both hands are bone. They read as one picture in
 * one material rather than as two objects tinted to tell them apart - the
 * difference between them is BEHAVIOUR, which is the stronger way to carry it.
 *
 * Denser than the human (threshold 0.15 against 0.24) and pivoted lower, which
 * suits the crop: Adam's hand is the darker, more shadowed of the two.
 */
export const MACHINE_LOOK: HandLook = {
  look: {
    threshold: 0.15,
    contrast: 3.46,
    gamma: 1,
    pivot: 0.57,
    ink: [244, 244, 245],
  },
  pixelScale: 0.8,
  /** Shorter than the human's: this hand moves rarely, and a long tail on a
   *  still hand is just a blur. */
  trail: 0.3,
  /*
   * Far quieter, and driven by the FEINT rather than by effort. It solidifies
   * slightly as it considers reaching and thins again as it withdraws, so the
   * moment of near-contact is also the moment it is most present. Barely any
   * boil: this hand is composed, and a shimmer would make it look nervous.
   */
  mod: {
    pivotByDrive: -0.03,
    contrastByDrive: 0.25,
    pivotByJitter: 0.002,
  },
}

/** Ink presets. The ground is the page behind, never painted by the dither. */
export const INKS = {
  'Hermes blue': [92, 84, 255],
  Bone: [244, 244, 245],
  Glow: [219, 228, 255],
} as const

export const DEFAULT_OPTIONS: HandsOptions = {
  playing: true,
  speed: 1,
  gain: FULL,
  reduced: false,
  feintNonce: 0,
  degradeNonce: 0,
  ditherOn: true,
  human: HUMAN_LOOK,
  machine: MACHINE_LOOK,
}

/**
 * THE POSE SEQUENCES, in order of increasing reach.
 *
 * Drop registered stills into public/art/poses/ and list them here. Order is
 * everything: the hand dissolves ALONG this list as the effort curve rises, so
 * index 0 must be the most relaxed and the last the most extended. Reorder the
 * array and you reorder the gesture.
 *
 * WRIST-REGISTERED. The arm-aligned set is still in /art/poses/ as a fallback.
 * Aligning on the arm kept the arm still and let the HAND swing through about a
 * third of the frame; aligning on the wrist keeps the hand still and lets the
 * arm swing, which is both what a reach looks like and the better trade here,
 * since the arm mostly runs off the frame edge.
 *
 * Order is Nathan's: composite 2, 1, 4, 3. Chosen so NEIGHBOURING poses are
 * similar, because only neighbours are ever mixed. His four stills have the arm
 * at genuinely different heights, and 2 -> 3 would move the whole hand far
 * enough to read as a cut rather than a gesture; 2 -> 1 -> 4 -> 3 keeps every
 * step small. Both hands follow the same order, since each composite is one
 * moment of the same gesture.
 */
const HUMAN_POSES = [
  '/art/poses-wrist/human-2.png',
  '/art/poses-wrist/human-1.png',
  '/art/poses-wrist/human-4.png',
  '/art/poses-wrist/human-3.png',
]
const MACHINE_POSES = [
  '/art/poses-wrist/machine-2.png',
  '/art/poses-wrist/machine-1.png',
  '/art/poses-wrist/machine-4.png',
  '/art/poses-wrist/machine-3.png',
]

/**
 * Pose units are hand-local, sized for a rig rather than a photograph, so the
 * scaling lives here. motion.ts stays the model described in docs/hands.md and
 * this is purely how loud it is on screen.
 */
/*
 * Cut hard once the per-finger warp landed. Nathan: "the whole image just
 * moving back and forth... it doesn't look like it's tremoring at all." He was
 * right, and the fix is not to tune this number - it is that a rigid transform
 * CANNOT read as tremor at any amplitude, because every pixel moves together.
 * The warp carries the shake now, so this is reduced to a whole-body drift that
 * keeps the hand from feeling pinned to the page. Raising it brings the sliding
 * back.
 */
const HUMAN_TRAVEL = 1.1
const MACHINE_TRAVEL = 1.4

/** What the animation loop hands to each hand, every frame. */
export type MotionFrame = {
  transform: string
  blend: number
  look: DitherOptions
  /**
   * Position along the pose sequence. 1.4 is forty percent of the way from
   * pose 1 to pose 2. Not an index - the fraction is the dissolve.
   */
  pose: number
  /** Pixel displacement per pin, image space, same order as the hand's pins. */
  offsets: { x: number; y: number }[]
  /** Dot size this frame. Driven by the shared degradation event. */
  block: number
}

const DEG = Math.PI / 180

/**
 * This frame's displacement for every pin on one hand.
 *
 * 🔴 The lag is the whole trick. Each pin samples the drive at `t - pin.lag`,
 * so the fingertips arrive after the knuckles and no two parts are ever at the
 * same point in the surge. Give every pin lag 0 and this collapses back into
 * exactly what Nathan objected to: a rigid image sliding around.
 *
 * The tremor gets a per-pin phase for the same reason. A shared phase is a
 * vibration; independent phases are a tremble.
 */
function pinOffsets(
  pins: readonly Pin[],
  t: number,
  reach: number,
  shake: number,
  gain: Gain,
  /** Waxing and waning tremor strength. 1 for the machine, which does not waver. */
  env = 1,
): { x: number; y: number }[] {
  return pins.map((pin, i) => {
    if (pin.weight === 0) return { x: 0, y: 0 }
    const e = effort(t - pin.lag) * gain.effort
    const tr = tremor(t - pin.lag, i * 1.7) * gain.tremor
    const travel = pin.weight * (reach * e + shake * pin.shake * tr * env)
    const a = pin.dir * DEG
    /*
     * Every pin also wanders on its OWN seed, in both axes independently. This
     * is the part that stops the hand reading as one rigid shape being pushed
     * around: the fingers disagree with each other slightly, all the time, the
     * way real ones do. Slow enough to be felt rather than seen.
     */
    const w = pin.weight * WANDER
    return {
      x: Math.cos(a) * travel + drift(t, 300 + i * 61, 0.075) * w,
      y: Math.sin(a) * travel + drift(t, 700 + i * 83, 0.065) * w,
    }
  })
}

/**
 * How far pins travel, in SOURCE pixels. Small on purpose: the fingertip on the
 * human moves about 9px of a 460px-wide crop, which is a couple of percent. Any
 * more and the photograph visibly rubberises, and a stretched fresco reads as a
 * bug rather than as strain.
 */
/** How far each pin aimlessly wanders, in source pixels, at full weight. */
const WANDER = 2.4

const HUMAN_REACH = 9
/*
 * 3.4 -> 0.9 -> 0.6 across three rounds of Nathan watching it. This is the
 * dominant visible shake - it displaces the fingertips directly - so it is the
 * number that matters, well ahead of tremorAmp or elbowTremor in motion.ts.
 *
 * Read together with tremorEnvelope, which now swings from about 0.05 to 1.5:
 * the hand sits near-still most of the time and peaks slightly ABOVE the old
 * constant 0.9 when it trembles. Lower average, higher peak, visible variation.
 */
const HUMAN_SHAKE = 0.6
const MACHINE_REACH = 5
const MACHINE_SHAKE = 0.9

/**
 * How far each hand travels toward the other between the top and bottom of the
 * page, in CSS pixels. Split unevenly on purpose: the human closes more of the
 * distance than the machine does, because the human is the one trying.
 *
 * 🔴 MUST STAY UNDER THE HORIZONTAL SEPARATION THE HANDS START WITH, which is
 * about 44px in the current composition. Total closure is this plus 0.85 of it
 * for the machine, so anything above ~20 makes them meet and then CROSS
 * somewhere mid-page and separate on the far side. Measured at 90 the gap ran
 * 29px to 187px and read as opening; at 45 it ran 50 to 20 to 66, closing then
 * crossing. This number and the placement below are one decision, not two, and
 * changing either without re-measuring the other reintroduces the crossing.
 */
const CLOSE_TRAVEL = 18

function transformOf(pose: Pose, travel: number, closeX = 0, closeY = 0): string {
  const { dx, dy, rot } = pose.wrist
  const x = dx * travel + closeX
  const y = dy * travel + closeY
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(rot + pose.elbow).toFixed(2)}deg)`
}

export function Hands({ options }: { options: HandsOptions }) {
  const opts = useRef(options)
  opts.current = options

  /*
   * Scroll progress, 0 at the top of the document to 1 at the bottom, kept in a
   * ref and never in state. The hands redraw on their own rAF loop, so putting
   * scroll in React state would re-render the tree on every scroll event to
   * produce a number the render does not use.
   *
   * Passive listener: this never calls preventDefault, and saying so lets the
   * browser scroll without waiting to find out.
   */
  const scroll = useRef(0)
  useEffect(() => {
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scroll.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  // Written by ONE loop and read by both hands. Two rAF loops is how the two
  // hands drift out of sync with each other.
  const zero = (pins: readonly Pin[]) => pins.map(() => ({ x: 0, y: 0 }))
  const humanMotion = useRef<MotionFrame>({
    transform: 'none', blend: 0, pose: 0, block: 1, look: HUMAN_LOOK.look, offsets: zero(HUMAN_PINS),
  })
  const machineMotion = useRef<MotionFrame>({
    transform: 'none', blend: 0, pose: 0, block: 1, look: MACHINE_LOOK.look, offsets: zero(MACHINE_PINS),
  })

  useEffect(() => {
    let clock = 0
    let raf = 0
    let last = performance.now()
    let lastNonce = opts.current.feintNonce
    const rand = rng(0x5eed)
    let feint: Feint = { ...nextFeint(rand, 0), start: 2.5 }
    // ONE event for both hands. The PICTURE degrades, not one hand in it -
    // desynchronised it would read as two separate glitches rather than as the
    // signal struggling.
    let degrade: Degrade = nextDegrade(rand, 0)
    let lastDegradeNonce = opts.current.degradeNonce

    // A live condition, not a one-shot read: someone who turns reduced motion
    // on should not have to reload to stop a hand shaking at them.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let systemReduced = mq.matches
    const onPref = (e: MediaQueryListEvent) => { systemReduced = e.matches }
    mq.addEventListener('change', onPref)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // Clamped: a backgrounded tab banks a huge delta, and without this the
      // hands lurch through a minute of motion in one frame on return.
      const delta = Math.min(now - last, 100)
      last = now
      const o = opts.current

      if (systemReduced || o.reduced) {
        // Held at zero drive: the composed treatment, never a mid-surge one.
        const rest = transformOf(restPose(), 0)
        const still = { primary: 0, jitter: 0 }
        humanMotion.current = {
          transform: rest,
          blend: 0,
          look: modulate(o.human.look, o.human.mod, still),
          // Reduced motion holds the FIRST pose, never a half-dissolved one.
          pose: 0,
          block: 1,
          offsets: HUMAN_PINS.map(() => ({ x: 0, y: 0 })),
        }
        machineMotion.current = {
          transform: rest,
          blend: 0,
          look: modulate(o.machine.look, o.machine.mod, still),
          pose: 0,
          block: 1,
          offsets: MACHINE_PINS.map(() => ({ x: 0, y: 0 })),
        }
        return
      }

      if (o.playing) clock += (delta / 1000) * o.speed

      if (o.feintNonce !== lastNonce) {
        lastNonce = o.feintNonce
        feint = { ...nextFeint(rand, clock), start: clock + 0.05 }
      } else if (clock > feintEnd(feint)) {
        feint = nextFeint(rand, clock)
      }

      if (o.degradeNonce !== lastDegradeNonce) {
        lastDegradeNonce = o.degradeNonce
        degrade = { start: clock + 0.05 }
      } else if (clock > degradeEnd(degrade)) {
        degrade = nextDegrade(rand, clock)
      }
      // Shared by both hands, so it has to be resolved before either is built.
      const block = degradeBlock(degrade, clock)

      // One evaluation of each curve, reused for the pose, the pose blend AND
      // the treatment - so the ink, the shake and the reach are provably the
      // same gesture rather than three loops that drift apart over minutes.
      const e = effort(clock) * o.gain.effort
      const tr = tremor(clock) * o.gain.tremor
      /*
       * THE GAP CLOSES AS YOU SCROLL. Nathan wants the hands to follow the
       * reader down rather than sit in the hero, and this is what makes that
       * more than a fixed background: descending the page is what brings the
       * two hands together. It is the same argument as the order-from-chaos
       * thesis in DESIGN.md - scrolling resolves things.
       *
       * It never reaches zero. They approach and do not touch; the gap IS the
       * subject, and closing it entirely would answer a question the page is
       * asking on purpose.
       */
      const s = scroll.current
      const close = s * CLOSE_TRAVEL

      humanMotion.current = {
        transform: transformOf(humanPose(clock, -38, undefined, o.gain), HUMAN_TRAVEL, close, 0),
        blend: e,
        /*
         * The EFFORT CURVE drives the pose sequence directly, so the surge that
         * shakes the hand is the same surge that pushes it through the poses.
         * At the peak of a reach it is at the last pose; on the sag it falls
         * back through them. One gesture, not an animation playing alongside a
         * separate one.
         */
        pose: e * (HUMAN_POSES.length - 1),
        block,
        look: modulate(o.human.look, o.human.mod, { primary: e, jitter: tr }),
        offsets: pinOffsets(HUMAN_PINS, clock, HUMAN_REACH, HUMAN_SHAKE, o.gain, tremorEnvelope(clock)),
      }

      const reaching = feintAmount(feint, clock)
      machineMotion.current = {
        // No vertical component: the machine sits below the human's fingertip,
        // so drifting it down added to the distance while x was removing it.
        transform: transformOf(machinePose(clock, feint), MACHINE_TRAVEL, -close * 0.85, 0),
        blend: 0,
        look: modulate(o.machine.look, o.machine.mod, {
          primary: reaching,
          jitter: sway(clock),
        }),
        // The machine only changes pose when it feints. Otherwise it holds.
        pose: reaching * (MACHINE_POSES.length - 1),
        block,
        offsets: pinOffsets(MACHINE_PINS, clock * 0.35, MACHINE_REACH, MACHINE_SHAKE, o.gain),
      }
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      mq.removeEventListener('change', onPref)
    }
  }, [])

  return (
    <div className="hands-layer absolute inset-0 overflow-hidden">
      {/*
        * THE STAGE: a fixed 16:10 box, centred, sized to COVER the frame.
        *
        * Both hands are placed as percentages of THIS, not of the viewport.
        * Percentages of the viewport cannot hold a composition - measured at
        * 1440x900 the fingertips sat 231px apart, and the same CSS at 740x961
        * put them 556px apart and stacked vertically. The gap is the subject of
        * the picture, so it cannot be a function of the window shape.
        *
        * On sm+ min-w-[160vh] guarantees the box is at least 1.6x the viewport
        * height, so at 16:10 its height always covers and the frame crops in
        * from the edges, exactly like object-fit: cover.
        *
        * BELOW sm that rule is dropped, and it has to be. Measured at 280px:
        * covering meant the stage was 707px wide, so only 40%% of the
        * composition was on screen - and the visible 40%% did not include the
        * gap, which is the entire subject. Narrow screens get the whole picture
        * fitted to the width instead, smaller but intact.
        */}
      <div className="absolute top-1/2 left-1/2 aspect-[16/10] w-full -translate-x-1/2 -translate-y-1/2 sm:min-w-[160vh]">
      {/*
        * NO scaleX(-1) any more. The old single crops were cut from the fresco
        * pointing the wrong way and had to be mirrored; Nathan's pose art
        * already points the right way — human arm in from the left reaching
        * right, machine arm in from the top right hanging down-left. Mirroring
        * them now would send both hands away from each other.
        *
        * Each hand is two nested elements. The OUTER carries static placement —
        * where, which way round, how big — and the INNER is the only thing the
        * animation touches. Composing a mirror and a rotation into one matrix
        * is how sign errors get in.
        *
        * Placement pulls the fingertips together. Measured at 1440x900 they were
        * 501px apart, which reads as two objects in opposite corners rather than
        * a near-touch. The gap IS the subject, so it is kept tight.
        */}
      <Hand
        srcs={HUMAN_POSES}
        className="absolute bottom-[-8%] left-[-8%] w-[76%]"
        baseTransform="rotate(-14deg)"
        pixelScale={options.human.pixelScale}
        trail={options.human.trail}
        fadeFrom="left"
        pins={HUMAN_PINS}
        motion={humanMotion}
        ditherOn={options.ditherOn}
      />
      <Hand
        srcs={MACHINE_POSES}
        className="absolute top-[30%] left-[54%] w-[54%]"
        baseTransform="rotate(26deg)"
        pixelScale={options.machine.pixelScale}
        trail={options.machine.trail}
        fadeFrom="right"
        pins={MACHINE_PINS}
        motion={machineMotion}
        ditherOn={options.ditherOn}
      />
      </div>
    </div>
  )
}
