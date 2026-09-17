#!/usr/bin/env node
/**
 * Keep each plugin's manifest versions equal to its package.json version.
 *
 *   node scripts/sync-plugin-versions.mjs          write the package version into every manifest
 *   node scripts/sync-plugin-versions.mjs --check  exit 1 when a manifest version differs
 *
 * Claude Code and Codex compare the manifest version to decide whether `plugin update` has anything
 * to install, so a manifest left behind keeps users on a stale cached copy.
 *
 * Manifests: `plugins/<name>/{.plugin,.claude-plugin,.codex-plugin}/plugin.json`. A symlinked
 * manifest is skipped; its target is handled directly.
 */

import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const check = process.argv.includes('--check')
const MANIFEST_DIRS = ['.plugin', '.claude-plugin', '.codex-plugin']

const stale = []
for (const name of readdirSync(join(root, 'plugins'))) {
	const pkgPath = join(root, 'plugins', name, 'package.json')
	if (!existsSync(pkgPath)) continue
	const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'))
	for (const dir of MANIFEST_DIRS) {
		const file = join(root, 'plugins', name, dir, 'plugin.json')
		if (!existsSync(file) || lstatSync(file).isSymbolicLink()) continue
		const text = readFileSync(file, 'utf8')
		const manifest = JSON.parse(text)
		if (manifest.version === version) continue
		const rel = file.slice(root.length + 1)
		stale.push(`${rel}: ${manifest.version ?? '(none)'} → ${version}`)
		if (!check) {
			const updated = text.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`)
			writeFileSync(file, updated === text ? `${JSON.stringify({ ...manifest, version }, null, '\t')}\n` : updated)
		}
	}
}

if (check && stale.length) {
	process.stderr.write(
		`plugin manifest versions differ from package.json:\n${stale.map((s) => `  ${s}`).join('\n')}\nhelp: run \`node scripts/sync-plugin-versions.mjs\`\n`,
	)
	process.exit(1)
}
process.stdout.write(
	stale.length ? `synced ${stale.length} manifest(s)\n${stale.join('\n')}\n` : 'plugin manifest versions match\n',
)
