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
  /*
   * TWO SENTENCES NOW, BECAUSE THE SECOND ONE IS THE PRODUCT. The first is the
   * mechanism and it was already here; the second is DECISION 3's core loop,
   * which the page has never once mentioned. Skill lookup, then an interview,
   * then skills written to disk that do the work next time - "a self-building
   * skill factory" is how `08 - Product Definition and Decisions` names it, and
   * it is the reason a near-empty vault is still worth downloading.
   *
   * "Roughly" is doing real work in that last clause. Nathan's own scope is
   * ~80% of the manual labour, and the note says plainly that any feature
   * promising full automation is overselling it. Do not round it up.
   */
  sub:
    'Point Claude, Codex or Gemini at the folder and it works out what this is on its own — ' +
    'no plugin, no API key, nothing to configure. Then it interviews you about how you ' +
    'actually work, writes the answers down as skills, and uses them to do roughly four ' +
    'fifths of the repetitive part next time.',
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
  /*
   * 🔴 "SENDS NOTHING ANYWHERE" LIVED HERE AND WAS RETIRED ON 2026-09-05,
   * BEFORE ANYONE CAUGHT IT. It was written from a roadmap note measured on
   * 2026-08-26, and v1.0.1 added a launch update check on 2026-09-04 — so by
   * the time it shipped it was a flat claim with a documented exception.
   *
   * Nothing was hidden and nothing leaks: `src/main/update.ts` at v1.0.5 calls
   * it "the only outbound request this app makes on its own behalf", a GET for
   * a static JSON file with no query string, no identifier and no version
   * header. But "sends nothing" and "makes one request that sends nothing" are
   * different sentences, and on a page whose entire argument is that it does
   * not lie to you about where your data goes, the difference is the argument.
   * Say the specific thing. It is more convincing than the absolute one.
   */
  body:
    'Free, no account, and nothing to sign up to. It makes exactly one request on its own ' +
    'behalf: when it opens it asks GitHub whether a newer release exists — a plain GET for ' +
    'a public file, no identifier, no version, no telemetry — and one click in the update ' +
    'panel stops it asking for good. Everything else it does happens on your disk.',
  url: 'https://github.com/Nathan5674312/agent-workspace/releases/latest',
  urlLabel: 'github.com/Nathan5674312/agent-workspace/releases',
  notes: [
    'Two files: an installer, or a portable .zip that runs out of a folder without installing.',
    'Windows only. The macOS and Linux targets are configured and have never once been built.',
    'The builds are unsigned, so SmartScreen warns the first time — More info, then Run anyway.',
    'When an update exists it shows you the changes, the files and the line counts before you take it.',
  ],
} as const

/**
 * The three claims. Each is checkable by the reader today, which is the bar the
 * roadmap note set ("three claims, each provable").
 *
 * 🔴 EACH BODY NAMES A MECHANISM OR A NUMBER, AND THAT IS THE WHOLE DEFENCE
 * AGAINST THE ONE THING THIS PAGE IS MOST LIKELY TO BE MISTAKEN FOR.
 * `Fate Site - Landing Page Research` §C5 measured seven competitor pages and
 * found the same three icon cards under the fold on every one of them, then
 * says where the AI-slop resemblance actually lives: "not the fold, everything
 * under it." Three cards saying "local-first", "private" and "fast" IS that
 * section. A syscall, a header and a dependency count are not, because nobody
 * generates those and a reader can check every one of them.
 *
 * So: no adjective survives here unless a fact follows it. Everything asserted
 * below was verified against the v1.0.5 tag on 2026-09-05, not taken from the
 * roadmap note that claimed it.
 */
export const CLAIMS = [
  {
    title: 'Plain markdown on disk',
    body:
      'Every note is a .md file in a folder you picked. Saving writes a temp file and renames ' +
      'it over the target, so a crash mid-write cannot leave you half a note, and the previous ' +
      'copy stays in .backups/. Open the same folder in Obsidian and nothing has to be exported.',
  },
  {
    title: 'Works while it is closed',
    body:
      'The product is the folder and the conventions in it, not a running process. Every ' +
      'feature is asked one question — does this help an agent that has never seen this vault, ' +
      'while the app is shut? An agent works the vault either way; the app is how you watch.',
  },
  {
    title: 'It cannot phone home',
    body:
      'Three runtime dependencies, and the window ships default-src none with connect-src none, ' +
      'so the browser engine refuses a network call rather than the code promising not to make ' +
      'one. The one request is asking GitHub if a version exists, and settings turn it off.',
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
    'Fate is being built in the open and is not finished. The list on the right is not ' +
    'modesty — it is the same status field the app ships in its own roadmap, which anyone ' +
    'who downloads it can read, so overstating anything here would be caught by the product ' +
    'itself. Nothing below the download should be a surprise afterwards.',
  built: [
    'A Windows build you can download and run today, installer or portable',
    'Markdown notes with backups on every save and a guard against two writers clobbering each other',
    'Canvas boards that are also runnable pipelines: cards are steps, arrows are the order',
    'A graph built from the wikilinks you actually wrote, and a table over your frontmatter',
    'Grouping that needs no tags: facets derived from folder, date and link neighbourhood',
    'Version history — every save leaves the previous copy, and restore goes back through save',
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
    'No sync and no collaboration. Both are below, and neither has been started',
    'Windows only. macOS and Linux are configured targets that have never been built',
    'The builds are unsigned, so Windows warns the first time you run one',
    'The agent can read the vault but not yet write to it — the tool list is Read, Glob and Grep',
    'Search is still plain keyword matching, and there is no import from Notion or Evernote',
    'Nothing prunes the version history, so it grows without limit until you clear it',
    'No mobile app, and on iOS there never will be one that runs agents — no subprocesses',
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
  heading: 'What costs money to run, and what never will',
  /*
   * 🔴 THE LINE IS UPKEEP, AND IT IS SHARPER THAN THE ONE IT REPLACED.
   *
   * This said "anything that leaves your own network" until 2026-09-05, which
   * was a decent proxy and the wrong rule. Nathan settled it as: whatever costs
   * money to keep alive is what gets paid for. Geography was only ever standing
   * in for that, because leaving the network is what happens to need a server.
   *
   * The refinement that makes it actually work is PER-USER. Some recurring
   * costs do not scale: an Apple Developer account is $99/yr whether ten people
   * or a hundred thousand run the app, and a code-signing certificate is the
   * same. Those are the cost of shipping the free thing and they stay absorbed
   * — paywalling them would mean charging for "runs on a Mac" and "does not
   * trip SmartScreen", which is charging for the product being finished.
   *
   * What a subscription can honestly fund is the bill that grows with each
   * person, each gigabyte and each device left online. That distinction is the
   * whole section, and `05 - Real-Time Collaboration` §2 already makes it:
   * "$5/mo is not the real cost. The real cost is that a rendezvous needs an
   * account to be useful, an account needs signup, recovery, abuse handling and
   * support, and every one of those is a permanent obligation."
   *
   * NO NUMBER, still. `12 - Website and Domain` keeps pricing on the enforced
   * leave-off list because there is none, so the page says that outright rather
   * than leaving a reader to wonder what was being hidden.
   */
  body:
    'None of this exists yet. The rule for what will cost money is upkeep, not features: ' +
    'everything Fate does today runs on hardware you already own, so it costs nothing to ' +
    'keep alive and it stays free — a permanent answer, not an introductory one. What ' +
    'follows needs a machine of mine to stay online, and those bills grow with every ' +
    'person, every gigabyte and every device left connected.',
  /*
   * The carve-out, split off the paragraph above on purpose. It is the second
   * half of the rule and it is genuinely a footnote, so it reads as one - and
   * nine lines of body landing on the lit palm was the single hardest thing on
   * the page to read. Two short blocks over this art beat one long one; that is
   * the same finding as the 2026-09-03 readability report, applied to length
   * rather than to colour.
   */
  bodyNote:
    'Costs that do not grow that way stay mine. A signing certificate and a developer ' +
    'account cost the same whether ten people run this or a hundred thousand, so they are ' +
    'the price of shipping the free thing — a Mac build and a build that does not trip ' +
    'SmartScreen will not be sold back to you as features. And there is no price yet. I am ' +
    'not going to invent one to fill this space.',
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
        'The same vault on every device, wherever you are. Two devices on one wifi can find ' +
        'each other with nothing in between, so that half is free permanently. The other half ' +
        'parks your notes on a relay, and a relay is rented by the gigabyte and by the month.',
    },
    {
      key: 'sharing',
      label: 'Sharing a note with someone who is not you',
      body:
        'Handing a note or a folder to another person, with permissions. The upkeep here is ' +
        'not storage, it is identity: knowing who someone is means accounts, and accounts ' +
        'mean signup, recovery, abuse handling and support for as long as they exist.',
    },
    {
      key: 'multiplayer',
      label: 'Two people in one document at once',
      body:
        'Both of you editing one note and seeing each other do it. Across one wifi there is ' +
        'nothing in the middle and it is meant to stay free. Anywhere else needs a server to ' +
        'introduce the two of you and to relay whatever cannot connect directly, billed per ' +
        'message — plus a CRDT, because today saving is last-write-wins behind a time guard.',
    },
  ],
  placeholder: 'you@example.com',
  button: 'Join',
  /* The promise, kept from the old list because it is the reason people give an
     address at all. Unchanged in substance: one email, no list, no sharing. */
  promise:
    'One email when one of these is real. No newsletter, no drip sequence, and the address ' +
    'is not shared with anyone — it sits in a database on an account I own, not with a form ' +
    'vendor, and the endpoint that stores it logs no IP and sets no cookie.',
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
    'Humans reach past themselves, and the machine has not troubled itself to reach back. ' +
    'The hands behind this page are Michelangelo’s, recast: the straining one with the ' +
    'tendons up is ours, the limp one is the machine, and scrolling is what closes the gap ' +
    'between them. They never touch. Fate is an argument about the part in between.',
} as const

export const FOOTER = {
  madeBy: `${BRAND.name} is made by ${BRAND.studio}.`,
  /*
   * THE CONTACT ADDRESS, and it is on the studio's own domain rather than the
   * personal account address. That is not a style choice: the account address
   * was deliberately removed from this repo's git history, and putting it on a
   * public, crawlable page would undo that in one commit. Nathan supplied this
   * one on 2026-09-05 when asked, and it is the only address that belongs here.
   *
   * `12 - Website and Domain` keeps "an unmonitored email address" on its
   * leave-off list, so this is a promise as much as a link — if it stops being
   * read, it should come off the page rather than sit here going nowhere.
   */
  contactLabel: 'Something to say, or something wrong on this page?',
  email: 'nathaniel@divineconstruc.com',
  year: 2026,
} as const
