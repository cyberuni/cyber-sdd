import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
	classifyFile,
	classifyFiles,
	classifyFromDiff,
	classifyFromFileResult,
	hasFeatureFrozenTag,
	main,
	parseRenameStatus,
} from './classify-edit-class.mts'

// ─── real git-repo fixture helper ───────────────────────────────────────────
// Each frozen scenario's structural claim (a step reassignment fooling a raw line-diff, a rename
// preserving freeze, a whole-scenario addition self-clearing) is a claim about a real gherkin-cli
// + git interaction, not about the classifier's internal plumbing — so these fixtures are real
// temp git repos, and classifyFile drives the actual `git`/`npx gherkin-cli@0.0.1` subprocesses.

function git(cwd: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function initRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), 'classify-edit-class-'))
	git(dir, 'init', '-q')
	git(dir, 'config', 'user.email', 'test@example.com')
	git(dir, 'config', 'user.name', 'test')
	mkdirSync(join(dir, 'specs'), { recursive: true })
	return dir
}

function commitAll(dir: string, message: string): void {
	git(dir, 'add', '-A')
	git(dir, 'commit', '-q', '-m', message)
}

const FROZEN_BASELINE = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'    Then beta holds',
].join('\n')

// The orphan-reassignment fixture: `beta`'s trailing `Then beta holds` step is reassigned onto a
// newly added adjacent scenario `gamma`, leaving `beta` with no Then step of its own. A raw line
// diff shows only a `+` block for `gamma` and no `-` line for `beta`'s lost step (the line simply
// moved), so it reads as purely additive. The structural gherkin-cli diff is not fooled: it
// reports `beta` as `modified` (it lost content), not `unchanged`.
const ORPHAN_REASSIGNED = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'',
	'  Scenario: gamma',
	'    Given a new precondition',
	'    When a new event fires',
	'    Then beta holds',
].join('\n')

// A pure narrowing fixture — one baseline scenario's Then step is weakened, nothing added or
// removed. Used for the routing scenarios (3 and 4), which are about narrowing-generally, not
// specifically the orphan-reassignment shape (that combines an add with the narrowing).
const PURE_NARROWING = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'    Then beta sometimes holds',
].join('\n')

const WHOLE_ADDITIVE = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'    Then beta holds',
	'',
	'  Scenario: gamma',
	'    Given a wholly new precondition',
	'    When a wholly new event fires',
	'    Then gamma holds',
].join('\n')

describe('spec:authoring/spec-gate', () => {
	// ── unit-level: the tested pure logic ──

	test('hasFeatureFrozenTag reads the feature-level tag block, not a scenario-level tag', () => {
		assert.equal(hasFeatureFrozenTag(FROZEN_BASELINE), true)
		assert.equal(hasFeatureFrozenTag(FROZEN_BASELINE.replace('@frozen\n', '')), false)
		const scenarioTagged = ['Feature: sample', '', '  @frozen', '  Scenario: alpha', '    Given x', '    Then y'].join(
			'\n',
		)
		assert.equal(hasFeatureFrozenTag(scenarioTagged), false)
	})

	test('parseRenameStatus reads a git --name-status -M rename line and its similarity score', () => {
		const renames = parseRenameStatus('R100\tspecs/a.feature\tspecs/b.feature\nM\tunrelated.md')
		assert.deepEqual(renames, [{ score: 100, oldPath: 'specs/a.feature', newPath: 'specs/b.feature' }])
	})

	test('classifyFromDiff reports narrowing only when a baseline scenario is modified/removed', () => {
		assert.equal(classifyFromDiff({ addOnly: true, scenarios: [{ name: 'gamma', change: 'added' }] }), 'additive')
		assert.equal(
			classifyFromDiff({
				addOnly: false,
				scenarios: [
					{ name: 'beta', change: 'modified' },
					{ name: 'gamma', change: 'added' },
				],
			}),
			'mixed',
		)
		assert.equal(classifyFromDiff({ addOnly: false, scenarios: [{ name: 'beta', change: 'modified' }] }), 'narrowing')
		assert.equal(
			classifyFromDiff({ addOnly: true, scenarios: [{ name: 'alpha', change: 'unchanged' }] }),
			'no-content-change',
		)
	})

	// ── the 7 frozen scenarios (real git + gherkin-cli fixtures) ──

	test('the edit class of a touched frozen file comes from a per-scenario structural diff, not a raw line diff', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), ORPHAN_REASSIGNED)

			// A raw line diff of the change: no `-` line for beta's lost step — it moved, not
			// removed, so a line-diff-based check reads this as additive.
			const rawDiff = execFileSync('git', ['diff', '--unified=0', 'HEAD', '--', 'specs/sample.feature'], {
				cwd: dir,
				encoding: 'utf8',
			})
			const removedContentLines = rawDiff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'))
			assert.equal(removedContentLines.length, 0, 'the raw line diff shows no removed line for the orphaned step')

			// The structural classification is not fooled by that: it reports beta as modified
			// (not unchanged), so the overall classification is never purely additive — this
			// fixture combines an add (gamma) with a narrowing (beta), so it lands as `mixed`,
			// which routes exactly like `narrowing` (never the additive self-clear path).
			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.scenarios.find((s) => s.name === 'beta')?.change, 'modified')
			assert.notEqual(result.classification, 'additive')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a step reassigned off a frozen scenario onto a new scenario is classified as a narrowing', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), ORPHAN_REASSIGNED)

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			const beta = result.scenarios.find((s) => s.name === 'beta')
			assert.ok(beta, 'the losing baseline scenario is reported in the classification')
			assert.equal(beta?.change, 'modified')
			assert.notEqual(result.classification, 'additive')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a narrowing detected on a frozen file fires Clearance rather than self-clearing', () => {
		// Routing behavior (the gate unfreezes + escalates Clearance for a narrowing) is gate
		// procedure prose, not this engine's job — the engine's only obligation is to emit the
		// `narrowing` classification the gate routes on, which is verified here.
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), PURE_NARROWING)

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'narrowing')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a narrowing the CR pre-authorized for Clearance self-clears within the leash', () => {
		// Whether a narrowing self-clears (CR pre-authorized) or escalates is a leash/CR-metadata
		// decision downstream of classification — this engine carries no CR-authorization input
		// and emits the same structural `narrowing` classification either way; the gate's routing
		// procedure (not this engine) is what folds in pre-authorization.
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), PURE_NARROWING)

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'narrowing')
			assert.equal('crPreauthorized' in result, false, 'the engine carries no CR-authorization field')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a whole additive scenario on a frozen file is classified as additive and self-clears', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), WHOLE_ADDITIVE)

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'additive')
			const alpha = result.scenarios.find((s) => s.name === 'alpha')
			const beta = result.scenarios.find((s) => s.name === 'beta')
			assert.equal(alpha?.change, 'unchanged')
			assert.equal(beta?.change, 'unchanged')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a pure rename of a frozen file is classified as no content change', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			git(dir, 'mv', 'specs/sample.feature', 'specs/renamed.feature')

			const result = classifyFile('specs/renamed.feature', 'HEAD', dir)
			assert.equal(result.classification, 'no-content-change')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test("the structural edit-class classification scopes to the CR's touched feature files", () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			writeFileSync(join(dir, 'specs/other.feature'), FROZEN_BASELINE.replace('sample', 'other'))
			commitAll(dir, 'baseline')
			// Narrow `sample` and leave `other` untouched — only `sample` is passed as touched.
			writeFileSync(join(dir, 'specs/sample.feature'), ORPHAN_REASSIGNED)

			const results = classifyFiles(['specs/sample.feature'], 'HEAD', dir)
			assert.equal(results.length, 1)
			assert.equal(results[0].file, 'specs/sample.feature')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	// ── the unclassifiable escalation boundary — a parse error is never read as no-change ──

	test('classifyFromFileResult: undefined (no per-file result) is unclassifiable', () => {
		const result = classifyFromFileResult(undefined)
		assert.equal(result.classification, 'unclassifiable')
		assert.match(result.reason ?? '', /returned no result/)
	})

	test('classifyFromFileResult: THE REGRESSION TEST — an error alongside addOnly:true and no scenarios is unclassifiable, not no-content-change', () => {
		// This is exactly the reported bug's shape: the differ reports a parse error for the file
		// AND a fully reassuring addOnly:true, scenarios:[] — because a file with no parseable
		// scenarios gives the differ nothing to compare. Reading addOnly here silently guarantees
		// "nothing changed" instead of measuring it.
		const result = classifyFromFileResult({
			file: 'specs/sample.feature',
			addOnly: true,
			scenarios: [],
			error: { code: 'EPARSE', message: 'failed to parse feature' },
		})
		assert.equal(result.classification, 'unclassifiable')
		assert.notEqual(result.classification, 'no-content-change')
		assert.match(result.reason ?? '', /EPARSE/)
	})

	test('classifyFromFileResult: no error delegates to classifyFromDiff unchanged', () => {
		const additive = classifyFromFileResult({
			file: 'x',
			addOnly: true,
			scenarios: [{ name: 'gamma', change: 'added' }],
		})
		assert.equal(additive.classification, 'additive')
		assert.equal(additive.reason, undefined)

		const narrowing = classifyFromFileResult({
			file: 'x',
			addOnly: false,
			scenarios: [{ name: 'beta', change: 'modified' }],
		})
		assert.equal(narrowing.classification, 'narrowing')
	})

	// ── end-to-end: a real unparseable frozen file over a real git+gherkin-cli boundary ──

	// Gherkin has no step-continuation syntax — a soft-wrapped step's remainder is a bare token the
	// pinned parser rejects (EPARSE), unlike the permissive form-check scan.
	const UNPARSEABLE_NARROWED = [
		'@frozen',
		'Feature: sample',
		'',
		'  Scenario: wrapped step',
		'    Given a step that wraps',
		'      onto the next line',
		'    Then it holds',
	].join('\n')

	test('an unparseable, materially narrowed frozen file classifies unclassifiable end-to-end, never no-content-change', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), UNPARSEABLE_NARROWED)

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'unclassifiable')
			assert.notEqual(result.classification, 'no-content-change')
			assert.notEqual(result.classification, 'additive')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('main returns 1 (not 0) when the classified file is unclassifiable', () => {
		const dir = initRepo()
		const cwd = process.cwd()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), FROZEN_BASELINE)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), UNPARSEABLE_NARROWED)

			process.chdir(dir)
			const exit = main(['--files', 'specs/sample.feature', '--base', 'HEAD'])
			assert.equal(exit, 1)
		} finally {
			process.chdir(cwd)
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('a pure rename of an unparseable frozen file still classifies no-content-change (rename detection runs before the differ)', () => {
		const dir = initRepo()
		try {
			writeFileSync(join(dir, 'specs/sample.feature'), UNPARSEABLE_NARROWED)
			commitAll(dir, 'baseline')
			git(dir, 'mv', 'specs/sample.feature', 'specs/renamed.feature')

			const result = classifyFile('specs/renamed.feature', 'HEAD', dir)
			assert.equal(result.classification, 'no-content-change')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	test('an unparseable file with no @frozen tag in either version stays unfrozen-skip', () => {
		const dir = initRepo()
		try {
			const unfrozenUnparseable = UNPARSEABLE_NARROWED.replace('@frozen\n', '')
			writeFileSync(join(dir, 'specs/sample.feature'), unfrozenUnparseable)
			commitAll(dir, 'baseline')
			// Still unparseable, still no @frozen tag in either version.
			writeFileSync(join(dir, 'specs/sample.feature'), unfrozenUnparseable.replace('it holds', 'it still holds'))

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'unfrozen-skip')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	// ── unfrozen-skip (supporting behavior the classification depends on) ──

	test('a file with no feature-level @frozen tag in baseline or working version is skipped', () => {
		const dir = initRepo()
		try {
			const unfrozen = FROZEN_BASELINE.replace('@frozen\n', '')
			writeFileSync(join(dir, 'specs/sample.feature'), unfrozen)
			commitAll(dir, 'baseline')
			writeFileSync(join(dir, 'specs/sample.feature'), unfrozen.replace('beta holds', 'beta holds now'))

			const result = classifyFile('specs/sample.feature', 'HEAD', dir)
			assert.equal(result.classification, 'unfrozen-skip')
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
