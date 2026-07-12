#!/usr/bin/env node
// manage-skill-dirs — config-authoring/skill-dirs' concrete curation engine. Declares and curates the
// OPT-IN extra skill-dir patterns the improve-skill validate engine scans on top of its two built-in
// default roots (skills/, .agents/skills/). It reads/writes ONLY `.agents/aced/skill-dirs.toml` —
// never a SKILL.md, spec.md, status, approval, or freeze.
//
// Operations:
//   --list                  list the two fixed default roots (each explained) + every custom pattern
//   --add <pattern>         validate + append a custom pattern (creates the config if absent)
//   --remove <pattern>      drop a custom pattern (no-op + unchanged when absent)
//   --edit <old> <new>      replace one custom pattern (rejects a malformed <new>)
//   --induce <path>         candidate patterns for a sample dir containing skill subdirectories
//                           (literal + a * generalization of a variable segment such as a plugin name)
//   --preview <pattern>     the SKILL.md file(s) a candidate pattern would discover, without persisting
//
// A pattern is a repo-relative directory pattern; `*` globs one segment, `**` globs zero or more
// segments (any depth). There is NO capture token — a skill's name comes from its own directory
// basename, not from the pattern, so a pattern containing `<` or `>` is malformed. Fixed default
// roots are implicit and cannot be curated here.
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SKILL_DIRS_CONFIG = '.agents/aced/skill-dirs.toml'
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

export interface SkillDirEntry {
	pattern: string
	kind: 'fixed' | 'custom'
	explanation: string
}

// The two fixed default roots (agentskills-standard), always scanned by validate and never curated here.
export const FIXED_SKILL_DIRS: SkillDirEntry[] = [
	{ pattern: 'skills/', kind: 'fixed', explanation: 'the repo-root public skill directory (agentskills-standard)' },
	{
		pattern: '.agents/skills/',
		kind: 'fixed',
		explanation: 'the repo-root private skill directory (agentskills-standard)',
	},
]

// ── Config read/write (a minimal TOML: the `anchors = [ … ]` string array) ──

export function parseSkillDirsToml(text: string): string[] {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text)
	if (!m) return []
	const out: string[] = []
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim())
	return out.filter((s) => s !== '')
}

export function readCustomSkillDirs(root: string): string[] {
	const file = join(root, SKILL_DIRS_CONFIG)
	if (!existsSync(file)) return []
	try {
		return parseSkillDirsToml(readFileSync(file, 'utf8'))
	} catch {
		return []
	}
}

export function serializeSkillDirs(patterns: string[]): string {
	if (patterns.length === 0) return 'anchors = []\n'
	return `anchors = [\n${patterns.map((p) => `  "${p}",`).join('\n')}\n]\n`
}

function writeCustomSkillDirs(root: string, patterns: string[]): void {
	const file = join(root, SKILL_DIRS_CONFIG)
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, serializeSkillDirs(patterns))
}

// ── Validation ──

// A pattern is well-formed iff it is repo-relative (no leading slash, no `..`) and every segment is a
// literal, `*`, or `**` (no capture token — `<` / `>` anywhere is malformed, no empty segment).
export function isValidPattern(pattern: string): boolean {
	const p = pattern.trim().replace(/\\/g, '/')
	if (p === '' || p.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(p)) return false
	const segs = p.replace(/^\/+|\/+$/g, '').split('/')
	if (segs.some((s) => s === '')) return false
	return segs.every((s) => s === '*' || s === '**' || !/[<>]/.test(s))
}

// True when a pattern names one of the two fixed default roots (implicit, not curated).
export function isFixedConvention(pattern: string): boolean {
	const p = pattern
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
	return p === 'skills' || p === '.agents/skills'
}

// ── list ──

export function listSkillDirs(root: string): SkillDirEntry[] {
	const custom = readCustomSkillDirs(root).map(
		(pattern): SkillDirEntry => ({ pattern, kind: 'custom', explanation: 'a declared extra skill-dir pattern' }),
	)
	return [...FIXED_SKILL_DIRS, ...custom]
}

// ── add / remove / edit ──

export type CrudResult =
	| { ok: true; changed: boolean; patterns: string[]; message: string }
	| { ok: false; reason: string }

export function addSkillDir(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	if (isFixedConvention(p)) return { ok: false, reason: 'that is a fixed default root — always scanned, never curated' }
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed skill-dir pattern' }
	const current = readCustomSkillDirs(root)
	if (current.includes(p)) return { ok: true, changed: false, patterns: current, message: 'already present' }
	const next = [...current, p]
	writeCustomSkillDirs(root, next)
	return { ok: true, changed: true, patterns: next, message: `added ${p}` }
}

export function removeSkillDir(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	const current = readCustomSkillDirs(root)
	if (!current.includes(p)) return { ok: true, changed: false, patterns: current, message: 'nothing was removed' }
	const next = current.filter((a) => a !== p)
	writeCustomSkillDirs(root, next)
	return { ok: true, changed: true, patterns: next, message: `removed ${p}` }
}

export function editSkillDir(root: string, oldPattern: string, newPattern: string): CrudResult {
	const oldP = oldPattern.trim()
	const newP = newPattern.trim()
	if (isFixedConvention(oldP)) return { ok: false, reason: 'cannot edit a fixed default root' }
	if (!isValidPattern(newP)) return { ok: false, reason: 'malformed replacement pattern' }
	if (isFixedConvention(newP)) return { ok: false, reason: 'replacement is a fixed default root' }
	const current = readCustomSkillDirs(root)
	if (!current.includes(oldP)) return { ok: false, reason: `no such custom pattern: ${oldP}` }
	const next = current.map((a) => (a === oldP ? newP : a))
	writeCustomSkillDirs(root, next)
	return { ok: true, changed: true, patterns: next, message: `edited ${oldP} -> ${newP}` }
}

// ── induce ──

export type InduceResult = { ok: true; candidates: string[] } | { ok: false; reason: string }

// From a sample path to a directory that CONTAINS skill subdirectories, offer a literal-directory
// candidate and a *-generalized candidate (the variable segment right before the sample dir's own
// name — e.g. a plugin name — replaced with a *). Rejects a path that is not a directory under the
// repo root.
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
	let generalized = rel
	if (segs.length >= 2) {
		const g = [...segs]
		g[segs.length - 2] = '*'
		generalized = g.join('/')
	}
	const candidates = generalized === rel ? [rel] : [rel, generalized]
	return { ok: true, candidates }
}

// ── preview ──

interface PreviewMatch {
	path: string
	name: string
}

export type PreviewResult = { ok: true; matches: PreviewMatch[] } | { ok: false; reason: string }

// Every dir reachable from `startDir` by descending zero or more levels (startDir itself included),
// skipping SKIP_DIRS. Backs the `**` segment (any-depth glob) below.
function collectDescendants(root: string, startDir: string): string[] {
	const out = [startDir]
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(join(root, startDir), { withFileTypes: true })
	} catch {
		return out
	}
	for (const e of entries) {
		if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
		out.push(...collectDescendants(root, startDir ? `${startDir}/${e.name}` : e.name))
	}
	return out
}

// Expand a pattern against the filesystem into the set of directories it matches (mirrors the
// improve-skill validate engine's own expansion). Does NOT read or persist anything to the config.
function expandPattern(root: string, pattern: string): string[] {
	const segs = pattern
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean)
	let frontier: string[] = ['']
	for (const seg of segs) {
		const next: string[] = []
		if (seg === '**') {
			for (const dir of frontier) next.push(...collectDescendants(root, dir))
			frontier = next
			continue
		}
		if (seg === '*') {
			for (const dir of frontier) {
				let entries: import('node:fs').Dirent[]
				try {
					entries = readdirSync(join(root, dir), { withFileTypes: true })
				} catch {
					continue
				}
				for (const e of entries) {
					if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
					next.push(dir ? `${dir}/${e.name}` : e.name)
				}
			}
			frontier = next
			continue
		}
		frontier = frontier.map((dir) => (dir ? `${dir}/${seg}` : seg))
	}
	return frontier
}

// A skill-dir pattern names a directory whose IMMEDIATE children are skill directories: preview
// probes `<matched-dir>/*/SKILL.md`, listing the SKILL.md file(s) that pattern would add to the scan
// — mirroring what the built-in defaults (skills/, .agents/skills/) already do.
export function previewPattern(root: string, pattern: string): PreviewResult {
	const p = pattern.trim()
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed candidate pattern' }
	const matches: PreviewMatch[] = []
	for (const matchedDir of expandPattern(root, p)) {
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(join(root, matchedDir), { withFileTypes: true })
		} catch {
			continue
		}
		for (const e of entries) {
			if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
			const skillFile = matchedDir ? `${matchedDir}/${e.name}/SKILL.md` : `${e.name}/SKILL.md`
			if (!existsSync(join(root, skillFile))) continue
			matches.push({ path: skillFile, name: e.name })
		}
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
		w('Skill-dir patterns the validate engine scans (fixed default roots are always scanned):')
		for (const a of listSkillDirs(root)) w(`  [${a.kind}] ${a.pattern} — ${a.explanation}`)
		return 0
	}
	if (argv.includes('--add')) {
		const r = addSkillDir(root, flag(argv, '--add') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--remove')) {
		const r = removeSkillDir(root, flag(argv, '--remove') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--edit')) {
		const i = argv.indexOf('--edit')
		const r = editSkillDir(root, argv[i + 1] ?? '', argv[i + 2] ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--induce')) {
		const r = inducePatterns(root, flag(argv, '--induce') ?? '')
		if (!r.ok) {
			w(`unusable: ${r.reason}`)
			return 1
		}
		w('Candidate skill-dir patterns:')
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
			w('This pattern matches no skill.')
			return 0
		}
		w('This pattern would discover:')
		for (const m of r.matches) w(`  ${m.path} (${m.name})`)
		return 0
	}

	w('usage: manage-skill-dirs --list | --add <p> | --remove <p> | --edit <old> <new> | --induce <path> | --preview <p>')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
