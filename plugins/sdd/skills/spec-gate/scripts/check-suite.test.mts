import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkFilePaths, checkSuite, discoverSuiteDirs, main, parseFilesArg, parseSuite } from './check-suite.mts'

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
		assert.deepEqual(checkFilePaths([clean]), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths flags a form violation in a named file', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-files-'))
	try {
		const hedged = join(root, 'hedged.feature')
		writeFileSync(hedged, HEDGED_SUITE)
		const v = checkFilePaths([hedged])
		assert.ok(v.some((m) => /non-boolean hedge/.test(m)))
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
		const v = checkFilePaths([clean, hedged])
		assert.ok(v.some((m) => /non-boolean hedge/.test(m)))
		assert.equal(v.filter((m) => /non-boolean hedge/.test(m)).length, 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkFilePaths fails closed on an unreadable path', () => {
	const v = checkFilePaths([join(tmpdir(), 'sdd-does-not-exist-xyz.feature')])
	assert.ok(v.some((m) => /cannot read file/.test(m)))
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
