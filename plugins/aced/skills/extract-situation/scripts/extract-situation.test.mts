// This suite exists to prove the answer key never reaches a simulating context, so most of it is
// negative assertions. A negative assertion is satisfied by the NULL output — `doesNotMatch('', /X/)`
// is true — so it can never, alone, prove the mechanism ran. It went vacuous twice here:
//
//   - by output: `formatTable` returning '' kept every Examples assertion green, because empty output
//     contains no forbidden string. Every outline row would then simulate against the literal
//     "<query>", collapsing to one identical simulation.
//   - by fixture: a rubric sentinel sat on `dimension: ANSWERKEY_SENTINEL` — a line that never opens
//     with a step keyword, so the parser had no chance to misread it. A LEAKING engine passed 15/15.
//     A sentinel is only as good as its position.
//
// So: pair every negative with a positive on the same output. `doesNotMatch(out, /should_trigger/)`
// AND `match(out, /commit my work/)`. The positive half has no trivial satisfier. Before adding a
// test here, ask what the laziest thing that passes it is; if the answer is "doing nothing", it is
// not binding. Then ablate — flip the engine to leak and watch it go red. An un-ablated negative is
// a hope, not a test.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	AmbiguousScenarioError,
	EmptySituationError,
	extractSituation,
	formatJson,
	formatMarkdown,
	main,
	parseScenarios,
	RowOutOfRangeError,
	ScenarioNotFoundError,
	UnparseableFeatureError,
} from './extract-situation.mts'

function tmpFeature(text: string): { dir: string; path: string } {
	const dir = mkdtempSync(join(tmpdir(), 'extract-situation-'))
	const path = join(dir, 'x.feature')
	writeFileSync(path, text)
	return { dir, path }
}

// ─── parseScenarios — keyword resolution ───────────────────────────────────────

test('parseScenarios resolves an And after a Given as a Given', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    And another condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const [s] = parseScenarios(text)
	assert.equal(s.steps[1].effectiveKeyword, 'Given')
})

test('parseScenarios resolves an And after a Then as a Then (excluded from the situation)', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
		'    And a second assertion',
	].join('\n')
	const [s] = parseScenarios(text)
	const last = s.steps[s.steps.length - 1]
	assert.equal(last.effectiveKeyword, 'Then')
})

// ─── extractSituation — plain scenario ─────────────────────────────────────────

test('a plain scenario extracts Given/When only', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: happy path',
		'    Given the service is running',
		'    When the user acts',
		'    Then the response is ok',
	].join('\n')
	const situation = extractSituation(text, 'happy path', 'x.feature')
	assert.deepEqual(situation.given, ['Given the service is running'])
	assert.deepEqual(situation.when, ['When the user acts'])
})

// ─── the keyword-inheritance case — Then + And after it are excluded ──────────

test('Then and a following And are excluded from the output', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: multi-assert',
		'    Given the service is running',
		'    When the user acts',
		'    Then the response is "ANSWERKEY_THEN"',
		'    And the status code is 200',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'multi-assert', 'x.feature'))
	assert.ok(!out.includes('ANSWERKEY_THEN'))
	assert.ok(!out.includes('status code is 200'))
})

// ─── inline @rubric docstring is excluded ──────────────────────────────────────

test('an inline @rubric docstring is excluded — no dimension name, max:, or threshold: leaks', () => {
	const text = [
		'Feature: f',
		'',
		'  @rubric',
		'  Scenario: scored behavior',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge scores it',
		'    """',
		'    dimension: clarity',
		'    max: 5',
		'    threshold: 3',
		'    """',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'scored behavior', 'x.feature'))
	assert.ok(!out.includes('dimension'))
	assert.ok(!out.includes('max:'))
	assert.ok(!out.includes('threshold:'))
})

// ─── the scenario name never appears ───────────────────────────────────────────

test('the scenario name does not appear in the output', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: SECRET_SCENARIO_NAME',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'SECRET_SCENARIO_NAME', 'x.feature'))
	assert.ok(!out.includes('SECRET_SCENARIO_NAME'))
})

// ─── sibling scenarios never leak ──────────────────────────────────────────────

test('other scenarios in the file do not leak', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: target',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
		'',
		'  Scenario: sibling',
		'    Given SIBLING_ONLY_TEXT',
		'    When something else',
		'    Then a different result',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'target', 'x.feature'))
	assert.ok(!out.includes('SIBLING_ONLY_TEXT'))
})

// ─── tags never leak ────────────────────────────────────────────────────────────

test('tags do not leak', () => {
	const text = [
		'Feature: f',
		'',
		'  @rubric @trigger @frozen',
		'  Scenario: tagged',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'tagged', 'x.feature'))
	assert.ok(!out.includes('@rubric'))
	assert.ok(!out.includes('@trigger'))
	assert.ok(!out.includes('@frozen'))
})

// ─── Scenario Outline + Examples ────────────────────────────────────────────────

test('Scenario Outline: placeholders in Given/When are kept, a Then-only column is excluded', () => {
	const text = [
		'Feature: trigger',
		'',
		'  Scenario Outline: the config activates on a matching query',
		'    Given a user query "<query>"',
		'    When the agent decides whether to invoke the config',
		'    Then invocation is "<should_trigger>"',
		'',
		'    Examples:',
		'      | query            | should_trigger |',
		'      | make a chart     | yes            |',
		'      | book a flight    | no             |',
	].join('\n')
	const situation = extractSituation(text, 'the config activates on a matching query', 'x.feature')
	assert.deepEqual(situation.placeholders, ['query'])
	assert.ok(situation.examples)
	assert.deepEqual(situation.examples?.header, ['query'])
	assert.deepEqual(situation.examples?.rows, [['make a chart'], ['book a flight']])
	const out = formatMarkdown(situation)
	assert.ok(!out.includes('should_trigger'))
	assert.ok(!out.includes('yes'))
	assert.ok(!out.includes('no'))
})

// ─── scenario not found ─────────────────────────────────────────────────────────

test('scenario not found throws ScenarioNotFoundError', () => {
	const text = ['Feature: f', '', '  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n')
	assert.throws(() => extractSituation(text, 'does not exist', 'x.feature'), ScenarioNotFoundError)
})

test('main exits 1 and emits nothing to stdout on scenario not found', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n'),
	)
	try {
		const originalWrite = process.stdout.write.bind(process.stdout)
		let stdout = ''
		process.stdout.write = ((chunk: string) => {
			stdout += chunk
			return true
		}) as typeof process.stdout.write
		let code: number
		try {
			code = main(['--feature', path, '--scenario', 'missing'])
		} finally {
			process.stdout.write = originalWrite
		}
		assert.equal(code, 1)
		assert.equal(stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── duplicate scenario name ─────────────────────────────────────────────────────

test('a duplicate scenario name throws AmbiguousScenarioError', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: dup',
		'    Given x',
		'    When y',
		'    Then z',
		'',
		'  Scenario: dup',
		'    Given a',
		'    When b',
		'    Then c',
	].join('\n')
	assert.throws(() => extractSituation(text, 'dup', 'x.feature'), AmbiguousScenarioError)
})

// ─── unparseable feature file ─────────────────────────────────────────────────────

test('a file with no Feature: line throws UnparseableFeatureError', () => {
	const text = ['  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n')
	assert.throws(() => extractSituation(text, 'a', 'x.feature'), UnparseableFeatureError)
})

// ─── CLI — usage errors ─────────────────────────────────────────────────────────

test('main returns 1 when --feature is missing', () => {
	assert.equal(main(['--scenario', 'a']), 1)
})

test('main returns 1 when --scenario is missing', () => {
	assert.equal(main(['--feature', 'x.feature']), 1)
})

test('main returns 1 on an unreadable file', () => {
	assert.equal(main(['--feature', join(tmpdir(), 'extract-situation-does-not-exist.feature'), '--scenario', 'a']), 1)
})

// ─── the adversarial test — must never be deleted ──────────────────────────────

test('ANSWERKEY_SENTINEL in a Then and an inline rubric never appears in the output, text or json', () => {
	const text = [
		'Feature: f',
		'',
		'  @rubric',
		'  Scenario: sentinel check',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the answer is "ANSWERKEY_SENTINEL"',
		'    And the dimension "ANSWERKEY_SENTINEL" scores at least 4',
		'    """',
		'    dimension: ANSWERKEY_SENTINEL',
		'    max: 5',
		'    """',
	].join('\n')
	const situation = extractSituation(text, 'sentinel check', 'x.feature')
	const markdown = formatMarkdown(situation)
	const json = formatJson(situation)
	assert.ok(!markdown.includes('ANSWERKEY_SENTINEL'))
	assert.ok(!json.includes('ANSWERKEY_SENTINEL'))
})

// ─── docstring lines that open with a step keyword ─────────────────────────────

// A rubric ladder routinely opens a line with a step keyword. Read as a step, it leaks the answer
// key AND overwrites the inherited keyword for the collapsing `And` below the docstring.
const KEYWORD_LEADING_RUBRIC = [
	'Feature: f',
	'',
	'  @rubric',
	'  Scenario: the agent stages only related files',
	'    Given a repo with unrelated changes',
	'    When the agent commits',
	'    Then the judge evaluates the scenario against the rubric',
	'      """',
	'      dimensions:',
	'        - name: correctness',
	'          ladder: |',
	'            When the agent stages ANSWERKEY_SENTINEL only, award 3',
	'            Given ANSWERKEY_SENTINEL is absent, award 0',
	'      threshold: 4',
	'      """',
	'    And the rubric score is at least the threshold',
].join('\n')

test('a docstring line opening with a step keyword never reaches the situation', () => {
	const situation = extractSituation(KEYWORD_LEADING_RUBRIC, 'the agent stages only related files', 'x.feature')
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
	assert.ok(!formatJson(situation).includes('ANSWERKEY_SENTINEL'))
})

test('a docstring does not corrupt the keyword the collapsing And inherits', () => {
	const situation = extractSituation(KEYWORD_LEADING_RUBRIC, 'the agent stages only related files', 'x.feature')
	assert.deepEqual(situation.given, ['Given a repo with unrelated changes'])
	assert.deepEqual(situation.when, ['When the agent commits'])
})

test('a backtick-fenced docstring is skipped the same way', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then the judge evaluates it',
		'      ```',
		'      When ANSWERKEY_SENTINEL, award 3',
		'      ```',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

test('an And with no concrete step above it is unresolved and withheld', () => {
	const text = ['Feature: f', '', '  Scenario: a', '    And an orphaned step', '    When an event happens'].join('\n')
	const [s] = parseScenarios(text)
	assert.equal(s.steps[0].effectiveKeyword, 'unresolved')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(!formatMarkdown(situation).includes('orphaned'))
})

// ─── file order, empty situations, But ─────────────────────────────────────────

test('interleaved Given/When steps are emitted in file order, not regrouped by keyword', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a first condition',
		'    When a first event happens',
		'    Given a second condition',
		'    When a second event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.deepEqual(situation.steps, [
		'Given a first condition',
		'When a first event happens',
		'Given a second condition',
		'When a second event happens',
	])
	const body = formatMarkdown(situation)
		.split('\n')
		.filter((l) => /^(Given|When)\b/.test(l))
	assert.deepEqual(body, situation.steps)
})

test('a scenario with no Given or When fails closed rather than emitting an empty brief', () => {
	const text = ['Feature: f', '', '  Scenario: a', '    Then a result', '    And another result'].join('\n')
	assert.throws(() => extractSituation(text, 'a', 'x.feature'), EmptySituationError)
})

test('the CLI exits non-zero and writes no brief for an empty situation', () => {
	const { dir, path } = tmpFeature(['Feature: f', '', '  Scenario: a', '    Then a result'].join('\n'))
	try {
		assert.equal(main(['--feature', path, '--scenario', 'a']), 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a But under a Then is withheld', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
		'    But not ANSWERKEY_SENTINEL',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

test('a But under a Given is emitted', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    But not an excluded condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(formatMarkdown(situation).includes('But not an excluded condition'))
})

// ─── emission-level coverage for the And/But inheritance rules ─────────────────

// The twin of 'a But under a Given is emitted'. Asserting the parsed keyword is not the same as
// asserting the step reaches the brief: an engine that resolves the keyword correctly and then
// drops every literal `And` from the emitted set passes a parse-level assertion.
test('an And under a Given reaches the emitted brief', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    And another condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(situation.steps.includes('And another condition'))
	assert.ok(formatMarkdown(situation).includes('And another condition'))
})

test('an And under a When reaches the emitted brief', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    And a second event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(situation.steps.includes('And a second event happens'))
})

// ─── the answer key must be withheld from EVERY output format ─────────────────

test('the scenario name is withheld from the json output too', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: ANSWERKEY_SENTINEL blocks the commit',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'ANSWERKEY_SENTINEL blocks the commit', 'x.feature')
	assert.ok(!formatJson(situation).includes('ANSWERKEY_SENTINEL'))
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

// ─── neighbors: tags and siblings must not bleed ──────────────────────────────

// The tag guard must sit on a scenario that is NOT the first in the file: a tag line above the
// first scenario is parsed while `current` is still null, so every tag defect gated on `current`
// stays invisible to it.
test('a tag above a non-first scenario does not leak into the brief', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: first',
		'    Given a first condition',
		'    When a first event happens',
		'    Then a first result',
		'',
		'  @rubric @ANSWERKEY_SENTINEL',
		'  Scenario: second',
		'    Given a second condition',
		'    When a second event happens',
		'    Then a second result',
	].join('\n')
	for (const name of ['first', 'second']) {
		const out = formatMarkdown(extractSituation(text, name, 'x.feature'))
		assert.ok(!out.includes('ANSWERKEY_SENTINEL'), `tag leaked when extracting "${name}"`)
		assert.ok(!out.includes('@rubric'), `tag leaked when extracting "${name}"`)
	}
})

test('a keyword does not bleed from one scenario into the next', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: first',
		'    Given a first condition',
		'    When a first event happens',
		'',
		'  Scenario: second',
		'    And an orphaned ANSWERKEY_SENTINEL step',
		'    When a second event happens',
		'    Then a second result',
	].join('\n')
	const situation = extractSituation(text, 'second', 'x.feature')
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

test('a Feature description line does not leak into the brief', () => {
	const text = [
		'Feature: f',
		'  This description mentions ANSWERKEY_SENTINEL and must never reach a brief.',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	assert.ok(!formatMarkdown(extractSituation(text, 'a', 'x.feature')).includes('ANSWERKEY_SENTINEL'))
})

// ─── the scenario name is matched exactly ─────────────────────────────────────

// A near-miss or case-folded match would hand the caller a DIFFERENT scenario's situation while
// reporting success — the caller cannot tell it scored the wrong case.
test('a scenario name is matched exactly, not by substring', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: the agent stages related files and commits',
		'    Given a condition',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	assert.throws(() => extractSituation(text, 'the agent stages', 'x.feature'), ScenarioNotFoundError)
})

test('a scenario name is matched case-sensitively', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a Named Case',
		'    Given a condition',
		'    When an event happens',
	].join('\n')
	assert.throws(() => extractSituation(text, 'a named case', 'x.feature'), ScenarioNotFoundError)
})

// ─── docstring fences ─────────────────────────────────────────────────────────

test('a fence closes only on its own token, not on any fence token', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then the judge evaluates it',
		'      """',
		'      ```',
		'      When ANSWERKEY_SENTINEL, award 3',
		'      """',
	].join('\n')
	assert.ok(!formatMarkdown(extractSituation(text, 'a', 'x.feature')).includes('ANSWERKEY_SENTINEL'))
})

test('a fence is recognized only at the start of a line', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition mentioning """ inline',
		'    When an event happens',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.ok(situation.steps.includes('Given a condition mentioning """ inline'))
	assert.ok(situation.steps.includes('When an event happens'))
})

// ─── fail-closed messages name what failed ────────────────────────────────────

test('the not-found error names the scenario and the file', () => {
	const text = ['Feature: f', '', '  Scenario: a', '    Given a condition', '    When an event happens'].join('\n')
	assert.throws(
		() => extractSituation(text, 'absent case', 'suite.feature'),
		(err: Error) => err.message.includes('absent case') && err.message.includes('suite.feature'),
	)
})

test('the unparseable error names the file', () => {
	assert.throws(
		() => extractSituation('not a feature at all', 'a', 'suite.feature'),
		(err: Error) => err instanceof UnparseableFeatureError && err.message.includes('suite.feature'),
	)
})

test('a Feature: mention that does not open a line does not make the text parseable', () => {
	assert.throws(
		() => extractSituation('this text merely mentions Feature: somewhere', 'a', 'x.feature'),
		UnparseableFeatureError,
	)
})

// ─── outline ──────────────────────────────────────────────────────────────────

test('two placeholders in one step are captured separately', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario Outline: a',
		'    Given a <first> and a <second>',
		'    When an event happens',
		'    Then <expected>',
		'',
		'    Examples:',
		'      | first | second | expected |',
		'      | x     | y      | ANSWERKEY_SENTINEL |',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.deepEqual(situation.placeholders, ['first', 'second'])
	assert.deepEqual(situation.examples?.header, ['first', 'second'])
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

test('a plain Scenario never carries an Examples table', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a <thing>',
		'    When an event happens',
		'',
		'    Examples:',
		'      | thing |',
		'      | ANSWERKEY_SENTINEL |',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.equal(situation.examples, null)
	assert.ok(!formatMarkdown(situation).includes('ANSWERKEY_SENTINEL'))
})

// ─── read-only ────────────────────────────────────────────────────────────────

test('an extraction writes no file', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given a condition', '    When an event happens', '    Then a result'].join(
			'\n',
		),
	)
	try {
		const before = readdirSync(dir)
		assert.equal(main(['--feature', path, '--scenario', 'a']), 0)
		assert.deepEqual(readdirSync(dir), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── the CLI entrypoint itself ────────────────────────────────────────────────

// Every other test calls `main(argv)` directly, so none of them cover the entrypoint guard — the
// only path a caller actually uses. A guard that never fires makes the script print nothing and
// exit 0, which a caller keying its BLOCKER on a non-zero exit reads as a valid empty brief.
const CLI = fileURLToPath(new URL('./extract-situation.mts', import.meta.url))

function runCli(args: string[]): { status: number; stdout: string } {
	try {
		const stdout = execFileSync(process.execPath, ['--experimental-strip-types', CLI, ...args], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		return { status: 0, stdout }
	} catch (err) {
		const e = err as { status: number; stdout: string }
		return { status: e.status, stdout: e.stdout ?? '' }
	}
}

test('the CLI entrypoint emits the brief when run as a script', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given a condition', '    When an event happens', '    Then a result'].join(
			'\n',
		),
	)
	try {
		const { status, stdout } = runCli(['--feature', path, '--scenario', 'a'])
		assert.equal(status, 0)
		assert.match(stdout, /## Situation/)
		assert.match(stdout, /Given a condition/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the CLI entrypoint exits non-zero and emits no brief on a missing scenario', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given a condition', '    When an event happens'].join('\n'),
	)
	try {
		const { status, stdout } = runCli(['--feature', path, '--scenario', 'absent'])
		assert.notEqual(status, 0)
		assert.doesNotMatch(stdout, /## Situation/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── fail-closed messages name the file, and emit nothing ─────────────────────

test('an unreadable file exits non-zero, names the file, and emits no brief', () => {
	const dir = mkdtempSync(join(tmpdir(), 'extract-situation-'))
	const missing = join(dir, 'absent.feature')
	try {
		const { status, stdout } = runCli(['--feature', missing, '--scenario', 'a'])
		assert.notEqual(status, 0)
		assert.equal(stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main names the unreadable file on stderr and writes no brief to stdout', () => {
	const dir = mkdtempSync(join(tmpdir(), 'extract-situation-'))
	const missing = join(dir, 'absent.feature')
	const errs: string[] = []
	const outs: string[] = []
	const origErr = console.error
	const origWrite = process.stdout.write
	console.error = (m: string) => void errs.push(String(m))
	process.stdout.write = ((c: string) => {
		outs.push(String(c))
		return true
	}) as typeof process.stdout.write
	try {
		const code = main(['--feature', missing, '--scenario', 'a'])
		assert.equal(code, 1)
		assert.ok(errs.some((e) => e.includes(missing)))
		assert.equal(outs.join(''), '')
	} finally {
		console.error = origErr
		process.stdout.write = origWrite
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── a docstring inherits its owning step's fate ──────────────────────────────

// A docstring under a Given/When IS the situation — routinely the very prompt under test. Skipping
// docstrings wholesale silently guts the brief: exit 0, non-empty output, no guard fires, and the
// resulting low score reads as a defect in the SUBJECT rather than in the extraction.
test('a docstring under a Given is emitted with its step', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given the user sends this prompt',
		'      """',
		'      please delete the production database',
		'      """',
		'    When the agent considers it',
		'    Then it refuses',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'a', 'x.feature'))
	assert.match(out, /please delete the production database/)
	assert.doesNotMatch(out, /it refuses/)
})

test('a docstring under a When is emitted with its step', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When the agent receives this payload',
		'      """',
		'      {"id": 1}',
		'      """',
		'    Then a result',
	].join('\n')
	assert.match(formatMarkdown(extractSituation(text, 'a', 'x.feature')), /\{"id": 1\}/)
})

// The leak protection must survive the fix: a Given docstring line that opens with a step keyword is
// carried as docstring CONTENT, never re-read as a step, so it cannot capture the steps below it.
test('a Given docstring opening with a step keyword is content, not a step', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given the user sends this prompt',
		'      """',
		'      When should I commit?',
		'      """',
		'    When the agent considers it',
		'    Then it answers ANSWERKEY_SENTINEL',
		'    And it stops',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	const out = formatMarkdown(situation)
	assert.match(out, /When should I commit\?/)
	assert.doesNotMatch(out, /ANSWERKEY_SENTINEL/)
	assert.doesNotMatch(out, /it stops/)
	assert.deepEqual(situation.when, ['When the agent considers it'])
})

test('a docstring under a Then is still withheld entirely', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then the judge evaluates it',
		'      """',
		'      dimensions:',
		'        - name: ANSWERKEY_SENTINEL',
		'      threshold: 4',
		'      """',
	].join('\n')
	assert.doesNotMatch(formatMarkdown(extractSituation(text, 'a', 'x.feature')), /ANSWERKEY_SENTINEL/)
})

// ─── one outline row is one case ──────────────────────────────────────────────

const OUTLINE = [
	'Feature: f',
	'',
	'  @trigger',
	'  Scenario Outline: it fires on a commit request',
	'    Given a user session',
	'    When the user says "<query>"',
	'    Then it invokes "<should_trigger>"',
	'',
	'    Examples:',
	'      | query               | should_trigger |',
	'      | commit my work      | yes            |',
	'      | what is the weather | no             |',
].join('\n')

test('a row index selects exactly that Examples row', () => {
	const first = extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 0)
	assert.deepEqual(first.examples?.rows, [['commit my work']])
	const second = extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 1)
	assert.deepEqual(second.examples?.rows, [['what is the weather']])
})

test('a selected row still withholds the Then-only column', () => {
	const out = formatMarkdown(extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 0))
	assert.doesNotMatch(out, /should_trigger/)
	assert.doesNotMatch(out, /\byes\b/)
})

test('omitting the row keeps every row', () => {
	const all = extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature')
	assert.equal(all.examples?.rows.length, 2)
})

test('a row outside the Examples table fails closed', () => {
	assert.throws(() => extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 9), RowOutOfRangeError)
})

test('the CLI rejects a non-integer row and emits no brief', () => {
	const { dir, path } = tmpFeature(OUTLINE)
	try {
		assert.equal(main(['--feature', path, '--scenario', 'it fires on a commit request', '--row', 'x']), 1)
		assert.equal(main(['--feature', path, '--scenario', 'it fires on a commit request', '--row', '-1']), 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── the entrypoint guard survives its own path ───────────────────────────────

// `import.meta.url` percent-encodes; `file://${process.argv[1]}` does not. A path holding a space
// makes the naive concat mismatch, so the guard never fires and the CLI prints nothing at exit 0 —
// the same silent-empty-brief bug the guard was rewritten to remove, retriggered by an install path.
test('the CLI entrypoint fires from a path containing a space', () => {
	const dir = mkdtempSync(join(tmpdir(), 'extract-situation-'))
	const spaced = join(dir, 'dir with space')
	mkdirSync(spaced)
	const script = join(spaced, 'extract-situation.mts')
	copyFileSync(CLI, script)
	const feature = join(dir, 'x.feature')
	writeFileSync(
		feature,
		['Feature: f', '', '  Scenario: a', '    Given a thing', '    When it runs', '    Then a result'].join('\n'),
	)
	try {
		const stdout = execFileSync(
			process.execPath,
			['--experimental-strip-types', script, '--feature', feature, '--scenario', 'a'],
			{
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		)
		assert.match(stdout, /## Situation/)
		assert.match(stdout, /Given a thing/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── conjuncts the frozen scenarios assert but the tests did not ──────────────

test('an outline emits its placeholder tokens intact in the brief', () => {
	const situation = extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 0)
	assert.ok(situation.steps.some((s) => s.includes('<query>')))
	assert.match(formatMarkdown(situation), /When the user says "<query>"/)
})

test('an empty situation emits no brief through the CLI', () => {
	const { dir, path } = tmpFeature(['Feature: f', '', '  Scenario: a', '    Then a result'].join('\n'))
	try {
		const { status, stdout } = runCli(['--feature', path, '--scenario', 'a'])
		assert.notEqual(status, 0)
		assert.equal(stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a missing argument emits a usage error and no brief', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given a thing', '    When it runs'].join('\n'),
	)
	try {
		for (const args of [
			['--feature', path],
			['--scenario', 'a'],
		]) {
			const { status, stdout } = runCli(args)
			assert.notEqual(status, 0)
			assert.equal(stdout, '')
		}
		const errs: string[] = []
		const origErr = console.error
		console.error = (m: string) => void errs.push(String(m))
		try {
			assert.equal(main(['--feature', path]), 1)
			assert.ok(errs.some((e) => /usage:/i.test(e)))
		} finally {
			console.error = origErr
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// "no other file" means the whole filesystem, not just the fixture dir. Watch a second, unrelated
// directory too — a side effect written anywhere else is exactly what this scenario forbids.
test('an extraction writes no file anywhere it is watched', () => {
	const { dir, path } = tmpFeature(
		['Feature: f', '', '  Scenario: a', '    Given a condition', '    When an event happens', '    Then a result'].join(
			'\n',
		),
	)
	const elsewhere = mkdtempSync(join(tmpdir(), 'extract-situation-elsewhere-'))
	const cwdBefore = readdirSync(process.cwd())
	try {
		const before = readdirSync(dir)
		const elsewhereBefore = readdirSync(elsewhere)
		assert.equal(main(['--feature', path, '--scenario', 'a']), 0)
		assert.deepEqual(readdirSync(dir), before)
		assert.deepEqual(readdirSync(elsewhere), elsewhereBefore)
		assert.deepEqual(readdirSync(process.cwd()), cwdBefore)
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(elsewhere, { recursive: true, force: true })
	}
})

// ─── source-level guards, where behavior cannot reach ─────────────────────────

// Two properties this suite cannot prove by running: a write to a path no test watches, and a guard
// that misfires only on a Node this runtime is not. Both are asserted against the source instead —
// the same shape verify-scenarios.test.mts uses.

test('the engine writes nothing to the filesystem', () => {
	const src = readFileSync(new URL('./extract-situation.mts', import.meta.url), 'utf8')
	for (const banned of [
		/\bwriteFileSync\b/,
		/\bappendFileSync\b/,
		/\bmkdirSync\b/,
		/\bwriteFile\b/,
		/\brmSync\b/,
		/\bcpSync\b/,
	]) {
		assert.doesNotMatch(src, banned)
	}
})

test('the entrypoint guard is neither version-conditional nor encoding-fragile', () => {
	const src = readFileSync(new URL('./extract-situation.mts', import.meta.url), 'utf8')
	// Comments name both wrong forms in order to explain them; assert against code only.
	const code = src
		.split('\n')
		.filter((l) => !l.trimStart().startsWith('//'))
		.join('\n')
	// `import.meta.main` is Node >=24.2 while engines.node is ">=22": undefined there, so the CLI
	// prints nothing and exits 0. No test can catch it — a test only ever probes the Node it runs on.
	assert.doesNotMatch(code, /import\.meta\.main/)
	// `file://${process.argv[1]}` mismatches a percent-encoded import.meta.url on any path holding a
	// space. The spaced-path test catches that one, but pin the correct form here too.
	assert.doesNotMatch(code, /file:\/\/\$\{/)
	assert.match(code, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href/)
})

// ─── the Examples table must reach the BRIEF, not just the Situation ──────────

// A `Then` that says "emitted" is about the rendered brief — the simulator never sees the Situation
// object. Asserting on `situation.examples` leaves formatTable free to return '', which collapses
// every outline row to the literal "<query>" and simulates them all identically, silently green.
test('a selected row reaches the rendered brief, header and values', () => {
	const out = formatMarkdown(extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 0))
	assert.match(out, /\|\s*query\s*\|/)
	assert.match(out, /\|\s*commit my work\s*\|/)
	assert.doesNotMatch(out, /what is the weather/)
})

test('the other row reaches the rendered brief when it is the one selected', () => {
	const out = formatMarkdown(extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 1))
	assert.match(out, /\|\s*what is the weather\s*\|/)
	assert.doesNotMatch(out, /commit my work/)
})

test('every referenced column and every row reaches the brief when no row is selected', () => {
	const out = formatMarkdown(extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature'))
	assert.match(out, /\|\s*query\s*\|/)
	assert.match(out, /\|\s*commit my work\s*\|/)
	assert.match(out, /\|\s*what is the weather\s*\|/)
})

test('a multi-column outline emits every referenced header and its values in the brief', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario Outline: a',
		'    Given a <role> user',
		'    When they say "<query>"',
		'    Then <expected>',
		'',
		'    Examples:',
		'      | role  | query        | expected |',
		'      | admin | ship it      | yes      |',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'a', 'x.feature'))
	assert.match(out, /\|\s*role\s*\|/)
	assert.match(out, /\|\s*query\s*\|/)
	assert.match(out, /\|\s*admin\s*\|/)
	assert.match(out, /\|\s*ship it\s*\|/)
	assert.doesNotMatch(out, /expected/)
	assert.doesNotMatch(out, /\byes\b/)
})

// ─── real-corpus shape ────────────────────────────────────────────────────────

// Every fixture above opens with a bare `Feature: f`. The entire real corpus opens with `@frozen`,
// so nothing here exercises the shape the engine actually meets in production.
const FROZEN_SUITE = [
	'@frozen',
	'Feature: judge — the internal scorer',
	'  Unit suite for the scorer. Cross-capability e2e lives in ../../acceptance/.',
	'',
	'  # ---- Role boundary ----',
	'',
	'  @rubric',
	'  Scenario: it stages only related files',
	'    Given a repo holding unrelated changes',
	'    And the agent has been asked to commit',
	'    When the agent stages',
	'    Then the judge evaluates the scenario against the rubric',
	'      """',
	'      dimensions:',
	'        - name: correctness',
	'          max: 3',
	'          ladder: |',
	'            When only related files are staged, award 3',
	'      threshold: 4',
	'      """',
	'    And the rubric score is at least the threshold',
].join('\n')

test('a tagged, frozen, real-corpus-shaped .feature parses', () => {
	const situation = extractSituation(FROZEN_SUITE, 'it stages only related files', 'judge.feature')
	assert.deepEqual(situation.given, [
		'Given a repo holding unrelated changes',
		'And the agent has been asked to commit',
	])
	assert.deepEqual(situation.when, ['When the agent stages'])
})

test('a real-corpus @rubric scenario leaks neither its rubric nor its collapsing Then', () => {
	const out = formatMarkdown(extractSituation(FROZEN_SUITE, 'it stages only related files', 'judge.feature'))
	for (const leak of [
		/dimensions:/,
		/max: 3/,
		/threshold: 4/,
		/award 3/,
		/rubric score is at least/,
		/the judge evaluates/,
	]) {
		assert.doesNotMatch(out, leak)
	}
})

// ─── the answer column must not leak through a prefix collision ───────────────

test('an Examples column is kept by exact name, not by prefix', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario Outline: a',
		'    Given a user',
		'    When they say "<query>"',
		'    Then it invokes "<query_expected>"',
		'',
		'    Examples:',
		'      | query   | query_expected |',
		'      | ship it | ANSWERKEY_SENTINEL |',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'a', 'x.feature'))
	assert.doesNotMatch(out, /query_expected/)
	assert.doesNotMatch(out, /ANSWERKEY_SENTINEL/)
	assert.match(out, /\|\s*ship it\s*\|/)
})

// ─── a word merely starting with a keyword is not a step ──────────────────────

test('a Then-side line whose first word merely starts with a keyword does not leak', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When an event happens',
		'    Then it succeeds',
		'    Whenever the agent retries it ANSWERKEY_SENTINEL',
	].join('\n')
	assert.doesNotMatch(formatMarkdown(extractSituation(text, 'a', 'x.feature')), /ANSWERKEY_SENTINEL/)
})

// ─── a docstring never crosses a scenario boundary ────────────────────────────

test('a docstring does not attach across a scenario boundary', () => {
	// The first scenario must OWN a docstring, so a stale owner exists to leak into. A fixture whose
	// first scenario has none never sets the owner, so it cannot detect the stale-owner defect.
	const text = [
		'Feature: f',
		'',
		'  Scenario: first',
		'    Given the user sends this prompt',
		'      """',
		'      a first prompt',
		'      """',
		'    When a first event happens',
		'',
		'  Scenario: second',
		'    """',
		'    CROSS_SCENARIO_LEAK',
		'    """',
		'    Given a second condition',
		'    When a second event happens',
	].join('\n')
	const first = formatMarkdown(extractSituation(text, 'first', 'x.feature'))
	assert.match(first, /a first prompt/)
	assert.doesNotMatch(first, /CROSS_SCENARIO_LEAK/)
	const second = formatMarkdown(extractSituation(text, 'second', 'x.feature'))
	assert.doesNotMatch(second, /CROSS_SCENARIO_LEAK/)
	assert.doesNotMatch(second, /a first prompt/)
})

// ─── the requested scenario, not merely the first ─────────────────────────────

test('a request for a later scenario emits that scenario, not the first', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: first',
		'    Given FIRST_SENTINEL holds',
		'    When the first event happens',
		'    Then a first result',
		'',
		'  Scenario: second',
		'    Given SECOND_SENTINEL holds',
		'    When the second event happens',
		'    Then a second result',
	].join('\n')
	const out = formatMarkdown(extractSituation(text, 'second', 'x.feature'))
	assert.match(out, /SECOND_SENTINEL/)
	assert.doesNotMatch(out, /FIRST_SENTINEL/)
})

// ─── a step is not confused by prose that looks structural ────────────────────

test('a step mentioning Scenario:, Examples:, or a pipe stays one step', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a doc listing Examples: of usage',
		'    And a table row like | a | b |',
		'    And the judge reads Scenario: b aloud',
		'    When it runs',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.deepEqual(situation.given, [
		'Given a doc listing Examples: of usage',
		'And a table row like | a | b |',
		'And the judge reads Scenario: b aloud',
	])
	assert.deepEqual(situation.when, ['When it runs'])
})

// ─── "emitted with its step, fences and all" — every conjunct ─────────────────

const PROMPT_DOC = [
	'Feature: f',
	'',
	'  Scenario: a',
	'    Given the user sends this prompt',
	'      """',
	'      please delete the production database',
	'      """',
	'    When the agent considers it',
	'    Then it refuses',
].join('\n')

test('a docstring is emitted with its step line, not orphaned from it', () => {
	const out = formatMarkdown(extractSituation(PROMPT_DOC, 'a', 'x.feature'))
	const lines = out.split('\n')
	const stepAt = lines.indexOf('Given the user sends this prompt')
	assert.notEqual(stepAt, -1, 'the owning step line must be emitted')
	const bodyAt = lines.findIndex((l) => l.includes('please delete the production database'))
	assert.ok(bodyAt > stepAt, 'the docstring body must follow its own step')
})

test('a docstring is emitted with both of its fences', () => {
	const situation = extractSituation(PROMPT_DOC, 'a', 'x.feature')
	const fences = situation.steps.filter((s) => s.trim() === '"""')
	assert.equal(fences.length, 2, 'both the opening and closing fence must be emitted')
	const out = formatMarkdown(situation)
	assert.equal(out.split('\n').filter((l) => l.trim() === '"""').length, 2)
})

// ─── the json path carries the same brief as the markdown one ────────────────

// Every json assertion above is a negative sentinel check, so formatJson could return '[]' and stay
// green. A caller may use --format json; it must carry the situation, not merely omit the key.
test('the json output carries the steps, the docstring, and the placeholders', () => {
	const json = JSON.parse(formatJson(extractSituation(PROMPT_DOC, 'a', 'x.feature')))
	assert.deepEqual(json.steps, [
		'Given the user sends this prompt',
		'"""',
		'      please delete the production database',
		'"""',
		'When the agent considers it',
	])
	assert.ok(json.given.some((s: string) => s.includes('please delete the production database')))
	assert.deepEqual(json.when, ['When the agent considers it'])
})

test('the json output carries an outline row and its placeholders', () => {
	const json = JSON.parse(formatJson(extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 0)))
	assert.deepEqual(json.placeholders, ['query'])
	assert.deepEqual(json.examples.header, ['query'])
	assert.deepEqual(json.examples.rows, [['commit my work']])
	assert.ok(json.when.some((s: string) => s.includes('<query>')))
})

// ─── row bounds at the boundary ───────────────────────────────────────────────

test('the row index just past the last row fails closed', () => {
	assert.throws(() => extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 2), RowOutOfRangeError)
	assert.doesNotThrow(() => extractSituation(OUTLINE, 'it fires on a commit request', 'x.feature', 1))
})

test('a duplicated placeholder is reported once', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario Outline: a',
		'    Given a <thing> beside another <thing>',
		'    When it runs',
		'    Then a result',
		'',
		'    Examples:',
		'      | thing |',
		'      | x     |',
	].join('\n')
	assert.deepEqual(extractSituation(text, 'a', 'x.feature').placeholders, ['thing'])
})

// ─── fail-closed is a PROCESS fact — drive the process to bind it ─────────────

// `main()` catches every error, so `assert.throws` on the pure function is a proxy: it cannot see an
// exit code or stdout. A `Then` that says "exits non-zero AND emits no brief" is only bound by
// driving main/the CLI and asserting both halves.
function runMain(args: string[]): { code: number; stdout: string; stderr: string } {
	const outs: string[] = []
	const errs: string[] = []
	const origWrite = process.stdout.write
	const origErr = console.error
	process.stdout.write = ((c: string) => {
		outs.push(String(c))
		return true
	}) as typeof process.stdout.write
	console.error = (m: string) => void errs.push(String(m))
	try {
		const code = main(args)
		return { code, stdout: outs.join(''), stderr: errs.join('\n') }
	} finally {
		process.stdout.write = origWrite
		console.error = origErr
	}
}

test('a row outside the Examples table exits non-zero and emits no brief', () => {
	const { dir, path } = tmpFeature(OUTLINE)
	try {
		const r = runMain(['--feature', path, '--scenario', 'it fires on a commit request', '--row', '9'])
		assert.notEqual(r.code, 0)
		assert.equal(r.stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an ambiguous scenario name exits non-zero and emits no brief', () => {
	const { dir, path } = tmpFeature(
		[
			'Feature: f',
			'',
			'  Scenario: dup',
			'    Given a first condition',
			'    When a first event happens',
			'',
			'  Scenario: dup',
			'    Given a second condition',
			'    When a second event happens',
		].join('\n'),
	)
	try {
		const r = runMain(['--feature', path, '--scenario', 'dup'])
		assert.notEqual(r.code, 0)
		assert.equal(r.stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('text carrying no Feature line exits non-zero and emits no brief', () => {
	const { dir, path } = tmpFeature('this text merely mentions Feature: somewhere mid-line')
	try {
		const r = runMain(['--feature', path, '--scenario', 'a'])
		assert.notEqual(r.code, 0)
		assert.equal(r.stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an absent scenario name exits non-zero and emits no brief', () => {
	const { dir, path } = tmpFeature(OUTLINE)
	try {
		const r = runMain(['--feature', path, '--scenario', 'absent'])
		assert.notEqual(r.code, 0)
		assert.equal(r.stdout, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a non-integer row exits non-zero and emits no brief', () => {
	const { dir, path } = tmpFeature(OUTLINE)
	try {
		for (const bad of ['x', '-1', '1.5']) {
			const r = runMain(['--feature', path, '--scenario', 'it fires on a commit request', '--row', bad])
			assert.notEqual(r.code, 0, `--row ${bad} must fail`)
			assert.equal(r.stdout, '', `--row ${bad} must emit no brief`)
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ─── a commented-out Examples row is not data ─────────────────────────────────

// Comments are legal anywhere, and a commented-out Examples row is a standard idiom. Treating one as
// live data shifts every --row index and inflates the row count, so an out-of-range row stops failing
// closed — the judge would silently score the wrong row.
const COMMENTED_OUTLINE = [
	'Feature: f',
	'',
	'  Scenario Outline: a',
	'    Given a user',
	'    When they say "<query>"',
	'    Then it invokes "<should_trigger>"',
	'',
	'    Examples:',
	'      | query       | should_trigger |',
	'      | commit this | yes            |',
	'      # | flaky row | no             |',
	'      | rebase now  | yes            |',
].join('\n')

test('a commented-out Examples row is skipped, not counted', () => {
	const situation = extractSituation(COMMENTED_OUTLINE, 'a', 'x.feature')
	assert.deepEqual(situation.examples?.rows, [['commit this'], ['rebase now']])
	assert.doesNotMatch(formatMarkdown(situation), /flaky row/)
})

test('a commented-out Examples row does not shift the row index', () => {
	const second = extractSituation(COMMENTED_OUTLINE, 'a', 'x.feature', 1)
	assert.deepEqual(second.examples?.rows, [['rebase now']])
	assert.match(formatMarkdown(second), /\|\s*rebase now\s*\|/)
	assert.throws(() => extractSituation(COMMENTED_OUTLINE, 'a', 'x.feature', 2), RowOutOfRangeError)
})

// ─── the docstring conjuncts the fixtures reached only for a Given ────────────

test('a When-owned docstring is emitted with its step, fences and all', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given a condition',
		'    When the agent receives this payload',
		'      """',
		'      {"id": 1}',
		'      """',
		'    Then a result',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	const lines = formatMarkdown(situation).split('\n')
	const stepAt = lines.indexOf('When the agent receives this payload')
	assert.notEqual(stepAt, -1)
	assert.equal(lines.filter((l) => l.trim() === '"""').length, 2)
	assert.ok(lines.findIndex((l) => l.includes('{"id": 1}')) > stepAt)
})

test('a docstring does not capture the And directly below it', () => {
	const text = [
		'Feature: f',
		'',
		'  Scenario: a',
		'    Given the user sends this prompt',
		'      """',
		'      When should I commit?',
		'      """',
		'    When the agent considers it',
		'    Then it answers',
		'    And it stops with ANSWERKEY_SENTINEL',
	].join('\n')
	const situation = extractSituation(text, 'a', 'x.feature')
	assert.deepEqual(situation.when, ['When the agent considers it'])
	assert.doesNotMatch(formatMarkdown(situation), /ANSWERKEY_SENTINEL/)
})
