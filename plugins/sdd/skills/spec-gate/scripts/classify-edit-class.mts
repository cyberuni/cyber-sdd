#!/usr/bin/env node
// classify-edit-class — the structural edit-class classifier for a touched frozen `.feature`
// (`.agents/specs/sdd/authoring/spec-gate/README.md` — "Structural edit-class classification
// (freeze integrity)"). Classifies each touched file's change against its committed baseline so
// the gate can route: additive / no-content-change self-clear; narrowing / mixed take the
// existing narrowing -> Clearance path. This engine only CLASSIFIES — it fires no verdict and
// adds no new floor.
//
// The classification is STRUCTURAL, never a raw git line-diff. A raw line-diff is fooled by a
// trailing step orphaned off a frozen scenario onto a newly added adjacent scenario: the orphan
// shows no `-` line and reads as purely additive, so a narrowing self-clears silently and
// Clearance never fires. The pinned `gherkin-cli@0.0.1 diff --base <ref> <file> --format json`
// (`../../design/gherkin-cli-dependency.md`) is AST-level and is not fooled — it reports the
// losing baseline scenario as `modified` (`addOnly: false`).
//
// Classifications:
//   unfrozen-skip    — the file carries no feature-level @frozen tag in the baseline OR the
//                       working version; the edit-class routing does not apply to it.
//   additive         — addOnly true and at least one whole scenario was added; no baseline
//                       scenario was modified or removed.
//   no-content-change — a pure rename (git rename detection, 100% content match) or a diff with
//                       zero added/modified/removed scenarios.
//   narrowing        — at least one baseline scenario is modified or removed (no scenario added).
//   mixed            — both a whole-scenario addition AND a modified/removed baseline scenario.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies — plain node strips the types.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── types ────────────────────────────────────────────────────────────────────

export type EditClassification = 'unfrozen-skip' | 'additive' | 'no-content-change' | 'narrowing' | 'mixed'

export type ScenarioChangeKind = 'added' | 'modified' | 'removed' | 'unchanged'

export interface ScenarioChange {
	name: string
	change: ScenarioChangeKind
}

export interface GherkinDiffFileResult {
	file: string
	addOnly: boolean
	scenarios: ScenarioChange[]
}

export interface GherkinDiffOutput {
	summary: { addOnly: boolean }
	files: GherkinDiffFileResult[]
}

export interface ClassificationResult {
	file: string
	classification: EditClassification
	scenarios: ScenarioChange[]
}

// ─── feature-level @frozen tag ─────────────────────────────────────────────────

// A feature-level tag sits on the contiguous block of `@tag` lines immediately above the
// `Feature:` line (blank lines between tags and Feature: are tolerated). Only that block is
// consulted — a scenario-level tag further down the file is not a feature-level freeze marker.
export function hasFeatureFrozenTag(text: string): boolean {
	const lines = text.split('\n')
	const featureIdx = lines.findIndex((l) => /^\s*Feature:/i.test(l))
	if (featureIdx === -1) return false
	const tags: string[] = []
	for (let i = featureIdx - 1; i >= 0; i--) {
		const line = lines[i].trim()
		if (line === '') continue
		if (line.startsWith('@')) {
			tags.push(...line.split(/\s+/).filter(Boolean))
			continue
		}
		break
	}
	return tags.includes('@frozen')
}

// ─── structural classification from a gherkin-cli diff result ─────────────────

// Classifies purely from the per-scenario `change` array a gherkin-cli diff reports — never from
// a raw line count. `additive` requires at least one whole-scenario addition and zero
// modified/removed baseline scenarios; `narrowing` is any modified/removed baseline scenario with
// no addition; both together is `mixed`; neither is `no-content-change` (a diff against the
// baseline with nothing structurally different).
export function classifyFromDiff(fileResult: { addOnly: boolean; scenarios: ScenarioChange[] }): EditClassification {
	const added = fileResult.scenarios.some((s) => s.change === 'added')
	const narrowed = fileResult.scenarios.some((s) => s.change === 'modified' || s.change === 'removed')
	if (added && narrowed) return 'mixed'
	if (narrowed) return 'narrowing'
	if (added) return 'additive'
	return 'no-content-change'
}

// ─── pure rename detection (git, not gherkin-cli) ──────────────────────────────
// gherkin-cli diff reads the base ref's content AT THE SAME PATH — a renamed file has no content
// at its new path in the base ref, so gherkin-cli alone reports every scenario as freshly
// "added" (addOnly: true) for a pure rename, indistinguishable from a genuinely new file. Git's
// own rename detection (`-M`) pairs the old and new paths across the whole tree and scores their
// similarity; a 100% score is a zero-content-delta pure rename.

export interface RenameStatus {
	score: number
	oldPath: string
	newPath: string
}

export function parseRenameStatus(nameStatusOutput: string): RenameStatus[] {
	const out: RenameStatus[] = []
	for (const line of nameStatusOutput.split('\n')) {
		const m = /^R(\d+)\t([^\t]+)\t([^\t]+)$/.exec(line)
		if (m) out.push({ score: Number(m[1]), oldPath: m[2], newPath: m[3] })
	}
	return out
}

function detectPureRename(base: string, path: string, cwd: string): boolean {
	try {
		const out = execFileSync('git', ['diff', '--name-status', '-M', base], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		return parseRenameStatus(out).some((r) => r.newPath === path && r.score === 100)
	} catch {
		return false
	}
}

// Reads a path's content at a given git ref (the committed baseline). Any failure (new file at
// base, path not tracked at base, git absent) returns '' — the safe default that reads as
// "no baseline", matching check-spec-state.mts's readBaselineFromGit convention.
function readGitShow(base: string, path: string, cwd: string): string {
	try {
		return execFileSync('git', ['show', `${base}:${path}`], {
			encoding: 'utf8',
			cwd,
			stdio: ['ignore', 'pipe', 'ignore'],
		})
	} catch {
		return ''
	}
}

// Thin exec wrapper around the pinned `gherkin-cli@0.0.1 diff` — never a re-implemented differ.
// Not unit-tested directly (network/binary boundary); classifyFromDiff carries the tested logic.
function runGherkinDiff(base: string, path: string, cwd: string): GherkinDiffOutput {
	const stdout = execFileSync('npx', ['gherkin-cli@0.0.1', 'diff', path, '--base', base, '--format', 'json'], {
		encoding: 'utf8',
		cwd,
	})
	return JSON.parse(stdout) as GherkinDiffOutput
}

// ─── per-file classification ────────────────────────────────────────────────────

export function classifyFile(path: string, base: string, cwd = '.'): ClassificationResult {
	let currentText: string
	try {
		currentText = readFileSync(join(cwd, path), 'utf8')
	} catch {
		currentText = ''
	}
	const baselineText = readGitShow(base, path, cwd)

	// Skip files carrying no feature-level @frozen tag in EITHER the baseline or the working
	// version — the edit-class routing this engine feeds only applies to frozen files.
	if (!hasFeatureFrozenTag(currentText) && !hasFeatureFrozenTag(baselineText)) {
		return { file: path, classification: 'unfrozen-skip', scenarios: [] }
	}

	// A pure rename is not a gate-able edit regardless of what gherkin-cli would (mis)report at
	// the new path — check git's rename detection before ever calling gherkin-cli.
	if (detectPureRename(base, path, cwd)) {
		return { file: path, classification: 'no-content-change', scenarios: [] }
	}

	const diff = runGherkinDiff(base, path, cwd)
	const fileResult = diff.files.find((f) => f.file === path) ?? diff.files[0]
	const scenarios = fileResult?.scenarios ?? []
	const classification = classifyFromDiff({ addOnly: fileResult?.addOnly ?? true, scenarios })
	return { file: path, classification, scenarios }
}

// The classification is scoped to the CR's touched .feature files only — a caller passes the
// explicit touched-path list, never a tree-wide sweep.
export function classifyFiles(paths: string[], base: string, cwd = '.'): ClassificationResult[] {
	return paths.filter((p) => p.endsWith('.feature')).map((p) => classifyFile(p, base, cwd))
}

// ─── output ──────────────────────────────────────────────────────────────────

export function formatText(results: ClassificationResult[]): string {
	const lines: string[] = []
	for (const r of results) {
		lines.push(`${r.classification.toUpperCase().padEnd(18)} ${r.file}`)
		for (const s of r.scenarios) {
			if (s.change !== 'unchanged') lines.push(`  ${s.change.padEnd(10)} ${s.name}`)
		}
	}
	return lines.join('\n')
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

function parseFilesArg(argv: string[]): string[] {
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
	const paths = parseFilesArg(argv)
	if (paths.length === 0) {
		console.error('✗ --files requires at least one .feature path')
		return 1
	}
	const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'HEAD'
	const format = argv.includes('--format') ? argv[argv.indexOf('--format') + 1] : 'text'

	const results = classifyFiles(paths, base)

	if (format === 'json') {
		process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
	} else {
		process.stdout.write(`${formatText(results)}\n`)
	}
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
