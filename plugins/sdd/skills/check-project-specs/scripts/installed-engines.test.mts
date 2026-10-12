// Every shipped skill engine, run the way an npm install runs it. Node will not strip types from
// a file under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), and a package manager
// that links a skill into the agent's skill directory leaves the real path inside node_modules.
// This packs the package, installs the tarball under a node_modules, links each skill the way pnpm
// does, and runs the command the skill documents.
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

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
const root = mkdtempSync(join(tmpdir(), 'sdd-installed-engines-'))
after(() => rmSync(root, { recursive: true, force: true }))

const installed = join(root, 'node_modules', pkg.name)
const work = join(root, 'work')

/** `<skill>/scripts/<engine>.mts` for every engine the source tree ships. */
function engines(skillsDir: string): { skill: string; name: string }[] {
	return readdirSync(skillsDir, { withFileTypes: true }).flatMap((skill) => {
		const scripts = join(skillsDir, skill.name, 'scripts')
		if (!skill.isDirectory() || !existsSync(scripts)) return []
		return readdirSync(scripts)
			.filter((f) => f.endsWith('.mts') && !f.endsWith('.test.mts') && !f.endsWith('.d.mts'))
			.map((f) => ({ skill: skill.name, name: f.slice(0, -'.mts'.length) }))
	})
}

const shipped = engines(join(PKG, 'skills'))

function run(script: string, args: string[] = ['--help']) {
	return spawnSync(process.execPath, [script, ...args], { cwd: work, encoding: 'utf8', timeout: 60_000 })
}

function assertLoaded(label: string, res: ReturnType<typeof run>) {
	const err = res.stderr
	assert.doesNotMatch(err, /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/, `${label}: Node refused to strip types`)
	assert.doesNotMatch(err, /ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError/, `${label}: ${err}`)
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

test('the packed package ships a launcher and a bundle for every engine', () => {
	assert.ok(shipped.length > 20, `expected many engines, found ${shipped.length}`)
	for (const { skill, name } of shipped) {
		const base = join(installed, 'skills', skill, 'scripts', name)
		assert.ok(existsSync(`${base}.mjs`), `no launcher for ${skill}/${name}`)
		assert.ok(existsSync(`${base}.bundle.mjs`), `no bundle for ${skill}/${name}`)
	}
})

test('every engine runs through its launcher when a skill is linked from node_modules', () => {
	const skillsHome = join(root, '.claude', 'skills')
	mkdirSync(skillsHome, { recursive: true })
	for (const { skill, name } of shipped) {
		const link = join(skillsHome, `pnpm-${pkg.name}-${skill}`)
		if (!existsSync(link)) symlinkSync(join(installed, 'skills', skill), link, 'dir')
		assertLoaded(`${skill}/${name}`, run(join(link, 'scripts', `${name}.mjs`)))
	}
})

test('the launcher falls through to the .mts source in a checkout', () => {
	const res = run(join(PKG, 'skills/discover-specs/scripts/discover-specs.mjs'), ['--root', join(PKG, '../..')])
	assert.equal(res.status, 0, res.stderr)
	assert.match(res.stdout, /^specs\[\d+\]/)
})

test('an engine that imports other skills runs from a copy of its own skill alone', () => {
	for (const skill of ['align-spec', 'blast-estimate', 'collision-ladder']) {
		const alone = join(root, `alone-${skill}`, 'node_modules', 'x', 'skills', skill)
		mkdirSync(dirname(alone), { recursive: true })
		cpSync(join(installed, 'skills', skill), alone, { recursive: true })
		const name = engines(join(installed, 'skills')).find((e) => e.skill === skill)?.name as string
		assertLoaded(skill, run(join(alone, 'scripts', `${name}.mjs`), name === 'collision-ladder' ? ['--from-git'] : []))
	}
})

test('an engine that spawns a sibling engine finds its bundle', () => {
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
