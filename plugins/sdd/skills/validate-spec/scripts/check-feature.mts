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
}

// ─── hedge words that signal rubric / probabilistic assertions ────────────────

const HEDGE_WORDS = ['sometimes', 'usually', 'often', 'occasionally', 'score', 'threshold', 'rubric']
const HEDGE_PATTERNS = [...HEDGE_WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i')), /\b1[-–]5\b/]

// ─── parse ────────────────────────────────────────────────────────────────────

export function parseFeature(text: string): ParsedFeature {
	const lines = text.split('\n')
	let hasFeatureLine = false
	let sectionCommentCount = 0
	const scenarios: ParsedScenario[] = []
	let current: ParsedScenario | null = null

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

		if (/^Scenario:/i.test(line) || /^Scenario Outline:/i.test(line)) {
			if (current) scenarios.push(current)
			const name = line.replace(/^Scenario(?: Outline)?:/i, '').trim()
			current = { name, steps: [] }
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

		// Boolean form: no hedge words in any step
		for (const step of steps) {
			for (const pattern of HEDGE_PATTERNS) {
				if (pattern.test(step)) {
					v.push(tag(`${label}: step contains non-boolean hedge — "${step.trim()}" (matched ${pattern.source})`))
					break // one violation per step is enough
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

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : 'artifacts/specs'
	let violations: string[] = []

	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue
		const slugDir = join(root, entry.name)
		let files: string[]
		try {
			files = readdirSync(slugDir).filter((f) => f.endsWith('.feature'))
		} catch {
			continue
		}
		for (const file of files) {
			const text = readFileSync(join(slugDir, file), 'utf8')
			violations = violations.concat(checkFeature(entry.name, file, text))
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
