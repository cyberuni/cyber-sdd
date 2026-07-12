#!/usr/bin/env node
// align-spec — project-spec/align-spec's concrete engine. Detects prose↔suite drift across the
// project spec's nodes and, on request, applies the mechanical write primitives a judge-directed
// reconcile step uses (see this skill's README.md / SKILL.md).
//
// The 12 frozen scenarios split two ways (align-spec.feature):
//   - Mechanical (this engine ships code + a test for each):
//       * a scenario-diff flags a narrowing of the frozen suite → Clearance
//       * check mode exits non-zero on drift and writes nothing
//       * check mode exits zero when there is no drift
//       * detect runs over every node of the project spec (a chosen set)
//       * reconcile never writes lifecycle state (writes only prose or scenarios)
//   - Judge-orchestrated (SKILL.md documents the procedure; no engine code):
//       coverage-gap detection, prose/scenario contradiction detection, the aligned-report-no-
//       drift aggregate, and every reconcile *decision* (add a scenario / trim prose / align the
//       losing side / escalate a Clearance) — there are no scenario IDs in prose, so prose↔suite
//       alignment is judge-only. This engine feeds that judge the mechanical scan (node
//       iteration + scenario-diff); it never itself judges coverage or contradiction.
//
// Node iteration and the scenario-diff reuse the existing engines rather than re-implementing
// them: check-spec-structure's scanProjectSpec (node discovery) and spec-gate's classify-edit-
// class (the gherkin-cli-backed structural diff against a frozen baseline).
//
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { existsSync, readdirSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { type NodeRecord, scanProjectSpec } from '../../check-spec-structure/scripts/check-spec-structure.mts'
import { classifyFile } from '../../spec-gate/scripts/classify-edit-class.mts'

export const DEFAULT_BASE = 'HEAD'

export type DriftKind = 'narrowing'
export type DriftSeverity = 'clearance'

export interface DriftFinding {
	kind: DriftKind
	severity: DriftSeverity
	/** The node's display path (a folder for a README-rooted node). */
	node: string
	detail: string
}

// ── Node selection — the "chosen set" a detect run scopes to ──
// No `--nodes` arg selects every node scanProjectSpec finds; an explicit list scopes the sweep
// to exactly those nodes (matched by display path or the README's relative path).
export function selectNodes(records: NodeRecord[], only?: string[]): NodeRecord[] {
	if (!only || only.length === 0) return records
	const wanted = new Set(only.map(normalizeNodeRef))
	return records.filter((r) => wanted.has(normalizeNodeRef(r.display)) || wanted.has(normalizeNodeRef(r.relPath)))
}

function normalizeNodeRef(ref: string): string {
	return ref
		.replace(/\\/g, '/')
		.replace(/\/README\.md$/, '')
		.replace(/\/+$/, '')
}

// ── Locate a node's sibling `.feature` file (same convention check-spec-structure scans by) ──
export function findFeaturePath(specDir: string, node: NodeRecord): string | null {
	const nodeDir = join(specDir, node.relPath.replace(/README\.md$/, ''))
	if (!existsSync(nodeDir)) return null
	const entries = readdirSync(nodeDir, { withFileTypes: true })
	const feature = entries.find((e) => e.isFile() && e.name.endsWith('.feature'))
	return feature ? join(nodeDir, feature.name) : null
}

// ── Mechanical scenario-diff: a modified/removed baseline scenario is a narrowing → Clearance ──
// Reuses spec-gate's classify-edit-class rather than hand-rolling a line-diff (a line-diff is
// fooled by a step reassigned off a frozen scenario onto a newly-added adjacent one).
export function detectNarrowing(node: NodeRecord, specDir: string, base: string, cwd = '.'): DriftFinding[] {
	const featurePath = findFeaturePath(specDir, node)
	if (!featurePath) return []
	// classifyFile (and the `git show <base>:<path>` it drives) needs a path relative to cwd
	// (the git repo root) — resolve it, since specDir/featurePath may already be absolute.
	const relFeaturePath = isAbsolute(featurePath) ? relative(cwd, featurePath) : featurePath
	const result = classifyFile(relFeaturePath, base, cwd)
	if (result.classification !== 'narrowing' && result.classification !== 'mixed') return []
	const narrowed = result.scenarios.filter((s) => s.change === 'modified' || s.change === 'removed')
	return [
		{
			kind: 'narrowing',
			severity: 'clearance',
			node: node.display,
			detail: `scenario-diff vs ${base} narrows: ${narrowed.map((s) => s.name).join(', ')} — escalate a Clearance CR, do not silently rewrite`,
		},
	]
}

// Runs the mechanical scan over exactly the chosen node set — reports drift per node.
export function detect(records: NodeRecord[], specDir: string, base: string, cwd = '.'): DriftFinding[] {
	return records.flatMap((node) => detectNarrowing(node, specDir, base, cwd))
}

export function hasDrift(findings: DriftFinding[]): boolean {
	return findings.length > 0
}

// ── The write boundary ──
// Reconcile decisions (add/trim/align/escalate) are judge-orchestrated (SKILL.md), but the
// mechanical write primitives the judge's verdict drives are engine code, and they are built to
// make writing lifecycle state structurally impossible: a README write splits frontmatter from
// body and only ever touches the body; a .feature write only ever appends a whole scenario block.
export interface SplitDocument {
	frontmatter: string
	body: string
}

export function splitFrontmatter(text: string): SplitDocument {
	const m = /^(---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$))([\s\S]*)$/.exec(text)
	if (!m) return { frontmatter: '', body: text }
	return { frontmatter: m[1], body: m[2] }
}

// Trims prose out of a node's README body — the frontmatter (and any status/approval/freeze
// field it carries) passes through byte-for-byte untouched.
export function trimProse(readmeText: string, proseToRemove: string): string {
	const { frontmatter, body } = splitFrontmatter(readmeText)
	return frontmatter + body.split(proseToRemove).join('')
}

// Appends a whole scenario block to a `.feature` file. `.feature` files carry no frontmatter /
// lifecycle fields to begin with — this only ever appends, never rewrites an existing scenario
// (a rewrite of an existing frozen scenario is the narrowing path above, which escalates instead).
export function appendScenario(featureText: string, scenarioBlock: string): string {
	const trimmed = featureText.replace(/\s+$/, '')
	return `${trimmed}\n\n${scenarioBlock.trim()}\n`
}

// ── Render ──
export function renderFindings(findings: DriftFinding[], specDir: string): string {
	const lines: string[] = [`align-spec: spec-dir=${specDir}`, `drift[${findings.length}]:`]
	for (const f of findings) lines.push(`  ${f.node} — ${f.kind} (${f.severity}): ${f.detail}`)
	if (findings.length === 0) lines.push('  (none — mechanical scenario-diff found no narrowing)')
	lines.push(
		'note: coverage gaps and prose/scenario contradictions are judge-only (no scenario IDs in prose) — this engine reports only the mechanical scenario-diff',
	)
	return lines.join('\n')
}

// ── CLI ──
function parseNodesArg(value: string | undefined): string[] | undefined {
	if (!value) return undefined
	const parts = value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
	return parts.length > 0 ? parts : undefined
}

export function main(argv: string[]): number {
	let specDir = '.'
	let base = DEFAULT_BASE
	let mode: 'detect' | 'check' = 'detect'
	let format: 'toon' | 'json' = 'toon'
	let only: string[] | undefined
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--spec-dir') specDir = argv[++i] ?? '.'
		else if (a === '--check') mode = 'check'
		else if (a === '--base') base = argv[++i] ?? DEFAULT_BASE
		else if (a === '--format') format = (argv[++i] as 'toon' | 'json') ?? 'toon'
		else if (a === '--nodes') only = parseNodesArg(argv[++i])
	}

	const records = selectNodes(scanProjectSpec(specDir), only)
	const findings = detect(records, specDir, base)

	if (mode === 'check') {
		if (hasDrift(findings)) {
			process.stderr.write(`align-spec: ${findings.length} drift finding(s) (mechanical scenario-diff)\n`)
			return 1
		}
		process.stdout.write('align-spec: no mechanical drift\n')
		return 0
	}

	if (format === 'json') process.stdout.write(`${JSON.stringify(findings)}\n`)
	else process.stdout.write(`${renderFindings(findings, specDir)}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
