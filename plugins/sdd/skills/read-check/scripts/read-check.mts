#!/usr/bin/env node
// Mechanical lint for the read-attestation a spawned role returns
// (.agents/specs/sdd/mission/read-check/). Checks PRESENCE and PARROTING only — the two
// edges the spec's form-vs-judged split assigns to the lint (D1-D4 in the README's Logic
// graph). Whether a restatement tracks its directive's MEANING (D5) is judged, never linted
// here: a green result from this file clears no honesty question. No dependencies — plain
// node strips the types.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── types ────────────────────────────────────────────────────────────────────

export interface AttestedGovernance {
	name: string
	// Absent/undefined means "named but not restated" — legal only when the governance
	// carries no `## Key points (read-check)` section (naming it suffices).
	restatement?: string
}

export interface Attestation {
	governances: AttestedGovernance[]
}

// A governance loader maps an attested name to its SKILL.md text, or undefined if it
// cannot be found/read. Injected (like check-suite's `validate`) so unit tests exercise
// the check logic against synthetic fixtures without touching the real skills tree.
export type GovernanceLoader = (name: string) => string | undefined

// ─── attestation parsing ───────────────────────────────────────────────────────

// JSON, not markdown. The attestation is machine-produced (a role's own return value,
// not hand-authored prose a human edits), so there is no authoring-ergonomics reason to
// prefer markdown, and JSON gives an unambiguous name/restatement pairing with no heading-
// level or list-nesting parsing to get wrong. A malformed or absent parse is NOT the same
// failure as "file missing" at the CLI boundary, but both collapse to `undefined` here —
// the check logic below treats "no attestation object" as the D1 ABSENT case either way.
export function parseAttestation(raw: string): Attestation | undefined {
	let data: unknown
	try {
		data = JSON.parse(raw)
	} catch {
		return undefined
	}
	if (typeof data !== 'object' || data === null) return undefined
	const gs = (data as { governances?: unknown }).governances
	if (!Array.isArray(gs)) return undefined

	const governances: AttestedGovernance[] = []
	for (const g of gs) {
		if (typeof g !== 'object' || g === null) continue
		const name = (g as { name?: unknown }).name
		if (typeof name !== 'string' || name.length === 0) continue
		const restatementRaw = (g as { restatement?: unknown }).restatement
		const restatement = typeof restatementRaw === 'string' ? restatementRaw : undefined
		governances.push({ name, restatement })
	}
	return { governances }
}

// ─── key-points extraction ─────────────────────────────────────────────────────

const KEY_POINTS_HEADING_RE = /^##\s+Key points \(read-check\)\s*$/

// Returns the body between the `## Key points (read-check)` heading and the next `##`
// heading (or EOF), or undefined when a governance's SKILL.md carries no such section —
// the six governances the spec names as exempt (lifecycle, gate-validation, combat-log,
// plugin-contract, solution-producer, spec-producer) resolve here.
export function extractKeyPoints(skillMd: string): string | undefined {
	const lines = skillMd.split('\n')
	let start = -1
	for (let i = 0; i < lines.length; i++) {
		if (KEY_POINTS_HEADING_RE.test(lines[i] ?? '')) {
			start = i + 1
			break
		}
	}
	if (start === -1) return undefined

	const body: string[] = []
	for (let i = start; i < lines.length; i++) {
		if (/^##\s+/.test(lines[i] ?? '')) break
		body.push(lines[i] ?? '')
	}
	return body.join('\n').trim()
}

// ─── parroting — verbatim n-gram overlap ───────────────────────────────────────
//
// The spec's own rationale for this split: verbatim overlap is certain evidence in ONE
// direction only. High overlap proves the text was copied (a lint can fail on it without
// judgment); low overlap proves nothing (a fluent paraphrase of an unread directive is
// still hollow) — that positive direction stays with the judge. So this only ever
// FAILS on overlap; it never PASSES anything on the strength of low overlap.
//
// Implementation: word 6-grams (shingles), the same window size mainstream plagiarism
// detectors (e.g. Turnitin-style fingerprinting) use because a genuine paraphrase —
// different word order, different word choices — essentially never reproduces six
// consecutive source words by chance, while copy-with-light-editing reliably does.
// Threshold 0.25: if a QUARTER or more of the restatement's 6-word runs appear verbatim
// in the source, that is copying, not paraphrase — chosen conservatively above 0 (a
// stray shared 6-gram, e.g. a proper noun plus boilerplate, should not alone convict) and
// well below 1 (we don't require the whole restatement to be copied to call it parroted).
const PARROT_NGRAM_SIZE = 6
const PARROT_OVERLAP_THRESHOLD = 0.25

function normalizeWords(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[`*_#>]/g, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean)
}

function shingles(words: string[], n: number): string[] {
	if (words.length < n) return []
	const out: string[] = []
	for (let i = 0; i <= words.length - n; i++) out.push(words.slice(i, i + n).join(' '))
	return out
}

// Exported so the threshold/heuristic can be probed directly in tests, independent of
// the fail/pass boolean.
export function parrotOverlapRatio(restatement: string, keyPoints: string): number {
	const rWords = normalizeWords(restatement)
	const sWords = normalizeWords(keyPoints)
	if (rWords.length === 0) return 0

	// Too short to shingle at the chosen window: fall back to whole-sequence containment
	// — is the entire (short) restatement a contiguous run inside the source text? This
	// keeps short restatements from escaping the check merely by being shorter than the
	// n-gram window.
	if (rWords.length < PARROT_NGRAM_SIZE || sWords.length < PARROT_NGRAM_SIZE) {
		const rJoined = rWords.join(' ')
		const sJoined = sWords.join(' ')
		return sJoined.includes(rJoined) ? 1 : 0
	}

	const sourceShingles = new Set(shingles(sWords, PARROT_NGRAM_SIZE))
	const restatementShingles = shingles(rWords, PARROT_NGRAM_SIZE)
	const overlapCount = restatementShingles.filter((s) => sourceShingles.has(s)).length
	return overlapCount / restatementShingles.length
}

export function isParroted(restatement: string, keyPoints: string): boolean {
	return parrotOverlapRatio(restatement, keyPoints) >= PARROT_OVERLAP_THRESHOLD
}

// ─── the lint ───────────────────────────────────────────────────────────────────

// Scope (the spec's non-goal): only governances the attestation NAMES as loaded are ever
// checked — this loop never iterates over a role's full declared bar set, so a bar the
// role's governance-resolution left unbound for this role's decisions is never required
// here. That is enforced structurally: there is nothing else to iterate over but
// `attestation.governances`.
export function checkAttestation(attestation: Attestation | undefined, loadSkillMd: GovernanceLoader): string[] {
	if (attestation === undefined) {
		return ['no read-attestation was returned — the role attested nothing']
	}

	const violations: string[] = []
	for (const g of attestation.governances) {
		const skillMd = loadSkillMd(g.name)
		if (skillMd === undefined) {
			violations.push(`${g.name}: attested governance could not be loaded to verify its key points`)
			continue
		}

		const keyPoints = extractKeyPoints(skillMd)
		if (keyPoints === undefined) {
			// No `## Key points (read-check)` section — naming this governance suffices,
			// per the six-governance exemption the spec names.
			continue
		}

		if (!g.restatement || g.restatement.trim().length === 0) {
			violations.push(`${g.name}: carries a Key points (read-check) section but no restatement was attested`)
			continue
		}

		if (isParroted(g.restatement, keyPoints)) {
			violations.push(`${g.name}: restatement reproduces the source key-points text — copied, not read`)
		}
	}
	return violations
}

// ─── CLI wiring ───────────────────────────────────────────────────────────────

function argValue(argv: string[], flag: string): string | undefined {
	const idx = argv.indexOf(flag)
	if (idx === -1 || idx + 1 >= argv.length) return undefined
	return argv[idx + 1]
}

export function loadGovernanceFromSkillsDir(skillsDir: string): GovernanceLoader {
	return (name: string): string | undefined => {
		try {
			return readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8')
		} catch {
			return undefined
		}
	}
}

export function main(argv: string[]): number {
	const attestationPath = argValue(argv, '--attestation')
	const skillsDir = argValue(argv, '--skills-dir') ?? 'plugins/sdd/skills'

	let raw: string | undefined
	if (attestationPath !== undefined) {
		try {
			raw = readFileSync(attestationPath, 'utf8')
		} catch {
			raw = undefined
		}
	}

	const attestation = raw !== undefined ? parseAttestation(raw) : undefined
	const violations = checkAttestation(attestation, loadGovernanceFromSkillsDir(skillsDir))

	if (violations.length) {
		for (const v of violations) console.error(`✗ ${v}`)
		return 1
	}

	process.stdout.write('read-check lint OK — no missing restatement, nothing parroted.\n')
	process.stdout.write(
		"This clears no honesty question: whether each restatement tracks its directive's meaning is JUDGED, not linted — that verdict remains open.\n",
	)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
