import { useEffect, useRef, useState } from 'react'
import { BRAND, CLAIMS, FOOTER, LINKS, STATUS, WAITLIST } from './content'
import { Hero } from './components/Hero'

/**
 * The whole page. One file because it is one page — a router and a components/
 * tree would be five files describing a document that never branches.
 *
 * Every string comes from content.ts. If you are reading a sentence here that
 * a visitor can see, it is a bug.
 */

/**
 * Reveals a section once, the first time it is scrolled near.
 *
 * `once` is the point: re-hiding a section when it leaves the viewport means
 * scrolling up shows the page dismantling itself, and the observer keeps firing
 * for the life of the page. Disconnecting after the first intersection is both
 * the nicer behaviour and the cheaper one.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // No IntersectionObserver (or reduced motion, where the CSS shows
    // everything anyway) must never leave the page invisible. Show, then stop.
    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-shown', '')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-shown', '')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} id={id} data-reveal className={`mx-auto w-full max-w-3xl px-6 ${className}`}>
      {children}
    </section>
  )
}

type FormState = 'idle' | 'sending' | keyof typeof WAITLIST.states

function Waitlist() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    /*
     * Validated here only to spare a round trip on an obvious typo. The Worker
     * validates independently and is the one that decides — a client-side check
     * is a convenience, never a guard, because nothing stops a POST going
     * straight at the endpoint.
     */
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
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
      setState('ok')
      setEmail('')
    } catch {
      // A network failure and a server failure read the same to the visitor,
      // and neither is their problem to distinguish.
      setState('error')
    }
  }

  const done = state === 'ok' || state === 'duplicate'
  const message = state !== 'idle' && state !== 'sending' ? WAITLIST.states[state] : null

  return (
    <div>
      <h2 className="font-display text-3xl text-sand sm:text-4xl">{WAITLIST.heading}</h2>
      <p className="mt-4 max-w-xl leading-relaxed text-clay">{WAITLIST.body}</p>

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
          disabled={done}
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
          disabled={state === 'sending' || done}
          className="rounded-md bg-cream px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === 'sending' ? '…' : WAITLIST.button}
        </button>
      </form>

      {/* Announced, because a sighted user sees the message appear and a screen
          reader user would otherwise get nothing at all back from the submit. */}
      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-clay">
        {message}
      </p>
    </div>
  )
}

export default function App() {
  return (
    <>
      <a
        href="#waitlist"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded focus:bg-cream focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to the waitlist
      </a>

      <Hero />

      <main className="flex flex-col gap-24 py-20 sm:gap-32 sm:py-28">
        {/* THREE CLAIMS */}
        <Section>
          <ul className="grid gap-10 sm:grid-cols-3">
            {CLAIMS.map((c) => (
              <li key={c.title}>
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
                  <li key={s} className="text-sm leading-relaxed text-clay">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm tracking-[0.15em] text-tan uppercase">Not built</h3>
              <ul className="mt-4 space-y-3">
                {STATUS.notBuilt.map((s) => (
                  <li key={s} className="text-sm leading-relaxed text-clay">
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
    </>
  )
}
