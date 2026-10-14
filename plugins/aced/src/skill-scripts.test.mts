// skill-scripts — every ACED skill script ships compiled and runs from its own skill folder.
//
// Node refuses to strip types from a file under node_modules, and pnpm links each skill of a
// dependency into the agent's skill directory one folder at a time (falling back to a copy). So a
// skill that runs `.mts`, or reaches outside its own folder, fails when it arrives from npm. The
// sources live in `src/`; `universal-plugin plugin build` compiles each entry declared in
// `plugin.json` into one self-contained `skills/<skill>/scripts/<engine>.mjs`, which is committed.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

const PLUGIN_ROOT = new URL('../', import.meta.url).pathname.replace(/\/$/, '')
const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'plugin.json'), 'utf8'))
const scripts: Record<string, string> = manifest.extensions['org.cyberuni.universal-plugin'].scripts

/** Arguments that reach each engine's own CLI without side effects (usage text or a read-only run). */
const PROBE: Record<string, string[]> = {
	'skills/bench/scripts/bench.mjs': ['--help'],
	'skills/check-freshness/scripts/check-freshness.mjs': [],
	'skills/contribute-skill/scripts/source.mjs': [],
	'skills/extract-situation/scripts/extract-situation.mjs': [],
	'skills/improve-skill/scripts/validate.mjs': ['--help'],
	'skills/init-aced/scripts/ensure-results-ignored.mjs': [],
	'skills/list-skills/scripts/list-skills.mjs': ['--grep', 'no-such-skill-anywhere'],
	'skills/manage-skill-dirs/scripts/manage-skill-dirs.mjs': ['--help'],
	'skills/repair-private-skills/scripts/repair-private-skills.mjs': [],
}

const work = mkdtempSync(join(tmpdir(), 'aced-skill-scripts-'))
after(() => rmSync(work, { recursive: true, force: true }))

test('every declared script is committed and has a probe', () => {
	assert.deepEqual(Object.keys(scripts).sort(), Object.keys(PROBE).sort())
	for (const [out, source] of Object.entries(scripts)) {
		assert.ok(existsSync(join(PLUGIN_ROOT, out)), `${out} is missing: run \`pnpm build:skills\``)
		assert.ok(existsSync(join(PLUGIN_ROOT, source)), `${source} does not exist`)
	}
})

test('no skill folder ships TypeScript', () => {
	const ts: string[] = []
	const walk = (dir: string): void => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, e.name)
			if (e.isDirectory()) walk(full)
			else if (/\.m?ts$/.test(e.name)) ts.push(full.slice(PLUGIN_ROOT.length + 1))
		}
	}
	walk(join(PLUGIN_ROOT, 'skills'))
	assert.deepEqual(ts, [])
})

test('no skill or agent doc runs a .mts engine', () => {
	const offenders: string[] = []
	for (const dir of ['skills', 'agents']) {
		const walk = (d: string): void => {
			for (const e of readdirSync(d, { withFileTypes: true })) {
				const full = join(d, e.name)
				if (e.isDirectory()) walk(full)
				else if (e.name.endsWith('.md') && /scripts\/[\w-]+\.mts/.test(readFileSync(full, 'utf8'))) {
					offenders.push(full.slice(PLUGIN_ROOT.length + 1))
				}
			}
		}
		walk(join(PLUGIN_ROOT, dir))
	}
	assert.deepEqual(offenders, [])
})

for (const [out, args] of Object.entries(PROBE)) {
	test(`${out} runs from a lone copy of its skill under node_modules`, () => {
		const skill = out.split('/')[1] as string
		const home = join(work, skill)
		const dest = join(home, 'node_modules', 'cyber-aced', 'skills', skill)
		mkdirSync(dest, { recursive: true })
		cpSync(join(PLUGIN_ROOT, 'skills', skill), dest, { recursive: true })
		const r = spawnSync(process.execPath, [join(home, 'node_modules', 'cyber-aced', out), ...args], {
			cwd: home,
			encoding: 'utf8',
			timeout: 30_000,
		})
		assert.doesNotMatch(r.stderr, /ERR_|Cannot find (module|package)/, r.stderr)
		assert.ok(r.status === 0 || r.status === 1, `exit ${r.status}: ${r.stderr}`)
		assert.ok(`${r.stdout}${r.stderr}`.trim().length > 0, 'the CLI must reach main() and print')
	})
}
