// Where a sibling engine lives, seen from the engine that runs it.
//
// The sources sit at `src/<skill>/<engine>.mts`. `universal-plugin plugin build` compiles each into
// a self-contained `skills/<skill>/scripts/<engine>.mjs`, which every install channel runs. An engine
// that spawns a sibling runs it in the same form it runs in itself: source beside source, compiled
// beside compiled. Node will not strip types under node_modules, so compiled code never reaches back
// into the `.mts` tree.

import { dirname, join } from 'node:path'

/** The path of `<skill>/<engine>` for an engine running from the file `here`. */
export function siblingEngine(here: string, skill: string, engine: string): string {
	if (here.endsWith('.mts')) return join(dirname(here), '..', skill, `${engine}.mts`)
	return join(dirname(here), '..', '..', skill, 'scripts', `${engine}.mjs`)
}
