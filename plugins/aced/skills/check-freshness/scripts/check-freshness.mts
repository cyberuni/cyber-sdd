#!/usr/bin/env node
// check-freshness — is a recorded eval result still current?
//
// Reads the newest result `run` recorded for a node's target, re-hashes the paths that result
// recorded, and returns current / stale / incomplete / absent. Nothing is inferred: no modification
// times, no guessed file sets, no guessed directory names. The rejected first attempt at this
// capability guessed all three, which is why every decision here reads only what the record names.
//
// TWO BOUNDARIES, both deliberate, both stated in .agents/specs/aced/eval-run/check-freshness/:
//
//   Closed world — this compares the inputs the result recorded and NOTHING else. It never
//   re-resolves what the subject depends on now. So `current` means "every input this result
//   recorded still hashes as recorded", never "the subject has not grown". Growth is caught at the
//   producer: `run` records a hash over the entries of every directory it listed, so a file added
//   to a directory the subject loads from changes a recorded entry. Growth reaching the subject by
//   a path `run` never consumed stays invisible BY CONSTRUCTION — it was not an input.
//
//   Trust boundary — `evaluated` is what the run REPORTS consuming, not a verified trace. An
//   under-reporting run records a shorter set whose every entry then matches, and this returns
//   `current` with full confidence. That failure is silent and points the unsafe way; see #475.
//   What IS checkable is coherence: a set omitting the .feature whose scenarios the record scores,
//   or the configuration its own `target` names, contradicts the record it accompanies and reads
//   `absent`. That catches only an INCONSISTENT under-reporter — a uniform one escapes.
//
// This engine owns the hashing implementation for BOTH sides of the comparison. `run` computes its
// entries by invoking `--hash-file` / `--hash-dir` here rather than reimplementing the rule: two
// schemes that merely agree today would surface their divergence as a permanent `stale`, never as
// an error. The RULE is `run`'s contract (eval-run/run/); this is its single implementation.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies — plain node strips the types.

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// ─── types ────────────────────────────────────────────────────────────────────

export type Verdict = 'current' | 'stale' | 'incomplete' | 'absent'

// `kind` is what makes the two hash rules distinguishable at read time. Without it a directory
// entry is indistinguishable from a file entry and would be re-hashed as bytes, which fails for
// every directory and would read as a permanent `stale`.
export interface EvaluatedEntry {
	path: string
	sha256: string
	kind: 'file' | 'directory'
}

export interface ResultRecord {
	timestamp?: string
	target?: string
	scenarios?: unknown[]
	evaluated?: EvaluatedEntry[]
}

export interface LoadedResult {
	file: string
	record: ResultRecord
}

export interface Decision {
	verdict: Verdict
	// Why, in one line, for the reader. Never a second machine channel — the exit code is that.
	reason: string
	// Recorded inputs that no longer match. Populated for stale/incomplete only: `absent` has
	// nothing to compare and `current` has nothing that failed.
	mismatched: string[]
	skipped: string[]
}

// ─── hashing — the single routine both sides use ──────────────────────────────

/** A file entry hashes the bytes read. */
export function hashFile(abs: string): string {
	return createHash('sha256').update(readFileSync(abs)).digest('hex')
}

/**
 * A directory entry hashes the NAMES the listing returned, never their contents — that is what
 * makes a file later ADDED to the directory detectable without re-resolving the subject.
 *
 * The canonical form is load-bearing: entry names (not paths), sorted, joined by \n, no trailing
 * newline. `readdirSync` order is filesystem-dependent, so an unsorted join would hash differently
 * on two machines holding identical trees and report `stale` for nothing.
 */
export function hashDirListing(abs: string): string {
	return createHash('sha256')
		.update(canonicalListing(readdirSync(abs)))
		.digest('hex')
}

/**
 * The canonical form of a listing: sorted, `\n`-joined, no trailing newline.
 *
 * Split out as a pure function so the ordering guarantee is testable WITHOUT a filesystem. It is not
 * otherwise falsifiable here: ext4 returns `readdirSync` already sorted, so deleting the sort keeps
 * the whole suite green on Linux while handing every APFS and NTFS user a permanent spurious `stale`
 * — the divergence would surface as a wrong verdict, never as an error.
 */
export function canonicalListing(names: string[]): string {
	return [...names].sort().join('\n')
}

// ─── eval.md — resolve the target ─────────────────────────────────────────────

/**
 * Pulls `subject:` out of an eval.md's frontmatter. Deliberately not a YAML parser: the one key
 * that matters is a scalar path, and a dependency-free engine that reads one key cannot be broken
 * by an unrelated key's syntax.
 */
export function readSubject(evalText: string): string | null {
	const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(evalText)
	const body = fm ? fm[1] : evalText
	for (const line of body.split(/\r?\n/)) {
		const m = /^subject:\s*(.+?)\s*$/.exec(line)
		if (!m) continue
		const raw = m[1].replace(/^["']|["']$/g, '').trim()
		return raw === '' ? null : raw
	}
	return null
}

/** The node's own frozen suite — one member of the evaluated set, handled apart from the rest. */
export function findFrozenFeature(nodeDir: string): string | null {
	const hit = readdirSync(nodeDir).find((n) => n.endsWith('.feature'))
	return hit ? join(nodeDir, hit) : null
}

// ─── result selection ─────────────────────────────────────────────────────────

/** Every `*.json` under the results tree, at any depth. */
export function collectResultFiles(resultsDir: string): string[] {
	const out: string[] = []
	const walk = (dir: string) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = join(dir, e.name)
			if (e.isDirectory()) walk(p)
			else if (e.name.endsWith('.json')) out.push(p)
		}
	}
	walk(resultsDir)
	return out.sort()
}

export interface Scan {
	forTarget: LoadedResult[]
	unreadable: string[]
}

/**
 * Partitions results by the target each one RECORDS — never by the directory it sits in. A result
 * filed under a mis-slugged directory still belongs to the target its own `target` field names, and
 * an implementation matching on directory name would silently miss it.
 *
 * An unparseable file is collected rather than thrown on: one corrupt record must not blind the
 * check to the readable ones beside it.
 */
export function scanResults(files: string[], target: string, read: (f: string) => string): Scan {
	const forTarget: LoadedResult[] = []
	const unreadable: string[] = []
	for (const file of files) {
		let record: ResultRecord
		try {
			record = JSON.parse(read(file)) as ResultRecord
		} catch {
			unreadable.push(file)
			continue
		}
		if (record && record.target === target) forTarget.push({ file, record })
	}
	return { forTarget, unreadable }
}

/**
 * Newest by RECORDED timestamp, not by filename. Filenames sort lexicographically and a timestamp
 * is the fact that matters; where the two disagree, trusting the name picks the wrong record.
 */
export function selectNewest(results: LoadedResult[]): LoadedResult | null {
	let best: LoadedResult | null = null
	for (const r of results) {
		const t = r.record.timestamp ?? ''
		if (!best || t > (best.record.timestamp ?? '')) best = r
	}
	return best
}

// ─── coherence — the conditional oracle ───────────────────────────────────────

/**
 * Taking the record's OWN `scenarios` and `target` as given, does its evaluated set cover the
 * inputs they imply were read? Scores cannot come from a `.feature` never read, and a configuration
 * cannot be judged unopened.
 *
 * This is a CONDITIONAL relation, never a proof: `scenarios` and `target` are written by the same
 * agent and self-reported exactly as `evaluated` is, so a fabricated-but-self-consistent record
 * passes. It catches the inconsistent under-reporter only.
 */
export function incoherence(record: ResultRecord, featureRel: string, targetRel: string): string | null {
	const paths = new Set((record.evaluated ?? []).map((e) => e.path))
	if ((record.scenarios?.length ?? 0) > 0 && !paths.has(featureRel)) {
		return `the recorded provenance contradicts the result it accompanies: it scores ${record.scenarios?.length} scenarios but carries no entry for ${featureRel}`
	}
	if (record.target && !paths.has(targetRel)) {
		return `the recorded provenance omits the configuration the result names: no entry for ${targetRel}`
	}
	return null
}

// ─── the verdict ──────────────────────────────────────────────────────────────

/**
 * Split the evaluated set into the frozen suite and the subject inputs, then compare.
 *
 * The ORDER of the two questions is the whole `incomplete` / `stale` distinction. A moved subject
 * input means no individual score survives, so it wins outright. Only when every subject input is
 * unmoved does a changed suite mean something narrower: the scores stand, the suite grew past them.
 * Collapsing the two would throw away that surviving fact.
 */
export function decideVerdict(
	record: ResultRecord,
	repoRoot: string,
	featureRel: string,
	skipped: string[] = [],
): Decision {
	const entries = record.evaluated ?? []
	const subject = entries.filter((e) => e.path !== featureRel)
	const suite = entries.filter((e) => e.path === featureRel)

	const moved = (e: EvaluatedEntry): string | null => {
		const abs = join(repoRoot, e.path)
		if (!existsSync(abs)) return `${e.path} (missing from the tree)`
		try {
			const now = e.kind === 'directory' ? hashDirListing(abs) : hashFile(abs)
			return now === e.sha256 ? null : `${e.path} (content changed)`
		} catch {
			return `${e.path} (unreadable)`
		}
	}

	const subjectMoved = subject.map(moved).filter((m): m is string => m !== null)
	if (subjectMoved.length > 0) {
		return {
			verdict: 'stale',
			reason: 'an input the scores rest on has moved; no individual score can be relied on without re-running',
			mismatched: subjectMoved,
			skipped,
		}
	}

	const suiteMoved = suite.map(moved).filter((m): m is string => m !== null)
	if (suiteMoved.length > 0) {
		return {
			verdict: 'incomplete',
			reason:
				'every input the scores rest on is unmoved, but the suite changed past them, so the result no longer covers the whole suite',
			mismatched: suiteMoved,
			skipped,
		}
	}

	return {
		verdict: 'current',
		reason: "every input the run recorded still hashes as recorded — the run's account still holds",
		mismatched: [],
		skipped,
	}
}

// ─── repo root ────────────────────────────────────────────────────────────────

export function findRepoRoot(from: string): string | null {
	let dir = resolve(from)
	for (;;) {
		if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) return dir
		const up = resolve(dir, '..')
		if (up === dir) return null
		dir = up
	}
}

export const RESULTS_DIR = join('.agents', 'aced', 'results')

// ─── measured records ─────────────────────────────────────────────────────────
//
// The bench engine writes one measured record per arm to `.agents/aced/results/bench/<suite>/`.
// It names no `target`, so it is found by the `suite` and `arm` it RECORDS — never by its file
// name — and compared with the same hash rule. Every recorded input moves what was measured (the
// prompts, what `pass` means, the arm itself), so there is no frozen suite to split off and no
// `incomplete`: any moved input reads `stale`.

export const MEASURED_RESULTS_DIR = join(RESULTS_DIR, 'bench')
const MEASURED_BENCH_DIR = join('.agents', 'aced', 'bench')

export interface MeasuredRecord {
	layer?: string
	suite?: string
	arm?: string
	createdAt?: string
	subject?: { kind?: string; from?: string }
	evaluated?: EvaluatedEntry[]
}

export interface MeasuredScan {
	forArm: Array<{ file: string; record: MeasuredRecord }>
	unreadable: string[]
}

/**
 * Keeps the measured records whose OWN `suite` and `arm` fields match. A file that parses but is
 * not a measured record — a compare record sitting beside them — is simply not a candidate.
 */
export function scanMeasured(files: string[], suite: string, arm: string, read: (f: string) => string): MeasuredScan {
	const forArm: MeasuredScan['forArm'] = []
	const unreadable: string[] = []
	for (const file of files) {
		let record: MeasuredRecord
		try {
			record = JSON.parse(read(file)) as MeasuredRecord
		} catch {
			unreadable.push(file)
			continue
		}
		if (record && record.layer === 'measured' && record.suite === suite && record.arm === arm)
			forArm.push({ file, record })
	}
	return { forArm, unreadable }
}

/** Newest by RECORDED `createdAt`, for the same reason `selectNewest` ignores file names. */
export function selectNewestMeasured(records: MeasuredScan['forArm']): MeasuredScan['forArm'][number] | null {
	let best: MeasuredScan['forArm'][number] | null = null
	for (const r of records) {
		const t = r.record.createdAt ?? ''
		if (!best || t > (best.record.createdAt ?? '')) best = r
	}
	return best
}

/**
 * The bench engine always records the suite's `tasks.json`, and records a `file` arm's source
 * whenever the arm reads it from a path. A set omitting either contradicts the record carrying it.
 */
export function measuredIncoherence(record: MeasuredRecord, suite: string): string | null {
	const paths = new Set((record.evaluated ?? []).map((e) => e.path))
	const tasks = join(MEASURED_BENCH_DIR, suite, 'tasks.json')
	if (!paths.has(tasks)) {
		return `the recorded provenance contradicts the record it accompanies: it carries no entry for ${tasks}`
	}
	const from = record.subject?.kind === 'file' ? record.subject.from : undefined
	if (from?.startsWith('path:')) {
		const source = from.slice(5)
		if (!paths.has(source)) {
			return `the recorded provenance omits the file arm's source: no entry for ${source}`
		}
	}
	return null
}

function measuredMain(repoRoot: string, suite: string, arm: string): number {
	process.stdout.write(`suite: ${suite}\narm: ${arm}\n`)

	const dir = join(repoRoot, MEASURED_RESULTS_DIR, suite)
	if (!existsSync(dir)) {
		report({ verdict: 'absent', reason: 'nothing is measured for this suite', mismatched: [], skipped: [] })
		return 1
	}

	const scan = scanMeasured(collectResultFiles(dir), suite, arm, (f) => readFileSync(f, 'utf8'))
	const skipped = scan.unreadable.map((f) => relative(repoRoot, f))
	const newest = selectNewestMeasured(scan.forArm)
	if (!newest) {
		report({
			verdict: 'absent',
			reason: 'no measured record is recorded for this arm',
			mismatched: [],
			skipped,
		})
		return 1
	}
	if (!newest.record.evaluated) {
		report({ verdict: 'absent', reason: 'the record carries no recorded provenance', mismatched: [], skipped })
		return 1
	}
	const bad = measuredIncoherence(newest.record, suite)
	if (bad) {
		report({ verdict: 'absent', reason: bad, mismatched: [], skipped })
		return 1
	}

	// No frozen suite: every entry is a subject input, so the verdict is `stale` or `current`.
	const decision = decideVerdict(newest.record, repoRoot, '', skipped)
	report(decision)
	return decision.verdict === 'current' ? 0 : 1
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function report(d: Decision): void {
	process.stdout.write(`verdict: ${d.verdict}\n`)
	process.stdout.write(`${d.reason}\n`)
	for (const s of d.skipped) process.stdout.write(`skipped (unreadable): ${s}\n`)
	for (const m of d.mismatched) process.stdout.write(`no longer matching: ${m}\n`)
}

export function main(argv: string[]): number {
	// Shared-hashing entry points. `run` calls these rather than reimplementing the rule.
	const hashFileIdx = argv.indexOf('--hash-file')
	if (hashFileIdx !== -1) {
		const p = argv[hashFileIdx + 1]
		if (!p) {
			console.error('✗ --hash-file needs a path')
			return 1
		}
		process.stdout.write(hashFile(resolve(p)) + '\n')
		return 0
	}
	const hashDirIdx = argv.indexOf('--hash-dir')
	if (hashDirIdx !== -1) {
		const p = argv[hashDirIdx + 1]
		if (!p) {
			console.error('✗ --hash-dir needs a path')
			return 1
		}
		process.stdout.write(hashDirListing(resolve(p)) + '\n')
		return 0
	}

	const suiteIdx = argv.indexOf('--suite')
	const armIdx = argv.indexOf('--arm')
	if (suiteIdx !== -1 || armIdx !== -1) {
		// Fail closed, as the --node path does: one option without the other emits no verdict.
		const suite = suiteIdx === -1 ? undefined : argv[suiteIdx + 1]
		const arm = armIdx === -1 ? undefined : argv[armIdx + 1]
		if (!suite || !arm) {
			console.error(
				`✗ a measured check needs both --suite <suite> and --arm <label>; missing ${suite ? '--arm' : '--suite'}; no verdict`,
			)
			return 1
		}
		const repoRoot = findRepoRoot(process.cwd())
		if (!repoRoot) {
			console.error('✗ no repository root above the working directory; no verdict')
			return 1
		}
		return measuredMain(repoRoot, suite, arm)
	}

	const nodeIdx = argv.indexOf('--node')
	const nodeArg = nodeIdx === -1 ? undefined : argv[nodeIdx + 1]
	if (!nodeArg) {
		console.error('✗ usage: check-freshness --node <node-dir> | --suite <suite> --arm <label>')
		return 1
	}
	const nodeDir = resolve(nodeArg)

	// Fail closed: no eval.md and no subject key each emit NO verdict. A guard that cannot decide
	// must not manufacture one — `absent` would read as "checked, nothing recorded".
	const evalPath = join(nodeDir, 'eval.md')
	if (!existsSync(evalPath)) {
		console.error(`✗ ${relative(process.cwd(), evalPath)}: no eval.md in the node directory; no verdict`)
		return 1
	}
	const subject = readSubject(readFileSync(evalPath, 'utf8'))
	if (!subject) {
		console.error(`✗ ${relative(process.cwd(), evalPath)}: eval.md carries no subject key; no verdict`)
		return 1
	}

	const repoRoot = findRepoRoot(nodeDir)
	if (!repoRoot) {
		console.error('✗ no repository root above the node directory; no verdict')
		return 1
	}

	process.stdout.write(`target: ${subject}\n`)

	const featureAbs = findFrozenFeature(nodeDir)
	const featureRel = featureAbs ? relative(repoRoot, featureAbs) : ''

	const resultsDir = join(repoRoot, RESULTS_DIR)
	if (!existsSync(resultsDir)) {
		report({ verdict: 'absent', reason: 'no result is recorded anywhere', mismatched: [], skipped: [] })
		return 1
	}

	const scan = scanResults(collectResultFiles(resultsDir), subject, (f) => readFileSync(f, 'utf8'))
	const skipped = scan.unreadable.map((f) => relative(repoRoot, f))

	if (scan.forTarget.length === 0) {
		report({
			verdict: 'absent',
			reason:
				skipped.length > 0
					? 'every result recorded for this target is unreadable'
					: 'no result is recorded for this target',
			mismatched: [],
			skipped,
		})
		return 1
	}

	const newest = selectNewest(scan.forTarget)!
	if (!newest.record.evaluated) {
		report({
			verdict: 'absent',
			reason: 'the result carries no recorded provenance',
			mismatched: [],
			skipped,
		})
		return 1
	}

	const bad = incoherence(newest.record, featureRel, subject)
	if (bad) {
		report({ verdict: 'absent', reason: bad, mismatched: [], skipped })
		return 1
	}

	const decision = decideVerdict(newest.record, repoRoot, featureRel, skipped)
	report(decision)
	return decision.verdict === 'current' ? 0 : 1
}

// `import.meta.main` is Node >=24.2 and `undefined` on this repo's >=22 floor, where the CLI would
// never run — printing nothing and exiting 0, which a caller keying on the exit code would read as
// `current`. `pathToFileURL` rather than a `file://` concat: `import.meta.url` percent-encodes, so
// the naive form mismatches on any install path holding a space and reproduces the same bug.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
