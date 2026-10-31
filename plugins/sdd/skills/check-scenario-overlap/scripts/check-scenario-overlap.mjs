#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-scenario-overlap/check-scenario-overlap.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/check-scenario-overlap/scripts/check-scenario-overlap.mjs","commands":{}};
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-scenario-overlap/check-scenario-overlap.mts
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
function normalize(s) {
	return s.trim().replace(/\s+/g, " ").toLowerCase();
}
const STEP = /^\s*(Given|When|Then|And|But)\s+(.*\S)\s*$/;
const SCENARIO = /^\s*Scenario(?: Outline)?:\s*(.*\S)\s*$/;
const TABLE_ROW = /^\s*\|(.*)\|\s*$/;
function normalizeRow(line) {
	return (TABLE_ROW.exec(line)?.[1] ?? line).split("|").map((cell) => normalize(cell)).join("|");
}
function parseFeature(featureText) {
	const scenarios = [];
	let title = null;
	let steps = [];
	let exampleRows = [];
	const flush = () => {
		if (title !== null) {
			const fingerprint = exampleRows.length === 0 ? steps.map(normalize).join("\n") : `${steps.map(normalize).join("\n")}\n EXAMPLES \n${exampleRows.join("\n")}`;
			scenarios.push({
				title,
				titleKey: normalize(title),
				fingerprint
			});
		}
		title = null;
		steps = [];
		exampleRows = [];
	};
	for (const line of featureText.split("\n")) {
		const sc = SCENARIO.exec(line);
		if (sc) {
			flush();
			title = sc[1];
			continue;
		}
		if (title === null) continue;
		const st = STEP.exec(line);
		if (st) {
			steps.push(st[2]);
			continue;
		}
		if (TABLE_ROW.test(line)) exampleRows.push(normalizeRow(line));
	}
	flush();
	return scenarios;
}
function displayPath(relPath) {
	const p = relPath.replace(/\\/g, "/");
	return p.endsWith("/README.md") ? p.slice(0, -9) : p;
}
function scanSuites(specDir) {
	const suites = [];
	walk(specDir, specDir, suites);
	return suites.sort((a, b) => a.node.localeCompare(b.node));
}
function walk(dir, specDir, out) {
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, specDir, out);
			continue;
		}
		if (!entry.name.endsWith(".feature")) continue;
		const scenarios = parseFeature(readFileSync(full, "utf8"));
		if (scenarios.length === 0) continue;
		const relDir = dir.slice(specDir.length + 1).replace(/\\/g, "/");
		out.push({
			node: displayPath(`${relDir}/`),
			scenarios
		});
	}
}
function detect(suites) {
	const byFingerprint = /* @__PURE__ */ new Map();
	const byTitle = /* @__PURE__ */ new Map();
	for (const suite of suites) for (const sc of suite.scenarios) {
		if (sc.fingerprint !== "") {
			let m = byFingerprint.get(sc.fingerprint);
			if (!m) byFingerprint.set(sc.fingerprint, m = /* @__PURE__ */ new Map());
			if (!m.has(suite.node)) m.set(suite.node, sc.title);
		}
		let t = byTitle.get(sc.titleKey);
		if (!t) byTitle.set(sc.titleKey, t = /* @__PURE__ */ new Map());
		let e = t.get(suite.node);
		if (!e) t.set(suite.node, e = {
			fps: /* @__PURE__ */ new Set(),
			title: sc.title
		});
		e.fps.add(sc.fingerprint);
	}
	const candidates = [];
	for (const [, nodeMap] of byFingerprint) {
		if (nodeMap.size < 2) continue;
		const nodes = [...nodeMap.keys()].sort();
		for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) candidates.push({
			kind: "exact-duplicate",
			severity: "blocking",
			nodes: [nodes[i], nodes[j]],
			scenario: nodeMap.get(nodes[i]) ?? "",
			detail: "identical step fingerprint — the same behavior is specified in both nodes; one behavior = one owning node"
		});
	}
	for (const [, nodeMap] of byTitle) {
		if (nodeMap.size < 2) continue;
		const nodes = [...nodeMap.keys()].sort();
		for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
			const a = nodeMap.get(nodes[i]);
			const b = nodeMap.get(nodes[j]);
			if (!a || !b) continue;
			if ([...a.fps].some((fp) => b.fps.has(fp))) continue;
			candidates.push({
				kind: "title-overlap",
				severity: "advisory",
				nodes: [nodes[i], nodes[j]],
				scenario: a.title,
				detail: "same scenario title, differing steps — a weaker overlap hint the Warden judges"
			});
		}
	}
	return candidates;
}
function hasBlocking(candidates) {
	return candidates.some((c) => c.severity === "blocking");
}
function renderCandidates(candidates, specDir) {
	const blocking = candidates.filter((c) => c.severity === "blocking");
	const advisory = candidates.filter((c) => c.severity === "advisory");
	const lines = [`check-scenario-overlap: spec-dir=${specDir}`];
	lines.push(`blocking[${blocking.length}]:`);
	for (const c of blocking) lines.push(`  ${c.nodes[0]} <-> ${c.nodes[1]} — ${c.kind}: "${c.scenario}" — ${c.detail}`);
	lines.push(`advisory[${advisory.length}]:`);
	for (const c of advisory) lines.push(`  ${c.nodes[0]} <-> ${c.nodes[1]} — ${c.kind}: "${c.scenario}" — ${c.detail}`);
	lines.push("note: advisory — candidates feed the Warden formation pass; the engine writes nothing");
	return lines.join("\n");
}
function main(argv) {
	let specDir = ".";
	let mode = "audit";
	let format = "toon";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--spec-dir") specDir = argv[++i] ?? ".";
		else if (a === "--check") mode = "check";
		else if (a === "--format") format = argv[++i] ?? "toon";
	}
	const candidates = detect(scanSuites(specDir));
	if (mode === "check") {
		if (hasBlocking(candidates)) {
			process.stderr.write(`check-scenario-overlap: ${candidates.filter((c) => c.severity === "blocking").length} exact-duplicate candidate(s)\n`);
			return 1;
		}
		process.stdout.write("check-scenario-overlap: no exact-duplicate candidates\n");
		return 0;
	}
	if (format === "json") process.stdout.write(`${JSON.stringify(candidates)}\n`);
	else process.stdout.write(`${renderCandidates(candidates, specDir)}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { detect, hasBlocking, main, normalize, parseFeature, renderCandidates, scanSuites };
