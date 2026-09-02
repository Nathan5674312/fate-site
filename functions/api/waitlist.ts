/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/waitlist — the only server this site has.
 *
 * A Pages Function rather than a separate Worker: it is served from the same
 * origin as the page, so the form posts to a relative path and there is no CORS
 * surface, no second deploy and no second domain to keep alive.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: send mail, set a cookie, log an IP, or
 * return anything about who else is on the list. The page promises "no sharing
 * the address with anyone", and the cheapest way to keep that promise is to
 * build nothing that could break it.
 */

interface Env {
  DB: D1Database
}

/**
 * The same shape the form checks, applied again here because the form's check
 * is a convenience and this one is the guard — nothing stops a POST arriving
 * straight at this path.
 *
 * Deliberately loose. Email validation by regex is famously unable to decide
 * what is deliverable; this rejects the obvious garbage and leaves the rest to
 * the fact that an undeliverable address simply never gets read.
 */
const LOOKS_LIKE_EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/

/** Longer than any real address; a bound so a huge body cannot reach the DB. */
const MAX_EMAIL = 254

/**
 * The optional note to the founder.
 *
 * 2000 is generous for the thing it is for — a few paragraphs about what
 * someone is building — and the form sets the same number as `maxLength`, so
 * a person using the page cannot reach this limit. It exists for a POST sent
 * straight at this path, which is also why exceeding it is a flat rejection
 * rather than a silent truncation: storing a half-sentence someone wrote and
 * telling them it was accepted is worse than refusing it.
 */
const MAX_MESSAGE = 2000

/**
 * ONE handler with an explicit method check, rather than exporting
 * `onRequestPost` alone.
 *
 * Exporting only the POST handler meant every other method fell through to the
 * static asset router, so `GET /api/waitlist` returned the site's index.html
 * with a 200 — an API path serving a web page. Nothing leaked, but any client
 * expecting JSON would have parsed a chunk of HTML instead of being told
 * plainly that the method is wrong.
 *
 * A single `onRequest` avoids the other trap too: exporting `onRequest`
 * ALONGSIDE `onRequestPost` makes precedence between them a thing you have to
 * remember rather than read.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return json({ error: 'method' }, 405, { allow: 'POST' })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid' }, 400)
  }

  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}

  const raw = fields.email
  if (typeof raw !== 'string') return json({ error: 'invalid' }, 400)

  // Lowercased and trimmed BEFORE the uniqueness check, or the same person
  // takes two seats by capitalising differently.
  const email = raw.trim().toLowerCase()
  if (email.length > MAX_EMAIL || !LOOKS_LIKE_EMAIL.test(email)) {
    return json({ error: 'invalid' }, 400)
  }

  /*
   * The message is OPTIONAL, so absent and empty are both fine and both become
   * NULL. Only a wrong TYPE or an over-long one is a rejection — someone who
   * left the box alone must never be told they got something wrong.
   */
  const rawMessage = fields.message
  if (rawMessage !== undefined && rawMessage !== null && typeof rawMessage !== 'string') {
    return json({ error: 'invalid' }, 400)
  }
  const trimmed = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  if (trimmed.length > MAX_MESSAGE) return json({ error: 'invalid' }, 400)
  const message = trimmed === '' ? null : trimmed

  const ref = new URL(request.url).searchParams.get('ref')

  try {
    /*
     * INSERT, not "SELECT then INSERT". Two signups arriving together would
     * both pass a prior read and the second would fail anyway — so let the
     * primary key be the thing that decides, and read the failure.
     */
    await env.DB.prepare(
      'INSERT INTO waitlist (email, created_at, ref, message) VALUES (?, ?, ?, ?)',
    )
      .bind(email, new Date().toISOString(), ref, message)
      .run()
  } catch (e) {
    /*
     * A repeat signup is a SUCCESS from the visitor's side — they are on the
     * list — so it must never read as an error. 409 is the page's cue to say
     * "already on the list" rather than "something went wrong".
     */
    if (String(e).includes('UNIQUE')) return json({ ok: true, duplicate: true }, 409)
    // Anything else is genuinely ours. Do not echo the error to the client.
    console.error('waitlist insert failed', e)
    return json({ error: 'server' }, 500)
  }

  return json({ ok: true }, 201)
}

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  })
}
