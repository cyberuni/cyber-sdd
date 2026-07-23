import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	exitCode,
	foldResults,
	formatText,
	formatToon,
	getScenarioKeys,
	junitResultsFromXml,
	junitTestcaseToResult,
	main,
	parseJUnitTestcases,
	parseSourcesToml,
	readSourcesConfig,
	renderReport,
	resolveSources,
	runSource,
	scenarioKeysFromParse,
	underRoot,
	unescapeXml,
} from './verify-scenarios.mts'

// ── config parsing ──

test('parseSourcesToml reads one [[source]] block into a SourceConfig', () => {
	const toml = `
[[source]]
adapter    = "junit"
command    = "vitest run --reporter=junit --outputFile=report.xml"
reportPath = "report.xml"
`
	assert.deepEqual(parseSourcesToml(toml), [
		{ adapter: 'junit', command: 'vitest run --reporter=junit --outputFile=report.xml', reportPath: 'report.xml' },
	])
})

test('parseSourcesToml reads multiple [[source]] blocks', () => {
	const toml = `
[[source]]
adapter    = "junit"
reportPath = "a.xml"

[[source]]
adapter    = "junit"
reportPath = "b.xml"
`
	assert.deepEqual(parseSourcesToml(toml), [
		{ adapter: 'junit', command: undefined, reportPath: 'a.xml' },
		{ adapter: 'junit', command: undefined, reportPath: 'b.xml' },
	])
})

test('parseSourcesToml drops a block missing adapter or reportPath', () => {
	const toml = `
[[source]]
adapter = "junit"
`
	assert.deepEqual(parseSourcesToml(toml), [])
})

test('parseSourcesToml on empty/absent config yields []', () => {
	assert.deepEqual(parseSourcesToml(''), [])
	assert.deepEqual(parseSourcesToml('# nothing here\n'), [])
})

test('parseSourcesToml drops a block missing its adapter even when reportPath is present', () => {
	const toml = `
[[source]]
reportPath = "report.xml"
`
	assert.deepEqual(parseSourcesToml(toml), [])
})

test('readSourcesConfig on an absent config file returns [] without throwing', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		assert.deepEqual(readSourcesConfig(join(dir, 'does-not-exist.toml')), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── scenario keys from gherkin-cli JSON ──

test('scenarioKeysFromParse keys a plain scenario on its verbatim name', () => {
	const parsed = {
		files: [
			{
				scenarios: [{ name: 'register writes the agent record', keyword: 'Scenario', tags: [] }],
			},
		],
	}
	assert.deepEqual(scenarioKeysFromParse(parsed), [
		{ name: 'register writes the agent record', key: 'register writes the agent record' },
	])
})

test('scenarioKeysFromParse keys on the @id: tag when present, overriding the name', () => {
	const parsed = {
		files: [
			{
				scenarios: [
					{ name: 'a long scenario name that might get renamed', keyword: 'Scenario', tags: ['@id:register-basic'] },
				],
			},
		],
	}
	assert.deepEqual(scenarioKeysFromParse(parsed), [
		{ name: 'a long scenario name that might get renamed', key: 'register-basic' },
	])
})

test('scenarioKeysFromParse treats a Scenario Outline as one key (its outline name)', () => {
	const parsed = {
		files: [
			{
				scenarios: [{ name: 'the current multiplexer pane keys self-identity', keyword: 'Scenario Outline', tags: [] }],
			},
		],
	}
	assert.deepEqual(scenarioKeysFromParse(parsed), [
		{ name: 'the current multiplexer pane keys self-identity', key: 'the current multiplexer pane keys self-identity' },
	])
})

test('scenarioKeysFromParse ignores non-@id tags', () => {
	const parsed = {
		files: [{ scenarios: [{ name: 'tagged but not id-tagged', keyword: 'Scenario', tags: ['@frozen'] }] }],
	}
	assert.deepEqual(scenarioKeysFromParse(parsed), [
		{ name: 'tagged but not id-tagged', key: 'tagged but not id-tagged' },
	])
})

// ── XML entity unescaping ──

test('unescapeXml unescapes all five entities, & last to avoid double-unescaping', () => {
	assert.equal(unescapeXml('this session&apos;s own identity'), "this session's own identity")
	assert.equal(unescapeXml('&lt;tag&gt; &quot;quoted&quot; &amp; more'), '<tag> "quoted" & more')
	assert.equal(unescapeXml('&amp;lt;'), '&lt;') // literal ampersand-lt sequence, not double-unescaped
})

// ── junit testcase parsing ──

test('parseJUnitTestcases reads a self-closed passing testcase', () => {
	const xml = `<testsuite><testcase classname="src/identity.test.ts" name="spec:cyberlegion/identity > register writes the agent record" time="0.01"/></testsuite>`
	assert.deepEqual(parseJUnitTestcases(xml), [
		{
			classname: 'src/identity.test.ts',
			name: 'spec:cyberlegion/identity > register writes the agent record',
			outcome: 'pass',
		},
	])
})

test('parseJUnitTestcases reads a paired testcase with a <failure> child as fail', () => {
	const xml = `<testsuite><testcase classname="c" name="spec:x > y"><failure message="boom">stack</failure></testcase></testsuite>`
	assert.equal(parseJUnitTestcases(xml)[0].outcome, 'fail')
})

test('parseJUnitTestcases reads a testcase with a <skipped> child as skip', () => {
	const xml = `<testsuite><testcase classname="c" name="spec:x > y"><skipped/></testcase></testsuite>`
	assert.equal(parseJUnitTestcases(xml)[0].outcome, 'skip')
})

test('parseJUnitTestcases reads a paired testcase with no failure/skipped child as pass', () => {
	const xml = `<testsuite><testcase classname="c" name="spec:x > y"></testcase></testsuite>`
	assert.equal(parseJUnitTestcases(xml)[0].outcome, 'pass')
})

test('parseJUnitTestcases extracts classname and name by attribute name, unescaping both', () => {
	const xml = `<testsuite><testcase time="0.02" classname="a &amp; b" name="spec:x > this session&apos;s own identity"/></testsuite>`
	const [tc] = parseJUnitTestcases(xml)
	assert.equal(tc.classname, 'a & b')
	assert.equal(tc.name, "spec:x > this session's own identity")
})

test('parseJUnitTestcases finds multiple testcases in one report', () => {
	const xml = `<testsuite>
<testcase classname="a" name="spec:x > one"/>
<testcase classname="a" name="spec:x > two"><failure>boom</failure></testcase>
</testsuite>`
	const tcs = parseJUnitTestcases(xml)
	assert.equal(tcs.length, 2)
	assert.deepEqual(
		tcs.map((t) => t.outcome),
		['pass', 'fail'],
	)
})

// ── node/key extraction from a testcase name ──

test('junitTestcaseToResult finds the spec: node segment at any depth and keys on the leaf', () => {
	const tc = {
		classname: 'c',
		name: 'outer > spec:cyberlegion/identity > register writes the agent record',
		outcome: 'pass' as const,
	}
	assert.deepEqual(junitTestcaseToResult(tc), {
		node: 'cyberlegion/identity',
		key: 'register writes the agent record',
		outcome: 'pass',
	})
})

test('junitTestcaseToResult drops a testcase whose name has no spec: segment', () => {
	const tc = { classname: 'c', name: 'some describe > a leaf with no node', outcome: 'pass' as const }
	assert.equal(junitTestcaseToResult(tc), undefined)
})

test("junitTestcaseToResult keys on the leaf's @id: tag when the leaf uses the escape hatch", () => {
	const tc = { classname: 'c', name: 'spec:cyberlegion/identity > @id:register-basic', outcome: 'pass' as const }
	assert.deepEqual(junitTestcaseToResult(tc), { node: 'cyberlegion/identity', key: 'register-basic', outcome: 'pass' })
})

test("junitTestcaseToResult treats a Scenario Outline's static it.each title as one key regardless of row", () => {
	const tc1 = {
		classname: 'c',
		name: 'spec:cyberlegion/identity > the current multiplexer pane keys self-identity',
		outcome: 'pass' as const,
	}
	const tc2 = {
		classname: 'c',
		name: 'spec:cyberlegion/identity > the current multiplexer pane keys self-identity',
		outcome: 'pass' as const,
	}
	assert.equal(junitTestcaseToResult(tc1)?.key, junitTestcaseToResult(tc2)?.key)
})

test('junitResultsFromXml end-to-end: unescapes, extracts node/key, drops unbound testcases', () => {
	const xml = `<testsuite>
<testcase classname="a" name="spec:cyberlegion/identity > whoami prints this session&apos;s own identity"/>
<testcase classname="a" name="not a spec describe > some other leaf"/>
</testsuite>`
	assert.deepEqual(junitResultsFromXml(xml), [
		{ node: 'cyberlegion/identity', key: "whoami prints this session's own identity", outcome: 'pass' },
	])
})

// ── fold ──

test('foldResults: no matching result -> UNBOUND', () => {
	const keys = [{ name: 'a', key: 'a' }]
	const report = foldResults(keys, [], 'node/x')
	assert.equal(report.scenarios[0].state, 'unbound')
	assert.equal(report.unbound, 1)
	assert.equal(report.bound, 0)
})

test('foldResults: one passing result for the node -> PASS', () => {
	const keys = [{ name: 'a', key: 'a' }]
	const results = [{ node: 'node/x', key: 'a', outcome: 'pass' as const }]
	const report = foldResults(keys, results, 'node/x')
	assert.equal(report.scenarios[0].state, 'pass')
	assert.equal(report.pass, 1)
})

test('foldResults: any failing result among multiple for one key -> FAIL', () => {
	const keys = [{ name: 'a', key: 'a' }]
	const results = [
		{ node: 'node/x', key: 'a', outcome: 'pass' as const },
		{ node: 'node/x', key: 'a', outcome: 'fail' as const },
	]
	const report = foldResults(keys, results, 'node/x')
	assert.equal(report.scenarios[0].state, 'fail')
	assert.equal(report.fail, 1)
})

test('foldResults: results from another node are excluded entirely', () => {
	const keys = [{ name: 'a', key: 'a' }]
	const results = [{ node: 'other/node', key: 'a', outcome: 'pass' as const }]
	const report = foldResults(keys, results, 'node/x')
	assert.equal(report.scenarios[0].state, 'unbound')
})

test('foldResults: a bound result matching no scenario key is reported as an EXTRA, not a failure', () => {
	const keys = [{ name: 'a', key: 'a' }]
	const results = [
		{ node: 'node/x', key: 'a', outcome: 'pass' as const },
		{ node: 'node/x', key: 'orphan', outcome: 'pass' as const },
	]
	const report = foldResults(keys, results, 'node/x')
	assert.deepEqual(report.extras, ['orphan'])
	assert.equal(report.fail, 0)
	assert.equal(report.unbound, 0)
})

test('foldResults totals: bound = pass + fail, total = feature scenario count', () => {
	const keys = [
		{ name: 'a', key: 'a' },
		{ name: 'b', key: 'b' },
		{ name: 'c', key: 'c' },
	]
	const results = [
		{ node: 'x', key: 'a', outcome: 'pass' as const },
		{ node: 'x', key: 'b', outcome: 'fail' as const },
	]
	const report = foldResults(keys, results, 'x')
	assert.equal(report.total, 3)
	assert.equal(report.bound, 2)
	assert.equal(report.unbound, 1)
})

// ── output formatting (smoke) ──

test('formatToon emits the TOON header/row shape', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'pass' as const }], 'x')
	const out = formatToon(report)
	assert.match(out, /^scenarios\[1\]\{name,key,state,resultCount\}:/)
	assert.match(out, /summary\{node,total,bound,pass,fail,unbound\}:/)
})

// ── union across sources ──

test('results from every configured source are unioned before the fold', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		writeFileSync(
			join(dir, 'a.xml'),
			`<testsuite><testcase classname="c" name="spec:node/x > scenario a"/></testsuite>`,
		)
		writeFileSync(
			join(dir, 'b.xml'),
			`<testsuite><testcase classname="c" name="spec:node/x > scenario b"/></testsuite>`,
		)
		const sources = [
			{ adapter: 'junit', reportPath: 'a.xml' },
			{ adapter: 'junit', reportPath: 'b.xml' },
		]
		const results = sources.flatMap((s) => runSource(s, dir, false))
		const report = foldResults(
			[
				{ name: 'scenario a', key: 'scenario a' },
				{ name: 'scenario b', key: 'scenario b' },
			],
			results,
			'node/x',
		)
		assert.equal(report.pass, 2)
		assert.equal(report.unbound, 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── resolveSources ──

test('resolveSources: --report bypasses the configured sources with one ad-hoc junit source', () => {
	const sources = resolveSources(['--report', 'x.xml'], '.')
	assert.deepEqual(sources, [{ adapter: 'junit', reportPath: 'x.xml' }])
})

test('resolveSources: without --report it reads the sources config', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		writeFileSync(join(dir, 'scenario-bridge.toml'), `[[source]]\nadapter = "junit"\nreportPath = "report.xml"\n`)
		const sources = resolveSources(['--config', 'scenario-bridge.toml'], dir)
		assert.deepEqual(sources, [{ adapter: 'junit', command: undefined, reportPath: 'report.xml' }])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── runSource: run flag ──

test('the run flag executes each source command before reading its report', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		const source = {
			adapter: 'junit',
			command: `node -e "require('fs').writeFileSync('report.xml', '<testsuite><testcase classname=\\"c\\" name=\\"spec:node/x > scenario a\\"/></testsuite>')"`,
			reportPath: 'report.xml',
		}
		const results = runSource(source, dir, true)
		assert.deepEqual(results, [{ node: 'node/x', key: 'scenario a', outcome: 'pass' }])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('without the run flag an existing report is read as-is, without executing the command', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		writeFileSync(
			join(dir, 'report.xml'),
			`<testsuite><testcase classname="c" name="spec:node/x > scenario a"/></testsuite>`,
		)
		const source = { adapter: 'junit', command: 'exit 1', reportPath: 'report.xml' }
		const results = runSource(source, dir, false)
		assert.deepEqual(results, [{ node: 'node/x', key: 'scenario a', outcome: 'pass' }])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── path resolution ──

test('underRoot: a relative path joins beneath root', () => {
	assert.equal(underRoot('/a/b', 'c/d.feature'), join('/a/b', 'c/d.feature'))
	assert.equal(underRoot('.', 'report.xml'), join('.', 'report.xml'))
})

test('underRoot: an absolute path is used verbatim, not double-prefixed under root', () => {
	assert.equal(underRoot('/a/b', '/x/y.feature'), '/x/y.feature')
	assert.equal(underRoot('some/other/root', '/x/y.feature'), '/x/y.feature')
})

test('runSource: an absolute reportPath is read even when root differs, not double-prefixed', () => {
	const reportDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-report-'))
	const rootDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-root-'))
	try {
		const absReport = join(reportDir, 'report.xml')
		writeFileSync(absReport, `<testsuite><testcase classname="c" name="spec:node/x > scenario a"/></testsuite>`)
		// root points elsewhere; a naive join(root, absReport) would double-prefix and find nothing.
		const results = runSource({ adapter: 'junit', reportPath: absReport }, rootDir, false)
		assert.deepEqual(results, [{ node: 'node/x', key: 'scenario a', outcome: 'pass' }])
	} finally {
		rmSync(reportDir, { recursive: true, force: true })
		rmSync(rootDir, { recursive: true, force: true })
	}
})

test('every root-relative resolution goes through underRoot — no bare join(root, …) survives at a call site', () => {
	// underRoot is the only sanctioned place to join a path against root; a call site (getScenarioKeys /
	// runJunitSource / resolveSources) regressing to a bare join(root, …) reintroduces the #108
	// double-prefix bug. getScenarioKeys shells gherkin-cli, so this source-scan guards it too.
	const src = readFileSync(new URL('./verify-scenarios.mts', import.meta.url), 'utf8')
	const bareJoins = src.match(/join\(\s*root\b/g) ?? []
	assert.equal(bareJoins.length, 1, 'join(root, …) must appear only inside underRoot')
})

// ── Monorepo rooting (feature-root vs. bridge/report-root) ──

test('getScenarioKeys: a feature-root argument resolves --feature beneath it instead of --root', () => {
	const featureDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-feature-'))
	const rootDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-root-'))
	try {
		writeFileSync(join(featureDir, 'x.feature'), 'Feature: x\n  Scenario: one\n    Given a\n    When b\n    Then c\n')
		// featureRoot distinct from root: only underRoot(featureRoot, 'x.feature') resolves to a real file.
		const keys = getScenarioKeys(rootDir, 'x.feature', featureDir)
		assert.deepEqual(keys, [{ name: 'one', key: 'one' }])
	} finally {
		rmSync(featureDir, { recursive: true, force: true })
		rmSync(rootDir, { recursive: true, force: true })
	}
})

test('getScenarioKeys: without feature-root, --feature falls back to resolving beneath root (same as before feature-root existed)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'verify-scenarios-'))
	try {
		writeFileSync(join(dir, 'x.feature'), 'Feature: x\n  Scenario: one\n    Given a\n    When b\n    Then c\n')
		// no third argument -> featureRoot defaults to root
		const keys = getScenarioKeys(dir, 'x.feature')
		assert.deepEqual(keys, [{ name: 'one', key: 'one' }])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the config default path, --report, and every source reportPath stay rooted under --root regardless of --feature-root', () => {
	// resolveSources and runSource both take only `root`, never `featureRoot` — confirmed structurally:
	// no call site in the source threads featureRoot into underRoot for config/report/reportPath.
	const src = readFileSync(new URL('./verify-scenarios.mts', import.meta.url), 'utf8')
	const configLine = src.match(/const configPath = underRoot\(([^,]+),/)
	const reportLine = src.match(/const reportPath = underRoot\(([^,]+),/)
	assert.ok(configLine && configLine[1].trim() === 'root', 'config path resolves under root, not featureRoot')
	assert.ok(reportLine && reportLine[1].trim() === 'root', 'source reportPath resolves under root, not featureRoot')
})

test('main: a relative --report resolves beneath --root, not --feature-root, and binds a passing scenario', () => {
	// End-to-end through main()'s own wiring (not just the callees) — a relative --report seeded only
	// under rootDir must be found even though featureDir (holding the .feature) is a different root.
	const featureDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-feature-'))
	const rootDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-root-'))
	try {
		writeFileSync(join(featureDir, 'x.feature'), 'Feature: x\n  Scenario: one\n    Given a\n    When b\n    Then c\n')
		writeFileSync(join(rootDir, 'report.xml'), '<testsuite><testcase classname="c" name="spec:n/x > one"/></testsuite>')
		// report.xml exists only under rootDir; if main() mistakenly resolved --report under featureRoot
		// instead of root, the file would not be found and the scenario would come back UNBOUND (exit 1).
		const code = main([
			'--feature',
			'x.feature',
			'--node',
			'n/x',
			'--root',
			rootDir,
			'--feature-root',
			featureDir,
			'--report',
			'report.xml',
		])
		assert.equal(code, 0, 'the one scenario is BOUND + passing — report.xml was found under --root')
	} finally {
		rmSync(featureDir, { recursive: true, force: true })
		rmSync(rootDir, { recursive: true, force: true })
	}
})

test('main: --feature-root is threaded to getScenarioKeys, distinct from --root', () => {
	const featureDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-feature-'))
	const rootDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-root-'))
	try {
		writeFileSync(join(featureDir, 'x.feature'), 'Feature: x\n  Scenario: one\n    Given a\n    When b\n    Then c\n')
		writeFileSync(join(rootDir, 'x.feature'), 'this is not a valid feature and would fail to parse')
		const code = main([
			'--feature',
			'x.feature',
			'--node',
			'n/x',
			'--root',
			rootDir,
			'--feature-root',
			featureDir,
			'--report',
			join(rootDir, 'does-not-exist.xml'),
		])
		// exits non-zero (UNBOUND scenario), proving it parsed featureDir's x.feature, not rootDir's malformed one
		assert.equal(code, 1)
	} finally {
		rmSync(featureDir, { recursive: true, force: true })
		rmSync(rootDir, { recursive: true, force: true })
	}
})

test('an absolute --feature path is used verbatim even with a distinct feature-root', () => {
	const featureDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-feature-'))
	const otherDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-other-'))
	try {
		const absFeature = join(featureDir, 'x.feature')
		writeFileSync(absFeature, 'Feature: x\n  Scenario: one\n    Given a\n    When b\n    Then c\n')
		// featureRoot points elsewhere; a naive join(featureRoot, absFeature) would double-prefix and find nothing.
		const keys = getScenarioKeys(otherDir, absFeature, otherDir)
		assert.deepEqual(keys, [{ name: 'one', key: 'one' }])
	} finally {
		rmSync(featureDir, { recursive: true, force: true })
		rmSync(otherDir, { recursive: true, force: true })
	}
})

test('resolveSources: an absolute --config is read even when root differs, not double-prefixed', () => {
	const configDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-config-'))
	const rootDir = mkdtempSync(join(tmpdir(), 'verify-scenarios-root-'))
	try {
		const absConfig = join(configDir, 'scenario-bridge.toml')
		writeFileSync(absConfig, `[[source]]\nadapter = "junit"\nreportPath = "report.xml"\n`)
		const sources = resolveSources(['--config', absConfig], rootDir)
		assert.deepEqual(sources, [{ adapter: 'junit', command: undefined, reportPath: 'report.xml' }])
	} finally {
		rmSync(configDir, { recursive: true, force: true })
		rmSync(rootDir, { recursive: true, force: true })
	}
})

// ── renderReport ──

test('renderReport: no format or an unknown format renders formatText(report)', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'pass' as const }], 'x')
	assert.equal(renderReport(report, 'text'), formatText(report))
	assert.equal(renderReport(report, 'nonsense'), formatText(report))
})

test('renderReport: json renders JSON.stringify(report, null, 2)', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'pass' as const }], 'x')
	assert.equal(renderReport(report, 'json'), JSON.stringify(report, null, 2))
})

test('renderReport: toon renders formatToon(report)', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'pass' as const }], 'x')
	assert.equal(renderReport(report, 'toon'), formatToon(report))
})

// ── exitCode ──

test('exitCode: any UNBOUND scenario exits non-zero', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [], 'x')
	assert.equal(exitCode(report), 1)
})

test('exitCode: any FAIL scenario exits non-zero', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'fail' as const }], 'x')
	assert.equal(exitCode(report), 1)
})

test('exitCode: every scenario bound and passing exits zero', () => {
	const report = foldResults([{ name: 'a', key: 'a' }], [{ node: 'x', key: 'a', outcome: 'pass' as const }], 'x')
	assert.equal(exitCode(report), 0)
})

// ── CLI usage guard ──

test('a missing feature or node argument prints usage and exits non-zero', () => {
	assert.equal(main(['--report', 'x.xml']), 1)
	assert.equal(main(['--feature', 'f.feature']), 1)
	assert.equal(main(['--node', 'a/b']), 1)
})

// ── boundaries ──

test('the engine writes nothing to the filesystem', () => {
	const src = readFileSync(new URL('./verify-scenarios.mts', import.meta.url), 'utf8')
	assert.doesNotMatch(src, /\bwriteFileSync\b/)
	assert.doesNotMatch(src, /\bappendFileSync\b/)
	assert.doesNotMatch(src, /\bmkdirSync\b/)
	assert.doesNotMatch(src, /\bwriteFile\b/)
	assert.doesNotMatch(src, /\brmSync\b/)
})

test('the scenario set comes from gherkin-cli, not a re-implemented parser', () => {
	const src = readFileSync(new URL('./verify-scenarios.mts', import.meta.url), 'utf8')
	assert.match(src, /from 'gherkin-cli'/)
	assert.doesNotMatch(src, /Feature:\s|Scenario:\s/)
})
