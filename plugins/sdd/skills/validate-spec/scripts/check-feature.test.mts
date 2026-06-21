import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkFeature, parseFeature } from './check-feature.mts'

// ─── parseFeature ─────────────────────────────────────────────────────────────

test('parseFeature detects Feature: line', () => {
	const f = parseFeature('Feature: my feature\n\n  Scenario: a\n    Given x\n    When y\n    Then z\n')
	assert.equal(f.hasFeatureLine, true)
})

test('parseFeature detects missing Feature: line', () => {
	const f = parseFeature('  Scenario: a\n    Given x\n    When y\n    Then z\n')
	assert.equal(f.hasFeatureLine, false)
})

test('parseFeature counts scenarios and steps', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: first',
		'    Given a',
		'    When b',
		'    Then c',
		'',
		'  Scenario: second',
		'    Given d',
		'    Then e',
	].join('\n')
	const f = parseFeature(text)
	assert.equal(f.scenarios.length, 2)
	assert.equal(f.scenarios[0].steps.length, 3)
	assert.equal(f.scenarios[1].steps.length, 2)
})

test('parseFeature counts section comments with ──', () => {
	const text = ['Feature: foo', '  # ── Stage 1 ──', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseFeature(text)
	assert.equal(f.sectionCommentCount, 1)
})

test('parseFeature counts section comments with --', () => {
	const text = ['Feature: foo', '  # -- Stage 1 --', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseFeature(text)
	assert.equal(f.sectionCommentCount, 1)
})

test('parseFeature does not count plain comments as section comments', () => {
	const text = ['Feature: foo', '  # just a comment', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseFeature(text)
	assert.equal(f.sectionCommentCount, 0)
})

// ─── checkFeature — clean feature passes ──────────────────────────────────────

test('a clean feature with Given/When/Then passes', () => {
	const text = [
		'Feature: greetings',
		'',
		'  Scenario: happy path',
		'    Given the service is running',
		'    When the user sends a greeting',
		'    Then the response is "hello"',
	].join('\n')
	assert.deepEqual(checkFeature('greet', 'greet.feature', text), [])
})

test('And/But continuations are allowed after Then', () => {
	const text = [
		'Feature: greetings',
		'',
		'  Scenario: multi-assert',
		'    Given the service is running',
		'    When the user sends a greeting',
		'    Then the response is "hello"',
		'    And the status code is 200',
		'    But no error is logged',
	].join('\n')
	assert.deepEqual(checkFeature('greet', 'greet.feature', text), [])
})

// ─── checkFeature — Gherkin validity failures ────────────────────────────────

test('missing Feature: line is a violation', () => {
	const text = ['  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Feature: line/.test(m)))
})

test('scenario missing Then is a violation', () => {
	const text = ['Feature: foo', '', '  Scenario: no assertion', '    Given x', '    When y'].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Then step/.test(m)))
})

test('scenario missing Given and When is a violation', () => {
	const text = ['Feature: foo', '', '  Scenario: no setup', '    Then the response is ok'].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Given or When/.test(m)))
})

// ─── checkFeature — boolean form failures ────────────────────────────────────

test('a positive Then asserting "score 1-5" embeds a rubric', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: rubric check',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the score 1-5 reflects quality',
	].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /embeds a rubric/.test(m)))
})

test('a positive Then asserting a rubric grade embeds a rubric', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: rubric check',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the rubric awards three points',
	].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /embeds a rubric/.test(m)))
})

test('a Then asserting a threshold embeds a rubric', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: threshold check',
		'    Given some input',
		'    When processed',
		'    Then it meets the threshold for acceptance',
	].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /embeds a rubric/.test(m)))
})

test('step containing "sometimes" fails boolean form on any step', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: hedge check',
		'    Given a condition',
		'    When an event happens',
		'    Then the system sometimes responds correctly',
	].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /non-boolean hedge/.test(m)))
})

// ─── checkFeature — meta-spec exemptions (a spec about rubrics is not a rubric) ──

test('a Given mentioning a rubric is not a violation (setup, not assertion)', () => {
	const text = [
		'Feature: orchestrator',
		'',
		'  Scenario: the feature carries no rubric',
		'    Given the impl-producer authored a 1-5 rubric for a scenario',
		'    When the .feature file is inspected',
		'    Then it contains only boolean Given/When/Then scenarios',
	].join('\n')
	assert.deepEqual(checkFeature('slug', 'x.feature', text), [])
})

test('a negated Then asserting the absence of a rubric is not a violation', () => {
	const text = [
		'Feature: orchestrator',
		'',
		'  Scenario: the feature carries no rubric',
		'    Given a frozen contract',
		'    When the .feature file is inspected',
		'    Then it contains only boolean scenarios',
		'    And no rubric, threshold, or score appears in the .feature',
	].join('\n')
	assert.deepEqual(checkFeature('slug', 'x.feature', text), [])
})

test('a Then expressing a boolean verdict over a score is not a violation', () => {
	const text = [
		'Feature: orchestrator',
		'',
		'  Scenario: a graded subject still yields a boolean per scenario',
		'    Given aces-implementer evaluates with a threshold over N runs',
		'    When the aggregate score meets or exceeds the threshold',
		'    Then the impl-judge reports that scenario as passing',
		'    And reports failing when the aggregate score is below the threshold',
	].join('\n')
	assert.deepEqual(checkFeature('slug', 'x.feature', text), [])
})

// ─── checkFeature — scenario ordering / sectioning ───────────────────────────

test('a feature with >6 scenarios and no section comments fails ordering', () => {
	const scenarios = Array.from({ length: 7 }, (_, i) => [
		`  Scenario: scenario ${i + 1}`,
		'    Given x',
		'    When y',
		`    Then result ${i + 1}`,
	]).flat()
	const text = ['Feature: large feature', '', ...scenarios].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(v.some((m) => /section comments/.test(m)))
})

test('a feature with >6 scenarios AND section comments passes ordering', () => {
	const scenarios = Array.from({ length: 7 }, (_, i) => [
		`  Scenario: scenario ${i + 1}`,
		'    Given x',
		'    When y',
		`    Then result ${i + 1}`,
	]).flat()
	const text = ['Feature: large feature', '', '  # ── Stage 1 ──', '', ...scenarios].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /section comments/.test(m)))
})

test('a feature with <=6 scenarios needs no section comments', () => {
	const scenarios = Array.from({ length: 6 }, (_, i) => [
		`  Scenario: scenario ${i + 1}`,
		'    Given x',
		'    When y',
		`    Then result ${i + 1}`,
	]).flat()
	const text = ['Feature: small feature', '', ...scenarios].join('\n')
	const v = checkFeature('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /section comments/.test(m)))
})
