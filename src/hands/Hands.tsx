/**
 * THE TWO HANDS — two photographs, moved. Nothing is drawn.
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
 * So the human now occupies the creator's pose while the machine takes the
 * posture of the one being created and cannot be troubled to reach back. The
 * gestures were in the fresco the whole time; only the labels swap.
 *
 * 🔴 NOTHING HERE DEFORMS THE IMAGE. A tremor is rigid-body motion — the hand
 * moves, it does not bend — so both hands are single <img> elements with a
 * transform on a wrapper. That is GPU-composited and costs nothing per frame.
 * The one thing that would need the image cut is the fingers extending further,
 * and that is deliberately not done yet: see docs/hands.md section 1.
 */

import { useEffect, useRef } from 'react'
import {
  type Feint,
  type Gain,
  type Pose,
  FULL,
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
}

export const DEFAULT_OPTIONS: HandsOptions = {
  playing: true,
  speed: 1,
  gain: FULL,
  reduced: false,
  feintNonce: 0,
}

/**
 * Pose units are hand-local, sized for a rig rather than for a photograph, so
 * they are scaled here rather than in motion.ts — the motion model stays the
 * one described in docs/hands.md and this is purely how loud it is on screen.
 */
const HUMAN_TRAVEL = 3.2
const MACHINE_TRAVEL = 2.4

function transformOf(pose: Pose, travel: number): string {
  const { dx, dy, rot } = pose.wrist
  return `translate(${(dx * travel).toFixed(2)}px, ${(dy * travel).toFixed(2)}px) rotate(${(rot + pose.elbow).toFixed(2)}deg)`
}

export function Hands({ options }: { options: HandsOptions }) {
  const human = useRef<HTMLDivElement>(null)
  const machine = useRef<HTMLDivElement>(null)
  const opts = useRef(options)
  opts.current = options

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
      // hands lurch through a minute of motion in a single frame on return.
      const delta = Math.min(now - last, 100)
      last = now
      const o = opts.current

      if (systemReduced || o.reduced) {
        const rest = transformOf(restPose(), 0)
        if (human.current) human.current.style.transform = rest
        if (machine.current) machine.current.style.transform = rest
        return
      }

      if (o.playing) clock += (delta / 1000) * o.speed

      if (o.feintNonce !== lastNonce) {
        lastNonce = o.feintNonce
        feint = { ...nextFeint(rand, clock), start: clock + 0.05 }
      } else if (clock > feintEnd(feint)) {
        feint = nextFeint(rand, clock)
      }

      if (human.current) {
        human.current.style.transform = transformOf(
          humanPose(clock, -38, undefined, o.gain),
          HUMAN_TRAVEL,
        )
      }
      if (machine.current) {
        machine.current.style.transform = transformOf(machinePose(clock, feint), MACHINE_TRAVEL)
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
        * Each hand is two nested elements on purpose. The OUTER one carries the
        * static placement — where in the frame, which way round, how big — and
        * the INNER one is the only thing the animation touches. Composing a
        * mirror and a rotation in one matrix is how sign errors get in.
        */}
      <div className="absolute bottom-[8%] left-[4%] w-[46%] max-w-[560px] [transform:scaleX(-1)_rotate(-8deg)]">
        <div ref={human} className="will-change-transform">
          <img
            src="/art/human-god-hand.png"
            alt=""
            className="w-full mix-blend-screen opacity-90"
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute top-[10%] right-[6%] w-[32%] max-w-[380px] [transform:scaleX(-1)_rotate(6deg)]">
        <div ref={machine} className="will-change-transform">
          <img
            src="/art/ai-adam-hand.png"
            alt=""
            className="w-full mix-blend-screen opacity-90"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
