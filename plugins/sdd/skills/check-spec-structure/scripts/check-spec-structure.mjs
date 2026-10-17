#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-spec-structure/check-spec-structure.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/check-spec-structure/scripts/check-spec-structure.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-spec-structure/check-spec-structure.mts
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
const DEFAULT_MAX_SCENARIOS = 40;
const REQUIRED_BEHAVIORAL_SECTIONS = [
	"What",
	"Use Cases",
	"Control Flow",
	"Scenario map"
];
function parseNodeFrontmatter(text) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return { concepts: [] };
	const fm = { concepts: [] };
	const lines = m[1].split("\n").map((l) => l.replace(/\r$/, ""));
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		if (line.length - line.trimStart().length !== 0) continue;
		const [key, ...rest] = line.trim().split(":");
		const value = rest.join(":").trim();
		if (key === "spec-type") fm.specType = unquote(value);
		else if (key === "concept") {
			if (value === "" || value === "|" || value === ">") for (let j = i + 1; j < lines.length; j++) {
				const item = lines[j];
				if (item.trim() === "") continue;
				if (item.length - item.trimStart().length === 0) break;
				const dash = /^\s*-\s+(.*)$/.exec(item);
				if (dash) fm.concepts.push(unquote(dash[1].trim()));
			}
			else fm.concepts.push(...parseScalarOrFlow(value));
		}
	}
	return fm;
}
function parseScalarOrFlow(value) {
	const v = value.trim();
	if (v.startsWith("[") && v.endsWith("]")) return v.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter((s) => s.length > 0);
	const single = unquote(v);
	return single.length > 0 ? [single] : [];
}
function unquote(v) {
	return v.replace(/^["']|["']$/g, "");
}
function parseSectionHeadings(text) {
	const headings = [];
	let inFence = false;
	for (const raw of text.split("\n")) {
		const line = raw.replace(/\r$/, "");
		if (/^\s*(```|~~~)/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const m = /^##\s+(.+?)\s*$/.exec(line);
		if (m) headings.push(m[1].replace(/`/g, "").trim());
	}
	return headings;
}
function countScenarios(featureText) {
	let n = 0;
	for (const line of featureText.split("\n")) if (/^\s*Scenario:/.test(line)) n++;
	return n;
}
const SECTION_HEADER = /^\s*#\s*(?:──|-{3,})/;
function profileFeature(featureText) {
	const lines = featureText.split("\n");
	let scenarioCount = 0;
	let taggedCount = 0;
	let clusterCount = 0;
	let pendingRubric = false;
	for (const line of lines) {
		if (/^\s*Scenario:/.test(line)) {
			scenarioCount++;
			if (pendingRubric) taggedCount++;
			pendingRubric = false;
			continue;
		}
		const trimmed = line.trim();
		if (trimmed === "") continue;
		if (trimmed.startsWith("@")) {
			if (/(^|\s)@rubric(\s|$)/.test(trimmed)) pendingRubric = true;
			continue;
		}
		if (SECTION_HEADER.test(line)) {
			clusterCount++;
			pendingRubric = false;
			continue;
		}
		pendingRubric = false;
	}
	return {
		scenarioCount,
		plainCount: scenarioCount - taggedCount,
		taggedCount,
		clusterCount
	};
}
function displayPath(relPath) {
	const p = relPath.replace(/\\/g, "/");
	return p.endsWith("/README.md") ? p.slice(0, -9) : p;
}
function scanProjectSpec(specDir) {
	const records = [];
	walk(specDir, specDir, records);
	return records.sort((a, b) => a.display.localeCompare(b.display));
}
function walk(dir, specDir, out) {
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walk(full, specDir, out);
		else if (entry.name === "README.md") {
			const readmeText = readFileSync(full, "utf8");
			const fm = parseNodeFrontmatter(readmeText);
			if (fm.specType === void 0 && fm.concepts.length === 0) continue;
			const sectionHeadings = parseSectionHeadings(readmeText);
			const features = entries.filter((e) => e.isFile() && e.name.endsWith(".feature"));
			const hasFeature = features.length > 0;
			const profile = hasFeature ? profileFeature(readFileSync(join(dir, features[0].name), "utf8")) : {
				scenarioCount: 0,
				plainCount: 0,
				taggedCount: 0,
				clusterCount: 0
			};
			const relPath = full.slice(specDir.length + 1).replace(/\\/g, "/");
			out.push({
				relPath,
				capability: relPath.split("/")[0],
				display: displayPath(relPath),
				concepts: fm.concepts,
				specType: fm.specType,
				sectionHeadings,
				hasFeature,
				scenarioCount: profile.scenarioCount,
				plainCount: profile.plainCount,
				taggedCount: profile.taggedCount,
				clusterCount: profile.clusterCount
			});
		}
	}
}
function checkUntagged(records) {
	return records.filter((r) => r.specType !== void 0 && r.concepts.length === 0).map((r) => ({
		kind: "untagged-node",
		severity: "blocking",
		node: r.display,
		detail: `spec-type: ${r.specType} but no concept tag — orphaned from the by-concept index`
	}));
}
function checkOversized(records, maxScenarios) {
	return records.filter((r) => r.scenarioCount > maxScenarios).map((r) => ({
		kind: "oversized-node",
		severity: "advisory",
		node: r.display,
		detail: `${r.scenarioCount} scenarios > ${maxScenarios} — shape profile: plain ${r.plainCount}, tagged ${r.taggedCount}, clusters ${r.clusterCount} (soft breadth hint); the Warden routes breadth-vs-depth`
	}));
}
function checkGlossary(specDir) {
	if (existsSync(join(specDir, "glossary.md"))) return [];
	return [{
		kind: "missing-glossary",
		severity: "advisory",
		node: "glossary.md",
		detail: "no root glossary.md — the project has no home for its ubiquitous language, so a term can be used without ever being defined; a root file, never a folder"
	}];
}
function checkIncomplete(records) {
	return records.filter((r) => r.specType === "behavioral" && r.hasFeature).map((r) => {
		return {
			record: r,
			missing: REQUIRED_BEHAVIORAL_SECTIONS.filter((s) => !r.sectionHeadings.includes(s))
		};
	}).filter(({ missing }) => missing.length > 0).map(({ record, missing }) => ({
		kind: "incomplete-node",
		severity: "advisory",
		node: record.display,
		detail: `behavioral leaf spec missing required section(s): ${missing.map((s) => `## ${s}`).join(", ")} — a spec that stops at ## Use Cases never draws its CFG or scenario map (sdd:spec-format-governance)`
	}));
}
function audit(records, maxScenarios, specDir) {
	return [
		...checkUntagged(records),
		...checkOversized(records, maxScenarios),
		...checkIncomplete(records),
		...specDir === void 0 ? [] : checkGlossary(specDir)
	];
}
function hasBlocking(findings) {
	return findings.some((f) => f.severity === "blocking");
}
function renderFindings(findings, specDir) {
	const blocking = findings.filter((f) => f.severity === "blocking");
	const advisory = findings.filter((f) => f.severity === "advisory");
	const lines = [`check-spec-structure: spec-dir=${specDir}`];
	lines.push(`blocking[${blocking.length}]:`);
	for (const f of blocking) lines.push(`  ${f.node} — ${f.kind}: ${f.detail}`);
	lines.push(`advisory[${advisory.length}]:`);
	for (const f of advisory) lines.push(`  ${f.node} — ${f.kind}: ${f.detail}`);
	lines.push("note: advisory — findings feed the Warden formation pass; the engine writes nothing");
	return lines.join("\n");
}
function main(argv) {
	let specDir = ".";
	let mode = "audit";
	let format = "toon";
	let maxScenarios = 40;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--spec-dir") specDir = argv[++i] ?? ".";
		else if (a === "--check") mode = "check";
		else if (a === "--max-scenarios") maxScenarios = Number(argv[++i] ?? 40);
		else if (a === "--format") format = argv[++i] ?? "toon";
	}
	const findings = audit(scanProjectSpec(specDir), maxScenarios, specDir);
	if (mode === "check") {
		if (hasBlocking(findings)) {
			process.stderr.write(`check-spec-structure: ${findings.filter((f) => f.severity === "blocking").length} blocking finding(s)\n`);
			return 1;
		}
		process.stdout.write("check-spec-structure: no blocking findings\n");
		return 0;
	}
	if (format === "json") process.stdout.write(`${JSON.stringify(findings)}\n`);
	else process.stdout.write(`${renderFindings(findings, specDir)}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { DEFAULT_MAX_SCENARIOS, REQUIRED_BEHAVIORAL_SECTIONS, audit, checkGlossary, checkIncomplete, checkOversized, checkUntagged, countScenarios, hasBlocking, main, parseNodeFrontmatter, parseScalarOrFlow, parseSectionHeadings, profileFeature, renderFindings, scanProjectSpec };
