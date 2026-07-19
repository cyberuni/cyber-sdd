import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
	type Change,
	collisionRate,
	DEFAULT_FLOOR,
	isThin,
	main,
	meanNodesTouched,
	measure,
	PARTITIONS,
	parseGitLog,
	render,
	shuffledControl,
	withinNodeCoChangeRatio,
} from './check-partition-quality.mts'

const SHA = 'a'.repeat(40)
const SHA2 = 'b'.repeat(40)

// ── Reading history ──────────────────────────────────────────────────────────

test('a single-file commit contributes no pair and is dropped', () => {
	const log = `${SHA}\nsrc/a.ts\n\n${SHA2}\nsrc/a.ts\nsrc/b.ts\n`
	const cs = parseGitLog(log, () => true)
	assert.equal(cs.length, 1)
	assert.deepEqual(cs[0]?.files.sort(), ['src/a.ts', 'src/b.ts'])
})

test('files outside the scope are excluded from a commit', () => {
	const log = `${SHA}\nsrc/a.ts\ndocs/x.md\nsrc/b.ts\n`
	const cs = parseGitLog(log, (f) => f.startsWith('src/'))
	assert.deepEqual(cs[0]?.files.sort(), ['src/a.ts', 'src/b.ts'])
})

test('a commit left with one in-scope file drops out entirely', () => {
	const log = `${SHA}\nsrc/a.ts\ndocs/x.md\n`
	assert.deepEqual(
		parseGitLog(log, (f) => f.startsWith('src/')),
		[],
	)
})

// ── The metric ───────────────────────────────────────────────────────────────

const p = (f: string) => f.split('/')[0]

test('the collision rate is the share of change pairs sharing a node', () => {
	const cs: Change[] = [
		{ files: ['a/1', 'a/2'] }, // node a
		{ files: ['a/3', 'b/1'] }, // nodes a,b  → collides with #1 and #3
		{ files: ['b/2', 'b/3'] }, // node b
	]
	// pairs: (1,2) share a → collide; (1,3) disjoint; (2,3) share b → collide  ⇒ 2/3
	assert.equal(collisionRate(cs, p).rate, 2 / 3)
	assert.equal(collisionRate(cs, p).pairs, 3)
})

test('a single-node partition collides on every pair — no parallel work is possible', () => {
	const cs: Change[] = [{ files: ['a/1', 'a/2'] }, { files: ['b/1', 'b/2'] }, { files: ['c/1', 'c/2'] }]
	const single = PARTITIONS.single?.('') as (f: string) => string | undefined
	assert.equal(collisionRate(cs, single).rate, 1)
})

test('a fully disjoint partition collides on no pair', () => {
	const cs: Change[] = [{ files: ['a/1', 'a/2'] }, { files: ['b/1', 'b/2'] }]
	assert.equal(collisionRate(cs, p).rate, 0)
})

test('the parallelizable share is one minus the collision rate', () => {
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 6}/x`, `n${i % 6}/y`] }))
	const m = measure(cs, p)
	assert.ok(!isThin(m))
	if (!isThin(m)) assert.equal(m.parallelizableShare, 1 - m.collisionRate)
})

// ── Thin history ─────────────────────────────────────────────────────────────

test('history below the floor is reported, never scored', () => {
	const cs: Change[] = [{ files: ['a/1', 'a/2'] }]
	const m = measure(cs, p, DEFAULT_FLOOR)
	assert.ok(isThin(m))
	if (isThin(m)) {
		assert.equal(m.usableCommits, 1)
		assert.equal(m.floor, DEFAULT_FLOOR)
	}
	assert.match(render([['x', m]], '.', ''), /too thin to measure/)
})

test('history at the floor is measured', () => {
	const cs: Change[] = Array.from({ length: DEFAULT_FLOOR }, () => ({ files: ['a/1', 'a/2'] }))
	assert.ok(!isThin(measure(cs, p, DEFAULT_FLOOR)))
})

// ── The control ──────────────────────────────────────────────────────────────

test('a partition no better than its shuffled control is flagged as explaining nothing', () => {
	// Every change touches every node ⇒ shuffling cannot make it worse; the partition explains nothing.
	const cs: Change[] = Array.from({ length: 30 }, () => ({ files: ['a/1', 'b/1', 'c/1'] }))
	const m = measure(cs, p)
	assert.ok(!isThin(m))
	if (!isThin(m)) {
		assert.equal(m.explainsNothing, true)
		assert.match(render([['x', m]], '.', ''), /explains no more than chance/)
	}
})

test('the control is deterministic — the same input yields the same number', () => {
	const cs: Change[] = Array.from({ length: 40 }, (_, i) => ({ files: [`n${i % 8}/a`, `n${i % 8}/b`] }))
	assert.equal(shuffledControl(cs, p), shuffledControl(cs, p))
})

// ── The confound the metric exists to avoid ──────────────────────────────────

test('the confounded diagnostics prefer the COARSER partition while the headline does not', () => {
	// Six independent areas, each changed on its own: a fine cut permits full parallelism.
	const cs: Change[] = Array.from({ length: 36 }, (_, i) => ({ files: [`n${i % 6}/a`, `n${i % 6}/b`] }))
	const fine = measure(cs, p)
	const coarse = measure(cs, PARTITIONS.single?.('') as (f: string) => string | undefined)
	assert.ok(!isThin(fine) && !isThin(coarse))
	if (!isThin(fine) && !isThin(coarse)) {
		// within-node co-change: the coarse partition scores a perfect 1 — the trap.
		assert.equal(coarse.diagnostics.withinNodeCoChangeRatio, 1)
		assert.ok(coarse.diagnostics.withinNodeCoChangeRatio >= fine.diagnostics.withinNodeCoChangeRatio)
		// mean nodes touched: the coarse partition also scores a perfect 1 — the same trap.
		assert.equal(coarse.diagnostics.meanNodesTouched, 1)
		assert.ok(coarse.diagnostics.meanNodesTouched <= fine.diagnostics.meanNodesTouched)
		// The headline is not fooled: the coarse partition permits NO parallel work.
		assert.equal(coarse.parallelizableShare, 0)
		assert.ok(fine.parallelizableShare > coarse.parallelizableShare)
	}
})

test('the render labels the diagnostics as confounded and never headlines them', () => {
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 5}/a`, `n${i % 5}/b`] }))
	const out = render([['x', measure(cs, p)]], '.', '')
	assert.match(out, /CONFOUNDED by node count/)
	assert.match(out, /← the headline/)
	assert.match(out.split('← the headline')[0] ?? '', /parallelizable share/)
})

// ── Boundary ─────────────────────────────────────────────────────────────────

test('the report renders no verdict on the layout', () => {
	const cs: Change[] = Array.from({ length: 30 }, () => ({ files: ['a/1', 'b/1'] }))
	const out = render([['x', measure(cs, p)]], '.', '')
	assert.match(out, /a measurement, not a verdict/)
	assert.doesNotMatch(out, /\b(approved|rejected|fail|pass)\b/i)
})

test('an unknown partition name is rejected without running', () => {
	assert.equal(main(['--partition', 'no-such-partition']), 1)
})

// Relocated from the acceptance suite at the 2026-07-19 spec gate: "the engine writes nothing to
// the repository" holds on every path, so it sits on no edge and is an invariant, not a decision.
// It keeps its guard here rather than being dropped.
test('the engine has no write surface — it reads git history and prints', () => {
	const src = readFileSync(new URL('./check-partition-quality.mts', import.meta.url), 'utf8')
	assert.doesNotMatch(src, /writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|createWriteStream/)

	const gitCalls = [...src.matchAll(/execFileSync\(\s*'git',\s*\[([\s\S]*?)\]/g)]
	assert.ok(gitCalls.length > 0, 'expected the engine to shell out to git')
	for (const [, args] of gitCalls) {
		assert.match(args, /'log'/, 'the only git subcommand may be the read-only `log`')
	}
})

test('withinNodeCoChangeRatio and meanNodesTouched stay exported for the report', () => {
	const cs: Change[] = [{ files: ['a/1', 'a/2', 'b/1'] }]
	assert.equal(withinNodeCoChangeRatio(cs, p), 1 / 3)
	assert.equal(meanNodesTouched(cs, p), 2)
})
