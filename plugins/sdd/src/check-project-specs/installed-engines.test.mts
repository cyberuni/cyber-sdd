// Every shipped skill engine, run the way an npm install runs it. Node will not strip types from
// a file under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), and a package manager
// that links a skill into the agent's skill directory leaves the real path inside node_modules.
// `universal-plugin plugin build` compiles each engine declared in plugin.json into one
// self-contained `skills/<skill>/scripts/<engine>.mjs`. This packs the package, installs the
// tarball under a node_modules, links each skill the way pnpm does, and runs every engine.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(join(PKG, 'plugin.json'), 'utf8'))
const scripts: Record<string, string> = manifest.extensions['org.cyberuni.universal-plugin'].scripts
const root = mkdtempSync(join(tmpdir(), 'sdd-installed-engines-'))
after(() => rmSync(root, { recursive: true, force: true }))

const installed = join(root, 'node_modules', pkg.name)
const work = join(root, 'work')

/** Every engine plugin.json declares, as `{ skill, name }`. */
const shipped = Object.keys(scripts).map((out) => {
	const [, skill, , file] = out.split('/') as [string, string, string, string]
	return { skill, name: file.replace(/\.mjs$/, '') }
})

function run(script: string, args: string[] = ['--help']) {
	return spawnSync(process.execPath, [script, ...args], { cwd: work, encoding: 'utf8', timeout: 60_000 })
}

function assertLoaded(label: string, res: ReturnType<typeof run>) {
	const err = res.stderr
	assert.doesNotMatch(err, /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/, `${label}: Node refused to strip types`)
	assert.doesNotMatch(err, /ERR_MODULE_NOT_FOUND|Cannot find (module|package)|SyntaxError/, `${label}: ${err}`)
	assert.ok(res.stdout.length + err.length > 0, `${label}: the engine printed nothing — its main guard did not fire`)
}

before(() => {
	mkdirSync(work, { recursive: true })
	execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', root], {
		cwd: PKG,
		stdio: 'ignore',
		shell: process.platform === 'win32',
	})
	const tarball = readdirSync(root).find((f) => f.endsWith('.tgz'))
	assert.ok(tarball, 'npm pack wrote no tarball')
	mkdirSync(installed, { recursive: true })
	execFileSync('tar', ['-xzf', join(root, tarball), '-C', installed, '--strip-components=1'])
})

test('every engine source is declared in plugin.json', () => {
	const sources = readdirSync(join(PKG, 'src'), { withFileTypes: true }).flatMap((d) =>
		d.isDirectory() && d.name !== 'vendor'
			? readdirSync(join(PKG, 'src', d.name))
					.filter((f) => f.endsWith('.mts') && !f.endsWith('.test.mts'))
					.map((f) => `src/${d.name}/${f}`)
			: [],
	)
	assert.deepEqual(Object.values(scripts).sort(), sources.sort())
})

test('the packed package ships a compiled script for every engine and no TypeScript', () => {
	assert.ok(shipped.length > 20, `expected many engines, found ${shipped.length}`)
	for (const out of Object.keys(scripts)) assert.ok(existsSync(join(installed, out)), `${out} is not in the tarball`)
	const ts: string[] = []
	const walk = (dir: string): void => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = join(dir, e.name)
			if (e.isDirectory()) walk(p)
			else if (/\.m?ts$/.test(e.name)) ts.push(p.slice(installed.length + 1))
		}
	}
	walk(installed)
	assert.deepEqual(ts, [])
})

test('every engine runs when its skill is linked from node_modules', () => {
	const skillsHome = join(root, '.claude', 'skills')
	mkdirSync(skillsHome, { recursive: true })
	for (const { skill, name } of shipped) {
		const link = join(skillsHome, `pnpm-${pkg.name}-${skill}`)
		if (!existsSync(link)) symlinkSync(join(installed, 'skills', skill), link, 'dir')
		assertLoaded(`${skill}/${name}`, run(join(link, 'scripts', `${name}.mjs`)))
	}
})

test('an engine that imports other skills runs from a copy of its own skill alone', () => {
	for (const skill of ['align-spec', 'blast-estimate', 'collision-ladder', 'manage-scenario-bridge']) {
		const alone = join(root, `alone-${skill}`)
		mkdirSync(alone, { recursive: true })
		cpSync(join(installed, 'skills', skill), join(alone, skill), { recursive: true })
		const name = shipped.find((e) => e.skill === skill)?.name as string
		assertLoaded(
			skill,
			run(join(alone, skill, 'scripts', `${name}.mjs`), name === 'collision-ladder' ? ['--from-git'] : []),
		)
	}
})

test('align-spec --help runs only its own CLI, not the CLIs it inlines', () => {
	const res = run(join(installed, 'skills/align-spec/scripts/align-spec.mjs'))
	assertLoaded('align-spec', res)
	assert.match(res.stdout, /^align-spec:/)
	// align-spec inlines check-spec-structure and classify-edit-class; neither may print.
	assert.doesNotMatch(res.stdout, /check-spec-structure|classify-edit-class|^specs\[/m)
})

test('an engine that spawns a sibling engine runs the compiled sibling', () => {
	const repo = join(root, 'repo')
	mkdirSync(repo, { recursive: true })
	execFileSync('git', ['init', '-q'], { cwd: repo })
	writeFileSync(join(repo, 'a.txt'), 'a')
	execFileSync('git', ['-c', 'user.email=t@e.x', '-c', 'user.name=t', 'add', '-A'], { cwd: repo })
	execFileSync('git', ['-c', 'user.email=t@e.x', '-c', 'user.name=t', 'commit', '-q', '-m', 'base'], { cwd: repo })
	const res = spawnSync(
		process.execPath,
		[join(installed, 'skills/touch-set-correction/scripts/touch-set-correction.mjs'), '--base', 'HEAD', '--root', repo],
		{ cwd: repo, encoding: 'utf8', timeout: 60_000 },
	)
	assertLoaded('touch-set-correction', res)
	assert.doesNotMatch(res.stderr, /\.mts/, 'a sibling engine was spawned from its .mts source')
})

test('no documented command runs an .mts engine directly', () => {
	const docs: string[] = []
	const walk = (dir: string) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = join(dir, e.name)
			if (e.isDirectory()) walk(p)
			else if (e.name.endsWith('.md')) docs.push(p)
		}
	}
	walk(join(installed, 'skills'))
	walk(join(installed, 'agents'))
	for (const doc of docs) {
		assert.doesNotMatch(readFileSync(doc, 'utf8'), /node [^|&;\n]*scripts\/[\w-]+\.mts/, `${doc} runs an .mts engine`)
	}
})
