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
  type Feint,
  type Gain,
  type Pose,
  FULL,
  effort,
  feintAmount,
  sway,
  tremor,
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
}

export type HandsOptions = {
  playing: boolean
  speed: number
  gain: Gain
  reduced: boolean
  feintNonce: number
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
   * Densifies hard at the peak of a surge and thins on the sag, so the hand
   * looks like it is tensing rather than sliding. The jitter term is the boil:
   * a sub-perceptual threshold wobble that keeps individual dots flickering,
   * without which a dithered still slid around the screen reads as a decal.
   */
  mod: {
    pivotByDrive: -0.045,
    contrastByDrive: 0.5,
    pivotByJitter: 0.006,
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
    pivot: 0.49,
    ink: [244, 244, 245],
  },
  pixelScale: 0.8,
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
 * One entry is a still hand, which is the current state.
 */
const HUMAN_POSES = ['/art/human-god-hand.png']
const MACHINE_POSES = ['/art/ai-adam-hand.png']

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
): { x: number; y: number }[] {
  return pins.map((pin, i) => {
    if (pin.weight === 0) return { x: 0, y: 0 }
    const e = effort(t - pin.lag) * gain.effort
    const tr = tremor(t - pin.lag, i * 1.7) * gain.tremor
    const travel = pin.weight * (reach * e + shake * pin.shake * tr)
    const a = pin.dir * DEG
    return { x: Math.cos(a) * travel, y: Math.sin(a) * travel }
  })
}

/**
 * How far pins travel, in SOURCE pixels. Small on purpose: the fingertip on the
 * human moves about 9px of a 460px-wide crop, which is a couple of percent. Any
 * more and the photograph visibly rubberises, and a stretched fresco reads as a
 * bug rather than as strain.
 */
const HUMAN_REACH = 9
const HUMAN_SHAKE = 3.4
const MACHINE_REACH = 5
const MACHINE_SHAKE = 0.9

function transformOf(pose: Pose, travel: number): string {
  const { dx, dy, rot } = pose.wrist
  return `translate(${(dx * travel).toFixed(2)}px, ${(dy * travel).toFixed(2)}px) rotate(${(rot + pose.elbow).toFixed(2)}deg)`
}

export function Hands({ options }: { options: HandsOptions }) {
  const opts = useRef(options)
  opts.current = options

  // Written by ONE loop and read by both hands. Two rAF loops is how the two
  // hands drift out of sync with each other.
  const zero = (pins: readonly Pin[]) => pins.map(() => ({ x: 0, y: 0 }))
  const humanMotion = useRef<MotionFrame>({
    transform: 'none', blend: 0, pose: 0, look: HUMAN_LOOK.look, offsets: zero(HUMAN_PINS),
  })
  const machineMotion = useRef<MotionFrame>({
    transform: 'none', blend: 0, pose: 0, look: MACHINE_LOOK.look, offsets: zero(MACHINE_PINS),
  })

  useEffect(() => {
    let clock = 0
    let raf = 0
    let last = performance.now()
    let lastNonce = opts.current.feintNonce
    const rand = rng(0x5eed)
    let feint: Feint = { ...nextFeint(rand, 0), start: 2.5 }

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
          offsets: HUMAN_PINS.map(() => ({ x: 0, y: 0 })),
        }
        machineMotion.current = {
          transform: rest,
          blend: 0,
          look: modulate(o.machine.look, o.machine.mod, still),
          pose: 0,
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

      // One evaluation of each curve, reused for the pose, the pose blend AND
      // the treatment - so the ink, the shake and the reach are provably the
      // same gesture rather than three loops that drift apart over minutes.
      const e = effort(clock) * o.gain.effort
      const tr = tremor(clock) * o.gain.tremor
      humanMotion.current = {
        transform: transformOf(humanPose(clock, -38, undefined, o.gain), HUMAN_TRAVEL),
        blend: e,
        /*
         * The EFFORT CURVE drives the pose sequence directly, so the surge that
         * shakes the hand is the same surge that pushes it through the poses.
         * At the peak of a reach it is at the last pose; on the sag it falls
         * back through them. One gesture, not an animation playing alongside a
         * separate one.
         */
        pose: e * (HUMAN_POSES.length - 1),
        look: modulate(o.human.look, o.human.mod, { primary: e, jitter: tr }),
        offsets: pinOffsets(HUMAN_PINS, clock, HUMAN_REACH, HUMAN_SHAKE, o.gain),
      }

      const reaching = feintAmount(feint, clock)
      machineMotion.current = {
        transform: transformOf(machinePose(clock, feint), MACHINE_TRAVEL),
        blend: 0,
        look: modulate(o.machine.look, o.machine.mod, {
          primary: reaching,
          jitter: sway(clock),
        }),
        // The machine only changes pose when it feints. Otherwise it holds.
        pose: reaching * (MACHINE_POSES.length - 1),
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
    <div className="absolute inset-0 overflow-hidden">
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
        className="absolute bottom-[26%] left-[3%] w-[46%]"
        baseTransform="scaleX(-1) rotate(-18deg)"
        pixelScale={options.human.pixelScale}
        pins={HUMAN_PINS}
        motion={humanMotion}
        ditherOn={options.ditherOn}
      />
      <Hand
        srcs={MACHINE_POSES}
        className="absolute top-[16%] left-[53%] w-[30%]"
        baseTransform="scaleX(-1) rotate(14deg)"
        pixelScale={options.machine.pixelScale}
        pins={MACHINE_PINS}
        motion={machineMotion}
        ditherOn={options.ditherOn}
      />
      </div>
    </div>
  )
}
