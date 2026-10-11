// The published `sdd-check-specs` bin, as a consumer gets it: pack the package, unpack it into a
// node_modules outside the repo, and run the bin from there. Node will not strip types under
// node_modules, so this is the check that the tarball carries a runnable harness AND that every
// engine it spawns resolves to a compiled file, never back into the .mts tree.
//
// Needs the built dist; `pnpm test` builds first.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ENGINES } from './check-project-specs.mts'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const REPO = join(PKG, '../..')
const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
const root = mkdtempSync(join(tmpdir(), 'sdd-check-specs-bin-'))
after(() => rmSync(root, { recursive: true, force: true }))

function shippedEngines(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = join(dir, entry.name)
		if (entry.isDirectory()) return shippedEngines(file)
		if (
			entry.isFile() &&
			entry.name.endsWith('.mts') &&
			!entry.name.endsWith('.test.mts') &&
			!entry.name.endsWith('.d.mts')
		)
			return [file]
		return []
	})
}

test('the packed sdd-check-specs bin runs every engine from a node_modules install', () => {
	execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', root], {
		cwd: PKG,
		stdio: 'ignore',
		shell: process.platform === 'win32',
	})
	const tarball = readdirSync(root).find((f) => f.endsWith('.tgz'))
	assert.ok(tarball, 'npm pack wrote no tarball')
	const installed = join(root, 'node_modules', pkg.name)
	mkdirSync(installed, { recursive: true })
	execFileSync('tar', ['-xzf', join(root, tarball), '-C', installed, '--strip-components=1'])

	const engines = shippedEngines(join(installed, 'skills'))
	assert.ok(engines.length > 15, `expected many shipped skill engines, found ${engines.length}`)
	for (const engine of engines)
		assert.ok(existsSync(engine.slice(0, -4) + '.js'), `compiled npm runtime is missing for ${engine}`)

	// Skill docs use this plain-JavaScript launcher to select source in a checkout and the compiled
	// sibling in node_modules, where Node refuses to strip TypeScript.
	const runner = join(installed, 'skills/run-engine.mjs')
	const engine = join(installed, 'skills/discover-specs/scripts/discover-specs.mts')
	const routed = spawnSync(process.execPath, [runner, engine, '--root', REPO], {
		cwd: REPO,
		encoding: 'utf8',
	})
	assert.equal(routed.status, 0, routed.stderr)
	assert.match(routed.stdout, /^specs\[\d+\]/, 'the launcher must run a compiled skill engine from node_modules')

	const skillDocs = shippedEngines(join(installed, 'skills')).map((file) => join(file, '../../SKILL.md'))
	for (const doc of new Set(skillDocs)) {
		if (!existsSync(doc)) continue
		assert.doesNotMatch(
			readFileSync(doc, 'utf8'),
			/node\s+"[^"\n]*scripts\/[^"\n]+\.mts"/,
			`raw .mts command remains in ${doc}`,
		)
	}

	// Runtime dependencies come from the workspace install, not the registry, so the check runs offline.
	for (const dep of Object.keys(pkg.dependencies ?? {})) {
		const link = join(root, 'node_modules', dep)
		mkdirSync(dirname(link), { recursive: true })
		const packageDep = join(PKG, 'node_modules', dep)
		const workspaceDep = join(REPO, 'node_modules', dep)
		const source = existsSync(packageDep) ? packageDep : workspaceDep
		assert.ok(existsSync(source), `runtime dependency is missing: ${dep}`)
		cpSync(source, link, { recursive: true, dereference: true })
	}

	// The engines resolve repo-relative references against the cwd, so the bin runs from the repo root
	// against this package's own spec — the same check `check:spec` runs from source.
	const r = spawnSync(process.execPath, [join(installed, pkg.bin['sdd-check-specs']), '--project', PKG], {
		cwd: REPO,
		encoding: 'utf8',
	})
	assert.equal(r.status, 0, r.stderr)
	for (const e of ENGINES) assert.match(r.stdout, new RegExp(`ok {3}${e.name}\\b`), `engine ${e.name} did not pass`)
})
