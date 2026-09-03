/**
 * THE PAGE'S MOTION LAYER. One hook, one clock, one place to change the feel.
 *
 * Everything here animates `transform` and `opacity` and nothing else. That is
 * not stylistic restraint, it is the lesson from the backdrop field that took a
 * CPU from 4% to 96%: those two properties are the only ones the compositor can
 * satisfy without re-rasterising, and every other property animates on the main
 * thread. No filters, no blur, no mask animation, no `mix-blend-mode`.
 *
 * 🔴 THERE IS NO CSS TRANSITION ON ANYTHING THIS FILE TOUCHES, and there must
 * never be. GSAP writes a value every tick; a CSS transition on the same
 * property immediately starts interpolating away from it. Both fight, both
 * lose, and the result is a soft laggy mess that looks like a slow machine
 * rather than a bug. The `[data-reveal]` transition that used to live in
 * index.css was removed for exactly this reason.
 */

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/*
 * Module scope, once. Registering inside a component re-registers on every
 * render, and `useGSAP` itself is a plugin - it has to be registered for the
 * hook's context to be wired up.
 *
 * All three are free. GSAP has been fully free since Webflow bought GreenSock,
 * SplitText included; there is no token, no .npmrc, no Club membership. Plain
 * `npm install gsap`.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

/** Where a section starts revealing: its top at 82% down the viewport. */
const REVEAL_START = 'top 82%'

/**
 * Wires the whole page's motion, scoped to `scope`.
 *
 * 🔴 EVERY ANIMATION LIVES INSIDE gsap.matchMedia() AND THAT IS THE ACCESSIBILITY
 * MECHANISM, not a nicety layered on top.
 *
 * The naive version is `if (prefersReducedMotion) return`, which runs ONCE. Flip
 * the OS setting mid-session and the page is stuck in whatever state it was
 * built in - and because these reveals start elements hidden, "stuck" can mean
 * invisible content with no way back short of a reload. matchMedia registers the
 * branch against a query and REVERTS it automatically when the query stops
 * matching, so turning reduced motion on restores every element to its natural
 * state by itself.
 *
 * It also means the reduced-motion path needs no code at all: nothing is ever
 * hidden, because the branch that hides things never runs. Content is simply
 * there. That is the correct reading of the preference - state without
 * transition, not a faster animation.
 *
 * The same property makes this safe without JavaScript. Nothing is hidden in
 * CSS; the hidden state is created by GSAP itself, in a layout effect before the
 * browser paints. If the bundle fails to load, the page renders as plain visible
 * HTML rather than a blank screen, which is the failure mode a CSS-hidden
 * approach gets wrong.
 */
export function usePageMotion(scope: React.RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      /*
       * TWO CONDITIONS, ONE BRANCH. Nathan, 2026-09-03: the reveals have to run
       * on every device, reduced motion included.
       *
       * This used to be a single `no-preference` branch, which meant a visitor
       * with the OS setting on got no hero reveal and no section reveals at all
       * - the page simply existed. That is a defensible reading of the
       * preference and it is not the one being asked for, so `calm` now gets the
       * same reveals with the TRAVEL taken out: opacity only, no y, shorter.
       * Fading in place is not what the setting is protecting anyone from;
       * 26px of slide and a 108% line rise are.
       *
       * Still matchMedia and not an `if`, for the reason below: these reveals
       * begin by HIDING things, so the branch that hides has to be the branch
       * that reverts when the query stops matching.
       */
      mm.add(
        {
          full: '(prefers-reduced-motion: no-preference)',
          calm: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
        const calm = !!ctx.conditions?.calm
        const q = gsap.utils.selector(scope)

        /*
         * THE HERO, on load rather than on scroll - it is already in view, and a
         * scroll trigger on something visible at rest either fires instantly or
         * never fires at all depending on where the browser restores the scroll
         * position.
         */
        const title = q('[data-anim="hero-title"]')[0]
        if (title && calm) {
          // No line split under reduced motion: the mask rise IS the travel.
          gsap.from(title, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' })
        } else if (title) {
          /*
           * `autoSplit` re-splits when the webfont finishes loading and on
           * resize. Without it the lines are measured against the fallback
           * font, so the split lands mid-word once the display serif arrives
           * and the mask clips the heading in the wrong places. `onSplit`
           * returning the tween lets GSAP tear the old one down on each
           * re-split instead of stacking them.
           *
           * `mask: 'lines'` wraps each line in its own overflow-hidden box, so
           * the line rises out of nothing instead of fading through the copy
           * above it.
           */
          /*
           * Guarded, because a throw here used to take the SECTIONS with it.
           * Everything below runs in the same callback, so a SplitText that
           * fails on some browser - it measures line boxes, which is the most
           * device-dependent thing on the page - meant no section reveals at
           * all on that browser. The catch keeps the failure local: the
           * headline just fades instead.
           */
          try {
            SplitText.create(title, {
              type: 'lines',
              mask: 'lines',
              autoSplit: true,
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 108,
                  duration: 1.1,
                  ease: 'power4.out',
                  // `amount`, not `each`: the total spread stays 0.28s whether the
                  // headline wraps to two lines or four, so the entrance does not get
                  // slower just because the copy got longer. DESIGN.md section 6.
                  stagger: { amount: 0.28 },
                }),
            })
          } catch {
            gsap.from(title, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' })
          }
        }

        const rest = q('[data-anim="hero-sub"], [data-anim="hero-cta"]')
        if (rest.length) {
          gsap.from(rest, {
            y: calm ? 0 : 18,
            autoAlpha: 0,
            duration: calm ? 0.6 : 0.9,
            ease: 'power3.out',
            stagger: { amount: 0.12 },
            // Behind the heading rather than with it: the headline is the
            // subject, and everything arriving at once flattens the hierarchy.
            delay: calm ? 0.15 : 0.35,
          })
        }

        /*
         * THE SECTIONS. One trigger per section, staggering that section's own
         * items — not one trigger per item. Fifty hand-written triggers is how
         * a page ends up with fifty slightly different reveals.
         *
         * `once: true` matters for more than taste. A trigger that keeps
         * toggling re-hides content when you scroll back up, which reads as the
         * page dismantling itself, and it keeps recalculating for the life of
         * the page.
         */
        for (const section of q('[data-anim="section"]')) {
          const items = section.querySelectorAll('[data-anim-item]')
          const targets = items.length ? items : [section]
          gsap.from(targets, {
            y: calm ? 0 : 26,
            autoAlpha: 0,
            duration: calm ? 0.6 : 0.85,
            ease: 'power3.out',
            stagger: items.length > 1 ? { amount: 0.35 } : 0,
            scrollTrigger: { trigger: section, start: REVEAL_START, once: true },
          })
        }
        },
      )

      /*
       * Triggers are calibrated against the document height at the moment they
       * are created. The display serif is a webfont, so every heading changes
       * height when it lands, and every start position below it is then wrong
       * by that much. Refreshing once the fonts settle is the fix.
       */
      document.fonts?.ready.then(() => ScrollTrigger.refresh())

      /*
       * 🔴 THE FAILSAFE, AND IT IS LOAD-BEARING NOW THAT REDUCED MOTION ALSO
       * HIDES THINGS.
       *
       * The old arrangement had one accidental safety property: the branch that
       * hid content never ran for reduced-motion users, so no measurement bug
       * could ever leave THEM staring at an invisible page. Running the reveals
       * for everyone gives that up, and the whole point of this change is a page
       * that works on every device no matter what - so the protection has to be
       * put back deliberately instead of relying on a branch not executing.
       *
       * What can strand a reveal is always the same shape: a trigger measured
       * against a layout that then changed under it. A late webfont, an address
       * bar collapsing on a phone, a section that was below the fold at
       * calibration and is not any more.
       *
       * So: one refresh a few seconds in, then anything still invisible WHILE
       * ON SCREEN is shown. On screen is the necessary half of that test - a
       * blanket reveal would fire every section at once and delete the effect
       * for everyone. This only ever rescues something the visitor is actually
       * looking at and cannot see.
       */
      const rescue = window.setTimeout(() => {
        ScrollTrigger.refresh()
        const root = scope.current
        if (!root) return
        for (const el of root.querySelectorAll<HTMLElement>('[data-anim], [data-anim-item]')) {
          const r = el.getBoundingClientRect()
          const onScreen = r.top < window.innerHeight && r.bottom > 0
          if (onScreen && getComputedStyle(el).visibility === 'hidden') {
            gsap.set(el, { autoAlpha: 1, y: 0 })
          }
        }
      }, 4000)

      // Reverts every branch, and with it every element this hook hid.
      return () => {
        window.clearTimeout(rescue)
        mm.revert()
      }
    },
    { scope },
  )
}
