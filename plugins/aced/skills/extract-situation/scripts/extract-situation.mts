#!/usr/bin/env node
// extract-situation — mechanically redacts a named .feature scenario down to its SITUATION: the
// Given/When steps only. This is the fix for the "eval cannot fail" defect in
// plugins/aced/agents/aced-case-judge.md — that judge is handed the scenario's Then/And/But
// assertions AND its inline @rubric in the SAME context it simulates the subject in, so the
// simulator sees the answer key before it acts. A simulating context must see ONLY this engine's
// output: never the scenario name, never a Then/And/But, never a docstring, never a tag, never a
// sibling scenario.
//
// The keyword-inheritance rule is the load-bearing logic: `And`/`But` inherit the keyword of the
// concrete step above them (`Given X` / `And Y` → Y is a Given; `Then A` / `And B` → B is a
// Then). Each step's EFFECTIVE keyword — never its literal `And`/`But` text — decides inclusion.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies — plain node strips the types.

import { readFileSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// ─── types ────────────────────────────────────────────────────────────────────

export type ConcreteKeyword = 'Given' | 'When' | 'Then'

// An `And`/`But` with no concrete step above it has no keyword to inherit. It resolves to
// `unresolved` and is withheld: a step whose keyword cannot be established is never emitted.
export type EffectiveKeyword = ConcreteKeyword | 'unresolved'

export interface Step {
	text: string
	effectiveKeyword: EffectiveKeyword
	// A docstring belongs to the step above it and inherits that step's fate. Under a `Given`/`When`
	// it IS the situation (the prompt under test); under a `Then` it is the answer key (the rubric).
	docstring: { fence: string; lines: string[] } | null
}

export interface ParsedScenario {
	name: string
	steps: Step[]
	isOutline: boolean
	examples: { header: string[]; rows: string[][] } | null
}

export interface Situation {
	// Every emitted step, in the order the file lists them. `given`/`when` regroup the same steps
	// by keyword; the brief is rendered from `steps`, so an interleaved scenario reads as written.
	steps: string[]
	given: string[]
	when: string[]
	placeholders: string[]
	examples: { header: string[]; rows: string[][] } | null
}

// ─── parse ────────────────────────────────────────────────────────────────────

// Finds every scenario in the file (name, steps with resolved keywords, outline/Examples). Steps
// carry the ORIGINAL line text (minus indentation) so the brief is verbatim; only the keyword used
// for inclusion is resolved.
//
// Docstring lines are skipped wholesale rather than left to fall through the step regex. A rubric
// ladder routinely opens a line with a step keyword ("When the agent stages only related files,
// award 3"); read as a step, that line both leaks the answer key into the brief AND overwrites
// `lastKeyword`, so the collapsing `And ... at least the threshold` below it inherits `When` and
// leaks too.
export function parseScenarios(text: string): ParsedScenario[] {
	const lines = text.split('\n')
	const scenarios: ParsedScenario[] = []
	let current: ParsedScenario | null = null
	let lastKeyword: ConcreteKeyword | null = null
	let docstringFence: string | null = null
	let docstringOwner: Step | null = null

	for (const raw of lines) {
		const line = raw.trimStart()

		// Docstring lines are captured onto their owning step, never re-read as steps. Letting them
		// fall through the step regex is what leaks a rubric ladder that opens with a step keyword
		// ("When the agent stages only related files, award 3") into the brief, and overwrites
		// `lastKeyword` so the collapsing `And ... at least the threshold` below it leaks too.
		const fence = /^("""|```)/.exec(line)?.[1]
		if (docstringFence) {
			if (fence === docstringFence) {
				docstringFence = null
				docstringOwner = null
			} else if (docstringOwner?.docstring) {
				docstringOwner.docstring.lines.push(raw)
			}
			continue
		}
		if (fence) {
			docstringFence = fence
			const owner = current?.steps.at(-1) ?? null
			if (owner) {
				owner.docstring = { fence, lines: [] }
				docstringOwner = owner
			}
			continue
		}

		if (/^Scenario:/i.test(line) || /^Scenario Outline:/i.test(line)) {
			if (current) scenarios.push(current)
			const isOutline = /^Scenario Outline:/i.test(line)
			const name = line.replace(/^Scenario(?: Outline)?:/i, '').trim()
			current = { name, steps: [], isOutline, examples: null }
			lastKeyword = null
			continue
		}

		if (current && /^Examples:/i.test(line)) {
			current.examples = { header: [], rows: [] }
			continue
		}

		if (current?.examples && line.startsWith('|')) {
			const cells = line
				.split('|')
				.slice(1, -1)
				.map((c) => c.trim())
			if (current.examples.header.length === 0) current.examples.header = cells
			else current.examples.rows.push(cells)
			continue
		}

		const stepMatch = /^(Given|When|Then|And|But)\b/i.exec(line)
		if (current && stepMatch) {
			const literal = stepMatch[1]
			const resolved: EffectiveKeyword = /^(Given|When|Then)$/i.test(literal)
				? ((literal[0].toUpperCase() + literal.slice(1).toLowerCase()) as ConcreteKeyword)
				: (lastKeyword ?? 'unresolved')
			current.steps.push({ text: line, effectiveKeyword: resolved, docstring: null })
			if (resolved !== 'unresolved') lastKeyword = resolved
		}
	}

	if (current) scenarios.push(current)
	return scenarios
}

// ─── extraction ───────────────────────────────────────────────────────────────

export class ScenarioNotFoundError extends Error {}
export class AmbiguousScenarioError extends Error {}
export class UnparseableFeatureError extends Error {}
// A scenario the file holds but which carries no Given/When has no situation to simulate from. It
// fails closed rather than emitting an empty brief: a simulator handed nothing simulates nothing,
// the case scores low, and the eval reads as a defect in the SUBJECT rather than in the extraction.
export class EmptySituationError extends Error {}
// A `Scenario Outline` row index that the Examples table does not hold.
export class RowOutOfRangeError extends Error {}

// Extracts the redacted situation for the named scenario: its Given/When steps only, by EFFECTIVE
// keyword (never literal text) — every Then/And/But-after-Then step, every tag, the scenario name
// itself, and every sibling scenario are excluded by construction (never read into the result).
// Fails closed: an unparseable file, a missing name, or a duplicate name throws rather than
// returning an empty-but-plausible brief a caller could mistake for a valid one.
export function extractSituation(text: string, scenarioName: string, fileLabel: string, row?: number): Situation {
	if (!/^\s*Feature:/im.test(text)) {
		throw new UnparseableFeatureError(`${fileLabel}: not a valid .feature file (no Feature: line)`)
	}

	const scenarios = parseScenarios(text)
	const matches = scenarios.filter((s) => s.name === scenarioName)

	if (matches.length === 0) {
		throw new ScenarioNotFoundError(`${fileLabel}: scenario not found: "${scenarioName}"`)
	}
	if (matches.length > 1) {
		throw new AmbiguousScenarioError(
			`${fileLabel}: scenario name is ambiguous (${matches.length} matches): "${scenarioName}"`,
		)
	}

	const scenario = matches[0]
	const emitted = scenario.steps.filter((s) => s.effectiveKeyword === 'Given' || s.effectiveKeyword === 'When')
	const steps = emitted.flatMap((s) =>
		s.docstring ? [s.text, s.docstring.fence, ...s.docstring.lines, s.docstring.fence] : [s.text],
	)
	const withDoc = (s: Step) =>
		s.docstring ? [s.text, s.docstring.fence, ...s.docstring.lines, s.docstring.fence] : [s.text]
	const given = emitted.filter((s) => s.effectiveKeyword === 'Given').flatMap(withDoc)
	const when = emitted.filter((s) => s.effectiveKeyword === 'When').flatMap(withDoc)

	if (steps.length === 0) {
		throw new EmptySituationError(`${fileLabel}: scenario has no Given or When steps: "${scenarioName}"`)
	}

	const placeholders = [...new Set(steps.flatMap((s) => [...s.matchAll(/<([^>]+)>/g)].map((m) => m[1])))]

	let examples: Situation['examples'] = null
	if (scenario.isOutline && scenario.examples && placeholders.length > 0) {
		const keepIdx = scenario.examples.header
			.map((col, i) => (placeholders.includes(col) ? i : -1))
			.filter((i) => i !== -1)
		if (keepIdx.length > 0) {
			// One row is one case: judge scores a single invoke decision per invocation, so an outline
			// is extracted a row at a time rather than handed over whole.
			const allRows = scenario.examples.rows
			if (row !== undefined && (row < 0 || row >= allRows.length)) {
				throw new RowOutOfRangeError(
					`${fileLabel}: row ${row} is outside the Examples table (${allRows.length} rows): "${scenarioName}"`,
				)
			}
			const picked = row === undefined ? allRows : [allRows[row]]
			examples = {
				header: keepIdx.map((i) => scenario.examples!.header[i]),
				rows: picked.map((r) => keepIdx.map((i) => r[i])),
			}
		}
	}

	return { steps, given, when, placeholders, examples }
}

// ─── format ───────────────────────────────────────────────────────────────────

function formatTable(table: { header: string[]; rows: string[][] }): string {
	const line = (cells: string[]) => `| ${cells.join(' | ')} |`
	return [line(table.header), ...table.rows.map(line)].join('\n')
}

export function formatMarkdown(situation: Situation): string {
	const lines: string[] = ['## Situation', '']
	for (const step of situation.steps) lines.push(step)
	if (situation.examples) {
		lines.push('', 'Examples:', formatTable(situation.examples))
	}
	return `${lines.join('\n')}\n`
}

export function formatJson(situation: Situation): string {
	return `${JSON.stringify(situation, null, 2)}\n`
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

export function main(argv: string[]): number {
	const featurePath = flag(argv, '--feature')
	const scenarioName = flag(argv, '--scenario')
	const rowRaw = flag(argv, '--row')
	const format = flag(argv, '--format') ?? (argv.includes('--json') ? 'json' : 'text')

	if (!featurePath || !scenarioName) {
		console.error('✗ usage: extract-situation.mts --feature <path> --scenario "<name>" [--row <n>] [--format json]')
		return 1
	}

	let row: number | undefined
	if (rowRaw !== undefined) {
		row = Number(rowRaw)
		if (!Number.isInteger(row) || row < 0) {
			console.error(`✗ --row must be a non-negative integer, got "${rowRaw}"`)
			return 1
		}
	}

	let text: string
	try {
		text = readFileSync(featurePath, 'utf8')
	} catch {
		console.error(`✗ ${featurePath}: cannot read file`)
		return 1
	}

	try {
		const situation = extractSituation(text, scenarioName, featurePath, row)
		process.stdout.write(format === 'json' ? formatJson(situation) : formatMarkdown(situation))
		return 0
	} catch (err) {
		console.error(`✗ ${(err as Error).message}`)
		return 1
	}
}

// `import.meta.main` is Node >=24.2, but this repo's engines floor is >=22, where it is `undefined`
// — the CLI would never run, printing nothing and exiting 0. A caller keying its BLOCKER on a
// non-zero exit would read that empty brief as a success and simulate from nothing.
//
// `pathToFileURL`, not `file://${process.argv[1]}`: `import.meta.url` percent-encodes, so the naive
// concat mismatches on any path holding a space (or #, ?, %) and silently reproduces that same
// never-fires bug — the trigger merely moves from a Node version to an install path.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
