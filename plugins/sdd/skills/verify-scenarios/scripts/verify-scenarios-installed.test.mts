// verify-scenarios as an installed plugin runs it. A plugin installs as its tracked files, with no
// node_modules, so this copies the plugin's files into a scratch dir outside the repo and runs the
// engine there. Both directions are asserted: a fully bound suite exits clean, and a suite with an
// unbound scenario exits non-zero naming it. An engine that cannot load its parser crashes with no
// scenario set, and one that waves every suite through fails the second.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const root = mkdtempSync(join(tmpdir(), 'sdd-verify-scenarios-installed-'))
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
	return join(plugin, 'skills/verify-scenarios/scripts/verify-scenarios.mts')
}

const engine = installPlugin()

writeFileSync(
	join(root, 'cap.feature'),
	[
		'Feature: f',
		'',
		'  Scenario: one',
		'    Given a',
		'    When b',
		'    Then c',
		'',
		'  Scenario: two',
		'    Given a',
		'    When b',
		'    Then d',
		'',
	].join('\n'),
)

function run(boundNames: string[]) {
	const cases = boundNames.map((n) => `<testcase classname="x" name="spec:p/cap &gt; ${n}"/>`).join('')
	writeFileSync(join(root, 'report.xml'), `<testsuites><testsuite name="s">${cases}</testsuite></testsuites>`)
	return spawnSync(
		process.execPath,
		[engine, '--feature', 'cap.feature', '--node', 'p/cap', '--report', 'report.xml', '--root', root],
		{ cwd: root, encoding: 'utf8' },
	)
}

test('the installed plugin carries no node_modules to resolve a package from', () => {
	for (let dir = dirname(engine); dir !== dirname(dir); dir = dirname(dir)) {
		assert.ok(!existsSync(join(dir, 'node_modules')), `${dir} has a node_modules`)
	}
})

test('verify-scenarios passes a fully bound suite from an installed plugin', () => {
	const r = run(['one', 'two'])
	assert.equal(r.status, 0, r.stderr)
	assert.match(r.stdout, /PASS\s+one/)
	assert.match(r.stdout, /PASS\s+two/)
})

test('verify-scenarios fails a suite with an unbound scenario from an installed plugin', () => {
	const r = run(['one'])
	assert.equal(r.status, 1, r.stderr)
	assert.match(r.stdout, /PASS\s+one/)
	assert.match(r.stdout, /UNBOUND\s+two/)
})
