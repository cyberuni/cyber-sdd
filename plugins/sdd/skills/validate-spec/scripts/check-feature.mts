#!/usr/bin/env node
// Static .feature analysis for SDD specs — Gherkin validity, boolean form, and
// scenario ordering/sectioning checks. Pure functions are exported for node:test;
// running the file directly drives the CLI. No dependencies — plain node strips
// the types.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── types ────────────────────────────────────────────────────────────────────

export interface ParsedFeature {
	hasFeatureLine: boolean
	scenarios: ParsedScenario[]
	sectionCommentCount: number
}

export interface ParsedScenario {
	name: string
	steps: string[]
	tags: string[]
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
const RUBRIC_EXEMPT_RE = /\b(no|not|never|without|nor|passing|failing|pass|fail|boolean|true|false)\b/i

// ─── parse ────────────────────────────────────────────────────────────────────

export function parseFeature(text: string): ParsedFeature {
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
			const name = line.replace(/^Scenario(?: Outline)?:/i, '').trim()
			current = { name, steps: [], tags: pendingTags }
			pendingTags = []
			continue
		}

		if (current && /^(Given|When|Then|And|But)\b/i.test(line)) {
			current.steps.push(line)
		}
	}

	if (current) scenarios.push(current)

	return { hasFeatureLine, scenarios, sectionCommentCount }
}

// ─── checks ──────────────────────────────────────────────────────────────────

export function checkFeature(slug: string, file: string, text: string): string[] {
	const tag = (msg: string) => `${slug}/${file}: ${msg}`
	const v: string[] = []
	const ref = parseFeature(text)

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
export function discoverFeatureDirs(root: string): { slug: string; files: string[] }[] {
	const out: { slug: string; files: string[] }[] = []
	const walk = (dir: string, rel: string) => {
		let entries: ReturnType<typeof readdirSync>
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

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : 'artifacts/specs'
	let violations: string[] = []

	for (const { slug, files } of discoverFeatureDirs(root)) {
		const slugDir = join(root, slug)
		for (const file of files) {
			const text = readFileSync(join(slugDir, file), 'utf8')
			violations = violations.concat(checkFeature(slug, file, text))
		}
	}

	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`)
		return 1
	}
	process.stdout.write('feature checks OK\n')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
