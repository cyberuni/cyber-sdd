// touch-set-correction as an installed plugin runs it. A plugin installs as its tracked files,
// with no node_modules, so this copies the plugin's files into a scratch dir outside the repo and
// runs the engine there against a real git repo. The engine reads a touched suite's changed
// scenarios through the bundled differ, so the assertion names exactly the scenario the diff added
// and not the one it left alone: an engine that cannot load its differ crashes, and one that
// reports every scenario (or none) fails it.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const root = mkdtempSync(join(tmpdir(), 'sdd-touch-set-correction-installed-'))
after(() => rmSync(root, { recursive: true, force: true }))

function installPlugin() {
	const plugin = join(root, 'sdd')
	const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '.'], {
		cwd: PKG,
		encoding: 'utf8',
	})
		.split('\0')
		.filter((f) => f && existsSync(join(PKG, f)))
	for (const f of files) {
		mkdirSync(dirname(join(plugin, f)), { recursive: true })
		copyFileSync(join(PKG, f), join(plugin, f))
	}
	return join(plugin, 'skills/touch-set-correction/scripts/touch-set-correction.mts')
}

const engine = installPlugin()

function git(cwd: string, ...args: string[]) {
	return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

test('the installed plugin carries no node_modules to resolve a package from', () => {
	for (let dir = dirname(engine); dir !== dirname(dir); dir = dirname(dir)) {
		assert.ok(!existsSync(join(dir, 'node_modules')), `${dir} has a node_modules`)
	}
})

test('touch-set-correction records a touched suite’s changed scenarios from an installed plugin', () => {
	const dir = join(root, 'repo')
	const feature = join(dir, 'specs/p/cap/cap.feature')
	mkdirSync(dirname(feature), { recursive: true })
	git(dir, 'init', '-q')
	git(dir, 'config', 'user.email', 'test@example.com')
	git(dir, 'config', 'user.name', 'test')
	writeFileSync(
		feature,
		['@frozen', 'Feature: f', '', '  Scenario: one', '    Given a', '    When b', '    Then c', ''].join('\n'),
	)
	git(dir, 'add', '-A')
	git(dir, 'commit', '-q', '-m', 'base')
	appendFileSync(feature, ['', '  Scenario: two', '    Given a', '    When b', '    Then d', ''].join('\n'))
	git(dir, 'commit', '-q', '-am', 'head')

	const r = spawnSync(
		process.execPath,
		[engine, '--base', 'HEAD~1', '--layout', 'p:specs/p', '--declared', 'p/cap', '--format', 'json'],
		{ cwd: dir, encoding: 'utf8' },
	)
	assert.equal(r.status, 0, r.stderr)
	const correction = JSON.parse(r.stdout)
	assert.deepEqual(correction.corrected, ['p/cap'])
	assert.deepEqual(
		correction.nodes.map((n: { node: string; changedScenarios: string[] }) => [n.node, n.changedScenarios]),
		[['p/cap', ['two']]],
	)
})
