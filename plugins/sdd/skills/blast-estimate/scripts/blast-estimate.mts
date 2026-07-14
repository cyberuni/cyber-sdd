#!/usr/bin/env node
// blast-estimate — the concrete engine for blast-estimate's derivation: compute a Mission's BLAST
// (low/medium/high) from its touch-set + the project corpus instead of trusting the hand-typed guess,
// then line the computed level up against the declared one (agrees / under-called / over-called). See
// .agents/specs/sdd/blast-estimate/README.md for the full contract this mirrors.
//
// Three inputs, each measured — never inferred — from the corpus:
//   - count       — how many of the touch-set's areas resolve to a known work area
//   - centrality  — dependency fan-in: how many OTHER work areas' files reference a touched one
//   - sensitivity — whether a touched area is MARKED in the opt-in `.agents/sdd/sensitive-paths.toml`
//     (absent file = no area sensitive, not an error; a file that fails to parse fails LOUD — the
//     estimate computes no level rather than silently reading it as "nothing marked")
//
// Two exclusions are structural, not just documented: this engine takes no "breaking"/compatibility
// input at all (that dimension cannot leak in), and centrality is measured fan-in only — a work area's
// NAME (e.g. "public") never enters the score.
//
// A work area not found in the corpus is SURFACED (`unresolved`), never silently dropped. An empty
// touch-set — or one that resolves to zero known areas — computes `unknown`, never `low` ("nothing
// touched is not evidence of low reach").
//
// Read-only: only readdirSync/readFileSync/statSync ever run here. It RETURNS the estimate; the
// mission-graph's single writer records it. No dependencies (the repo's node->=22 / no-deps
// convention). Pure functions are exported for node:test; running the file directly drives the CLI.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', '.agents', 'dist', '.turbo', '.next', 'coverage'])
const SENSITIVE_PATHS_FILE = '.agents/sdd/sensitive-paths.toml'

export type BlastLevel = 'low' | 'medium' | 'high'
export type DeclaredBlast = BlastLevel | 'unknown'

// ── Corpus scan — work-area discovery (capability-first: <project>/<capability>/…, mirrors
//    touch-set-correction's fileToNode) ──

/** Every file under `corpusRoot`, grouped by its owning work area (`project/capability`). A file
 *  needs at least two path segments below the root to name a work area; anything shallower (loose
 *  files at the corpus root) is not attributed to any area. */
export function discoverWorkAreas(corpusRoot: string): Map<string, string[]> {
	const byNode = new Map<string, string[]>()
	walk(corpusRoot, corpusRoot, byNode)
	return byNode
}

function walk(dir: string, root: string, out: Map<string, string[]>): void {
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return
	}
	for (const entry of entries) {
		if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, root, out)
			continue
		}
		const rel = full.slice(root.length + 1).replace(/\\/g, '/')
		const segs = rel.split('/')
		if (segs.length < 3) continue // needs project/capability/file
		const node = `${segs[0]}/${segs[1]}`
		const files = out.get(node)
		if (files) files.push(full)
		else out.set(node, [full])
	}
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Centrality (dependency fan-in) of `nodeId`: the count of OTHER work areas at least one of whose
 *  files references `nodeId` as a literal, word-bounded string. Reference-by-mention, not by name —
 *  a work area's own name never counts toward its own fan-in. */
export function computeFanIn(nodeId: string, byNode: Map<string, string[]>): number {
	const pattern = new RegExp(`(^|[^\\w/-])${escapeRegExp(nodeId)}($|[^\\w/-])`)
	let count = 0
	for (const [other, files] of byNode) {
		if (other === nodeId) continue
		const referenced = files.some((f) => {
			try {
				return pattern.test(readFileSync(f, 'utf8'))
			} catch {
				return false
			}
		})
		if (referenced) count++
	}
	return count
}

// ── Sensitivity — declared, never inferred ──

/** Parses the minimal `.agents/sdd/sensitive-paths.toml` shape: a single top-level
 *  `sensitive = [ "id", ... ]` string array (mirrors manage-spec-anchors' `anchors = [...]`). Throws
 *  on anything else — a malformed file must fail loud, never read as "nothing marked". */
export function parseSensitivePaths(text: string): string[] {
	const trimmed = text.trim()
	if (trimmed === '') return []
	const m = /^sensitive\s*=\s*\[([\s\S]*)\]\s*$/.exec(trimmed)
	if (!m) throw new Error('expected a top-level `sensitive = [...]` array')
	const out: string[] = []
	for (const rawEntry of m[1].split(',')) {
		const entry = rawEntry.trim()
		if (entry === '') continue
		const sm = /^"([^"]*)"$|^'([^']*)'$/.exec(entry)
		if (!sm) throw new Error(`malformed entry: ${entry}`)
		out.push(sm[1] ?? sm[2] ?? '')
	}
	return out
}

export type SensitiveResult = { ok: true; marked: string[] } | { ok: false; error: string }

/** Reads the opt-in sensitive-paths file. **Absent** (ENOENT) = `{ ok: true, marked: [] }` — no area
 *  is sensitive, and that is NOT an error. Anything else — present-but-unparseable, unreadable
 *  (permissions), or not a regular file — = `{ ok: false, error }`, and the caller computes no level.
 *
 *  ONLY ENOENT is benign. A bare `catch` here would swallow EACCES and a directory-at-the-path into
 *  "no markings", which fails in the DANGEROUS direction: the estimate silently UNDER-calls blast on
 *  exactly the areas a project took the trouble to mark. A read that cannot classify must fail loud,
 *  never default to the safe-looking answer — the same duty the absent-vs-unparseable scenarios draw:
 *  an unreadable marking is not evidence of no markings. */
export function readSensitivePaths(corpusRoot: string): SensitiveResult {
	const file = join(corpusRoot, SENSITIVE_PATHS_FILE)
	let text: string
	try {
		if (!statSync(file).isFile()) {
			return { ok: false, error: `${SENSITIVE_PATHS_FILE} is not a regular file` }
		}
		text = readFileSync(file, 'utf8')
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ok: true, marked: [] }
		return { ok: false, error: `${SENSITIVE_PATHS_FILE} is unreadable: ${(err as Error).message}` }
	}
	try {
		return { ok: true, marked: parseSensitivePaths(text) }
	} catch (err) {
		return { ok: false, error: `${SENSITIVE_PATHS_FILE} is unreadable: ${(err as Error).message}` }
	}
}

// ── The computation — count × centrality × sensitivity ──
//
// The rubric fixes the three inputs and their ordering properties; the exact arithmetic is this
// engine's choice (deliberately unpinned — see the node README). Buckets, not a smooth curve, keep
// the mapping easy to explain and to hold constant under review:
//   - breadth     max(countScore, coverageScore) — how much of the project is disturbed, measured
//     two ways, whichever says MORE:
//       * countScore    1 → 0; 2-3 → 1; 4+ → 3 (absolute reach: touching many areas is broad even
//         in a large project the touch-set nowhere near covers)
//       * coverageScore 3 iff the touch-set covers EVERY work area of a touched project that has
//         >= 2 work areas, else 0 (relative reach: a 3-area project touched entirely IS
//         project-wide — the barrier agreement holds at every project size, not just 4+)
//   - centrality  0 → 0; 1-2 → 1; 3+ → 2
//   - sensitivity any touched area marked → +2 (a single marking is enough to move the level)
// score >= 3 → high; score >= 1 → medium; score 0 → low.
//
// The `>= 2 work areas` guard on coverage is load-bearing, not a nicety. In a corpus holding exactly
// ONE work area, "a single peripheral work area" (→ low) and "a touch-set reaching across every work
// area of its project" (→ high) describe the SAME input with opposite Thens. The suite's two
// scenarios are only disjoint because a "corpus" has more than one work area, so coverage must not
// fire on a 1-area project — there, only absolute count speaks.

function countScore(n: number): number {
	if (n <= 1) return 0
	if (n <= 3) return 1
	return 3
}

const COVERAGE_SCORE = 3

function centralityScore(fanIn: number): number {
	if (fanIn <= 0) return 0
	if (fanIn <= 2) return 1
	return 2
}

const SENSITIVITY_SCORE = 2

export function levelFromScore(score: number): BlastLevel {
	if (score >= 3) return 'high'
	if (score >= 1) return 'medium'
	return 'low'
}

export interface Reasons {
	count: number
	maxFanIn: number
	sensitiveAreas: string[]
	/** Every touched project the touch-set covers ENTIRELY (and which has >= 2 work areas) — the
	 *  coverage half of breadth, named so a `high` on reach alone is explainable. */
	projectWide: string[]
}

/** The project a work area belongs to — the first segment of its `project/capability` id. */
function projectOf(nodeId: string): string {
	return nodeId.split('/')[0]
}

/**
 * projectsCoveredEntirely — the touched projects whose EVERY work area is in the touch-set, among
 * projects holding >= 2 work areas. Coverage is relative reach: it asks what fraction of a project
 * is disturbed, where `count` only asks how many areas in absolute terms. A project with a single
 * work area never qualifies (see the guard note above).
 */
export function projectsCoveredEntirely(resolved: string[], byNode: Map<string, string[]>): string[] {
	const areasByProject = new Map<string, string[]>()
	for (const node of byNode.keys()) {
		const p = projectOf(node)
		const areas = areasByProject.get(p)
		if (areas) areas.push(node)
		else areasByProject.set(p, [node])
	}
	const resolvedSet = new Set(resolved)
	const covered: string[] = []
	for (const project of new Set(resolved.map(projectOf))) {
		const areas = areasByProject.get(project) ?? []
		if (areas.length < 2) continue // a 1-area project is never "project-wide" — see the guard note
		if (areas.every((a) => resolvedSet.has(a))) covered.push(project)
	}
	return covered.sort()
}

/** The pure scoring step, once `count`/`maxFanIn`/`sensitiveAreas`/`projectWide` are known. Exported
 *  so the ordering-property scenarios (hub-vs-leaf, marked-vs-unmarked) can be driven directly. */
export function scoreBlast(
	count: number,
	maxFanIn: number,
	sensitiveAreas: string[],
	projectWide: string[] = [],
): { level: BlastLevel; reasons: Reasons } {
	const breadth = Math.max(countScore(count), projectWide.length > 0 ? COVERAGE_SCORE : 0)
	const score = breadth + centralityScore(maxFanIn) + (sensitiveAreas.length > 0 ? SENSITIVITY_SCORE : 0)
	return { level: levelFromScore(score), reasons: { count, maxFanIn, sensitiveAreas, projectWide } }
}

// ── The line-up — declared against computed ──

export type LineUpOutcome = 'agrees' | 'under-called' | 'over-called' | 'no-declared'

export interface LineUp {
	outcome: LineUpOutcome
	computed: BlastLevel
	declared?: BlastLevel
}

const ORDER: BlastLevel[] = ['low', 'medium', 'high']

/** Lines the computed level up against the hand-typed declared one. An absent or `unknown` declared
 *  blast is not an error — it is `no-declared`, and the computed level still stands on its own. */
export function lineUp(computed: BlastLevel, declared?: DeclaredBlast): LineUp {
	if (declared === undefined || declared === 'unknown') return { outcome: 'no-declared', computed }
	const di = ORDER.indexOf(declared)
	const ci = ORDER.indexOf(computed)
	if (di === ci) return { outcome: 'agrees', computed, declared }
	if (di < ci) return { outcome: 'under-called', computed, declared }
	return { outcome: 'over-called', computed, declared }
}

// ── The whole estimate — pure once handed a corpus scan ──

export interface EstimateResult {
	touchSet: string[]
	resolved: string[]
	unresolved: string[]
	computed: BlastLevel | 'unknown' | null
	reasons: Reasons | null
	lineUp: LineUp | null
	error?: string
}

/**
 * estimateBlast — the whole derivation. Resolves the touch-set against the corpus's known work
 * areas (unresolved areas are surfaced, never dropped), reads the opt-in sensitive-paths file
 * (fails loud on a malformed one — computed/reasons/lineUp all come back null, `error` names why),
 * and — when at least one area resolved — scores count × centrality × sensitivity and lines the
 * result up against `declared`. A touch-set that resolves to zero known areas (including the empty
 * touch-set) computes `unknown`: nothing touched is not evidence of low reach.
 */
export function estimateBlast(touchSet: string[], corpusRoot: string, declared?: DeclaredBlast): EstimateResult {
	const byNode = discoverWorkAreas(corpusRoot)
	const known = new Set(byNode.keys())
	const resolved = touchSet.filter((a) => known.has(a))
	const unresolved = touchSet.filter((a) => !known.has(a))

	const sensitive = readSensitivePaths(corpusRoot)
	if (!sensitive.ok) {
		return { touchSet, resolved, unresolved, computed: null, reasons: null, lineUp: null, error: sensitive.error }
	}

	if (resolved.length === 0) {
		return {
			touchSet,
			resolved,
			unresolved,
			computed: 'unknown',
			reasons: { count: 0, maxFanIn: 0, sensitiveAreas: [], projectWide: [] },
			lineUp: null,
		}
	}

	const markedSet = new Set(sensitive.marked)
	const fanIns = resolved.map((a) => computeFanIn(a, byNode))
	const maxFanIn = Math.max(...fanIns)
	const sensitiveAreas = resolved.filter((a) => markedSet.has(a))
	const projectWide = projectsCoveredEntirely(resolved, byNode)
	const { level, reasons } = scoreBlast(resolved.length, maxFanIn, sensitiveAreas, projectWide)

	return { touchSet, resolved, unresolved, computed: level, reasons, lineUp: lineUp(level, declared) }
}

// ── Render (TOON — the token-efficient tabular form the repo's other sdd engines emit) ──

function toonQuote(v: string): string {
	if (v === '' || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function renderResultToon(r: EstimateResult): string {
	if (r.error) {
		return [
			`blast-estimate: error="${r.error}"`,
			`unresolved[${r.unresolved.length}]: ${r.unresolved.map(toonQuote).join(';')}`,
		].join('\n')
	}
	const lines: string[] = []
	const lu = r.lineUp
	const lineUpPart = lu
		? lu.outcome === 'no-declared'
			? 'lineup=no-declared'
			: `lineup=${lu.outcome}(declared=${lu.declared})`
		: 'lineup=n/a'
	lines.push(`blast-estimate: computed=${r.computed} ${lineUpPart}`)
	if (r.reasons) {
		lines.push(
			`reasons: count=${r.reasons.count} maxFanIn=${r.reasons.maxFanIn} sensitiveAreas=[${r.reasons.sensitiveAreas.join(';')}] projectWide=[${r.reasons.projectWide.join(';')}]`,
		)
	}
	lines.push(`resolved[${r.resolved.length}]: ${r.resolved.map(toonQuote).join(';')}`)
	lines.push(`unresolved[${r.unresolved.length}]: ${r.unresolved.map(toonQuote).join(';')}`)
	return lines.join('\n')
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

function splitCsv(v: string | undefined): string[] {
	if (v === undefined || v === '') return []
	return v
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const touchSet = splitCsv(flag(argv, '--touch-set'))
	const declaredRaw = flag(argv, '--declared')
	const declared = declaredRaw === undefined ? undefined : (declaredRaw as DeclaredBlast)
	const format = flag(argv, '--format') === 'json' ? 'json' : 'toon'

	const result = estimateBlast(touchSet, root, declared)

	process.stdout.write(`${format === 'json' ? JSON.stringify(result, null, 2) : renderResultToon(result)}\n`)
	return result.error ? 1 : 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
