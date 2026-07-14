#!/usr/bin/env node
// Plan retirement — the Doctrine loop's last retro step (see sdd:combat-log-governance,
// "Plan retirement"). A retired plan leaves the tree by a deliberate, gated TRACKED
// DELETION, never a gitignore side effect: for each cleared <cr-ref>, the sweep deletes that
// CR's whole TRANSIENT ARTIFACT SET — the plan pair (<cr-ref>.plan.md + <cr-ref>.log.jsonl)
// plus its transient CR-level planning briefs (<cr-ref>.design.md, <cr-ref>.operations.md,
// <cr-ref>.evidence.md) — from `.agents/plans`.
//
// The two gating signals split by verifiability. Source = done/merged stays the CALLER's
// judgment: the source-status query (github-NN -> GH issue, asana-<gid> -> Asana,
// local-<slug> -> the local store) needs network/gh, so the Scanner (doctrine-loop delegate)
// determines it and passes the CLEARED set via --retire. Distilled is local and mechanically
// checkable, so the sweep VERIFIES IT ITSELF against the project ledger (--ledger <dir>): a
// `strategy` entry whose `distills` field equals the <cr-ref> must exist. The distilled gate
// only guards a cr-ref whose combat log EXISTS — there is something on disk it could still
// distill from, so retirement without a distilling entry would be data loss. A cr-ref whose
// <cr-ref>.log.jsonl was never written has nothing to distill from in the first place, so it
// retires on clearance + presence alone, no distilling entry required. This is the
// mechanical, fail-closed gate + filesystem act:
//   - it deletes the transient artifact set for a cr-ref that is cleared AND present on disk
//     AND (distilled per the ledger OR has no log.jsonl to distill from);
//   - a missing/unreadable --ledger skips retirement for ALL cr-refs (the no-log branch only
//     applies once a ledger is actually present to consult);
//   - anything not cleared, not present, or already gone is a no-op (idempotent, safe to
//     re-run);
//   - it never touches a plan it was not explicitly cleared to retire (fail-closed).
//
// Two invariants on the transient briefs (design.md / operations.md / evidence.md), both
// deliberate:
//   - THEY DO NOT WIDEN THE DISTILLED GATE. The gate keys on the combat log's presence only
//     (discoverLogs / logPresent) — a cr-ref with briefs but no log.jsonl still retires
//     without a distilling strategy. A brief owes no distillation (its content was consumed
//     by the mission itself, not extracted into the ledger), so gating on one would re-strand
//     the no-log mission class the no-log branch exists to rescue.
//   - THEY DO NOT ANCHOR PRESENCE. discoverPlans (keyed on .plan.md) stays the sole presence
//     signal. A cr-ref with a design.md but no plan.md is a no-op — the idempotency contract
//     (a cleared cr-ref with no plan on disk deletes nothing) is the stronger guarantee.
//
// Pure functions are exported for node:test; running the file directly drives the CLI.
// No dependencies. Use --dry-run to print the planned deletions without touching the tree.

import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const PLAN_SUFFIX = '.plan.md'
const LOG_SUFFIX = '.log.jsonl'
const DESIGN_SUFFIX = '.design.md'
const OPERATIONS_SUFFIX = '.operations.md'
const EVIDENCE_SUFFIX = '.evidence.md'

// The full transient artifact set a retired cr-ref owns, in deletion order: the plan pair
// (plan.md, log.jsonl) then the optional transient CR-level planning briefs (design.md,
// operations.md, evidence.md). The briefs are optional — the per-file existsSync guard in
// main() no-ops any that are absent, which is what lets a cr-ref with only some briefs retire
// cleanly.
export function transientArtifactFiles(crRef: string): string[] {
	return [
		`${crRef}${PLAN_SUFFIX}`,
		`${crRef}${LOG_SUFFIX}`,
		`${crRef}${DESIGN_SUFFIX}`,
		`${crRef}${OPERATIONS_SUFFIX}`,
		`${crRef}${EVIDENCE_SUFFIX}`,
	]
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

// The cr-refs that have a <cr-ref>.log.jsonl on disk under `root`.
export function discoverLogs(root: string): string[] {
	let entries: string[]
	try {
		entries = readdirSync(root)
	} catch {
		return []
	}
	return entries.filter((f) => f.endsWith(LOG_SUFFIX)).map((f) => f.slice(0, -LOG_SUFFIX.length))
}

// The cr-refs the project ledger records as DISTILLED — a `strategy` entry whose `distills`
// field equals the cr-ref exists in some *.jsonl shard under `ledgerDir`. Keys on the
// structured `distills` field only: a cr-ref named merely inside a strategy's `evidence`
// array (a cross-reference) does NOT count, and an unratified entry (`ratified: false`, the
// Scanner's default) still counts — the gate is about what was distilled, not sign-off.
// Malformed lines and a missing/unreadable ledger dir are tolerated: fail-closed means an
// unverifiable ledger yields an EMPTY set, never a thrown error.
export function distilledCrRefs(ledgerDir: string): Set<string> {
	const distilled = new Set<string>()
	let entries: string[]
	try {
		entries = readdirSync(ledgerDir)
	} catch {
		return distilled
	}
	for (const entry of entries) {
		if (!entry.endsWith('.jsonl')) continue
		let text: string
		try {
			text = readFileSync(join(ledgerDir, entry), 'utf8')
		} catch {
			continue
		}
		for (const line of text.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed) continue
			let record: unknown
			try {
				record = JSON.parse(trimmed)
			} catch {
				continue
			}
			if (record === null || typeof record !== 'object') continue
			const { kind, distills } = record as { kind?: unknown; distills?: unknown }
			if (kind === 'strategy' && typeof distills === 'string' && distills.length > 0) distilled.add(distills)
		}
	}
	return distilled
}

// Fail-closed, idempotent decision: retire exactly the cr-refs that are cleared by the caller,
// present on disk, AND either distilled per the ledger OR have no combat log to distill from
// (log.jsonl absent). An uncleared or absent plan is never retired; a present plan whose log
// DOES exist still requires a distilling entry (data-loss guard, unchanged). Order follows the
// cleared list for stable reporting.
export function decideRetirements(
	cleared: string[],
	existing: string[],
	distilled: Set<string>,
	logPresent: Set<string>,
): string[] {
	const present = new Set(existing)
	const seen = new Set<string>()
	const out: string[] = []
	for (const ref of cleared) {
		if (present.has(ref) && (distilled.has(ref) || !logPresent.has(ref)) && !seen.has(ref)) {
			seen.add(ref)
			out.push(ref)
		}
	}
	return out
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.agents/plans'
	const ledgerArg = argv.includes('--ledger') ? argv[argv.indexOf('--ledger') + 1] : undefined
	const cleared = parseCleared(argv.includes('--retire') ? argv[argv.indexOf('--retire') + 1] : undefined)
	const dryRun = argv.includes('--dry-run')

	let retiring: string[]
	if (!ledgerArg || !existsSync(ledgerArg)) {
		process.stdout.write(
			`no verifiable ledger (${ledgerArg ? `--ledger ${ledgerArg} unreadable` : '--ledger not given'}): distillation cannot be checked, so retirement is skipped for all cr-refs\n`,
		)
		retiring = []
	} else {
		const distilled = distilledCrRefs(ledgerArg)
		const logPresent = new Set(discoverLogs(root))
		retiring = decideRetirements(cleared, discoverPlans(root), distilled, logPresent)
	}
	const deleted: string[] = []

	for (const ref of retiring) {
		for (const file of transientArtifactFiles(ref)) {
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
