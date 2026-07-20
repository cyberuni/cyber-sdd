#!/usr/bin/env node
// Runs every project-spec engine against the ONE project spec that governs the
// invoking package — resolved from the spec's own `project-path`, never from a
// hardcoded path. Pure functions are exported for node:test; running the file
// directly drives the CLI. No dependencies — plain node strips the types.
//
// The resolution is deliberately spec-first: a package knows its own directory,
// and exactly one spec declares `project-path` pointing at it. The reverse map
// (project dir -> spec dir) is irregular and cannot be derived by name —
// `plugins/cyberfleet` is governed by `.agents/specs/cyberfleet-plugin`.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectSpecs, discoverSpecFiles, type SpecRecord } from '../../discover-specs/scripts/discover-specs.mts'

const SKILLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ─── the engine set ───────────────────────────────────────────────────────────

// Each engine is handed the resolved spec dir. The two `--root` engines are
// corpus-shaped (they treat the first path segment under root as a project
// slug) but accept a single project-spec dir as root — the slug is only a
// message tag, so a one-project root reports paths relative to that project.
interface Engine {
	name: string
	script: string
	args: (specDir: string) => string[]
}

export const ENGINES: Engine[] = [
	{ name: 'check-spec-state', script: 'spec-gate/scripts/check-spec-state.mts', args: (d) => ['--root', d] },
	{ name: 'check-suite', script: 'spec-gate/scripts/check-suite.mts', args: (d) => ['--root', d] },
	{
		name: 'concept-index',
		script: 'concept-index/scripts/concept-index.mts',
		args: (d) => ['--spec-dir', d, '--check'],
	},
	{
		name: 'check-spec-structure',
		script: 'check-spec-structure/scripts/check-spec-structure.mts',
		args: (d) => ['--spec-dir', d, '--check'],
	},
	{ name: 'align-spec', script: 'align-spec/scripts/align-spec.mts', args: (d) => ['--spec-dir', d, '--check'] },
	{
		name: 'check-scenario-overlap',
		script: 'check-scenario-overlap/scripts/check-scenario-overlap.mts',
		args: (d) => ['--spec-dir', d, '--check'],
	},
]

// ─── repo root ────────────────────────────────────────────────────────────────

/** Walk up from `start` for the workspace marker. Returns '' when not found. */
export function findRepoRoot(start: string): string {
	let dir = resolve(start)
	for (;;) {
		if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
		const up = dirname(dir)
		if (up === dir) return ''
		dir = up
	}
}

// ─── resolution ───────────────────────────────────────────────────────────────

export type Resolution =
	| { kind: 'resolved'; spec: SpecRecord }
	| { kind: 'none' }
	| { kind: 'ambiguous'; specs: SpecRecord[] }

/**
 * Find the spec whose `project-path` names `projectRel` (a repo-relative dir).
 * A project with no spec is `none` — not an error: the script is uniform across
 * every workspace member, and some members are governed by no spec.
 */
export function resolveSpecFor(specs: SpecRecord[], projectRel: string): Resolution {
	const hits = specs.filter((s) => s.projectPath !== '' && s.projectPath === projectRel)
	if (hits.length === 0) return { kind: 'none' }
	if (hits.length > 1) return { kind: 'ambiguous', specs: hits }
	return { kind: 'resolved', spec: hits[0] as SpecRecord }
}

// ─── coverage ─────────────────────────────────────────────────────────────────

export interface CoverageGap {
	spec: string
	projectPath: string
	reason: 'unrecognized' | 'no-project-path' | 'no-manifest' | 'no-check-script'
}

/**
 * Every spec must be reachable from a project that actually checks it. Without
 * this, a spec silently goes unchecked the moment its project drops the script —
 * which is exactly how the corpus ended up with one audited project out of ten.
 *
 * `specFiles` are the spec.md paths found at the recognized locations *before*
 * the lifecycle-status filter; `specs` are the ones that survived it. A file in
 * the first set and not the second is a spec whose status is not in the enum:
 * discovery drops it, so every engine silently skips it and it is checked by
 * nothing. That is a gap to escalate, not to exempt.
 */
export function findCoverageGaps(
	root: string,
	specFiles: string[],
	specs: SpecRecord[],
	readPkg: (p: string) => unknown,
): CoverageGap[] {
	const gaps: CoverageGap[] = []
	const recognized = new Set(specs.map((s) => (s.path === '' ? 'spec.md' : `${s.path}/spec.md`)))
	for (const f of specFiles) {
		if (!recognized.has(f)) gaps.push({ spec: f, projectPath: '', reason: 'unrecognized' })
	}
	for (const s of specs) {
		if (s.projectPath === '') {
			gaps.push({ spec: s.path, projectPath: '', reason: 'no-project-path' })
			continue
		}
		const pkg = readPkg(join(root, s.projectPath, 'package.json')) as { scripts?: Record<string, string> } | null
		if (!pkg) {
			gaps.push({ spec: s.path, projectPath: s.projectPath, reason: 'no-manifest' })
			continue
		}
		if (!pkg.scripts?.['check:spec']) {
			gaps.push({ spec: s.path, projectPath: s.projectPath, reason: 'no-check-script' })
		}
	}
	return gaps
}

const REASON_TEXT: Record<CoverageGap['reason'], string> = {
	unrecognized:
		'sits at a spec location but its status is not in the lifecycle enum, so discovery drops it and nothing checks it',
	'no-project-path': 'declares no project-path, so no project can be resolved to check it',
	'no-manifest': 'names a project with no package.json, so it is not a workspace member',
	'no-check-script': 'names a project that defines no `check:spec` script',
}

function checkCoverage(root: string): number {
	const gaps = findCoverageGaps(root, discoverSpecFiles(root), collectSpecs(root), (p) => {
		try {
			return JSON.parse(readFileSync(p, 'utf8'))
		} catch {
			return null
		}
	})
	if (gaps.length === 0) {
		process.stdout.write('check-project-specs: every spec is checked by its project\n')
		return 0
	}
	for (const g of gaps) process.stderr.write(`  ${g.spec} — ${REASON_TEXT[g.reason]}\n`)
	process.stderr.write(`check-project-specs: ${gaps.length} spec(s) no project checks\n`)
	return 1
}

// ─── run ──────────────────────────────────────────────────────────────────────

export function main(argv: string[]): number {
	if (argv.includes('--check-coverage')) {
		const root = findRepoRoot(process.cwd())
		if (!root) {
			process.stderr.write('check-project-specs: no pnpm-workspace.yaml found above the cwd\n')
			return 1
		}
		return checkCoverage(root)
	}
	return checkProject(argv)
}

function checkProject(argv: string[]): number {
	const projectArg = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : undefined
	const projectDir = resolve(projectArg ?? process.cwd())

	const repoRoot = findRepoRoot(projectDir)
	if (!repoRoot) {
		process.stderr.write(`check-project-specs: no pnpm-workspace.yaml found above ${projectDir}\n`)
		return 1
	}

	const projectRel = relative(repoRoot, projectDir) || '.'
	const res = resolveSpecFor(collectSpecs(repoRoot), projectRel)

	if (res.kind === 'none') {
		process.stdout.write(`check-project-specs: no spec governs \`${projectRel}\` — skipped\n`)
		return 0
	}
	if (res.kind === 'ambiguous') {
		process.stderr.write(
			`check-project-specs: \`${projectRel}\` is claimed by ${res.specs.length} specs ` +
				`(${res.specs.map((s) => s.path).join(', ')}) — a project has exactly one spec\n`,
		)
		return 1
	}

	const specDir = join(repoRoot, res.spec.path)
	process.stdout.write(`check-project-specs: ${projectRel} -> ${res.spec.path}\n`)

	let failed = 0
	for (const e of ENGINES) {
		// cwd is the repo root, not the project dir: the engines resolve
		// repo-root-relative references against process.cwd().
		try {
			execFileSync('node', [join(SKILLS_DIR, e.script), ...e.args(specDir)], {
				cwd: repoRoot,
				stdio: 'inherit',
			})
			process.stdout.write(`  ok   ${e.name}\n`)
		} catch {
			process.stderr.write(`  FAIL ${e.name}\n`)
			failed++
		}
	}
	return failed === 0 ? 0 : 1
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
