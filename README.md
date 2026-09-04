# fate-site

The waitlist page for **Fate**, at `divineconstruc.com`. One static page plus one
endpoint. Vite + React + TypeScript + Tailwind v4, deployed to Cloudflare Pages.

Built to the same house rules as the Salon Forma site: single page, no router,
no UI library, every user-visible string in one file, motion via
IntersectionObserver and CSS only.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then dist/
npm run typecheck
```

## Where to edit things

**`src/content.ts` holds every word on the page.** Change the pitch, the claims
or the status list there and never open a component. If you find user-visible
text inside `src/App.tsx`, that is a bug.

The two blocks that go stale fastest:

- `STATUS.built` / `STATUS.notBuilt` — the honesty block. Keep it pessimistic.
  It is the most valuable thing on the page for this audience and the fastest
  way to lose them if it overstates.
- `HERO.ctaNote` — currently "No installer yet." Change it the day that stops
  being true.

Colours in `src/index.css` are lifted from the app's own `tokens.css`, with the
contrast ratios it recorded. Taupe is decoration only — never body text.

## The waitlist

`functions/api/waitlist.ts` is a Cloudflare Pages Function. It writes to a D1
database and does nothing else: no mail, no cookie, no IP logging, because the
page promises the address is not shared and the cheapest way to keep that is to
build nothing that could break it.

A repeat signup returns **409**, which the page reads as "already on the list"
rather than an error. Uniqueness is enforced by the primary key, not by a
read-then-write that two simultaneous signups would both pass.

### One-time setup

```bash
npx wrangler login
npx wrangler d1 create fate-waitlist          # copy the database_id it prints
# paste that id into wrangler.toml, replacing REPLACE_AFTER_d1_create
npx wrangler d1 execute fate-waitlist --remote --file=./schema.sql
```

### Reading the list

```bash
npx wrangler d1 execute fate-waitlist --remote \
  --command "SELECT email, created_at FROM waitlist ORDER BY created_at"
```

### Testing it locally

`npm run dev` serves the page but **not** the function — Vite does not run
Pages Functions. To exercise the form end to end:

```bash
npm run build
npx wrangler pages dev dist --d1 DB=fate-waitlist
```

## Deploying

Connect the repo in the Cloudflare dashboard (Pages → Create → Connect to Git):

- Build command: `npm run build`
- Output directory: `dist`
- Bind D1 under Settings → Functions → D1 bindings: variable `DB` →
  `fate-waitlist`. **The binding is per-environment** — set it for Production
  *and* Preview, or previews 500 on submit.

## DNS

The domain is served through Cloudflare Pages as a custom domain. `www` is
canonical; the apex redirects to it.

The migration runbook — the current zone's records, the mail provider, and the
order to move them in — is **kept out of this repo on purpose**. Publishing a
live domain's mail topology alongside the account that administers it is a
gift to whoever wants to spoof it. It lives in the private notes instead.

## Deliberately not here

No cookie banner, no analytics, no popup, no newsletter modal, no carousel, no
stock photography, no AI-generated hero image. The roadmap note lists all seven
as things this audience detects and punishes.

There is no screenshot or demo video yet. `12 - Website and Domain` calls the
20-second silent screen recording "the single highest-converting element on any
dev-tool page, and the most commonly skipped" — it is still skipped. That is
the highest-value thing to add next.
