#!/usr/bin/env node
// check-field-mandates — a definition's declared fields and its prose must agree.
//
// Skill and agent definitions ship structured blocks (an Input, an Output, a dispatch payload)
// whose fields the surrounding prose also mandates. Nothing else compares the two, so a field can be
// mandated and never carried, or carried and never explained, and both read as complete. This
// engine diffs the token sets (spec: .agents/specs/sdd/plugin/check-field-mandates/):
//   unexplained — a block declares a field that carries no gloss and the prose never names
//   undeclared  — the prose mandates a known field (a code span) that none of the file's blocks declare
//
// A field is explained by a gloss OR by the prose — requiring the prose to repeat a glossed
// declaration would demand filler in every definition. A mandate is a code span naming a KNOWN field
// (declared somewhere in the tree); that vocabulary is what separates a field from `TODO`.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies (the repo's node-≥23.6 / no-deps convention).

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

export type FindingKind = 'unexplained' | 'undeclared'

export interface Finding {
	kind: FindingKind
	/** Root-relative path of the definition, `/`-separated. */
	file: string
	/** 1-based line: the declaration for `unexplained`, the prose line for `undeclared`. */
	line: number
	token: string
}

interface Declaration {
	token: string
	line: number
	glossed: boolean
}

interface Mandate {
	token: string
	line: number
}

export interface ParsedDefinition {
	declarations: Declaration[]
	mandates: Mandate[]
	/** Every field-shaped word the prose names, code span or not. */
	proseWords: Set<string>
}

const TOKEN = '[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*'
const TOKEN_ITEM = `${TOKEN}(?:\\(s\\))?`
/** A block line opening with a comma list of tokens, then a colon, a trailing comment, or nothing. */
const BLOCK_DECLARATION_RE = new RegExp(`^\\s*(${TOKEN_ITEM}(?:\\s*,\\s*${TOKEN_ITEM})*)\\s*(:.*|#.*)?$`)
/** A list item opening with one or more bold tokens joined by `+`. */
const LIST_DECLARATION_RE = new RegExp(`^\\s*[-*+]\\s+(\\*\\*${TOKEN}\\*\\*(?:\\s*\\+\\s*\\*\\*${TOKEN}\\*\\*)*)(.*)$`)
const BOLD_TOKEN_RE = new RegExp(`\\*\\*(${TOKEN})\\*\\*`, 'g')
const WORD_RE = new RegExp(`(?<![A-Za-z0-9_])${TOKEN}(?![A-Za-z0-9_])`, 'g')
const CODE_SPAN_RE = /`([^`\n]+)`/g
const MANDATE_LEAD_RE = new RegExp(`^<?(${TOKEN})(?=$|[\\s.:\\[\\]>(,=])`)
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/
/** The marker must carry a reason — a bare marker excuses nothing. */
const IGNORE_MARKER_RE = /<!--\s*field-mandate-ignore\s*:\s*[^\s>-][^>]*-->/

/** A field token is two or more characters: a lone capital is a word, not a field. */
function isField(token: string): boolean {
	return token.length >= 2
}

/** The forms a token may take and still be the same field — equal, or one trailing `S` apart. */
function sameFieldForms(token: string): string[] {
	const forms = [token, `${token}S`]
	if (token.endsWith('S') && token.length > 2) forms.push(token.slice(0, -1))
	return forms
}

function hasSameField(set: Set<string>, token: string): boolean {
	return sameFieldForms(token).some((f) => set.has(f))
}

// ── Parse ──

export function parseDefinition(text: string): ParsedDefinition {
	const lines = text.split(/\r?\n/)
	const declarations: Declaration[] = []
	const mandates: Mandate[] = []
	const proseWords = new Set<string>()

	let i = 0
	// YAML frontmatter is metadata, not prose.
	if (lines[0]?.trim() === '---') {
		const end = lines.findIndex((l, n) => n > 0 && l.trim() === '---')
		if (end > 0) i = end + 1
	}

	let fence: { char: string; length: number; structured: boolean } | null = null
	// The declarations a continuation line glosses: the most recent group in the open block.
	let group: Declaration[] = []

	/** Record a span of text as prose: its field-shaped words, and any code-span mandate. */
	function scanProse(text: string, lineNo: number): void {
		for (const m of text.matchAll(WORD_RE)) if (isField(m[0])) proseWords.add(m[0])
		if (IGNORE_MARKER_RE.test(text)) return
		for (const m of text.matchAll(CODE_SPAN_RE)) {
			const lead = (m[1] ?? '').trim().match(MANDATE_LEAD_RE)
			const token = lead?.[1]
			if (token && isField(token)) mandates.push({ token, line: lineNo })
		}
	}

	for (; i < lines.length; i++) {
		const line = lines[i] ?? ''
		const lineNo = i + 1
		const fenceMatch = line.match(FENCE_RE)

		if (fence) {
			if (
				fenceMatch &&
				fenceMatch[1]?.[0] === fence.char &&
				(fenceMatch[1]?.length ?? 0) >= fence.length &&
				fenceMatch[2]?.trim() === ''
			) {
				fence = null
				group = []
				continue
			}
			if (!fence.structured) continue
			const decl = line.match(BLOCK_DECLARATION_RE)
			const tokens = decl ? (decl[1] ?? '').split(',').map((t) => t.trim().replace(/\(s\)$/, '')) : []
			const rest = decl?.[2]
			const isDeclaration = decl !== null && (rest?.startsWith(':') || tokens.length >= 2)
			if (isDeclaration) {
				const glossed = rest?.startsWith(':') === true && rest.slice(1).trim() !== ''
				group = tokens.filter(isField).map((token) => ({ token, line: lineNo, glossed }))
				declarations.push(...group)
			} else if (line.trim() !== '') {
				for (const d of group) d.glossed = true
			}
			continue
		}

		if (fenceMatch) {
			const info = fenceMatch[2]?.trim() ?? ''
			fence = {
				char: fenceMatch[1]?.[0] ?? '`',
				length: fenceMatch[1]?.length ?? 3,
				structured: info === '' || info === 'text',
			}
			group = []
			continue
		}

		const listDecl = line.match(LIST_DECLARATION_RE)
		if (listDecl) {
			const rest = listDecl[2] ?? ''
			const glossed = rest.trim() !== ''
			for (const m of (listDecl[1] ?? '').matchAll(BOLD_TOKEN_RE)) {
				const token = m[1] ?? ''
				if (isField(token)) declarations.push({ token, line: lineNo, glossed })
			}
			// The text after a list item's bold lead is that declaration's gloss AND prose: a code
			// span in it mandates like any other (it is scanned the same as a full prose line).
			scanProse(rest, lineNo)
			continue
		}

		// Prose.
		scanProse(line, lineNo)
	}

	return { declarations, mandates, proseWords }
}

// ── Discovery ──

function walk(dir: string, out: string[]): void {
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return
	}
	for (const e of entries) {
		const full = join(dir, e.name)
		if (e.isDirectory()) walk(full, out)
		else if (e.isFile() && e.name.endsWith('.md')) out.push(full)
	}
}

/** Is this root-relative path a skill (`plugins/<p>/skills/**\/SKILL.md`) or agent (`plugins/<p>/agents/*.md`)? */
export function isDefinitionPath(rel: string): boolean {
	const parts = rel.split('/')
	if (parts[0] !== 'plugins' || parts.length < 4) return false
	if (parts[2] === 'agents') return parts.length === 4 && (parts[3] ?? '').endsWith('.md')
	if (parts[2] === 'skills') return parts.length >= 5 && parts[parts.length - 1] === 'SKILL.md'
	return false
}

/** Every definition under `root`, root-relative, `/`-separated, path-sorted. */
export function discoverDefinitions(root: string): string[] {
	const pluginsDir = join(root, 'plugins')
	if (!existsSync(pluginsDir)) return []
	const files: string[] = []
	walk(pluginsDir, files)
	return files
		.map((f) => relative(root, f).split(sep).join('/'))
		.filter(isDefinitionPath)
		.sort()
}

// ── The check ──

export function check(parsed: Map<string, ParsedDefinition>): Finding[] {
	const known = new Set<string>()
	for (const p of parsed.values()) for (const d of p.declarations) known.add(d.token)

	const findings: Finding[] = []
	for (const [file, p] of parsed) {
		if (p.declarations.length === 0) continue
		const declared = new Set(p.declarations.map((d) => d.token))

		const seen = new Set<string>()
		for (const d of p.declarations) {
			if (seen.has(d.token)) continue
			seen.add(d.token)
			const glossed = p.declarations.some((o) => o.token === d.token && o.glossed)
			if (!glossed && !hasSameField(p.proseWords, d.token)) {
				findings.push({ kind: 'unexplained', file, line: d.line, token: d.token })
			}
		}

		const reported = new Set<string>()
		for (const m of p.mandates) {
			if (!hasSameField(known, m.token) || hasSameField(declared, m.token)) continue
			const key = `${m.line}:${m.token}`
			if (reported.has(key)) continue
			reported.add(key)
			findings.push({ kind: 'undeclared', file, line: m.line, token: m.token })
		}
	}
	return findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1))
}

// ── Report ──

const DETAIL: Record<FindingKind, string> = {
	unexplained: 'declared in a block, but no gloss and no prose explains it',
	undeclared: 'mandated in the prose, but no block in this file declares it',
}

export function formatReport(definitions: string[], findings: Finding[]): string {
	if (definitions.length === 0) return 'check-field-mandates: no skill or agent definition found\n'
	if (findings.length === 0) return `check-field-mandates: ${definitions.length} definition(s) OK\n`
	const rows = findings
		.map((f) => `  ${f.kind.padEnd(11)} ${f.file}:${f.line} ${f.token} — ${DETAIL[f.kind]}`)
		.join('\n')
	return `${rows}\ncheck-field-mandates: ${findings.length} finding(s) across ${definitions.length} definition(s)\n`
}

// ── CLI ──

function isReadableDirectory(path: string): boolean {
	try {
		if (!statSync(path).isDirectory()) return false
		readdirSync(path)
		return true
	} catch {
		return false
	}
}

export function main(argv: string[]): number {
	let root = '.'
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--root') {
			const next = argv[++i]
			if (next === undefined) {
				process.stderr.write('check-field-mandates: --root needs a directory\n')
				return 1
			}
			root = next
			continue
		}
		process.stderr.write(`check-field-mandates: unrecognized flag ${a}\n`)
		return 1
	}
	if (!isReadableDirectory(root)) {
		process.stderr.write(`check-field-mandates: root ${root} is not a readable directory\n`)
		return 1
	}
	const definitions = discoverDefinitions(root)
	const parsed = new Map<string, ParsedDefinition>()
	for (const rel of definitions) parsed.set(rel, parseDefinition(readFileSync(join(root, rel), 'utf8')))
	const findings = check(parsed)
	process.stdout.write(formatReport(definitions, findings))
	return findings.length === 0 ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
