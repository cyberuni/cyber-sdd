#!/usr/bin/env node
// Plan retirement — the Doctrine loop's last retro step (see sdd:combat-log-governance,
// "Plan retirement"). A retired plan leaves the tree by a deliberate, gated TRACKED
// DELETION, never a gitignore side effect: for each cleared <cr-ref>, the sweep deletes
// <cr-ref>.plan.md AND <cr-ref>.log.jsonl from `.agents/plans`.
//
// The two gating signals — source = done/merged AND the plan was distilled — are the
// CALLER's judgment, not the script's: the source-status query (github-NN -> GH issue,
// asana-<gid> -> Asana, local-<slug> -> the local store) needs network/gh, and "distilled"
// means the Scanner wrote strategy/recurrence to the ledger for that <cr-ref>. The Scanner
// (doctrine-loop delegate) determines both and passes the CLEARED set via --retire; this
// sweep is the mechanical, fail-closed gate + filesystem act:
//   - it deletes the two files only for a cr-ref that is BOTH cleared AND present on disk;
//   - anything not cleared, missing, or already gone is a no-op (idempotent, safe to re-run);
//   - it never touches a plan it was not explicitly cleared to retire (fail-closed).
//
// Pure functions are exported for node:test; running the file directly drives the CLI.
// No dependencies. Use --dry-run to print the planned deletions without touching the tree.

import { existsSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const PLAN_SUFFIX = '.plan.md'
const LOG_SUFFIX = '.log.jsonl'

// The two files a retired plan owns, in deletion order (the brief, then the combat log).
export function planFiles(crRef: string): string[] {
	return [`${crRef}${PLAN_SUFFIX}`, `${crRef}${LOG_SUFFIX}`]
}

// Parse a --retire value (comma-separated cr-refs) into a clean, de-duplicated list.
export function parseCleared(value: string | undefined): string[] {
	if (!value) return []
	const seen = new Set<string>()
	for (const raw of value.split(',')) {
		const ref = raw.trim()
		if (ref) seen.add(ref)
	}
	return [...seen]
}

// The cr-refs that have a <cr-ref>.plan.md on disk under `root`.
export function discoverPlans(root: string): string[] {
	let entries: string[]
	try {
		entries = readdirSync(root)
	} catch {
		return []
	}
	return entries.filter((f) => f.endsWith(PLAN_SUFFIX)).map((f) => f.slice(0, -PLAN_SUFFIX.length))
}

// Fail-closed, idempotent decision: retire exactly the cr-refs that are BOTH cleared by the
// caller AND present on disk. An uncleared plan is never retired; a cleared cr-ref with no
// plan on disk is a no-op. Order follows the cleared list for stable reporting.
export function decideRetirements(cleared: string[], existing: string[]): string[] {
	const present = new Set(existing)
	const seen = new Set<string>()
	const out: string[] = []
	for (const ref of cleared) {
		if (present.has(ref) && !seen.has(ref)) {
			seen.add(ref)
			out.push(ref)
		}
	}
	return out
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.agents/plans'
	const cleared = parseCleared(argv.includes('--retire') ? argv[argv.indexOf('--retire') + 1] : undefined)
	const dryRun = argv.includes('--dry-run')

	const retiring = decideRetirements(cleared, discoverPlans(root))
	const deleted: string[] = []

	for (const ref of retiring) {
		for (const file of planFiles(ref)) {
			const path = join(root, file)
			if (!existsSync(path)) continue // the log may be absent; delete what is there
			if (!dryRun) unlinkSync(path)
			deleted.push(path)
		}
	}

	const verb = dryRun ? 'would delete' : 'deleted'
	for (const path of deleted) process.stdout.write(`${verb} ${path}\n`)
	process.stdout.write(`${dryRun ? 'dry-run: ' : ''}retired ${retiring.length} plan(s), ${deleted.length} file(s)\n`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
