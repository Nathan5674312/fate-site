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
  /*
   * THE DOWNLOAD IS THE PRIMARY CTA NOW, and that is the change the roadmap
   * note `12 - Website and Domain` §5 predicted: the waitlist held this slot
   * only "until there is something to download". There is - v1.0.0 shipped
   * 2026-09-02 and the releases page has carried Windows binaries since.
   *
   * The waitlist did not go away, it changed subject. It is now the list for
   * the paid tier (see WAITLIST below), which is a different promise and does
   * not belong on the same button.
   */
  cta: 'Download for Windows',
  /* Honest, and load-bearing: it sets the expectation the button implies. Free
     and account-free are both true today and are the whole pitch; Windows-only
     is the limit someone on a Mac needs before they click, not after. */
  ctaNote: 'Free, no account. Windows only.',
  /* The second door, for someone the download does not answer. */
  secondaryCta: 'What is coming',
} as const

/**
 * THE DOWNLOAD. Everything here is checkable against the releases page, which
 * is the point - this section is the one that would cost the most trust to
 * overstate, because a reader can be disproved by the file they just ran.
 *
 * 🔴 NO VERSION NUMBER ON THE PAGE, DELIBERATELY. The link is GitHub's
 * `/releases/latest`, which never goes stale; a hardcoded `1.0.5` here would be
 * wrong the next time a release is cut and nobody would notice, because a
 * stale number does not break a build. Same reason there is no direct link to
 * the .exe: GitHub's asset URLs carry the version in the filename, so a direct
 * link is a maintenance obligation and the releases page is not.
 *
 * `notes` are the three things a first-time runner actually hits, and the
 * SmartScreen one is there because it is what an unsigned build does. Someone
 * who meets that warning without being told is entitled to assume the worst.
 *
 * There is no `cta` here any more. This section had a second solid button
 * saying "Download for Windows" and pointing at the same URL as the hero's, and
 * two identical buttons are not a choice - they are a thing a reader stops to
 * compare. The hero keeps the button; this section keeps the readable URL.
 */
export const DOWNLOAD = {
  heading: 'Get it',
  body:
    'Fate is free, needs no account, and sends nothing anywhere. Two files on the ' +
    'releases page: an installer, or a portable zip that runs from a folder.',
  url: 'https://github.com/Nathan5674312/agent-workspace/releases/latest',
  urlLabel: 'github.com/Nathan5674312/agent-workspace/releases',
  notes: [
    'Windows only. The macOS and Linux builds are configured and have never been built.',
    'The builds are unsigned, so Windows SmartScreen warns the first time. More info → Run anyway.',
    'It tells you when a new version exists and shows you what changed before you take it.',
  ],
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
    'so nothing below the download is a surprise later.',
  built: [
    'A Windows build you can download and run today, installer or portable',
    'Markdown vault: read, edit, save, with backups and a lost-update guard',
    'Canvas boards that double as runnable agent pipelines',
    'A graph over real wikilinks, and a database view over frontmatter',
    'Daily notes and a calendar planner over the whole vault',
  ],
  /*
   * 🔴 "No installer yet" LIVED HERE UNTIL 2026-09-05 AND IS NOW FALSE. It was
   * true when this file was written and stopped being true when v1.0.0 shipped
   * on 2026-09-02. Left in place it would have been the page's single worst
   * line: the honesty rule earns its keep by being checkable, and a reader who
   * catches this block understating the product stops believing it overstating
   * nothing. If a claim here goes stale again, that is the one to fix first.
   */
  notBuilt: [
    'No sync and no collaboration — see below, and neither exists yet',
    'Windows only. macOS and Linux are configured targets that have never been built',
    'The builds are unsigned, so Windows warns the first time you run one',
    'No mobile app',
  ],
} as const

/**
 * THE WAITLIST CHANGED SUBJECT ON 2026-09-05, IT DID NOT MOVE.
 *
 * It used to mean "tell me when there is something to install". There is
 * something to install, so that list is finished and this one is a different
 * promise: the paid tier that does not exist yet. Same table, same endpoint,
 * same two-step form - only the subject and one column are new.
 *
 * 🔴 NO PRICE, AND THAT IS ENFORCED RATHER THAN UNFINISHED. `12 - Website and
 * Domain` lists pricing under "what to leave off - still enforced", because
 * there is none: DECISION 2 sequences the free product first and the backend
 * only once there are users. Saying "paid" without a number is the honest
 * state. Putting a number here would be inventing one.
 *
 * 🔴 SYNC IS NOT WHOLLY PAID AND THE COPY MUST NOT SAY IT IS. DECISION 2 in
 * `08 - Product Definition and Decisions` is locked: free is local-network
 * pairing with no account and no backend, Pro is the away-from-home case. So
 * the feature below is worded as sync AWAY FROM your own network. A rewrite to
 * a flat "sync is a paid feature" contradicts a locked decision and takes back
 * something already promised for free.
 */
export const WAITLIST = {
  heading: 'What is coming, and what it will cost',
  /*
   * THE WHOLE PAID TIER IS ONE LINE, AND SAYING IT AS A LINE IS THE POINT.
   * Three features is a price list a reader has to keep straight; one boundary
   * they can apply themselves to a feature nobody has thought of yet. It is
   * also literally the rule DECISION 2 locked, rather than a summary of it.
   */
  body:
    'None of this exists today. The line is the same for all of it: on your own network ' +
    'Fate is free and needs no account, because peer-to-peer over your own wifi costs ' +
    'nothing to run. The moment something has to leave your network it needs a server ' +
    'and an account, and that is the paid tier. Tick what you would actually pay for.',
  /*
   * EVERY PAID FEATURE, not a sample of them — the list is closed and it comes
   * from §3 of `05 - Real-Time Collaboration`, whose table sorts each goal by
   * whether it needs a server and an identity, plus DECISION 2 for sync.
   *
   * 🔴 THE QUALIFIERS ARE NOT PADDING, THEY ARE THE FREE/PAID LINE. Comments,
   * LAN device pairing, and co-editing between two machines on one wifi are all
   * on the FREE side of that table — "possible at $0", in its words. Drop
   * "away from your own network" from the sync or multiplayer label and the
   * page starts charging for something already promised free.
   *
   * `key` is what reaches the database, and adding one here is not enough on
   * its own: FEATURE_KEYS in functions/api/waitlist.ts is the guard, and an
   * unknown key is dropped there rather than stored.
   */
  features: [
    {
      key: 'sync',
      label: 'Sync away from your own network',
      body:
        'The same vault on every device, wherever you are. Pairing two devices on one wifi ' +
        'stays free and needs no account — this is the half that has to cross the internet.',
    },
    {
      key: 'sharing',
      label: 'Sharing a note with someone who is not you',
      body:
        'Handing a note or a folder to another person, with permissions, over the internet. ' +
        'Sending a file to your own phone on your own network is the free case and is ' +
        'mostly built; this one needs identity, which is what an account is.',
    },
    {
      key: 'multiplayer',
      label: 'Two people in one document at once',
      body:
        'Both of you editing the same note and seeing each other do it. Today saving is ' +
        'last-write-wins behind a modified-time guard, so this needs a server and a CRDT — ' +
        'and on one wifi it is planned to be free, because there is nothing in the middle.',
    },
  ],
  placeholder: 'you@example.com',
  button: 'Join',
  /* The promise, kept from the old list because it is the reason people give an
     address at all. Unchanged in substance: one email, no list, no sharing. */
  promise:
    'One email when one of these is real. No newsletter, no drip sequence, no sharing ' +
    'the address with anyone.',
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
    'I read every one of these myself, and when one of these ships I will write to ' +
    'each person here personally.',
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
    ok: 'You are on the list. That is the last you will hear until one of these is real.',
    duplicate: 'Already on the list — nothing more to do.',
    invalid: 'That does not look like an email address.',
    error: 'Something went wrong saving that. Try again in a moment.',
  },
} as const

export const LINKS = {
  /* Real, public, and checked: this repo exists and is the trust signal. It is
     the VAULT template, which is the product per DECISION 1 - not the app. The
     app's repo is the one DOWNLOAD.url points at, and they are two repos on
     purpose. */
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
