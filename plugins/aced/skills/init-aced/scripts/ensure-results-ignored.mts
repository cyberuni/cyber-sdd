#!/usr/bin/env node
// ensure-results-ignored — setup/ignore-run-output's deterministic engine. Ensures the ACED
// run-output directory (.agents/aced/results/) is git-ignored at the repo root, so `run` never
// commits timestamped, non-deterministic judge output into the tracked tree.
//
// Behavior (frozen — see .agents/specs/aced/setup/ignore-run-output/):
//   1. Resolve the git repo root from the start directory. Not inside a repo -> fail closed, write
//      nothing.
//   2. If the results directory is already effectively ignored (git check-ignore on a probe path
//      succeeds) -> no-op, exit 0, write nothing.
//   3. Else, if .gitignore is not writable/creatable -> fail closed, before any write.
//   4. Else append the rule as the LAST line of .gitignore (creating it if absent, preserving every
//      existing line). Appending last is load-bearing: gitignore's last-match-wins guarantees the
//      path ends ignored even if an earlier `!`-negation re-included it. There is no post-write
//      verification branch — the guarantee holds by construction.
//
// Idempotent: a second run finds the path already ignored and writes nothing, so exactly one
// matching rule ever exists. Pure functions are exported for node:test; running the file directly
// drives the CLI. No deps beyond node:fs, node:path, node:child_process.

import { execFileSync } from 'node:child_process'
import { accessSync, constants, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// The rule ensured in .gitignore — the ACED run-output directory.
export const RESULTS_DIR_RULE = '.agents/aced/results/'
// A path under the results directory used to probe `git check-ignore` — never created on disk.
const PROBE_PATH = '.agents/aced/results/.ensure-ignored-probe'

// Resolve the git repo root from `startDir`, or null when it is not inside a git repository.
export function resolveRepoRoot(startDir: string): string | null {
	try {
		const out = execFileSync('git', ['-C', startDir, 'rev-parse', '--show-toplevel'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})
		return out.trim()
	} catch {
		return null
	}
}

// True when `relPath` (repo-relative) is reported ignored by git under `repoRoot`.
export function isIgnored(repoRoot: string, relPath: string): boolean {
	try {
		execFileSync('git', ['-C', repoRoot, 'check-ignore', '-q', relPath], { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

// True when .gitignore at `repoRoot` can be written — writable if it exists, else the repo root
// must be writable so the file can be created.
export function canWriteGitignore(repoRoot: string): boolean {
	const file = join(repoRoot, '.gitignore')
	try {
		if (existsSync(file)) accessSync(file, constants.W_OK)
		else accessSync(repoRoot, constants.W_OK)
		return true
	} catch {
		return false
	}
}

// Append `rule` as the LAST line of .gitignore at `repoRoot`, creating the file (whose content is
// then just the rule) if absent, and preserving every pre-existing line untouched.
function appendRuleLast(repoRoot: string, rule: string): void {
	const file = join(repoRoot, '.gitignore')
	let content = ''
	if (existsSync(file)) {
		content = readFileSync(file, 'utf8')
		if (content.length > 0 && !content.endsWith('\n')) content += '\n'
	}
	content += `${rule}\n`
	writeFileSync(file, content)
}

export type EnsureResult = { ok: true; changed: boolean; repoRoot: string } | { ok: false; reason: string }

// The engine's whole behavior, starting from `startDir`. Never throws.
export function ensureResultsIgnored(startDir: string): EnsureResult {
	const repoRoot = resolveRepoRoot(startDir)
	if (!repoRoot) return { ok: false, reason: 'not inside a git repository' }

	if (isIgnored(repoRoot, PROBE_PATH)) return { ok: true, changed: false, repoRoot }

	if (!canWriteGitignore(repoRoot)) return { ok: false, reason: '.gitignore is not writable or creatable' }

	appendRuleLast(repoRoot, RESULTS_DIR_RULE)
	return { ok: true, changed: true, repoRoot }
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const w = (s: string) => process.stdout.write(`${s}\n`)

	const r = ensureResultsIgnored(root)
	if (!r.ok) {
		w(`refused: ${r.reason}`)
		return 1
	}
	w(r.changed ? `${RESULTS_DIR_RULE} appended to .gitignore at ${r.repoRoot}` : `already ignored under ${r.repoRoot}`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
