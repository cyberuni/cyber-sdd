#!/usr/bin/env node
// discover-plans — intake/plan-discovery's concrete frontmatter engine. Scans the SDD
// plan directory (.agents/plans) for *.plan.md mission briefs, parses each plan's
// frontmatter (name + the todos tally by status) plus the lead line of its `## NEXT`
// resume anchor, and emits a TOON list of the unretired / resumable missions.
//
// Recognition is location-bounded AND shape-confirmed:
//   - a file named `<cr-ref>.plan.md` sitting directly under <root>/.agents/plans/ is a
//     mission brief. A present plan brief is by definition UNRETIRED — the doctrine loop's
//     plan-retirement deletes a plan once its CR is done/merged AND distilled — so every
//     plan the scan finds is a resumable mission.
//   - shape: the file must carry a frontmatter block (the basic plan template intake
//     scaffolds). A `*.plan.md` with no frontmatter is skipped (a stray, not a brief).
// Sibling files in the same directory that are NOT `*.plan.md` (a combat log `*.log.jsonl`,
// a loose `*.md`) are never plan briefs and are ignored.
//
// Pure functions are exported for node:test; running the file directly drives the CLI.
// No dependencies (the repo's node-≥23.6 / no-deps convention). --format json for a flat
// array; default output is TOON (the token-efficient tabular form the gateway scans).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const TODO_STATUSES = new Set(['pending', 'in_progress', 'completed'])

/** The default mission dispatch status — the meaning of an absent top-level `status`. */
export const DEFAULT_PLAN_STATUS = 'active'

export interface PlanRecord {
	/** The CR ref — the plan's filename without the `.plan.md` suffix. */
	cr: string
	/** Frontmatter `name`, or '' when absent. */
	name: string
	/** Total todos in the brief. */
	total: number
	/** Todos with status `completed`. */
	completed: number
	/** Todos with status `in_progress`. */
	inProgress: number
	/** The mission dispatch flag — the top-level `status` (`active` when unset). */
	status: string
	/** The lead line of the `## NEXT` resume anchor, or '' when there is none. */
	next: string
}

export interface PlanFrontmatter {
	name: string
	/** The mission dispatch flag — the top-level `status` (`active` when unset). */
	status: string
	total: number
	completed: number
	inProgress: number
	pending: number
}

// ── Frontmatter parse (a minimal YAML subset — only the plan-brief schema) ──
// Extracts the leading `---` … `---` block and reads `name` plus the `todos:` list's tally
// by `status`. Returns null when there is no frontmatter block at all (a stray file).
export function parsePlanFrontmatter(text: string): PlanFrontmatter | null {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
	if (!m) return null
	const fm: PlanFrontmatter = {
		name: '',
		status: DEFAULT_PLAN_STATUS,
		total: 0,
		completed: 0,
		inProgress: 0,
		pending: 0,
	}
	let inTodos = false // currently inside the top-level `todos:` block
	for (const raw of m[1].split('\n')) {
		const line = raw.replace(/\r$/, '')
		if (line.trim() === '' || line.trim().startsWith('#')) continue
		const indent = line.length - line.trimStart().length
		const trimmed = line.trim()
		if (indent === 0) {
			inTodos = false
			const [key, ...rest] = trimmed.split(':')
			const value = rest.join(':').trim()
			if (key === 'name') fm.name = unquote(value)
			// The top-level `status` is the plan's dispatch flag (distinct from a todo's
			// `status`, which sits indented inside `todos:`). An empty value stays the default.
			else if (key === 'status') {
				const v = unquote(value)
				if (v !== '') fm.status = v
			} else if (key === 'todos') inTodos = true // value is empty; the list follows, indented
			continue
		}
		// Inside the todos list — count each item's status. A list item's keys sit at
		// indent ≥ 2 (`- id:` / `status:`); the status line is `status: <value>`.
		if (inTodos) {
			const sm = /^(?:-\s+)?status:\s*(.+)$/.exec(trimmed)
			if (sm) {
				const status = unquote(sm[1].trim())
				fm.total++
				if (status === 'completed') fm.completed++
				else if (status === 'in_progress') fm.inProgress++
				else if (status === 'pending') fm.pending++
			}
		}
	}
	return fm
}

function unquote(v: string): string {
	return v.replace(/^["']|["']$/g, '')
}

// ── The `## NEXT` resume anchor lead ──
// Find the `## NEXT` section (the resume anchor pause-mission writes) and return its first
// content line — the next concrete action — trimmed of markdown bullet/emphasis markers and
// capped. Returns '' when there is no NEXT section or it is empty. Body read is bounded to
// this one section; the rest of the body is never parsed.
export function nextLead(text: string): string {
	const lines = text.split('\n')
	let i = lines.findIndex((l) => /^##\s+NEXT\b/i.test(l.trim()))
	if (i === -1) return ''
	for (i += 1; i < lines.length; i++) {
		const l = lines[i].replace(/\r$/, '').trim()
		if (l === '') continue
		if (l.startsWith('#')) return '' // hit the next heading with no content between
		const cleaned = l
			.replace(/^[-*]\s+/, '')
			.replace(/\*\*/g, '')
			.trim()
		return cleaned.length > 200 ? `${cleaned.slice(0, 197)}...` : cleaned
	}
	return ''
}

// ── Scan ──
// List the plan-brief filenames (relative names) directly under <root>/.agents/plans. Only
// files ending `.plan.md` are briefs; a missing plans dir yields the empty set.
function discoverPlanFiles(root: string): string[] {
	const dir = join(root, '.agents', 'plans')
	if (!existsSync(dir)) return []
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return []
	}
	return entries
		.filter((e) => e.isFile() && e.name.endsWith('.plan.md'))
		.map((e) => e.name)
		.sort()
}

// ── Collect ──
// The list of resumable missions: every plan brief carrying a frontmatter block, keyed by
// its CR ref, with its todo tally and NEXT lead. Sorted by cr ref for stable output.
export function collectPlans(root: string): PlanRecord[] {
	const out: PlanRecord[] = []
	for (const name of discoverPlanFiles(root)) {
		let text: string
		try {
			text = readFileSync(join(root, '.agents', 'plans', name), 'utf8')
		} catch {
			continue
		}
		const fm = parsePlanFrontmatter(text)
		if (!fm) continue // no frontmatter — a stray, not a brief
		out.push({
			cr: name.replace(/\.plan\.md$/, ''),
			name: fm.name,
			total: fm.total,
			completed: fm.completed,
			inProgress: fm.inProgress,
			status: fm.status,
			next: nextLead(text),
		})
	}
	return out.sort((a, b) => (a.cr < b.cr ? -1 : a.cr > b.cr ? 1 : 0))
}

// ── Filter ──
// Narrow a plan set to one dispatch status — the opt-in selector the gateway's dispatch loop
// uses to build the approved queue. Records already carry a concrete `status` (unset → the
// default `active`), so a filter to `active` includes the unset briefs and a value no brief
// carries (an off-enum or simply-absent status) yields the empty set.
export function filterByStatus(plans: PlanRecord[], status: string): PlanRecord[] {
	return plans.filter((p) => p.status === status)
}

// ── Output ──
const COLUMNS = ['cr', 'name', 'total', 'completed', 'inProgress', 'status', 'next'] as const

// Quote a TOON field only when it carries the delimiter, a quote, or edge whitespace.
function toonField(v: string): string {
	if (v === '' || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function toToon(plans: PlanRecord[]): string {
	const header = `plans[${plans.length}]{${COLUMNS.join(',')}}:`
	const rows = plans.map((p) => `  ${COLUMNS.map((c) => toonField(String(p[c]))).join(',')}`)
	return [header, ...rows].join('\n')
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? (argv[argv.indexOf('--root') + 1] ?? '.') : '.'
	const format = argv.includes('--format') ? argv[argv.indexOf('--format') + 1] : 'toon'
	const statusFilter = argv.includes('--status') ? argv[argv.indexOf('--status') + 1] : undefined
	let plans = collectPlans(root)
	// Opt-in: `--status <value>` narrows to the dispatch queue; absent, no status filter is applied.
	if (statusFilter !== undefined) plans = filterByStatus(plans, statusFilter)
	const out = format === 'json' ? JSON.stringify(plans, null, 2) : toToon(plans)
	process.stdout.write(`${out}\n`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
