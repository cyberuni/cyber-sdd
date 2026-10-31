#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/concept-index/concept-index.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/concept-index/scripts/concept-index.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/concept-index/concept-index.mts
const BEGIN_MARKER = "<!-- BEGIN generated: by-concept (project-spec/concept-index) -->";
const END_MARKER = "<!-- END generated: by-concept -->";
const ANCHOR_HEADING = "## Invariants";
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
function parseFrontmatter(text) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return null;
	const fm = {
		concepts: [],
		model: false
	};
	const lines = m[1].split("\n").map((l) => l.replace(/\r$/, ""));
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		if (line.length - line.trimStart().length !== 0) continue;
		const [key, ...rest] = line.trim().split(":");
		const value = rest.join(":").trim();
		if (key === "spec-type") fm.specType = unquote(value);
		else if (key === "model") fm.model = unquote(value) === "true";
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
function facetKind(relPath, specType) {
	const p = relPath.replace(/\\/g, "/");
	if (p.startsWith("design/")) return "rule";
	if (p.startsWith("workflows/")) return "workflow";
	if (specType === "reference") return "reference";
	if (specType === "behavioral") return "behavior";
	return "index";
}
function displayPath(relPath) {
	const p = relPath.replace(/\\/g, "/");
	return p.endsWith("/README.md") ? p.slice(0, -9) : p;
}
function scanProjectSpec(specDir) {
	const records = [];
	walk(specDir, specDir, records);
	return records;
}
function walk(dir, specDir, out) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walk(full, specDir, out);
		else if (entry.name.endsWith(".md")) {
			const fm = parseFrontmatter(readFileSync(full, "utf8"));
			if (!fm || fm.concepts.length === 0) continue;
			const relPath = relative(specDir, full).replace(/\\/g, "/");
			out.push({
				relPath,
				display: displayPath(relPath),
				concepts: fm.concepts,
				facet: facetKind(relPath, fm.specType)
			});
		}
	}
}
function groupByConcept(records) {
	const grouped = /* @__PURE__ */ new Map();
	for (const rec of records) for (const concept of rec.concepts) {
		const list = grouped.get(concept) ?? [];
		list.push(rec);
		grouped.set(concept, list);
	}
	return new Map([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, [...v].sort((x, y) => x.display.localeCompare(y.display))]));
}
function renderTable(grouped) {
	return [
		"| Concept | Facets |",
		"|---|---|",
		...[...grouped.entries()].map(([concept, nodes]) => {
			return `| \`${concept}\` | ${nodes.map((n) => `\`${n.display}\` (${n.facet})`).join(" · ")} |`;
		})
	].join("\n");
}
function renderSection(grouped) {
	return [
		BEGIN_MARKER,
		"",
		"## By concept",
		"",
		"> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.",
		"",
		renderTable(grouped),
		"",
		END_MARKER
	].join("\n");
}
function applySection(specText, section) {
	const begin = specText.indexOf(BEGIN_MARKER);
	const end = specText.indexOf(END_MARKER);
	if (begin !== -1 && end !== -1 && end > begin) {
		const before = specText.slice(0, begin);
		const after = specText.slice(end + 34);
		return before + section + after;
	}
	const anchor = specText.indexOf(ANCHOR_HEADING);
	if (anchor !== -1) return specText.slice(0, anchor) + section + "\n\n" + specText.slice(anchor);
	return `${specText.replace(/\s*$/, "")}\n\n${section}\n`;
}
function extractSection(specText) {
	const begin = specText.indexOf(BEGIN_MARKER);
	const end = specText.indexOf(END_MARKER);
	if (begin === -1 || end === -1 || end < begin) return null;
	return specText.slice(begin, end + 34);
}
function parseArgs(argv) {
	let specDir = ".";
	let mode = "print";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--spec-dir") specDir = argv[++i] ?? ".";
		else if (a === "--write") mode = "write";
		else if (a === "--check") mode = "check";
	}
	return {
		specDir,
		mode
	};
}
function main(argv) {
	const { specDir, mode } = parseArgs(argv);
	const section = renderSection(groupByConcept(scanProjectSpec(specDir)));
	const specPath = join(specDir, "spec.md");
	if (mode === "print") {
		process.stdout.write(`${section}\n`);
		return 0;
	}
	if (!existsSync(specPath)) {
		process.stderr.write(`concept-index: no spec.md at ${specPath}\n`);
		return 2;
	}
	const specText = readFileSync(specPath, "utf8");
	if (mode === "check") {
		if (extractSection(specText) === section) {
			process.stdout.write("concept-index: no drift\n");
			return 0;
		}
		process.stderr.write("concept-index: drift — spec.md by-concept block is stale; run --write\n");
		return 1;
	}
	const next = applySection(specText, section);
	if (next !== specText) writeFileSync(specPath, next);
	process.stdout.write(`concept-index: ${next === specText ? "unchanged" : "updated"} ${specPath}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { BEGIN_MARKER, END_MARKER, applySection, extractSection, facetKind, groupByConcept, main, parseFrontmatter, parseScalarOrFlow, renderSection, renderTable, scanProjectSpec };
