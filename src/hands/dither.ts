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
  /**
   * Dot size, in output pixels. 1 is the native halftone; higher values make
   * every NxN square share one source sample and one threshold, so the image
   * comes out in chunks.
   *
   * 🔴 THIS EXISTS INSTEAD OF ANIMATING `pixelScale`. pixelScale sets the canvas
   * RESOLUTION, so changing it means re-decoding every pose and rebuilding the
   * per-pixel warp weights - hundreds of thousands of distance calculations -
   * and resizing the canvas element mid-animation. Quantising coordinates here
   * is visually the same thing and costs two integer divides per pixel.
   */
  block?: number
}

const DEFAULTS = {
  threshold: 0.5,
  contrast: 1.45,
  pivot: 0.6,
  gamma: 1,
  blend: 0,
  ink: [244, 244, 245] as const,
  alphaCutoff: 24,
  block: 1,
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
  /**
   * Optional per-pixel displacement, from warp.ts. Folded into the SOURCE READ
   * rather than run as a second pass: the loop below already visits every
   * pixel, so a warp costs one offset lookup instead of another full traversal.
   */
  warp?: { dx: Float32Array; dy: Float32Array } | null,
): void {
  const o = { ...DEFAULTS, ...options }
  const src = a.data
  const alt = b?.data
  const dst = out.data
  const [ir, ig, ib] = o.ink
  const n = dst.length
  const height = (n >> 2) / width

  const blk = Math.max(1, Math.round(o.block))

  for (let i = 0; i < n; i += 4) {
    const p = i >> 2
    const rawX = p % width
    const rawY = (p / width) | 0
    // Every pixel in a block resolves to the block's top-left corner, so the
    // whole square shares one threshold and one source sample and comes out as
    // a single flat dot.
    const px = blk > 1 ? ((rawX / blk) | 0) * blk : rawX
    const py = blk > 1 ? ((rawY / blk) | 0) * blk : rawY
    const bp = blk > 1 ? py * width + px : p
    // One threshold value serves twice: it picks WHICH image this pixel comes
    // from, and then whether that pixel is ink. Reusing it is what keeps the
    // dissolve and the dither visually coherent instead of two competing noises.
    const t = (BAYER8[(py & 7) * 8 + (px & 7)] + 0.5) / 64

    const s = alt && o.blend > t ? alt : src

    /*
     * Read from where this pixel came FROM, not where it goes to. Inverse
     * mapping is what keeps the output gapless - pushing pixels forward leaves
     * holes wherever the field stretches, and no amount of dithering hides a
     * hole. Nearest-neighbour on purpose: the output is one bit, so the cost of
     * bilinear sampling would buy nothing.
     */
    let si = blk > 1 ? bp << 2 : i
    if (warp) {
      const sx = (px - warp.dx[bp] + 0.5) | 0
      const sy = (py - warp.dy[bp] + 0.5) | 0
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
        dst[i + 3] = 0
        continue
      }
      si = (sy * width + sx) << 2
    }

    if (s[si + 3] < o.alphaCutoff) {
      dst[i + 3] = 0
      continue
    }

    let v = luma(s, si)
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

/* ------------------------------------------------ motion-driven look --- */

/**
 * How the treatment moves WITH the animation.
 *
 * Nathan, 2026-08-30: the settings should change as the hand moves. It is a
 * good instinct and it costs almost nothing, because the motion loop already
 * computes the drive values — the same effort curve that shakes the hand can
 * push ink into it.
 *
 * What it buys, on the human: at the peak of a surge the hand DENSIFIES —
 * more ink, harder contrast — so it reads as tensing, becoming more solid and
 * more present under load. On the sag it thins out and starts to dissolve back
 * into the ground, which reads as losing the effort. Neither is a metaphor
 * anyone will name; it just stops the hand looking like a decal.
 *
 * The tremor term is the other half. A tiny per-frame wobble in the threshold
 * makes individual dots flicker on and off — the "boil" of hand-drawn
 * animation. Without it a dithered still image slid around the screen looks
 * exactly like what it is: a texture on a moving rectangle.
 */
export type LookMod = {
  /** Ink shift at full drive. NEGATIVE means more ink, since lower = denser. */
  thresholdByDrive?: number
  /** Contrast added at full drive. */
  contrastByDrive?: number
  /** Per-frame threshold wobble from the jitter signal. */
  thresholdByJitter?: number
  /**
   * 🔴 PIVOT SHIFT AT FULL DRIVE, and at high contrast this is the ONLY one of
   * these that does anything visible.
   *
   * Measured: with Nathan's tuning (contrast 3.45) a threshold swing of 0.09
   * moved ink coverage by 0.33 of a percentage point - completely invisible.
   * High contrast stretches the tonal range so far that almost every pixel is
   * decisively above or below every threshold, leaving nothing borderline for a
   * threshold shift to flip.
   *
   * Pivot moves the WINDOW rather than the cut, so it keeps working: at
   * contrast 3.45 a pivot shift of 0.03 moves the mapped value by over 0.10.
   * NEGATIVE means more ink.
   */
  pivotByDrive?: number
  /** Per-frame pivot wobble. This is the boil, for the same reason as above. */
  pivotByJitter?: number
}

export const NO_MOD: LookMod = {}

export type Drive = {
  /** 0..1. Effort for the human; how far a feint has extended for the machine. */
  primary: number
  /** Roughly -1..1. Tremor for the human; sway for the machine. */
  jitter: number
}

/** The base treatment with the drive applied. Cheap: three multiplies. */
export function modulate(base: DitherOptions, mod: LookMod, drive: Drive): DitherOptions {
  const threshold =
    (base.threshold ?? DEFAULTS.threshold) +
    (mod.thresholdByDrive ?? 0) * drive.primary +
    (mod.thresholdByJitter ?? 0) * drive.jitter
  const contrast =
    (base.contrast ?? DEFAULTS.contrast) + (mod.contrastByDrive ?? 0) * drive.primary
  const pivot =
    (base.pivot ?? DEFAULTS.pivot) +
    (mod.pivotByDrive ?? 0) * drive.primary +
    (mod.pivotByJitter ?? 0) * drive.jitter
  return {
    ...base,
    pivot: Math.min(0.98, Math.max(0.02, pivot)),
    // Clamped: a threshold outside this range floods or empties the hand
    // entirely, and a surge should never be able to erase it.
    threshold: Math.min(0.95, Math.max(0.05, threshold)),
    contrast: Math.max(0.1, contrast),
  }
}
