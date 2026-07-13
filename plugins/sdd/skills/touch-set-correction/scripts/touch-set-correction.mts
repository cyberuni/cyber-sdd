#!/usr/bin/env node
// touch-set-correction — a post-hoc, read-only reconciliation of a Mission's DECLARED touch-set
// (the pre-work guess used to keep the mission-graph's WAW frontier apart) against its ACTUAL
// touch-set (recovered from `git diff base..head`). It composes three tools — `git diff` (changed
// files), `resolve-governances` (each file's artifact-type, best-effort), and `gherkin-cli diff`
// (a touched .feature's changed scenarios) — into one three-way split (confirmed / missed /
// over-declared) plus the corrected touch-set (= the actual touched set). See
// .agents/specs/sdd/touch-set-correction/README.md for the full contract.
//
// Architecture — pure derivation kept apart from IO, on purpose (mission-graph.mts's convention):
//   - isFeature / fileToNode / reconcile / assembleCorrection are PURE: they take and return plain
//     data — no fs/network access. Tests exercise these directly over CONSTRUCTED fixtures — never
//     a live git diff or the live mission-graph store.
//   - readChangedFiles / resolveArtifactType / changedScenarios / collectChangedFiles /
//     discoverLayouts are the thin IO SEAM: they shell out to `git`, `resolve-governances.mts`, and
//     `npx gherkin-cli@0.0.1 diff` (the pinned differ classify-edit-class.mts also uses — this tool
//     never reimplements a differ). NOT unit-tested (network/binary/fs boundary) — the tested logic
//     is everything downstream of the file list.
//   - main() is a thin CLI: argv -> collectChangedFiles + assembleCorrection, rendering TOON by
//     default or `--format json`.
//
// This tool is READ-ONLY with respect to the mission graph: it never writes to it. The graph's
// single writer appends the corrected touch-set at Mission retirement (deferred, F3). It also does
// NOT classify a collision hard/soft, run the finer-than-node ladder, descend to region/hunk tier,
// or do SSA lowering (all deferred, issue #189 remainder).
//
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Types ──

export interface ProjectLayout {
	project: string
	roots: string[]
}

/** A changed file with its resolved annotations — the IO seam fills these in; tests construct them. */
export interface ChangedFile {
	path: string
	artifactType: string
	changedScenarios: string[]
}

export interface FileEntry {
	path: string
	node: string | null
	artifactType: string
	changedScenarios: string[]
}

export interface NodeDetail {
	node: string
	files: string[]
	changedScenarios: string[]
}

export interface Reconciliation {
	confirmed: string[]
	missed: string[]
	overDeclared: string[]
	corrected: string[]
}

export interface Correction extends Reconciliation {
	nodes: NodeDetail[]
	unmapped: string[]
}

// ── Pure derivations ──

/** The scenario-rung gate is STRUCTURAL — the `.feature` extension — never the resolved
 *  artifact-type (a `.feature` with an unresolved artifact-type still gets scenario detail; a
 *  non-`.feature` with a resolved artifact-type never does). */
export function isFeature(path: string): boolean {
	return path.endsWith('.feature')
}

function stripTrailingSlash(root: string): string {
	return root.endsWith('/') ? root.slice(0, -1) : root
}

/**
 * fileToNode — capability-first work-area recovery. For each project's root, if `path` sits under
 * `root/`, the CAPABILITY is the first path segment after the matched root; the node is
 * `project/capability`. Matches the LONGEST matching root prefix across every project + root (so a
 * deeper root like `plugins/sdd/skills` wins over a shallower `plugins/sdd`, when both are
 * declared). Returns null when no root matches — the file is unmapped.
 */
export function fileToNode(path: string, projects: ProjectLayout[]): string | null {
	let best: { project: string; capability: string; rootLen: number } | null = null
	for (const p of projects) {
		for (const rawRoot of p.roots) {
			const root = stripTrailingSlash(rawRoot)
			const prefix = root === '' ? '' : `${root}/`
			if (prefix === '' || !path.startsWith(prefix)) continue
			const rest = path.slice(prefix.length)
			const capability = rest.split('/')[0]
			if (!capability) continue
			if (best === null || prefix.length > best.rootLen) {
				best = { project: p.project, capability, rootLen: prefix.length }
			}
		}
	}
	return best ? `${best.project}/${best.capability}` : null
}

function sortedUnique(values: readonly string[]): string[] {
	return [...new Set(values)].sort()
}

/**
 * reconcile — the declared-vs-actual three-way split: confirmed = declared ∩ actual, missed =
 * actual − declared, overDeclared = declared − actual. The corrected touch-set is simply the
 * actual set — the real change is the ground truth. Every list de-duplicated and sorted, so a
 * fixed input always reconciles to the same answer in the same order.
 */
export function reconcile(declared: string[], actual: string[]): Reconciliation {
	const declaredSet = new Set(declared)
	const actualSet = new Set(actual)
	return {
		confirmed: sortedUnique(declared.filter((d) => actualSet.has(d))),
		missed: sortedUnique(actual.filter((a) => !declaredSet.has(a))),
		overDeclared: sortedUnique(declared.filter((d) => !actualSet.has(d))),
		corrected: sortedUnique(actual),
	}
}

/**
 * assembleCorrection — the whole pure assembly. Builds a FileEntry per changed file (node via
 * fileToNode; changedScenarios gated by isFeature — belt-and-suspenders: a non-.feature never
 * records scenario detail even if fed some), collects the unmapped paths and the actual (non-null,
 * de-duplicated) node set, groups per-node file + scenario detail, and reconciles declared against
 * actual. Deterministic + stably ordered for fixed inputs — no fs/network access of its own.
 */
export function assembleCorrection(declared: string[], files: ChangedFile[], projects: ProjectLayout[]): Correction {
	const entries: FileEntry[] = files.map((f) => ({
		path: f.path,
		node: fileToNode(f.path, projects),
		artifactType: f.artifactType,
		changedScenarios: isFeature(f.path) ? f.changedScenarios : [],
	}))

	const unmapped = sortedUnique(entries.filter((e) => e.node === null).map((e) => e.path))
	const actual = sortedUnique(
		entries.filter((e): e is FileEntry & { node: string } => e.node !== null).map((e) => e.node),
	)

	const nodes: NodeDetail[] = actual.map((node) => {
		const nodeEntries = entries.filter((e) => e.node === node)
		return {
			node,
			files: sortedUnique(nodeEntries.map((e) => e.path)),
			changedScenarios: sortedUnique(nodeEntries.flatMap((e) => e.changedScenarios)),
		}
	})

	return { ...reconcile(declared, actual), nodes, unmapped }
}

// ── IO seam (thin — network/binary/fs boundary; not unit-tested, mirrors classify-edit-class.mts) ──

/** Reads the changed-file list of `base..head` via `git diff --name-status`. A rename records its
 *  NEW path only. On any git failure (absent binary, bad refs, not a repo) returns []. */
export function readChangedFiles(base: string, head: string, cwd: string): { path: string; status: string }[] {
	let out: string
	try {
		out = execFileSync('git', ['diff', '--name-status', `${base}..${head}`], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
	} catch {
		return []
	}
	const results: { path: string; status: string }[] = []
	for (const line of out.split('\n')) {
		if (line.trim() === '') continue
		const rename = /^R\d+\t([^\t]+)\t([^\t]+)$/.exec(line)
		if (rename) {
			results.push({ path: rename[2], status: 'R' })
			continue
		}
		const m = /^(\S+)\t(.+)$/.exec(line)
		if (m) results.push({ path: m[2], status: m[1] })
	}
	return results
}

const HERE = dirname(fileURLToPath(import.meta.url))
const RESOLVE_GOVERNANCES_PATH = join(HERE, '..', '..', 'resolve-governances', 'scripts', 'resolve-governances.mts')

/** Resolves one file's artifact-type via `resolve-governances --path` (best-effort — its own
 *  no-match "classify by convention" case). On ANY failure (absent tool, bad JSON, non-zero exit)
 *  returns 'unknown' — never throws. */
export function resolveArtifactType(path: string, root: string, cwd: string): string {
	try {
		const out = execFileSync('node', [RESOLVE_GOVERNANCES_PATH, '--root', root, '--path', path, '--format', 'json'], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		const parsed = JSON.parse(out) as { artifactType?: string | null }
		return parsed.artifactType ?? 'unknown'
	} catch {
		return 'unknown'
	}
}

interface GherkinScenarioChange {
	name: string
	change: 'added' | 'modified' | 'removed' | 'unchanged'
}

interface GherkinDiffFileResult {
	file: string
	scenarios: GherkinScenarioChange[]
}

interface GherkinDiffOutput {
	files: GherkinDiffFileResult[]
}

/** The changed scenario names of a touched `.feature`, via the pinned `gherkin-cli@0.0.1 diff`
 *  (same tool classify-edit-class.mts uses — never a reimplemented differ). Gated by isFeature —
 *  a non-.feature never calls out. On any failure returns []. Reads any `.feature` regardless of
 *  freeze — the freeze gate is a separate concern (spec-gate), not this tool's business. */
export function changedScenarios(base: string, path: string, cwd: string): string[] {
	if (!isFeature(path)) return []
	try {
		const out = execFileSync('npx', ['gherkin-cli@0.0.1', 'diff', path, '--base', base, '--format', 'json'], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		const parsed = JSON.parse(out) as GherkinDiffOutput
		const fileResult = parsed.files.find((f) => f.file === path) ?? parsed.files[0]
		return (fileResult?.scenarios ?? []).filter((s) => s.change !== 'unchanged').map((s) => s.name)
	} catch {
		return []
	}
}

/** Composes the three IO calls per changed file into the ChangedFile list `assembleCorrection`
 *  consumes. */
export function collectChangedFiles(base: string, head: string, root: string, cwd: string): ChangedFile[] {
	const changed = readChangedFiles(base, head, cwd)
	return changed.map(({ path }) => ({
		path,
		artifactType: resolveArtifactType(path, root, cwd),
		changedScenarios: changedScenarios(base, path, cwd),
	}))
}

const DISCOVER_SPECS_PATH = join(HERE, '..', '..', 'discover-specs', 'scripts', 'discover-specs.mts')

interface DiscoveredSpec {
	path: string
	name: string
	projectPath: string
}

/** Best-effort project-layout discovery via `discover-specs`: each project's spec-path plus an
 *  impl-root convention (`plugins/<p>` → also `plugins/<p>/skills`; `packages/<p>` → also
 *  `packages/<p>/src`; else the project-path itself). `--layout` (CLI) overrides this entirely. On
 *  any failure returns []. */
export function discoverLayouts(root: string, cwd: string): ProjectLayout[] {
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

// ── Render (TOON — the token-efficient tabular form the repo's other sdd engines emit) ──

function toonQuote(v: string): string {
	if (v === '' || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function renderCorrectionToon(correction: Correction): string {
	const lines: string[] = []
	lines.push(`corrected[${correction.corrected.length}]: ${correction.corrected.map(toonQuote).join(';')}`)
	lines.push(`confirmed[${correction.confirmed.length}]: ${correction.confirmed.map(toonQuote).join(';')}`)
	lines.push(`missed[${correction.missed.length}]: ${correction.missed.map(toonQuote).join(';')}`)
	lines.push(`overDeclared[${correction.overDeclared.length}]: ${correction.overDeclared.map(toonQuote).join(';')}`)
	lines.push(`nodes[${correction.nodes.length}]{node,files,changedScenarios}:`)
	for (const n of correction.nodes) {
		lines.push(`  ${toonQuote(n.node)},"${n.files.join(';')}","${n.changedScenarios.join(';')}"`)
	}
	lines.push(`unmapped[${correction.unmapped.length}]: ${correction.unmapped.map(toonQuote).join(';')}`)
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

/** Parses one `--layout '<project>:<root1>,<root2>'` flag value into a ProjectLayout. */
export function parseLayoutFlag(value: string): ProjectLayout | null {
	const idx = value.indexOf(':')
	if (idx === -1) return null
	const project = value.slice(0, idx).trim()
	const roots = splitCsv(value.slice(idx + 1))
	if (project === '' || roots.length === 0) return null
	return { project, roots }
}

export function main(argv: string[]): number {
	const base = flag(argv, '--base')
	if (base === undefined) {
		process.stderr.write('touch-set-correction: --base <ref> is required\n')
		return 1
	}
	const head = flag(argv, '--head') ?? 'HEAD'
	const root = flag(argv, '--root') ?? '.'
	const declared = splitCsv(flag(argv, '--declared'))
	const format = flag(argv, '--format') === 'json' ? 'json' : 'toon'

	const layoutFlags = allFlags(argv, '--layout')
	const layouts =
		layoutFlags.length > 0
			? layoutFlags.map(parseLayoutFlag).filter((l): l is ProjectLayout => l !== null)
			: discoverLayouts(root, root)

	const files = collectChangedFiles(base, head, root, root)
	const correction = assembleCorrection(declared, files, layouts)

	process.stdout.write(
		`${format === 'json' ? JSON.stringify(correction, null, 2) : renderCorrectionToon(correction)}\n`,
	)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
