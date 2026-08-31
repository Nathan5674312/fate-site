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
import { dither, toImageData, type DitherOptions } from './dither'

export type HandProps = {
  src: string
  srcB?: string
  /** Static placement: where in the frame, which way round, how big. */
  className: string
  /** Wrapper transform for the mirror and any base rotation. */
  baseTransform: string
  look: DitherOptions
  /**
   * How far BELOW native the dither runs, 0..1. This is the dot size control:
   * 0.4 means four-tenths the pixels, each one drawn four times bigger. It is
   * also the performance control, quadratically.
   */
  pixelScale: number
  /** Live values, read every frame without re-rendering React. */
  motion: React.RefObject<{ transform: string; blend: number }>
  ditherOn: boolean
}

export function Hand({ src, srcB, className, baseTransform, look, pixelScale, motion, ditherOn }: HandProps) {
  const move = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const frames = useRef<{ a: ImageData; b: ImageData | null; out: ImageData } | null>(null)
  const lookRef = useRef(look)
  lookRef.current = look
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
      setSize({ w: ia.width, h: ia.height })
    })
    return () => { dead = true }
  }, [src, srcB, pixelScale])

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
      // transform above changes every frame; the dithered image usually does
      // not, and repainting 115k pixels for nothing is the easy mistake here.
      const lookKey = JSON.stringify(lookRef.current)
      const blend = f.b ? m.blend : 0
      if (
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
      dither(f.a, f.b, f.out, size.w, { ...lookRef.current, blend })
      ctx.putImageData(f.out, 0, 0)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size, motion])

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
