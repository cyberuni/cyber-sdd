#!/usr/bin/env node
// check-partition-quality — project-spec/partition-quality's concrete engine. Measures, from a
// project's own git history, how much parallel work its layout permits, and compares candidate
// layouts on the same evidence (see this skill's README.md).
//
// THE METRIC IS COLLISION RATE, AND THAT CHOICE IS LOAD-BEARING. The scheduler cuts one mission per
// spec-node, so two changes touching a shared node must serialize. Collision rate is the share of
// change pairs that do. The headline is its complement — the parallelizable share.
//
// Two obvious alternatives were tried first and BOTH preferred a layered partition (the wrong
// answer), because both are confounded by node count:
//   - within-node co-change ratio  — a coarser partition scores well for being coarse
//   - mean nodes touched per change — a single-node partition scores PERFECTLY while permitting
//     zero parallel work
// They are computed and reported here as DIAGNOSTICS, explicitly labelled, so that a later reader
// does not "simplify" the engine back onto one of them. Do not headline them.
//
// Read-only: it runs `git log`, writes nothing, and renders no verdict — layout is the owner's call.
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { execFileSync } from 'node:child_process'

/** Below this many usable multi-file commits, a rate would be noise — report, never score. */
export const DEFAULT_FLOOR = 20

export interface Change {
	/** In-scope files touched by one commit. */
	files: string[]
}

/** A partition names the node each file belongs to; `undefined` drops the file from the measure. */
export type Partition = (file: string) => string | undefined

export interface Measurement {
	nodes: number
	pairs: number
	collisionRate: number
	parallelizableShare: number
	control: number
	/** Positive when the partition explains more than a shuffle of the same node sizes. */
	marginOverControl: number
	explainsNothing: boolean
	diagnostics: {
		/** CONFOUNDED by node count — a coarser partition scores higher. Never headline. */
		withinNodeCoChangeRatio: number
		/** CONFOUNDED by node count — a single-node partition scores a perfect 1. Never headline. */
		meanNodesTouched: number
	}
}

export interface ThinHistory {
	thin: true
	usableCommits: number
	floor: number
}

// ── Reading history ──────────────────────────────────────────────────────────
// Only multi-file changes inform the measure: a single-file commit contributes no pair, because one
// file can collide with nothing.

export function parseGitLog(stdout: string, inScope: (f: string) => boolean): Change[] {
	const out: Change[] = []
	let cur: string[] | null = null
	for (const line of stdout.split('\n')) {
		const t = line.trimEnd()
		if (t === '') {
			if (cur && cur.length > 1) out.push({ files: [...new Set(cur)] })
			cur = null
			continue
		}
		if (/^[0-9a-f]{40}$/.test(t)) {
			if (cur && cur.length > 1) out.push({ files: [...new Set(cur)] })
			cur = []
			continue
		}
		if (cur !== null && inScope(t)) cur.push(t)
	}
	if (cur && cur.length > 1) out.push({ files: [...new Set(cur)] })
	return out.filter((c) => c.files.length > 1)
}

export function readHistory(repo: string, inScope: (f: string) => boolean, limit = 4000): Change[] {
	const stdout = execFileSync('git', ['-C', repo, 'log', `-${limit}`, '--name-only', '--pretty=format:%H'], {
		encoding: 'utf8',
		maxBuffer: 256 * 1024 * 1024,
	})
	return parseGitLog(stdout, inScope)
}

// ── The metric ───────────────────────────────────────────────────────────────

/** The set of nodes one change touches. A change touching none drops out of the measure. */
function nodesOf(c: Change, p: Partition): Set<string> {
	const s = new Set<string>()
	for (const f of c.files) {
		const n = p(f)
		if (n !== undefined) s.add(n)
	}
	return s
}

export function collisionRate(changes: Change[], p: Partition): { rate: number; pairs: number } {
	const sets = changes.map((c) => nodesOf(c, p)).filter((s) => s.size > 0)
	let pairs = 0
	let collided = 0
	for (let i = 0; i < sets.length; i++) {
		for (let j = i + 1; j < sets.length; j++) {
			pairs++
			const a = sets[i] as Set<string>
			const b = sets[j] as Set<string>
			for (const n of a) {
				if (b.has(n)) {
					collided++
					break
				}
			}
		}
	}
	return { rate: pairs === 0 ? 0 : collided / pairs, pairs }
}

// ── The control ──────────────────────────────────────────────────────────────
// The same measurement over a SHUFFLED partition of identical node sizes. A partition whose rate
// matches its shuffle explains nothing, and the headline should not be trusted. Deterministic seed:
// the run must be reproducible.

function mulberry32(seed: number): () => number {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function shuffledControl(changes: Change[], p: Partition, seed = 7): number {
	const files = [...new Set(changes.flatMap((c) => c.files))].filter((f) => p(f) !== undefined).sort()
	const labels = files.map((f) => p(f) as string)
	const rnd = mulberry32(seed)
	for (let i = labels.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1))
		const li = labels[i] as string
		const lj = labels[j] as string
		labels[i] = lj
		labels[j] = li
	}
	const m = new Map(files.map((f, i) => [f, labels[i] as string]))
	return collisionRate(changes, (f) => m.get(f)).rate
}

// ── Confounded diagnostics — labelled, never the headline ────────────────────

export function withinNodeCoChangeRatio(changes: Change[], p: Partition): number {
	let within = 0
	let total = 0
	for (const c of changes) {
		const ns = c.files.map((f) => p(f)).filter((n): n is string => n !== undefined)
		for (let i = 0; i < ns.length; i++) {
			for (let j = i + 1; j < ns.length; j++) {
				total++
				if (ns[i] === ns[j]) within++
			}
		}
	}
	return total === 0 ? 0 : within / total
}

export function meanNodesTouched(changes: Change[], p: Partition): number {
	const counts = changes.map((c) => nodesOf(c, p).size).filter((n) => n > 0)
	return counts.length === 0 ? 0 : counts.reduce((a, b) => a + b, 0) / counts.length
}

// ── Measure ──────────────────────────────────────────────────────────────────

export function measure(changes: Change[], p: Partition, floor = DEFAULT_FLOOR): Measurement | ThinHistory {
	const usable = changes.filter((c) => nodesOf(c, p).size > 0)
	if (usable.length < floor) return { thin: true, usableCommits: usable.length, floor }
	const { rate, pairs } = collisionRate(usable, p)
	const control = shuffledControl(usable, p)
	const margin = control - rate // lower collision than the shuffle is the improvement
	return {
		nodes: new Set(usable.flatMap((c) => [...nodesOf(c, p)])).size,
		pairs,
		collisionRate: rate,
		parallelizableShare: 1 - rate,
		control,
		marginOverControl: margin,
		explainsNothing: margin <= 0,
		diagnostics: {
			withinNodeCoChangeRatio: withinNodeCoChangeRatio(usable, p),
			meanNodesTouched: meanNodesTouched(usable, p),
		},
	}
}

export function isThin(m: Measurement | ThinHistory): m is ThinHistory {
	return (m as ThinHistory).thin === true
}

// ── Built-in candidate partitions ────────────────────────────────────────────
// Named so a caller can compare "what the tree does now" against "what a capability cut would do"
// without writing code.

export const PARTITIONS: Record<string, (scope: string) => Partition> = {
	/** Top-level folder under the scope — the capability cut for a screaming layout. */
	'top-folder': (scope) => (f) => {
		const rel = f.startsWith(scope) ? f.slice(scope.length).replace(/^\//, '') : undefined
		if (rel === undefined) return undefined
		const seg = rel.split('/')[0]
		return seg === undefined || seg === '' || !rel.includes('/') ? undefined : seg
	},
	/** Second-level folder — a finer cut, for a capability/unit tree. */
	'second-folder': (scope) => (f) => {
		const rel = f.startsWith(scope) ? f.slice(scope.length).replace(/^\//, '') : undefined
		if (rel === undefined) return undefined
		const p = rel.split('/')
		return p.length > 2 ? `${p[0]}/${p[1]}` : undefined
	},
	/** File extension / artifact role — the layered analogue, useful as a contrast candidate. */
	role: (scope) => (f) => {
		if (!f.startsWith(scope)) return undefined
		const n = f.split('/').pop() ?? ''
		const dot = n.indexOf('.')
		return dot === -1 ? n : n.slice(dot + 1)
	},
	/** Everything in one node — the degenerate floor: no parallel work is possible. */
	single: (scope) => (f) => (f.startsWith(scope) ? 'all' : undefined),
}

// ── Render ───────────────────────────────────────────────────────────────────

function pct(n: number): string {
	return `${(n * 100).toFixed(1)}%`
}

export function renderOne(label: string, m: Measurement | ThinHistory): string {
	if (isThin(m)) {
		return `  ${label}: history too thin to measure — ${m.usableCommits} usable multi-file commits, floor ${m.floor}. No rate emitted.`
	}
	const lines = [
		`  ${label}`,
		`    parallelizable share : ${pct(m.parallelizableShare)}   ← the headline`,
		`    collision rate       : ${pct(m.collisionRate)}  over ${m.pairs} change pairs, ${m.nodes} nodes`,
		`    shuffled control     : ${pct(m.control)}  (margin ${m.marginOverControl >= 0 ? '+' : ''}${pct(m.marginOverControl)})`,
	]
	if (m.explainsNothing) {
		lines.push('    ⚠ this partition explains no more than chance — do not trust the headline')
	}
	lines.push(
		`    diagnostics (CONFOUNDED by node count — not the headline): within-node co-change ${pct(m.diagnostics.withinNodeCoChangeRatio)}, mean nodes touched ${m.diagnostics.meanNodesTouched.toFixed(2)}`,
	)
	return lines.join('\n')
}

export function render(results: [string, Measurement | ThinHistory][], repo: string, scope: string): string {
	const out = [`check-partition-quality: repo=${repo} scope=${scope || '(whole repo)'}`]
	for (const [label, m] of results) out.push(renderOne(label, m))
	if (results.length > 1) {
		const scored = results.filter(([, m]) => !isThin(m)) as [string, Measurement][]
		if (scored.length > 1) {
			const best = scored.reduce((a, b) => (b[1].parallelizableShare > a[1].parallelizableShare ? b : a))
			out.push(`\nOn this history, "${best[0]}" permits the most parallel work (${pct(best[1].parallelizableShare)}).`)
		}
	}
	out.push('note: a measurement, not a verdict — it moves no file and gates nothing; layout is the owner’s call')
	return out.join('\n')
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export function main(argv: string[]): number {
	let repo = '.'
	let scope = ''
	let floor = DEFAULT_FLOOR
	let limit = 4000
	let format: 'text' | 'json' = 'text'
	const candidates: string[] = []
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--repo') repo = argv[++i] ?? '.'
		else if (a === '--scope') scope = argv[++i] ?? ''
		else if (a === '--floor') floor = Number(argv[++i] ?? DEFAULT_FLOOR)
		else if (a === '--limit') limit = Number(argv[++i] ?? 4000)
		else if (a === '--format') format = (argv[++i] as 'text' | 'json') ?? 'text'
		else if (a === '--partition') candidates.push(argv[++i] ?? '')
	}
	if (candidates.length === 0) candidates.push('top-folder', 'role')
	for (const c of candidates) {
		if (!(c in PARTITIONS)) {
			process.stderr.write(`unknown --partition "${c}" — known: ${Object.keys(PARTITIONS).join(', ')}\n`)
			return 1
		}
	}
	const changes = readHistory(repo, (f) => (scope ? f.startsWith(scope) : true), limit)
	const results = candidates.map(
		(c) =>
			[c, measure(changes, (PARTITIONS[c] as (s: string) => Partition)(scope), floor)] as [
				string,
				Measurement | ThinHistory,
			],
	)
	if (format === 'json') process.stdout.write(`${JSON.stringify(Object.fromEntries(results), null, 2)}\n`)
	else process.stdout.write(`${render(results, repo, scope)}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
