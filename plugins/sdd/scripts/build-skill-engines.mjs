// Bundles every skill engine into a self-contained `<engine>.bundle.mjs` beside its source.
//
// Node will not strip types from a file under node_modules, so an engine installed from npm
// cannot run as `.mts`. Each engine is built on its own, with every import it reaches (sibling
// skills, the vendored gherkin-cli) inlined, so a skill still works when it is copied or linked
// without the rest of the package. The `<engine>.mjs` launcher committed next to the source
// picks the `.mts` in a checkout and this bundle under node_modules.
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'tsdown'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const skillsDir = join(packageRoot, 'skills')

// Every engine guards its CLI on `import.meta.url` being the main module. In a bundle that URL is
// the bundle's own, so the guards of the modules inlined into it would all fire. Only the entry's
// guard may stay.
const MAIN_GUARD = /import\.meta\.url\s*===\s*pathToFileURL\(realpathSync\(process\.argv\[1\]\)\)\.href/g

function onlyEntryMain(entry) {
	return {
		name: 'only-entry-main',
		transform(code, id) {
			if (id === entry || !MAIN_GUARD.test(code)) return null
			MAIN_GUARD.lastIndex = 0
			return { code: code.replace(MAIN_GUARD, 'false'), map: null }
		},
	}
}

export function listEngines() {
	return readdirSync(skillsDir, { withFileTypes: true }).flatMap((skill) => {
		if (!skill.isDirectory()) return []
		const scripts = join(skillsDir, skill.name, 'scripts')
		let names
		try {
			names = readdirSync(scripts)
		} catch {
			return []
		}
		return names
			.filter((n) => n.endsWith('.mts') && !n.endsWith('.test.mts') && !n.endsWith('.d.mts'))
			.map((n) => join(scripts, n))
	})
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	for (const entry of listEngines()) {
		await build({
			config: false,
			cwd: packageRoot,
			entry: {
				[entry
					.split('/')
					.pop()
					.replace(/\.mts$/, '')]: entry,
			},
			outDir: dirname(entry),
			format: 'esm',
			platform: 'node',
			target: 'node22',
			clean: false,
			dts: false,
			outExtensions: () => ({ js: '.bundle.mjs' }),
			deps: { alwaysBundle: [/.*/] },
			plugins: [onlyEntryMain(entry)],
			logLevel: 'warn',
		})
	}
}
