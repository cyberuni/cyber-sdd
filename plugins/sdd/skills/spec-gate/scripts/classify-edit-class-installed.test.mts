// classify-edit-class as an installed plugin runs it. A plugin installs as its tracked files, with
// no node_modules, so this copies the plugin's files into a scratch dir outside the repo and runs
// the engine there against a real git repo. Both directions are asserted: an engine that cannot
// load its differ crashes with no classification, and an engine that reads every edit as one
// constant class would fail one of them.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const root = mkdtempSync(join(tmpdir(), 'sdd-classify-edit-class-installed-'))
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
	return join(plugin, 'skills/spec-gate/scripts/classify-edit-class.mts')
}

const engine = installPlugin()
const FEATURE = 'specs/cap/cap.feature'

function git(cwd: string, ...args: string[]) {
	return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

// A repo whose frozen suite gained one whole scenario since the base commit.
function repoWithAddedScenario(name: string) {
	const dir = join(root, name)
	mkdirSync(join(dir, 'specs/cap'), { recursive: true })
	git(dir, 'init', '-q')
	git(dir, 'config', 'user.email', 'test@example.com')
	git(dir, 'config', 'user.name', 'test')
	writeFileSync(
		join(dir, FEATURE),
		['@frozen', 'Feature: f', '', '  Scenario: one', '    Given a', '    When b', '    Then c', ''].join('\n'),
	)
	git(dir, 'add', '-A')
	git(dir, 'commit', '-q', '-m', 'base')
	appendFileSync(join(dir, FEATURE), ['', '  Scenario: two', '    Given a', '    When b', '    Then d', ''].join('\n'))
	return dir
}

function run(cwd: string) {
	return spawnSync(process.execPath, [engine, '--files', FEATURE, '--base', 'HEAD'], { cwd, encoding: 'utf8' })
}

test('the installed plugin carries no node_modules to resolve a package from', () => {
	for (let dir = dirname(engine); dir !== dirname(dir); dir = dirname(dir)) {
		assert.ok(!existsSync(join(dir, 'node_modules')), `${dir} has a node_modules`)
	}
})

test('classify-edit-class classifies an added scenario as additive from an installed plugin', () => {
	const r = run(repoWithAddedScenario('additive'))
	assert.equal(r.status, 0, r.stderr)
	assert.match(r.stdout, /ADDITIVE\s+specs\/cap\/cap\.feature/)
	assert.match(r.stdout, /added\s+two/)
})

test('classify-edit-class reports an unparseable frozen file unclassifiable from an installed plugin', () => {
	const dir = repoWithAddedScenario('unparseable')
	appendFileSync(join(dir, FEATURE), '    Whenn x\n')
	const r = run(dir)
	assert.equal(r.status, 1, r.stdout)
	assert.match(r.stdout, /UNCLASSIFIABLE\s+specs\/cap\/cap\.feature/)
	assert.match(r.stderr, /unclassifiable — cannot parse/)
})
