#!/usr/bin/env node
// place-node — project-spec/place-node's concrete engine. Given a new node's concept (and optional name),
// suggests a provisional capability home and surfaces possible duplicates, so explore places a node in
// one lookup instead of holding the tree in its head.
//
// Derivation, not a registry: the home for a concept is where that concept's facets already sit — read
// live from the project-spec's `concept:` tags, never a stored routing list (the corpus/discovery no-drift
// rule). Read-only and advisory: it writes nothing, and placement is finalized at handoff.
//
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

export interface NodeRecord {
	/** Path relative to the spec directory (POSIX). */
	relPath: string
	/** The top-level folder — the capability. */
	capability: string
	/** Display form — a README.md node shows its folder, a design doc shows the file. */
	display: string
	concepts: string[]
}

export interface HomeSuggestion {
	capability: string
	count: number
}

// ── Frontmatter parse (concept only — the placement signal) ──
export function parseConcepts(text: string): string[] {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
	if (!m) return []
	const lines = m[1].split('\n').map((l) => l.replace(/\r$/, ''))
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (line.length - line.trimStart().length !== 0) continue
		const [key, ...rest] = line.trim().split(':')
		if (key !== 'concept') continue
		const value = rest.join(':').trim()
		if (value.startsWith('[') && value.endsWith(']')) {
			return value
				.slice(1, -1)
				.split(',')
				.map((s) => unquote(s.trim()))
				.filter((s) => s.length > 0)
		}
		if (value !== '') return [unquote(value)]
		// block list
		const out: string[] = []
		for (let j = i + 1; j < lines.length; j++) {
			const item = lines[j]
			if (item.trim() === '') continue
			if (item.length - item.trimStart().length === 0) break
			const dash = /^\s*-\s+(.*)$/.exec(item)
			if (dash) out.push(unquote(dash[1].trim()))
		}
		return out
	}
	return []
}

function unquote(v: string): string {
	return v.replace(/^["']|["']$/g, '')
}

function displayPath(relPath: string): string {
	const p = relPath.replace(/\\/g, '/')
	return p.endsWith('/README.md') ? p.slice(0, -'README.md'.length) : p
}

// ── Scan the project-spec — every concept-tagged node ──
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
			const concepts = parseConcepts(readFileSync(full, 'utf8'))
			if (concepts.length === 0) continue
			const relPath = full.slice(specDir.length + 1).replace(/\\/g, '/')
			out.push({ relPath, capability: relPath.split('/')[0], display: displayPath(relPath), concepts })
		}
	}
}

// ── Suggest a home — where the concept's facets already sit, ranked by count ──
export function suggestHomes(records: NodeRecord[], concept: string): HomeSuggestion[] {
	const counts = new Map<string, number>()
	for (const rec of records) {
		if (!rec.concepts.includes(concept)) continue
		counts.set(rec.capability, (counts.get(rec.capability) ?? 0) + 1)
	}
	return [...counts.entries()]
		.map(([capability, count]) => ({ capability, count }))
		.sort((a, b) => b.count - a.count || a.capability.localeCompare(b.capability))
}

// ── Duplicate-catch — existing nodes whose path/name overlaps the candidate name ──
export function findNear(records: NodeRecord[], name: string): NodeRecord[] {
	const needle = name.trim().toLowerCase()
	if (needle === '') return []
	return records
		.filter((rec) => rec.relPath.toLowerCase().includes(needle))
		.sort((a, b) => a.display.localeCompare(b.display))
}

// ── Render ──
function render(homes: HomeSuggestion[], near: NodeRecord[], concept: string, name: string): string {
	const lines: string[] = [`place-node: concept=${concept || '(none)'} name=${name || '(none)'}`]
	if (homes.length > 0) {
		lines.push(`homes[${homes.length}]{capability,facets}:`)
		for (const h of homes) lines.push(`  ${h.capability},${h.count}`)
	} else {
		lines.push('homes[0]: (new concept — pick any plausible capability; finalized at handoff)')
	}
	if (near.length > 0) {
		lines.push(`near[${near.length}]:`)
		for (const n of near) lines.push(`  ${n.display}`)
	} else {
		lines.push('near[0]: (no name overlap)')
	}
	lines.push('note: placement is provisional — finalized at handoff')
	return lines.join('\n')
}

// ── CLI ──
export function main(argv: string[]): number {
	let specDir = '.'
	let concept = ''
	let name = ''
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--spec-dir') specDir = argv[++i] ?? '.'
		else if (a === '--concept') concept = argv[++i] ?? ''
		else if (a === '--name') name = argv[++i] ?? ''
	}
	const records = scanProjectSpec(specDir)
	const homes = concept ? suggestHomes(records, concept) : []
	const near = name ? findNear(records, name) : []
	process.stdout.write(`${render(homes, near, concept, name)}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
