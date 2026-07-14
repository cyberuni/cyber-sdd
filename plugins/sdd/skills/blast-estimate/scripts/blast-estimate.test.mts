import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	type BlastLevel,
	type EstimateResult,
	estimateBlast,
	lineUp,
	main,
	type ProjectLayout,
	readSensitivePaths,
	renderResultToon,
} from './blast-estimate.mts'

// ── Constructed-corpus helpers (never the repo's live corpus — the suite's own preamble demands it) ──
//
// Layouts are INJECTED, so every fixture declares its own ProjectLayout[] the way discover-specs
// declares a real one, and node recovery runs through touch-set-correction's pure `fileToNode` over
// those layouts — never a path-shape guess. `estimateBlast` is pure w.r.t. layout resolution, which
// is what keeps these tests off the live corpus while still exercising the real recovery rule.

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'blast-estimate-'))
}

/** The default single-root layout: project `sdd` rooted at `sdd/`, matching `seedArea`'s placement. */
const SDD_LAYOUT: ProjectLayout[] = [{ project: 'sdd', roots: ['sdd'] }]

/** Seeds one work area `<project>/<capability>/` with the given files (path -> content). */
function seedArea(root: string, project: string, capability: string, files: Record<string, string>): void {
	const dir = join(root, project, capability)
	mkdirSync(dir, { recursive: true })
	for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
}

/** Seeds `n` mutually-unreferencing filler areas `sdd/fill<i>`, so a corpus is a real multi-area
 *  project rather than the degenerate 1-area shape. Filler never mentions another area, so it adds
 *  no fan-in, and its presence keeps a single-area touch-set from covering its project. */
function seedFiller(root: string, n: number): void {
	for (let i = 1; i <= n; i++)
		seedArea(root, 'sdd', `fill${i}`, { 'README.md': 'unrelated filler; references nothing' })
}

function writeSensitivePaths(root: string, content: string): void {
	const dir = join(root, '.agents', 'sdd')
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'sensitive-paths.toml'), content)
}

const LEVEL_INDEX: Record<BlastLevel, number> = { low: 0, medium: 1, high: 2 }

/** A corpus of 6 areas where a1..a4 are broad AND central (each referenced by the 5 others), and
 *  a5/a6 stay OUT of the touch-set — so a touch-set of a1..a4 is NOT project-wide, and `high` must
 *  come from count × centrality rather than riding the coverage rule. */
function seedBroadCentralCorpus(): string {
	const dir = mkCorpus()
	const all = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
	for (const a of all) {
		const refs = all.filter((o) => o !== a).map((o) => `sdd/${o}`)
		seedArea(dir, 'sdd', a, { 'README.md': `refs: ${refs.join(' ')}` })
	}
	return dir
}

const BROAD_CENTRAL_TOUCH_SET = ['sdd/a1', 'sdd/a2', 'sdd/a3', 'sdd/a4']

// ── The computation — count × centrality × sensitivity ──

test('scenario: a broad, central touch-set computes high blast', () => {
	// 6-area project, 4 touched — broad (count 4) and central (fan-in 5 each), but NOT project-wide,
	// so this pins count × centrality on its own rather than riding the coverage rule.
	const dir = seedBroadCentralCorpus()
	const r = estimateBlast(BROAD_CENTRAL_TOUCH_SET, SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'high')
	assert.deepEqual(r.reasons?.projectWide, [], 'this fixture must NOT be project-wide — count × centrality drives it')
})

test('scenario: a single peripheral work area computes low blast', () => {
	// A multi-area project: the leaf is one area of three, so this is genuinely disjoint from the
	// project-wide scenario (a 1-area corpus would satisfy both scenarios' Givens at once).
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'leaf', { 'README.md': 'a lone leaf, referenced by nothing' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/leaf'], SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'low')
})

test('scenario: a single central work area outranks a single peripheral one', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'hub', { 'README.md': 'the hub' })
	seedArea(dir, 'sdd', 'leaf', { 'README.md': 'the leaf, referenced by nothing' })
	seedArea(dir, 'sdd', 'b1', { 'README.md': 'depends on sdd/hub' })
	seedArea(dir, 'sdd', 'b2', { 'README.md': 'depends on sdd/hub' })
	seedArea(dir, 'sdd', 'b3', { 'README.md': 'depends on sdd/hub' })
	const hub = estimateBlast(['sdd/hub'], SDD_LAYOUT, { root: dir })
	const leaf = estimateBlast(['sdd/leaf'], SDD_LAYOUT, { root: dir })
	assert.equal(hub.reasons?.count, leaf.reasons?.count) // equal count
	assert.ok(
		LEVEL_INDEX[hub.computed as BlastLevel] > LEVEL_INDEX[leaf.computed as BlastLevel],
		`hub (${hub.computed}) must outrank leaf (${leaf.computed})`,
	)
})

test('scenario: a marked-sensitive work area raises the computed blast', () => {
	// Same area, same multi-area corpus, same count and fan-in — only the marking differs.
	const build = (marked: boolean): EstimateResult => {
		const dir = mkCorpus()
		seedArea(dir, 'sdd', 'area1', { 'README.md': 'referenced by nothing' })
		seedFiller(dir, 2)
		if (marked) writeSensitivePaths(dir, 'sensitive = ["sdd/area1"]')
		return estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir })
	}
	const unmarked = build(false)
	const marked = build(true)
	assert.equal(marked.reasons?.count, unmarked.reasons?.count)
	assert.equal(marked.reasons?.maxFanIn, unmarked.reasons?.maxFanIn)
	assert.ok(
		LEVEL_INDEX[marked.computed as BlastLevel] > LEVEL_INDEX[unmarked.computed as BlastLevel],
		`marked (${marked.computed}) must be higher than unmarked (${unmarked.computed})`,
	)
})

test('scenario: the estimate names the reasons behind the computed level', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'depended on by sdd/area2' })
	seedArea(dir, 'sdd', 'area2', { 'README.md': 'refs sdd/area1' })
	const r = estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir })
	assert.ok(r.reasons, 'reasons must be present')
	assert.equal(typeof r.reasons?.count, 'number')
	assert.equal(typeof r.reasons?.maxFanIn, 'number')
	assert.ok(Array.isArray(r.reasons?.sensitiveAreas))
	// the rendered report names each driver, not just the returned record
	const toon = renderResultToon(r)
	for (const driver of ['count=', 'maxFanIn=', 'sensitiveAreas=']) {
		assert.ok(toon.includes(driver), `the report must name ${driver}`)
	}
})

// ── The line-up — declared against computed ──

test('scenario: a declared blast matching the computed level is reported agrees', () => {
	assert.equal(lineUp('medium', 'medium').outcome, 'agrees')
})

test('scenario: a declared blast below the computed level is reported under-called', () => {
	const lu = lineUp('high', 'low')
	assert.equal(lu.outcome, 'under-called')
	assert.equal(lu.declared, 'low')
	assert.equal(lu.computed, 'high')
})

test('scenario: a declared blast above the computed level is reported over-called', () => {
	const lu = lineUp('low', 'high')
	assert.equal(lu.outcome, 'over-called')
	assert.equal(lu.declared, 'high')
	assert.equal(lu.computed, 'low')
})

test('scenario: an under-called line-up is not an error', () => {
	const dir = seedBroadCentralCorpus()
	const r = estimateBlast(BROAD_CENTRAL_TOUCH_SET, SDD_LAYOUT, { root: dir, declared: 'low' })
	assert.equal(r.computed, 'high')
	assert.equal(r.lineUp?.outcome, 'under-called')
	assert.equal(r.error, undefined, 'under-called is a finding, not an error')
})

test('scenario: a Mission carrying no declared blast still computes a level', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'x' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir, declared: 'unknown' })
	assert.ok(r.computed === 'low' || r.computed === 'medium' || r.computed === 'high')
	assert.equal(r.lineUp?.outcome, 'no-declared')
})

// ── The two exclusions the rubric fixes ──

test('scenario: a breaking change is not high blast for being breaking', () => {
	// estimateBlast takes no compatibility/breaking-change input at all — there is no seam for it to
	// leak in. A peripheral area whose change happens to be breaking still computes low.
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'leaf', { 'README.md': 'a lone leaf, referenced by nothing' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/leaf'], SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'low')
})

test('scenario: surface location alone does not raise the computed blast', () => {
	// Named "public", but referenced by nothing and only one area of a three-area project.
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'public', { 'README.md': 'named public, referenced by nothing' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/public'], SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'low')
})

// ── Sensitivity is declared, never inferred ──

test('scenario: an absent sensitive-paths file is not an error', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'x' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir })
	assert.equal(r.error, undefined)
	assert.deepEqual(r.reasons?.sensitiveAreas, [])
	assert.ok(r.computed !== null, 'the estimate still returns on count and centrality alone')
})

// Guards the ONLY-ENOENT-is-benign rule the absent/unparseable pair rests on. A present-but-
// unreadable file (permissions, or a directory at the path) must fail loud like an unparseable one
// — never read as "no markings", which silently UNDER-calls blast on exactly the areas a project
// marked as needing care. Regression: a bare catch around statSync/readFileSync swallowed both.
test('a present-but-unreadable sensitive-paths file fails loud, like an unparseable one', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'x' })
	seedFiller(dir, 2)
	mkdirSync(join(dir, '.agents', 'sdd', 'sensitive-paths.toml'), { recursive: true })
	const res = readSensitivePaths(dir)
	assert.equal(res.ok, false, 'a directory at the path is not evidence of no markings')
	const r = estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, null, 'it computes no level rather than silently under-calling')
	assert.ok(r.error, 'and it names the unreadable file')
})

test('an absent sensitive-paths file is distinguished from an unreadable one by ENOENT alone', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'x' })
	seedFiller(dir, 2)
	const res = readSensitivePaths(dir)
	assert.deepEqual(res, { ok: true, marked: [] }, 'absent stays the one benign read')
})

test('scenario: a malformed sensitive-paths file fails loud rather than reading as no markings', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'area1', { 'README.md': 'x' })
	seedFiller(dir, 2)
	writeSensitivePaths(dir, 'sensitive = [ this is not valid toml')
	const r = estimateBlast(['sdd/area1'], SDD_LAYOUT, { root: dir })
	assert.ok(r.error, 'a malformed sensitive-paths file must report an error')
	assert.ok(r.error?.includes('sensitive-paths.toml'), 'the error names the unreadable file')
	assert.equal(r.computed, null, 'no level is computed')
	assert.equal(r.reasons, null)
})

test('scenario: a sensitive-sounding name is not treated as sensitive without a marking', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'secrets', { 'README.md': 'a work area named secrets' })
	seedFiller(dir, 2)
	writeSensitivePaths(dir, 'sensitive = []')
	const r = estimateBlast(['sdd/secrets'], SDD_LAYOUT, { root: dir })
	assert.deepEqual(r.reasons?.sensitiveAreas, [])
})

// ── Determinism and the read-only boundary ──

test('scenario: the estimate is deterministic for a fixed input', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'a1', { 'README.md': 'refs sdd/a2' })
	seedArea(dir, 'sdd', 'a2', { 'README.md': 'refs sdd/a1' })
	const first = estimateBlast(['sdd/a1'], SDD_LAYOUT, { root: dir, declared: 'medium' })
	const second = estimateBlast(['sdd/a1'], SDD_LAYOUT, { root: dir, declared: 'medium' })
	assert.deepEqual(first, second)
})

function snapshotDir(dir: string): Record<string, string> {
	const out: Record<string, string> = {}
	const walk = (d: string) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const full = join(d, e.name)
			if (e.isDirectory()) walk(full)
			else out[full] = readFileSync(full, 'utf8')
		}
	}
	walk(dir)
	return out
}

test('scenario: the estimate writes nothing (static write-boundary guard)', () => {
	const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'blast-estimate.mts'), 'utf8')
	for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'writeSync']) {
		assert.ok(!src.includes(api), `engine must not reference fs.${api}`)
	}
})

test('scenario: the estimate writes nothing (behavioral write-boundary guard)', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'a1', { 'README.md': 'refs sdd/a2' })
	seedArea(dir, 'sdd', 'a2', { 'README.md': 'refs sdd/a1' })
	writeSensitivePaths(dir, 'sensitive = ["sdd/a1"]')
	const before = snapshotDir(dir)
	// `--layout` keeps the CLI off discover-specs (and so off the live corpus) while still driving
	// the real layout-injected path end to end.
	main(['--root', dir, '--layout', 'sdd:sdd', '--touch-set', 'sdd/a1', '--declared', 'low'])
	main(['--root', dir, '--layout', 'sdd:sdd', '--touch-set', 'sdd/a1', '--format', 'json'])
	assert.deepEqual(snapshotDir(dir), before)
})

test('scenario: the estimate records the level rather than deciding the verdict', () => {
	const dir = seedBroadCentralCorpus()
	const r: EstimateResult = estimateBlast(BROAD_CENTRAL_TOUCH_SET, SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'high')
	for (const forbidden of ['verdict', 'selfClear', 'escalate', 'self-clear']) {
		assert.equal((r as unknown as Record<string, unknown>)[forbidden], undefined)
		assert.ok(!JSON.stringify(r).toLowerCase().includes(forbidden.toLowerCase()))
		assert.ok(!renderResultToon(r).toLowerCase().includes(forbidden.toLowerCase()))
	}
})

// ── Unresolved input is surfaced, never dropped ──

test('scenario: a touch-set area that resolves to no known work area is surfaced', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'known', { 'README.md': 'x' })
	seedFiller(dir, 2)
	const r = estimateBlast(['sdd/does-not-exist'], SDD_LAYOUT, { root: dir })
	assert.deepEqual(r.unresolved, ['sdd/does-not-exist'])
	assert.deepEqual(r.resolved, [])
})

test('scenario: an empty touch-set computes no level rather than defaulting to low', () => {
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'known', { 'README.md': 'x' })
	seedFiller(dir, 2)
	const r = estimateBlast([], SDD_LAYOUT, { root: dir })
	assert.equal(r.computed, 'unknown')
	assert.notEqual(r.computed, 'low')
})

// ── The barrier agreement ──

test('scenario: a project-wide touch-set computes high blast', () => {
	// The scenario is about COVERAGE — "every work area of its project" — not about absolute count.
	// Pin it at several project sizes so no single count bucket can carry the assertion: a 2-area
	// project touched entirely is just as project-wide as a 7-area one. Every area here is
	// peripheral (no fan-in) and unmarked, so reach is the ONLY thing that can produce `high`.
	for (const size of [2, 3, 4, 7]) {
		const dir = mkCorpus()
		const areas: string[] = []
		for (let i = 1; i <= size; i++) {
			seedArea(dir, 'sdd', `a${i}`, { 'README.md': 'references nothing' })
			areas.push(`sdd/a${i}`)
		}
		const r = estimateBlast(areas, SDD_LAYOUT, { root: dir })
		assert.equal(r.computed, 'high', `a fully-covered ${size}-area project must compute high, got ${r.computed}`)
		assert.deepEqual(r.reasons?.projectWide, ['sdd'], `the report must name the covered project at size ${size}`)
	}
})

test('scenario: a project-wide touch-set computes high blast (a partly-covered project is not project-wide)', () => {
	// The negative half of the coverage rule: touching all but one area of a project is NOT
	// project-wide, so coverage must not fire. Keeps the rule from collapsing into "any touch-set".
	const dir = mkCorpus()
	for (let i = 1; i <= 3; i++) seedArea(dir, 'sdd', `a${i}`, { 'README.md': 'references nothing' })
	const r = estimateBlast(['sdd/a1', 'sdd/a2'], SDD_LAYOUT, { root: dir })
	assert.deepEqual(r.reasons?.projectWide, [])
	assert.notEqual(r.computed, 'high')
})

// ── Node recovery spans a work area's DECLARED roots (spec + impl) ──
//
// The real repo declares `sdd` with roots [".agents/specs/sdd", "plugins/sdd/skills"], so ONE node
// (`sdd/mission-graph`) owns files in BOTH trees. Every other fixture here collapses a node's roots
// into one, which is exactly why a path-shape walk passed all 21 scenarios while being wrong against
// the live tree. These two tests hold the multi-root property the constructed corpora cannot see.

const TWO_ROOT_LAYOUT: ProjectLayout[] = [{ project: 'sdd', roots: ['specs/sdd', 'impl/sdd'] }]

/** Seeds `<root>/<tree>/sdd/<capability>/<file>` — one half of a two-rooted work area. */
function seedRootedArea(root: string, tree: string, capability: string, files: Record<string, string>): void {
	const dir = join(root, tree, 'sdd', capability)
	mkdirSync(dir, { recursive: true })
	for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
}

test('a work area spanning a spec root and an impl root resolves to ONE node', () => {
	const dir = mkCorpus()
	seedRootedArea(dir, 'specs', 'hub', { 'README.md': 'the hub spec' })
	seedRootedArea(dir, 'impl', 'hub', { 'hub.mts': 'the hub implementation' })
	seedRootedArea(dir, 'specs', 'other', { 'README.md': 'unrelated' })
	seedRootedArea(dir, 'impl', 'other', { 'other.mts': 'unrelated' })
	const r = estimateBlast(['sdd/hub'], TWO_ROOT_LAYOUT, { root: dir })
	// The node resolves from its declared layout, not from a "first two segments" path shape —
	// `specs/sdd/hub/README.md` and `impl/sdd/hub/hub.mts` are the SAME work area.
	assert.deepEqual(r.resolved, ['sdd/hub'])
	assert.deepEqual(r.unresolved, [])
})

test('work-area discovery resolves under a RELATIVE root (the CLI default `--root .`)', () => {
	// Regression: `join('.', x)` normalizes the `./` away, so computing a repo-relative path by
	// slicing `root.length` corrupts every path under a relative root while passing under the
	// absolute tmpdir roots every other fixture here uses. The live repo runs `--root .`, so this is
	// the case the constructed corpora structurally cannot see.
	const dir = mkCorpus()
	seedArea(dir, 'sdd', 'a1', { 'README.md': 'refs sdd/a2' })
	seedArea(dir, 'sdd', 'a2', { 'README.md': 'refs sdd/a1' })
	const prev = process.cwd()
	try {
		process.chdir(dir)
		const r = estimateBlast(['sdd/a1'], SDD_LAYOUT, { root: '.' })
		assert.deepEqual(r.resolved, ['sdd/a1'], 'a relative root must resolve its work areas')
		assert.equal(r.reasons?.maxFanIn, 1, 'and must still measure fan-in')
	} finally {
		process.chdir(prev)
	}
})

test('fan-in counts a reference from an IMPLEMENTATION file, not spec prose alone', () => {
	const dir = mkCorpus()
	seedRootedArea(dir, 'specs', 'hub', { 'README.md': 'the hub spec; mentions nobody' })
	seedRootedArea(dir, 'impl', 'hub', { 'hub.mts': 'the hub implementation' })
	// The consumer's SPEC prose never names the hub — only its implementation imports it. A
	// spec-tree-only scan would measure fan-in 0 and call this peripheral.
	seedRootedArea(dir, 'specs', 'consumer', { 'README.md': 'a consumer; names no other area' })
	seedRootedArea(dir, 'impl', 'consumer', { 'consumer.mts': "import { x } from 'sdd/hub'" })
	const r = estimateBlast(['sdd/hub'], TWO_ROOT_LAYOUT, { root: dir })
	assert.equal(r.reasons?.maxFanIn, 1, 'the impl-side reference must count toward centrality')
})
