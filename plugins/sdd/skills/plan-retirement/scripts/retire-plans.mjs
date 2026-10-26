#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/plan-retirement/retire-plans.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.1","entry":"skills/plan-retirement/scripts/retire-plans.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/plan-retirement/retire-plans.mts
const PLAN_SUFFIX = ".plan.md";
const LOG_SUFFIX = ".log.jsonl";
const DESIGN_SUFFIX = ".design.md";
const OPERATIONS_SUFFIX = ".operations.md";
const EVIDENCE_SUFFIX = ".evidence.md";
function transientArtifactFiles(crRef) {
	return [
		`${crRef}${PLAN_SUFFIX}`,
		`${crRef}${LOG_SUFFIX}`,
		`${crRef}${DESIGN_SUFFIX}`,
		`${crRef}${OPERATIONS_SUFFIX}`,
		`${crRef}${EVIDENCE_SUFFIX}`
	];
}
function parseCleared(value) {
	if (!value) return [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of value.split(",")) {
		const ref = raw.trim();
		if (ref) seen.add(ref);
	}
	return [...seen];
}
function discoverPlans(root) {
	let entries;
	try {
		entries = readdirSync(root);
	} catch {
		return [];
	}
	return entries.filter((f) => f.endsWith(PLAN_SUFFIX)).map((f) => f.slice(0, -8));
}
function discoverLogs(root) {
	let entries;
	try {
		entries = readdirSync(root);
	} catch {
		return [];
	}
	return entries.filter((f) => f.endsWith(LOG_SUFFIX)).map((f) => f.slice(0, -10));
}
function distilledCrRefs(ledgerDir) {
	const distilled = /* @__PURE__ */ new Set();
	let entries;
	try {
		entries = readdirSync(ledgerDir);
	} catch {
		return distilled;
	}
	for (const entry of entries) {
		if (!entry.endsWith(".jsonl")) continue;
		let text;
		try {
			text = readFileSync(join(ledgerDir, entry), "utf8");
		} catch {
			continue;
		}
		for (const line of text.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			let record;
			try {
				record = JSON.parse(trimmed);
			} catch {
				continue;
			}
			if (record === null || typeof record !== "object") continue;
			const { kind, distills } = record;
			if (kind === "strategy" && typeof distills === "string" && distills.length > 0) distilled.add(distills);
		}
	}
	return distilled;
}
function decideRetirements(cleared, existing, distilled, logPresent) {
	const present = new Set(existing);
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const ref of cleared) if (present.has(ref) && (distilled.has(ref) || !logPresent.has(ref)) && !seen.has(ref)) {
		seen.add(ref);
		out.push(ref);
	}
	return out;
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : ".agents/plans";
	const ledgerArg = argv.includes("--ledger") ? argv[argv.indexOf("--ledger") + 1] : void 0;
	const cleared = parseCleared(argv.includes("--retire") ? argv[argv.indexOf("--retire") + 1] : void 0);
	const dryRun = argv.includes("--dry-run");
	if (argv.includes("--distilled")) {
		for (const ref of distilledCrRefs(argv[argv.indexOf("--distilled") + 1] ?? "")) process.stdout.write(`${ref}\n`);
		return 0;
	}
	let retiring;
	if (!ledgerArg || !existsSync(ledgerArg)) {
		process.stdout.write(`no verifiable ledger (${ledgerArg ? `--ledger ${ledgerArg} unreadable` : "--ledger not given"}): distillation cannot be checked, so retirement is skipped for all cr-refs\n`);
		retiring = [];
	} else {
		const distilled = distilledCrRefs(ledgerArg);
		const logPresent = new Set(discoverLogs(root));
		retiring = decideRetirements(cleared, discoverPlans(root), distilled, logPresent);
	}
	const deleted = [];
	for (const ref of retiring) for (const file of transientArtifactFiles(ref)) {
		const path = join(root, file);
		if (!existsSync(path)) continue;
		if (!dryRun) unlinkSync(path);
		deleted.push(path);
	}
	const verb = dryRun ? "would delete" : "deleted";
	for (const path of deleted) process.stdout.write(`${verb} ${path}\n`);
	process.stdout.write(`${dryRun ? "dry-run: " : ""}retired ${retiring.length} plan(s), ${deleted.length} file(s)\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { decideRetirements, discoverLogs, discoverPlans, distilledCrRefs, main, parseCleared, transientArtifactFiles };
