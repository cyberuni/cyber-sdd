// One test per frozen UC4 scenario (one per Examples row of an outline) in
// .agents/specs/aced/eval-run/bench/engine/engine.feature whose Given is a pair of run records.
// The two compare scenarios whose Given the engine itself produces (a baseline it wrote, a task
// set's tags) live in bench.test.mts.
//
// Level: CLI e2e. Each test writes schema-version-3 run records into a throwaway git repository
// and drives `node bench.mts compare`; the oracle is the printed comparison record (identical to
// the one written). Comparison is deterministic, so nothing is stood in.
//
// Discrimination: exact p-values are pinned as fractions (2/70, 2/924) so a test that merely
// checks "p < 0.05" cannot pass a wrong enumeration; the footer pins 23 tests and 1.15; the
// pooled-only scenario pins every per-task row tooFew AND the pooled row significant, so an
// implementation that drops pooled rows from the verdict reads `inconclusive`, not `regressed`.

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), 'bench.mts')
const SUITE = 'harbor.nightly'
const RESULTS = `.agents/aced/results/bench/${SUITE}`

const roots: string[] = []
after(() => {
	for (const r of roots) rmSync(r, { recursive: true, force: true })
})

type Json = any

function repo(): string {
	const dir = realpathSync(mkdtempSync(join(tmpdir(), 'aced-bench-compare-')))
	roots.push(dir)
	execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir })
	return dir
}

type Run = Record<string, unknown>

/** A run with every compared metric positive; `over` replaces fields. */
function run(task: string, i: number, over: Run = {}): Run {
	return {
		task,
		run: i + 1,
		pass: true,
		wallMs: 1000,
		inputTokens: 100,
		outputTokens: 50,
		cacheReadTokens: 10,
		cacheCreationTokens: 5,
		turns: 5,
		toolCalls: 3,
		costUsd: 0.1,
		capped: false,
		error: null,
		transcript: null,
		...over,
	}
}

/** `n` runs of `task`; `vary` gives each run's overrides by index. */
function runs(task: string, n: number, vary: (i: number) => Run = () => ({})): Run[] {
	return Array.from({ length: n }, (_, i) => run(task, i, vary(i)))
}

function record(arm: string, rs: Run[], over: Record<string, unknown> = {}): Json {
	return {
		schemaVersion: 3,
		layer: 'measured',
		suite: SUITE,
		arm,
		subject: { kind: 'git-ref', ref: 'HEAD', commit: 'abc123' },
		harness: 'claude-code',
		adapter: 'aced.claude-code',
		runner: 'print',
		taskSetCommit: 'abc123',
		taskSetHash: 'f'.repeat(64),
		tasks: [...new Set(rs.map((r) => r.task))],
		tags: {},
		model: 'sonnet',
		scoring_model: 'sonnet',
		createdAt: '2026-01-01T00:00:00.000Z',
		evaluated: [],
		runs: rs,
		summary: {},
		...over,
	}
}

function compare(dir: string, before: Json, afterRec: Json, extra: string[] = []) {
	const b = join(dir, `before-${Math.random().toString(36).slice(2)}.json`)
	const a = join(dir, `after-${Math.random().toString(36).slice(2)}.json`)
	writeFileSync(b, JSON.stringify(before))
	writeFileSync(a, JSON.stringify(afterRec))
	return spawnSync(process.execPath, [ENGINE, 'compare', `--suite=${SUITE}`, '--before', b, '--after', a, ...extra], {
		cwd: dir,
		encoding: 'utf8',
	})
}

function compareOk(before: Json, afterRec: Json, extra: string[] = []): Json {
	const r = compare(repo(), before, afterRec, extra)
	assert.equal(r.status, 0, r.stderr)
	return JSON.parse(r.stdout)
}

function compareFiles(dir: string): string[] {
	const d = join(dir, RESULTS)
	return existsSync(d) ? readdirSync(d).filter((f) => f.startsWith('compare-')) : []
}

const row = (c: Json, metric: string, task = 't'): Json =>
	c.rows.find((x: Json) => x.scope === 'task' && x.task === task && x.metric === metric)
const pooled = (c: Json, metric: string): Json => c.rows.find((x: Json) => x.scope === 'pooled' && x.metric === metric)

/** One task, 4 runs a side, identical except `metric`, whose values are given per side. */
function oneTask(metricValues: Record<string, [number[], number[]]>, n = 4): [Json, Json] {
	const side = (k: 0 | 1) =>
		runs('t', n, (i) => {
			const over: Run = {}
			for (const [m, v] of Object.entries(metricValues)) over[m] = m === 'pass' ? Boolean(v[k][i]) : v[k][i]
			return over
		})
	return [record('before', side(0)), record('after', side(1))]
}

const BEFORE = [10, 11, 12, 13]
const AFTER_HIGHER = [20, 21, 22, 23]

// ─── UC4 — compare ────────────────────────────────────────────────────────────

describe('UC4 — compare', () => {
	const versions: Array<[string, unknown]> = [
		['2', 2],
		['99', 99],
		['absent', undefined],
	]
	for (const [label, version] of versions) {
		test('a record whose schema version is not 3 is refused', () => {
			const dir = repo()
			const before = record('before', runs('t', 4))
			if (version === undefined) delete before.schemaVersion
			else before.schemaVersion = version
			const r = compare(dir, before, record('after', runs('t', 4)))
			assert.notEqual(r.status, 0)
			assert.match(r.stderr, new RegExp(`schemaVersion ${label}`))
			assert.deepEqual(compareFiles(dir), [])
		})
	}

	test('comparing against a baseline the suite does not have is refused', () => {
		const dir = repo()
		const a = join(dir, 'after.json')
		writeFileSync(a, JSON.stringify(record('after', runs('t', 4))))
		const r = spawnSync(
			process.execPath,
			[ENGINE, 'compare', `--suite=${SUITE}`, '--before', 'baseline', '--after', a],
			{ cwd: dir, encoding: 'utf8' },
		)
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /has no baseline/)
		assert.deepEqual(compareFiles(dir), [])
	})

	const fields: Array<[string, Record<string, unknown>]> = [
		['layer', { layer: 'simulated' }],
		['model', { model: 'opus' }],
		['harness', { harness: 'codex' }],
		['adapter', { adapter: 'other.adapter' }],
		['runner', { runner: 'interactive' }],
		['subject kind', { subject: { kind: 'package', name: 'lantern-kit', version: '1.0.0' } }],
		['task-set hash', { taskSetHash: '0'.repeat(64) }],
	]
	for (const [field, over] of fields) {
		test('records that differ in <field> are incomparable', () => {
			const c = compareOk(record('before', runs('t', 4)), record('after', runs('t', 4), over))
			assert.equal(c.verdict, 'incomparable')
			assert.deepEqual(
				c.incomparable.map((x: Json) => x.field),
				[field],
			)
			assert.deepEqual(c.rows, [])
		})
	}

	test('records that differ in several fields list every reason', () => {
		const c = compareOk(
			record('before', runs('t', 4)),
			record('after', runs('t', 4), { model: 'opus', harness: 'codex' }),
		)
		assert.equal(c.verdict, 'incomparable')
		assert.deepEqual(c.incomparable.map((x: Json) => x.field).sort(), ['harness', 'model'])
	})

	test('two records whose model is unknown on both sides are incomparable', () => {
		const c = compareOk(
			record('before', runs('t', 4), { scoring_model: 'unknown' }),
			record('after', runs('t', 4), { scoring_model: 'unknown' }),
		)
		assert.equal(c.verdict, 'incomparable')
		assert.ok(c.incomparable.some((x: Json) => /model is unknown/.test(x.message)))
		assert.deepEqual(c.rows, [])
	})

	test('runs recorded as errors are excluded from the metrics', () => {
		const before = record(
			'before',
			runs('t', 4, (i) => (i === 0 ? { error: 'setup failed: exit 1', turns: 0 } : { turns: 10 })),
		)
		const c = compareOk(before, record('after', runs('t', 4)))
		assert.equal(row(c, 'turns').before.mean, 10)
		assert.equal(row(c, 'turns').before.n, 3)
	})

	test('the comparison states how many error runs each side excluded', () => {
		const before = record(
			'before',
			runs('t', 4, (i) => (i === 0 ? { error: 'setup failed' } : {})),
		)
		const afterRec = record(
			'after',
			runs('t', 4, (i) => (i < 2 ? { error: 'setup failed' } : {})),
		)
		const c = compareOk(before, afterRec)
		assert.deepEqual(c.errorsExcluded, { before: 1, after: 2 })
	})

	test('capped runs stay in the metrics', () => {
		const before = record(
			'before',
			runs('t', 4, (i) => (i === 0 ? { capped: true, turns: 40 } : { turns: 10 })),
		)
		const c = compareOk(before, record('after', runs('t', 4)))
		assert.equal(row(c, 'turns').before.mean, 17.5)
	})

	test('a task with no runs left on a side carries no p-value and is not a test', () => {
		const before = record('before', [
			...runs('trim-logs', 4, () => ({ error: 'setup failed' })),
			...runs('pin-versions', 4),
		])
		const afterRec = record('after', [...runs('trim-logs', 4), ...runs('pin-versions', 4)])
		const c = compareOk(before, afterRec)
		const trim = c.rows.filter((x: Json) => x.task === 'trim-logs')
		assert.equal(trim.length, 8)
		for (const x of trim) assert.equal(x.p, undefined)
		const withP = c.rows.filter((x: Json) => x.p !== undefined)
		assert.equal(c.footer.testCount, withP.length)
		// 8 pin-versions rows + 7 pooled rows, each pooling pin-versions alone.
		assert.equal(c.footer.testCount, 15)
		for (const x of c.rows.filter((r: Json) => r.scope === 'pooled')) assert.equal(x.tasks, 1)
	})

	test('tasks measured on only one side are listed as unmatched and not compared', () => {
		const before = record('before', [...runs('trim-logs', 4), ...runs('pin-versions', 4)])
		const afterRec = record('after', runs('pin-versions', 4))
		const c = compareOk(before, afterRec)
		assert.deepEqual(c.unmatched, ['trim-logs'])
		const tasks = new Set(c.rows.filter((x: Json) => x.scope === 'task').map((x: Json) => x.task))
		assert.deepEqual([...tasks], ['pin-versions'])
	})

	test('a comparison small enough to enumerate reports the exact permutation p-value', () => {
		const c = compareOk(...oneTask({ turns: [BEFORE, AFTER_HIGHER] }))
		assert.equal(row(c, 'turns').p, 2 / 70)
		assert.equal(row(c, 'turns').exact, true)
	})

	test('a comparison too large to enumerate reports a seeded sampled p-value that repeats exactly', () => {
		const vary = (offset: number) => (i: number) => ({
			turns: 10 + ((i * 7) % 11) + offset,
			toolCalls: 3 + (i % 5),
			wallMs: 1000 + i * 37 + offset * 10,
			pass: i % 3 !== 0,
		})
		const before = record('before', runs('t', 30, vary(0)))
		const afterRec = record('after', runs('t', 30, vary(1)))
		const dir = repo()
		const first = compare(dir, before, afterRec)
		const second = compare(dir, before, afterRec)
		assert.equal(first.status, 0, first.stderr)
		assert.equal(second.status, 0, second.stderr)
		assert.equal(compareFiles(dir).length, 2)
		const ps = (r: typeof first) => JSON.parse(r.stdout).rows.map((x: Json) => x.p)
		assert.deepEqual(ps(first), ps(second))
		const rows = JSON.parse(first.stdout).rows
		assert.ok(rows.length > 0)
		for (const x of rows) {
			assert.equal(x.exact, false)
			const hits = x.p * 20001 - 1
			assert.ok(Math.abs(hits - Math.round(hits)) < 1e-6, `${x.metric}: p ${x.p} is not (hits + 1) / 20001`)
		}
	})

	test('a row whose smallest attainable p-value is above 0.05 is flagged too few', () => {
		const c = compareOk(
			...oneTask(
				{
					turns: [
						[10, 11, 12],
						[20, 21, 22],
					],
				},
				3,
			),
		)
		const rows = c.rows.filter((x: Json) => x.task === 't')
		assert.equal(rows.length, 8)
		for (const x of rows) assert.equal(x.tooFew, true, x.metric)
	})

	test('a row whose smallest attainable p-value is at or below 0.05 is not flagged too few', () => {
		const c = compareOk(...oneTask({ turns: [BEFORE, AFTER_HIGHER] }))
		const rows = c.rows.filter((x: Json) => x.task === 't')
		assert.equal(rows.length, 8)
		for (const x of rows) assert.equal(x.tooFew, false, x.metric)
	})

	test('pass rate is compared with its own p-value', () => {
		const c = compareOk(
			...oneTask(
				{
					pass: [
						[1, 1, 1, 1, 1, 1],
						[0, 0, 0, 0, 0, 0],
					],
				},
				6,
			),
		)
		assert.equal(row(c, 'pass').p, 2 / 924)
		assert.equal(pooled(c, 'pass'), undefined)
	})

	test('the pooled row is the geometric mean of the per-task after-over-before ratios', () => {
		const before = record('before', [...runs('a', 4, () => ({ turns: 10 })), ...runs('b', 4, () => ({ turns: 10 }))])
		const afterRec = record('after', [...runs('a', 4, () => ({ turns: 20 })), ...runs('b', 4, () => ({ turns: 5 }))])
		const c = compareOk(before, afterRec)
		const p = pooled(c, 'turns')
		assert.ok(Math.abs(p.ratio - 1) < 1e-9, `ratio ${p.ratio}`)
		assert.equal(p.tasks, 2)
	})

	test('a task with a non-positive value is dropped from the pooled row', () => {
		const before = record('before', [
			...runs('a', 4, (i) => ({ toolCalls: i === 0 ? 0 : 3 })),
			...runs('b', 4, () => ({ toolCalls: 5 })),
		])
		const afterRec = record('after', [
			...runs('a', 4, () => ({ toolCalls: 3 })),
			...runs('b', 4, () => ({ toolCalls: 10 })),
		])
		const c = compareOk(before, afterRec)
		const p = pooled(c, 'toolCalls')
		assert.ok(Math.abs(p.ratio - 2) < 1e-9, `ratio ${p.ratio}`)
		assert.equal(p.tasks, 1)
	})

	test('the footer states the test count and the count chance alone would make significant', () => {
		const vary = (i: number) => ({ turns: 5 + i, toolCalls: 2 + i })
		const before = record('before', [...runs('a', 4, vary), ...runs('b', 4, vary)])
		const afterRec = record('after', [...runs('a', 4, vary), ...runs('b', 4, vary)])
		const c = compareOk(before, afterRec)
		assert.equal(c.footer.testCount, 23)
		assert.equal(c.footer.expectedByChance, 1.15)
	})

	const gated: Array<[string, [number[], number[]]]> = [
		[
			'pass',
			[
				[1, 1, 1, 1],
				[0, 0, 0, 0],
			],
		],
		['turns', [BEFORE, AFTER_HIGHER]],
		['toolCalls', [BEFORE, AFTER_HIGHER]],
		['inputTokens', [BEFORE.map((x) => x * 100), AFTER_HIGHER.map((x) => x * 100)]],
		['outputTokens', [BEFORE.map((x) => x * 10), AFTER_HIGHER.map((x) => x * 10)]],
		['wallMs', [BEFORE.map((x) => x * 1000), AFTER_HIGHER.map((x) => x * 1000)]],
	]
	for (const [metric, values] of gated) {
		test('a significant wrong-way move in any gated metric makes the verdict regressed', () => {
			const c = compareOk(...oneTask({ [metric]: values }))
			assert.equal(row(c, metric).wrongWay, true)
			assert.equal(c.verdict, 'regressed')
		})
	}

	test("a significant pooled row makes the verdict regressed when no single task's row can", () => {
		const side = (turns: number[]) =>
			['a', 'b', 'c'].flatMap((task) => runs(task, 3, (i) => ({ turns: turns[i] as number })))
		const c = compareOk(record('before', side([10, 11, 12])), record('after', side([20, 21, 22])))
		for (const task of ['a', 'b', 'c']) assert.equal(row(c, 'turns', task).tooFew, true)
		assert.ok(pooled(c, 'turns').p < 0.05, `pooled p ${pooled(c, 'turns').p}`)
		assert.equal(c.verdict, 'regressed')
	})

	test('a wrong-way move without significance makes the verdict inconclusive', () => {
		const c = compareOk(
			...oneTask({
				turns: [
					[10, 12, 14, 16],
					[11, 13, 15, 17],
				],
			}),
		)
		assert.ok(row(c, 'turns').p >= 0.05)
		assert.equal(c.verdict, 'inconclusive')
	})

	test('a significant improvement beside a non-significant wrong-way move is inconclusive', () => {
		const c = compareOk(
			...oneTask({
				turns: [AFTER_HIGHER, BEFORE],
				outputTokens: [
					[100, 120, 140, 160],
					[110, 130, 150, 170],
				],
			}),
		)
		assert.ok(row(c, 'turns').p < 0.05)
		assert.equal(c.verdict, 'inconclusive')
	})

	test('a significant improvement with no wrong-way move makes the verdict improved', () => {
		const c = compareOk(...oneTask({ turns: [AFTER_HIGHER, BEFORE] }))
		assert.equal(c.verdict, 'improved')
	})

	test('a comparison with no wrong-way move and no significant row is unchanged', () => {
		const c = compareOk(...oneTask({}))
		assert.ok(c.rows.length > 0)
		assert.equal(c.verdict, 'unchanged')
	})

	const ungated: Array<[string, [number[], number[]]]> = [
		['costUsd', [BEFORE.map((x) => x / 100), AFTER_HIGHER.map((x) => x / 100)]],
		['cacheReadTokens', [BEFORE.map((x) => x * 10), AFTER_HIGHER.map((x) => x * 10)]],
	]
	for (const [metric, values] of ungated) {
		test('a significant move in an ungated metric alone does not change the verdict', () => {
			const c = compareOk(...oneTask({ [metric]: values }))
			assert.equal(c.verdict, 'unchanged')
			assert.equal(row(c, metric).p, 2 / 70)
		})
	}

	test('one significant wrong-way row makes the verdict regressed even when others improve significantly', () => {
		const c = compareOk(
			...oneTask({
				wallMs: [BEFORE.map((x) => x * 1000), AFTER_HIGHER.map((x) => x * 1000)],
				turns: [AFTER_HIGHER, BEFORE],
				toolCalls: [AFTER_HIGHER, BEFORE],
				outputTokens: [AFTER_HIGHER.map((x) => x * 10), BEFORE.map((x) => x * 10)],
			}),
		)
		for (const m of ['turns', 'toolCalls', 'outputTokens']) assert.ok(row(c, m).significant, m)
		assert.equal(c.verdict, 'regressed')
	})

	test('an incomparable comparison still writes its record with the reasons', () => {
		const dir = repo()
		const r = compare(dir, record('before', runs('t', 4)), record('after', runs('t', 4), { model: 'opus' }))
		assert.equal(r.status, 0, r.stderr)
		const files = compareFiles(dir)
		assert.equal(files.length, 1)
		assert.match(files[0] as string, /^compare-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/)
		const written = JSON.parse(readFileSync(join(dir, RESULTS, files[0] as string), 'utf8'))
		assert.equal(written.verdict, 'incomparable')
		assert.ok(written.incomparable.some((x: Json) => x.field === 'model'))
	})

	test('comparison tags are copied verbatim into the comparison record', () => {
		const c = compareOk(record('before', runs('t', 4)), record('after', runs('t', 4)), [
			'--tag',
			'run=nightly-42',
			'--tag',
			'owner=harbor',
		])
		assert.deepEqual(c.tags, { run: 'nightly-42', owner: 'harbor' })
	})

	test("compare writes a comparison record under the suite's bench results directory", () => {
		const dir = repo()
		const r = compare(dir, ...oneTask({ turns: [BEFORE, AFTER_HIGHER] }))
		assert.equal(r.status, 0, r.stderr)
		const files = compareFiles(dir)
		assert.equal(files.length, 1)
		const written = JSON.parse(readFileSync(join(dir, RESULTS, files[0] as string), 'utf8'))
		assert.equal(files[0], `compare-${written.createdAt.replace(/[:.]/g, '-')}.json`)
		assert.equal(written.verdict, 'regressed')
		assert.equal(written.rows.length, 8 + 7)
		assert.deepEqual(written, JSON.parse(r.stdout))
	})
})
