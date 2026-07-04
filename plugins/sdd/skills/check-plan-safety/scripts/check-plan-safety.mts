#!/usr/bin/env node
// check-plan-safety — the concrete guard engine for the plan brief's safe-to-publish floor.
// Scans the SDD plan directory (.agents/plans) for the *.md handoff artifacts a mission commits
// — the `<cr-ref>.plan.md` brief and its sibling design docs — and flags any machine-local
// reference that must never enter git history in a tracked, portable artifact:
//
//   - a home-directory absolute path (`/home/<user>/…`, `/Users/<user>/…`, `C:\Users\<user>\…`)
//     — carries the OS username (privacy) and resolves on no other checkout (portability), and
//   - a shell expansion of the user's home / identity (`$HOME`, `${HOME}`, `$USER`, `%USERPROFILE%`).
//
// A bare `~/` is deliberately NOT flagged: it carries no username and legitimately appears in
// design prose describing home-rooted feature paths (e.g. a tool's own `~/.<tool>/` data root).
// The floor mirrors the combat-log's "never committed: … absolute paths, OS usernames" rule
// (combat-log-governance), extended from the ledger to the plan brief.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies (the repo's node-≥23.6 / no-deps convention). Read-only: it writes nothing.
// Default output is TOON (the token-efficient tabular form); --format json for a flat array.
// --check is the CI guard: exit non-zero iff any leak is found.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface Leak {
	/** Repo-relative path of the file the leak sits in. */
	file: string
	/** 1-indexed line number. */
	line: number
	/** The leak class — `home-abs-path`, `env-home`, or `env-user`. */
	kind: string
	/** The matched fragment (capped), so a reader can locate and scrub it. */
	token: string
}

// The machine-local reference patterns. Each carries the leak `kind` it detects. Global flag so a
// single line with several leaks reports each. USER/HOME env forms use a negative lookahead so
// `$HOMEBREW` / `$USERDATA` (a different variable that merely starts with the name) is not flagged.
export const LEAK_PATTERNS: { kind: string; re: RegExp }[] = [
	// /home/<user>/… and /Users/<user>/… — the home-abs path the leak class is named for.
	// Also catches a forward-slash Windows profile (`C:/Users/…` contains `/Users/…`).
	{ kind: 'home-abs-path', re: /\/(?:home|Users)\/[^\s'"`)\]]+/g },
	// Backslash Windows user profile — C:\Users\<user>\… (the forward-slash form is caught above).
	{ kind: 'home-abs-path', re: /[A-Za-z]:\\Users\\[^\s'"`)\]]+/g },
	{ kind: 'env-home', re: /\$\{?HOME\}?(?![A-Za-z])|%USERPROFILE%|%HOMEPATH%/g },
	{ kind: 'env-user', re: /\$\{?USER\}?(?![A-Za-z])|%USERNAME%/g },
]

/** Cap a matched token so a pathological long path does not blow up the report. */
function capToken(t: string): string {
	return t.length > 80 ? `${t.slice(0, 77)}...` : t
}

// ── Scan one file's text ──
// Every machine-local reference in `text`, tagged with `file` (the repo-relative path the caller
// supplies) and its 1-indexed line. Lines are scanned independently; a line with N leaks yields N.
export function scanText(file: string, text: string): Leak[] {
	const out: Leak[] = []
	const lines = text.split('\n')
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].replace(/\r$/, '')
		for (const { kind, re } of LEAK_PATTERNS) {
			re.lastIndex = 0
			let m = re.exec(line)
			while (m !== null) {
				out.push({ file, line: i + 1, kind, token: capToken(m[0]) })
				if (m.index === re.lastIndex) re.lastIndex++ // guard against a zero-width match
				m = re.exec(line)
			}
		}
	}
	return out
}

// ── Scan the plan directory ──
// The handoff artifacts a mission commits: every `*.md` sitting directly under <root>/.agents/plans
// — the `<cr-ref>.plan.md` brief plus any sibling design doc. A missing plans dir yields no leaks.
function planFiles(root: string): string[] {
	const dir = join(root, '.agents', 'plans')
	if (!existsSync(dir)) return []
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return []
	}
	return entries
		.filter((e) => e.isFile() && e.name.endsWith('.md'))
		.map((e) => e.name)
		.sort()
}

// Collect leaks across the plan directory (default) or a caller-named file set (`--path`). File
// paths in the returned leaks are repo-relative when scanning the plan dir, and as-passed for
// explicit `--path` targets. Sorted by file then line for stable output.
export function collectLeaks(root: string, paths?: string[]): Leak[] {
	const targets: { rel: string; abs: string }[] = paths
		? paths.map((p) => ({ rel: p, abs: p }))
		: planFiles(root).map((name) => ({
				rel: join('.agents', 'plans', name),
				abs: join(root, '.agents', 'plans', name),
			}))
	const out: Leak[] = []
	for (const { rel, abs } of targets) {
		let text: string
		try {
			text = readFileSync(abs, 'utf8')
		} catch {
			continue
		}
		out.push(...scanText(rel, text))
	}
	return out.sort((a, b) => (a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line - b.line))
}

// ── Output ──
const COLUMNS = ['file', 'line', 'kind', 'token'] as const

function toonField(v: string): string {
	if (v === '' || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function toToon(leaks: Leak[]): string {
	const header = `leaks[${leaks.length}]{${COLUMNS.join(',')}}:`
	const rows = leaks.map((l) => `  ${COLUMNS.map((c) => toonField(String(l[c]))).join(',')}`)
	return [header, ...rows].join('\n')
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? (argv[argv.indexOf('--root') + 1] ?? '.') : '.'
	const format = argv.includes('--format') ? argv[argv.indexOf('--format') + 1] : 'toon'
	const check = argv.includes('--check')
	// `--path <file>` may repeat to scan an explicit file set (e.g. the one brief a checkpoint
	// is about to commit) instead of the whole plan directory.
	const paths: string[] = []
	for (let i = 0; i < argv.length; i++) if (argv[i] === '--path' && argv[i + 1]) paths.push(argv[++i])

	const leaks = collectLeaks(root, paths.length ? paths : undefined)
	const out = format === 'json' ? JSON.stringify(leaks, null, 2) : toToon(leaks)
	process.stdout.write(`${out}\n`)
	// --check is the CI guard: any leak fails. Audit mode (default) always exits 0.
	return check && leaks.length > 0 ? 1 : 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
