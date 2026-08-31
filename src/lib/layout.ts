/**
 * A tiny force-directed layout, run ONCE at module load and never again.
 *
 * WHY NOT d3-force, which the app itself uses. On the page this graph is a
 * still picture that animates in: it never reacts to a drag, never re-settles,
 * and never adds a node. Shipping a physics engine to lay out nine dots would
 * be ~30kB and a rAF loop for a result that is identical every time.
 *
 * WHY NOT HARDCODED COORDINATES, which is the other obvious answer. The graph
 * has to stay right when the demo vault changes, and a hand-placed layout is a
 * second thing to update that nobody will remember to update. This reads the
 * same NOTES array the table and the board read.
 *
 * DETERMINISTIC ON PURPOSE. The RNG is seeded, so the layout is byte-identical
 * on every load, in every browser, for every visitor. A graph that settles
 * differently each refresh looks like a toy; one that is always the same shape
 * becomes something the page can be designed around, and it can be tested.
 */

export type Point = { x: number; y: number }
export type LaidOutNode = Point & { id: string }

/**
 * Mulberry32. Small, fast, and good enough for jitter — this is not
 * cryptography, it is where the dots start before the springs take over.
 *
 * `Math.random()` would make the layout different on every load, which is
 * exactly the thing this file exists to avoid.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type LayoutOptions = {
  /** Iterations. 300 is comfortably past the point this settles. */
  steps?: number
  /** How hard linked nodes pull together. */
  attraction?: number
  /** How hard every pair pushes apart. Balanced against attraction, not absolute. */
  repulsion?: number
  /** Pull toward the origin, so a disconnected node cannot drift to infinity. */
  centering?: number
  seed?: number
}

/**
 * Positions for every node, normalised into a 0..1 box.
 *
 * Normalised rather than pixel coordinates because the caller knows its own
 * size and the page is responsive; returning pixels would bake one viewport
 * into the layout.
 */
export function forceLayout(
  ids: readonly string[],
  links: readonly { from: string; to: string }[],
  opts: LayoutOptions = {},
): LaidOutNode[] {
  const { steps = 300, attraction = 0.006, repulsion = 0.9, centering = 0.012, seed = 20260302 } =
    opts

  const rand = rng(seed)
  // Start on a ring rather than at random points: a random cloud sometimes
  // settles inside-out and leaves an edge crossing the whole graph. A ring has
  // no inside to be caught on, and the jitter breaks the symmetry that would
  // otherwise let two nodes sit exactly on top of each other forever.
  const pos = new Map<string, Point>(
    ids.map((id, i) => {
      const a = (i / ids.length) * Math.PI * 2
      return [id, { x: Math.cos(a) + (rand() - 0.5) * 0.1, y: Math.sin(a) + (rand() - 0.5) * 0.1 }]
    }),
  )

  const idx = new Set(ids)
  const edges = links.filter((l) => idx.has(l.from) && idx.has(l.to))

  for (let step = 0; step < steps; step++) {
    // Cooling. Without it the last iterations jitter forever around the
    // solution instead of arriving at it.
    const cool = 1 - step / steps

    // Repulsion, every pair. O(n^2) is the right call at nine nodes: a
    // quadtree would be more code than the whole file for no measurable gain.
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue
        const p = pos.get(a)!
        const q = pos.get(b)!
        let dx = p.x - q.x
        let dy = p.y - q.y
        let d2 = dx * dx + dy * dy
        // Two nodes at the same point have no direction to separate along, so
        // give them one rather than dividing by zero.
        if (d2 < 1e-6) {
          dx = (rand() - 0.5) * 1e-3
          dy = (rand() - 0.5) * 1e-3
          d2 = dx * dx + dy * dy
        }
        const f = (repulsion / d2) * cool * 0.001
        p.x += dx * f
        p.y += dy * f
      }
    }

    // Attraction along real edges only.
    for (const e of edges) {
      const p = pos.get(e.from)!
      const q = pos.get(e.to)!
      const dx = q.x - p.x
      const dy = q.y - p.y
      const f = attraction * cool
      p.x += dx * f
      p.y += dy * f
      q.x -= dx * f
      q.y -= dy * f
    }

    // Centering, so the whole thing stays in frame.
    for (const id of ids) {
      const p = pos.get(id)!
      p.x -= p.x * centering * cool
      p.y -= p.y * centering * cool
    }
  }

  return normalise(ids.map((id) => ({ id, ...pos.get(id)! })))
}

/**
 * Fit to 0..1 on both axes independently.
 *
 * Independently, and that is deliberate: preserving aspect ratio would leave a
 * wide graph with empty bands top and bottom, and this is a decorative layout
 * in a box whose shape the CSS decides, not a map where proportion carries
 * meaning.
 */
function normalise(nodes: LaidOutNode[]): LaidOutNode[] {
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  // A single node, or a perfectly straight line, has zero span on an axis.
  // Dividing by it yields NaN and the graph vanishes; 0.5 puts it in the middle.
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  return nodes.map((n) => ({
    id: n.id,
    x: maxX === minX ? 0.5 : (n.x - minX) / spanX,
    y: maxY === minY ? 0.5 : (n.y - minY) / spanY,
  }))
}
