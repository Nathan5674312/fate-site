# Deploying

Cloudflare Pages, one Pages Function, and a D1 database. Everything here is
safe to read publicly; the DNS and mail migration runbook is deliberately not
in this repo (see the DNS note in `README.md`).

---

## 1. Log in

```bash
npx wrangler login      # opens a browser, once per machine
npx wrangler whoami     # verify
```

## 2. Create the waitlist database

```bash
npm run db:create
```

It prints a `database_id`. Paste it into `wrangler.toml` in place of
`REPLACE_AFTER_d1_create`. That value is an account-scoped identifier, not a
secret, and it is useless without credentials — so it belongs in the repo.

Then create the table:

```bash
npm run db:init
```

`npm run db:list` prints the most recent 50 signups.

## 3. Deploy

```bash
npm run deploy           # builds and pushes to the `fate-site` Pages project
npm run deploy:preview   # same, on a preview branch with its own URL
```

The first run creates the project. It prints a `*.pages.dev` URL — open it and
check the site before pointing a domain at it.

## 4. Bind the database to the deployed site

`wrangler.toml` covers local dev only. For the deployed project, confirm in the
dashboard: **Settings → Functions → D1 bindings**, variable `DB` bound to
`fate-waitlist`, **on Production and on Preview**.

Miss this and the page loads fine while the form returns 500 on submit — the
failure is invisible until someone actually tries to sign up. Test it.

## 5. Check it works

```bash
curl -X POST https://<your-domain>/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com"}'
```

Expect `{"ok":true}` the first time and HTTP 409 the second. Confirm the row
with `npm run db:list`, then delete the test row.

---

## Gotchas worth knowing

**Pages serves `index.html` with a 200 for any unmatched path.** A mistyped or
undeployed asset URL therefore looks fine to a status-code check. Verify assets
by content type instead:

```bash
curl -sI https://<your-domain>/<file> | grep -i content-type
```

`text/html` coming back for an image or a text file means the file is not
deployed.

**Set the Pages production branch to match the branch you deploy.** If they
disagree, every deploy lands as a preview and the production URL quietly keeps
serving a stale build.

## Not ready yet

- The three product surfaces (graph, table, canvas board) are unbuilt; the page
  makes the argument in prose only.
- App Store / Play buttons stay off until the listings are real.
