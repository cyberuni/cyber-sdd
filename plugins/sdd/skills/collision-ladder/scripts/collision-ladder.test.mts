// collision-ladder — one test per scenario in the frozen
// .agents/specs/sdd/collision-ladder/collision-ladder.feature (18 scenarios). Each test title is
// prefixed `scenario:` followed by the VERBATIM frozen scenario name, so the mapping is
// grep-auditable against the .feature. Every fixture here is CONSTRUCTED (hand-built MissionTouch /
// ClassifyInput) — never a live git diff or the live mission-graph store; the pure functions
// (classify, classifyFile, hunksDisjoint, isFeature, isCode, confidenceRank, the render helper) are
// exercised directly. The ONE exception is the TOON/JSON emission scenario, which drives `main()`
// end-to-end (writing a constructed ClassifyInput to a temp file, capturing stdout) so the
// `--format` flag path is actually bound — the pure render helpers alone do not exercise it.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	type ClassifyInput,
	classify,
	confidenceRank,
	type FileTouch,
	type MissionTouch,
	main,
	renderVerdictToon,
} from './collision-ladder.mts'

/** Drives the CLI `main()` capturing its stdout — the only way to bind the `--format` flag path
 *  (a render-helper call alone would not catch a `main()` that ignores the flag). */
function runMain(argv: string[]): { out: string; code: number } {
	const chunks: string[] = []
	const orig = process.stdout.write.bind(process.stdout)
	process.stdout.write = (s: string | Uint8Array) => {
		chunks.push(String(s))
		return true
	}
	let code: number
	try {
		code = main(argv)
	} finally {
		process.stdout.write = orig
	}
	return { out: chunks.join(''), code }
}

// ── Fixture builders (constructed only — see file banner) ──

function file(path: string, over: Partial<FileTouch> = {}): FileTouch {
	return {
		path,
		artifactType: over.artifactType ?? 'unknown',
		hunks: over.hunks ?? null,
		changedScenarios: over.changedScenarios ?? [],
	}
}

function mission(name: string, files: FileTouch[]): MissionTouch {
	return { mission: name, files }
}

function input(over: Partial<ClassifyInput> & { x: MissionTouch; y: MissionTouch }): ClassifyInput {
	return { node: over.node ?? 'sdd/demo', ...over }
}

// A prose (non-.feature, non-code) file overlapping — the no-anchor case.
const PROSE = 'plugins/sdd/skills/demo/README.md'
// A code file overlapping — the symbol-rung-deferred case.
const CODE = 'plugins/sdd/skills/demo/scripts/demo.mts'
// A behavioral suite — the scenario semantic rung.
const FEATURE = 'plugins/sdd/skills/demo/demo.feature'

// ── The ladder: descend only until classifiable, then stop ──

test('scenario: two missions touching different files under the colliding node classify soft at the file rung', () => {
	const v = classify(
		input({
			x: mission('X', [file('a/x.mts', { hunks: [{ start: 1, end: 5 }] })]),
			y: mission('Y', [file('a/y.mts', { hunks: [{ start: 1, end: 5 }] })]),
		}),
	)
	assert.equal(v.collision, 'soft')
	assert.equal(v.rung, 'file')
	assert.deepEqual(v.sharedFiles, [])
})

test('scenario: the ladder stops at the file rung even when finer detail is absent', () => {
	// disjoint files, NO hunk or scenario detail on either side — the file rung must still classify.
	const v = classify(
		input({
			x: mission('X', [file('a/x.mts')]),
			y: mission('Y', [file('a/y.mts')]),
		}),
	)
	assert.equal(v.collision, 'soft')
	assert.equal(v.rung, 'file')
})

test('scenario: a shared file changed in disjoint line-hunks classifies soft at the region rung', () => {
	const v = classify(
		input({
			x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(CODE, { hunks: [{ start: 40, end: 50 }] })]),
		}),
	)
	assert.equal(v.collision, 'soft')
	assert.equal(v.rung, 'region')
	assert.equal(v.sharedFiles[0].reason, 'disjoint-hunks')
})

test('scenario: a shared file changed in overlapping line-hunks descends past the region rung', () => {
	// overlapping hunks on a .feature with DIFFERENT scenarios ⇒ region cannot clear it, so it
	// descends to the semantic rung (and clears there) — proving the descent past region.
	const v = classify(
		input({
			x: mission('X', [file(FEATURE, { hunks: [{ start: 1, end: 20 }], changedScenarios: ['alpha'] })]),
			y: mission('Y', [file(FEATURE, { hunks: [{ start: 10, end: 30 }], changedScenarios: ['beta'] })]),
		}),
	)
	assert.notEqual(v.rung, 'region')
	assert.equal(v.rung, 'semantic')
})

test('scenario: a shared .feature changed in different scenarios classifies soft at the semantic rung', () => {
	const v = classify(
		input({
			x: mission('X', [file(FEATURE, { changedScenarios: ['alpha'] })]),
			y: mission('Y', [file(FEATURE, { changedScenarios: ['beta'] })]),
		}),
	)
	assert.equal(v.collision, 'soft')
	assert.equal(v.rung, 'semantic')
	assert.equal(v.sharedFiles[0].reason, 'disjoint-scenarios')
})

test('scenario: a shared .feature changed in the same scenario classifies hard at the semantic rung', () => {
	const v = classify(
		input({
			x: mission('X', [file(FEATURE, { changedScenarios: ['alpha', 'gamma'] })]),
			y: mission('Y', [file(FEATURE, { changedScenarios: ['alpha'] })]),
		}),
	)
	assert.equal(v.collision, 'hard')
	assert.equal(v.rung, 'semantic')
	assert.equal(v.sharedFiles[0].reason, 'same-scenario')
})

// ── Conservative defaults: descend only to downgrade, never to over-relax ──

test('scenario: a node collision is hard if any one shared file is hard', () => {
	const v = classify(
		input({
			x: mission('X', [
				file(FEATURE, { changedScenarios: ['alpha'] }), // soft (disjoint scenarios)
				file(CODE, { hunks: [{ start: 1, end: 10 }] }), // hard (overlapping code → symbol-deferred)
			]),
			y: mission('Y', [file(FEATURE, { changedScenarios: ['beta'] }), file(CODE, { hunks: [{ start: 5, end: 15 }] })]),
		}),
	)
	assert.equal(v.collision, 'hard')
})

test('scenario: a shared file whose line-hunks are unknown is not cleared at the region rung', () => {
	// one side records no hunks (null) on a .feature with disjoint scenarios: region cannot prove
	// disjointness, so it is NOT cleared at region — it descends to (and clears at) the semantic rung.
	const v = classify(
		input({
			x: mission('X', [file(FEATURE, { hunks: null, changedScenarios: ['alpha'] })]),
			y: mission('Y', [file(FEATURE, { hunks: [{ start: 1, end: 5 }], changedScenarios: ['beta'] })]),
		}),
	)
	assert.notEqual(v.rung, 'region')
	assert.equal(v.rung, 'semantic')
})

test('scenario: confidence decays down the ladder', () => {
	const fileRung = classify(
		input({
			x: mission('X', [file('a/x.mts')]),
			y: mission('Y', [file('a/y.mts')]),
		}),
	)
	const semanticRung = classify(
		input({
			x: mission('X', [file(FEATURE, { hunks: [{ start: 1, end: 20 }], changedScenarios: ['alpha'] })]),
			y: mission('Y', [file(FEATURE, { hunks: [{ start: 10, end: 30 }], changedScenarios: ['beta'] })]),
		}),
	)
	assert.equal(fileRung.rung, 'file')
	assert.equal(semanticRung.rung, 'semantic')
	assert.ok(confidenceRank(fileRung.confidence) > confidenceRank(semanticRung.confidence))
})

// ── The semantic rung splits by artifact-type; the ★ symbol rung is deferred ──

test('scenario: a shared non-behavioral-prose file with overlapping hunks stays hard with no finer anchor', () => {
	const v = classify(
		input({
			x: mission('X', [file(PROSE, { artifactType: 'reference', hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(PROSE, { artifactType: 'reference', hunks: [{ start: 5, end: 15 }] })]),
		}),
	)
	assert.equal(v.collision, 'hard')
	assert.equal(v.sharedFiles[0].reason, 'no-anchor')
})

test('scenario: a shared code file needing symbol analysis to downgrade is held hard and flagged deferred', () => {
	const v = classify(
		input({
			x: mission('X', [file(CODE, { artifactType: 'skill', hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(CODE, { artifactType: 'skill', hunks: [{ start: 5, end: 15 }] })]),
		}),
	)
	assert.equal(v.collision, 'hard')
	assert.equal(v.sharedFiles[0].reason, 'symbol-rung-deferred')
	assert.deepEqual(v.deferrals, [CODE])
})

// ── Shared-thin file: the hard→soft downgrade that avoids over-serializing ──

test('scenario: a shared-thin file changed in disjoint regions downgrades hard to soft', () => {
	const v = classify(
		input({
			x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(CODE, { hunks: [{ start: 40, end: 50 }] })]),
			degrees: { [CODE]: 5 }, // touched by many missions → shared-thin
		}),
	)
	assert.equal(v.collision, 'soft') // downgraded, not serialized
	assert.equal(v.rung, 'region')
	assert.equal(v.sharedFiles[0].sharedThin, true)
})

test('scenario: a file touched by at least the shared-thin degree threshold is flagged and surfaced as a smell', () => {
	const v = classify(
		input({
			x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(CODE, { hunks: [{ start: 40, end: 50 }] })]),
			degrees: { [CODE]: 3 },
			sharedThinThreshold: 3,
		}),
	)
	assert.equal(v.sharedFiles[0].sharedThin, true)
	assert.deepEqual(v.smells, [CODE])
})

test('scenario: a shared-thin file changed in the same region stays hard', () => {
	const v = classify(
		input({
			x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 20 }] })]),
			y: mission('Y', [file(CODE, { hunks: [{ start: 10, end: 30 }] })]), // overlaps → region can't clear
			degrees: { [CODE]: 9 },
		}),
	)
	assert.equal(v.collision, 'hard') // shared-thin, but same region → no downgrade
	assert.equal(v.sharedFiles[0].sharedThin, true)
})

// ── The verdict record — shape and read-only ──

test('scenario: the verdict records the collision, the decisive rung, and per-shared-file detail', () => {
	const v = classify(
		input({
			node: 'sdd/mission-graph',
			x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
			y: mission('Y', [file(CODE, { hunks: [{ start: 40, end: 50 }] })]),
		}),
	)
	assert.equal(v.node, 'sdd/mission-graph')
	assert.ok(v.collision === 'hard' || v.collision === 'soft')
	assert.ok(['file', 'region', 'semantic', 'node'].includes(v.rung))
	assert.ok(['high', 'medium', 'low'].includes(v.confidence))
	assert.equal(v.sharedFiles.length, 1)
	assert.deepEqual(Object.keys(v.sharedFiles[0]).sort(), ['collision', 'path', 'reason', 'rung', 'sharedThin'])
})

test('scenario: classifying a collision does not write to the mission graph', () => {
	// classify is a pure function over plain data — no store handle, no fs. Assert it does not mutate
	// its own input (read-only by construction; combined with taking no store parameter, it cannot
	// write to the mission graph).
	const src = input({
		x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
		y: mission('Y', [file(CODE, { hunks: [{ start: 5, end: 15 }] })]),
	})
	const snapshot = structuredClone(src)
	classify(src)
	assert.deepEqual(src, snapshot)
})

test('scenario: classification is deterministic and stably ordered for a fixed pair', () => {
	const src = input({
		x: mission('X', [
			file('z/b.mts', { hunks: [{ start: 1, end: 5 }] }),
			file('z/a.mts', { hunks: [{ start: 1, end: 5 }] }),
		]),
		y: mission('Y', [
			file('z/a.mts', { hunks: [{ start: 1, end: 5 }] }),
			file('z/b.mts', { hunks: [{ start: 1, end: 5 }] }),
		]),
	})
	const a = classify(src)
	const b = classify(src)
	assert.deepEqual(a, b)
	// stably ordered by path regardless of input order
	assert.deepEqual(
		a.sharedFiles.map((f) => f.path),
		['z/a.mts', 'z/b.mts'],
	)
})

test('scenario: the verdict is emitted as TOON by default and as JSON on request', () => {
	const src = input({
		x: mission('X', [file(CODE, { hunks: [{ start: 1, end: 10 }] })]),
		y: mission('Y', [file(CODE, { hunks: [{ start: 40, end: 50 }] })]),
	})
	const expected = classify(src)
	// Drive the CLI so the --format flag path in main() is bound (not just the render helpers).
	const dir = mkdtempSync(join(tmpdir(), 'collision-ladder-'))
	const inputFile = join(dir, 'input.json')
	writeFileSync(inputFile, JSON.stringify(src))

	// no format flag ⇒ TOON by default (main writes exactly `${render}\n`)
	const dflt = runMain(['--input', inputFile])
	assert.equal(dflt.code, 0)
	assert.equal(dflt.out, `${renderVerdictToon(expected)}\n`)
	assert.match(dflt.out, /^collision: soft$/m)
	assert.match(dflt.out, /^rung: region$/m)

	// --format json ⇒ JSON carrying the same verdict
	const asJson = runMain(['--input', inputFile, '--format', 'json'])
	assert.equal(asJson.code, 0)
	const parsed = JSON.parse(asJson.out)
	assert.deepEqual(parsed, expected)
	// and the two renderings differ (default is not JSON) — binds that the flag actually switches
	assert.notEqual(dflt.out, asJson.out)
})
