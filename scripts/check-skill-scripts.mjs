#!/usr/bin/env node
/**
 * Fail when a committed skill script is behind its source.
 *
 *   node scripts/check-skill-scripts.mjs
 *
 * A plugin whose root `plugin.json` declares `extensions["org.cyberuni.universal-plugin"].scripts`
 * ships each script compiled by `universal-plugin plugin build`, and commits the output so a
 * git-sourced install carries it too. `plugin build --dry-run` reports each script as `unchanged`,
 * `missing`, `stale` or `version`, but exits 0 either way, so this script turns anything other than
 * `unchanged` into a failure (cyberuni/universal-plugin#191).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const behind = []
for (const name of readdirSync(join(root, 'plugins'))) {
	const dir = join(root, 'plugins', name)
	const manifestPath = join(dir, 'plugin.json')
	if (!existsSync(manifestPath)) continue
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
	if (!manifest.extensions?.['org.cyberuni.universal-plugin']?.scripts) continue
	const out = execFileSync('pnpm', ['exec', 'universal-plugin', 'plugin', 'build', '--dry-run', '--format', 'json'], {
		cwd: dir,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit'],
	})
	for (const s of JSON.parse(out).scripts ?? []) {
		if (s.status !== 'unchanged') behind.push(`plugins/${name}/${s.path}: ${s.status}`)
	}
}

if (behind.length) {
	process.stderr.write(
		`skill scripts differ from their source:\n${behind.map((s) => `  ${s}`).join('\n')}\nhelp: run \`pnpm --filter <package> build:skills\` and commit the result\n`,
	)
	process.exit(1)
}
process.stdout.write('skill scripts match their source\n')
