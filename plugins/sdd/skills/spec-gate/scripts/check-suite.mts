#!/usr/bin/env node
// Static .feature analysis for SDD specs — Gherkin validity, boolean form, and
// scenario ordering/sectioning checks. Pure functions are exported for node:test;
// running the file directly drives the CLI.

import { type Dirent, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { validateFeatures } from 'gherkin-cli'

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
	// Step DocStrings (`"""..."""` blocks), in encounter order. A @rubric scenario's
	// rubric YAML lives in one of these — the permissive scan otherwise skips them.
	docStrings: string[]
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
	// A step DocString (`"""` ... `"""`) attaches to the step immediately above it —
	// content is captured verbatim (not keyword-parsed) until the closing `"""`.
	let inDocString = false
	let docStringLines: string[] = []

	for (const raw of lines) {
		const line = raw.trimStart()

		if (inDocString) {
			if (line.startsWith('"""')) {
				inDocString = false
				if (current) current.docStrings.push(docStringLines.join('\n'))
				docStringLines = []
			} else {
				docStringLines.push(raw)
			}
			continue
		}

		if (current && line.startsWith('"""')) {
			inDocString = true
			continue
		}

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
			current = { name, steps: [], tags: pendingTags, isOutline, placeholders: [], examples: null, docStrings: [] }
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

// Maps the pinned parser's per-file report to its errors (empty array when it parses) so callers
// can look a path up directly.
export function runGherkinValidate(paths: string[]): Map<string, ParseError[]> {
	const { files } = validateFeatures(paths)
	const out = new Map<string, ParseError[]>()
	for (const f of files) {
		out.set(
			f.file,
			f.errors.map((e) => ({ line: e.line, message: e.message })),
		)
	}
	return out
}

// ─── dead rubric — a rubric whose attainable maximum can't reach its threshold ─

export interface DeadRubric {
	dimensionsTotal: number
	threshold: number
}

// Hand-rolled line scan (no YAML dependency) over a rubric DocString of the shape:
//   dimensions:
//     - name: correctness
//       max: 3
//   threshold: 4
// Sums every `max:` value (at any indent, so it doesn't depend on YAML nesting rules)
// and reads the (last) `threshold:` value. Returns the violation only when the sum is
// STRICTLY less than the threshold — sum === threshold is a legal all-or-nothing bar
// and must never be reported. Missing/non-numeric threshold or no `max:` lines found
// return null: malformed rubric form is not this check's job to police.
export function findDeadRubric(docString: string): DeadRubric | null {
	let dimensionsTotal = 0
	let sawMax = false
	let threshold: number | null = null

	for (const raw of docString.split('\n')) {
		const line = raw.trim()
		const maxMatch = /^max:\s*(-?\d+(?:\.\d+)?)\s*$/.exec(line)
		if (maxMatch) {
			sawMax = true
			dimensionsTotal += Number(maxMatch[1])
			continue
		}
		const thresholdMatch = /^threshold:\s*(-?\d+(?:\.\d+)?)\s*$/.exec(line)
		if (thresholdMatch) {
			threshold = Number(thresholdMatch[1])
		}
	}

	if (!sawMax || threshold === null) return null
	if (dimensionsTotal >= threshold) return null
	return { dimensionsTotal, threshold }
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

		// Dead rubric: sum(dimension max) < threshold means no subject can ever reach
		// the cut — the rubric grades nothing. Only checked for @rubric scenarios;
		// sum === threshold is a legal strict (all-or-nothing) bar, not a violation.
		if (isRubric) {
			for (const docString of scenario.docStrings) {
				const dead = findDeadRubric(docString)
				if (dead) {
					v.push(
						tag(
							`${label}: rubric cannot be passed — dimensions total ${dead.dimensionsTotal}, threshold ${dead.threshold}`,
						),
					)
				}
			}
		}

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
// offline) while `main` wires the real pinned in-process parser. The parser is the SOLE source of
// Gherkin validity — if it cannot be run at all, every readable path fails closed rather than
// falling back to the permissive scan; if it runs but omits a path from its report, that path
// fails closed too rather than defaulting to "parses fine".
export function checkFilePaths(paths: string[], validate: typeof runGherkinValidate = runGherkinValidate): string[] {
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
		parseErrorsByPath = validate(readable.map((r) => r.path))
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
		if (errs.length === 0) {
			const specPath = join(dirname(p), 'README.md')
			let specText: string | undefined
			try {
				specText = readFileSync(specPath, 'utf8')
			} catch {
				specText = undefined
			}
			if (specText !== undefined) {
				violations.push(...checkScenarioMap(dirname(p), basename(p), text, specText))
			}
		}
	}
	return violations
}

// ─── scenario-map binding ─────────────────────────────────────────────────────
// The sibling spec's `## Scenario map` binds each scenario to a (path class, edge) pair
// (`| Edge | Path (Given) | Scenario |`). Form only: this checks the BINDING is complete and
// non-duplicated. Whether the edges cover the control-flow graph (CFG) is judged, not linted — that
// needs the drawn CFG's semantics, and a green check clears no coverage question.
//
// A spec carrying no `## Scenario map` section is SKIPPED, not failed: the map is the rebuilt node
// format, and a node still on the older shape is not in violation of a section it does not claim.
export interface MapRow {
	edge: string
	path: string
	scenario: string
}

export function parseScenarioMap(specText: string): MapRow[] | undefined {
	const start = specText.indexOf('## Scenario map')
	if (start === -1) return undefined
	const body = specText.slice(start)
	const rows: MapRow[] = []
	for (const line of body.split('\n')) {
		const t = line.trim()
		if (!t.startsWith('|')) continue
		const cells = t
			.split('|')
			.slice(1, -1)
			.map((c) => c.trim())
		if (cells.length !== 3) continue
		const scenario = cells[2] ?? ''
		// Skip the header row and its separator; a data row names its scenario in backticks.
		const m = scenario.match(/^`(.+)`$/)
		if (m === null) continue
		rows.push({ edge: cells[0] ?? '', path: cells[1] ?? '', scenario: m[1] ?? '' })
	}
	return rows
}

export function checkScenarioMap(slug: string, file: string, featureText: string, specText: string): string[] {
	const rows = parseScenarioMap(specText)
	if (rows === undefined) return []
	const tag = (msg: string) => `${slug}/${file}: ${msg}`
	const v: string[] = []

	const titles = [...featureText.matchAll(/^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/gm)].map((m) => m[1] ?? '')
	const mapped = new Set(rows.map((r) => r.scenario))

	for (const t of titles) {
		if (!mapped.has(t)) v.push(tag(`scenario is not on the scenario map — "${t}"`))
	}
	const titleSet = new Set(titles)
	for (const r of rows) {
		if (!titleSet.has(r.scenario)) v.push(tag(`scenario map row names no such scenario — "${r.scenario}"`))
	}
	const seen = new Map<string, string>()
	for (const r of rows) {
		const key = `${r.edge}\u0000${r.path}`
		const prior = seen.get(key)
		if (prior !== undefined) {
			v.push(
				tag(
					`duplicate map pair — edge "${r.edge}" and path "${r.path}" cover both "${prior}" and "${r.scenario}"; a repeated edge needs a DIFFERENT path class`,
				),
			)
		} else seen.set(key, r.scenario)
	}
	return v
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
