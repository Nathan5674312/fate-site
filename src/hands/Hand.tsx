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
   * 🔴 THE TRAIL IS DONE IN FLOATS, NOT BY CANVAS COMPOSITING, AND IT HAS TO BE.
   *
   * The first version faded the previous frame with `destination-out`, which
   * scales alpha PROPORTIONALLY. Canvas alpha is 8-bit, so once alpha * fade
   * falls below 0.5 the subtraction rounds to nothing and the pixel stops
   * fading — it sticks. Every pose ever drawn left a permanent residue at
   * roughly 16% opacity, which showed up as a flat grey silhouette of the other
   * poses visible behind the hand at all times. Lengthening the tail made it
   * worse, because a gentler fade stalls at a HIGHER alpha.
   *
   * Here the history is a Float32 per pixel and the decay is SUBTRACTED, so it
   * reaches exactly zero and stays there. Linear rather than exponential, which
   * suits a glowstick anyway: it dims at a constant rate rather than lingering.
   */
  const hist = useRef<Float32Array | null>(null)
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
      hist.current = new Float32Array(ia.width * ia.height)
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
       * The two poses of THIS crossing, and nothing in between. Picking the pair
       * from a continuous sequence position instead made every crossing walk
       * the index line and briefly display each pose it passed over.
       */
      const last = f.poses.length - 1
      const clamp = (n: number) => Math.min(Math.max(n | 0, 0), last)
      const a = f.poses[clamp(m.poseFrom)]
      const toIdx = clamp(m.poseTo)
      const b = toIdx === clamp(m.poseFrom) ? null : f.poses[toIdx]
      const blend = b ? Math.min(1, Math.max(0, m.poseBlend)) : 0
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

      const t = trailRef.current
      const h = hist.current
      if (!h || t <= 0) {
        ctx.clearRect(0, 0, size.w, size.h)
        ctx.putImageData(f.out, 0, 0)
        return
      }

      // Frames for a fresh mark to fade to nothing. trail 0.62 -> ~1.1s.
      const decay = 255 / (1 + t * 110)
      const px = f.out.data
      const [ir, ig, ib] = L.ink ?? [244, 244, 245]
      for (let i = 0, p = 0; i < px.length; i += 4, p++) {
        // New ink relights the pixel outright; everything else steps down by a
        // fixed amount, so it lands on exactly 0 rather than approaching it.
        const lit = px[i + 3] > 128
        const v = lit ? 255 : h[p] - decay
        h[p] = v > 0 ? v : 0
        px[i] = ir
        px[i + 1] = ig
        px[i + 2] = ib
        px[i + 3] = h[p]
      }
      ctx.putImageData(f.out, 0, 0)
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
