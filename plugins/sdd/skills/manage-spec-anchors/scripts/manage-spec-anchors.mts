#!/usr/bin/env node
// manage-spec-anchors — corpus/spec-anchors' concrete curation engine. Declares and curates the
// OPT-IN extra spec anchors that discover-specs scans on top of the three fixed conventions
// (ADR-0019). It reads/writes ONLY `.agents/sdd/spec-anchors.toml` — never a spec.md, status,
// approval, or freeze.
//
// Operations:
//   --list                  list the three fixed anchors (each explained) + every custom anchor
//   --add <pattern>         validate + append a custom anchor (creates the config if absent)
//   --remove <pattern>      drop a custom anchor (no-op + unchanged when absent)
//   --edit <old> <new>      replace one custom anchor (rejects a malformed <new>)
//   --induce <path>         candidate patterns for a sample spec dir (literal + <project> capture)
//   --preview <pattern>     the project(s) a candidate pattern would discover, without persisting
//
// A pattern is a repo-relative directory pattern; `*` globs one segment, `<project>` globs AND
// captures a segment as the spec name. Fixed conventions are implicit and cannot be curated here.
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ANCHORS_CONFIG = '.agents/sdd/spec-anchors.toml'
const LIFECYCLE_STATUSES = new Set(['draft', 'approved', 'implemented', 'deprecated'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

export interface AnchorEntry {
	pattern: string
	kind: 'fixed' | 'custom'
	explanation: string
}

// The three fixed conventions, always scanned by discovery and never curated here.
export const FIXED_ANCHORS: AnchorEntry[] = [
	{ pattern: '.agents/spec/', kind: 'fixed', explanation: 'the repo-root single-project spec' },
	{
		pattern: '.agents/specs/<project>/',
		kind: 'fixed',
		explanation: 'each repo-root multi-project spec (the folder names the project)',
	},
	{
		pattern: '<project-path>/.agents/spec/',
		kind: 'fixed',
		explanation: "a nested project's hoisted spec, at any depth",
	},
]

// ── Config read/write (a minimal TOML: the `anchors = [ … ]` string array) ──

export function parseAnchorsToml(text: string): string[] {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text)
	if (!m) return []
	const out: string[] = []
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim())
	return out.filter((s) => s !== '')
}

export function readCustomAnchors(root: string): string[] {
	const file = join(root, ANCHORS_CONFIG)
	if (!existsSync(file)) return []
	try {
		return parseAnchorsToml(readFileSync(file, 'utf8'))
	} catch {
		return []
	}
}

export function serializeAnchors(patterns: string[]): string {
	if (patterns.length === 0) return 'anchors = []\n'
	return `anchors = [\n${patterns.map((p) => `  "${p}",`).join('\n')}\n]\n`
}

function writeCustomAnchors(root: string, patterns: string[]): void {
	const file = join(root, ANCHORS_CONFIG)
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, serializeAnchors(patterns))
}

// ── Validation ──

// A pattern is well-formed iff it is repo-relative (no leading slash, no `..`) and every segment is
// a literal, `*`, or the `<project>` capture token (no other `<…>` token, no empty segment).
export function isValidPattern(pattern: string): boolean {
	const p = pattern.trim().replace(/\\/g, '/')
	if (p === '' || p.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(p)) return false
	const segs = p.replace(/^\/+|\/+$/g, '').split('/')
	if (segs.some((s) => s === '')) return false
	return segs.every((s) => s === '*' || s === '<project>' || !/[<>]/.test(s))
}

// True when a pattern names one of the three fixed conventions (which are implicit, not curated).
export function isFixedConvention(pattern: string): boolean {
	const p = pattern
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
	return (
		p === '.agents/spec' ||
		p === '.agents/specs/<project>' ||
		p === '.agents/specs/*' ||
		p.endsWith('/.agents/spec') ||
		p.endsWith('/.agents/specs/<project>')
	)
}

// ── list ──

export function listAnchors(root: string): AnchorEntry[] {
	const custom = readCustomAnchors(root).map(
		(pattern): AnchorEntry => ({ pattern, kind: 'custom', explanation: 'a declared extra anchor' }),
	)
	return [...FIXED_ANCHORS, ...custom]
}

// ── add / remove / edit ──

export type CrudResult =
	| { ok: true; changed: boolean; anchors: string[]; message: string }
	| { ok: false; reason: string }

export function addAnchor(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	if (isFixedConvention(p)) return { ok: false, reason: 'that is a fixed convention — always scanned, never curated' }
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed anchor pattern' }
	const current = readCustomAnchors(root)
	if (current.includes(p)) return { ok: true, changed: false, anchors: current, message: 'already present' }
	const next = [...current, p]
	writeCustomAnchors(root, next)
	return { ok: true, changed: true, anchors: next, message: `added ${p}` }
}

export function removeAnchor(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	const current = readCustomAnchors(root)
	if (!current.includes(p)) return { ok: true, changed: false, anchors: current, message: 'nothing was removed' }
	const next = current.filter((a) => a !== p)
	writeCustomAnchors(root, next)
	return { ok: true, changed: true, anchors: next, message: `removed ${p}` }
}

export function editAnchor(root: string, oldPattern: string, newPattern: string): CrudResult {
	const oldP = oldPattern.trim()
	const newP = newPattern.trim()
	if (isFixedConvention(oldP)) return { ok: false, reason: 'cannot edit a fixed convention' }
	if (!isValidPattern(newP)) return { ok: false, reason: 'malformed replacement pattern' }
	if (isFixedConvention(newP)) return { ok: false, reason: 'replacement is a fixed convention' }
	const current = readCustomAnchors(root)
	if (!current.includes(oldP)) return { ok: false, reason: `no such custom anchor: ${oldP}` }
	const next = current.map((a) => (a === oldP ? newP : a))
	writeCustomAnchors(root, next)
	return { ok: true, changed: true, anchors: next, message: `edited ${oldP} -> ${newP}` }
}

// ── induce ──

export type InduceResult = { ok: true; candidates: string[] } | { ok: false; reason: string }

// From a sample path to a spec's directory, offer a literal-directory candidate and a <project>-token
// generalization (deepest segment replaced with the capture). Rejects a path that is not a directory
// under the repo root.
export function inducePatterns(root: string, samplePath: string): InduceResult {
	const rel = samplePath
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
	if (rel === '' || /(^|\/)\.\.(\/|$)/.test(rel)) return { ok: false, reason: 'path is not repo-relative' }
	let ok = false
	try {
		ok = statSync(join(root, rel)).isDirectory()
	} catch {
		ok = false
	}
	if (!ok) return { ok: false, reason: `sample path does not resolve to a directory under the repo: ${rel}` }
	const segs = rel.split('/')
	const generalized = [...segs.slice(0, -1), '<project>'].join('/')
	const candidates = generalized === rel ? [rel] : [rel, generalized]
	return { ok: true, candidates }
}

// ── preview ──

interface PreviewMatch {
	path: string
	name: string
}

export type PreviewResult = { ok: true; matches: PreviewMatch[] } | { ok: false; reason: string }

// Expand a pattern against the filesystem (mirrors discover-specs' expandAnchor), then keep only the
// dirs holding a spec.md whose frontmatter status is in the lifecycle enum — the specs discovery
// would actually surface. Does NOT read or persist anything to the config.
export function previewPattern(root: string, pattern: string): PreviewResult {
	const p = pattern.trim()
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed candidate pattern' }
	const segs = p
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean)
	let frontier: { dir: string; capturedName?: string }[] = [{ dir: '' }]
	for (const seg of segs) {
		const next: { dir: string; capturedName?: string }[] = []
		const isGlob = seg === '*' || seg === '<project>'
		for (const node of frontier) {
			if (isGlob) {
				let entries: import('node:fs').Dirent[]
				try {
					entries = readdirSync(join(root, node.dir), { withFileTypes: true })
				} catch {
					continue
				}
				for (const e of entries) {
					if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
					next.push({
						dir: node.dir ? `${node.dir}/${e.name}` : e.name,
						capturedName: seg === '<project>' ? e.name : node.capturedName,
					})
				}
			} else {
				next.push({ dir: node.dir ? `${node.dir}/${seg}` : seg, capturedName: node.capturedName })
			}
		}
		frontier = next
	}
	const matches: PreviewMatch[] = []
	for (const node of frontier) {
		const rel = node.dir ? `${node.dir}/spec.md` : 'spec.md'
		let status: string | undefined
		try {
			status = /(^|\n)status:\s*["']?([a-z]+)/.exec(readFileSync(join(root, rel), 'utf8'))?.[2]
		} catch {
			continue
		}
		if (!status || !LIFECYCLE_STATUSES.has(status)) continue
		matches.push({ path: node.dir, name: node.capturedName ?? node.dir.split('/').pop() ?? node.dir })
	}
	matches.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
	return { ok: true, matches }
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const w = (s: string) => process.stdout.write(`${s}\n`)

	if (argv.includes('--list')) {
		w('Spec anchors discovery scans (fixed conventions are always scanned):')
		for (const a of listAnchors(root)) w(`  [${a.kind}] ${a.pattern} — ${a.explanation}`)
		return 0
	}
	if (argv.includes('--add')) {
		const r = addAnchor(root, flag(argv, '--add') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--remove')) {
		const r = removeAnchor(root, flag(argv, '--remove') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--edit')) {
		const i = argv.indexOf('--edit')
		const r = editAnchor(root, argv[i + 1] ?? '', argv[i + 2] ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--induce')) {
		const r = inducePatterns(root, flag(argv, '--induce') ?? '')
		if (!r.ok) {
			w(`unusable: ${r.reason}`)
			return 1
		}
		w('Candidate anchor patterns:')
		for (const c of r.candidates) w(`  ${c}`)
		return 0
	}
	if (argv.includes('--preview')) {
		const r = previewPattern(root, flag(argv, '--preview') ?? '')
		if (!r.ok) {
			w(`invalid: ${r.reason}`)
			return 1
		}
		if (r.matches.length === 0) {
			w('This pattern matches no project.')
			return 0
		}
		w('This pattern would discover:')
		for (const m of r.matches) w(`  ${m.path} (${m.name})`)
		return 0
	}

	w(
		'usage: manage-spec-anchors --list | --add <p> | --remove <p> | --edit <old> <new> | --induce <path> | --preview <p>',
	)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
