/**
 * The one thing in the waitlist endpoint worth a test: readWants, which is a
 * trust boundary. Everything it lets through is written verbatim into a column
 * a human later reads to decide what to build, so "only the known vocabulary
 * gets in" is the property, not a detail.
 *
 * Run with node's own type stripping - the endpoint is TypeScript and the
 * function is pure, so no build step and no framework are needed to reach it.
 */
import { strict as assert } from 'node:assert'
import { readWants } from '../functions/api/waitlist.ts'

let n = 0
const is = (label, got, want) => {
  n++
  assert.deepEqual(got, want, `${label}: got ${JSON.stringify(got)}`)
}

/* The ordinary answers. */
is('all three ticked', readWants(['sync', 'sharing', 'multiplayer']), 'sync,sharing,multiplayer')
is('two ticked', readWants(['sync', 'multiplayer']), 'sync,multiplayer')
is('one ticked', readWants(['sharing']), 'sharing')

/* Nothing ticked is a valid signup, and null rather than '' so the column can
   be read as `wants IS NOT NULL` without also testing for empty string. */
is('none ticked', readWants([]), null)
is('field absent', readWants(undefined), null)
is('not an array', readWants('sync'), null)
is('null', readWants(null), null)

/* THE POINT. A POST sent straight at the endpoint cannot write its own words
   into the column, and cannot take a seat twice in one row. */
is('unknown key dropped', readWants(['sync', 'free-ponies']), 'sync')
is('only unknown keys', readWants(['<script>']), null)
is('duplicates collapse', readWants(['sync', 'sync']), 'sync')

/* Order comes from FEATURE_KEYS, not from the client, so two people who ticked
   the same pair are one group in a GROUP BY rather than two. */
is('order is ours', readWants(['multiplayer', 'sharing', 'sync']), 'sync,sharing,multiplayer')

console.log(`  ${n}/${n} passed`)
