/**
 * EVERY STRING ON THE SITE. Nothing user-visible lives in a component.
 *
 * The Salon Forma brief's rule, applied here: someone must be able to change
 * the pitch, the status or the counts without opening a .tsx file. It is also
 * the only way the honesty rule below stays enforceable — you can read this one
 * file and check every claim, which you cannot do when copy is scattered.
 *
 * THE HONESTY RULE, from `12 - Website and Domain`: no placeholder copy, no
 * claim that is not true today, and where something is not built the page says
 * so. `STATUS` below exists for exactly that. This audience punishes the
 * alternative, and the product's whole argument is that it does not lie to you
 * about where your data is.
 *
 * WHAT FATE IS, per DECISION 1 in `08 - Product Definition and Decisions`
 * (locked 2026-08-17, and it supersedes the older notes): the primary user is
 * an AI AGENT and the human is secondary. The product is the files, the folder
 * conventions and the discoverability layer. The Electron app is a viewer, not
 * the product. Any copy that sells this as "a Notion competitor with a GUI" is
 * describing the thing it was before that decision.
 */

export const BRAND = {
  /** The project. */
  name: 'Fate',
  /** The umbrella Nathan ships everything under, per his own description. */
  /* No T. It matches the domain, and it is how Nathan writes it. */
  studio: 'Divine Construc',
  domain: 'divineconstruc.com',
} as const

export const HERO = {
  /*
   * One sentence, no metaphor. "Second brain" is banned by the roadmap note and
   * would be wrong anyway now that the reader is expected to be pointing an
   * agent at this rather than filing notes in it.
   */
  headline: 'A workspace your coding agent already knows how to use.',
  sub:
    'Point Claude, Codex or Gemini at the folder. It works out what this is and how to ' +
    'use it on its own — no plugin, no API key, no configuration.',
  cta: 'Join the waitlist',
  /* Honest, and load-bearing: it sets the expectation the waitlist implies. */
  ctaNote: 'No installer yet. One email when there is one.',
} as const

/**
 * The three claims. Each is checkable by the reader today, which is the bar the
 * roadmap note set ("three claims, each provable").
 */
export const CLAIMS = [
  {
    title: 'Plain markdown on disk',
    body:
      'Every note is a .md file in a folder you chose. No database, no proprietary format, ' +
      'nothing to export. Open the same folder in Obsidian and it works.',
  },
  {
    title: 'Works while it is closed',
    body:
      'The product is the folder and its conventions, not a running process. An agent uses ' +
      'the vault whether or not the app is open — the app is how you watch, not how it works.',
  },
  {
    title: 'Bring your own agent',
    body:
      'Fate ships no model, handles no credential and proxies no request. You already have ' +
      'Claude Code, Codex or Gemini authenticated; this is an addition to it.',
  },
] as const

/**
 * WHAT IS AND IS NOT BUILT. Straight from the roadmap's own status field, and
 * the single most important block on the page for this audience.
 *
 * Keep this pessimistic. A reader who finds one overstatement stops believing
 * the other two claims, and the roadmap is public enough to check.
 */
export const STATUS = {
  heading: 'Where it actually is',
  intro:
    'Fate is being built in the open and is not finished. This is what is true today, ' +
    'so the waitlist is not a surprise later.',
  built: [
    'Markdown vault: read, edit, save, with backups and a lost-update guard',
    'Canvas boards that double as runnable agent pipelines',
    'A graph over real wikilinks, and a database view over frontmatter',
    'Daily notes and a calendar planner over the whole vault',
  ],
  notBuilt: [
    'No installer yet — you cannot download and run it today',
    'No sync, no collaboration, no mobile app',
    'Windows is the only desktop that has actually been run',
  ],
} as const

export const WAITLIST = {
  heading: 'Get told once',
  body:
    'One email when there is something to install. No newsletter, no drip sequence, ' +
    'no sharing the address with anyone.',
  placeholder: 'you@example.com',
  button: 'Join',
  /*
   * The optional note to the founder.
   *
   * `messageNote` is a PROMISE, so it sits under the field as its own line
   * rather than inside the box as placeholder text. A placeholder is wiped by
   * the first keystroke, which would delete the promise at the exact moment
   * someone starts acting on it — and placeholders are skipped or read
   * inconsistently by screen readers, so it would not reliably be a promise at
   * all. The placeholder below is only a prompt for what to write.
   */
  messageLabel: 'Message to the founder',
  messageOptional: 'optional',
  messagePlaceholder: 'What are you building? What do you need it to do?',
  messageNote:
    'I read every one of these myself, and when the drop date comes I will write ' +
    'to each person here personally.',
  messageButton: 'Send',
  /* The note step's own outcomes. Separate from `states` because by this point
     the address is already saved — none of these can mean the signup failed. */
  messageStates: {
    sent: 'Got it. I will read it.',
    used: 'A message is already attached to this signup.',
    error: 'Could not send that. Your place on the list is safe either way.',
  },
  /* Every state the form can be in, so no component invents a string. */
  states: {
    ok: 'You are on the list. That is the last you will hear until there is a build.',
    duplicate: 'Already on the list — nothing more to do.',
    invalid: 'That does not look like an email address.',
    error: 'Something went wrong saving that. Try again in a moment.',
  },
} as const

export const LINKS = {
  /* Real, public, and checked: this repo exists and is the trust signal. */
  repo: 'https://github.com/Nathan5674312/fate',
  repoLabel: 'github.com/Nathan5674312/fate',
} as const

/**
 * THE ONE LINE THAT EXPLAINS THE HANDS, and the only place the page says out
 * loud what the background is.
 *
 * It sits under the waitlist on purpose: by then the reader has scrolled the
 * whole page, which means they have watched the gap close without being told
 * that it was closing. Saying it earlier would turn a thing they noticed into
 * a caption they were handed.
 *
 * 🔴 THE CASTING IS INVERTED AND THE WORDING DEPENDS ON IT. In Hands.tsx the
 * HUMAN is God's hand (straining, index finger out, tendons up) and the MACHINE
 * is Adam's (limp, wrist drooping, unbothered). So the human is the one doing
 * the reaching and the machine is the one that will not reach back. Any rewrite
 * that makes the human reach for something ABOVE it inverts the picture it is
 * captioning - see the header of src/hands/Hands.tsx before editing this.
 *
 * This line was very nearly 'humans reach for something GREATER than
 * themselves', which is exactly the trap the paragraph above describes, so it
 * is recorded here rather than left for someone to walk into twice. 'Greater'
 * puts the human underneath and makes the machine the thing above - the
 * original fresco, and the inverse of the recast. It also hands the page an
 * argument it does not make anywhere else, that the machine is the superior
 * thing, when the whole gag is that it cannot be bothered to reach back.
 * 'Past themselves' keeps the straining and drops the hierarchy. Do not
 * improve it back.
 */
export const HANDS = {
  note:
    'Humans reach past themselves, and the machine has not troubled itself to ' +
    'reach back. The hands behind this page are Michelangelo’s, recast — and ' +
    'they never touch.',
} as const

export const FOOTER = {
  madeBy: `${BRAND.name} is made by ${BRAND.studio}.`,
  year: 2026,
} as const
