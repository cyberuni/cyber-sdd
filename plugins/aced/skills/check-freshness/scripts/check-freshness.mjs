#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-freshness/check-freshness.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.3","entry":"skills/check-freshness/scripts/check-freshness.mjs","commands":{}};
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-freshness/check-freshness.mts
/** A file entry hashes the bytes read. */
function hashFile(abs) {
	return createHash("sha256").update(readFileSync(abs)).digest("hex");
}
/**
* A directory entry hashes the NAMES the listing returned, never their contents — that is what
* makes a file later ADDED to the directory detectable without re-resolving the subject.
*
* The canonical form is load-bearing: entry names (not paths), sorted, joined by \n, no trailing
* newline. `readdirSync` order is filesystem-dependent, so an unsorted join would hash differently
* on two machines holding identical trees and report `stale` for nothing.
*/
function hashDirListing(abs) {
	return createHash("sha256").update(canonicalListing(readdirSync(abs))).digest("hex");
}
/**
* The canonical form of a listing: sorted, `\n`-joined, no trailing newline.
*
* Split out as a pure function so the ordering guarantee is testable WITHOUT a filesystem. It is not
* otherwise falsifiable here: ext4 returns `readdirSync` already sorted, so deleting the sort keeps
* the whole suite green on Linux while handing every APFS and NTFS user a permanent spurious `stale`
* — the divergence would surface as a wrong verdict, never as an error.
*/
function canonicalListing(names) {
	return [...names].sort().join("\n");
}
/**
* Pulls `subject:` out of an eval.md's frontmatter. Deliberately not a YAML parser: the one key
* that matters is a scalar path, and a dependency-free engine that reads one key cannot be broken
* by an unrelated key's syntax.
*/
function readSubject(evalText) {
	const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(evalText);
	const body = fm ? fm[1] : evalText;
	for (const line of body.split(/\r?\n/)) {
		const m = /^subject:\s*(.+?)\s*$/.exec(line);
		if (!m) continue;
		const raw = m[1].replace(/^["']|["']$/g, "").trim();
		return raw === "" ? null : raw;
	}
	return null;
}
/** The node's own frozen suite — one member of the evaluated set, handled apart from the rest. */
function findFrozenFeature(nodeDir) {
	const hit = readdirSync(nodeDir).find((n) => n.endsWith(".feature"));
	return hit ? join(nodeDir, hit) : null;
}
/** Every `*.json` under the results tree, at any depth. */
function collectResultFiles(resultsDir) {
	const out = [];
	const walk = (dir) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith(".json")) out.push(p);
		}
	};
	walk(resultsDir);
	return out.sort();
}
/**
* Partitions results by the target each one RECORDS — never by the directory it sits in. A result
* filed under a mis-slugged directory still belongs to the target its own `target` field names, and
* an implementation matching on directory name would silently miss it.
*
* An unparseable file is collected rather than thrown on: one corrupt record must not blind the
* check to the readable ones beside it.
*/
function scanResults(files, target, read) {
	const forTarget = [];
	const unreadable = [];
	for (const file of files) {
		let record;
		try {
			record = JSON.parse(read(file));
		} catch {
			unreadable.push(file);
			continue;
		}
		if (record && record.target === target) forTarget.push({
			file,
			record
		});
	}
	return {
		forTarget,
		unreadable
	};
}
/**
* Newest by RECORDED timestamp, not by filename. Filenames sort lexicographically and a timestamp
* is the fact that matters; where the two disagree, trusting the name picks the wrong record.
*/
function selectNewest(results) {
	let best = null;
	for (const r of results) {
		const t = r.record.timestamp ?? "";
		if (!best || t > (best.record.timestamp ?? "")) best = r;
	}
	return best;
}
/**
* Taking the record's OWN `scenarios` and `target` as given, does its evaluated set cover the
* inputs they imply were read? Scores cannot come from a `.feature` never read, and a configuration
* cannot be judged unopened.
*
* This is a CONDITIONAL relation, never a proof: `scenarios` and `target` are written by the same
* agent and self-reported exactly as `evaluated` is, so a fabricated-but-self-consistent record
* passes. It catches the inconsistent under-reporter only.
*/
function incoherence(record, featureRel, targetRel) {
	const paths = new Set((record.evaluated ?? []).map((e) => e.path));
	if ((record.scenarios?.length ?? 0) > 0 && !paths.has(featureRel)) return `the recorded provenance contradicts the result it accompanies: it scores ${record.scenarios?.length} scenarios but carries no entry for ${featureRel}`;
	if (record.target && !paths.has(targetRel)) return `the recorded provenance omits the configuration the result names: no entry for ${targetRel}`;
	return null;
}
/**
* Split the evaluated set into the frozen suite and the subject inputs, then compare.
*
* The ORDER of the two questions is the whole `incomplete` / `stale` distinction. A moved subject
* input means no individual score survives, so it wins outright. Only when every subject input is
* unmoved does a changed suite mean something narrower: the scores stand, the suite grew past them.
* Collapsing the two would throw away that surviving fact.
*/
function decideVerdict(record, repoRoot, featureRel, skipped = []) {
	const entries = record.evaluated ?? [];
	const subject = entries.filter((e) => e.path !== featureRel);
	const suite = entries.filter((e) => e.path === featureRel);
	const moved = (e) => {
		const abs = join(repoRoot, e.path);
		if (!existsSync(abs)) return `${e.path} (missing from the tree)`;
		try {
			return (e.kind === "directory" ? hashDirListing(abs) : hashFile(abs)) === e.sha256 ? null : `${e.path} (content changed)`;
		} catch {
			return `${e.path} (unreadable)`;
		}
	};
	const subjectMoved = subject.map(moved).filter((m) => m !== null);
	if (subjectMoved.length > 0) return {
		verdict: "stale",
		reason: "an input the scores rest on has moved; no individual score can be relied on without re-running",
		mismatched: subjectMoved,
		skipped
	};
	const suiteMoved = suite.map(moved).filter((m) => m !== null);
	if (suiteMoved.length > 0) return {
		verdict: "incomplete",
		reason: "every input the scores rest on is unmoved, but the suite changed past them, so the result no longer covers the whole suite",
		mismatched: suiteMoved,
		skipped
	};
	return {
		verdict: "current",
		reason: "every input the run recorded still hashes as recorded — the run's account still holds",
		mismatched: [],
		skipped
	};
}
function findRepoRoot(from) {
	let dir = resolve(from);
	for (;;) {
		if (existsSync(join(dir, "pnpm-workspace.yaml")) || existsSync(join(dir, ".git"))) return dir;
		const up = resolve(dir, "..");
		if (up === dir) return null;
		dir = up;
	}
}
const RESULTS_DIR = join(".agents", "aced", "results");
const MEASURED_RESULTS_DIR = join(RESULTS_DIR, "bench");
const MEASURED_BENCH_DIR = join(".agents", "aced", "bench");
/**
* Keeps the measured records whose OWN `suite` and `arm` fields match. A file that parses but is
* not a measured record — a compare record sitting beside them — is simply not a candidate.
*/
function scanMeasured(files, suite, arm, read) {
	const forArm = [];
	const unreadable = [];
	for (const file of files) {
		let record;
		try {
			record = JSON.parse(read(file));
		} catch {
			unreadable.push(file);
			continue;
		}
		if (record && record.layer === "measured" && record.suite === suite && record.arm === arm) forArm.push({
			file,
			record
		});
	}
	return {
		forArm,
		unreadable
	};
}
/** Newest by RECORDED `createdAt`, for the same reason `selectNewest` ignores file names. */
function selectNewestMeasured(records) {
	let best = null;
	for (const r of records) {
		const t = r.record.createdAt ?? "";
		if (!best || t > (best.record.createdAt ?? "")) best = r;
	}
	return best;
}
/**
* The bench engine always records the suite's `tasks.json`, and records a `file` arm's source
* whenever the arm reads it from a path. A set omitting either contradicts the record carrying it.
*/
function measuredIncoherence(record, suite) {
	const paths = new Set((record.evaluated ?? []).map((e) => e.path));
	const tasks = join(MEASURED_BENCH_DIR, suite, "tasks.json");
	if (!paths.has(tasks)) return `the recorded provenance contradicts the record it accompanies: it carries no entry for ${tasks}`;
	const from = record.subject?.kind === "file" ? record.subject.from : void 0;
	if (from?.startsWith("path:")) {
		const source = from.slice(5);
		if (!paths.has(source)) return `the recorded provenance omits the file arm's source: no entry for ${source}`;
	}
	return null;
}
function measuredMain(repoRoot, suite, arm) {
	process.stdout.write(`suite: ${suite}\narm: ${arm}\n`);
	const dir = join(repoRoot, MEASURED_RESULTS_DIR, suite);
	if (!existsSync(dir)) {
		report({
			verdict: "absent",
			reason: "nothing is measured for this suite",
			mismatched: [],
			skipped: []
		});
		return 1;
	}
	const scan = scanMeasured(collectResultFiles(dir), suite, arm, (f) => readFileSync(f, "utf8"));
	const skipped = scan.unreadable.map((f) => relative(repoRoot, f));
	const newest = selectNewestMeasured(scan.forArm);
	if (!newest) {
		report({
			verdict: "absent",
			reason: "no measured record is recorded for this arm",
			mismatched: [],
			skipped
		});
		return 1;
	}
	if (!newest.record.evaluated) {
		report({
			verdict: "absent",
			reason: "the record carries no recorded provenance",
			mismatched: [],
			skipped
		});
		return 1;
	}
	const bad = measuredIncoherence(newest.record, suite);
	if (bad) {
		report({
			verdict: "absent",
			reason: bad,
			mismatched: [],
			skipped
		});
		return 1;
	}
	const decision = decideVerdict(newest.record, repoRoot, "", skipped);
	report(decision);
	return decision.verdict === "current" ? 0 : 1;
}
function report(d) {
	process.stdout.write(`verdict: ${d.verdict}\n`);
	process.stdout.write(`${d.reason}\n`);
	for (const s of d.skipped) process.stdout.write(`skipped (unreadable): ${s}\n`);
	for (const m of d.mismatched) process.stdout.write(`no longer matching: ${m}\n`);
}
function main(argv) {
	const hashFileIdx = argv.indexOf("--hash-file");
	if (hashFileIdx !== -1) {
		const p = argv[hashFileIdx + 1];
		if (!p) {
			console.error("✗ --hash-file needs a path");
			return 1;
		}
		process.stdout.write(hashFile(resolve(p)) + "\n");
		return 0;
	}
	const hashDirIdx = argv.indexOf("--hash-dir");
	if (hashDirIdx !== -1) {
		const p = argv[hashDirIdx + 1];
		if (!p) {
			console.error("✗ --hash-dir needs a path");
			return 1;
		}
		process.stdout.write(hashDirListing(resolve(p)) + "\n");
		return 0;
	}
	const suiteIdx = argv.indexOf("--suite");
	const armIdx = argv.indexOf("--arm");
	if (suiteIdx !== -1 || armIdx !== -1) {
		const suite = suiteIdx === -1 ? void 0 : argv[suiteIdx + 1];
		const arm = armIdx === -1 ? void 0 : argv[armIdx + 1];
		if (!suite || !arm) {
			console.error(`✗ a measured check needs both --suite <suite> and --arm <label>; missing ${suite ? "--arm" : "--suite"}; no verdict`);
			return 1;
		}
		const repoRoot = findRepoRoot(process.cwd());
		if (!repoRoot) {
			console.error("✗ no repository root above the working directory; no verdict");
			return 1;
		}
		return measuredMain(repoRoot, suite, arm);
	}
	const nodeIdx = argv.indexOf("--node");
	const nodeArg = nodeIdx === -1 ? void 0 : argv[nodeIdx + 1];
	if (!nodeArg) {
		console.error("✗ usage: check-freshness --node <node-dir> | --suite <suite> --arm <label>");
		return 1;
	}
	const nodeDir = resolve(nodeArg);
	const evalPath = join(nodeDir, "eval.md");
	if (!existsSync(evalPath)) {
		console.error(`✗ ${relative(process.cwd(), evalPath)}: no eval.md in the node directory; no verdict`);
		return 1;
	}
	const subject = readSubject(readFileSync(evalPath, "utf8"));
	if (!subject) {
		console.error(`✗ ${relative(process.cwd(), evalPath)}: eval.md carries no subject key; no verdict`);
		return 1;
	}
	const repoRoot = findRepoRoot(nodeDir);
	if (!repoRoot) {
		console.error("✗ no repository root above the node directory; no verdict");
		return 1;
	}
	process.stdout.write(`target: ${subject}\n`);
	const featureAbs = findFrozenFeature(nodeDir);
	const featureRel = featureAbs ? relative(repoRoot, featureAbs) : "";
	const resultsDir = join(repoRoot, RESULTS_DIR);
	if (!existsSync(resultsDir)) {
		report({
			verdict: "absent",
			reason: "no result is recorded anywhere",
			mismatched: [],
			skipped: []
		});
		return 1;
	}
	const scan = scanResults(collectResultFiles(resultsDir), subject, (f) => readFileSync(f, "utf8"));
	const skipped = scan.unreadable.map((f) => relative(repoRoot, f));
	if (scan.forTarget.length === 0) {
		report({
			verdict: "absent",
			reason: skipped.length > 0 ? "every result recorded for this target is unreadable" : "no result is recorded for this target",
			mismatched: [],
			skipped
		});
		return 1;
	}
	const newest = selectNewest(scan.forTarget);
	if (!newest.record.evaluated) {
		report({
			verdict: "absent",
			reason: "the result carries no recorded provenance",
			mismatched: [],
			skipped
		});
		return 1;
	}
	const bad = incoherence(newest.record, featureRel, subject);
	if (bad) {
		report({
			verdict: "absent",
			reason: bad,
			mismatched: [],
			skipped
		});
		return 1;
	}
	const decision = decideVerdict(newest.record, repoRoot, featureRel, skipped);
	report(decision);
	return decision.verdict === "current" ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { MEASURED_RESULTS_DIR, RESULTS_DIR, canonicalListing, collectResultFiles, decideVerdict, findFrozenFeature, findRepoRoot, hashDirListing, hashFile, incoherence, main, measuredIncoherence, readSubject, scanMeasured, scanResults, selectNewest, selectNewestMeasured };
