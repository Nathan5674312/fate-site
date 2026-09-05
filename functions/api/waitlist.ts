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
 * The coming paid features someone can tick, and the ONLY values that reach the
 * database.
 *
 * A fixed set rather than storing whatever arrives: this column is read by a
 * human deciding what to build next, so an open text field would let anyone
 * posting straight at this path write arbitrary strings into the answer. It
 * also keeps the column groupable - `WHERE wants LIKE '%sync%'` means something
 * only while the vocabulary is closed.
 *
 * Must stay in step with WAITLIST.features in src/content.ts, which is where
 * the checkboxes come from. A key added there and not here is silently dropped
 * as unknown; a key here and not there is simply never sent.
 */
const FEATURE_KEYS = ['sync', 'sharing', 'multiplayer'] as const

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

  /*
   * TWO SHAPES, ONE ENDPOINT. `{ email }` joins the list; `{ token, message }`
   * attaches the optional note afterwards.
   *
   * The note is a SECOND request because the address is saved the moment it is
   * submitted — someone who types their email and then wanders off is still on
   * the list, which is the entire reason the message box only appears after
   * that first step.
   *
   * Which makes authorisation necessary rather than decorative: without the
   * token, `{ email, message }` from anyone who knows an address would attach a
   * note under that person's name, and Nathan would read it as theirs.
   */
  if (fields.token !== undefined) return attachMessage(fields, env)

  const raw = fields.email
  if (typeof raw !== 'string') return json({ error: 'invalid' }, 400)

  // Lowercased and trimmed BEFORE the uniqueness check, or the same person
  // takes two seats by capitalising differently.
  const email = raw.trim().toLowerCase()
  if (email.length > MAX_EMAIL || !LOOKS_LIKE_EMAIL.test(email)) {
    return json({ error: 'invalid' }, 400)
  }

  const ref = new URL(request.url).searchParams.get('ref')

  /*
   * Which coming features they ticked. Optional in every direction: absent,
   * empty, or not an array all mean "ticked nothing", which is a normal signup
   * and not a 400 - the address is what this list needs and the ticks are the
   * signal on top of it. Unknown keys are DROPPED rather than rejected, so a
   * stale cached page whose checkbox names moved on still signs its visitor up.
   */
  const wants = readWants(fields.wants)

  /*
   * Unguessable, and stored rather than signed. A random 128-bit value compared
   * against the column needs no secret to be provisioned, no HMAC, and no key
   * rotation story — three things that can be misconfigured — and it is exactly
   * as hard to forge.
   */
  const token = crypto.randomUUID()

  try {
    /*
     * INSERT, not "SELECT then INSERT". Two signups arriving together would
     * both pass a prior read and the second would fail anyway — so let the
     * primary key be the thing that decides, and read the failure.
     */
    await env.DB.prepare(
      'INSERT INTO waitlist (email, created_at, ref, token, wants) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(email, new Date().toISOString(), ref, token, wants)
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

  // The token goes back to this visitor and nowhere else. It is the only thing
  // that will let them attach a message to this row.
  return json({ ok: true, token }, 201)
}

/**
 * The second step: attach the optional note to a row already on the list.
 *
 * FIRST WRITE WINS — the UPDATE carries `AND message IS NULL`. Re-sending is
 * therefore not an edit, and a token that leaks later cannot be used to rewrite
 * what someone already said.
 *
 * A miss is reported as 'used' rather than distinguishing "no such token" from
 * "already has a message", because telling an unknown caller which of those it
 * hit turns this into an oracle for valid tokens.
 */
async function attachMessage(fields: Record<string, unknown>, env: Env): Promise<Response> {
  const token = fields.token
  if (typeof token !== 'string' || token.length !== 36) return json({ error: 'invalid' }, 400)

  const raw = fields.message
  if (typeof raw !== 'string') return json({ error: 'invalid' }, 400)
  const message = raw.trim()
  // Nothing to attach is not an error; the visitor simply chose not to write.
  if (message === '') return json({ ok: true, empty: true }, 200)
  if (message.length > MAX_MESSAGE) return json({ error: 'long' }, 400)

  try {
    const res = await env.DB.prepare(
      'UPDATE waitlist SET message = ? WHERE token = ? AND message IS NULL',
    )
      .bind(message, token)
      .run()
    if (!res.meta.changes) return json({ error: 'used' }, 409)
  } catch (e) {
    console.error('waitlist message failed', e)
    return json({ error: 'server' }, 500)
  }

  return json({ ok: true }, 200)
}

/**
 * The ticked features, as a comma-separated string, or null for none.
 *
 * Filtered against FEATURE_KEYS and de-duplicated, so the column can only ever
 * hold a known vocabulary and cannot hold `sync,sync`. Null rather than '' when
 * empty, matching how `message` is stored - "ticked something" is then
 * `wants IS NOT NULL` and does not also have to test for the empty string.
 */
export function readWants(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null
  const picked = FEATURE_KEYS.filter((k) => raw.includes(k))
  return picked.length ? picked.join(',') : null
}

function json(data: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  })
}
