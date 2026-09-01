/// <reference types="@cloudflare/workers-types" />

/**
 * Host canonicalisation — the site answers on divineconstruc.com and nowhere else.
 *
 * A Pages project always keeps its `*.pages.dev` hostname; there is no setting
 * that deletes it, and deleting the project to be rid of it would take the real
 * site down with it. So the subdomain stays reachable and this sends every
 * request that arrives on it to the canonical host instead. Same for the
 * per-deployment `<hash>.fate-site.pages.dev` URLs, which are otherwise
 * permanent, indexable copies of the site.
 *
 * Root `functions/_middleware.ts` runs ahead of static assets AND ahead of
 * `api/waitlist.ts`, so this covers the whole origin rather than just the API.
 *
 * 301 rather than 302: this is permanent, and it is the instruction to search
 * engines that `<link rel=canonical>` in index.html already states.
 *
 * ⚠️ ORDERING: this makes pages.dev useless on its own. Do not deploy it until
 * divineconstruc.com actually serves the site, or there is no working URL at all.
 */
const CANONICAL_HOST = 'divineconstruc.com'

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url)

  // Only pages.dev is redirected. Anything else — the canonical host, the www
  // form that Cloudflare redirects itself, and `localhost` during `wrangler
  // pages dev` — passes straight through untouched.
  if (!url.hostname.endsWith('.pages.dev')) return next()

  url.hostname = CANONICAL_HOST
  url.protocol = 'https:'
  url.port = ''
  return Response.redirect(url.toString(), 301)
}
