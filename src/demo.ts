/**
 * ONE VAULT, RENDERED THREE WAYS.
 *
 * The graph, the table and the canvas board on this page are not three
 * illustrations. They are three renderings of the array below, exactly as the
 * app renders one folder three ways — which is the product's own claim, so the
 * page demonstrates it instead of asserting it.
 *
 * WHY IT IS INVENTED RATHER THAN CAPTURED. The obvious move is a screenshot of
 * a real vault. Nathan's real vault is full of his own project names, client
 * work and dated decisions, and none of that belongs on a public page. A
 * fabricated vault is also the honest choice for a second reason: a screenshot
 * would be a picture of the app, while this is the same data structure the app
 * uses, laid out live in the DOM. Nothing here claims to be a real user.
 *
 * The content is deliberately mundane — someone planning a small trip — because
 * the point being made is about the SHAPE of a vault (files, links, frontmatter)
 * and a domain nobody has to understand keeps the shape legible.
 */

/**
 * One note, carrying exactly the fields the three views need and nothing more.
 * `links` are wikilink targets by id, which is what the app derives its graph
 * from: an edge is a `[[link]]` in a note's body, never a stored relation.
 */
export type DemoNote = {
  id: string
  title: string
  /** Vault-relative, so the table can show a folder column that means something. */
  path: string
  /** `type:` frontmatter. */
  type: 'note' | 'plan' | 'log'
  /** `status:` frontmatter. Drives the board's columns. */
  status: 'idea' | 'doing' | 'done'
  /** `updated:` frontmatter, ISO. The calendar and the sort read this. */
  updated: string
  /** Outbound wikilinks, by id. The graph's edges, derived not stored. */
  links: string[]
}

export const NOTES: DemoNote[] = [
  {
    id: 'trip',
    title: 'Iceland, March',
    path: 'Trips/Iceland, March.md',
    type: 'plan',
    status: 'doing',
    updated: '2026-03-02',
    links: ['route', 'kit', 'budget', 'weather'],
  },
  {
    id: 'route',
    title: 'Ring road, anticlockwise',
    path: 'Trips/Ring road, anticlockwise.md',
    type: 'plan',
    status: 'doing',
    updated: '2026-03-01',
    links: ['weather', 'stops'],
  },
  {
    id: 'kit',
    title: 'What to actually pack',
    path: 'Trips/What to actually pack.md',
    type: 'note',
    status: 'done',
    updated: '2026-02-24',
    links: ['weather'],
  },
  {
    id: 'budget',
    title: 'Budget, honestly',
    path: 'Trips/Budget, honestly.md',
    type: 'note',
    status: 'doing',
    updated: '2026-02-28',
    links: ['stops'],
  },
  {
    id: 'weather',
    title: 'March weather notes',
    path: 'Reference/March weather notes.md',
    type: 'note',
    status: 'done',
    updated: '2026-02-19',
    links: [],
  },
  {
    id: 'stops',
    title: 'Places worth stopping',
    path: 'Trips/Places worth stopping.md',
    type: 'note',
    status: 'idea',
    updated: '2026-02-26',
    links: ['vik', 'hofn'],
  },
  {
    id: 'vik',
    title: 'Vík',
    path: 'Places/Vík.md',
    type: 'note',
    status: 'idea',
    updated: '2026-02-21',
    links: [],
  },
  {
    id: 'hofn',
    title: 'Höfn',
    path: 'Places/Höfn.md',
    type: 'note',
    status: 'idea',
    updated: '2026-02-20',
    links: [],
  },
  {
    id: 'day1',
    title: 'Day one',
    path: 'Trips/Day one.md',
    type: 'log',
    status: 'done',
    updated: '2026-03-04',
    links: ['route', 'vik'],
  },
]

/**
 * Edges, DERIVED from the notes rather than listed beside them.
 *
 * This is not tidiness. The app has no edge table: a connection exists because
 * a note's body contains `[[a link]]`, and everything else is computed from
 * that. A hand-written edge list on this page would be the one place the site
 * quietly disagreed with the product it is describing.
 *
 * Links pointing at an id that is not in NOTES are dropped, the same way the
 * app refuses to draw an edge to a note that does not exist.
 */
export function edges(notes: readonly DemoNote[] = NOTES): { from: string; to: string }[] {
  const ids = new Set(notes.map((n) => n.id))
  return notes.flatMap((n) => n.links.filter((l) => ids.has(l)).map((to) => ({ from: n.id, to })))
}

/** Inbound link count, which is what makes a node read as a hub in the graph. */
export function degree(notes: readonly DemoNote[] = NOTES): Map<string, number> {
  const d = new Map(notes.map((n) => [n.id, 0]))
  for (const e of edges(notes)) {
    d.set(e.to, (d.get(e.to) ?? 0) + 1)
    d.set(e.from, (d.get(e.from) ?? 0) + 1)
  }
  return d
}

/** The board's columns, in the order work actually moves. */
export const STATUSES = ['idea', 'doing', 'done'] as const
