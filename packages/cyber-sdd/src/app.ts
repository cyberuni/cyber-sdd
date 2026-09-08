import { cli } from 'clibuilder'
import { VERSION } from './version.js'

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
		description: 'Spec-Driven Development CLI, second generation',
	}).default({
		run() {
			this.ui.showHelp()
		},
	})
}
