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
      /* FOUR, NOT THREE. Counted in package.json on 2026-09-10:
         @anthropic-ai/claude-agent-sdk, electron-updater, lucide-react, zod.
         This said three, which was true before the update channel shipped and
         added electron-updater on 2026-09-04. A bare count is exactly the claim
         that goes stale without anyone noticing, so they are named now: a wrong
         name is visible in a way a wrong number is not. */
      'Four runtime dependencies — the agent SDK, the updater, an icon set and a schema ' +
      'validator — and the window ships default-src none with connect-src none, ' +
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
    /* v1.1.0. Two surfaces, one line, because they are one story to a reader
       deciding whether this can find their notes. Ctrl+P is the new one; the
       word matching is a fix to the old one, and saying only the first would
       leave the notBuilt line below reading as though nothing had moved. */
    'Ctrl+P opens any note by name, and search matches the words of a query rather than the exact phrase',
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
    /* "STILL plain keyword matching" until v1.1.0, and "still" had to go: it
       signals nothing has moved, and something did — the query used to be one
       string handed to an index-of, so two words only matched as a phrase. The
       gap this line exists to state is the real one and it is unchanged: a
       linear scan rather than an index, and no semantic search. Naming the
       mechanism keeps it from reading as a contradiction of the built line. */
    'Search is keyword matching over a linear scan, not an index, and there is no import from Notion or Evernote',
    'Nothing prunes the version history, so it grows without limit until you clear it',
    'No mobile app, and on iOS there never will be one that runs agents — no subprocesses',
  ],
} as const

/*
 * Real, public, and checked: this repo exists and is the trust signal. It is
 * the VAULT template, which is the product per DECISION 1 - not the app. The
 * app's repo is the one DOWNLOAD.url points at, and they are two repos on
 * purpose.
 *
 * ABOVE PROOF RATHER THAN DOWN BY THE FOOTER, where it used to sit, because
 * PROOF's third item links it and a `const` cannot be read before it is
 * declared. Inlining the URL a second time was the alternative and it is how
 * one of the two copies eventually points somewhere that has moved.
 */
export const LINKS = {
  repo: 'https://github.com/Nathan5674312/fate',
  repoLabel: 'github.com/Nathan5674312/fate',
} as const

/**
 * THE CASE STUDY, AND THE HONESTY RULE NEARLY KILLED IT.
 *
 * The landing-page checklist asks for one. There are no users, so the only
 * available versions were an invented customer, a testimonial from nobody, or
 * silence — and the first two are the exact failure this file exists to
 * prevent. What broke the deadlock is that there IS one true case, confirmed by
 * Nathan on 2026-09-09: the app and this page were both built by agents working
 * a vault that follows these conventions.
 *
 * 🔴 EVERY ITEM NAMES A FILE IN A PUBLIC REPOSITORY, AND THAT IS THE ONLY
 * REASON THIS SECTION IS ALLOWED ON THE PAGE. "We use our own product" is what
 * every company says and no reader can check. A path, a repository and a quoted
 * first line are checkable in under a minute, which is the same bar CLAIMS
 * sets ("no adjective survives here unless a fact follows it"). If an item
 * here ever stops naming something a stranger can open, delete the item.
 *
 * Verified 2026-09-09, each by fetching the public URL, not by remembering it:
 * `Nathan5674312/fate` has AGENTS.md and _templates at its root;
 * `agent-workspace/main/docs/AGENT-RELEASE.md` answers 200 and opens with the
 * line quoted below; `fate-site/master/src/content.ts` answers 200 and cites
 * the vault notes throughout.
 *
 * 🔴 NO COUNT OF THOSE CITATIONS, AND IT COST A PUSH TO LEARN WHY. The first
 * version of the item below said "seven times over", which was measured and
 * true — until this very block was added to this very file, which took it to
 * ten. A self-referential count invalidates itself the moment anyone edits the
 * thing it counts, and it fails in the direction that reads as sloppiness
 * rather than as a lie, which is not much better on a page arguing that its
 * numbers are right. Same rule DOWNLOAD applies to the version number: name
 * the thing, not the tally. Do not put a number back.
 *
 * 🔴 THE LIMIT IS PART OF THE SECTION, NOT A DISCLAIMER UNDER IT. A sample of
 * one presented as evidence is the overstatement this audience punishes
 * fastest, and it is also the honest thing: saying it costs nothing and buys
 * the reader's trust in the three items above it.
 */
export const PROOF = {
  heading: 'The only case study there is',
  intro:
    'There are no customers to write one about, so here is the one that exists. The app you ' +
    'can download and the page you are reading were both built by an agent working a vault ' +
    'that follows these conventions, with a human reviewing. That is a claim every company ' +
    'makes, so all three repositories are public and each item below names the file or the ' +
    'history you can check it against.',
  items: [
    {
      title: 'The copy is not in the page',
      body:
        'Every string a visitor sees lives in one file, src/content.ts, and its comments cite ' +
        'the vault notes each claim was written from by name: 08 - Product Definition and ' +
        'Decisions, 12 - Website and Domain, Fate Site - Landing Page Research. The citations ' +
        'are the audit trail — you can read the file and see which decision produced which ' +
        'sentence, including the ones that were retired and why.',
      href: 'https://github.com/Nathan5674312/fate-site/blob/master/src/content.ts',
      hrefLabel: 'fate-site/src/content.ts',
    },
    {
      title: 'The releases are cut from a checked-in procedure',
      body:
        'Shipping an update is not improvised. docs/AGENT-RELEASE.md in the app’s own ' +
        'repository is the binding version rather than a summary, and it opens on the fact ' +
        'the rest of it follows from: “A commit reaches nobody. A release reaches everybody.” ' +
        'An agent reads it end to end before it is allowed to publish anything.',
      href: 'https://github.com/Nathan5674312/agent-workspace/blob/main/docs/AGENT-RELEASE.md',
      hrefLabel: 'agent-workspace/docs/AGENT-RELEASE.md',
    },
    {
      title: 'The vault template is the one this was made in',
      body:
        'It is not a demo vault assembled for the repository. AGENTS.md, _templates, inbox, ' +
        'tasks and wiki are the same shapes the work above ran on, which is also why the ' +
        'product is the folder and the conventions rather than the app — an agent that has ' +
        'never seen a vault needs the conventions, not a window.',
      href: LINKS.repo,
      hrefLabel: 'github.com/Nathan5674312/fate',
    },
    {
      /*
       * 🔴 THE NUMBER IS A FLOOR AND THE COPY HAS TO SAY SO. Measured
       * 2026-09-09: 218 of 233 commits in agent-workspace and 49 of 80 here
       * carried the trailer BEFORE the commit that added this section, which
       * carries one too - hence 50 of 81 in the copy. Counting yourself in is
       * the difference between a number that is right on the day it ships and
       * one that is off by exactly one forever. The 31 that do not are NOT human commits - none of
       * them is a merge (checked), and most are prefixed `hands:`, from the
       * second agent session, which does not write the trailer at all.
       *
       * So the honest reading is the opposite of the flattering one: this
       * undercounts. Quoting 94% and leaving it there would invite a reader who
       * checks to find a `hands:` commit with no trailer and conclude a human
       * wrote it. Say it is a lower bound, or do not use the number.
       *
       * Dated rather than live, and that is deliberate. A bare count goes stale
       * on the next commit and nobody notices, which is the same trap DOWNLOAD
       * avoids by never printing a version number. A measurement with its date
       * on it stays true forever, and the command below re-derives today's.
       */
      title: 'The commits say who wrote them',
      body:
        'The co-author trailer is in the commit message itself, so git log re-derives this on ' +
        'any clone instead of asking you to trust a number printed here. Measured 2026-09-09: ' +
        '218 of 233 commits in the app and 50 of 81 on this site name an agent as co-author. ' +
        'The remainder are not a human stepping in — they are commits from a second agent ' +
        'session that does not write the trailer, so treat the count as a floor rather than ' +
        'a census.',
      href: 'https://github.com/Nathan5674312/agent-workspace/commits/main',
      hrefLabel: 'agent-workspace commit history',
    },
  ],
  /* Said in the section, not in small type beneath it. See the header. */
  limit:
    'One person, one vault, three repositories. That is the entire sample. There is no ' +
    'customer here, no revenue and no second user, and a case study of one is exactly as ' +
    'weak as that sounds. It is on the page because every part of it is checkable, not ' +
    'because it is representative.',
} as const

/**
 * THE FAQ, AND IT IS HERE FOR THE CRAWLERS AS MUCH AS FOR THE READER.
 *
 * A question with its answer directly under it is the shape an LLM lifts most
 * cleanly, because the question is the query and the answer is a self-contained
 * span it can quote without inventing the context. Everything below was already
 * true and already written somewhere on this page - CLAIMS, DOWNLOAD, STATUS -
 * so this section adds no new claim. It re-cuts the ones that exist into the
 * form the question actually arrives in.
 *
 * 🔴 THE HONESTY RULE APPLIES HARDEST HERE. These answers are the ones that get
 * quoted back at you out of context, with no page around them to qualify
 * anything. Every limit stays IN the answer rather than beside it - "Windows
 * only", "never on iOS", "read but not write" - because a quoted half-answer
 * that oversells is the version a reader will meet first.
 *
 * prerender.mjs turns this array into FAQPage JSON-LD at build time. Do not
 * hand-write that schema anywhere: two copies of an answer is exactly how one
 * of them goes stale, and a stale structured-data answer is the one nobody
 * proofreads because it is invisible on the page.
 */
export const FAQ = {
  heading: 'Questions',
  items: [
    {
      q: 'Which agents does Fate work with?',
      a:
        'Claude Code, Codex, Gemini, and anything else that can read a folder. There is no ' +
        'plugin to install and no API key to paste — you point the agent you already use at the ' +
        'vault and it reads the conventions in it. That is deliberate rather than incidental: ' +
        'discovery happens through open files any agent already reads, AGENTS.md and CLAUDE.md ' +
        'and the folder structure itself, rather than a proprietary API that would tie your ' +
        'notes to one vendor. Fate never handles a credential, never proxies a request and ' +
        'never offers a login, which puts it on the same footing as an .editorconfig or a ' +
        'Makefile: your agent, your subscription, your machine. It is also why the product ' +
        'works while the app is shut, since an agent can read the folder with nothing running. ' +
        'Today its tool list is Read, Glob and Grep, so it can read the vault but cannot yet ' +
        'write to it.',
    },
    {
      q: 'Does Fate send my notes anywhere?',
      a:
        'No. It makes exactly one request on its own behalf: when it opens it asks GitHub ' +
        'whether a newer release exists, a plain GET for a public file with no identifier, no ' +
        'version and no telemetry, and one click in the update panel stops it asking for good. ' +
        'There is no account, no analytics and no crash reporting. The window ships default-src ' +
        'none with connect-src none, so the browser engine refuses a network call rather than ' +
        'the code promising not to make one, a guard that holds even if some future dependency ' +
        'tries. There are four runtime dependencies in total. Your notes are .md files in a ' +
        'folder you chose, and nothing uploads them: saving writes a temp file and renames it ' +
        'over the target, entirely on your disk. Pull the network cable and reading, editing, ' +
        'saving, the graph, the database, canvas and version history all still work.',
    },
    {
      q: 'Is it free?',
      a:
        'Yes, and with no account. The rule for what will ever cost money is upkeep rather than ' +
        'features: everything Fate does today runs on hardware you already own, so it costs ' +
        'nothing to keep alive and it stays free, a permanent answer rather than an ' +
        'introductory one. What will cost money is the part that needs a machine of mine ' +
        'online, and there are exactly three: sync away from your own network, sharing a note ' +
        'with someone who is not you, and two people in one document at once. Costs that do not ' +
        'grow per person stay mine. A code-signing certificate and a developer account cost the ' +
        'same whether ten people run this or a hundred thousand, so a Mac build and a build ' +
        'that does not trip SmartScreen will not be sold back to you as features. There is no ' +
        'price yet, and I am not going to invent one.',
    },
    {
      q: 'Does it run on macOS or Linux?',
      a:
        'Not yet. Windows only, and the honest version is that the other two have never once ' +
        'been built. The macOS and Linux electron-builder targets are configured in ' +
        'package.json and unverified, which is scaffolding rather than support. Neither can be ' +
        'produced on the machine this is built on: mac artifacts require macOS, and a Linux ' +
        'AppImage from a non-Linux host requires Docker, which is not installed. The Windows ' +
        'release ships two files: an installer of about 104 MB, or a portable .zip of about ' +
        '142 MB that runs out of a folder ' +
        'without installing. Those builds are unsigned, there being no code-signing ' +
        'certificate, so SmartScreen warns the first time you run one and getting past it is ' +
        'More info, then Run anyway. The certificate and an Apple developer account are costs ' +
        'that do not scale per user, so they stay absorbed rather than becoming paid features.',
    },
    {
      q: 'Is there a mobile app?',
      a:
        'No, and on iOS there never will be one that runs agents. The platform does not allow a ' +
        'process to spawn another process, and spawning the agent you already have installed is ' +
        'the entire mechanism, so this is a platform rule rather than work nobody has got to ' +
        'yet. That also sets the priority: mobile is rated low, because what the app does is ' +
        'let you watch an agent work, and agents run on a computer. What does travel is the ' +
        'notes themselves. They are plain .md files in an ordinary folder, so they move with ' +
        'whatever you already use for files and open in any editor on any device with no export ' +
        'step. Sync of any kind is not built yet, including on the desktop, and nothing about ' +
        'it has been started. A phone can read your vault today; it cannot run the part that ' +
        'makes Fate useful.',
    },
    {
      q: 'Do I have to move my notes out of Obsidian?',
      a:
        'No, and there is nothing to import either, because it is the same folder. Every note ' +
        'is a plain .md file in a directory you picked, so you can open that directory in ' +
        'Obsidian and in Fate and neither has to be told about the other. Saving writes a temp ' +
        'file and renames it over the target, so a crash mid-write cannot leave you half a ' +
        'note, and the previous copy stays in .backups/. Every save leaves one, and that is ' +
        'what version history reads. Bookmarks are stored in the .obsidian/bookmarks.json that ' +
        'Obsidian itself uses rather than a second list, so a bookmark made in either program ' +
        'shows up in both. The honest gap there: a running Obsidian rewrites that file from ' +
        'memory, so a bookmark added while it is open can be overwritten by it.',
    },
    {
      q: 'What does the agent actually do with it?',
      a:
        'Four steps, and the third is the one that matters. It looks up which skills apply, ' +
        'interviews you about how you actually work, what font, what voice, what hook, what ' +
        'done looks like, then writes those answers to disk as new skill files and uses them to ' +
        'do the repetitive part next time. So the vault does not ship your skills; it ships the ' +
        'protocol that manufactures them from an interview, which is why a near-empty vault is ' +
        'still worth downloading. The honest scope is roughly four fifths of the manual labour ' +
        'rather than full automation: you keep the creative decisions and supply the raw ' +
        'material, and any feature promising to remove you from that is overselling it. Today ' +
        'the agent can read the vault but not write to it, the tool list being Read, Glob and ' +
        'Grep, so it proposes and you apply.',
    },
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
   * The privacy page, which is a STATIC FILE at public/privacy.html and not a
   * route. This site has no router and does not need one for a document that
   * never changes - see the header of that file. A plain href means it is
   * reachable with the bundle broken and readable by anything that does not run
   * JS, which is most of what reads a privacy page.
   *
   * It exists because the form writes real addresses to a real database and the
   * copy makes specific claims about that ("logs no IP and sets no cookie").
   * An unbacked privacy claim is worse than no claim on a page whose whole
   * argument is that it does not lie about where your data goes.
   */
  privacy: 'Privacy',
  /* Extensionless: Pages 308s /privacy.html to this. See the canonical there. */
  privacyUrl: '/privacy',
  /*
   * 🔴 NO CONTACT ADDRESS HERE, AND THAT IS A DECISION RATHER THAN A GAP.
   *
   * One was added on 2026-09-05 and taken off the same day, on Nathan's call.
   * The address he gave is the login for the Cloudflare account that
   * administers this domain, and that is precisely the address this repo's
   * history was rewritten with `git filter-repo` to remove: the risk recorded
   * at the time was the admin account's address sitting in public next to an
   * analysis of the domain's mail weaknesses.
   *
   * So if a contact route goes back on this page, it should be an alias that
   * is NOT an account login anywhere — hello@ or contact@ forwarding onward.
   * Do not reach for the obvious address just because it is the one on file.
   */
  year: 2026,
} as const
