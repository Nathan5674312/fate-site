import { useMemo } from 'react'

/**
 * THE FOLD: Creation of Adam, inverted.
 *
 * Michelangelo's near-touch with the roles swapped. The human strains up from
 * the bottom right; the machine descends from the top and pulls back. The gap
 * between them is the subject — in the original it is an inch and closing, here
 * it is wider and opening.
 *
 * WHY INVERTED. The original is a god granting life to a passive man. Reversed,
 * it says the thing this product actually believes: the capability exists,
 * people are straining for it, and it is not meeting them halfway. It is
 * slightly uncomfortable, which is why it does not read as decoration.
 *
 * WHY THE MACHINE IS AN ATTENTION MASK. Nathan's test was insider recognition:
 * "whatever can describe AI best, not to the user, but to someone that knows
 * what AI is capable of". That rules out the whole cliché set — robot hands,
 * glowing brains, circuit traces, neural-network fireworks. What is left that a
 * practitioner recognises instantly is the causal attention matrix: the lower
 * triangle every one of them has stared at while debugging a transformer. It
 * also happens to be shaped like a descent, which the composition needs.
 *
 * WHY IT IS DRAWN AND NOT PHOTOGRAPHED. An AI-generated hero image is banned by
 * roadmap note 12 and by DESIGN.md §3; stock is banned too, and the reference
 * photo Nathan supplied is unlicensed for publication. So the hand is REDRAWN
 * from that pose as structure — contour lines, not anatomy — which sidesteps
 * both the licence and the uncanny valley, and matches the machine's own
 * geometric language.
 */

/** Grid resolution of the mask. 14 is enough to read as a matrix, cheap to draw. */
const MASK_N = 14

/**
 * Where the index fingertip lands, in viewBox units. The hand's own path ends
 * here; the rays are placed relative to it, so this is the single number that
 * ties the two halves of the composition together.
 */
const INDEX_TIP = { x: 32, y: 63 }
/** Roughly where the mask hangs, used only to aim the rays back at it. */
const MASK_ANCHOR = { x: 52, y: 26 }
/**
 * How far the machine stops short, in viewBox units. This is the subject of the
 * picture, so it is a named constant rather than an emergent property of four
 * hand-typed coordinate pairs.
 */
const REACH_GAP = 13

export function Fold() {
  /**
   * The causal mask: cell (row, col) exists only where col <= row, which is the
   * triangle that makes it recognisable. Opacity carries a plausible weight —
   * recent tokens attended to more strongly — so it reads as a real attention
   * pattern rather than a decorative triangle.
   *
   * Deterministic: the "weights" are a function of position, not random, so the
   * page renders identically every load and can be reasoned about.
   */
  const cells = useMemo(() => {
    const out: { x: number; y: number; w: number }[] = []
    for (let row = 0; row < MASK_N; row++) {
      for (let col = 0; col <= row; col++) {
        // Attention decays with distance, with a diagonal bias — the shape a
        // real causal head tends to have.
        const dist = row - col
        const w = Math.max(0.06, Math.exp(-dist / 3.2) * (0.35 + 0.65 * (row / MASK_N)))
        out.push({ x: col, y: row, w })
      }
    }
    return out
  }, [])

  /**
   * The four retracting rays, generated so they always stop short.
   *
   * Ends lie on a circle of radius REACH_GAP centred on the index fingertip,
   * across the arc that faces the mask. Starts sit up on the mask's lower edge.
   * Because both are derived from INDEX_TIP, moving the hand moves the gap with
   * it and the machine can never accidentally touch what it is withholding.
   */
  const rays = useMemo(() => {
    const toMask = Math.atan2(MASK_ANCHOR.y - INDEX_TIP.y, MASK_ANCHOR.x - INDEX_TIP.x)
    return [0, 1, 2, 3].map((i) => {
      // Fan across ±26° of the direction back toward the mask.
      const a = toMask + ((i - 1.5) / 1.5) * (26 * Math.PI) / 180
      return {
        x1: +(INDEX_TIP.x + Math.cos(a) * (REACH_GAP + 15)).toFixed(2),
        y1: +(INDEX_TIP.y + Math.sin(a) * (REACH_GAP + 15)).toFixed(2),
        x2: +(INDEX_TIP.x + Math.cos(a) * REACH_GAP).toFixed(2),
        y2: +(INDEX_TIP.y + Math.sin(a) * REACH_GAP).toFixed(2),
      }
    })
  }, [])

  return (
    <div className="fold" aria-hidden="true">
      <svg
        className="fold-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          {/* The machine's light. Cool, and it falls off fast, so the descent
              reads as something withdrawing upward rather than a lit panel. */}
          <linearGradient id="fold-machine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-glow)" stopOpacity="0.95" />
            <stop offset="70%" stopColor="var(--color-glow)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-glow)" stopOpacity="0" />
          </linearGradient>
          {/* The human is warm and dim: reaching, not radiating. */}
          <linearGradient id="fold-human" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--color-tan)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-tan)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* ── THE MACHINE ────────────────────────────────────────────────
            The causal mask, hanging from the top edge and tilted so its
            leading corner points at the hand it is not going to meet. */}
        <g className="fold-machine" transform="translate(46 -6) rotate(14) scale(3.1)">
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width="0.86"
              height="0.86"
              fill="url(#fold-machine)"
              opacity={c.w}
            />
          ))}
        </g>

        {/* The retracting reach: rays that leave the mask toward the hand and
            stop short of it.

            THE GAP IS COMPUTED, NOT TYPED. Hand-placed endpoints put two rays
            within 4.3 units of the fingertip and left them sitting BELOW it,
            so the machine read as reaching past the hand rather than declining
            to meet it — the exact opposite of the composition's point. The ends
            are now generated on a circle of radius REACH_GAP around the index
            tip, so the shortfall is guaranteed by construction and cannot be
            closed by a later nudge to either side. */}
        <g className="fold-rays">
          {rays.map((r, i) => (
            <line
              key={i}
              x1={r.x1}
              y1={r.y1}
              x2={r.x2}
              y2={r.y2}
              stroke="var(--color-glow)"
              strokeWidth="0.18"
              strokeDasharray="1.4 2.2"
              opacity={0.5 - i * 0.09}
            />
          ))}
        </g>

        {/*  ── THE HUMAN ─────────────────────────────────────────────────
            A blend of Adam's hand and Nathan's reference photo, pushed to
            maximum strain.

            ADAM'S SILHOUETTE, INVERTED. Michelangelo's hand is famously LIMP —
            the wrist drapes, the index falls forward without effort, and that
            languor is the painting's whole argument: the man is being given
            something he is not working for. Taking the same recognisable
            gesture and putting it under load says the opposite, which is what
            this composition is for.

            WHERE THE STRAIN IS DRAWN. Four places, because effort in a hand is
            never in the fingers alone: the wrist breaks past straight
            (hyperextension), the index locks rigid while the lesser fingers
            trail and splay, the extensor tendons stand up as fanned lines from
            the wrist to each knuckle, and the thumb is thrown back and away —
            nobody reaching at full stretch keeps a tidy thumb.

            THE INDEX FALLS SHORT ON PURPOSE. Its tip stops well below the
            nearest retracting ray. The gap is the subject, so it is explicit
            geometry rather than something left to chance. */}
        <g
          className="fold-human"
          fill="none"
          stroke="url(#fold-human)"
          strokeWidth="0.42"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* forearm, in from the bottom-right corner, extended past comfort */}
          <path d="M106 106 L88 93 L76 84" />
          {/* wrist, broken slightly past straight - the first tell of strain */}
          <path d="M76 84 C72 81 69 79 66 78" />
          {/* back of the hand: knuckle line and the lower edge */}
          <path d="M66 78 C61 75 56 73 51 72" />
          <path d="M76 84 C71 88 66 90 61 90 C57 90 54 89 52 87" />
          {/* INDEX - rigid, fully locked, the furthest reach. Adam's gesture,
              but straight rather than falling. */}
          <path d="M51 72 C45 68 40 65 36 63 C34 62 33 62 32 63" />
          {/* middle - extended but trailing, already losing the reach */}
          <path d="M51 75 C46 73 42 71 38 71 C36 71 34 72 33 73" />
          {/* ring - curling back, giving up */}
          <path d="M52 79 C48 78 45 78 42 79 C40 80 39 81 39 82" />
          {/* little - furthest from the effort, most curled */}
          <path d="M53 83 C50 83 48 84 46 86 C45 87 44 88 44 89" />
          {/* thumb, thrown back and down, away from the reach */}
          <path d="M64 87 C62 91 61 95 61 98 C61 100 62 102 63 103" />

          {/* extensor tendons: the effort made visible. Fanned from the wrist
              to each knuckle, brightest on the index because that is the finger
              doing the work. */}
          <path d="M71 82 L52 72" opacity="0.65" />
          <path d="M71 84 L52 75" opacity="0.5" />
          <path d="M70 86 L53 79" opacity="0.38" />
          <path d="M69 88 L54 83" opacity="0.28" />
        </g>

      </svg>
    </div>
  )
}
