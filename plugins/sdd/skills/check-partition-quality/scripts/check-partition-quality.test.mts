import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
	type Change,
	type Context,
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
	toJson,
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

test('a partition of one node collides with itself on every pair, and the report names it as permitting no parallel work', () => {
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 6}/a`, `n${i % 6}/b`] }))
	const single = PARTITIONS.single?.('') as (f: string) => string | undefined
	const m = measure(cs, single)
	assert.ok(!isThin(m))
	if (!isThin(m)) {
		assert.equal(m.collisionRate, 1)
		const out = render([['x', m]], '.', '')
		assert.match(out, /permits no parallel work/)
	}
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
	// A non-degenerate fixture: collisionRate is NOT pinned at 1, so the flag genuinely depends on
	// the control's actual value (a hardcoded control could not reproduce this margin by accident).
	// Node assignment (i, (i*3+1) mod 8) is arbitrary relative to co-change, so the real partition
	// performs about as well as a shuffle of the same node sizes — margin <= 0.
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({
		files: [`n${i % 8}/x${i}`, `n${(i * 3 + 1) % 8}/y${i}`],
	}))
	const m = measure(cs, p)
	assert.ok(!isThin(m))
	if (!isThin(m)) {
		assert.notEqual(m.collisionRate, 1, 'fixture must not be the degenerate all-collide case')
		assert.equal(m.control, shuffledControl(cs, p), 'the reported control must be the real shuffle, not a stand-in')
		assert.notEqual(m.control, 0, 'a real shuffled control over this fixture is never exactly zero')
		assert.equal(m.explainsNothing, true)
		assert.match(render([['x', m]], '.', ''), /explains no more than chance/)
	}
})

test('a partition better than its shuffled control reports the margin', () => {
	// Each change lives entirely inside one of ten nodes — real structure a shuffle destroys.
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 10}/a`, `n${i % 10}/b`] }))
	const m = measure(cs, p)
	assert.ok(!isThin(m))
	if (!isThin(m)) {
		assert.equal(m.control, shuffledControl(cs, p), 'the reported control must be the real shuffle')
		assert.ok(m.control > m.collisionRate, 'fixture must genuinely beat its control, or margin proves nothing')
		assert.ok(m.marginOverControl > 0)
		assert.equal(m.explainsNothing, false)
		const out = render([['x', m]], '.', '')
		assert.match(out, /margin \+/)
	}
})

test('every run reports a shuffled control alongside the measurement, wired through measure() and render()', () => {
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 10}/a`, `n${i % 10}/b`] }))
	const m = measure(cs, p)
	assert.ok(!isThin(m))
	if (!isThin(m)) {
		// Tie the reported field to an independently computed real shuffle, not just "some number".
		assert.equal(m.control, shuffledControl(cs, p))
		assert.notEqual(m.control, 0)
		const out = render([['x', m]], '.', '')
		assert.match(out, new RegExp(`shuffled control\\s*: ${(m.control * 100).toFixed(1)}%`))
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

// ── Comparing candidate partitions ────────────────────────────────────────────

test('two candidate partitions are compared on the same history — same commits, same scope', () => {
	// Drives the real main() through its context boundary. Asserting on a hand-shared array passed
	// to measure() twice would only prove the test's own setup — the promise this scenario makes is
	// that the TOOL reads history once and scores every candidate against that one read, which lives
	// in main() and is observable only from here.
	const scope = 'src/'
	// Files share a first segment but vary in the second, so the declared scope genuinely changes the
	// GROUPING (not just node labels): under scope 'src/' second-folder groups by cap/unit, but under
	// '' it groups by the coarser src/cap — a different measurement. A fixture that grouped the same
	// way either way could not tell a candidate scored under the wrong scope from a correct one.
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({
		files: [`src/cap${i % 5}/unit${i % 3}/a.ts`, `src/cap${i % 5}/unit${i % 3}/b.ts`],
	}))
	const calls: Array<{ repo: string; limit: number; scoped: boolean }> = []
	const readHistory: Context['readHistory'] = (repo, inScope, limit = 4000) => {
		calls.push({ repo, limit, scoped: inScope('src/cap0/unit0/a.ts') && !inScope('other/x.ts') })
		return cs
	}
	const write = process.stdout.write.bind(process.stdout)
	let out = ''
	process.stdout.write = ((s: string) => {
		out += s
		return true
	}) as typeof process.stdout.write
	let code: number
	try {
		code = main(
			[
				'--repo',
				'/some/repo',
				'--scope',
				scope,
				'--format',
				'json',
				'--partition',
				'top-folder',
				'--partition',
				'second-folder',
			],
			{ readHistory },
		)
	} finally {
		process.stdout.write = write
	}
	assert.equal(code, 0)
	// Read exactly ONCE for two candidates — re-reading per candidate is one way to break this.
	assert.equal(calls.length, 1)
	assert.equal(calls[0]?.repo, '/some/repo')
	assert.equal(calls[0]?.limit, 4000)
	assert.ok(calls[0]?.scoped)
	// The `Then` is about what each candidate was MEASURED over, not merely what was read. Asserting
	// on the read alone leaves the door open to scoring the candidates over different commit subsets
	// or under different scopes after that one read. So check each candidate's reported numbers
	// against the same history measured under the same scope — computed here independently.
	const report = JSON.parse(out) as Record<string, unknown>
	for (const c of ['top-folder', 'second-folder']) {
		const partition = PARTITIONS[c]?.(scope) as (f: string) => string | undefined
		const [, expected] = toJson([c, measure(cs, partition)])
		assert.deepEqual(report[c], expected, `${c} must be measured over the same commits and the same scope`)
	}
	// Both candidates saw every commit, so they must agree on the pair count they were scored over.
	const pairsOf = (c: string) => (report[c] as { pairs: number }).pairs
	assert.equal(pairsOf('top-folder'), pairsOf('second-folder'))
	assert.equal(pairsOf('top-folder'), (30 * 29) / 2)
})

test('the comparison reports the parallelizable share of each candidate', () => {
	const scope = 'src/'
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({
		files: [`src/n${i % 10}/deep/a.ts`, `src/n${i % 10}/deep/b.ts`],
	}))
	const topFolder = PARTITIONS['top-folder']?.(scope) as (f: string) => string | undefined
	const single = PARTITIONS.single?.(scope) as (f: string) => string | undefined
	const mTop = measure(cs, topFolder)
	const mSingle = measure(cs, single)
	assert.ok(!isThin(mTop) && !isThin(mSingle))
	if (!isThin(mTop) && !isThin(mSingle)) {
		const out = render(
			[
				['top-folder', mTop],
				['single', mSingle],
			],
			'.',
			scope,
		)
		// Each candidate carries its OWN parallelizable share — the two numbers must differ and
		// both must appear, not just the winner's.
		assert.notEqual(mTop.parallelizableShare, mSingle.parallelizableShare)
		assert.match(
			out,
			new RegExp(`top-folder[\\s\\S]*?parallelizable share : ${(mTop.parallelizableShare * 100).toFixed(1)}%`),
		)
		assert.match(
			out,
			new RegExp(`single[\\s\\S]*?parallelizable share : ${(mSingle.parallelizableShare * 100).toFixed(1)}%`),
		)
		assert.match(out, /"top-folder" permits the most parallel work/)
	}
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

test('the json report carries the confound label in the field name', () => {
	// Must clear DEFAULT_FLOOR — a thin history carries no diagnostics to label.
	const cs: Change[] = Array.from({ length: 30 }, (_, i) => ({ files: [`n${i % 5}/a`, `n${i % 5}/b`] }))
	const m = measure(cs, p)
	assert.ok(!isThin(m), 'fixture must not be thin, or this test asserts nothing')
	const [, out] = toJson(['second-folder', m]) as [string, Record<string, unknown>]

	assert.ok('confoundedDiagnostics' in out, 'the confound label must be part of the field name')
	assert.ok(!('diagnostics' in out), 'no unlabelled diagnostics field may be emitted alongside it')
	assert.deepEqual(Object.keys(out.confoundedDiagnostics as object).sort(), [
		'meanNodesTouched',
		'withinNodeCoChangeRatio',
	])
})

test('withinNodeCoChangeRatio and meanNodesTouched stay exported for the report', () => {
	const cs: Change[] = [{ files: ['a/1', 'a/2', 'b/1'] }]
	assert.equal(withinNodeCoChangeRatio(cs, p), 1 / 3)
	assert.equal(meanNodesTouched(cs, p), 2)
})
