#!/usr/bin/env node
// Static .feature analysis for SDD specs — Gherkin validity, boolean form, and
// scenario ordering/sectioning checks. Pure functions are exported for node:test;
// running the file directly drives the CLI. No dependencies — plain node strips
// the types.

import { execFileSync } from 'node:child_process'
import { type Dirent, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

// ─── types ────────────────────────────────────────────────────────────────────

export interface ParsedSuite {
	hasFeatureLine: boolean
	scenarios: ParsedScenario[]
	sectionCommentCount: number
}

export interface ParsedScenario {
	name: string
	steps: string[]
	tags: string[]
	// A `Scenario Outline` drives its steps from an `Examples:` table; a plain
	// `Scenario` has neither. `placeholders` are the `<name>` tokens used in steps.
	isOutline: boolean
	placeholders: string[]
	examples: { header: string[]; rows: string[][] } | null
}

// ─── hedge words that signal probabilistic / rubric assertions ────────────────

// Probabilistic adverbs make any step non-boolean — flag them on every step.
const ADVERB_PATTERNS = ['sometimes', 'usually', 'often', 'occasionally'].map((w) => new RegExp(`\\b${w}\\b`, 'i'))

// Rubric nouns (a graded scale leaking into the contract) are only a violation
// when they form a positive Then/And/But assertion. A negated/absence assertion
// ("no rubric appears") or one expressing a boolean verdict ("reports failing
// when the score is below the threshold") is fine — and a meta-spec mentioning
// the rule in a Given/When setup is not the contract embedding a rubric.
const RUBRIC_PATTERNS = [...['score', 'threshold', 'rubric'].map((w) => new RegExp(`\\b${w}\\b`, 'i')), /\b1[-–]5\b/]
const ASSERTION_RE = /^(Then|And|But)\b/i
const RUBRIC_EXEMPT_RE = /\b(no|not|never|without|nor|passing|failing|pass|fail|boolean|true|false|verdict)\b/i

// ─── parse ────────────────────────────────────────────────────────────────────

export function parseSuite(text: string): ParsedSuite {
	const lines = text.split('\n')
	let hasFeatureLine = false
	let sectionCommentCount = 0
	const scenarios: ParsedScenario[] = []
	let current: ParsedScenario | null = null
	// Tags on the line(s) above a Scenario apply to the scenario that follows.
	let pendingTags: string[] = []

	for (const raw of lines) {
		const line = raw.trimStart()

		if (/^Feature:/i.test(line)) {
			hasFeatureLine = true
			continue
		}

		// Section comment: a comment line that contains ── or -- (box-drawing or dashes)
		if (/^#/.test(line) && (/──/.test(line) || /--/.test(line))) {
			sectionCommentCount++
			continue
		}

		// Tag line: one or more @tags preceding a Scenario.
		if (/^@/.test(line)) {
			pendingTags.push(...line.split(/\s+/).filter((t) => t.startsWith('@')))
			continue
		}

		if (/^Scenario:/i.test(line) || /^Scenario Outline:/i.test(line)) {
			if (current) scenarios.push(current)
			const isOutline = /^Scenario Outline:/i.test(line)
			const name = line.replace(/^Scenario(?: Outline)?:/i, '').trim()
			current = { name, steps: [], tags: pendingTags, isOutline, placeholders: [], examples: null }
			pendingTags = []
			continue
		}

		// Examples: opens an outline's data table; the first table row is its header.
		if (current && /^Examples:/i.test(line)) {
			current.examples = { header: [], rows: [] }
			continue
		}

		// A table row (`| a | b |`) fills the open Examples table — header first.
		if (current?.examples && line.startsWith('|')) {
			const cells = line
				.split('|')
				.slice(1, -1)
				.map((c) => c.trim())
			if (current.examples.header.length === 0) current.examples.header = cells
			else current.examples.rows.push(cells)
			continue
		}

		if (current && /^(Given|When|Then|And|But)\b/i.test(line)) {
			current.steps.push(line)
			// Collect `<placeholder>` tokens so an outline's table can be checked to cover them.
			for (const m of line.matchAll(/<([^>]+)>/g)) current.placeholders.push(m[1])
		}
	}

	if (current) scenarios.push(current)

	return { hasFeatureLine, scenarios, sectionCommentCount }
}

// ─── Gherkin validity — the pinned parser, not the permissive scan below ───────

export interface ParseError {
	line: number
	message: string
}

// Pure parse of `gherkin-cli@0.0.1 validate --format json`'s stdout. Maps each reported file to
// its errors (empty array when it parses) so callers can look a path up directly.
export function parseGherkinValidateOutput(stdout: string): Map<string, ParseError[]> {
	const parsed = JSON.parse(stdout) as { files: { file: string; errors: { line: number; message: string }[] }[] }
	const out = new Map<string, ParseError[]>()
	for (const f of parsed.files) {
		out.set(
			f.file,
			f.errors.map((e) => ({ line: e.line, message: e.message })),
		)
	}
	return out
}

// The exec boundary around the pinned parser. `validate` exits 1 when any file fails to parse but
// still writes the full JSON report to stdout — execFileSync THROWS on that nonzero exit, so a
// throw alone is not proof the parser could not run; recover `err.stdout` and parse it as the
// normal parse-failure report. Only an empty/missing stdout means the parser genuinely didn't run.
export function runGherkinValidate(paths: string[], cwd = '.'): Map<string, ParseError[]> {
	try {
		const stdout = execFileSync('npx', ['gherkin-cli@0.0.1', 'validate', ...paths, '--format', 'json'], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		return parseGherkinValidateOutput(stdout)
	} catch (err) {
		const stdout = (err as { stdout?: string }).stdout
		if (typeof stdout === 'string' && stdout.length > 0) {
			return parseGherkinValidateOutput(stdout)
		}
		throw new Error(`gherkin-cli validate did not run: ${(err as Error).message}`)
	}
}

// ─── checks ──────────────────────────────────────────────────────────────────

// `parseErrors` carries the pinned parser's verdict for this file (empty when it parses, or
// omitted by 3-arg callers that predate this guard). A parse failure REPLACES every other
// finding below rather than joining them: every other check reads the file through the
// permissive `parseSuite` scan, so on an unparseable file those findings come from a partial
// view and are not evidence — reporting them as "the form" would still be the fail-open this
// guard exists to close, just with company.
export function checkSuite(slug: string, file: string, text: string, parseErrors: ParseError[] = []): string[] {
	const tag = (msg: string) => `${slug}/${file}: ${msg}`

	if (parseErrors.length > 0) {
		return parseErrors.map((e) => tag(`cannot parse as Gherkin at line ${e.line} — ${e.message}`))
	}

	const v: string[] = []
	const ref = parseSuite(text)

	// Gherkin validity: must have Feature: line
	if (!ref.hasFeatureLine) {
		v.push(tag('missing Feature: line'))
	}

	for (const scenario of ref.scenarios) {
		const steps = scenario.steps
		const label = scenario.name ? `Scenario "${scenario.name}"` : 'unnamed scenario'
		// A @rubric-tagged scenario is the sanctioned rubric form: its rubric/score/
		// threshold lingo is the contract, not a leaked grade. Skip the rubric-noun
		// ban for it (adverb hedges still apply — a rubric is not an excuse to hedge).
		const isRubric = scenario.tags.includes('@rubric')

		// Must have at least one step
		if (steps.length === 0) {
			v.push(tag(`${label}: has no steps`))
			continue
		}

		// Must have a When or Given
		const hasGivenOrWhen = steps.some((s) => /^(Given|When)\b/i.test(s))
		if (!hasGivenOrWhen) {
			v.push(tag(`${label}: missing Given or When step`))
		}

		// Must have a Then (or And/But after a Then)
		const hasThen = steps.some((s) => /^Then\b/i.test(s))
		if (!hasThen) {
			v.push(tag(`${label}: missing Then step — scenario has no assertion`))
		}

		// Boolean form
		for (const step of steps) {
			// Probabilistic adverbs are never boolean — flag on any step.
			const adverb = ADVERB_PATTERNS.find((p) => p.test(step))
			if (adverb) {
				v.push(tag(`${label}: step contains non-boolean hedge — "${step.trim()}" (matched ${adverb.source})`))
				continue
			}
			// Rubric nouns only count as a leaked grade in a positive Then/And/But
			// assertion of an untagged scenario; a @rubric scenario admits them.
			if (isRubric || !ASSERTION_RE.test(step) || RUBRIC_EXEMPT_RE.test(step)) continue
			const rubric = RUBRIC_PATTERNS.find((p) => p.test(step))
			if (rubric) {
				v.push(
					tag(`${label}: step embeds a rubric/score in its assertion — "${step.trim()}" (matched ${rubric.source})`),
				)
			}
		}

		// Scenario Outline: the Examples table must be present, non-empty, and cover
		// every <placeholder> used in the steps. A bare outline with no table (or a
		// table missing a placeholder's column) would silently drive nothing.
		if (scenario.isOutline) {
			const ex = scenario.examples
			if (!ex || ex.header.length === 0 || ex.rows.length === 0) {
				v.push(tag(`${label}: Scenario Outline has no non-empty Examples table`))
			} else {
				const missing = [...new Set(scenario.placeholders)].filter((p) => !ex.header.includes(p))
				if (missing.length) {
					v.push(tag(`${label}: Examples table missing column(s) for placeholder(s): ${missing.join(', ')}`))
				}
			}
		}
	}

	// Ordering / sectioning: many scenarios must have at least one section comment
	const SECTION_THRESHOLD = 6
	if (ref.scenarios.length > SECTION_THRESHOLD && ref.sectionCommentCount === 0) {
		v.push(
			tag(
				`${ref.scenarios.length} scenarios but no section comments (add # ── Stage comments to group lifecycle stages)`,
			),
		)
	}

	return v
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

// Discovery walks the tree recursively so nested spec folders (sdd/sdd-skill)
// are analyzed too — a .feature is a real contract wherever it lives. Returns
// each dir (root-relative slug) paired with its .feature files.
export function discoverSuiteDirs(root: string): { slug: string; files: string[] }[] {
	const out: { slug: string; files: string[] }[] = []
	const walk = (dir: string, rel: string) => {
		let entries: Dirent[]
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			return
		}
		const files = entries.filter((e) => e.isFile() && e.name.endsWith('.feature')).map((e) => e.name)
		if (files.length) out.push({ slug: rel, files })
		for (const e of entries) {
			if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue
			walk(join(dir, e.name), rel ? join(rel, e.name) : e.name)
		}
	}
	walk(root, '')
	return out
}

// The gate scopes to a CR's *touched* .feature files, not the whole tree. In
// --files mode the caller passes an explicit path list and only those files are
// checked (tree discovery is skipped). An unreadable path fails closed — the
// gate must never silently pass a file it could not read.
//
// `validate` is injected so the unit tests exercise this wiring with a fake parser (fast,
// offline) while `main` wires the real pinned-npx boundary. The parser is the SOLE source of
// Gherkin validity — if it cannot be run at all, every readable path fails closed rather than
// falling back to the permissive scan; if it runs but omits a path from its report, that path
// fails closed too rather than defaulting to "parses fine".
export function checkFilePaths(
	paths: string[],
	cwd = '.',
	validate: typeof runGherkinValidate = runGherkinValidate,
): string[] {
	const violations: string[] = []
	const readable: { path: string; text: string }[] = []
	for (const p of paths) {
		try {
			readable.push({ path: p, text: readFileSync(p, 'utf8') })
		} catch {
			violations.push(`${p}: cannot read file`)
		}
	}
	if (readable.length === 0) return violations

	let parseErrorsByPath: Map<string, ParseError[]>
	try {
		parseErrorsByPath = validate(
			readable.map((r) => r.path),
			cwd,
		)
	} catch (err) {
		for (const { path } of readable) {
			violations.push(`${path}: cannot verify Gherkin validity — ${(err as Error).message}`)
		}
		return violations
	}

	for (const { path: p, text } of readable) {
		const errs = parseErrorsByPath.get(p)
		if (errs === undefined) {
			// Defaulting a missing report to "parses fine" is the exact fail-open bug being fixed —
			// the parser said nothing about this file, so it cannot be classified as valid.
			violations.push(`${p}: the Gherkin parser returned no result for this file`)
			continue
		}
		violations.push(...checkSuite(dirname(p), basename(p), text, errs))
	}
	return violations
}

// Collect the path list following --files, stopping at the next flag.
export function parseFilesArg(argv: string[]): string[] {
	const idx = argv.indexOf('--files')
	if (idx === -1) return []
	const paths: string[] = []
	for (let i = idx + 1; i < argv.length; i++) {
		if (argv[i].startsWith('--')) break
		paths.push(argv[i])
	}
	return paths
}

export function main(argv: string[]): number {
	let violations: string[] = []

	if (argv.includes('--files')) {
		const paths = parseFilesArg(argv)
		if (paths.length === 0) {
			console.error('✗ --files requires at least one .feature path')
			return 1
		}
		violations = checkFilePaths(paths)
	} else {
		const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.agents/specs'
		// The tree-wide sweep must fail closed on a parse failure exactly like --files — route the
		// full discovered path list through the same validated path rather than the bare parseSuite
		// scan, so an unparseable suite anywhere in the corpus fails the sweep closed.
		const paths: string[] = []
		for (const { slug, files } of discoverSuiteDirs(root)) {
			for (const file of files) paths.push(join(root, slug, file))
		}
		violations = checkFilePaths(paths)
	}

	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`)
		return 1
	}
	process.stdout.write('suite checks OK\n')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
