/**
 * Puts the page's text into dist/index.html at build time.
 *
 * WHY THIS EXISTS: the built HTML was `<div id="root"></div>` and nothing else.
 * Google renders JS so it indexed eventually, but nothing else does — GPTBot,
 * ClaudeBot, PerplexityBot, Bing and every link scraper read markup and stop.
 * Measured 2026-09-09 with a real GPTBot user-agent against the live site:
 * 200, 6800 bytes, empty div. Not blocked, robots.txt allows everyone; there
 * was simply nothing in the response to read. For a product whose audience
 * finds tools by asking an AI, that is the whole page invisible to the exact
 * channel it needs.
 *
 * WHY vite.ssrLoadModule AND NOT A SECOND BUILD: vite is already a dependency
 * and can load TSX for Node itself, so this is one file instead of an
 * entry-server, an --ssr build and an output directory to clean up.
 *
 * WHY createRoot IN main.tsx IS LEFT ALONE: React 19's createRoot clears the
 * container before mounting, so the prerendered markup is discarded by the
 * browser and there is no hydration to mismatch. The cost is one extra render
 * on first paint, which is invisible; the benefit is that the motion layer,
 * the canvas and the form keep running exactly as they do today. Switching to
 * hydrateRoot would buy a marginally faster first paint and cost a class of
 * mismatch bug that this page has no reason to take on.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  const { BRAND, CLAIMS, DOWNLOAD, FAQ, HERO, LINKS, PROOF, STATUS } =
    await vite.ssrLoadModule('/src/content.ts')

  const html = renderToString(createElement(App))

  /*
   * STRUCTURED DATA, BUILT FROM content.ts RATHER THAN WRITTEN INTO index.html.
   *
   * Two blocks. SoftwareApplication is the type Google gives a downloadable app
   * - free, Windows, developer tool are all fields it understands, and all three
   * are true today. FAQPage is the one an assistant lifts from, because each
   * answer is a self-contained span with the question already attached.
   *
   * 🔴 GENERATED, NEVER HAND-WRITTEN. Structured data is invisible on the page,
   * so a second copy of an answer here is the copy nobody proofreads and the
   * first one to go stale. Every string below comes from content.ts, which is
   * the same file the visible page renders from, so the two cannot disagree.
   *
   * NOT LocalBusiness, and that is worth saying because the obvious checklist
   * for "add schema to a website" says to use it. This is a downloadable tool
   * with no premises, no hours and no service area. Declaring a storefront that
   * does not exist is a lie a machine reads.
   */
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: BRAND.name,
      description: HERO.headline,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Windows',
      url: 'https://www.divineconstruc.com/',
      downloadUrl: DOWNLOAD.url,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: BRAND.studio },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]

  /* `<` escaped so a stray closing tag inside a string cannot end the script
     early. The other two are belt and braces for the same class of break. */
  const json = JSON.stringify(schema)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/&/g, '\u0026')

  const file = 'dist/index.html'
  const src = readFileSync(file, 'utf8')
  if (!src.includes('<div id="root"></div>')) throw new Error('root div not found in ' + file)

  const out = src
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    .replace('</head>', `  <script type="application/ld+json">${json}</script>
  </head>`)

  /*
   * /llms.txt — the whole page as plain markdown, for a model reading rather
   * than a browser rendering.
   *
   * WHY, GIVEN THE PAGE IS NOW PRERENDERED: prerendering fixes the crawler that
   * fetches HTML and gives up on JS. This is for the one that would rather not
   * parse HTML at all, and it costs one generated file. The convention is
   * llmstxt.org: an H1, a blockquote summary, then sections.
   *
   * GENERATED FROM content.ts, for the same reason the JSON-LD is. A hand-kept
   * summary of a page is a second copy of every claim on it, and this one is
   * invisible to anyone who does not go looking, so it would rot first and
   * loudest — a model quoting a stale "no installer yet" back at a reader is
   * exactly the failure the honesty rule exists to prevent.
   */
  const llms = [
    `# ${BRAND.name}`,
    '',
    `> ${HERO.headline} ${HERO.sub}`,
    '',
    `${BRAND.name} is made by ${BRAND.studio}. Free, no account, Windows only.`,
    '',
    '## What it is',
    '',
    ...CLAIMS.map((c) => `- **${c.title}** — ${c.body}`),
    '',
    '## Get it',
    '',
    DOWNLOAD.body,
    '',
    `Download: ${DOWNLOAD.url}`,
    '',
    ...DOWNLOAD.notes.map((n) => `- ${n}`),
    '',
    `## ${STATUS.heading}`,
    '',
    STATUS.intro,
    '',
    '### Built',
    '',
    ...STATUS.built.map((s) => `- ${s}`),
    '',
    '### Not built',
    '',
    ...STATUS.notBuilt.map((s) => `- ${s}`),
    '',
    /* The URL is inline on each line rather than a footnote, because a model
       lifting one bullet out of this file has to carry the thing that makes
       the bullet checkable with it. See PROOF's header in content.ts. */
    `## ${PROOF.heading}`,
    '',
    PROOF.intro,
    '',
    ...PROOF.items.map((p) => `- **${p.title}** — ${p.body} (${p.href})`),
    '',
    PROOF.limit,
    '',
    `## ${FAQ.heading}`,
    '',
    ...FAQ.items.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
    '## Links',
    '',
    `- Vault template (the product): ${LINKS.repo}`,
    `- Releases: ${DOWNLOAD.url}`,
    '- Privacy: https://www.divineconstruc.com/privacy',
    '',
  ].join('\n')

  writeFileSync('dist/llms.txt', llms)

  writeFileSync(file, out)
  console.log(
    `prerendered ${html.length} chars of markup and ${FAQ.items.length} FAQ entries into ${file},` +
      ` plus ${llms.length} chars of dist/llms.txt`,
  )
} finally {
  await vite.close()
}
