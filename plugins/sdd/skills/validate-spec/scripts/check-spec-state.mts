#!/usr/bin/env node
// Static state-machine check for SDD specs (the sdd-gate-autonomy enforcement
// slice). Rejects illegal (status, aligned, markers, .feature) tuples and
// malformed approval attribution — the safety net that makes an illegal
// state uncommittable. Pure functions are exported for node:test; running the
// file directly drives the CLI. No dependencies — plain node strips the types.

import { type Dirent, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface GateVerdict {
	verdict?: string
	by?: string
	hasWhy: boolean
}

export interface SpecState {
	status: string
	aligned: boolean | null
	markerCount: number
	approval: Record<string, GateVerdict> | null
	type: string | null
	subtasks: string[]
}

const GATES = ['spec', 'impl']
const VERDICTS = ['approve', 'pause', 'reject']
const TYPES = ['project', 'feature']

function frontmatter(text: string): string[] {
	const m = /^---\n([\s\S]*?)\n---/.exec(text)
	return m ? m[1].split('\n') : []
}

export function parseSpecState(text: string): SpecState {
	const lines = frontmatter(text)
	let status = ''
	let aligned: boolean | null = null
	let approval: Record<string, GateVerdict> | null = null
	let type: string | null = null
	const subtasks: string[] = []

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
		const t = /^type:\s*(.+)$/.exec(lines[i])
		if (t) {
			type = t[1].trim().replace(/^["']|["']$/g, '')
			continue
		}
		const st = /^subtasks:\s*(.*)$/.exec(lines[i])
		if (st) {
			const rest = st[1].trim()
			if (rest.startsWith('[')) {
				for (const part of rest.replace(/^\[|\]$/g, '').split(',')) {
					const v = part.trim().replace(/^["']|["']$/g, '')
					if (v) subtasks.push(v)
				}
			} else {
				for (let j = i + 1; j < lines.length; j++) {
					const item = /^\s*-\s+(.+)$/.exec(lines[j])
					if (!item) break
					subtasks.push(item[1].trim().replace(/^["']|["']$/g, ''))
				}
			}
			continue
		}
		const ap = /^approval:\s*(.*)$/.exec(lines[i])
		if (ap) {
			approval = {}
			if (ap[1].trim() && ap[1].trim() !== '{}') continue // inline non-empty unsupported; treat as empty map
			let gate: string | null = null
			for (let j = i + 1; j < lines.length; j++) {
				if (!/^\s/.test(lines[j])) break // dedent to top level ends the block
				const g = /^ {2}(\w+):\s*$/.exec(lines[j])
				if (g) {
					gate = g[1]
					approval[gate] = { hasWhy: false }
					continue
				}
				if (!gate) continue
				const verdict = /^ {4}verdict:\s*(.+)$/.exec(lines[j])
				if (verdict) approval[gate].verdict = verdict[1].trim().replace(/^["']|["']$/g, '')
				const by = /^ {4}by:\s*(.+)$/.exec(lines[j])
				if (by) approval[gate].by = by[1].trim().replace(/^["']|["']$/g, '')
				if (/^ {4}why:/.test(lines[j])) approval[gate].hasWhy = true
			}
		}
	}

	// Count only real open markers — raw HTML comments in prose. A spec that
	// documents the marker syntax wraps it in backticks or a fenced block, so
	// strip code spans and fences before counting (else the spec trips its own gate).
	const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
	const markerCount = (prose.match(/<!--\s*open:/g) ?? []).length
	return { status, aligned, markerCount, approval, type, subtasks }
}

export function checkSpec(slug: string, state: SpecState, hasFeature: boolean): string[] {
	const { status, aligned, markerCount, approval } = state
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)

	// draft + aligned:true is LEGAL ("contract synced, ready for the spec gate") —
	// aligned is layer-scoped, so it may hold at draft. No rejection here.
	// A composition node (declares subtasks, owns no .feature of its own) is exempt
	// from the .feature requirement — its behavior lives in its children and its gate
	// rolls up their states (see checkComposition). A leaf (no subtasks) still needs one.
	if (status === 'approved' && !hasFeature && state.subtasks.length === 0)
		tag('illegal state — approved requires a frozen .feature (a composition node with subtasks is exempt)')
	if (status === 'implemented' && aligned !== true) tag('illegal state — implemented requires aligned:true')
	if ((status === 'approved' || status === 'implemented') && markerCount > 0)
		tag(`illegal state — ${markerCount} open marker(s) but status is ${status} (markers block the gate)`)

	if (approval) {
		for (const [gate, entry] of Object.entries(approval)) {
			if (!GATES.includes(gate)) tag(`approval has unknown gate "${gate}" (expected spec | impl)`)
			if (entry.verdict && !VERDICTS.includes(entry.verdict))
				tag(`approval.${gate} has unknown verdict "${entry.verdict}" (expected approve | pause | reject)`)
			if (entry.verdict === 'pause' && entry.by)
				tag(`approval.${gate} is a pause but carries by — a pause is always the agent's act and omits by`)
			if (entry.verdict === 'approve' && !entry.by)
				tag(`approval.${gate} is an approve with no by — an approve must record its approver`)
			if (entry.by === 'agent' && !entry.hasWhy)
				tag(`approval.${gate} is by:agent but has no why block (a self-assertion must record its derivation)`)
			const passed =
				(gate === 'spec' && (status === 'approved' || status === 'implemented')) ||
				(gate === 'impl' && status === 'implemented')
			if (entry.verdict === 'pause' && passed)
				tag(`approval.${gate} is a pause but the ${gate} gate is already passed (status ${status})`)
		}
	}
	if (
		(status === 'approved' || status === 'implemented') &&
		!(approval?.spec?.verdict === 'approve' && approval?.spec?.by)
	)
		tag(
			`status is ${status} but approval.spec has no approve verdict with an approver — the spec gate has no recorded ratification`,
		)
	if (status === 'implemented' && !(approval?.impl?.verdict === 'approve' && approval?.impl?.by))
		tag(
			'status is implemented but approval.impl has no approve verdict with an approver — the impl gate has no recorded ratification',
		)

	if (state.type !== null && !TYPES.includes(state.type))
		tag(`unknown type "${state.type}" (expected project | feature)`)
	if (state.subtasks.length && state.type !== 'project' && state.type !== 'feature')
		tag(`only a project or feature may declare subtasks (type is ${state.type ?? 'unset'}); features nest`)

	return v
}

// A composition node's status must not outrun its children: a parent that declares
// subtasks may be `implemented` only once every non-deprecated child is implemented.
// `approved` is deliberately NOT rolled up — a parent's composition contract is
// approved first, then its children get built (a project sits at approved over
// draft children). A child slug absent from the set is left to render-spec-graph's
// edge-integrity check, not flagged here.
export function checkComposition(slug: string, state: SpecState, statusBySlug: Map<string, string>): string[] {
	const v: string[] = []
	if (state.status !== 'implemented' || state.subtasks.length === 0) return v
	for (const child of state.subtasks) {
		const childStatus = statusBySlug.get(child)
		if (childStatus === undefined || childStatus === 'deprecated') continue
		if (childStatus !== 'implemented')
			v.push(
				`${slug}: composition parent is implemented but child "${child}" is ${childStatus} (children must be implemented first)`,
			)
	}
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
		let entries: Dirent[]
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
	const states = new Map<string, SpecState>()
	const features = new Map<string, boolean>()
	for (const slug of discoverSpecDirs(root)) {
		const dir = join(root, slug)
		const specPath = join(dir, 'spec.md')
		if (!existsSync(specPath)) continue
		states.set(slug, parseSpecState(readFileSync(specPath, 'utf8')))
		features.set(slug, hasFeatureFile(dir))
	}
	const statusBySlug = new Map([...states].map(([slug, s]) => [slug, s.status]))
	let violations: string[] = []
	for (const [slug, s] of states) {
		violations = violations.concat(checkSpec(slug, s, features.get(slug) ?? false))
		violations = violations.concat(checkComposition(slug, s, statusBySlug))
	}
	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`)
		return 1
	}
	process.stdout.write('spec states OK\n')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
