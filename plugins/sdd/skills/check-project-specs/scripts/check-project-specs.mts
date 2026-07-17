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
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectSpecs, type SpecRecord } from '../../discover-specs/scripts/discover-specs.mts'

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
]

// check-scenario-overlap is deliberately NOT here yet. Run per-project it reports
// 10 pre-existing exact-duplicate scenarios across three projects, every one a
// @trigger sibling-deference row — the subject of the open @trigger-outline issue.
// Resolving one means deleting a frozen scenario from its non-owning node, which
// is a narrowing and Clearance-bound, so it is not this engine's call to force.
// It still runs corpus-wide at the root exactly as before, so no coverage is lost;
// it joins this set in the CR that resolves those duplicates under a granted
// clearance.

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

// ─── run ──────────────────────────────────────────────────────────────────────

export function main(argv: string[]): number {
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
