import { cli, result } from 'clibuilder'
import { homeHeader } from 'clibuilder/axi'
import { VERSION } from './version.js'

const description = 'Spec-Driven Development CLI, second generation'

/**
 * The `cyber-sdd-2` command tree.
 *
 * Built separately from the bin entry so tests and embedders can drive it
 * without the module parsing `process.argv` on import.
 */
export function createApp() {
	return cli({
		name: 'cyber-sdd-2',
		version: VERSION,
		description,
	}).default({
		description,
		examples: [{ command: 'cyber-sdd-2 --help', description: 'Show the CLI schema' }],
		run() {
			// No sub-commands exist yet, so the live data is the CLI's own identity.
			return result({ ...homeHeader({ description, bin: 'cyber-sdd-2' }), version: VERSION })
		},
	})
}
