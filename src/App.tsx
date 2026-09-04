import { useRef, useState } from 'react'
import { BRAND, CLAIMS, FOOTER, HANDS, HERO, LINKS, STATUS, WAITLIST } from './content'
import { DEFAULT_OPTIONS, Hands } from './hands/Hands'
import { usePageMotion } from './motion'

/**
 * The whole page. One file because it is one page — a router and a components/
 * tree would be five files describing a document that never branches.
 *
 * Every string comes from content.ts. If you are reading a sentence here that
 * a visitor can see, it is a bug.
 */

/**
 * A section, tagged for the motion layer rather than wiring its own observer.
 *
 * It used to hold an IntersectionObserver per instance and toggle a
 * `data-shown` attribute that a CSS transition watched. That is replaced by one
 * ScrollTrigger per section in motion.ts, because the CSS transition and GSAP
 * would otherwise animate the same properties against each other - see the
 * header there.
 */
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      data-anim="section"
      className={`mx-auto w-full max-w-3xl px-6 ${className}`}
    >
      {children}
    </section>
  )
}

type FormState = 'idle' | 'sending' | keyof typeof WAITLIST.states
/* The note step's own outcomes. Separate from FormState because by then the
   address is already saved - none of these can mean the signup failed. */
type NoteState = 'idle' | 'sending' | keyof typeof WAITLIST.messageStates

/** Matches MAX_MESSAGE in functions/api/waitlist.ts. */
const MAX_MESSAGE = 2000

/** Same loose shape the endpoint applies; see the note there on why. */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/

/**
 * TWO STEPS, AND THE ORDER IS THE POINT.
 *
 * The address is saved the instant it is submitted, and only then does the
 * message box appear. Nathan asked for it this way round and it is also the
 * safer shape: someone who types their email, sees the box and wanders off is
 * already on the list. Asking for both up front would put an optional textarea
 * between a visitor and the one thing this page actually needs from them.
 *
 * The cost is that the note is a SECOND write, which has to prove it belongs to
 * the row it edits - hence the token the join hands back. See the endpoint.
 */
function Waitlist() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [token, setToken] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [noteState, setNoteState] = useState<NoteState>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    /*
     * Validated here only to spare a round trip on an obvious typo. The Worker
     * validates independently and is the one that decides — a client-side check
     * is a convenience, never a guard, because nothing stops a POST going
     * straight at the endpoint.
     */
    if (!EMAIL_SHAPE.test(email)) {
      setState('invalid')
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 409) {
        setState('duplicate')
        return
      }
      if (!res.ok) {
        setState('error')
        return
      }
      const data = (await res.json()) as { token?: string }
      setState('ok')
      // No token means no way to attach a note. The signup itself still
      // succeeded, so this degrades to a plain confirmation rather than an error.
      setToken(data.token ?? null)
    } catch {
      // A network failure and a server failure read the same to the visitor,
      // and neither is their problem to distinguish.
      setState('error')
    }
  }

  const sendNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || noteState === 'sending' || !note.trim()) return
    setNoteState('sending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, message: note }),
      })
      if (res.ok) {
        setNoteState('sent')
        return
      }
      setNoteState(res.status === 409 ? 'used' : 'error')
    } catch {
      setNoteState('error')
    }
  }

  const joined = state === 'ok'
  const status = state !== 'idle' && state !== 'sending' ? WAITLIST.states[state] : null
  const noteStatus =
    noteState !== 'idle' && noteState !== 'sending' ? WAITLIST.messageStates[noteState] : null

  return (
    <div>
      <h2 className="font-display text-3xl text-sand sm:text-4xl">{WAITLIST.heading}</h2>
      <p className="mt-4 max-w-xl leading-relaxed text-clay">{WAITLIST.body}</p>

      {/* Unmounted once they are on the list, rather than disabled. A dead
          address field sitting above a live message box invites a second go at
          something that already worked. */}
      {!joined && (
        <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row" noValidate>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            disabled={state === 'duplicate'}
            placeholder={WAITLIST.placeholder}
            onChange={(ev) => {
              setEmail(ev.target.value)
              // Clearing the error as they retype is the difference between a
              // form that is talking to you and one that scolded you once.
              if (state !== 'idle' && state !== 'sending') setState('idle')
            }}
            className="w-full rounded-md border border-coffee bg-bistre px-4 py-3 text-sand placeholder:text-taupe disabled:opacity-60 sm:max-w-sm"
          />
          <button
            type="submit"
            disabled={state === 'sending' || state === 'duplicate'}
            className="rounded-md bg-cream px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {state === 'sending' ? '…' : WAITLIST.button}
          </button>
        </form>
      )}

      {/* Announced, because a sighted user sees the message appear and a screen
          reader user would otherwise get nothing at all back from the submit. */}
      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-clay">
        {status}
      </p>

      {/*
        * THE SECOND STEP. Gated on the token, so it appears exactly when it can
        * actually work and never as a box that would fail on submit.
        *
        * `messageNote` is Nathan's promise, and it is a real element rather than
        * placeholder text: a placeholder is wiped by the first keystroke, which
        * would delete the promise at the moment someone acts on it.
        * `aria-describedby` makes it read out on focus instead of being
        * decoration a screen reader skips.
        */}
      {joined && token && noteState !== 'sent' && (
        <form onSubmit={sendNote} className="mt-2 max-w-xl">
          <label htmlFor="founder-message" className="block text-sm text-clay">
            {WAITLIST.messageLabel} <span className="text-taupe">({WAITLIST.messageOptional})</span>
          </label>
          <textarea
            id="founder-message"
            name="message"
            rows={3}
            maxLength={MAX_MESSAGE}
            value={note}
            placeholder={WAITLIST.messagePlaceholder}
            aria-describedby="founder-message-note"
            onChange={(ev) => setNote(ev.target.value)}
            className="mt-2 w-full resize-y rounded-md border border-coffee bg-bistre px-4 py-3 text-sand placeholder:text-taupe"
          />
          <p id="founder-message-note" className="mt-2 text-sm text-taupe">
            {WAITLIST.messageNote}
          </p>
          <button
            type="submit"
            disabled={noteState === 'sending' || !note.trim()}
            className="mt-3 rounded-md border border-coffee px-5 py-2 text-sm font-medium text-sand transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {noteState === 'sending' ? '…' : WAITLIST.messageButton}
          </button>
        </form>
      )}

      <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-clay">
        {noteStatus}
      </p>
    </div>
  )
}

export default function App() {
  /*
   * The motion layer is scoped to this element, so every selector in motion.ts
   * resolves inside the page and cannot reach the hands' own canvases - those
   * run their own loop and must not be touched by a tween.
   */
  const root = useRef<HTMLDivElement>(null)
  usePageMotion(root)

  return (
    <div ref={root}>
      <a
        href="#waitlist"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to the waitlist
      </a>

      {/*
        * THE HANDS ARE NO LONGER IN THE FOLD. Nathan: they follow the reader
        * down instead of sitting in the hero.
        *
        * So they live in a FIXED layer behind the whole document, and scroll
        * progress closes the gap between them (see Hands.tsx). Descending the
        * page is what brings the two hands together, which is the same argument
        * as the order-from-chaos thesis - scrolling resolves things.
        *
        * `-z-10` with an explicit background on the layer rather than on body:
        * a fixed element behind transparent content needs something to paint
        * on, or the hands composite against whatever the browser feels like.
        *
        * aria-hidden because it is decoration. A screen reader announcing two
        * canvases would be noise, and the argument they make is entirely visual.
        */}
      {/*
        * 🔴 THERE IS NO BACKDROP FIELD BEHIND THE HANDS, AND ADDING ONE BACK IS
        * A DECISION, NOT A GAP TO FILL.
        *
        * A dithered wave field lived here and was removed on Nathan's call. It
        * cost two rewrites and a performance regression, and the short version
        * for anyone tempted to reintroduce it:
        *
        *   - As WebGL (a React Bits shader, three.js + R3F + postprocessing) it
        *     rendered one correct frame and then never ticked again, so it was a
        *     still photograph while the hands animated fine beside it. Raising
        *     its waveSpeed did nothing. It also cost 255 kB gzipped.
        *   - As CSS it moved, but the feTurbulence tile behind it measured 33 ms
        *     to rasterise against a 16.67 ms frame budget, and the page took a
        *     CPU from 4% to 96%.
        *
        * If a ground texture is ever wanted here again, the shape of the answer
        * is a PRE-RENDERED image - one decode, nothing to recompute per frame -
        * not a shader and not a runtime filter.
        *
        * The hands keep their own layer. `bg-ink` on it rather than on body: a
        * fixed element behind transparent content needs something to paint on,
        * or the hands composite against whatever the browser feels like.
        */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-ink">
        <Hands options={DEFAULT_OPTIONS} />
      </div>

      {/*
        * THE FOLD, now type only. It sits ON the hands rather than beside them,
        * so the ink is dropped back (see index.css .hands-layer) far enough for
        * body copy to stay readable over it.
        */}
      <section className="flex min-h-[92svh] flex-col justify-center px-6 pt-24 pb-16">
        <div className="relative mx-auto w-full max-w-3xl">
          {/*
            * A plate under the copy, not a scrim over the art.
            *
            * With the hands fixed behind the whole page they land on the sub
            * paragraph, and it measurably stopped being comfortable to read.
            * Dimming the whole layer to fix that would turn the art into faint
            * texture everywhere; this pushes the ground back only where type
            * actually sits, so the hands stay legible in the space around it.
            *
            * Radial rather than a rectangle so it has no edge to notice.
            *
            * Tightened once: the first version was large and opaque enough to
            * blanket the hands' fingertips, which is the only part of them that
            * moves much. The page then looked like a still image while the same
            * component animated fine in the lab.
            */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-6 -inset-y-8 bg-[radial-gradient(62%_58%_at_38%_50%,var(--color-ink)_30%,transparent_100%)]"
          />
          <h1
            data-anim="hero-title"
            className="relative font-display text-4xl leading-[1.05] text-sand sm:text-6xl"
          >
            {HERO.headline}
          </h1>
          <p
            data-anim="hero-sub"
            className="relative mt-6 max-w-xl text-lg leading-relaxed text-clay"
          >
            {HERO.sub}
          </p>
          <div
            data-anim="hero-cta"
            className="relative mt-9 flex flex-wrap items-center gap-4"
          >
            <a
              href="#waitlist"
              className="rounded-md bg-cream px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90"
            >
              {HERO.cta}
            </a>
            <span className="text-sm text-taupe">{HERO.ctaNote}</span>
          </div>
        </div>
      </section>

      <main className="flex flex-col gap-24 py-20 sm:gap-32 sm:py-28">
        {/* THREE CLAIMS */}
        <Section>
          <ul className="grid gap-10 sm:grid-cols-3">
            {CLAIMS.map((c) => (
              <li key={c.title} data-anim-item>
                <h2 className="font-display text-xl text-sand">{c.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-clay">{c.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* HONEST STATUS */}
        <Section>
          <h2 className="font-display text-3xl text-sand sm:text-4xl">{STATUS.heading}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-clay">{STATUS.intro}</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm tracking-[0.15em] text-tan uppercase">Built</h3>
              <ul className="mt-4 space-y-3">
                {STATUS.built.map((s) => (
                  <li key={s} data-anim-item className="text-sm leading-relaxed text-clay">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm tracking-[0.15em] text-tan uppercase">Not built</h3>
              <ul className="mt-4 space-y-3">
                {STATUS.notBuilt.map((s) => (
                  <li key={s} data-anim-item className="text-sm leading-relaxed text-clay">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* WAITLIST */}
        <Section id="waitlist">
          <Waitlist />
          {/*
            * The hands get their one line of explanation here, after the form
            * rather than before it, so it reads as a note the reader arrives at
            * and not a caption on an image they have not finished looking at.
            *
            * Small and muted: it is metadata about the page, not a claim the
            * product is making, and it must not compete with the CTA directly
            * above it. Clay rather than taupe since 2026-09-03 - taupe is
            * #5c5c63 and this sits over moving hands, which was too dim to
            * read; the small size still keeps it under the CTA.
            */}
          <p className="mt-12 max-w-xl text-sm leading-relaxed text-clay">
            {HANDS.note}
          </p>
        </Section>

        {/* FOOTER */}
        <footer className="mx-auto w-full max-w-3xl border-t border-coffee px-6 pt-10">
          <p className="text-sm text-taupe">{FOOTER.madeBy}</p>
          <p className="mt-2 text-sm">
            <a href={LINKS.repo} className="text-clay underline underline-offset-4 hover:text-sand">
              {LINKS.repoLabel}
            </a>
          </p>
          <p className="mt-6 text-xs text-taupe">
            © {FOOTER.year} {BRAND.studio}
          </p>
        </footer>
      </main>
    </div>
  )
}
