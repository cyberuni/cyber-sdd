#!/usr/bin/env node
// manage-ignore — the concrete curation engine for `.agents/sdd/.sddignore`, the optional
// gitignore-syntax file `resolve-tracking` consults to decide whether an artifact is tracked or
// ignored. It reads/writes ONLY `.agents/sdd/.sddignore` — never a spec.md, status, approval, or
// freeze.
//
// Operations:
//   --list                  print every rule in file order (a missing file prints nothing)
//   --add <pattern>         validate + append a well-formed gitignore rule (creates the file)
//   --remove <pattern>      drop a matching rule, preserving the order of the rest (absent = no-op)
//   --induce <path>         offer a literal-path candidate + a ** generalization (persists nothing)
//   --preview <pattern>     list the working-tree paths the pattern would ignore / re-track
//
// `.sddignore` is gitignore syntax: a plain pattern => ignored, a leading `!` => re-included, `#`
// comments and blank lines allowed. Order is MEANINGFUL (last-match-wins), so rules are NEVER
// re-sorted — add appends, remove keeps the surviving order.
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps
// (the repo's node-≥23.6 convention).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const IGNORE_FILE = '.agents/sdd/.sddignore'
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

// ── the ignore file (raw-line preserving so order + comments survive CRUD) ──

// Split into lines, dropping the single trailing empty produced by a final newline.
export function splitLines(text: string): string[] {
	const lines = text.split('\n')
	if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
	return lines
}

export function readIgnoreLines(root: string): string[] {
	const file = join(root, IGNORE_FILE)
	if (!existsSync(file)) return []
	try {
		return splitLines(readFileSync(file, 'utf8'))
	} catch {
		return []
	}
}

function writeIgnoreLines(root: string, lines: string[]): void {
	const file = join(root, IGNORE_FILE)
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, lines.length === 0 ? '' : `${lines.join('\n')}\n`)
}

// A line is a rule when it is not blank and not a `#` comment. `!re-track` rules are rules.
export function isRuleLine(line: string): boolean {
	const t = line.trim()
	return t !== '' && !t.startsWith('#')
}

// ── list ──

// Every rule in file order; comments and blank lines are omitted (a missing file yields []).
export function listRules(root: string): string[] {
	return readIgnoreLines(root)
		.filter(isRuleLine)
		.map((l) => l.trim())
}

// ── validation ──

// True when the bracket expression opened at some `[` is never closed by a later `]`.
function hasUnclosedBracket(s: string): boolean {
	let i = 0
	while (i < s.length) {
		if (s[i] === '\\') {
			i += 2
			continue
		}
		if (s[i] === '[') {
			const close = s.indexOf(']', i + 1)
			if (close === -1) return true
			i = close + 1
			continue
		}
		i++
	}
	return false
}

// A well-formed gitignore pattern: non-empty after stripping a leading `!` and surrounding space,
// not a comment, and with no unclosed `[…]` bracket expression.
export function isValidPattern(pattern: string): boolean {
	let s = pattern
	if (s.startsWith('!')) s = s.slice(1)
	s = s.replace(/^\s+|\s+$/g, '')
	if (s === '' || s.startsWith('#')) return false
	if (hasUnclosedBracket(s)) return false
	return true
}

// ── add / remove (CRUD, order-preserving) ──

export type CrudResult =
	| { ok: true; changed: boolean; rules: string[]; message: string }
	| { ok: false; reason: string }

// Append a well-formed rule after the existing lines (creating the file when absent). Existing
// order is preserved; a duplicate is a no-op.
export function addRule(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed gitignore pattern' }
	const lines = readIgnoreLines(root)
	if (lines.some((l) => l.trim() === p)) {
		return { ok: true, changed: false, rules: listRules(root), message: 'already present' }
	}
	const next = [...lines, p]
	writeIgnoreLines(root, next)
	return { ok: true, changed: true, rules: next.filter(isRuleLine).map((l) => l.trim()), message: `added ${p}` }
}

// Drop every line whose rule text equals the pattern, keeping the order of the rest. Removing an
// absent rule leaves the file byte-for-byte unchanged.
export function removeRule(root: string, pattern: string): CrudResult {
	const p = pattern.trim()
	const lines = readIgnoreLines(root)
	const next = lines.filter((l) => l.trim() !== p)
	if (next.length === lines.length) {
		return { ok: true, changed: false, rules: listRules(root), message: 'nothing was removed' }
	}
	writeIgnoreLines(root, next)
	return { ok: true, changed: true, rules: next.filter(isRuleLine).map((l) => l.trim()), message: `removed ${p}` }
}

// ── induce ──

export type InduceResult = { ok: true; candidates: string[] } | { ok: false; reason: string }

// From a sample repo-relative path, offer a literal-path candidate and a `**` generalization that
// ignores the same basename anywhere in the tree. Persists nothing; refuses a path not under the
// repo (leading slash or a `..` escape).
export function inducePatterns(_root: string, samplePath: string): InduceResult {
	const normalized = samplePath.trim().replace(/\\/g, '/')
	if (normalized.startsWith('/')) return { ok: false, reason: 'path is not repo-relative (absolute)' }
	const rel = normalized.replace(/\/+$/g, '')
	if (rel === '' || /(^|\/)\.\.(\/|$)/.test(rel)) {
		return { ok: false, reason: 'path is not repo-relative' }
	}
	const base = rel.split('/').pop() ?? rel
	const generalized = `**/${base}`
	const candidates = generalized === rel ? [rel] : [rel, generalized]
	return { ok: true, candidates }
}

// ── preview ──

export type PreviewResult = { ok: true; negated: boolean; matches: string[] } | { ok: false; reason: string }

// Compile one gitignore pattern (already `!`-stripped) to a full-match RegExp. `**` spans
// separators, `*`/`?` stay within one segment, a leading `/` (or an internal `/`) anchors to the
// repo root, a trailing `/` marks a dir. Every match also covers the node's descendants.
export function gitignoreToRegExp(pattern: string): RegExp {
	let pat = pattern
	if (pat.endsWith('/')) pat = pat.slice(0, -1) // trailing-slash dir marker
	let anchored = pat.startsWith('/')
	if (anchored) pat = pat.slice(1)
	if (pat.includes('/')) anchored = true // an internal separator anchors to root
	let body = ''
	for (let i = 0; i < pat.length; i++) {
		const c = pat[i]
		if (c === '*') {
			if (pat[i + 1] === '*') {
				i++
				if (pat[i + 1] === '/') {
					i++
					body += '(?:.*/)?' // `**/` spans zero or more directory segments
				} else {
					body += '.*' // `**` spans separators
				}
			} else {
				body += '[^/]*' // `*` stays within a segment
			}
		} else if (c === '?') {
			body += '[^/]'
		} else if (c === '[') {
			let j = i + 1
			let cls = '['
			if (pat[j] === '!') {
				cls += '^'
				j++
			}
			while (j < pat.length && pat[j] !== ']') {
				cls += /[\\^\]]/.test(pat[j]) ? `\\${pat[j]}` : pat[j]
				j++
			}
			cls += ']'
			body += cls
			i = j
		} else {
			body += c.replace(/[.+^${}()|\\]/g, '\\$&')
		}
	}
	const prefix = anchored ? '^' : '^(?:.*/)?' // unanchored patterns match at any depth
	return new RegExp(`${prefix}${body}(?:/.*)?$`) // also cover everything below the matched node
}

export function matchesPattern(pattern: string, path: string): boolean {
	const body = pattern.startsWith('!') ? pattern.slice(1) : pattern
	return gitignoreToRegExp(body).test(path)
}

// Every repo-relative path (files and dirs) reachable from the root, skipping SKIP_DIRS.
function walkTree(root: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(join(root, rel), { withFileTypes: true })
		} catch {
			return
		}
		for (const e of entries) {
			if (SKIP_DIRS.has(e.name)) continue
			const child = rel ? `${rel}/${e.name}` : e.name
			out.push(child)
			if (e.isDirectory()) walk(child)
		}
	}
	walk('')
	return out.sort()
}

// List the working-tree paths a candidate pattern would ignore. For a `!pattern`, the same paths
// are the ones it would RE-TRACK (re-include). Persists nothing; a malformed pattern is refused.
export function previewPattern(root: string, pattern: string): PreviewResult {
	const p = pattern.trim()
	if (!isValidPattern(p)) return { ok: false, reason: 'malformed gitignore pattern' }
	const negated = p.startsWith('!')
	const matches = walkTree(root).filter((path) => matchesPattern(p, path))
	return { ok: true, negated, matches }
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
		for (const rule of listRules(root)) w(rule)
		return 0
	}
	if (argv.includes('--add')) {
		const r = addRule(root, flag(argv, '--add') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--remove')) {
		const r = removeRule(root, flag(argv, '--remove') ?? '')
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--induce')) {
		const r = inducePatterns(root, flag(argv, '--induce') ?? '')
		if (!r.ok) {
			w(`unusable: ${r.reason}`)
			return 1
		}
		w('Candidate ignore patterns:')
		for (const c of r.candidates) w(`  ${c}`)
		return 0
	}
	if (argv.includes('--preview')) {
		const r = previewPattern(root, flag(argv, '--preview') ?? '')
		if (!r.ok) {
			w(`invalid: ${r.reason}`)
			return 1
		}
		const verb = r.negated ? 're-track' : 'ignore'
		if (r.matches.length === 0) {
			w(`This pattern would ${verb} no path.`)
			return 0
		}
		w(`This pattern would ${verb}:`)
		for (const m of r.matches) w(`  ${m}`)
		return 0
	}

	w('usage: manage-ignore --list | --add <p> | --remove <p> | --induce <path> | --preview <p>')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
