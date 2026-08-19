#!/usr/bin/env node
// check-spec-references — resolve every explicitly-relative reference a project spec's .md files
// carry, and report the ones that resolve to nothing.
//
// The recurrence this closes was not a typo but a CONSISTENT OFF-BY-ONE: every `../../../src/…`
// reference in a spec corpus was one directory level short, and every one of them read as entirely
// plausible — right filename, right-looking depth, wrong level. Re-reading a reference by eye is
// not a check on it; only resolving it is. So the finding names BOTH the reference as written and
// the path it actually resolved to — the second is the half review cannot supply.
//
// Scope is deliberately narrow. Only an EXPLICITLY-RELATIVE path (`./` or `../`) is a reference; a
// bare path in inline code is prose. A spec corpus is full of bare paths that are illustrative or
// relative to somewhere other than the repo (`cli/`, `skills/doctor/`, `.claude/skills`,
// `~/.codex/config.toml`), and resolving those would reject nearly all of them. The prefix rule is
// what makes the repo-root-relative case (`.research/agentic-configuration-standards/`) pass by
// construction rather than by exception.
//
// There is exactly ONE escape hatch, deliberately. A second, implicit one was built and then cut:
// excluding whatever a doubled-backtick span holds, on the theory that such a span exhibits markup
// rather than citing it. It was unconditional, so a genuinely broken reference written that way
// escaped silently — reproducing, inside the exclusion, the exact "looks anchored, isn't" failure
// this engine exists to close. An escape must be explicit, reasoned, and visible where it applies.
//
// One false-positive class is genuine and recurs: prose QUOTING a path relative to something other
// than the file it sits in — the text held inside a bridge file, a symlink target relative to
// `.cursor/`. That is structurally indistinguishable from a real anchor, so an inline
// `<!-- spec-ref-ignore: why -->` marker suppresses its own line, keeping the justification beside
// the prose it excuses instead of in a registry that drifts away from what it covers.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies (the repo's node-≥23.6 / no-deps convention).

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// ── Extraction ──

/** A reference as written, and the 1-based line it sits on. */
export interface Reference {
	line: number
	ref: string
}

/** Suppresses every reference on the line it appears on. Matched as a COMPLETE html comment, not
 * as a substring: a marker whose name merely starts with this one's (a typo, a future sibling)
 * must not silently inherit its power to hide a reference. The optional `: reason` is convention,
 * not syntax — the marker is recognized with or without one. */
const IGNORE_MARKER_RE = /<!--\s*spec-ref-ignore\s*(?::[^>]*)?-->/

/** A markdown inline link whose target is explicitly relative — covering the plain form, an
 * angle-bracket-wrapped target, and an optional title in any of markdown's three quotings. Run only
 * over the parts of a line that are NOT inside a code span: inside one, markup is literal text on
 * display, not a link. */
const LINK_RE = /\]\(\s*(?:<([^>\n]*)>|(\.{1,2}\/[^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g

/** A reference-style link definition (`[label]: ../path`) whose target is explicitly relative. It
 * is a link target like any other — the label form changes where the path is written, not what it
 * points at. */
const LINK_DEF_RE = /^\s{0,3}\[.+\]:\s*(?:<([^>\n]*)>|(\S+))/

/** An explicitly-relative path, and nothing else. The trailing class excludes whitespace and
 * backticks so that "the span's WHOLE content is the path" means what it says: a span holding
 * `../a` plus commentary is prose that starts with a path, not a citation. */
const RELATIVE_RE = /^\.{1,2}\/[^\s`]*$/

/** The same, minus the no-whitespace rule — for an ANGLE-BRACKET link target, whose whole reason
 * for existing is to carry a path with a space in it. */
const RELATIVE_IN_ANGLES_RE = /^\.{1,2}\/[^`]*$/

/** An open fence, remembered so the close can be matched against it. */
interface Fence {
	char: '`' | '~'
	length: number
}

/**
 * The fence a line opens, or `undefined`. CommonMark: three or more backticks or tildes, indented
 * fewer than four spaces.
 */
function fenceOpenedBy(line: string): Fence | undefined {
	const m = /^ {0,3}(`{3,}|~{3,})/.exec(line)
	if (m === null) return undefined
	const run = m[1] as string
	return { char: run[0] as '`' | '~', length: run.length }
}

/**
 * Whether `line` CLOSES `fence`: the same character, at least as long, and nothing but whitespace
 * after it.
 *
 * Matching the delimiter rather than toggling a boolean on any fence-shaped line is what keeps the
 * exclusion honest. A bare toggle flips on a `~~~` line inside a backtick fence — so a reference
 * genuinely inside a fence gets extracted, and, worse, a fence-shaped line inside another fence
 * leaves the parity inverted and every genuinely broken reference AFTER the block is silently
 * swallowed. That is this engine's own failure class, reached through the one rule meant to
 * suppress noise.
 */
function fenceClosedBy(line: string, fence: Fence): boolean {
	const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)
	if (m === null) return false
	const run = m[1] as string
	return run[0] === fence.char && run.length >= fence.length
}

/**
 * A line that starts a new block: blank, an ATX heading, a blockquote, a list item, or a thematic
 * break. Inline parsing happens WITHIN a block, so a code span cannot reach across one of these —
 * and the boundary matters in the under-reporting direction. An unclosed backtick left by a typo
 * would otherwise pair with the first backtick of the next block, swallowing the span that was
 * about to open and every reference after it in the flow.
 */
export function startsNewBlock(line: string): boolean {
	if (/^[ \t]*$/.test(line)) return true
	if (/^ {0,3}#{1,6}(\s|$)/.test(line)) return true // ATX heading
	if (/^ {0,3}>/.test(line)) return true // blockquote
	if (/^ {0,3}([-+*]|\d{1,9}[.)])(\s|$)/.test(line)) return true // list item
	if (/^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/.test(line)) return true // thematic break
	return false
}

interface CodeSpan {
	/** The span's content, line endings folded to spaces and CommonMark's one-space padding stripped. */
	content: string
	/** Offset into the scanned text where the opening run begins. */
	start: number
	end: number
}

/** Same length, same line breaks, no content — so blanking a region shifts no offset and moves no
 * finding to another line. */
function blankOut(region: string): string {
	return region.replace(/[^\n]/g, ' ')
}

/**
 * The inline-code spans on one line, scanned the way CommonMark delimits them: a run of N backticks
 * opens, the next run of EXACTLY N closes, and one leading + trailing space is stripped when both
 * are present.
 *
 * Scanning properly rather than matching a single-backtick pair is what makes the reference rule —
 * "a code span is a reference when its WHOLE content is the path" — mean one thing everywhere. A
 * doubled span written around another span (`` `x` ``) has content that still carries backticks, so
 * it is not a path and not a reference; a doubled span written around a bare path has the path as
 * its content, so it IS one. Neither is a special case, and neither leaves a broken reference
 * anywhere to hide.
 */
export function scanCodeSpans(text: string, blockStarts: readonly number[] = []): CodeSpan[] {
	const out: CodeSpan[] = []
	let i = 0
	while (i < text.length) {
		if (text[i] !== '`') {
			i++
			continue
		}
		const open = i
		while (text[i] === '`') i++
		const runLength = i - open
		// find the next run of exactly runLength backticks, stopping at the next block boundary — a
		// code span lives inside one block and cannot reach past it
		const limit = blockStarts.find((b) => b > open) ?? text.length
		let j = i
		let closeStart = -1
		while (j < limit) {
			if (text[j] !== '`') {
				j++
				continue
			}
			const runStart = j
			while (text[j] === '`') j++
			if (j - runStart === runLength) {
				closeStart = runStart
				break
			}
		}
		if (closeStart === -1) {
			// An unmatched run is literal text, and the scan RESUMES after it — CommonMark's own
			// recovery. Abandoning the rest of the text instead would let one stray backtick
			// silently swallow every reference after it, which is this engine's own failure class
			// wearing a different hat.
			i = open + runLength
			continue
		}
		// Line endings inside a span are spaces, per CommonMark — which is what lets a span that
		// WRAPS still be one span. Prose here hard-wraps, so a long path in backticks landing
		// across a line break is ordinary, not exotic; scanning line by line would have left every
		// wrapped reference unread.
		let content = text.slice(open + runLength, closeStart).replace(/\r?\n/g, ' ')
		if (content.length > 1 && content.startsWith(' ') && content.endsWith(' ') && content.trim() !== '') {
			content = content.slice(1, -1)
		}
		out.push({ content, start: open, end: j })
		i = j
	}
	return out
}

/**
 * Every explicitly-relative reference in `text`, in document order.
 *
 * Skipped: lines inside a fenced code block, and lines carrying the ignore marker. Extraction is
 * line-scoped on purpose — it is what gives each finding a line number, and what lets the marker's
 * scope be exactly the line it appears on rather than the whole file.
 */
export function extractReferences(text: string): Reference[] {
	const lines = text.split('\n')

	// 1. Blank the fenced blocks, keeping every line's length and every line break, so offsets and
	//    line numbers below still mean what they say.
	let fence: Fence | undefined
	const unfenced = lines.map((line) => {
		if (fence !== undefined) {
			if (fenceClosedBy(line, fence)) fence = undefined
			return blankOut(line)
		}
		const opened = fenceOpenedBy(line)
		if (opened !== undefined) {
			fence = opened
			return blankOut(line)
		}
		return line
	})

	// 2. Scan code spans across the WHOLE text, not line by line: a span that wraps is still one
	//    span, and reading it as two would leave a wrapped reference unread. Bounded at block
	//    starts, so widening the window past a line break does not let a stray backtick reach into
	//    the next block.
	const scannable = unfenced.join('\n')
	const lineStarts: number[] = []
	let acc = 0
	for (const line of lines) {
		lineStarts.push(acc)
		acc += line.length + 1
	}
	// A blanked fence line is all spaces, so it reads as a block start here too — the fence bounds
	// a span by the same rule as everything else rather than by a happy accident.
	const blockStarts = lineStarts.filter((_start, i) => i > 0 && startsNewBlock(unfenced[i] as string))
	const lineOf = (offset: number): number => {
		let lo = 0
		let hi = lineStarts.length - 1
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1
			if ((lineStarts[mid] as number) <= offset) lo = mid
			else hi = mid - 1
		}
		return lo
	}

	const spans = scanCodeSpans(scannable, blockStarts)
	let outsideSpans = scannable
	for (const span of spans) {
		outsideSpans =
			outsideSpans.slice(0, span.start) +
			blankOut(outsideSpans.slice(span.start, span.end)) +
			outsideSpans.slice(span.end)
	}
	const outsideLines = outsideSpans.split('\n')

	// 3. The marker is read from OUTSIDE the code spans — the same rule, not an exception for the
	//    escape hatch. Read from the raw line it would fire on a line that merely QUOTES it, which
	//    is how this very node documents it, and that line's real references would vanish: an
	//    escape hatch a description of the escape hatch can trigger hides exactly what this engine
	//    exists to find. A wrapped span is judged by the line it OPENS on — the line a reader
	//    would put the marker beside.
	const marked = outsideLines.map((line) => IGNORE_MARKER_RE.test(line))

	const perLine = new Map<number, Set<string>>()
	const add = (line: number, ref: string) => {
		if (marked[line] === true) return
		const set = perLine.get(line) ?? new Set<string>()
		set.add(ref)
		perLine.set(line, set)
	}

	for (const span of spans) {
		const content = span.content.trim()
		if (RELATIVE_RE.test(content)) add(lineOf(span.start), content)
	}

	outsideLines.forEach((line, i) => {
		const addTarget = (angled: string | undefined, bare: string | undefined) => {
			if (angled !== undefined) {
				if (RELATIVE_IN_ANGLES_RE.test(angled)) add(i, angled)
				return
			}
			if (bare !== undefined && RELATIVE_RE.test(bare)) add(i, bare)
		}
		for (const m of line.matchAll(LINK_RE)) addTarget(m[1], m[2])
		const def = LINK_DEF_RE.exec(line)
		if (def) addTarget(def[1], def[2])
	})

	const out: Reference[] = []
	for (const line of [...perLine.keys()].sort((a, b) => a - b)) {
		for (const ref of perLine.get(line) as Set<string>) out.push({ line: line + 1, ref })
	}
	return out
}

// ── Resolution ──

/**
 * Where `ref` points, resolved against `fileDir` — the directory of the file that CARRIES it,
 * never the spec root and never the repo root. A trailing `#fragment` is stripped first; a
 * trailing slash is immaterial (`resolve` drops it), so a directory reference resolves either way.
 */
export function resolveReference(fileDir: string, ref: string): string {
	const withoutFragment = ref.replace(/#.*$/, '')
	return resolve(fileDir, withoutFragment)
}

// ── The walk ──

/** Every `.md` file under `dir`, at any depth, absolute and sorted so the report is stable. */
export function listMarkdownFiles(dir: string): string[] {
	const out: string[] = []
	const walk = (d: string) => {
		for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
			const p = join(d, e.name)
			if (e.isDirectory()) walk(p)
			else if (e.name.endsWith('.md')) out.push(p)
		}
	}
	walk(dir)
	return out
}

// ── Audit ──

export interface Finding {
	/** Absolute path of the file carrying the reference. */
	file: string
	line: number
	/** The reference exactly as written. */
	ref: string
	/** The absolute path it resolved to — the half a reader cannot supply by eye. */
	resolved: string
}

export interface AuditOptions {
	/** Substitute the markdown walk (tests assert which files are visited). */
	listMarkdownFiles?: (dir: string) => string[]
	/** Substitute the file reader (tests assert nothing outside the walk is read). */
	readFile?: (path: string) => string
	/** Substitute the existence probe. */
	exists?: (path: string) => boolean
}

/**
 * Every unresolved reference under `specDir`, ordered by file, then line, then reference — so two
 * runs over an unchanged tree render byte-identically.
 *
 * EVERY finding, never the first: a single off-by-one lands as a whole family of broken
 * references, and reporting one at a time would take as many runs to clear as there are levels
 * wrong.
 */
export function audit(specDir: string, options: AuditOptions = {}): Finding[] {
	const list = options.listMarkdownFiles ?? listMarkdownFiles
	const read = options.readFile ?? ((p: string) => readFileSync(p, 'utf8'))
	const has = options.exists ?? existsSync

	const findings: Finding[] = []
	for (const file of list(specDir)) {
		const fileDir = dirname(file)
		for (const { line, ref } of extractReferences(read(file))) {
			const resolved = resolveReference(fileDir, ref)
			if (!has(resolved)) findings.push({ file, line, ref, resolved })
		}
	}
	return findings.sort((a, b) =>
		a.file !== b.file ? (a.file < b.file ? -1 : 1) : a.line !== b.line ? a.line - b.line : a.ref < b.ref ? -1 : 1,
	)
}

// ── Report ──

/** Renders each finding as `file:line: <ref> -> <resolved>`, both paths relative to `base` so the
 * report reads the same from any checkout. */
export function formatFindings(findings: Finding[], base: string): string {
	if (findings.length === 0) return 'check-spec-references: every relative reference resolves\n'
	const lines = findings.map(
		(f) =>
			`  ${relative(base, f.file)}:${f.line}: \`${f.ref}\` -> ${relative(base, f.resolved)} — no file or directory there\n`,
	)
	lines.push(`check-spec-references: ${findings.length} unresolved reference(s)\n`)
	return lines.join('')
}

// ── CLI ──

// One mode, deliberately. A report-only mode would differ from the guard by exit code alone —
// the same findings, printed the same way — and no actor wants the list without wanting it fixed.
// Every finding is a defect, so every finding fails the run.
export function main(argv: string[], cwd: string = process.cwd()): number {
	const i = argv.indexOf('--spec-dir')
	const specDir = i === -1 ? '' : (argv[i + 1] ?? '')
	if (specDir === '') {
		process.stderr.write('check-spec-references: --spec-dir <dir> is required\n')
		return 1
	}

	const dir = resolve(cwd, specDir)
	// A spec dir that is not there is refused by name, never as a raw stack trace: a mistyped path
	// must not read like a corpus that has no markdown in it.
	if (!existsSync(dir)) {
		process.stderr.write(`check-spec-references: no directory at ${relative(cwd, dir)}\n`)
		return 1
	}

	const findings = audit(dir)
	const report = formatFindings(findings, cwd)
	if (findings.length === 0) {
		process.stdout.write(report)
		return 0
	}
	process.stderr.write(report)
	return 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
