/**
 * Renders every raster icon in public/ from the single source, public/favicon.svg.
 *
 *   node art-src/icons.mjs
 *
 * Run it after editing the mark. The PNGs are committed because Cloudflare
 * Pages serves static files and there is no build step that could produce them
 * — vite copies public/ verbatim.
 *
 * WHY THE FILES EXIST AT ALL, when the tab icon used to be a data: URI: a
 * data: URI is invisible to every crawler that does not run the page. ChatGPT,
 * Discord, iMessage and Slack read the HTML and fetch a URL; some skip the
 * markup entirely and just GET /favicon.ico. There has to be a real file at a
 * real path or the preview has no icon, which is exactly what was happening.
 *
 * sharp comes in transitively (it is what vite's asset pipeline uses on this
 * machine, vips 8.18.3). If a future install drops it: npm i -D sharp.
 *
 * favicon.ico is NOT made here — sharp cannot write ICO. art-src/og-card.py
 * does that one, and the OG card, with Pillow.
 */
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const svg = await readFile(root + 'public/favicon.svg')

/*
 * density scales librsvg's rasterisation, not the output box. At the default 72
 * a 32px viewBox renders 32px and every larger size is an upscale of that — the
 * fingers come out mushy. 72 * (size / 32) renders the vector at native size.
 */
const render = (size, out, source = svg) =>
  sharp(source, { density: (72 * size) / 32 })
    .resize(size, size)
    /*
     * Flattened onto the mark's own ground rather than left transparent. iOS
     * composites apple-touch-icon on white and would give a black hand a white
     * box; Windows tiles do the same. The rounded corner is lost on iOS, which
     * masks its own — that is iOS's call to make, not ours.
     */
    .flatten({ background: '#0b0b0e' })
    .png({ compressionLevel: 9 })
    .toFile(root + 'public/' + out)

await Promise.all([
  /* Tab icon fallback for anything that will not take the SVG. */
  render(32, 'favicon-32.png'),
  /* iOS home screen. 180 is the largest iOS asks for; it downsamples the rest. */
  render(180, 'apple-touch-icon.png'),
  /*
   * The big square. Android install prompts want 512, and link-preview
   * scrapers that show a site icon beside the card pick the largest declared.
   */
  render(512, 'icon-512.png'),
  /* Source for the .ico, which Pillow builds. */
  render(1024, '../art-src/mark-1024.png'),
])

/*
 * The same mark with its ground rect dropped, so the OG card gets the hand and
 * not a tile. The card's ground is #08080a and the tile is #0b0b0e — three
 * points apart, invisible on its own and unmistakable as a pale square once it
 * sits on the card. Alpha, so Pillow composites it onto whatever the card is.
 */
const ground = /\n\s*<rect width="32"[^>]*\/>/
if (!ground.test(svg.toString()))
  throw new Error('favicon.svg: ground rect not found — the alpha cut is stale')

await sharp(Buffer.from(svg.toString().replace(ground, '')), { density: 72 * 32 })
  .resize(1024, 1024)
  .png({ compressionLevel: 9 })
  .toFile(root + 'art-src/mark-alpha-1024.png')

console.log('icons: favicon-32, apple-touch-icon, icon-512 written to public/')
