/**
 * PER-FINGER DEFORMATION, done as a displacement lookup inside the dither pass.
 *
 * Nathan, 2026-08-30: "the hands are just stale... the whole image just moving
 * back and forth. It doesn't look like it's tremoring at all." Correct, and it
 * is the honest limit of a transform: translating a rectangle can only ever
 * slide it. A hand straining at its limit DEFORMS — the fingers splay, each one
 * arriving slightly after the one before, while the wrist stays where it is.
 *
 * 🔴 THE THING THAT MAKES IT READ AS TREMBLING IS DIFFERENTIAL MOTION. Not
 * amplitude, not frequency. If every pixel moves together the eye reads it as
 * one object sliding, however fast it moves. If the fingertips move and the
 * wrist does not, and each fingertip lags the last by a few tens of
 * milliseconds, the same tiny amplitude reads as strain. That is why the arm
 * pin below has weight 0: something has to stay still for the rest to shake
 * against.
 *
 * HOW IT IS CHEAP. Hand.tsx already walks every pixel once a frame to dither
 * it. The warp is folded into that same walk as an offset on the SOURCE read —
 * no second pass, no mesh geometry, no WebGL. Per-pixel pin weights are
 * inverse-square distance, precomputed once because the rest positions never
 * move; per frame it is a handful of multiply-adds per pixel.
 *
 * This is the same idea as After Effects' Puppet tool, minus the triangulation:
 * pins with falloff, deforming a photograph, with the art still Michelangelo's.
 */

export type Pin = {
  id: string
  /** Rest position, as a fraction of the image. */
  x: number
  y: number
  /**
   * How much of the drive this pin takes. 0 anchors it — an anchored pin is
   * what turns a slide into a deformation, so every hand needs at least one.
   */
  weight: number
  /** Seconds this pin trails the drive. Different per finger, or it is a slide. */
  lag: number
  /** Direction of travel under load, degrees, image space (0 = right). */
  dir: number
  /** Multiplier on the tremor for this pin. Fingertips shake most. */
  shake: number
}

/**
 * THE HUMAN — God's hand. Arm enters LEFT, fingers extend RIGHT and slightly
 * down. Read off a grid overlay of the WRIST-REGISTERED human-2 (384x261).
 *
 * Re-derived twice now, both times because the crop changed shape underneath
 * them. Pins are NORMALISED, so a stale set scales happily onto an image it no
 * longer describes and nothing errors — it just warps the wrong places. Any
 * change to the pose art means re-reading these.
 */
export const HUMAN_PINS: readonly Pin[] = [
  // Longest finger leads the reach: furthest travel, hardest shake.
  { id: 'index', x: 0.93, y: 0.5, weight: 1, lag: 0, dir: 12, shake: 1 },
  { id: 'mid', x: 0.84, y: 0.55, weight: 0.74, lag: 0.035, dir: 20, shake: 0.82 },
  { id: 'ring', x: 0.74, y: 0.58, weight: 0.56, lag: 0.05, dir: 26, shake: 0.7 },
  { id: 'thumb', x: 0.62, y: 0.48, weight: 0.34, lag: 0.045, dir: 8, shake: 0.42 },
  { id: 'knuckle', x: 0.56, y: 0.4, weight: 0.32, lag: 0.04, dir: 14, shake: 0.34 },
  // The wrist is now the registration anchor, so it barely moves by design.
  { id: 'wrist', x: 0.46, y: 0.33, weight: 0.1, lag: 0.065, dir: 12, shake: 0.12 },
  // Anchored: the arm runs off the frame edge and must not move at all.
  { id: 'arm', x: 0.05, y: 0.55, weight: 0, lag: 0, dir: 0, shake: 0 },
]

/**
 * THE MACHINE — Adam's hand. Arm enters top RIGHT, fingers hang down-LEFT. It
 * barely moves: the point is that it stays composed while the other hand shakes.
 */
export const MACHINE_PINS: readonly Pin[] = [
  { id: 'tipA', x: 0.3, y: 0.78, weight: 1, lag: 0, dir: 214, shake: 1 },
  { id: 'tipB', x: 0.4, y: 0.8, weight: 0.8, lag: 0.07, dir: 220, shake: 0.8 },
  { id: 'tipC', x: 0.5, y: 0.72, weight: 0.6, lag: 0.11, dir: 228, shake: 0.6 },
  { id: 'knuckle', x: 0.55, y: 0.45, weight: 0.3, lag: 0.09, dir: 224, shake: 0.3 },
  { id: 'wrist', x: 0.69, y: 0.26, weight: 0.1, lag: 0.12, dir: 226, shake: 0.1 },
  { id: 'arm', x: 0.97, y: 0.1, weight: 0, lag: 0, dir: 0, shake: 0 },
]

/**
 * Per-pixel, per-pin influence, normalised so each pixel's weights sum to 1.
 *
 * Built ONCE per hand: rest positions never change, and this is the expensive
 * part (a square root per pixel per pin). Inverse-square falloff, softened by
 * an epsilon so a pixel sitting exactly on a pin does not divide by zero and
 * take the entire displacement.
 */
export function buildWeights(pins: readonly Pin[], w: number, h: number): Float32Array {
  const n = pins.length
  const out = new Float32Array(w * h * n)
  // Squared, in pixels. Larger = softer blending between neighbouring pins.
  const eps = (0.06 * Math.max(w, h)) ** 2

  const px = pins.map((p) => p.x * w)
  const py = pins.map((p) => p.y * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const base = (y * w + x) * n
      let sum = 0
      for (let i = 0; i < n; i++) {
        const dx = x - px[i]
        const dy = y - py[i]
        const wgt = 1 / (dx * dx + dy * dy + eps)
        out[base + i] = wgt
        sum += wgt
      }
      for (let i = 0; i < n; i++) out[base + i] /= sum
    }
  }
  return out
}

export type Field = { dx: Float32Array; dy: Float32Array }

export function makeField(w: number, h: number): Field {
  return { dx: new Float32Array(w * h), dy: new Float32Array(w * h) }
}

/**
 * Blend this frame's pin offsets into a per-pixel displacement field.
 *
 * `offsets` is pixel displacement per pin, in image space, already including
 * that pin's lag and shake — see handOffsets in Hands.tsx.
 */
export function displace(
  weights: Float32Array,
  offsets: readonly { x: number; y: number }[],
  w: number,
  h: number,
  field: Field,
): void {
  const n = offsets.length
  const { dx, dy } = field
  for (let p = 0, base = 0; p < w * h; p++, base += n) {
    let ax = 0
    let ay = 0
    for (let i = 0; i < n; i++) {
      const wt = weights[base + i]
      ax += wt * offsets[i].x
      ay += wt * offsets[i].y
    }
    dx[p] = ax
    dy[p] = ay
  }
}
