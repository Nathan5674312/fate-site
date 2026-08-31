import { useMemo, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { BRAND, HERO } from '../content'
import { NOTES, edges } from '../demo'
import { forceLayout } from '../lib/layout'

gsap.registerPlugin(useGSAP)

/**
 * THE FOLD: a lit arch, and a doorway you can see the product through.
 *
 * The composition is Nathan's reference — enormous backlit type curving over a
 * small bright opening, with the scale gap doing the work. What is behind the
 * opening is the departure the research argued for.
 *
 * WHY THE GRAPH IS THE LIGHT SOURCE. `docs/design-research.md` §C1 measured
 * Obsidian — the one product in this category known for a graph — rendering it
 * as a STATIC inline SVG, 349x316px, 8.5% of the fold, in the third pane of a
 * screenshot. The category's signature visual is used as wallpaper. §C3 found
 * six of seven pages open on an abstract claim rather than a demonstration.
 * So the doorway is not decoration: it is the graph, live, and it is the thing
 * the page is actually about. The arch says who made it; the light says what it
 * does. "It already understands your folder" is performed, not asserted.
 *
 * NO WEBGL, DELIBERATELY. The same research verified the competitor's hero
 * contains zero <canvas> and zero <img> in that region - plain inline SVG is
 * enough, and it stays selectable, themeable and cheap. `vanta-backgrounds` §9
 * is explicit that a shader is the wrong tool when the effect is a glow.
 *
 * THE ARC IS CSS, NOT SplitText. Each character is rendered by React, so its
 * rotation is a pure function of its index and there is no re-split on resize
 * and no font-loading race (the two failure modes the gsap skill flags in §13).
 * GSAP is used where it earns the bundle: a staggered, reversible reveal and a
 * reduced-motion branch that is a media condition rather than an `if`.
 */

/** How far the ends of the word lift, in degrees at the outermost character. */
const ARC_DEGREES = 13

export function Hero() {
  const root = useRef<HTMLElement>(null)

  const word = BRAND.studio.toUpperCase()
  const chars = useMemo(() => [...word], [word])

  /** Laid out once at module scope cost, memoised so React never re-runs it. */
  const graph = useMemo(() => {
    const es = edges()
    const pos = forceLayout(
      NOTES.map((n) => n.id),
      es,
    )
    const by = new Map(pos.map((p) => [p.id, p]))
    return { pos, edges: es.map((e) => ({ a: by.get(e.from)!, b: by.get(e.to)! })) }
  }, [])

  useGSAP(
    () => {
      /*
       * A media CONDITION, not an `if`. The gsap skill's §7 point: an `if`
       * runs once, so a visitor who turns reduced motion on afterwards is
       * left in the wrong state until reload. matchMedia reverts the branch
       * that stopped matching and runs the other one.
       */
      const mm = gsap.matchMedia()

      mm.add(
        { reduced: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const { reduced } = ctx.conditions as { reduced: boolean }

          if (reduced) {
            // State without transition. The content arrives, it just does not
            // travel. Nothing is left at opacity 0.
            gsap.set('[data-char], [data-door], [data-node], [data-edge], [data-sub]', {
              autoAlpha: 1,
              y: 0,
              scale: 1,
            })
            return
          }

          /*
           * `to()` from a CSS-hidden start, never `from()`. §5 of the gsap
           * skill: `from()` renders its start values the moment it is created,
           * which paints the real position for a frame first. The CSS in
           * hero.css owns the hidden state and GSAP takes over from there.
           */
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

          tl.to('[data-char]', {
            autoAlpha: 1,
            y: 0,
            duration: 1.1,
            // `amount`, not `each`: the total stays 0.7s whatever the studio
            // name is, so renaming the brand cannot change the pacing.
            stagger: { amount: 0.7, from: 'center' },
          })
            .to('[data-door]', { autoAlpha: 1, scaleY: 1, duration: 1.4, ease: 'expo.out' }, '-=0.7')
            .to('[data-edge]', { autoAlpha: 1, duration: 0.9, stagger: { amount: 0.5 } }, '-=0.9')
            .to(
              '[data-node]',
              { autoAlpha: 1, scale: 1, duration: 0.7, stagger: { amount: 0.6, from: 'random' } },
              '-=0.8',
            )
            .to('[data-sub]', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.5')
        },
        root,
      )

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="hero" aria-label={`${BRAND.studio} — ${HERO.headline}`}>
      {/* The arch. aria-hidden because it is rendered one character per span;
          the accessible name is on the section above, so a screen reader reads
          the studio name once instead of fifteen letters. */}
      <h1 className="hero-arch" aria-hidden="true">
        {chars.map((c, i) => {
          const t = chars.length === 1 ? 0 : (i / (chars.length - 1)) * 2 - 1 // -1..1
          return (
            <span
              key={`${c}-${i}`}
              data-char
              className="hero-char"
              style={{
                // Rotation is linear across the word; the lift is quadratic, so
                // the baseline curves instead of tenting.
                transform: `rotate(${t * ARC_DEGREES}deg) translateY(${t * t * 1.1}em)`,
              }}
            >
              {c === ' ' ? ' ' : c}
            </span>
          )
        })}
      </h1>

      {/* The doorway. The graph inside it is the light. */}
      <div className="hero-door" data-door>
        <svg
          className="hero-graph"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="A knowledge graph of linked notes"
        >
          {graph.edges.map((e, i) => (
            <line
              key={i}
              data-edge
              className="hero-edge"
              x1={e.a.x * 100}
              y1={e.a.y * 100}
              x2={e.b.x * 100}
              y2={e.b.y * 100}
            />
          ))}
          {graph.pos.map((p) => (
            <circle key={p.id} data-node className="hero-node" cx={p.x * 100} cy={p.y * 100} r="1.6" />
          ))}
        </svg>
      </div>

      <p className="hero-sub" data-sub>
        {HERO.headline}
      </p>
    </section>
  )
}
