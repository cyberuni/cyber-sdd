#!/usr/bin/env node
// check-scenario-overlap — project-spec/scenario-overlap's concrete engine. Audits ACROSS the nodes
// of one project spec and surfaces where the same behavior lives in more than one node's `.feature`:
// the intra-project spec-level SSA partner of the code-side collision ladder, and the cross-node
// axis check-spec-structure (intra-node node-shape) leaves uncovered (see this skill's README.md).
//
// Two deterministic candidate kinds, each with a severity:
//   - exact-duplicate (blocking) — two DISTINCT nodes whose suites each carry a scenario with an
//     identical normalized step fingerprint. `--check` fails on it.
//   - title-overlap (advisory)   — two distinct nodes sharing a normalized scenario title but with
//     DIFFERING step fingerprints. A weaker hint; never fails `--check`.
// Confirming real behavioral overlap and assigning the owning node is Warden judgment (the @rubric
// scenario) — no engine code here.
//
// The fingerprint is computed from step BODIES only (title/tags/comments/prose never reach it), so
// the signal is behavior-shaped, not cosmetic. Detection is cross-node only: a within-node duplicate
// and a once-corpus-wide scenario both raise nothing. Pure derivation, writes nothing, no deps (the
// repo's node->=23.6 / no-deps convention). Pure functions are exported for node:test; running the
// file directly drives the CLI.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

export type CandidateKind = 'exact-duplicate' | 'title-overlap'
export type Severity = 'blocking' | 'advisory'

export interface Scenario {
	title: string
	/** Normalized ordered step bodies joined — the behavior fingerprint. */
	fingerprint: string
	/** Normalized title — the weaker signal. */
	titleKey: string
}

export interface NodeSuite {
	/** Display form of the owning node — its folder path. */
	node: string
	scenarios: Scenario[]
}

export interface Candidate {
	kind: CandidateKind
	severity: Severity
	nodes: [string, string]
	scenario: string
	detail: string
}

// ── Normalization ──
export function normalize(s: string): string {
	return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

// ── Parse a .feature into its scenarios (steps only reach the fingerprint) ──
const STEP = /^\s*(Given|When|Then|And|But)\s+(.*\S)\s*$/
const SCENARIO = /^\s*Scenario(?: Outline)?:\s*(.*\S)\s*$/

export function parseFeature(featureText: string): Scenario[] {
	const scenarios: Scenario[] = []
	let title: string | null = null
	let steps: string[] = []
	const flush = () => {
		if (title !== null) {
			scenarios.push({
				title,
				titleKey: normalize(title),
				fingerprint: steps.map(normalize).join('\n'),
			})
		}
		title = null
		steps = []
	}
	for (const line of featureText.split('\n')) {
		const sc = SCENARIO.exec(line)
		if (sc) {
			flush()
			title = sc[1]
			continue
		}
		if (title === null) continue
		const st = STEP.exec(line)
		if (st) steps.push(st[2])
	}
	flush()
	return scenarios
}

function displayPath(relPath: string): string {
	const p = relPath.replace(/\\/g, '/')
	return p.endsWith('/README.md') ? p.slice(0, -'README.md'.length) : p
}

// ── Scan the project-spec — one suite per node folder that carries a .feature ──
export function scanSuites(specDir: string): NodeSuite[] {
	const suites: NodeSuite[] = []
	walk(specDir, specDir, suites)
	return suites.sort((a, b) => a.node.localeCompare(b.node))
}

function walk(dir: string, specDir: string, out: NodeSuite[]): void {
	const entries = readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
		const full = join(dir, entry.name)
		if (entry.isDirectory()) {
			walk(full, specDir, out)
			continue
		}
		if (!entry.name.endsWith('.feature')) continue
		const scenarios = parseFeature(readFileSync(full, 'utf8'))
		if (scenarios.length === 0) continue
		const relDir = dir.slice(specDir.length + 1).replace(/\\/g, '/')
		out.push({ node: displayPath(`${relDir}/`), scenarios })
	}
}

// ── Detect — cross-node only (distinct nodes), fingerprint then title ──
export function detect(suites: NodeSuite[]): Candidate[] {
	// fingerprint -> (node -> first scenario title in that node)
	const byFingerprint = new Map<string, Map<string, string>>()
	// titleKey -> (node -> { fingerprints, display title })
	const byTitle = new Map<string, Map<string, { fps: Set<string>; title: string }>>()
	for (const suite of suites) {
		for (const sc of suite.scenarios) {
			if (sc.fingerprint !== '') {
				let m = byFingerprint.get(sc.fingerprint)
				if (!m) byFingerprint.set(sc.fingerprint, (m = new Map()))
				if (!m.has(suite.node)) m.set(suite.node, sc.title)
			}
			let t = byTitle.get(sc.titleKey)
			if (!t) byTitle.set(sc.titleKey, (t = new Map()))
			let e = t.get(suite.node)
			if (!e) t.set(suite.node, (e = { fps: new Set(), title: sc.title }))
			e.fps.add(sc.fingerprint)
		}
	}
	const candidates: Candidate[] = []
	// exact-duplicate: same fingerprint across >=2 distinct nodes
	for (const [, nodeMap] of byFingerprint) {
		if (nodeMap.size < 2) continue
		const nodes = [...nodeMap.keys()].sort()
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				candidates.push({
					kind: 'exact-duplicate',
					severity: 'blocking',
					nodes: [nodes[i], nodes[j]],
					scenario: nodeMap.get(nodes[i]) ?? '',
					detail:
						'identical step fingerprint — the same behavior is specified in both nodes; one behavior = one owning node',
				})
			}
		}
	}
	// title-overlap: same normalized title across >=2 distinct nodes with DIFFERING fingerprints
	for (const [, nodeMap] of byTitle) {
		if (nodeMap.size < 2) continue
		const nodes = [...nodeMap.keys()].sort()
		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodeMap.get(nodes[i])
				const b = nodeMap.get(nodes[j])
				if (!a || !b) continue
				const shareFp = [...a.fps].some((fp) => b.fps.has(fp))
				if (shareFp) continue // this title pair is already an exact-duplicate
				candidates.push({
					kind: 'title-overlap',
					severity: 'advisory',
					nodes: [nodes[i], nodes[j]],
					scenario: a.title,
					detail: 'same scenario title, differing steps — a weaker overlap hint the Warden judges',
				})
			}
		}
	}
	return candidates
}

export function hasBlocking(candidates: Candidate[]): boolean {
	return candidates.some((c) => c.severity === 'blocking')
}

// ── Render ──
export function renderCandidates(candidates: Candidate[], specDir: string): string {
	const blocking = candidates.filter((c) => c.severity === 'blocking')
	const advisory = candidates.filter((c) => c.severity === 'advisory')
	const lines: string[] = [`check-scenario-overlap: spec-dir=${specDir}`]
	lines.push(`blocking[${blocking.length}]:`)
	for (const c of blocking) lines.push(`  ${c.nodes[0]} <-> ${c.nodes[1]} — ${c.kind}: "${c.scenario}" — ${c.detail}`)
	lines.push(`advisory[${advisory.length}]:`)
	for (const c of advisory) lines.push(`  ${c.nodes[0]} <-> ${c.nodes[1]} — ${c.kind}: "${c.scenario}" — ${c.detail}`)
	lines.push('note: advisory — candidates feed the Warden formation pass; the engine writes nothing')
	return lines.join('\n')
}

// ── CLI ──
export function main(argv: string[]): number {
	let specDir = '.'
	let mode: 'audit' | 'check' = 'audit'
	let format: 'toon' | 'json' = 'toon'
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--spec-dir') specDir = argv[++i] ?? '.'
		else if (a === '--check') mode = 'check'
		else if (a === '--format') format = (argv[++i] as 'toon' | 'json') ?? 'toon'
	}
	const candidates = detect(scanSuites(specDir))
	if (mode === 'check') {
		if (hasBlocking(candidates)) {
			process.stderr.write(
				`check-scenario-overlap: ${candidates.filter((c) => c.severity === 'blocking').length} exact-duplicate candidate(s)\n`,
			)
			return 1
		}
		process.stdout.write('check-scenario-overlap: no exact-duplicate candidates\n')
		return 0
	}
	if (format === 'json') process.stdout.write(`${JSON.stringify(candidates)}\n`)
	else process.stdout.write(`${renderCandidates(candidates, specDir)}\n`)
	return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(main(process.argv.slice(2)))
}
