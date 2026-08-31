/**
 * ONE HAND: a photograph, dithered on a canvas, moved by a transform.
 *
 * The canvas runs at the crop's NATIVE size and is scaled up by CSS with
 * `image-rendering: pixelated`. That is what makes the 1-bit look affordable —
 * ~115k pixels per frame instead of a hero-sized region — and the chunky
 * upscaled dots are the intended look rather than a compromise.
 *
 * `poseB` is the second, further-reaching pose. When it is supplied, `blend`
 * dissolves toward it PER PIXEL (see dither.ts), so the fingers appear to
 * extend without the image ever being cut apart or warped. When it is absent
 * the hand simply holds pose A, which is the state until that art exists.
 */

import { useEffect, useRef, useState } from 'react'
import { dither, toImageData } from './dither'
import { buildWeights, displace, makeField, type Field, type Pin } from './warp'
import type { MotionFrame } from './Hands'

export type HandProps = {
  src: string
  srcB?: string
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
   * Live values, read every frame without re-rendering React. The LOOK arrives
   * here too, already modulated by the animation, so the treatment and the
   * movement can never disagree about what moment it is.
   */
  motion: React.RefObject<MotionFrame>
  ditherOn: boolean
}

export function Hand({ src, srcB, className, baseTransform, pixelScale, pins, motion, ditherOn }: HandProps) {
  const move = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const frames = useRef<{ a: ImageData; b: ImageData | null; out: ImageData } | null>(null)
  // Built once per image: rest positions never move, and this is the costly
  // part (a distance per pixel per pin).
  const warp = useRef<{ weights: Float32Array; field: Field } | null>(null)
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

    Promise.all([load(src), srcB ? load(srcB) : Promise.resolve(null)]).then(([a, b]) => {
      if (dead) return
      const ia = toImageData(a, pixelScale)
      frames.current = {
        a: ia,
        b: b ? toImageData(b, pixelScale) : null,
        out: new ImageData(ia.width, ia.height),
      }
      warp.current = {
        weights: buildWeights(pins, ia.width, ia.height),
        field: makeField(ia.width, ia.height),
      }
      setSize({ w: ia.width, h: ia.height })
    })
    return () => { dead = true }
  }, [src, srcB, pixelScale, pins])

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
      const lookKey = `${L.threshold?.toFixed(3)}|${L.contrast?.toFixed(3)}|${L.pivot}|${L.gamma}|${L.ink}`
      const blend = f.b ? m.blend : 0
      // With a warp running the geometry changes every frame, so the skip only
      // applies when nothing is deforming.
      const warping = m.offsets.some((v: { x: number; y: number }) => v.x !== 0 || v.y !== 0)
      if (
        !warping &&
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
        ctx.putImageData(blend > 0.5 && f.b ? f.b : f.a, 0, 0)
        return
      }
      let field: Field | null = null
      if (warp.current && m.offsets.length === pins.length) {
        displace(warp.current.weights, m.offsets, size.w, size.h, warp.current.field)
        field = warp.current.field
      }
      dither(f.a, f.b, f.out, size.w, { ...L, blend }, field)
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
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>
    </div>
  )
}
