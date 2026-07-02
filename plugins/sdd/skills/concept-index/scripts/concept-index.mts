#!/usr/bin/env node
// concept-index — project-spec/concept-index's concrete engine. Scans one project-spec for every node's
// `concept:` frontmatter and renders the by-concept view (concept → its nodes across every folder),
// which re-unifies a cross-cutting concern the capability folder tree scatters
// (the concept axis).
//
// Pure derivation from the `concept:` tags: rendering twice is byte-identical, and the generated
// block in the root spec.md is the only thing a --write touches. Frontmatter only — no node body
// reaches the output. No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions
// are exported for node:test; running the file directly drives the CLI.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const BEGIN_MARKER = '<!-- BEGIN generated: by-concept (project-spec/concept-index) -->'
export const END_MARKER = '<!-- END generated: by-concept -->'
// Where the block is inserted when the markers are absent: just before this heading.
const ANCHOR_HEADING = '## Invariants'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

export type FacetKind = 'rule' | 'e2e' | 'reference' | 'behavior' | 'index'

export interface NodeRecord {
	/** Path relative to the spec directory (POSIX). */
	relPath: string
	/** Display form — a README.md node shows its folder, a design doc shows the file. */
	display: string
	concepts: string[]
	facet: FacetKind
}

export interface NodeFrontmatter {
	concepts: string[]
	specType?: string
	model: boolean
}

// ── Frontmatter parse (a minimal YAML subset — only the node classification schema) ──
// Reads the leading `---` … `---` block for `concept` (scalar | flow list | block list),
// `spec-type`, and `model`. Returns null when there is no frontmatter block.
export function parseFrontmatter(text: string): NodeFrontmatter | null {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
	if (!m) return null
	const fm: NodeFrontmatter = { concepts: [], model: false }
	const lines = m[1].split('\n').map((l) => l.replace(/\r$/, ''))
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.trim() === '' || line.trim().startsWith('#')) continue
		if (line.length - line.trimStart().length !== 0) continue // only top-level keys
		const [key, ...rest] = line.trim().split(':')
		const value = rest.join(':').trim()
		if (key === 'spec-type') fm.specType = unquote(value)
		else if (key === 'model') fm.model = unquote(value) === 'true'
		else if (key === 'concept') {
			if (value === '' || value === '|' || value === '>') {
				// block list on following more-indented `- item` lines
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

// `resolution` | `[governance, resolution]` → string[]
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

// ── Facet kind — where this node's facet sits, mechanically ──
export function facetKind(relPath: string, specType: string | undefined): FacetKind {
	const p = relPath.replace(/\\/g, '/')
	if (p.startsWith('design/')) return 'rule'
	if (p.startsWith('acceptance/')) return 'e2e'
	if (specType === 'reference') return 'reference'
	if (specType === 'behavioral') return 'behavior'
	return 'index'
}

function displayPath(relPath: string): string {
	const p = relPath.replace(/\\/g, '/')
	return p.endsWith('/README.md') ? p.slice(0, -'README.md'.length) : p
}

// ── Scan the project-spec — every *.md node carrying a concept tag ──
export function scanProjectSpec(specDir: string): NodeRecord[] {
	const records: NodeRecord[] = []
	walk(specDir, specDir, records)
	return records
}

function walk(dir: string, specDir: string, out: NodeRecord[]): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, specDir, out)
		} else if (entry.name.endsWith('.md')) {
			const fm = parseFrontmatter(readFileSync(full, 'utf8'))
			if (!fm || fm.concepts.length === 0) continue
			const relPath = full.slice(specDir.length + 1).replace(/\\/g, '/')
			out.push({
				relPath,
				display: displayPath(relPath),
				concepts: fm.concepts,
				facet: facetKind(relPath, fm.specType),
			})
		}
	}
}

// ── Group + render ──
export function groupByConcept(records: NodeRecord[]): Map<string, NodeRecord[]> {
	const grouped = new Map<string, NodeRecord[]>()
	for (const rec of records) {
		for (const concept of rec.concepts) {
			const list = grouped.get(concept) ?? []
			list.push(rec)
			grouped.set(concept, list)
		}
	}
	// stable order: concepts alphabetical, nodes by display path
	return new Map(
		[...grouped.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => [k, [...v].sort((x, y) => x.display.localeCompare(y.display))]),
	)
}

export function renderTable(grouped: Map<string, NodeRecord[]>): string {
	const rows = [...grouped.entries()].map(([concept, nodes]) => {
		const facets = nodes.map((n) => `\`${n.display}\` (${n.facet})`).join(' · ')
		return `| \`${concept}\` | ${facets} |`
	})
	return ['| Concept | Facets |', '|---|---|', ...rows].join('\n')
}

// The full generated section, markers included.
export function renderSection(grouped: Map<string, NodeRecord[]>): string {
	return [
		BEGIN_MARKER,
		'',
		'## By concept',
		'',
		'> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.',
		'',
		renderTable(grouped),
		'',
		END_MARKER,
	].join('\n')
}

// ── spec.md block maintenance ──
// Replace the BEGIN…END block with `section`; insert at the anchor (or append) when absent.
export function applySection(specText: string, section: string): string {
	const begin = specText.indexOf(BEGIN_MARKER)
	const end = specText.indexOf(END_MARKER)
	if (begin !== -1 && end !== -1 && end > begin) {
		const before = specText.slice(0, begin)
		const after = specText.slice(end + END_MARKER.length)
		return before + section + after
	}
	const anchor = specText.indexOf(ANCHOR_HEADING)
	if (anchor !== -1) {
		return specText.slice(0, anchor) + section + '\n\n' + specText.slice(anchor)
	}
	const trimmed = specText.replace(/\s*$/, '')
	return `${trimmed}\n\n${section}\n`
}

// Extract the current block (BEGIN…END inclusive), or null when absent.
export function extractSection(specText: string): string | null {
	const begin = specText.indexOf(BEGIN_MARKER)
	const end = specText.indexOf(END_MARKER)
	if (begin === -1 || end === -1 || end < begin) return null
	return specText.slice(begin, end + END_MARKER.length)
}

// ── CLI ──
function parseArgs(argv: string[]): { specDir: string; mode: 'print' | 'write' | 'check' } {
	let specDir = '.'
	let mode: 'print' | 'write' | 'check' = 'print'
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--spec-dir') specDir = argv[++i] ?? '.'
		else if (a === '--write') mode = 'write'
		else if (a === '--check') mode = 'check'
	}
	return { specDir, mode }
}

export function main(argv: string[]): number {
	const { specDir, mode } = parseArgs(argv)
	const grouped = groupByConcept(scanProjectSpec(specDir))
	const section = renderSection(grouped)
	const specPath = join(specDir, 'spec.md')
	if (mode === 'print') {
		process.stdout.write(`${section}\n`)
		return 0
	}
	if (!existsSync(specPath)) {
		process.stderr.write(`concept-index: no spec.md at ${specPath}\n`)
		return 2
	}
	const specText = readFileSync(specPath, 'utf8')
	if (mode === 'check') {
		const current = extractSection(specText)
		if (current === section) {
			process.stdout.write('concept-index: no drift\n')
			return 0
		}
		process.stderr.write('concept-index: drift — spec.md by-concept block is stale; run --write\n')
		return 1
	}
	// write
	const next = applySection(specText, section)
	if (next !== specText) writeFileSync(specPath, next)
	process.stdout.write(`concept-index: ${next === specText ? 'unchanged' : 'updated'} ${specPath}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
