import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'tsdown'

function engineEntries(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = join(dir, entry.name)
		if (entry.isDirectory()) return engineEntries(file)
		if (
			entry.isFile() &&
			entry.name.endsWith('.mts') &&
			!entry.name.endsWith('.test.mts') &&
			!entry.name.endsWith('.d.mts')
		) {
			return [file]
		}
		return []
	})
}

const entries = [...engineEntries('skills'), join('skills', 'spec-gate', 'vendor', 'gherkin-cli.mjs')]
writeFileSync(
	'.generated-skill-engines.json',
	JSON.stringify(entries.map((entry) => `${entry.slice(0, entry.lastIndexOf('.'))}.js`)),
)

export default defineConfig({
	entry: entries,
	root: 'skills',
	unbundle: true,
	format: 'esm',
	outExtensions: () => ({ js: '.js' }),
	clean: false,
	outDir: 'skills',
	platform: 'node',
	target: 'node22',
})
