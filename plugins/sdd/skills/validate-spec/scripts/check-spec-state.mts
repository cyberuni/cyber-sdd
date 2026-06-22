#!/usr/bin/env node
// Static state-machine check for SDD specs (the sdd-gate-autonomy enforcement
// slice). Rejects illegal (status, aligned, markers, .feature) tuples and
// malformed approved-by attribution — the safety net that makes an illegal
// state uncommittable. Pure functions are exported for node:test; running the
// file directly drives the CLI. No dependencies — plain node strips the types.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface GateApproval {
	by?: string
	hasWhy: boolean
}

export interface SpecState {
	status: string
	aligned: boolean | null
	markerCount: number
	approvedBy: Record<string, GateApproval> | null
}

const GATES = ['spec', 'impl']

function frontmatter(text: string): string[] {
	const m = /^---\n([\s\S]*?)\n---/.exec(text)
	return m ? m[1].split('\n') : []
}

export function parseSpecState(text: string): SpecState {
	const lines = frontmatter(text)
	let status = ''
	let aligned: boolean | null = null
	let approvedBy: Record<string, GateApproval> | null = null

	for (let i = 0; i < lines.length; i++) {
		const s = /^status:\s*(.+)$/.exec(lines[i])
		if (s) {
			status = s[1].trim().replace(/^["']|["']$/g, '')
			continue
		}
		const a = /^aligned:\s*(true|false)\b/.exec(lines[i])
		if (a) {
			aligned = a[1] === 'true'
			continue
		}
		const ab = /^approved-by:\s*(.*)$/.exec(lines[i])
		if (ab) {
			approvedBy = {}
			if (ab[1].trim() && ab[1].trim() !== '{}') continue // inline non-empty unsupported; treat as empty map
			let gate: string | null = null
			for (let j = i + 1; j < lines.length; j++) {
				if (!/^\s/.test(lines[j])) break // dedent to top level ends the block
				const g = /^ {2}(\w+):\s*$/.exec(lines[j])
				if (g) {
					gate = g[1]
					approvedBy[gate] = { hasWhy: false }
					continue
				}
				if (!gate) continue
				const by = /^ {4}by:\s*(.+)$/.exec(lines[j])
				if (by) approvedBy[gate].by = by[1].trim().replace(/^["']|["']$/g, '')
				if (/^ {4}why:/.test(lines[j])) approvedBy[gate].hasWhy = true
			}
		}
	}

	// Count only real open markers — raw HTML comments in prose. A spec that
	// documents the marker syntax wraps it in backticks or a fenced block, so
	// strip code spans and fences before counting (else the spec trips its own gate).
	const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
	const markerCount = (prose.match(/<!--\s*open:/g) ?? []).length
	return { status, aligned, markerCount, approvedBy }
}

export function checkSpec(slug: string, state: SpecState, hasFeature: boolean): string[] {
	const { status, aligned, markerCount, approvedBy } = state
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)

	if (status === 'draft' && aligned === true)
		tag('illegal state — draft must have aligned:false (draft never means implemented)')
	if (status === 'approved' && !hasFeature) tag('illegal state — approved requires a frozen .feature')
	if (status === 'implemented' && aligned !== true) tag('illegal state — implemented requires aligned:true')
	if ((status === 'approved' || status === 'implemented') && markerCount > 0)
		tag(`illegal state — ${markerCount} open marker(s) but status is ${status} (markers block the gate)`)

	if (approvedBy) {
		for (const [gate, entry] of Object.entries(approvedBy)) {
			if (!GATES.includes(gate)) tag(`approved-by has unknown gate "${gate}" (expected spec | impl)`)
			if (entry.by === 'agent' && !entry.hasWhy)
				tag(`approved-by.${gate} is by:agent but has no why block (a self-assertion must record its derivation)`)
		}
	}
	if ((status === 'approved' || status === 'implemented') && !approvedBy?.spec?.by)
		tag(`status is ${status} but approved-by.spec is missing — the spec gate has no recorded approver`)
	if (status === 'implemented' && !approvedBy?.impl?.by)
		tag('status is implemented but approved-by.impl is missing — the impl gate has no recorded approver')

	return v
}

function hasFeatureFile(dir: string): boolean {
	return readdirSync(dir).some((f) => f.endsWith('.feature'))
}

// A spec is defined by its shape, not its location, so discovery walks the tree
// recursively and returns every dir holding a spec.md — nested specs (sdd/sdd-skill)
// are real specs and must be enforced too. The slug is the root-relative dir path.
export function discoverSpecDirs(root: string): string[] {
	const out: string[] = []
	const walk = (dir: string, rel: string) => {
		let entries: ReturnType<typeof readdirSync>
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			return
		}
		if (entries.some((e) => e.isFile() && e.name === 'spec.md')) out.push(rel)
		for (const e of entries) {
			if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue
			walk(join(dir, e.name), rel ? join(rel, e.name) : e.name)
		}
	}
	walk(root, '')
	return out
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : 'artifacts/specs'
	let violations: string[] = []
	for (const slug of discoverSpecDirs(root)) {
		const dir = join(root, slug)
		const specPath = join(dir, 'spec.md')
		if (!existsSync(specPath)) continue
		const state = parseSpecState(readFileSync(specPath, 'utf8'))
		violations = violations.concat(checkSpec(slug, state, hasFeatureFile(dir)))
	}
	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`)
		return 1
	}
	process.stdout.write('spec states OK\n')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
