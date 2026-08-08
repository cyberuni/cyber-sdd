#!/usr/bin/env node
// check-retired-terms — corpus-wide sweep for survivors of a retired path, directory, or naming
// convention. A design decision retires a term (a path, a convention) and records the retirement
// once in the registry (.agents/sdd/retired-terms.toml); this engine reads that registry, scans
// every git-tracked file in the repo — not only the node someone happened to touch — and reports
// every literal, case-sensitive occurrence as a violation, with the replacement to use.
//
// It is the corpus-wide, declared-data sibling of check:metaphor-free (packages/cyberlegion/src/
// metaphor-free.ts): same "banned term, allow-list, exclusion list, scope" shape, but the banned
// list here is registry data appended by any CR (a changelog), not a hardcoded package charter.
//
// The registry is parsed with a hand-rolled minimal TOML subset — the same spirit as
// discover-specs's parseAnchorsToml (plugins/sdd/skills/discover-specs/scripts/discover-specs.mts)
// — an array of `[[retired]]` tables with string keys (term/since/replacement) and string-array
// keys (scope/allow). `allow` entries are flat strings, either a bare path (sanctions the whole
// file) or `path :: substring` (sanctions only lines carrying that substring) — deliberately, so
// the parser never needs nested inline tables.
//
// A malformed registry is NOT a fail-safe empty list (contrast discover-specs's readAnchors, which
// warns and falls back for an unrelated scan): here the registry IS the check, so a parse failure
// must be loud and non-zero, never a false-clean.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies (the repo's node-≥23.6 / no-deps convention).

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// ── Registry ──

export interface RetiredEntry {
	/** The literal, case-sensitive text that is retired. */
	term: string
	/** The CR that retired it. */
	since: string
	/** What to use instead. */
	replacement: string
	/** Repo-relative include prefixes. Absent/empty means the whole tracked tree. */
	scope?: string[]
	/** Sanctioned occurrences: a bare path (whole file) or "path :: substring" (matching lines only). */
	allow?: string[]
}

export class RegistryParseError extends Error {}

const REGISTRY_PATH = '.agents/sdd/retired-terms.toml'

function isBlankOrComment(line: string): boolean {
	const t = line.trim()
	return t === '' || t.startsWith('#')
}

function extractString(block: string, key: string): string {
	const m = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*"([^"]*)"[^\\n]*`).exec(block)
	if (!m) throw new RegistryParseError(`[[retired]] entry is missing a string "${key}"`)
	return m[2]
}

// A `[key = [...]]` array, tolerant of the array spanning several lines (as the README's worked
// example does). An opened-but-never-closed array is a parse error, not a silently empty result —
// silently swallowing it would be exactly the false-green this guard exists to prevent.
function extractArray(block: string, key: string): string[] {
	const openRe = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*\\[`)
	const openMatch = openRe.exec(block)
	if (!openMatch) return []
	const openIdx = openMatch.index + openMatch[0].length - 1 // index of the "["
	const closeIdx = block.indexOf(']', openIdx)
	if (closeIdx === -1) throw new RegistryParseError(`"${key}" array is never closed with "]"`)
	const arrText = block.slice(openIdx, closeIdx)
	const out: string[] = []
	for (const q of arrText.matchAll(/"([^"]*)"/g)) out.push(q[1])
	return out
}

/** Parses the registry's minimal TOML subset: an array of `[[retired]]` tables carrying string
 * keys (term/since/replacement, all required) and optional string-array keys (scope/allow). Throws
 * `RegistryParseError` on anything that does not fit that shape — an absent registry is handled by
 * the caller (`readRegistry`), not here; an empty/comment-only file parses to `[]`. */
export function parseRegistryToml(text: string): RetiredEntry[] {
	const marker = '[[retired]]'
	const firstIdx = text.indexOf(marker)
	if (firstIdx === -1) {
		if (text.split('\n').every(isBlankOrComment)) return []
		throw new RegistryParseError('no [[retired]] table found and the file is not empty/comment-only')
	}
	const preamble = text.slice(0, firstIdx)
	if (!preamble.split('\n').every(isBlankOrComment)) {
		throw new RegistryParseError('content found before the first [[retired]] table header')
	}
	const blocks = text.slice(firstIdx).split(marker).slice(1)
	return blocks.map((block) => {
		const term = extractString(block, 'term')
		const since = extractString(block, 'since')
		const replacement = extractString(block, 'replacement')
		const scope = extractArray(block, 'scope')
		const allow = extractArray(block, 'allow')
		const entry: RetiredEntry = { term, since, replacement }
		if (scope.length) entry.scope = scope
		if (allow.length) entry.allow = allow
		return entry
	})
}

/** Reads and parses the registry at `<root>/.agents/sdd/retired-terms.toml`. An absent file yields
 * `[]` (an "an absent registry sweeps clean" registry, not an error). A present-but-malformed file
 * throws `RegistryParseError` — the caller must surface that loudly and exit non-zero. */
export function readRegistry(root: string): RetiredEntry[] {
	const file = join(root, REGISTRY_PATH)
	if (!existsSync(file)) return []
	return parseRegistryToml(readFileSync(file, 'utf8'))
}

// ── Built-in exclusions — always applied, never configurable ──
// The rule: a surface whose job is to name the retired term is not drift. Two kinds qualify:
// (a) the guard's own definition — the registry, this engine's source + test, and this node's own
//     README + .feature (it states the banned text to define it), and
// (b) durable provenance — every ledger/ directory, and everything under .agents/plans/.
// Nothing else is excluded: a spec README that merely *mentions* a retired convention is drift.

const ENGINE_SOURCE = 'plugins/sdd/skills/check-retired-terms/scripts/check-retired-terms.mts'
const ENGINE_TEST = 'plugins/sdd/skills/check-retired-terms/scripts/check-retired-terms.test.mts'
const NODE_README = '.agents/specs/sdd/corpus/retired-terms/README.md'
const NODE_FEATURE = '.agents/specs/sdd/corpus/retired-terms/retired-terms.feature'

const DEFAULT_BUILTIN_EXCLUDED_FILES: readonly string[] = [
	REGISTRY_PATH,
	ENGINE_SOURCE,
	ENGINE_TEST,
	NODE_README,
	NODE_FEATURE,
]

const DEFAULT_BUILTIN_EXCLUDED_PREFIXES: readonly string[] = ['.agents/plans/']

// Any file sitting inside a directory literally named "ledger", at any depth (e.g.
// ".agents/specs/aced/ledger/x.jsonl") — durable provenance, not a directory this guard walks by
// prefix from the root.
function isUnderLedgerDir(relPath: string): boolean {
	const segs = relPath.split('/')
	return segs.slice(0, -1).includes('ledger')
}

function isBuiltinExcluded(
	relPath: string,
	excludedFiles: readonly string[],
	excludedPrefixes: readonly string[],
): boolean {
	if (excludedFiles.includes(relPath)) return true
	if (excludedPrefixes.some((p) => relPath.startsWith(p))) return true
	if (isUnderLedgerDir(relPath)) return true
	return false
}

// ── Scope + allow ──

function inScope(relPath: string, scope?: string[]): boolean {
	if (!scope || scope.length === 0) return true
	return scope.some((prefix) => relPath.startsWith(prefix))
}

interface ParsedAllow {
	file: string
	substring?: string
}

function parseAllowEntry(raw: string): ParsedAllow {
	const idx = raw.indexOf('::')
	if (idx === -1) return { file: raw.trim() }
	return { file: raw.slice(0, idx).trim(), substring: raw.slice(idx + 2).trim() }
}

// A bare-path allow entry sanctions every line of that file; a `path :: substring` entry sanctions
// only lines carrying that substring, leaving the rest of the file guarded.
function isAllowed(relPath: string, lineText: string, allow: string[] | undefined): boolean {
	if (!allow) return false
	for (const raw of allow) {
		const parsed = parseAllowEntry(raw)
		if (parsed.file !== relPath) continue
		if (parsed.substring === undefined) return true
		if (lineText.includes(parsed.substring)) return true
	}
	return false
}

// ── Tracked files ──

/** The git-tracked file set, repo-relative, one per line. An untracked file is outside the sweep
 * by construction — it is never in this list. */
export function listTrackedFiles(root: string): string[] {
	const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
	return out.split('\n').filter((l) => l !== '')
}

// ── Sweep ──

export interface Violation {
	file: string
	line: number
	term: string
	replacement: string
}

export interface SweepOptions {
	/** Substitute the tracked-file lister (tests inject a fixed list instead of shelling to git). */
	listTrackedFiles?: (root: string) => string[]
	/** Substitute the built-in excluded-file set (tests probe the exclusion mechanism in isolation). */
	builtinExcludedFiles?: readonly string[]
	/** Substitute the built-in excluded-prefix set. */
	builtinExcludedPrefixes?: readonly string[]
}

/** Sweeps `root` for survivors of every entry in `entries`. `options` lets callers (tests)
 * substitute fixture-scoped config — the tracked-file source and the built-in exclusion lists —
 * in place of the real repo and the real defaults, mirroring `findMetaphorViolations`'s
 * `ScanOptions` (packages/cyberlegion/src/metaphor-free.ts). */
export function sweep(root: string, entries: RetiredEntry[], options: SweepOptions = {}): Violation[] {
	const listFiles = options.listTrackedFiles ?? listTrackedFiles
	const excludedFiles = options.builtinExcludedFiles ?? DEFAULT_BUILTIN_EXCLUDED_FILES
	const excludedPrefixes = options.builtinExcludedPrefixes ?? DEFAULT_BUILTIN_EXCLUDED_PREFIXES

	const violations: Violation[] = []
	for (const relPath of listFiles(root)) {
		if (isBuiltinExcluded(relPath, excludedFiles, excludedPrefixes)) continue

		let text: string
		try {
			text = readFileSync(join(root, relPath), 'utf8')
		} catch {
			continue
		}
		const lines = text.split('\n')

		for (const entry of entries) {
			if (!inScope(relPath, entry.scope)) continue
			lines.forEach((lineText, i) => {
				if (!lineText.includes(entry.term)) return
				if (isAllowed(relPath, lineText, entry.allow)) return
				violations.push({ file: relPath, line: i + 1, term: entry.term, replacement: entry.replacement })
			})
		}
	}
	return violations.sort((a, b) => (a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line - b.line))
}

// ── CLI ──

/** Renders `--list` output: one line per registered term with its `since` and `replacement`, or a
 * definitive empty-state line when nothing is registered — never silence. */
export function formatList(entries: RetiredEntry[]): string {
	if (entries.length === 0) return 'check-retired-terms: no term is registered\n'
	return entries.map((e) => `${e.term}  (since ${e.since})  -> ${e.replacement}\n`).join('')
}

/** Renders the sweep report: `file:line:term` plus the declared replacement, one per survivor
 * (every survivor, not just the first), then a count summary. */
export function formatViolations(violations: Violation[]): string {
	const lines = violations.map((v) => `${v.file}:${v.line}:${v.term} — replace with: ${v.replacement}\n`)
	lines.push(`check-retired-terms: ${violations.length} survivor(s) found\n`)
	return lines.join('')
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? (argv[argv.indexOf('--root') + 1] ?? '.') : '.'
	const list = argv.includes('--list')

	let entries: RetiredEntry[]
	try {
		entries = readRegistry(root)
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		process.stderr.write(`check-retired-terms: malformed registry — ${message}\n`)
		return 1
	}

	if (list) {
		process.stdout.write(formatList(entries))
		return 0
	}

	const violations = sweep(root, entries)
	if (violations.length === 0) {
		process.stdout.write('check-retired-terms: clean — no survivors found\n')
		return 0
	}
	process.stdout.write(formatViolations(violations))
	return 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
