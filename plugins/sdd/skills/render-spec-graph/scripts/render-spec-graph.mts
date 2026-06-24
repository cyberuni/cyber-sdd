#!/usr/bin/env node
// Render the spec DAG (a set of spec.md folders linked by `blocked-by`) to a
// derived graph.md (Mermaid + node table). Pure functions are exported for
// node:test; running the file directly drives the CLI. No dependencies — plain
// node strips the TypeScript types (v23.6+).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export interface SpecNode {
	slug: string
	status: string
	blockedBy: string[]
	type: string | null
	subtasks: string[]
}

function stripQuotes(s: string): string {
	return s.replace(/^["']|["']$/g, '').trim()
}

function extractFrontmatter(text: string): string {
	const m = /^---\n([\s\S]*?)\n---/.exec(text)
	return m ? m[1] : ''
}

function parseList(lines: string[], i: number, rest: string): string[] {
	const out: string[] = []
	if (rest.startsWith('[')) {
		const inner = rest.replace(/^\[|\]$/g, '').trim()
		if (inner)
			for (const part of inner.split(',')) {
				const v = stripQuotes(part.trim())
				if (v) out.push(v)
			}
	} else if (rest) {
		out.push(stripQuotes(rest))
	} else {
		for (let j = i + 1; j < lines.length; j++) {
			const itemM = /^\s*-\s+(.+)$/.exec(lines[j])
			if (!itemM) break
			out.push(stripQuotes(itemM[1].trim()))
		}
	}
	return out
}

export function parseFrontmatter(text: string): {
	status: string
	blockedBy: string[]
	type: string | null
	subtasks: string[]
} {
	const lines = extractFrontmatter(text).split('\n')
	let status = ''
	let type: string | null = null
	let blockedBy: string[] = []
	let subtasks: string[] = []
	for (let i = 0; i < lines.length; i++) {
		const statusM = /^status:\s*(.*)$/.exec(lines[i])
		if (statusM) {
			status = stripQuotes(statusM[1].trim())
			continue
		}
		const typeM = /^type:\s*(.*)$/.exec(lines[i])
		if (typeM) {
			type = stripQuotes(typeM[1].trim()) || null
			continue
		}
		const blockedM = /^blocked-by:\s*(.*)$/.exec(lines[i])
		if (blockedM) {
			blockedBy = parseList(lines, i, blockedM[1].trim())
			continue
		}
		const subM = /^subtasks:\s*(.*)$/.exec(lines[i])
		if (subM) {
			subtasks = parseList(lines, i, subM[1].trim())
		}
	}
	return { status, blockedBy, type, subtasks }
}

export function collectSpecs(root: string): SpecNode[] {
	const nodes: SpecNode[] = []

	function walk(dir: string): void {
		const specPath = join(dir, 'spec.md')
		if (existsSync(specPath)) {
			const slug = relative(root, dir).split(sep).join('/')
			const { status, blockedBy, type, subtasks } = parseFrontmatter(readFileSync(specPath, 'utf8'))
			nodes.push({ slug, status, blockedBy, type, subtasks })
		}

		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue
			walk(join(dir, entry.name))
		}
	}

	walk(root)
	nodes.sort((a, b) => a.slug.localeCompare(b.slug))
	return nodes
}

export function detectCycle(nodes: SpecNode[]): string[] | null {
	const adj = new Map<string, string[]>()
	for (const n of nodes) adj.set(n.slug, n.blockedBy)
	const color = new Map<string, number>() // 0 white, 1 gray, 2 black
	for (const n of nodes) color.set(n.slug, 0)
	const stack: string[] = []
	let cycle: string[] | null = null

	function dfs(u: string): boolean {
		color.set(u, 1)
		stack.push(u)
		for (const v of adj.get(u) ?? []) {
			if (!adj.has(v)) continue // edge to an unknown spec — ignore for cycle check
			if (color.get(v) === 1) {
				cycle = stack.slice(stack.indexOf(v)).concat(v)
				return true
			}
			if (color.get(v) === 0 && dfs(v)) return true
		}
		stack.pop()
		color.set(u, 2)
		return false
	}

	for (const n of nodes) if (color.get(n.slug) === 0 && dfs(n.slug)) return cycle
	return null
}

// Global tree invariants for the composition (project -> feature via subtasks):
// every subtask resolves to a known feature, no feature has two parents, and no
// feature is orphaned. Run over the full spec set.
export function checkComposition(nodes: SpecNode[]): string[] {
	const v: string[] = []
	const bySlug = new Map(nodes.map((n) => [n.slug, n]))
	const parents = new Map<string, string[]>()
	for (const n of nodes)
		for (const child of n.subtasks) {
			const target = bySlug.get(child)
			if (!target) v.push(`${n.slug}: subtask "${child}" does not resolve to a known spec`)
			else if (target.type !== 'feature') v.push(`${n.slug}: subtask "${child}" is not type:feature`)
			parents.set(child, [...(parents.get(child) ?? []), n.slug])
		}
	for (const [child, owners] of parents)
		if (owners.length > 1)
			v.push(`${child}: claimed by ${owners.length} projects (${owners.join(', ')}) — a feature has one parent`)
	for (const n of nodes)
		if (n.type === 'feature' && n.status !== 'deprecated' && !parents.has(n.slug))
			v.push(`${n.slug}: type:feature but no parent lists it (orphan)`)
	return v.sort()
}

export function renderComposition(nodes: SpecNode[]): string {
	const owners = nodes.filter((n) => n.subtasks.length > 0).sort((a, b) => a.slug.localeCompare(b.slug))
	const edges = owners.flatMap((p) => [...p.subtasks].sort().map((c) => `  ${p.slug} --> ${c}`))
	const projects = nodes.filter((n) => n.type === 'project').sort((a, b) => a.slug.localeCompare(b.slug))
	const standalone = projects.filter((p) => p.subtasks.length === 0).map((p) => `  ${p.slug}`)
	const body = [...standalone, ...edges].join('\n') || '  %% no typed projects yet'
	return `\`\`\`mermaid
graph TD
${body}
\`\`\``
}

export function renderGraph(nodes: SpecNode[]): string {
	const edges: string[] = []
	const touched = new Set<string>()
	for (const n of nodes)
		for (const b of n.blockedBy) {
			edges.push(`  ${b} --> ${n.slug}`)
			touched.add(n.slug)
			touched.add(b)
		}
	edges.sort()
	const bare = nodes
		.map((n) => n.slug)
		.filter((s) => !touched.has(s))
		.sort()
		.map((s) => `  ${s}`)

	const rows = [...nodes]
		.sort((a, b) => a.slug.localeCompare(b.slug))
		.map((n) => {
			const blocked = n.blockedBy.length ? n.blockedBy.map((b) => `\`${b}\``).join(', ') : '—'
			return `| \`${n.slug}\` | ${n.type ?? '—'} | ${blocked} | ${n.status || '—'} |`
		})

	return `# Spec DAG

The dependency graph across all specs in \`artifacts/specs/\`. Each node is a spec folder (the slug is its root-relative path); each edge \`A --> B\` means **A blocks B** (B declares \`blocked-by: [A]\`).

This is a **derived view** generated by the \`render-spec-graph\` skill — \`blocked-by\` and \`subtasks\` in each \`spec.md\` are the source of truth. Do not hand-edit; regenerate when edges change. Execution order is the topological sort of this graph; there is no authored \`priority\`.

\`\`\`mermaid
graph TD
${[...bare, ...edges].join('\n')}
\`\`\`

## Composition

Containment from \`subtasks\`: each edge \`A --> B\` means **parent A owns feature B** (a parent is a project or a feature — features nest). Distinct from the dependency graph above; a feature has exactly one parent.

${renderComposition(nodes)}

## Nodes

| Spec | type | blocked-by | status |
|---|---|---|---|
${rows.join('\n')}
`
}

interface Args {
	root: string
	out?: string
	check: boolean
}

function parseArgs(argv: string[]): Args {
	const args: Args = { root: 'artifacts/specs', check: false }
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--root') args.root = argv[++i]
		else if (argv[i] === '--out') args.out = argv[++i]
		else if (argv[i] === '--check') args.check = true
	}
	return args
}

export function main(argv: string[]): number {
	const args = parseArgs(argv)
	const out = args.out ?? join(args.root, 'graph.md')
	let nodes: SpecNode[]
	try {
		nodes = collectSpecs(args.root)
	} catch (e) {
		console.error(`cannot read specs under ${args.root}: ${(e as Error).message}`)
		return 1
	}
	const cycle = detectCycle(nodes)
	if (cycle) {
		console.error(`cycle detected in blocked-by: ${cycle.join(' -> ')}`)
		return 1
	}
	const composition = checkComposition(nodes)
	if (composition.length) {
		for (const line of composition) console.error(`✗ ${line}`)
		return 1
	}
	const content = renderGraph(nodes)
	if (args.check) {
		const current = existsSync(out) ? readFileSync(out, 'utf8') : null
		if (current === content) return 0
		console.error(current === null ? `${out} is missing` : `${out} is stale; regenerate with render-spec-graph`)
		return 1
	}
	writeFileSync(out, content)
	process.stdout.write(`wrote ${out} (${nodes.length} specs)\n`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
