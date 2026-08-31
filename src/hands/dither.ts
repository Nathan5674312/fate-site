/**
 * 1-BIT ORDERED DITHER, and the trick that makes Nathan's two-pose idea work.
 *
 * Nathan, 2026-08-30: use the original image plus a slightly different one, and
 * "have AI just, like, mold in between", because a heavy filter over the top
 * means "you can't really make out much of the details."
 *
 * 🔴 THE KEY POINT: under a 1-bit dither, a crossfade STOPS LOOKING LIKE A
 * GHOST. Fade two photographs together normally and you get a double exposure —
 * two sets of fingers, both translucent, unmistakably wrong. But if the blend
 * is decided PER PIXEL against the same threshold matrix that does the
 * dithering, every pixel commits to one image or the other. There is never a
 * translucent pixel, so there is never a ghost. It reads as one hand made of
 * noise, resolving.
 *
 * That is why `blend` below is compared against the Bayer threshold rather than
 * used to average the two colours. It is one extra comparison, and it is the
 * difference between the effect working and looking like a mistake.
 *
 * It also settles the performance objection in docs/hands.md section 5. That
 * said filtering a hero-sized region every frame is too expensive — true, but
 * this runs BELOW the crop's native size (see `pixelScale`) and is then scaled
 * up by CSS with `image-rendering: pixelated`. Two orders of magnitude fewer
 * pixels than a hero-sized filter, and the upscale is free. The chunky dots are
 * the look, not a compromise.
 */

/**
 * Bayer 8x8. Each cell holds the brightness at which that pixel flips on, so a
 * smooth gradient becomes an even, non-clumping dot pattern rather than noise.
 *
 * 8x8 rather than 4x4 because it gives 64 tonal steps instead of 16. The
 * reference treatment blows highlights to nothing and crushes shadows to solid,
 * and the interesting part is the narrow band in between — which needs the
 * extra steps to hold any structure at all. Chunkiness comes from `pixelScale`
 * in Hand.tsx, not from a coarser matrix.
 */
const BAYER8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
]

export type DitherOptions = {
  /** Below this the pixel is off. Raises or lowers the overall ink. 0..1 */
  threshold?: number
  /** Contrast applied before thresholding. Fresco is flat; this opens it up. */
  contrast?: number
  /**
   * The luminance that maps to mid-grey, i.e. the middle of the tonal range
   * being stretched. NOT 0.5 by default, and that matters: the fresco hands sit
   * at roughly 0.39-0.78 luminance, so pivoting at 0.5 pushes almost the whole
   * hand above every threshold and it fills in as a solid silhouette. Pivoting
   * at the middle of the ACTUAL range is what leaves halftone texture across
   * the form instead of only at the edges.
   */
  pivot?: number
  /** Lift or crush midtones before thresholding. 1 = untouched. */
  gamma?: number
  /** 0 = all of `a`, 1 = all of `b`. Per-pixel, never averaged. */
  blend?: number
  /**
   * Ink colour, RGB. Transparent where the pixel is off — the GROUND is always
   * the page behind, never painted here. Painting a ground would put the
   * cut-out hands back on rectangles, which is the thing the alpha just fixed.
   */
  ink?: readonly [number, number, number]
  /** Alpha below this in the SOURCE stays fully transparent in the output. */
  alphaCutoff?: number
}

const DEFAULTS = {
  threshold: 0.5,
  contrast: 1.45,
  pivot: 0.6,
  gamma: 1,
  blend: 0,
  ink: [244, 244, 245] as const,
  alphaCutoff: 24,
}

function luma(d: Uint8ClampedArray, i: number): number {
  return (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255
}

/**
 * Dither `a` (optionally dissolving toward `b`) into `out`.
 *
 * All three must be the same dimensions. `out` is written in full, so it can be
 * reused across frames without clearing.
 */
export function dither(
  a: ImageData,
  b: ImageData | null,
  out: ImageData,
  width: number,
  options: DitherOptions = {},
): void {
  const o = { ...DEFAULTS, ...options }
  const src = a.data
  const alt = b?.data
  const dst = out.data
  const [ir, ig, ib] = o.ink
  const n = dst.length

  for (let i = 0; i < n; i += 4) {
    const px = (i >> 2) % width
    const py = (i >> 2) / width | 0
    // One threshold value serves twice: it picks WHICH image this pixel comes
    // from, and then whether that pixel is ink. Reusing it is what keeps the
    // dissolve and the dither visually coherent instead of two competing noises.
    const t = (BAYER8[(py & 7) * 8 + (px & 7)] + 0.5) / 64

    const s = alt && o.blend > t ? alt : src

    if (s[i + 3] < o.alphaCutoff) {
      dst[i + 3] = 0
      continue
    }

    let v = luma(s, i)
    if (o.gamma !== 1) v = Math.pow(v, o.gamma)
    v = (v - o.pivot) * o.contrast + 0.5

    // Ordered dither: ink wherever brightness beats this cell's threshold.
    // `threshold` slides the whole ramp, so it changes how much ink there is
    // without collapsing the dot pattern the way clamping would.
    if (v + (0.5 - o.threshold) > t) {
      dst[i] = ir
      dst[i + 1] = ig
      dst[i + 2] = ib
      dst[i + 3] = 255
    } else {
      dst[i + 3] = 0
    }
  }
}

/**
 * Read an image into ImageData at its natural size.
 *
 * Kept separate and done ONCE per image: decoding on every frame would dominate
 * the cost, and the source never changes.
 */
export function toImageData(img: HTMLImageElement, scale = 1): ImageData {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.naturalWidth * scale))
  c.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  // The browser resamples on the way down, which is what makes the dots chunky:
  // fewer, larger pixels, then scaled back up with `image-rendering: pixelated`.
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return ctx.getImageData(0, 0, c.width, c.height)
}
