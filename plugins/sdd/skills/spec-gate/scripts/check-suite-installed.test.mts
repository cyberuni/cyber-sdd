// check-suite as an installed plugin runs it. A plugin installs as its tracked files, with no
// node_modules, so this copies the plugin's files into a scratch dir outside the repo and runs the
// engine there. Both directions are asserted: an engine that cannot load its parser and an engine
// that waves every suite through would each fail one of them.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const root = mkdtempSync(join(tmpdir(), 'sdd-check-suite-installed-'))
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
	return join(plugin, 'skills/spec-gate/scripts/check-suite.mts')
}

const engine = installPlugin()

function run(feature: string) {
	const file = join(root, 'touched.feature')
	writeFileSync(file, feature)
	return spawnSync(process.execPath, [engine, '--files', file], { cwd: root, encoding: 'utf8' })
}

test('the installed plugin carries no node_modules to resolve a package from', () => {
	for (let dir = dirname(engine); dir !== dirname(dir); dir = dirname(dir)) {
		assert.ok(!existsSync(join(dir, 'node_modules')), `${dir} has a node_modules`)
	}
})

test('check-suite passes a well-formed suite from an installed plugin', () => {
	const r = run(
		['Feature: clean', '', '  Scenario: happy path', '    Given a thing', '    When it acts', '    Then it is ok'].join(
			'\n',
		),
	)
	assert.equal(r.status, 0, r.stderr)
	assert.match(r.stdout, /suite checks OK/)
})

test('check-suite fails an unparseable suite closed from an installed plugin', () => {
	const r = run(['Feature: broken', '', '  Scenario: a', '    Given a thing', '    Whenn it acts'].join('\n'))
	assert.equal(r.status, 1, r.stdout)
	assert.match(r.stderr, /cannot parse as Gherkin at line 5/)
})

test('the committed gherkin-cli bundle matches a fresh build of the pinned dependency', () => {
	const out = join(root, 'vendor')
	execFileSync(join(PKG, 'node_modules/.bin/tsdown'), ['-c', 'tsdown.vendor.config.ts'], {
		cwd: PKG,
		env: { ...process.env, VENDOR_OUT_DIR: out },
		stdio: 'ignore',
	})
	assert.equal(
		readFileSync(join(PKG, 'skills/spec-gate/vendor/gherkin-cli.mjs'), 'utf8'),
		readFileSync(join(out, 'gherkin-cli.mjs'), 'utf8'),
		'skills/spec-gate/vendor/gherkin-cli.mjs is stale: run `pnpm build:vendor`',
	)
})
