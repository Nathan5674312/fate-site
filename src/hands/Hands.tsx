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
import type { DitherOptions } from './dither'
import {
  type Feint,
  type Gain,
  type Pose,
  FULL,
  effort,
  feintEnd,
  humanPose,
  machinePose,
  nextFeint,
  restPose,
  rng,
} from './motion'

export type HandsOptions = {
  playing: boolean
  speed: number
  gain: Gain
  reduced: boolean
  feintNonce: number
  ditherOn: boolean
  look: DitherOptions
  pixelScale: number
}

/*
 * Tuned against the Hermes reference Nathan supplied: one saturated ink, blown
 * highlights, crushed shadows, detail deliberately destroyed. High contrast is
 * what does most of that - the fresco is very flat by comparison.
 */
export const DEFAULT_LOOK: DitherOptions = {
  threshold: 0.5,
  contrast: 1.9,
  gamma: 1,
  pivot: 0.62,
  ink: [92, 84, 255],
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
  look: DEFAULT_LOOK,
  pixelScale: 0.55,
}

/* The second, further-reaching poses. Undefined until that art exists. */
const HUMAN_POSE_B: string | undefined = undefined
const MACHINE_POSE_B: string | undefined = undefined

/**
 * Pose units are hand-local, sized for a rig rather than a photograph, so the
 * scaling lives here. motion.ts stays the model described in docs/hands.md and
 * this is purely how loud it is on screen.
 */
const HUMAN_TRAVEL = 3.2
const MACHINE_TRAVEL = 2.4

function transformOf(pose: Pose, travel: number): string {
  const { dx, dy, rot } = pose.wrist
  return `translate(${(dx * travel).toFixed(2)}px, ${(dy * travel).toFixed(2)}px) rotate(${(rot + pose.elbow).toFixed(2)}deg)`
}

export function Hands({ options }: { options: HandsOptions }) {
  const opts = useRef(options)
  opts.current = options

  // Written by ONE loop and read by both hands. Two rAF loops is how the two
  // hands drift out of sync with each other.
  const humanMotion = useRef({ transform: 'none', blend: 0 })
  const machineMotion = useRef({ transform: 'none', blend: 0 })

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
        const rest = transformOf(restPose(), 0)
        humanMotion.current = { transform: rest, blend: 0 }
        machineMotion.current = { transform: rest, blend: 0 }
        return
      }

      if (o.playing) clock += (delta / 1000) * o.speed

      if (o.feintNonce !== lastNonce) {
        lastNonce = o.feintNonce
        feint = { ...nextFeint(rand, clock), start: clock + 0.05 }
      } else if (clock > feintEnd(feint)) {
        feint = nextFeint(rand, clock)
      }

      humanMotion.current = {
        transform: transformOf(humanPose(clock, -38, undefined, o.gain), HUMAN_TRAVEL),
        // The same surge that shakes the hand pushes the fingers out, so the
        // reach and the strain are one gesture rather than two loops that
        // slowly fall out of phase with each other.
        blend: effort(clock) * o.gain.effort,
      }
      machineMotion.current = {
        transform: transformOf(machinePose(clock, feint), MACHINE_TRAVEL),
        blend: 0,
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
        * min-w-[160vh] guarantees the box is at least 1.6x the viewport height,
        * so at 16:10 its height always covers; w-full covers the width. The
        * frame then crops in from the edges, exactly like object-fit: cover.
        */}
      <div className="absolute top-1/2 left-1/2 aspect-[16/10] w-full min-w-[160vh] -translate-x-1/2 -translate-y-1/2">
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
        src="/art/human-god-hand.png"
        srcB={HUMAN_POSE_B}
        className="absolute bottom-[26%] left-[3%] w-[46%]"
        baseTransform="scaleX(-1) rotate(-18deg)"
        look={options.look}
        pixelScale={options.pixelScale}
        motion={humanMotion}
        ditherOn={options.ditherOn}
      />
      <Hand
        src="/art/ai-adam-hand.png"
        srcB={MACHINE_POSE_B}
        className="absolute top-[16%] left-[53%] w-[30%]"
        baseTransform="scaleX(-1) rotate(14deg)"
        look={options.look}
        pixelScale={options.pixelScale}
        motion={machineMotion}
        ditherOn={options.ditherOn}
      />
      </div>
    </div>
  )
}
