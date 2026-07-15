import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	AmbiguousScenarioError,
	EmptySituationError,
	extractSituation,
	formatJson,
	formatMarkdown,
	main,
	parseScenarios,
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
