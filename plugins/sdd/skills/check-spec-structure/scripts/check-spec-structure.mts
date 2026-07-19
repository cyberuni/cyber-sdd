#!/usr/bin/env node
// check-spec-structure — project-spec/check-spec-structure's concrete engine. Audits the internal
// node-shape of one project spec and emits a finding set for the formation Warden: the intra-spec
// successor to the retired cross-spec dedupe/split tools, now that one project is one spec
// (see this skill's README.md).
//
// Two deterministic checks, each with a severity:
//   - untagged-node (blocking)  — a spec-typed node README with no `concept:` tag, so it never
//     appears in the by-concept index (../concept-index/). `--check` fails on it.
//   - oversized-node (advisory) — a node whose sibling `.feature` scenario count exceeds the
//     granularity threshold; carries a deterministic shape profile (plain/tagged counts + section-
//     cluster count) but prescribes no route. Never fails `--check`.
//   - missing-glossary (advisory) — the project spec has no root `glossary.md`, so its ubiquitous
//     language has no home and a term can be used without ever being defined. A root FILE, not a
//     folder: every mandated folder is an exception to screaming architecture. Never fails `--check`.
// Breadth-vs-depth routing and intra-spec contradiction are Warden judgment (the @rubric scenarios)
// — no engine code here.
//
// Pure derivation from frontmatter + scenario counts: no node body reaches a finding, and the
// engine writes nothing. No dependencies (the repo's node-≥23.6 / no-deps convention). Pure
// functions are exported for node:test; running the file directly drives the CLI.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])
export const DEFAULT_MAX_SCENARIOS = 40

export type FindingKind = 'untagged-node' | 'oversized-node' | 'missing-glossary'
export type Severity = 'blocking' | 'advisory'

export interface NodeRecord {
	/** Path relative to the spec directory (POSIX). */
	relPath: string
	/** The top-level folder — the capability. */
	capability: string
	/** Display form — a README.md node shows its folder. */
	display: string
	concepts: string[]
	specType?: string
	hasFeature: boolean
	scenarioCount: number
	plainCount: number
	taggedCount: number
	clusterCount: number
}

export interface Finding {
	kind: FindingKind
	severity: Severity
	node: string
	detail: string
}

// ── Frontmatter parse (concept + spec-type only — the classification signal) ──
export interface NodeFrontmatter {
	concepts: string[]
	specType?: string
}

export function parseNodeFrontmatter(text: string): NodeFrontmatter {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
	if (!m) return { concepts: [] }
	const fm: NodeFrontmatter = { concepts: [] }
	const lines = m[1].split('\n').map((l) => l.replace(/\r$/, ''))
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.trim() === '' || line.trim().startsWith('#')) continue
		if (line.length - line.trimStart().length !== 0) continue // top-level keys only
		const [key, ...rest] = line.trim().split(':')
		const value = rest.join(':').trim()
		if (key === 'spec-type') fm.specType = unquote(value)
		else if (key === 'concept') {
			if (value === '' || value === '|' || value === '>') {
				for (let j = i + 1; j < lines.length; j++) {
					const item = lines[j]
					if (item.trim() === '') continue
					if (item.length - item.trimStart().length === 0) break
					const dash = /^\s*-\s+(.*)$/.exec(item)
					if (dash) fm.concepts.push(unquote(dash[1].trim()))
				}
			} else {
				fm.concepts.push(...parseScalarOrFlow(value))
			}
		}
	}
	return fm
}

export function parseScalarOrFlow(value: string): string[] {
	const v = value.trim()
	if (v.startsWith('[') && v.endsWith(']')) {
		return v
			.slice(1, -1)
			.split(',')
			.map((s) => unquote(s.trim()))
			.filter((s) => s.length > 0)
	}
	const single = unquote(v)
	return single.length > 0 ? [single] : []
}

function unquote(v: string): string {
	return v.replace(/^["']|["']$/g, '')
}

// ── Scenario count — the granularity signal (frontmatter-free, count `Scenario:` lines) ──
export function countScenarios(featureText: string): number {
	let n = 0
	for (const line of featureText.split('\n')) {
		if (/^\s*Scenario:/.test(line)) n++
	}
	return n
}

// ── Shape profile — the deterministic breadth-vs-depth signal for the Warden ──
export interface ShapeProfile {
	scenarioCount: number
	plainCount: number
	taggedCount: number
	clusterCount: number
}

const SECTION_HEADER = /^\s*#\s*(?:──|-{3,})/

export function profileFeature(featureText: string): ShapeProfile {
	const lines = featureText.split('\n')
	let scenarioCount = 0
	let taggedCount = 0
	let clusterCount = 0
	let pendingRubric = false
	for (const line of lines) {
		if (/^\s*Scenario:/.test(line)) {
			scenarioCount++
			if (pendingRubric) taggedCount++
			pendingRubric = false
			continue
		}
		const trimmed = line.trim()
		if (trimmed === '') continue
		if (trimmed.startsWith('@')) {
			if (/(^|\s)@rubric(\s|$)/.test(trimmed)) pendingRubric = true
			continue
		}
		if (SECTION_HEADER.test(line)) {
			clusterCount++
			pendingRubric = false
			continue
		}
		pendingRubric = false
	}
	return { scenarioCount, plainCount: scenarioCount - taggedCount, taggedCount, clusterCount }
}

function displayPath(relPath: string): string {
	const p = relPath.replace(/\\/g, '/')
	return p.endsWith('/README.md') ? p.slice(0, -'README.md'.length) : p
}

// ── Scan the project-spec — every node carrying a spec-type or concept tag ──
export function scanProjectSpec(specDir: string): NodeRecord[] {
	const records: NodeRecord[] = []
	walk(specDir, specDir, records)
	return records.sort((a, b) => a.display.localeCompare(b.display))
}

function walk(dir: string, specDir: string, out: NodeRecord[]): void {
	const entries = readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, specDir, out)
		} else if (entry.name === 'README.md') {
			const fm = parseNodeFrontmatter(readFileSync(full, 'utf8'))
			if (fm.specType === undefined && fm.concepts.length === 0) continue
			const features = entries.filter((e) => e.isFile() && e.name.endsWith('.feature'))
			const hasFeature = features.length > 0
			const profile = hasFeature
				? profileFeature(readFileSync(join(dir, features[0].name), 'utf8'))
				: { scenarioCount: 0, plainCount: 0, taggedCount: 0, clusterCount: 0 }
			const relPath = full.slice(specDir.length + 1).replace(/\\/g, '/')
			out.push({
				relPath,
				capability: relPath.split('/')[0],
				display: displayPath(relPath),
				concepts: fm.concepts,
				specType: fm.specType,
				hasFeature,
				scenarioCount: profile.scenarioCount,
				plainCount: profile.plainCount,
				taggedCount: profile.taggedCount,
				clusterCount: profile.clusterCount,
			})
		}
	}
}

// ── Checks ──
// A spec-typed node with no concept is orphaned from the by-concept index → blocking.
export function checkUntagged(records: NodeRecord[]): Finding[] {
	return records
		.filter((r) => r.specType !== undefined && r.concepts.length === 0)
		.map((r) => ({
			kind: 'untagged-node' as const,
			severity: 'blocking' as const,
			node: r.display,
			detail: `spec-type: ${r.specType} but no concept tag — orphaned from the by-concept index`,
		}))
}

// A node whose suite exceeds the granularity threshold → advisory split candidate.
export function checkOversized(records: NodeRecord[], maxScenarios: number): Finding[] {
	return records
		.filter((r) => r.scenarioCount > maxScenarios)
		.map((r) => ({
			kind: 'oversized-node' as const,
			severity: 'advisory' as const,
			node: r.display,
			detail: `${r.scenarioCount} scenarios > ${maxScenarios} — shape profile: plain ${r.plainCount}, tagged ${r.taggedCount}, clusters ${r.clusterCount} (soft breadth hint); the Warden routes breadth-vs-depth`,
		}))
}

// A project spec with no root glossary.md has nowhere to define its ubiquitous language → advisory.
export function checkGlossary(specDir: string): Finding[] {
	if (existsSync(join(specDir, 'glossary.md'))) return []
	return [
		{
			kind: 'missing-glossary' as const,
			severity: 'advisory' as const,
			node: 'glossary.md',
			detail:
				'no root glossary.md — the project has no home for its ubiquitous language, so a term can be used without ever being defined; a root file, never a folder',
		},
	]
}

export function audit(records: NodeRecord[], maxScenarios: number, specDir?: string): Finding[] {
	return [
		...checkUntagged(records),
		...checkOversized(records, maxScenarios),
		...(specDir === undefined ? [] : checkGlossary(specDir)),
	]
}

export function hasBlocking(findings: Finding[]): boolean {
	return findings.some((f) => f.severity === 'blocking')
}

// ── Render ──
export function renderFindings(findings: Finding[], specDir: string): string {
	const blocking = findings.filter((f) => f.severity === 'blocking')
	const advisory = findings.filter((f) => f.severity === 'advisory')
	const lines: string[] = [`check-spec-structure: spec-dir=${specDir}`]
	lines.push(`blocking[${blocking.length}]:`)
	for (const f of blocking) lines.push(`  ${f.node} — ${f.kind}: ${f.detail}`)
	lines.push(`advisory[${advisory.length}]:`)
	for (const f of advisory) lines.push(`  ${f.node} — ${f.kind}: ${f.detail}`)
	lines.push('note: advisory — findings feed the Warden formation pass; the engine writes nothing')
	return lines.join('\n')
}

// ── CLI ──
export function main(argv: string[]): number {
	let specDir = '.'
	let mode: 'audit' | 'check' = 'audit'
	let format: 'toon' | 'json' = 'toon'
	let maxScenarios = DEFAULT_MAX_SCENARIOS
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--spec-dir') specDir = argv[++i] ?? '.'
		else if (a === '--check') mode = 'check'
		else if (a === '--max-scenarios') maxScenarios = Number(argv[++i] ?? DEFAULT_MAX_SCENARIOS)
		else if (a === '--format') format = (argv[++i] as 'toon' | 'json') ?? 'toon'
	}
	const findings = audit(scanProjectSpec(specDir), maxScenarios, specDir)
	if (mode === 'check') {
		if (hasBlocking(findings)) {
			process.stderr.write(
				`check-spec-structure: ${findings.filter((f) => f.severity === 'blocking').length} blocking finding(s)\n`,
			)
			return 1
		}
		process.stdout.write('check-spec-structure: no blocking findings\n')
		return 0
	}
	if (format === 'json') process.stdout.write(`${JSON.stringify(findings)}\n`)
	else process.stdout.write(`${renderFindings(findings, specDir)}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
