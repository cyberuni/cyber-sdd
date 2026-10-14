// bench-compare — the statistics between two run records, and the verdict.
//
// Per task and compared metric: each side's mean, median and min–max, the relative change, and a
// two-sided permutation test on the difference of means. Agent runs vary a lot from one to the
// next, so a mean moving by 10% is often noise; the p-value says how often relabelling the runs at
// random moves the mean at least as far as the real labels did. Up to 200,000 relabellings are
// enumerated (exact); past that, 20,000 seeded relabellings are drawn and p = (hits + 1) / (N + 1),
// identical on every run of the same records.
//
// The pooled row is the geometric mean of the per-task after/before ratios, so a cheap task and an
// expensive one weigh the same; its labels are permuted within each task, never across. A task
// enters a pooled row only when every one of its runs is positive on that metric on both sides,
// so no relabelling can make a log ratio undefined. `pass` has no pooled row: a ratio of pass rates
// is undefined whenever a side is 0%.
//
// THE VERDICT is a closed form (spec: eval-run/bench/engine/README.md). Let G be every row — per
// task and pooled — of a gated metric. Wrong-way: the after mean is worse in that metric's
// direction. Significant: p < 0.05. Then: incomparable > regressed (wrong-way AND significant) >
// inconclusive (wrong-way) > improved (significant) > unchanged. Multiplicity is DISCLOSED in the
// footer (test count × 0.05), never corrected.

import { GATED, METRICS, type Metric, median, type RunRecord, type RunResult, round } from './bench-record.mts'

const ALPHA = 0.05
const EXACT_LIMIT = 200_000
const SAMPLES = 20_000

// ─── permutation machinery ────────────────────────────────────────────────────

/** mulberry32: a small seeded generator, so a sampled p-value repeats exactly. */
function rng(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** FNV-1a, so each row draws from its own seed and one row's sampling never shifts another's. */
function seedOf(key: string): number {
	let h = 0x811c9dc5
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i)
		h = Math.imul(h, 0x01000193)
	}
	return h >>> 0
}

function choose(n: number, k: number): number {
	let c = 1
	for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i
	return Math.round(c)
}

/**
 * The smallest p any data could reach with these group sizes, one `[before, after]` pair per task.
 * One pair is a per-task row; several are a pooled row. Exact when every task enumerates and the
 * product of their relabellings stays within the limit: only the real split and, with equal
 * groups, its mirror can be the most extreme. Sampled otherwise: one hit out of N + 1.
 */
export function minAttainableP(sizes: Array<[number, number]>): number {
	let product = 1
	let exact = true
	for (const [na, nb] of sizes) {
		const c = choose(na + nb, na)
		if (c > EXACT_LIMIT) exact = false
		product *= c
	}
	if (!exact || product > EXACT_LIMIT) return 1 / (SAMPLES + 1)
	return (sizes.every(([na, nb]) => na === nb) ? 2 : 1) / product
}

interface Relabellings {
	stats: number[]
	exact: boolean
}

/**
 * Every split of the pooled runs into a "before" group of `a.length` and an "after" group of the
 * rest, as `stat(beforeMean, afterMean)`. Enumerated when few enough, sampled otherwise.
 */
function relabellings(
	a: number[],
	b: number[],
	stat: (before: number, after: number) => number,
	random: () => number,
): Relabellings {
	const all = [...a, ...b]
	const na = a.length
	const nb = b.length
	const total = all.reduce((s, x) => s + x, 0)
	const stats: number[] = []
	const split = (before: number) => stat(before / na, (total - before) / nb)
	if (choose(all.length, na) <= EXACT_LIMIT) {
		const walk = (from: number, left: number, acc: number) => {
			if (left === 0) {
				stats.push(split(acc))
				return
			}
			for (let i = from; i <= all.length - left; i++) walk(i + 1, left - 1, acc + (all[i] as number))
		}
		walk(0, na, 0)
		return { stats, exact: true }
	}
	const idx = all.map((_, i) => i)
	for (let n = 0; n < SAMPLES; n++) {
		// A partial Fisher-Yates shuffle: the first `na` slots are a uniform random "before" group.
		let acc = 0
		for (let i = 0; i < na; i++) {
			const j = i + Math.floor(random() * (idx.length - i))
			const tmp = idx[i] as number
			idx[i] = idx[j] as number
			idx[j] = tmp
			acc += all[idx[i] as number] as number
		}
		stats.push(split(acc))
	}
	return { stats, exact: false }
}

interface Test {
	p: number
	exact: boolean
	minP: number
	tooFew: boolean
}

/** Two-sided: the share of relabellings whose |statistic| reaches the observed one. */
function pValue(observed: number, { stats, exact }: Relabellings, minP: number): Test {
	const tol = 1e-12 * Math.max(1, Math.abs(observed))
	let hits = 0
	for (const x of stats) if (Math.abs(x) >= Math.abs(observed) - tol) hits++
	// A sampled test counts the real split once more: it is one of the possible ones.
	const p = exact ? hits / stats.length : (hits + 1) / (stats.length + 1)
	return { p, exact, minP, tooFew: minP > ALPHA }
}

const difference = (before: number, after: number) => after - before
const logRatio = (before: number, after: number) => Math.log(after / before)
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length

// ─── rows ─────────────────────────────────────────────────────────────────────

interface SideStats {
	n: number
	mean: number
	median: number
	min: number
	max: number
}

export interface TaskRow extends Partial<Test> {
	scope: 'task'
	task: string
	metric: Metric
	before: SideStats | null
	after: SideStats | null
	/** Relative change of the mean (0.1 is +10%); null when a side is empty or before is 0. */
	change: number | null
	wrongWay: boolean
	significant: boolean
	tags: Record<string, string>
}

export interface PooledRow extends Test {
	scope: 'pooled'
	metric: Metric
	/** The geometric mean of the per-task after/before ratios. */
	ratio: number
	change: number
	/** How many tasks the row pooled. */
	tasks: number
	wrongWay: boolean
	significant: boolean
}

type Row = TaskRow | PooledRow

export type Verdict = 'incomparable' | 'regressed' | 'inconclusive' | 'improved' | 'unchanged'

export interface Reason {
	field: string
	before?: string
	after?: string
	message: string
}

export interface Comparison {
	verdict: Verdict
	incomparable: Reason[]
	/** Tasks measured on only one side: listed, never compared. */
	unmatched: string[]
	/** Runs recorded as errors, left out of every metric. */
	errorsExcluded: { before: number; after: number }
	rows: Row[]
	footer: { testCount: number; expectedByChance: number; alpha: number }
}

const value = (r: RunResult, m: Metric): number => (m === 'pass' ? (r.pass ? 1 : 0) : r[m])

function sideStats(xs: number[]): SideStats | null {
	if (xs.length === 0) return null
	return { n: xs.length, mean: mean(xs), median: median(xs), min: Math.min(...xs), max: Math.max(...xs) }
}

/** Worse in the metric's direction: lower pass is worse; higher is worse for every other metric. */
function worse(metric: Metric, before: number, after: number): boolean {
	return metric === 'pass' ? after < before : after > before
}

function taskRow(task: string, metric: Metric, a: number[], b: number[], tags: Record<string, string>): TaskRow {
	const before = sideStats(a)
	const after = sideStats(b)
	const row: TaskRow = {
		scope: 'task',
		task,
		metric,
		before,
		after,
		change: before && after && before.mean !== 0 ? after.mean / before.mean - 1 : null,
		wrongWay: false,
		significant: false,
		tags,
	}
	if (!before || !after) return row
	const test = pValue(
		difference(before.mean, after.mean),
		relabellings(a, b, difference, rng(seedOf(`${task}\0${metric}`))),
		minAttainableP([[a.length, b.length]]),
	)
	Object.assign(row, test)
	row.wrongWay = worse(metric, before.mean, after.mean)
	row.significant = test.p < ALPHA
	return row
}

function pooledRow(metric: Metric, pairs: Array<[number[], number[]]>): PooledRow | undefined {
	const usable = pairs.filter(([a, b]) => a.length > 0 && b.length > 0 && [...a, ...b].every((x) => x > 0))
	if (usable.length === 0) return undefined
	const random = rng(seedOf(`pooled\0${metric}`))
	const observed = mean(usable.map(([a, b]) => logRatio(mean(a), mean(b))))
	const perTask = usable.map(([a, b]) => relabellings(a, b, logRatio, random))
	const size = perTask.reduce((n, t) => n * t.stats.length, 1)
	const exact = perTask.every((t) => t.exact) && size <= EXACT_LIMIT
	const stats: number[] = []
	if (exact) {
		const walk = (i: number, acc: number) => {
			if (i === perTask.length) {
				stats.push(acc / perTask.length)
				return
			}
			for (const s of (perTask[i] as Relabellings).stats) walk(i + 1, acc + s)
		}
		walk(0, 0)
	} else {
		for (let n = 0; n < SAMPLES; n++) {
			let acc = 0
			for (const t of perTask) acc += t.stats[Math.floor(random() * t.stats.length)] as number
			stats.push(acc / perTask.length)
		}
	}
	const test = pValue(observed, { stats, exact }, minAttainableP(usable.map(([a, b]) => [a.length, b.length])))
	const ratio = Math.exp(observed)
	return {
		scope: 'pooled',
		metric,
		ratio,
		change: ratio - 1,
		tasks: usable.length,
		...test,
		wrongWay: observed > 1e-12,
		significant: test.p < ALPHA,
	}
}

// ─── comparability ────────────────────────────────────────────────────────────

const MATCHED_FIELDS: Array<[string, (r: RunRecord) => string]> = [
	['layer', (r) => String(r.layer)],
	['model', (r) => String(r.model)],
	['harness', (r) => String(r.harness)],
	['adapter', (r) => String(r.adapter)],
	['runner', (r) => String(r.runner)],
	['subject kind', (r) => String(r.subject?.kind)],
	['task-set hash', (r) => String(r.taskSetHash)],
]

function incomparableReasons(a: RunRecord, b: RunRecord): Reason[] {
	const reasons: Reason[] = []
	for (const [field, get] of MATCHED_FIELDS) {
		const x = get(a)
		const y = get(b)
		if (x !== y) reasons.push({ field, before: x, after: y, message: `${field} differs: before "${x}", after "${y}"` })
	}
	// An unknown model never matches another unknown: two such records may have run anything.
	if (
		(a.model === 'unknown' && b.model === 'unknown') ||
		(a.scoring_model === 'unknown' && b.scoring_model === 'unknown')
	)
		reasons.push({ field: 'model', message: 'the model is unknown on both sides' })
	return reasons
}

function verdictOf(rows: Row[]): Verdict {
	const g = rows.filter((r) => GATED.has(r.metric))
	if (g.some((r) => r.wrongWay && r.significant)) return 'regressed'
	if (g.some((r) => r.wrongWay)) return 'inconclusive'
	if (g.some((r) => r.significant)) return 'improved'
	return 'unchanged'
}

/** Compares `after` against `before`. Never refuses: a mismatch is an `incomparable` verdict. */
export function compareRecords(before: RunRecord, after: RunRecord): Comparison {
	const incomparable = incomparableReasons(before, after)
	const beforeTasks = [...new Set(before.runs.map((r) => r.task))]
	const afterTasks = [...new Set(after.runs.map((r) => r.task))]
	const unmatched = [
		...beforeTasks.filter((t) => !afterTasks.includes(t)),
		...afterTasks.filter((t) => !beforeTasks.includes(t)),
	]
	const empty: Comparison = {
		verdict: 'incomparable',
		incomparable,
		unmatched,
		errorsExcluded: { before: 0, after: 0 },
		rows: [],
		footer: { testCount: 0, expectedByChance: 0, alpha: ALPHA },
	}
	if (incomparable.length > 0) return empty

	const tasks = beforeTasks.filter((t) => afterTasks.includes(t))
	const errorsExcluded = { before: 0, after: 0 }
	const kept = (record: RunRecord, task: string, side: 'before' | 'after') => {
		const rs = record.runs.filter((r) => r.task === task)
		const ok = rs.filter((r) => !r.error)
		errorsExcluded[side] += rs.length - ok.length
		return ok
	}
	const rows: Row[] = []
	const pairs = new Map<Metric, Array<[number[], number[]]>>()
	for (const task of tasks) {
		const a = kept(before, task, 'before')
		const b = kept(after, task, 'after')
		const tags = after.tags?.[task] ?? before.tags?.[task] ?? {}
		for (const metric of METRICS) {
			const va = a.map((r) => value(r, metric))
			const vb = b.map((r) => value(r, metric))
			rows.push(taskRow(task, metric, va, vb, { ...tags }))
			if (metric !== 'pass') pairs.set(metric, [...(pairs.get(metric) ?? []), [va, vb]])
		}
	}
	for (const metric of METRICS) {
		if (metric === 'pass') continue
		const row = pooledRow(metric, pairs.get(metric) ?? [])
		if (row) rows.push(row)
	}
	const testCount = rows.filter((r) => r.p !== undefined).length
	return {
		verdict: verdictOf(rows),
		incomparable,
		unmatched,
		errorsExcluded,
		rows,
		footer: { testCount, expectedByChance: round(testCount * ALPHA), alpha: ALPHA },
	}
}
