import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	checkFilePaths,
	checkScenarioMap,
	checkSuite,
	checkTriggerContract,
	discoverSuiteDirs,
	findDeadRubric,
	main,
	type ParseError,
	parseFilesArg,
	parseGherkinValidateOutput,
	parseSuite,
} from './check-suite.mts'

const CLEAN_SUITE = [
	'Feature: clean',
	'',
	'  Scenario: happy path',
	'    Given the service is running',
	'    When the user acts',
	'    Then the response is ok',
].join('\n')

const HEDGED_SUITE = [
	'Feature: hedged',
	'',
	'  Scenario: hedge check',
	'    Given a condition',
	'    When an event happens',
	'    Then the system sometimes responds correctly',
].join('\n')

// ─── parseSuite ─────────────────────────────────────────────────────────────

test('parseSuite detects Feature: line', () => {
	const f = parseSuite('Feature: my feature\n\n  Scenario: a\n    Given x\n    When y\n    Then z\n')
	assert.equal(f.hasFeatureLine, true)
})

test('parseSuite detects missing Feature: line', () => {
	const f = parseSuite('  Scenario: a\n    Given x\n    When y\n    Then z\n')
	assert.equal(f.hasFeatureLine, false)
})

test('parseSuite counts scenarios and steps', () => {
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
	const f = parseSuite(text)
	assert.equal(f.scenarios.length, 2)
	assert.equal(f.scenarios[0].steps.length, 3)
	assert.equal(f.scenarios[1].steps.length, 2)
})

test('parseSuite counts section comments with ──', () => {
	const text = ['Feature: foo', '  # ── Stage 1 ──', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseSuite(text)
	assert.equal(f.sectionCommentCount, 1)
})

test('parseSuite counts section comments with --', () => {
	const text = ['Feature: foo', '  # -- Stage 1 --', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseSuite(text)
	assert.equal(f.sectionCommentCount, 1)
})

test('parseSuite does not count plain comments as section comments', () => {
	const text = ['Feature: foo', '  # just a comment', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseSuite(text)
	assert.equal(f.sectionCommentCount, 0)
})

// ─── checkSuite — clean feature passes ──────────────────────────────────────

test('a clean feature with Given/When/Then passes', () => {
	const text = [
		'Feature: greetings',
		'',
		'  Scenario: happy path',
		'    Given the service is running',
		'    When the user sends a greeting',
		'    Then the response is "hello"',
	].join('\n')
	assert.deepEqual(checkSuite('greet', 'greet.feature', text), [])
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
	assert.deepEqual(checkSuite('greet', 'greet.feature', text), [])
})

// ─── checkSuite — Gherkin validity failures ────────────────────────────────

test('missing Feature: line is a violation', () => {
	const text = ['  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Feature: line/.test(m)))
})

test('scenario missing Then is a violation', () => {
	const text = ['Feature: foo', '', '  Scenario: no assertion', '    Given x', '    When y'].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Then step/.test(m)))
})

test('scenario missing Given and When is a violation', () => {
	const text = ['Feature: foo', '', '  Scenario: no setup', '    Then the response is ok'].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing Given or When/.test(m)))
})

// ─── parseSuite — tags ──────────────────────────────────────────────────────

test('parseSuite attaches a @tag line to the scenario below it', () => {
	const text = ['Feature: foo', '', '  @rubric', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseSuite(text)
	assert.deepEqual(f.scenarios[0].tags, ['@rubric'])
})

test('parseSuite leaves an untagged scenario with empty tags', () => {
	const text = ['Feature: foo', '', '  Scenario: a', '    Given x', '    Then y'].join('\n')
	const f = parseSuite(text)
	assert.deepEqual(f.scenarios[0].tags, [])
})

// ─── checkSuite — boolean form failures ────────────────────────────────────

test('a positive Then asserting "score 1-5" embeds a rubric', () => {
	const text = [
		'Feature: foo',
		'',
		'  Scenario: rubric check',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the score 1-5 reflects quality',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
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
	const v = checkSuite('slug', 'x.feature', text)
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
	const v = checkSuite('slug', 'x.feature', text)
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
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /non-boolean hedge/.test(m)))
})

// ─── checkSuite — @rubric carve-out (the sanctioned rubric form) ───────────

test('a @rubric-tagged scenario may assert score and threshold', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: spec-judge scores a rubric scenario above threshold and passes it',
		'    Given a @rubric-tagged scenario that passes structural validation',
		'    When the judge scores each dimension',
		'    Then the total score is at or above the threshold',
		'    And the judge emits pass',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

test('an untagged scenario asserting a score still embeds a rubric', () => {
	const text = [
		'Feature: rubric',
		'',
		'  Scenario: no tag',
		'    Given output',
		'    When evaluated',
		'    Then the total score is at or above the threshold',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /embeds a rubric/.test(m)))
})

test('a @rubric tag does not excuse a probabilistic hedge', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: hedged rubric',
		'    Given a rubric scenario',
		'    When scored',
		'    Then the judge sometimes passes it',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /non-boolean hedge/.test(m)))
})

// ─── findDeadRubric — vacuous rubric (sum(max) < threshold) ────────────────

test('findDeadRubric flags sum(max) < threshold', () => {
	const doc = [
		'dimensions:',
		'  - name: correctness',
		'    max: 3',
		'  - name: completeness',
		'    max: 2',
		'threshold: 6',
	].join('\n')
	assert.deepEqual(findDeadRubric(doc), { dimensionsTotal: 5, threshold: 6 })
})

test('findDeadRubric does NOT flag sum(max) === threshold (legal strict bar)', () => {
	const doc = [
		'dimensions:',
		'  - name: correctness',
		'    max: 3',
		'  - name: completeness',
		'    max: 2',
		'threshold: 5',
	].join('\n')
	assert.equal(findDeadRubric(doc), null)
})

test('findDeadRubric does not flag sum(max) > threshold', () => {
	const doc = [
		'dimensions:',
		'  - name: correctness',
		'    max: 3',
		'  - name: completeness',
		'    max: 2',
		'threshold: 4',
	].join('\n')
	assert.equal(findDeadRubric(doc), null)
})

test('findDeadRubric returns null on a missing threshold', () => {
	const doc = ['dimensions:', '  - name: correctness', '    max: 3'].join('\n')
	assert.equal(findDeadRubric(doc), null)
})

test('findDeadRubric returns null on no max: lines (no dimensions found)', () => {
	const doc = ['threshold: 4', 'notes: nothing here'].join('\n')
	assert.equal(findDeadRubric(doc), null)
})

test('findDeadRubric returns null on non-numeric threshold, no crash', () => {
	const doc = ['dimensions:', '  - name: correctness', '    max: 3', 'threshold: many'].join('\n')
	assert.equal(findDeadRubric(doc), null)
})

// ─── checkSuite — dead rubric wiring (@rubric scenarios only) ─────────────

test('a @rubric scenario whose rubric sums below threshold is a violation', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: some name',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge evaluates the scenario against the rubric',
		'      """',
		'      dimensions:',
		'        - name: correctness',
		'          max: 3',
		'        - name: completeness',
		'          max: 2',
		'      threshold: 6',
		'      """',
		'    And the rubric score is at least the threshold',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(
		v.some((m) => /rubric cannot be passed — dimensions total 5, threshold 6/.test(m)),
		v.join('\n'),
	)
})

test('a @rubric scenario whose rubric sums exactly to threshold is NOT a violation (control)', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: some name',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge evaluates the scenario against the rubric',
		'      """',
		'      dimensions:',
		'        - name: correctness',
		'          max: 3',
		'        - name: completeness',
		'          max: 2',
		'      threshold: 5',
		'      """',
		'    And the rubric score is at least the threshold',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /rubric cannot be passed/.test(m)), v.join('\n'))
})

test('a @rubric scenario whose rubric sums above threshold is not a violation', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: some name',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge evaluates the scenario against the rubric',
		'      """',
		'      dimensions:',
		'        - name: correctness',
		'          max: 3',
		'        - name: completeness',
		'          max: 2',
		'      threshold: 4',
		'      """',
		'    And the rubric score is at least the threshold',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /rubric cannot be passed/.test(m)))
})

test('a non-@rubric scenario with similar-looking DocString text is not a violation', () => {
	const text = [
		'Feature: rubric',
		'',
		'  Scenario: some name without the tag',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge evaluates the scenario against the rubric',
		'      """',
		'      dimensions:',
		'        - name: correctness',
		'          max: 3',
		'        - name: completeness',
		'          max: 2',
		'      threshold: 6',
		'      """',
		'    And the rubric score is at least the threshold',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /rubric cannot be passed/.test(m)))
})

test('a @rubric scenario with a malformed/absent rubric DocString does not crash and is not a violation', () => {
	const text = [
		'Feature: rubric',
		'',
		'  @rubric',
		'  Scenario: no docstring at all',
		'    Given the agent produces output',
		'    When the output is evaluated',
		'    Then the judge evaluates the scenario against the rubric',
		'    And the rubric score is at least the threshold',
	].join('\n')
	assert.doesNotThrow(() => checkSuite('slug', 'x.feature', text))
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /rubric cannot be passed/.test(m)))
})

// ─── checkSuite — meta-spec exemptions (a spec about rubrics is not a rubric) ──

test('a Given mentioning a rubric is not a violation (setup, not assertion)', () => {
	const text = [
		'Feature: operator',
		'',
		'  Scenario: the suite carries no rubric',
		'    Given the impl-producer authored a 1-5 rubric for a scenario',
		'    When the .feature file is inspected',
		'    Then it contains only boolean Given/When/Then scenarios',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

test('a negated Then asserting the absence of a rubric is not a violation', () => {
	const text = [
		'Feature: operator',
		'',
		'  Scenario: the suite carries no rubric',
		'    Given a frozen contract',
		'    When the .feature file is inspected',
		'    Then it contains only boolean scenarios',
		'    And no rubric, threshold, or score appears in the .feature',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

test('a Then expressing a boolean verdict over a score is not a violation', () => {
	const text = [
		'Feature: operator',
		'',
		'  Scenario: a graded subject still yields a boolean per scenario',
		'    Given aced-implementer evaluates with a threshold over N runs',
		'    When the aggregate score meets or exceeds the threshold',
		'    Then the impl-judge reports that scenario as passing',
		'    And reports failing when the aggregate score is below the threshold',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

test('a Then naming a rubric verdict is a boolean outcome, not a leaked grade', () => {
	const text = [
		'Feature: autonomy',
		'',
		'  Scenario: an eval flags a posture mismatch',
		'    Given an agent config is evaluated against the rubric',
		'    And an escalation point whose posture mismatches the rubric verdict',
		'    When the eval runs',
		'    Then the escalation point is flagged',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

// ─── parseSuite / checkSuite — Scenario Outline Examples ───────────────────

test('parseSuite marks a Scenario Outline and parses its Examples table', () => {
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
	const f = parseSuite(text)
	assert.equal(f.scenarios[0].isOutline, true)
	assert.deepEqual(f.scenarios[0].placeholders, ['query', 'should_trigger'])
	assert.deepEqual(f.scenarios[0].examples?.header, ['query', 'should_trigger'])
	assert.equal(f.scenarios[0].examples?.rows.length, 2)
})

test('a plain Scenario is not marked as an outline', () => {
	const text = ['Feature: foo', '', '  Scenario: a', '    Given x', '    When y', '    Then z'].join('\n')
	const f = parseSuite(text)
	assert.equal(f.scenarios[0].isOutline, false)
	assert.equal(f.scenarios[0].examples, null)
})

test('a well-formed Scenario Outline with covering Examples passes', () => {
	const text = [
		'Feature: trigger',
		'',
		'  Scenario Outline: activation',
		'    Given a query "<query>"',
		'    When evaluated',
		'    Then invocation is "<should_trigger>"',
		'    Examples:',
		'      | query | should_trigger |',
		'      | draw  | yes            |',
	].join('\n')
	assert.deepEqual(checkSuite('slug', 'x.feature', text), [])
})

test('a Scenario Outline with no Examples table is a violation', () => {
	const text = [
		'Feature: trigger',
		'',
		'  Scenario Outline: activation',
		'    Given a query "<query>"',
		'    When evaluated',
		'    Then invocation is "<should_trigger>"',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /Scenario Outline has no non-empty Examples table/.test(m)))
})

test('a Scenario Outline with an empty Examples table (header only) is a violation', () => {
	const text = [
		'Feature: trigger',
		'',
		'  Scenario Outline: activation',
		'    Given a query "<query>"',
		'    When evaluated',
		'    Then invocation is "<should_trigger>"',
		'    Examples:',
		'      | query | should_trigger |',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /Scenario Outline has no non-empty Examples table/.test(m)))
})

test('a Scenario Outline whose Examples miss a placeholder column is a violation', () => {
	const text = [
		'Feature: trigger',
		'',
		'  Scenario Outline: activation',
		'    Given a query "<query>"',
		'    When evaluated',
		'    Then invocation is "<should_trigger>"',
		'    Examples:',
		'      | query |',
		'      | draw  |',
	].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /missing column\(s\) for placeholder\(s\): should_trigger/.test(m)))
})

// ─── checkTriggerContract — @trigger outline activation contract (advisory) ───

test('a @trigger outline missing should_trigger produces a finding', () => {
	const text = [
		'Feature: trigger',
		'',
		'  @trigger',
		'  Scenario Outline: the config activates on a matching query',
		'    Given a user query "<query>"',
		'    When the agent decides whether to invoke the config',
		'    Then invocation follows',
		'',
		'    Examples:',
		'      | query        |',
		'      | make a chart |',
	].join('\n')
	const f = checkTriggerContract('slug', 'x.feature', text)
	assert.equal(f.length, 1)
	assert.match(f[0] ?? '', /no should_trigger column/)
})

test('a @trigger outline missing query produces a finding', () => {
	const text = [
		'Feature: trigger',
		'',
		'  @trigger',
		'  Scenario Outline: the config activates on a matching query',
		'    Given a user query',
		'    When the agent decides whether to invoke the config',
		'    Then invocation is "<should_trigger>"',
		'',
		'    Examples:',
		'      | should_trigger |',
		'      | yes            |',
	].join('\n')
	const f = checkTriggerContract('slug', 'x.feature', text)
	assert.equal(f.length, 1)
	assert.match(f[0] ?? '', /no query column/)
})

test('CONTROL: a @trigger outline carrying both query and should_trigger produces no finding', () => {
	const text = [
		'Feature: trigger',
		'',
		'  @trigger',
		'  Scenario Outline: the config activates on a matching query',
		'    Given a user query "<query>"',
		'    When the agent decides whether to invoke the config',
		'    Then invocation is "<should_trigger>"',
		'',
		'    Examples:',
		'      | query        | should_trigger |',
		'      | make a chart | yes            |',
	].join('\n')
	assert.deepEqual(checkTriggerContract('slug', 'x.feature', text), [])
})

test('SCOPE GUARD: an untagged Scenario Outline with neither column produces no finding', () => {
	const text = [
		'Feature: decision table',
		'',
		'  Scenario Outline: a plain enumerated decision table',
		'    Given input "<input>"',
		'    When processed',
		'    Then output is "<output>"',
		'',
		'    Examples:',
		'      | input | output |',
		'      | a     | b      |',
	].join('\n')
	assert.deepEqual(checkTriggerContract('slug', 'x.feature', text), [])
})

// The fixture must exhibit the forbidden difference: a plain `Scenario` with NO Examples table is
// already absorbed by the no-table guard above, so it would pass this test no matter what the
// isOutline guard did. The pinned parser accepts a plain `Scenario:` carrying an `Examples:` table
// (verified — 0 errors), so that input is reachable and is the only fixture that binds this guard:
// it clears every other clause and reaches the rule on the outline check alone.
test('SCOPE GUARD: a plain @trigger Scenario (not an outline) produces no finding', () => {
	const text = [
		'Feature: trigger',
		'',
		'  @trigger',
		'  Scenario: a single activation case',
		'    Given a user query "make a chart"',
		'    When the agent decides whether to invoke the config',
		'    Then invocation is yes',
		'',
		'    Examples:',
		'      | note        |',
		'      | not a table |',
	].join('\n')
	assert.deepEqual(checkTriggerContract('slug', 'x.feature', text), [])
})

test('an outline with no Examples table yields the blocking violation, not an advisory finding', () => {
	const text = [
		'Feature: trigger',
		'',
		'  @trigger',
		'  Scenario Outline: the config activates on a matching query',
		'    Given a user query "<query>"',
		'    When the agent decides whether to invoke the config',
		'    Then invocation is "<should_trigger>"',
	].join('\n')
	assert.deepEqual(checkTriggerContract('slug', 'x.feature', text), [])
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(v.some((m) => /Scenario Outline has no non-empty Examples table/.test(m)))
})

// ─── the partition invariant — a finding never weakens a blocking violation ───

// The other half of the partition, at the checkFilePaths wiring level rather than in
// checkTriggerContract's isolation: an advisory finding ALONE must leave violations empty, so the
// gate's exit code is untouched. Without this, the tier could be wired to push into violations and
// only the mixed-file test below would notice — and it asserts violations is NON-empty, which a
// mis-wired advisory would satisfy for the wrong reason.
test('a file carrying only a @trigger finding yields that finding and NO violation', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-advisory-only-'))
	try {
		const text = [
			'Feature: trigger',
			'',
			'  @trigger',
			'  Scenario Outline: the config activates on a matching query',
			'    Given a user query "<query>"',
			'    When the agent decides whether to invoke the config',
			'    Then invocation is "<query>"',
			'',
			'    Examples:',
			'      | query        |',
			'      | make a chart |',
		].join('\n')
		const p = join(root, 'advisory.feature')
		writeFileSync(p, text)
		const { findings, violations } = checkFilePaths([p], root, () => new Map([[p, []]]))
		assert.ok(findings.some((m) => /no should_trigger column/.test(m)))
		assert.deepEqual(violations, [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a file carrying both a @trigger finding and a blocking violation still yields a non-empty violations', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-partition-'))
	try {
		const text = [
			'Feature: trigger',
			'',
			'  @trigger',
			'  Scenario Outline: the config sometimes activates on a matching query',
			'    Given a user query "<query>"',
			'    When the agent decides whether to invoke the config',
			'    Then invocation sometimes follows',
			'',
			'    Examples:',
			'      | query        |',
			'      | make a chart |',
		].join('\n')
		const p = join(root, 'mixed.feature')
		writeFileSync(p, text)
		const { findings, violations } = checkFilePaths([p], root, () => new Map([[p, []]]))
		assert.ok(findings.some((m) => /no should_trigger column/.test(m)))
		assert.ok(violations.some((m) => /non-boolean hedge/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a file with parse errors yields no advisory findings', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-partition-'))
	try {
		const text = [
			'@frozen',
			'Feature: trigger',
			'',
			'  @trigger',
			'  Scenario Outline: wrapped step',
			'    Given a step that wraps',
			'      onto the next line',
			'    Then it holds',
			'',
			'    Examples:',
			'      | query        |',
			'      | make a chart |',
		].join('\n')
		const p = join(root, 'broken.feature')
		writeFileSync(p, text)
		const fakeValidate = () => new Map([[p, [{ line: 7, message: 'expected: #EOF, got bad token' }]]])
		const { findings, violations } = checkFilePaths([p], root, fakeValidate)
		assert.deepEqual(findings, [])
		assert.ok(violations.some((m) => /cannot parse as Gherkin/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── checkSuite — scenario ordering / sectioning ───────────────────────────

test('a feature with >6 scenarios and no section comments fails ordering', () => {
	const scenarios = Array.from({ length: 7 }, (_, i) => [
		`  Scenario: scenario ${i + 1}`,
		'    Given x',
		'    When y',
		`    Then result ${i + 1}`,
	]).flat()
	const text = ['Feature: large feature', '', ...scenarios].join('\n')
	const v = checkSuite('slug', 'x.feature', text)
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
	const v = checkSuite('slug', 'x.feature', text)
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
	const v = checkSuite('slug', 'x.feature', text)
	assert.ok(!v.some((m) => /section comments/.test(m)))
})

// ─── discovery — recurses into nested spec folders ───────────────────────────

test('discoverSuiteDirs finds both top-level and nested .feature files', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-feat-'))
	try {
		mkdirSync(join(root, 'auth'), { recursive: true })
		writeFileSync(join(root, 'auth', 'auth.feature'), 'Feature: auth\n')
		mkdirSync(join(root, 'sdd', 'sdd-skill'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'sdd-skill', 'sdd-skill.feature'), 'Feature: sdd-skill\n')
		mkdirSync(join(root, 'sdd', 'no-feature'), { recursive: true })

		const found = discoverSuiteDirs(root)
			.map((d) => d.slug)
			.sort()
		assert.deepEqual(found, ['auth', join('sdd', 'sdd-skill')].sort())
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('discoverSuiteDirs skips node_modules and dot dirs', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-feat-'))
	try {
		mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true })
		writeFileSync(join(root, 'node_modules', 'pkg', 'x.feature'), 'Feature: x\n')
		mkdirSync(join(root, '.cache'), { recursive: true })
		writeFileSync(join(root, '.cache', 'x.feature'), 'Feature: x\n')
		assert.deepEqual(discoverSuiteDirs(root), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── --files mode — the gate scopes to a CR's touched features ────────────────

test('parseFilesArg collects the paths after --files', () => {
	assert.deepEqual(parseFilesArg(['--files', 'a.feature', 'b.feature']), ['a.feature', 'b.feature'])
})

test('parseFilesArg stops at the next flag', () => {
	assert.deepEqual(parseFilesArg(['--files', 'a.feature', '--root', 'x']), ['a.feature'])
})

test('parseFilesArg returns empty without --files', () => {
	assert.deepEqual(parseFilesArg(['--root', '.agents/specs']), [])
})

test('checkFilePaths checks only the named files, not siblings', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-files-'))
	try {
		const clean = join(root, 'clean.feature')
		writeFileSync(clean, CLEAN_SUITE)
		// A hedged sibling in the same dir must NOT be picked up when only clean is named.
		writeFileSync(join(root, 'hedged.feature'), HEDGED_SUITE)
		assert.deepEqual(checkFilePaths([clean]).violations, [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths flags a form violation in a named file', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-files-'))
	try {
		const hedged = join(root, 'hedged.feature')
		writeFileSync(hedged, HEDGED_SUITE)
		const { violations } = checkFilePaths([hedged])
		assert.ok(violations.some((m) => /non-boolean hedge/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths checks multiple named files', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-files-'))
	try {
		const clean = join(root, 'clean.feature')
		const hedged = join(root, 'hedged.feature')
		writeFileSync(clean, CLEAN_SUITE)
		writeFileSync(hedged, HEDGED_SUITE)
		const { violations } = checkFilePaths([clean, hedged])
		assert.ok(violations.some((m) => /non-boolean hedge/.test(m)))
		assert.equal(violations.filter((m) => /non-boolean hedge/.test(m)).length, 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths fails closed on an unreadable path', () => {
	const { violations } = checkFilePaths([join(tmpdir(), 'sdd-does-not-exist-xyz.feature')])
	assert.ok(violations.some((m) => /cannot read file/.test(m)))
})

test('main --files returns 1 when no paths follow', () => {
	assert.equal(main(['--files']), 1)
})

test('main --files returns 0 on a clean file and 1 on a violation', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-files-'))
	try {
		const clean = join(root, 'clean.feature')
		const hedged = join(root, 'hedged.feature')
		writeFileSync(clean, CLEAN_SUITE)
		writeFileSync(hedged, HEDGED_SUITE)
		assert.equal(main(['--files', clean]), 0)
		assert.equal(main(['--files', hedged]), 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── Gherkin parse guard — fail closed, never fail open ───────────────────────
// A soft-wrapped step has no Gherkin continuation form, so the pinned parser rejects it at the
// wrapped line — an EPARSE the permissive `parseSuite` scan cannot see (it just reads the wrapped
// remainder as a bare, ignored line). The fixture below also carries a "sometimes" hedge on its
// Then step, so a permissive read would ADDITIONALLY trip the boolean-form check — proving the
// parse violation REPLACES that finding rather than joining it.
// Unparseable to the pinned parser, yet FLAWLESS to the permissive scan: the wrapped remainder
// starts with no step keyword, so parseSuite simply skips it and sees Feature + Given + Then. No
// hedge, no rubric, no missing step. A check that fails this file closed can only be reading the
// real parser's verdict — nothing else here is failable, which is what makes it a valid probe.
const UNPARSEABLE_ONLY = [
	'@frozen',
	'Feature: broken',
	'',
	'  Scenario: wrapped step',
	'    Given a step that wraps',
	'      onto the next line',
	'    Then it holds',
].join('\n')

const UNPARSEABLE_AND_HEDGED = [
	'@frozen',
	'Feature: broken',
	'',
	'  Scenario: wrapped step',
	'    Given a step that wraps',
	'      onto the next line',
	'    Then it sometimes holds',
].join('\n')

test('parseGherkinValidateOutput maps each reported file to its errors', () => {
	const stdout = JSON.stringify({
		summary: { files: 2, errors: 1 },
		files: [
			{ file: 'a.feature', ok: false, errors: [{ line: 6, message: 'boom', code: 'EPARSE' }] },
			{ file: 'b.feature', ok: true, errors: [] },
		],
	})
	const map = parseGherkinValidateOutput(stdout)
	assert.deepEqual(map.get('a.feature'), [{ line: 6, message: 'boom' }])
	assert.deepEqual(map.get('b.feature'), [])
})

test('checkSuite fails closed and reports the line when parse errors are passed', () => {
	const parseErrors: ParseError[] = [{ line: 6, message: 'expected: #EOF, got bad token' }]
	const v = checkSuite('slug', 'broken.feature', UNPARSEABLE_AND_HEDGED, parseErrors)
	assert.ok(v.some((m) => /cannot parse as Gherkin at line 6/.test(m)))
})

test('a parse failure replaces the form findings rather than joining them', () => {
	const parseErrors: ParseError[] = [{ line: 6, message: 'expected: #EOF, got bad token' }]
	const v = checkSuite('slug', 'broken.feature', UNPARSEABLE_AND_HEDGED, parseErrors)
	assert.equal(v.length, 1, 'only the parse violation is reported')
	assert.ok(!v.some((m) => /non-boolean hedge/.test(m)), 'the hedge finding from the permissive scan is absent')
})

test('a file that parses (no parse errors passed) raises no parse violation', () => {
	const v = checkSuite('greet', 'greet.feature', CLEAN_SUITE, [])
	assert.ok(!v.some((m) => /cannot parse as Gherkin/.test(m)))
})

test('checkFilePaths fails closed on a file the injected validator reports a parse error for, replacing form findings', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-parse-'))
	try {
		const broken = join(root, 'broken.feature')
		writeFileSync(broken, UNPARSEABLE_AND_HEDGED)
		const fakeValidate = () => new Map([[broken, [{ line: 6, message: 'expected: #EOF, got bad token' }]]])
		const { findings, violations } = checkFilePaths([broken], root, fakeValidate)
		assert.equal(violations.length, 1)
		assert.ok(violations.some((m) => /cannot parse as Gherkin at line 6/.test(m)))
		assert.ok(!violations.some((m) => /non-boolean hedge/.test(m)))
		assert.deepEqual(findings, [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths raises no parse violation for a file the injected validator reports clean', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-parse-'))
	try {
		const clean = join(root, 'clean.feature')
		writeFileSync(clean, CLEAN_SUITE)
		const fakeValidate = () => new Map([[clean, []]])
		const { violations } = checkFilePaths([clean], root, fakeValidate)
		assert.deepEqual(violations, [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths fails closed when the validator omits a file from its report', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-parse-'))
	try {
		const clean = join(root, 'clean.feature')
		writeFileSync(clean, CLEAN_SUITE)
		// The validator's map has no entry at all for `clean` — defaulting the missing entry to
		// "parses fine" (an empty array) is the exact fail-open bug this guard closes.
		const fakeValidate = () => new Map<string, ParseError[]>()
		const { violations } = checkFilePaths([clean], root, fakeValidate)
		assert.ok(violations.some((m) => /returned no result for this file/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths fails every readable path closed when the validator throws', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-parse-'))
	try {
		const a = join(root, 'a.feature')
		const b = join(root, 'b.feature')
		writeFileSync(a, CLEAN_SUITE)
		writeFileSync(b, CLEAN_SUITE)
		const fakeValidate = () => {
			throw new Error('parser genuinely could not run')
		}
		const { violations } = checkFilePaths([a, b], root, fakeValidate)
		assert.equal(violations.length, 2)
		assert.ok(violations.every((m) => /cannot verify Gherkin validity/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ── integration: the real pinned npx boundary (one per engine, proves the wiring) ──

test('runGherkinValidate against the real pinned parser reports a real EPARSE for an unparseable file', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-parse-real-'))
	try {
		const broken = join(root, 'broken.feature')
		writeFileSync(broken, UNPARSEABLE_AND_HEDGED)
		const { violations } = checkFilePaths([broken], root)
		assert.equal(violations.length, 1, 'the real parser replaces the form findings with the one parse violation')
		assert.ok(violations.some((m) => /cannot parse as Gherkin at line 6/.test(m)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── the tree-wide --root sweep ───────────────────────────────────────────────
// These drive main(['--root', ...]) rather than checkFilePaths, because the sweep's contract is a
// claim about the COMPOSITION (discoverSuiteDirs feeding the validated path), not about
// checkFilePaths in isolation. Reverting main's --root branch to a bare parseSuite scan leaves
// every checkFilePaths-level test green, so only this level can catch that regression.

function withCorpus(files: Record<string, string>, run: (root: string) => void): void {
	const root = mkdtempSync(join(tmpdir(), 'sdd-corpus-'))
	try {
		for (const [rel, body] of Object.entries(files)) {
			const full = join(root, rel)
			mkdirSync(dirname(full), { recursive: true })
			writeFileSync(full, body)
		}
		run(root)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
}

test('the corpus sweep fails closed on an unparseable suite', () => {
	withCorpus({ 'unit/broken.feature': UNPARSEABLE_ONLY, 'unit/fine.feature': CLEAN_SUITE }, (root) => {
		assert.equal(main(['--root', root]), 1, 'an unparseable suite anywhere in the corpus fails the sweep closed')
	})
})

test('the corpus sweep names the unparseable file', () => {
	withCorpus({ 'unit/broken.feature': UNPARSEABLE_ONLY }, (root) => {
		const errors: string[] = []
		const restore = console.error
		console.error = (m: string) => errors.push(String(m))
		try {
			main(['--root', root])
		} finally {
			console.error = restore
		}
		assert.ok(
			errors.some((m) => /broken\.feature/.test(m) && /cannot parse as Gherkin/.test(m)),
			'the sweep names the unparseable file and why it failed',
		)
	})
})

test('the corpus sweep raises no parse violation when every suite parses', () => {
	withCorpus({ 'unit/a.feature': CLEAN_SUITE, 'nested/deep/b.feature': CLEAN_SUITE }, (root) => {
		assert.equal(main(['--root', root]), 0, 'a corpus that parses wholly does not fail the sweep closed')
	})
})

// ─── scenario-map binding ─────────────────────────────────────────────────────

const FEAT = `@frozen
Feature: demo

  Scenario: alpha branches left
    Given a thing
    When it runs
    Then it goes left

  Scenario: beta branches right
    Given another thing
    When it runs
    Then it goes right
`

const SPEC_OK = `# demo

## Scenario map

| Edge | Path (Given) | Scenario |
|---|---|---|
| D1 | a thing | \`alpha branches left\` |
| D1 | another thing | \`beta branches right\` |
`

test('a complete scenario map reports nothing', () => {
	assert.deepEqual(checkScenarioMap('demo', 'demo.feature', FEAT, SPEC_OK), [])
})

test('an edge repeated under a DIFFERENT path is permutation coverage, not a duplicate', () => {
	// Both rows sit on D1; they differ by path class, which is exactly what the model allows.
	assert.equal(checkScenarioMap('demo', 'demo.feature', FEAT, SPEC_OK).length, 0)
})

test('a scenario absent from the map is reported as an orphan', () => {
	const spec = SPEC_OK.replace('| D1 | another thing | `beta branches right` |\n', '')
	const v = checkScenarioMap('demo', 'demo.feature', FEAT, spec)
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /not on the scenario map — "beta branches right"/)
})

test('a map row naming no such scenario is reported', () => {
	const spec = `${SPEC_OK}| D2 | ghost path | \`gamma that does not exist\` |\n`
	const v = checkScenarioMap('demo', 'demo.feature', FEAT, spec)
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /names no such scenario — "gamma that does not exist"/)
})

test('two rows sharing an edge AND a path class are a duplicate', () => {
	const spec = SPEC_OK.replace('| D1 | another thing |', '| D1 | a thing |')
	const v = checkScenarioMap('demo', 'demo.feature', FEAT, spec)
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /duplicate map pair/)
})

test('a spec carrying no scenario map section is SKIPPED, not failed', () => {
	// The map is the rebuilt node format; a node still on the older shape is not in violation.
	assert.deepEqual(checkScenarioMap('demo', 'demo.feature', FEAT, '# demo\n\nno map here\n'), [])
})
