/**
 * ONE HAND: a photograph, dithered on a canvas, moved by a transform.
 *
 * The canvas runs at the crop's NATIVE size and is scaled up by CSS with
 * `image-rendering: pixelated`. That is what makes the 1-bit look affordable —
 * ~115k pixels per frame instead of a hero-sized region — and the chunky
 * upscaled dots are the intended look rather than a compromise.
 *
 * POSES. `srcs` is a sequence of registered stills, and `motion.pose` is a
 * position along it - 1.4 meaning forty percent of the way from the second to
 * the third. Only the two neighbouring poses are ever mixed, and the mix is
 * PER PIXEL (see dither.ts), so no in-between frame is ever invented. Every
 * frame on screen is made of real pixels from real poses, which is exactly why
 * this works where video interpolation of hands does not.
 */

import { useEffect, useRef, useState } from 'react'
import { dither, toImageData } from './dither'
import { buildWeights, displace, makeField, type Field, type Pin } from './warp'
import type { MotionFrame } from './Hands'

export type HandProps = {
  /**
   * The pose sequence, in order. One entry is a still hand; more than one and
   * the hand dissolves along the sequence as `pose` moves.
   *
   * 🔴 EVERY POSE MUST BE REGISTERED - same canvas size, same arm in the same
   * place, only the fingers differing. The dissolve does not warp anything into
   * position; it swaps pixels. Two poses framed differently produce a jump cut
   * rather than a gesture, and no amount of dithering hides that.
   */
  srcs: readonly string[]
  /** Static placement: where in the frame, which way round, how big. */
  className: string
  /** Wrapper transform for the mirror and any base rotation. */
  baseTransform: string
  /**
   * How far BELOW native the dither runs, 0..1. This is the dot size control:
   * 0.4 means four-tenths the pixels, each one drawn four times bigger. It is
   * also the performance control, quadratically.
   */
  pixelScale: number
  /** Deformation pins for this hand, in image space. */
  pins: readonly Pin[]
  /**
   * Which edge the arm leaves by, so it can be faded out there.
   *
   * The crops end in a hard straight cut where the arm was sliced out of the
   * fresco. At desktop widths the cover-stage crops that off-frame and nobody
   * sees it, but on a narrow window the whole stage is visible and both hands
   * visibly STOP at a diagonal line. A short alpha ramp at that edge reads as
   * the arm continuing past the frame instead.
   */
  fadeFrom: 'left' | 'right'
  /**
   * Persistence of the previous frames, 0..1. 0 replaces the image outright;
   * higher values leave a decaying after-image, so a pose change smears into
   * the next one instead of cutting. Nathan's word for it was glowstick.
   */
  trail: number
  /**
   * Live values, read every frame without re-rendering React. The LOOK arrives
   * here too, already modulated by the animation, so the treatment and the
   * movement can never disagree about what moment it is.
   */
  motion: React.RefObject<MotionFrame>
  ditherOn: boolean
}

export function Hand({ srcs, className, baseTransform, pixelScale, pins, trail, fadeFrom, motion, ditherOn }: HandProps) {
  const move = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const frames = useRef<{ poses: ImageData[]; out: ImageData } | null>(null)
  // Built once per image: rest positions never move, and this is the costly
  // part (a distance per pixel per pin).
  const warp = useRef<{ weights: Float32Array; field: Field } | null>(null)
  /*
   * The freshly dithered frame is staged here before being composited onto the
   * visible canvas. putImageData writes pixels RAW - it ignores globalAlpha and
   * globalCompositeOperation entirely - so a trail is impossible while drawing
   * that way. Going through an offscreen canvas and drawImage is what makes the
   * fade available at all.
   */
  const stage = useRef<HTMLCanvasElement | null>(null)
  const trailRef = useRef(trail)
  trailRef.current = trail
  const onRef = useRef(ditherOn)
  onRef.current = ditherOn

  // Decode once. Doing this per frame would cost more than the dither itself.
  useEffect(() => {
    let dead = false
    const load = (u: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = rej
        i.src = u
      })

    Promise.all(srcs.map(load)).then((imgs) => {
      if (dead) return
      const poses = imgs.map((i) => toImageData(i, pixelScale))
      const ia = poses[0]
      // A pose that decoded at a different size cannot be dissolved against the
      // others - it would sample from the wrong place entirely. Better to drop
      // it loudly than to render garbage.
      const usable = poses.filter((p) => p.width === ia.width && p.height === ia.height)
      if (usable.length !== poses.length) {
        console.warn(
          `[hands] ${poses.length - usable.length} pose(s) dropped: every pose must be the same size as ${srcs[0]} (${ia.width}x${ia.height})`,
        )
      }
      frames.current = { poses: usable, out: new ImageData(ia.width, ia.height) }
      const off = document.createElement('canvas')
      off.width = ia.width
      off.height = ia.height
      stage.current = off
      warp.current = {
        weights: buildWeights(pins, ia.width, ia.height),
        field: makeField(ia.width, ia.height),
      }
      setSize({ w: ia.width, h: ia.height })
    })
    return () => { dead = true }
  }, [srcs, pixelScale, pins])

  useEffect(() => {
    if (!size) return
    let raf = 0
    let lastBlend = -1
    let lastLook = ''
    let lastOn: boolean | null = null

    const frame = () => {
      raf = requestAnimationFrame(frame)
      const m = motion.current
      const f = frames.current
      if (!m || !f) return

      if (move.current) move.current.style.transform = m.transform

      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return

      // Only redraw when something that affects the PIXELS changed. The
      // transform above changes every frame; the treatment now usually does
      // too, but it is quantised so imperceptible drift does not trigger a
      // repaint of every pixel.
      const L = m.look
      const lookKey = `${L.threshold?.toFixed(3)}|${L.contrast?.toFixed(3)}|${L.pivot}|${L.gamma}|${L.ink}|${m.block}`

      /*
       * Where we are along the pose sequence. `pose` is a position, not an
       * index: 1.4 means 40 percent of the way from pose 1 to pose 2. Only the
       * two NEIGHBOURING poses are ever mixed, so the dissolve stays a two-way
       * choice per pixel however many poses exist.
       */
      const last = f.poses.length - 1
      const at = Math.min(Math.max(m.pose ?? 0, 0), last)
      const i = Math.min(Math.floor(at), Math.max(0, last - 1))
      const a = f.poses[i]
      const b = last > 0 ? f.poses[i + 1] : null
      const blend = last > 0 ? at - i : 0
      // With a warp running the geometry changes every frame, so the skip only
      // applies when nothing is deforming. A trail also has to redraw every
      // frame regardless - the decay IS the animation, and skipping a frame
      // freezes the after-image instead of fading it.
      const warping = m.offsets.some((v: { x: number; y: number }) => v.x !== 0 || v.y !== 0)
      if (
        !warping &&
        trailRef.current <= 0 &&
        Math.abs(blend - lastBlend) < 0.008 &&
        lookKey === lastLook &&
        lastOn === onRef.current
      ) {
        return
      }
      lastBlend = blend
      lastLook = lookKey
      lastOn = onRef.current

      if (!onRef.current) {
        ctx.clearRect(0, 0, size.w, size.h)
        ctx.putImageData(blend > 0.5 && b ? b : a, 0, 0)
        return
      }
      let field: Field | null = null
      if (warp.current && m.offsets.length === pins.length) {
        displace(warp.current.weights, m.offsets, size.w, size.h, warp.current.field)
        field = warp.current.field
      }
      dither(a, b, f.out, size.w, { ...L, blend, block: m.block }, field)

      const off = stage.current
      const t = trailRef.current
      if (!off || t <= 0) {
        ctx.clearRect(0, 0, size.w, size.h)
        ctx.putImageData(f.out, 0, 0)
        return
      }

      off.getContext('2d')!.putImageData(f.out, 0, 0)
      /*
       * Decay what is already there by subtracting alpha, rather than painting
       * a translucent black over it. `destination-out` removes alpha uniformly,
       * which keeps the background TRANSPARENT - painting black would restore
       * the rectangle the cut-out exists to get rid of.
       *
       * Each frame keeps (1 - fade) of the last, so brightness falls off
       * exponentially and the tail length is roughly 1/fade frames.
       */
      const fade = 1 / (1 + t * 55)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = `rgba(0,0,0,${fade})`
      ctx.fillRect(0, 0, size.w, size.h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(off, 0, 0)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size, motion, pins])

  return (
    <div className={className} style={{ transform: baseTransform }}>
      <div ref={move} className="will-change-transform">
        {size && (
          <canvas
            ref={canvas}
            width={size.w}
            height={size.h}
            className="w-full"
            style={{
              imageRendering: 'pixelated',
              // Applied in the element's own space, so it follows the image
              // through the wrapper's rotation rather than fading a screen edge.
              maskImage: `linear-gradient(to ${fadeFrom === 'left' ? 'right' : 'left'}, transparent 0%, rgba(0,0,0,0.35) 6%, black 17%)`,
            }}
          />
        )}
      </div>
    </div>
  )
}
