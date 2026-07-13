#!/usr/bin/env node
// collision-ladder — the finer-than-node ladder (issue #189, second bullet). A read-only, pairwise
// collision CLASSIFIER: given a KNOWN node-level collision between two missions (the mission-graph
// WAW-mutex already found it), descend a ladder of finer grains — file → region → semantic(scenario)
// — and stop at the first rung that classifies the clash HARD (must serialize) vs SOFT (can run in
// parallel, reconciled by rebase). Plus the shared-thin-file hard→soft downgrade: a file touched by
// many missions (router/barrel/registry) that would over-serialize gets the region/semantic descent
// to downgrade, and is flagged as an architectural smell. See
// .agents/specs/sdd/collision-ladder/README.md for the full contract.
//
// Architecture — pure derivation kept apart from IO, on purpose (touch-set-correction.mts's
// convention it mirrors):
//   - isFeature / isCode / hunksDisjoint / classifyFile / classify are PURE: they take and return
//     plain data — no fs/network access. Tests exercise these directly over CONSTRUCTED pairwise
//     touched-detail — never a live git diff or the live mission-graph store.
//   - readFileHunks / collectMissionTouch are the thin IO SEAM: readFileHunks shells out to
//     `git diff -U0` for a file's touched line-ranges (the new region source); collectMissionTouch
//     REUSES the sibling touch-set-correction's `collectChangedFiles` (which itself composes
//     `resolve-governances` for artifact-type and `gherkin-cli diff` for changed scenarios — never a
//     reimplemented differ) and layers the hunks on top. NOT unit-tested (network/binary/fs boundary).
//   - main() is a thin CLI: it classifies a CONSTRUCTED ClassifyInput read as JSON (--input) or one
//     sourced from two git ranges (--from-git), rendering TOON by default or `--format json`.
//
// This tool is READ-ONLY with respect to the mission graph: it never writes to it, never detects a
// collision (that is the mission-graph WAW-mutex's job — this runs only AFTER one is found), and
// never schedules (it returns a verdict; the scheduler consumes it). It descends a CODE collision to
// the SYMBOL rung — produced/consumed symbols classify it disjoint(soft) / write-write(hard,
// `symbol-waw`) / read-after-write(hard, `symbol-raw`); when the symbols cannot be inferred it stays
// hard, flagged `symbol-rung-deferred`. It does NOT do the ★ SSA-lowering doctrine (issue #189's
// third-bullet capstone: partitioning a change into missions, versioning a write-write into an ordered
// dependency) — that stays deferred. It descends only to DOWNGRADE a suspected false-hard —
// conservative-first, relax-on-evidence — never to raise a new collision.
//
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	collectChangedFiles,
	fileToNode,
	type ProjectLayout,
} from '../../touch-set-correction/scripts/touch-set-correction.mts'

// ── Types ──

/** An inclusive touched line-range within a file (the region rung's grain). */
export interface LineRange {
	start: number
	end: number
}

/** The produced (written) and consumed (read) symbol names a code file's diff yields — the symbol
 *  rung's grain. */
export interface SymbolSet {
	produced: string[]
	consumed: string[]
}

/** One changed file of one mission under the colliding node. `hunks: null` means the line-hunks
 *  were not recorded (disjointness cannot be proven — the region rung must not clear it). `[]` means
 *  recorded-but-empty. `changedScenarios` is meaningful only for a `.feature` (the semantic rung).
 *  `symbols` is meaningful only for code (the symbol rung): `null` or `undefined` (both treated
 *  identically — un-inferable) means the produced/consumed detail could not be extracted, so the
 *  symbol rung stays hard, flagged `symbol-rung-deferred`. Optional so existing constructed fixtures
 *  that predate the symbol rung stay valid. */
export interface FileTouch {
	path: string
	artifactType: string
	hunks: LineRange[] | null
	changedScenarios: string[]
	symbols?: SymbolSet | null
}

/** One mission's touched detail for the single colliding node. */
export interface MissionTouch {
	mission: string
	files: FileTouch[]
}

/** The classifier's whole input: the colliding node, the two missions' touched detail, an optional
 *  fleet-wide touching-mission degree per path (for shared-thin detection — defaults to the pair's
 *  2), and the shared-thin degree threshold (default 3). */
export interface ClassifyInput {
	node: string
	x: MissionTouch
	y: MissionTouch
	degrees?: Record<string, number>
	sharedThinThreshold?: number
}

export type Collision = 'hard' | 'soft'
export type Rung = 'file' | 'region' | 'semantic' | 'symbol' | 'node'
export type Confidence = 'high' | 'medium' | 'low'

/** The per-shared-file verdict — the atom the node rollup is folded from. */
export interface FileVerdict {
	path: string
	collision: Collision
	rung: Rung
	reason: string
	sharedThin: boolean
}

/** The node-level verdict — hard if ANY shared file is hard; the decisive rung + a confidence that
 *  decays down the ladder; the per-shared-file detail; the shared-thin smells; and the files whose
 *  downgrade is deferred to the ★ symbol rung. */
export interface LadderVerdict {
	node: string
	collision: Collision
	rung: Rung
	confidence: Confidence
	sharedFiles: FileVerdict[]
	smells: string[]
	deferrals: string[]
}

// ── Pure derivations ──

const DEFAULT_SHARED_THIN_THRESHOLD = 3

/** The scenario-rung gate is STRUCTURAL — the `.feature` extension — never the resolved
 *  artifact-type (matches the sibling touch-set-correction's isFeature). */
export function isFeature(path: string): boolean {
	return path.endsWith('.feature')
}

const CODE_EXTENSIONS = [
	'.mts',
	'.ts',
	'.tsx',
	'.cts',
	'.mjs',
	'.js',
	'.jsx',
	'.cjs',
	'.py',
	'.go',
	'.rs',
	'.java',
	'.rb',
	'.c',
	'.h',
	'.cpp',
	'.hpp',
	'.cs',
	'.swift',
	'.kt',
	'.sh',
]

/** A file whose semantic-rung anchor is a SYMBOL (code) rather than a scenario or prose section.
 *  Its downgrade needs symbol-level analysis — the ★ deferred capstone — so an overlapping-region
 *  code file stays hard. Detected by extension (structural, like isFeature); never a `.feature`. */
export function isCode(path: string): boolean {
	if (isFeature(path)) return false
	return CODE_EXTENSIONS.some((ext) => path.endsWith(ext))
}

/** Two hunk sets are disjoint when no range in one overlaps any range in the other. A `null` (unknown)
 *  hunk set is NOT disjoint from anything — disjointness cannot be proven, so the region rung must not
 *  clear it. Two inclusive ranges [a,b] and [c,d] overlap iff a ≤ d and c ≤ b. */
export function hunksDisjoint(a: LineRange[] | null, b: LineRange[] | null): boolean {
	if (a === null || b === null) return false
	for (const ra of a) {
		for (const rb of b) {
			if (ra.start <= rb.end && rb.start <= ra.end) return false
		}
	}
	return true
}

const RUNG_CONFIDENCE: Record<Rung, Confidence> = {
	file: 'high',
	region: 'medium',
	semantic: 'low',
	symbol: 'low',
	node: 'low',
}

const RUNG_DEPTH: Record<Rung, number> = { file: 1, region: 2, semantic: 3, symbol: 4, node: 5 }
const CONFIDENCE_RANK: Record<Confidence, number> = { low: 1, medium: 2, high: 3 }

/**
 * classifyFile — the ladder descent for ONE shared file (present in both missions). Region first: if
 * both sides' hunks are known and disjoint ⇒ SOFT at `region`. Else descend to the semantic rung,
 * split by artifact-type (keyed structurally off the path):
 *   - `.feature` (behavioral prose) ⇒ the SCENARIO: different scenarios ⇒ SOFT, the same scenario ⇒ HARD.
 *   - code ⇒ descend further to the SYMBOL rung (see `classifySymbols`).
 *   - non-behavioral prose (no suite to anchor) ⇒ do NOT descend, stay node-serial: HARD, reason `no-anchor`.
 * The shared-thin flag rides along (degree ≥ threshold) — the descent above IS its hard→soft downgrade.
 */
export function classifyFile(fx: FileTouch, fy: FileTouch, degree: number, threshold: number): FileVerdict {
	const path = fx.path
	const sharedThin = degree >= threshold
	const base = { path, sharedThin }

	// region rung — textual, artifact-neutral
	if (hunksDisjoint(fx.hunks, fy.hunks)) {
		return { ...base, collision: 'soft', rung: 'region', reason: 'disjoint-hunks' }
	}

	// semantic rung — artifact-type-specific
	if (isFeature(path)) {
		const ys = new Set(fy.changedScenarios)
		const shared = fx.changedScenarios.some((s) => ys.has(s))
		return shared
			? { ...base, collision: 'hard', rung: 'semantic', reason: 'same-scenario' }
			: { ...base, collision: 'soft', rung: 'semantic', reason: 'disjoint-scenarios' }
	}
	if (isCode(path)) {
		return classifySymbols(fx, fy, base)
	}
	return { ...base, collision: 'hard', rung: 'node', reason: 'no-anchor' }
}

/**
 * classifySymbols — the symbol rung, a code collision's finest grain (★ #189, first half). Compares
 * each side's produced (written) and consumed (read) symbol names, in precedence order:
 *   1. either side's `symbols` is `null`/`undefined` (un-inferable) ⇒ HARD, `symbol-rung-deferred`
 *      (conservative-first — a parse gap must never relax a real clash).
 *   2. the two `produced` sets intersect (both write the same symbol) ⇒ HARD, `symbol-waw`.
 *   3. one side's `consumed` intersects the other side's `produced` (either direction) ⇒ HARD,
 *      `symbol-raw`.
 *   4. no symbol in common ⇒ SOFT, `disjoint-symbols`.
 * Pure — no fs/network access; deterministic.
 */
export function classifySymbols(
	fx: FileTouch,
	fy: FileTouch,
	base: { path: string; sharedThin: boolean },
): FileVerdict {
	if (fx.symbols === null || fx.symbols === undefined || fy.symbols === null || fy.symbols === undefined) {
		return { ...base, collision: 'hard', rung: 'symbol', reason: 'symbol-rung-deferred' }
	}
	const xProduced = new Set(fx.symbols.produced)
	const yProduced = new Set(fy.symbols.produced)
	if (fx.symbols.produced.some((s) => yProduced.has(s))) {
		return { ...base, collision: 'hard', rung: 'symbol', reason: 'symbol-waw' }
	}
	const rawClash =
		fx.symbols.consumed.some((s) => yProduced.has(s)) || fy.symbols.consumed.some((s) => xProduced.has(s))
	if (rawClash) {
		return { ...base, collision: 'hard', rung: 'symbol', reason: 'symbol-raw' }
	}
	return { ...base, collision: 'soft', rung: 'symbol', reason: 'disjoint-symbols' }
}

function bySharedThenPath(a: FileVerdict, b: FileVerdict): number {
	return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
}

/**
 * classify — the whole pure ladder. Recovers the SHARED files (same path in both missions' detail),
 * classifies each, and folds the node rollup: the node collision is HARD if ANY shared file is hard,
 * else SOFT. When no file is shared, the file rung already clears it (soft, high confidence). The
 * decisive rung is the deepest rung among the files that DECIDE the verdict (the hard files when hard,
 * the soft-cleared files when soft), and the confidence is that rung's — so it decays down the ladder.
 * Deterministic + stably ordered for fixed inputs; no fs/network access of its own.
 */
export function classify(input: ClassifyInput): LadderVerdict {
	const threshold = input.sharedThinThreshold ?? DEFAULT_SHARED_THIN_THRESHOLD
	const degrees = input.degrees ?? {}
	const xByPath = new Map(input.x.files.map((f) => [f.path, f]))
	const sharedPaths = input.y.files.filter((f) => xByPath.has(f.path)).map((f) => f.path)
	const uniqueSharedPaths = [...new Set(sharedPaths)].sort()

	// file rung — disjoint files never really collide
	if (uniqueSharedPaths.length === 0) {
		return {
			node: input.node,
			collision: 'soft',
			rung: 'file',
			confidence: 'high',
			sharedFiles: [],
			smells: [],
			deferrals: [],
		}
	}

	const yByPath = new Map(input.y.files.map((f) => [f.path, f]))
	const sharedFiles: FileVerdict[] = uniqueSharedPaths
		.map((path) => {
			const fx = xByPath.get(path) as FileTouch
			const fy = yByPath.get(path) as FileTouch
			const degree = degrees[path] ?? 2
			return classifyFile(fx, fy, degree, threshold)
		})
		.sort(bySharedThenPath)

	const collision: Collision = sharedFiles.some((f) => f.collision === 'hard') ? 'hard' : 'soft'
	const deciding = sharedFiles.filter((f) => f.collision === collision)
	const decisive = deciding.reduce(
		(deepest, f) => (RUNG_DEPTH[f.rung] > RUNG_DEPTH[deepest.rung] ? f : deepest),
		deciding[0],
	)

	const smells = sharedFiles
		.filter((f) => f.sharedThin)
		.map((f) => f.path)
		.sort()
	const deferrals = sharedFiles
		.filter((f) => f.reason === 'symbol-rung-deferred')
		.map((f) => f.path)
		.sort()

	return {
		node: input.node,
		collision,
		rung: decisive.rung,
		confidence: RUNG_CONFIDENCE[decisive.rung],
		sharedFiles,
		smells,
		deferrals,
	}
}

/** Confidence ordering helper (exported for callers comparing two verdicts, e.g. the confidence-decay
 *  scenario): higher rank = more trustworthy. */
export function confidenceRank(c: Confidence): number {
	return CONFIDENCE_RANK[c]
}

// ── IO seam (thin — network/binary/fs boundary; not unit-tested, mirrors touch-set-correction.mts) ──

/** A file's touched line-ranges of `base..head` via `git diff -U0` (zero context, so each hunk's
 *  `+A,B` header is exactly the changed lines). Returns the added-side ranges (the new-file lines the
 *  mission wrote). On any git failure (absent binary, bad refs, not a repo) returns null (unknown —
 *  the region rung will not clear it). */
export function readFileHunks(base: string, head: string, path: string, cwd: string): LineRange[] | null {
	let out: string
	try {
		out = execFileSync('git', ['diff', '-U0', `${base}..${head}`, '--', path], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
	} catch {
		return null
	}
	const ranges: LineRange[] = []
	for (const line of out.split('\n')) {
		// @@ -a,b +c,d @@  — the +c,d side is the added lines; d defaults to 1 when omitted
		const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
		if (!m) continue
		const start = Number(m[1])
		const count = m[2] === undefined ? 1 : Number(m[2])
		if (count === 0) continue // a pure deletion touches no new-file line
		ranges.push({ start, end: start + count - 1 })
	}
	return ranges
}

// TS/JS-family extensions the symbol extractor attempts — a reasonable heuristic subset of
// CODE_EXTENSIONS. Any other code language (.py .go .rs etc.) always defers (returns null).
const JS_TS_EXTENSIONS = ['.mts', '.ts', '.tsx', '.cts', '.mjs', '.js', '.jsx', '.cjs']

const JS_KEYWORDS = new Set([
	'const',
	'let',
	'var',
	'function',
	'class',
	'return',
	'if',
	'else',
	'for',
	'while',
	'do',
	'switch',
	'case',
	'break',
	'continue',
	'default',
	'new',
	'this',
	'super',
	'import',
	'export',
	'from',
	'as',
	'async',
	'await',
	'try',
	'catch',
	'finally',
	'throw',
	'typeof',
	'instanceof',
	'in',
	'of',
	'null',
	'undefined',
	'true',
	'false',
	'void',
	'delete',
	'yield',
	'extends',
	'implements',
	'interface',
	'type',
	'enum',
	'namespace',
	'public',
	'private',
	'protected',
	'readonly',
	'static',
	'get',
	'set',
])

const IDENTIFIER_RE = /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g

/** Best-effort, CONSERVATIVE symbol extraction for a TS/JS-family code file's `base..head` diff (the
 *  symbol rung's thin IO seam, mirroring `readFileHunks`). Shells `git diff <base>..<head> -- <path>`;
 *  from ADDED lines (`+`) derives `produced` (declared names — `function NAME`, `class NAME`,
 *  `(export )?(const|let|var) NAME`, a method/assignment head `NAME(` or `NAME =`, `export function
 *  NAME`) and `consumed` (other referenced identifiers minus the produced set and minus JS keywords).
 *  Only attempted for TS/JS-family extensions — any other code language, or any failure, returns
 *  `null` (defer — a parse gap must never relax a real clash). Untested (fs/binary boundary). */
export function extractSymbols(base: string, head: string, path: string, cwd: string): SymbolSet | null {
	if (!JS_TS_EXTENSIONS.some((ext) => path.endsWith(ext))) return null
	let out: string
	try {
		out = execFileSync('git', ['diff', `${base}..${head}`, '--', path], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
	} catch {
		return null
	}

	const produced = new Set<string>()
	const consumed = new Set<string>()
	const declPatterns = [
		/^\s*export\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*function\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*export\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
		/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/, // method/function-call head
		/^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=[^=]/, // plain assignment head
	]

	let sawAddedLine = false
	for (const rawLine of out.split('\n')) {
		if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) continue
		const line = rawLine.slice(1)
		if (line.trim() === '') continue
		sawAddedLine = true

		let declared: string | null = null
		for (const re of declPatterns) {
			const m = re.exec(line)
			if (m?.[1]) {
				declared = m[1]
				break
			}
		}
		if (declared) produced.add(declared)

		const ids = line.match(IDENTIFIER_RE) ?? []
		for (const id of ids) {
			if (id === declared) continue
			if (JS_KEYWORDS.has(id)) continue
			if (/^\d/.test(id)) continue
			consumed.add(id)
		}
	}

	if (!sawAddedLine) return null
	for (const p of produced) consumed.delete(p)
	if (produced.size === 0 && consumed.size === 0) return null

	return { produced: [...produced].sort(), consumed: [...consumed].sort() }
}

/** Sources one mission's MissionTouch for the colliding node from a `base..head` range: REUSES the
 *  sibling touch-set-correction's `collectChangedFiles` (git diff + resolve-governances + gherkin-cli
 *  diff) for each file's artifact-type + changed scenarios, keeps only the files that map to `node`
 *  (via the shared `fileToNode`), and layers the region hunks + (for code) produced/consumed symbols
 *  on top. Thin IO — not unit-tested. */
export function collectMissionTouch(
	mission: string,
	node: string,
	base: string,
	head: string,
	root: string,
	cwd: string,
	layouts: ProjectLayout[],
): MissionTouch {
	const changed = collectChangedFiles(base, head, root, cwd)
	const files: FileTouch[] = changed
		.filter((f) => fileToNode(f.path, layouts) === node)
		.map((f) => ({
			path: f.path,
			artifactType: f.artifactType,
			hunks: readFileHunks(base, head, f.path, cwd),
			changedScenarios: f.changedScenarios,
			symbols: isCode(f.path) ? extractSymbols(base, head, f.path, cwd) : null,
		}))
	return { mission, files }
}

// ── Render (TOON — the token-efficient tabular form the repo's other sdd engines emit) ──

function toonQuote(v: string): string {
	if (v === '' || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function renderVerdictToon(v: LadderVerdict): string {
	const lines: string[] = []
	lines.push(`node: ${toonQuote(v.node)}`)
	lines.push(`collision: ${v.collision}`)
	lines.push(`rung: ${v.rung}`)
	lines.push(`confidence: ${v.confidence}`)
	lines.push(`sharedFiles[${v.sharedFiles.length}]{path,collision,rung,reason,sharedThin}:`)
	for (const f of v.sharedFiles) {
		lines.push(`  ${toonQuote(f.path)},${f.collision},${f.rung},${f.reason},${f.sharedThin}`)
	}
	lines.push(`smells[${v.smells.length}]: ${v.smells.map(toonQuote).join(';')}`)
	lines.push(`deferrals[${v.deferrals.length}]: ${v.deferrals.map(toonQuote).join(';')}`)
	return lines.join('\n')
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

function allFlags(argv: string[], name: string): string[] {
	const out: string[] = []
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === name && argv[i + 1] !== undefined) out.push(argv[i + 1])
	}
	return out
}

function splitCsv(v: string | undefined): string[] {
	if (v === undefined || v === '') return []
	return v
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

/** Parses one `--layout '<project>:<root1>,<root2>'` flag value into a ProjectLayout (same grammar as
 *  the sibling touch-set-correction CLI). */
export function parseLayoutFlag(value: string): ProjectLayout | null {
	const idx = value.indexOf(':')
	if (idx === -1) return null
	const project = value.slice(0, idx).trim()
	const roots = splitCsv(value.slice(idx + 1))
	if (project === '' || roots.length === 0) return null
	return { project, roots }
}

function readStdin(): string {
	try {
		return execFileSync('cat', [], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'ignore'] })
	} catch {
		return ''
	}
}

const HERE = dirname(fileURLToPath(import.meta.url))
const DISCOVER_SPECS_PATH = join(HERE, '..', '..', 'discover-specs', 'scripts', 'discover-specs.mts')

interface DiscoveredSpec {
	path: string
	name: string
	projectPath: string
}

/** Best-effort project-layout discovery via `discover-specs` (same convention as the sibling). Used
 *  only by --from-git; --layout overrides it. On any failure returns []. */
function discoverLayouts(root: string, cwd: string): ProjectLayout[] {
	try {
		const out = execFileSync('node', [DISCOVER_SPECS_PATH, '--root', root, '--format', 'json'], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		const specs = JSON.parse(out) as DiscoveredSpec[]
		return specs.map((s) => {
			const roots = [s.path]
			const projectPath = s.projectPath ?? ''
			const pluginsMatch = /^plugins\/([^/]+)$/.exec(projectPath)
			const packagesMatch = /^packages\/([^/]+)$/.exec(projectPath)
			if (pluginsMatch) roots.push(`plugins/${pluginsMatch[1]}/skills`)
			else if (packagesMatch) roots.push(`packages/${packagesMatch[1]}/src`)
			else if (projectPath) roots.push(projectPath)
			return { project: s.name, roots }
		})
	} catch {
		return []
	}
}

export function main(argv: string[]): number {
	const format = flag(argv, '--format') === 'json' ? 'json' : 'toon'
	let input: ClassifyInput

	const fromGit = argv.includes('--from-git')
	if (fromGit) {
		const node = flag(argv, '--node')
		const xRange = flag(argv, '--x')
		const yRange = flag(argv, '--y')
		if (node === undefined || xRange === undefined || yRange === undefined) {
			process.stderr.write('collision-ladder: --from-git needs --node <id> --x <base..head> --y <base..head>\n')
			return 1
		}
		const root = flag(argv, '--root') ?? '.'
		const [xb, xh] = xRange.split('..')
		const [yb, yh] = yRange.split('..')
		const layoutFlags = allFlags(argv, '--layout')
		const layouts =
			layoutFlags.length > 0
				? layoutFlags.map(parseLayoutFlag).filter((l): l is ProjectLayout => l !== null)
				: discoverLayouts(root, root)
		const x = collectMissionTouch(xRange, node, xb, xh ?? 'HEAD', root, root, layouts)
		const y = collectMissionTouch(yRange, node, yb, yh ?? 'HEAD', root, root, layouts)
		const threshold = flag(argv, '--shared-thin-threshold')
		input = { node, x, y, sharedThinThreshold: threshold ? Number(threshold) : undefined }
	} else {
		const inputSrc = flag(argv, '--input')
		if (inputSrc === undefined) {
			process.stderr.write('collision-ladder: --input <file|-> (a ClassifyInput JSON) or --from-git is required\n')
			return 1
		}
		let raw: string
		try {
			raw =
				inputSrc === '-'
					? readStdin()
					: execFileSync('cat', [inputSrc], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
			input = JSON.parse(raw) as ClassifyInput
		} catch {
			process.stderr.write(`collision-ladder: could not read/parse ClassifyInput from ${inputSrc}\n`)
			return 1
		}
	}

	const verdict = classify(input)
	process.stdout.write(`${format === 'json' ? JSON.stringify(verdict, null, 2) : renderVerdictToon(verdict)}\n`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
