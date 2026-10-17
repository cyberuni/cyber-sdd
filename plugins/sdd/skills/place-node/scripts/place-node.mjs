#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/place-node/place-node.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/place-node/scripts/place-node.mjs","commands":{}};
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/place-node/place-node.mts
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
function parseConcepts(text) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return [];
	const lines = m[1].split("\n").map((l) => l.replace(/\r$/, ""));
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.length - line.trimStart().length !== 0) continue;
		const [key, ...rest] = line.trim().split(":");
		if (key !== "concept") continue;
		const value = rest.join(":").trim();
		if (value.startsWith("[") && value.endsWith("]")) return value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter((s) => s.length > 0);
		if (value !== "") return [unquote(value)];
		const out = [];
		for (let j = i + 1; j < lines.length; j++) {
			const item = lines[j];
			if (item.trim() === "") continue;
			if (item.length - item.trimStart().length === 0) break;
			const dash = /^\s*-\s+(.*)$/.exec(item);
			if (dash) out.push(unquote(dash[1].trim()));
		}
		return out;
	}
	return [];
}
function unquote(v) {
	return v.replace(/^["']|["']$/g, "");
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
			const concepts = parseConcepts(readFileSync(full, "utf8"));
			if (concepts.length === 0) continue;
			const relPath = full.slice(specDir.length + 1).replace(/\\/g, "/");
			out.push({
				relPath,
				capability: relPath.split("/")[0],
				display: displayPath(relPath),
				concepts
			});
		}
	}
}
function suggestHomes(records, concept) {
	const counts = /* @__PURE__ */ new Map();
	for (const rec of records) {
		if (!rec.concepts.includes(concept)) continue;
		counts.set(rec.capability, (counts.get(rec.capability) ?? 0) + 1);
	}
	return [...counts.entries()].map(([capability, count]) => ({
		capability,
		count
	})).sort((a, b) => b.count - a.count || a.capability.localeCompare(b.capability));
}
function findNear(records, name) {
	const needle = name.trim().toLowerCase();
	if (needle === "") return [];
	return records.filter((rec) => rec.relPath.toLowerCase().includes(needle)).sort((a, b) => a.display.localeCompare(b.display));
}
function render(homes, near, concept, name) {
	const lines = [`place-node: concept=${concept || "(none)"} name=${name || "(none)"}`];
	if (homes.length > 0) {
		lines.push(`homes[${homes.length}]{capability,facets}:`);
		for (const h of homes) lines.push(`  ${h.capability},${h.count}`);
	} else lines.push("homes[0]: (new concept — pick any plausible capability; finalized at handoff)");
	if (near.length > 0) {
		lines.push(`near[${near.length}]:`);
		for (const n of near) lines.push(`  ${n.display}`);
	} else lines.push("near[0]: (no name overlap)");
	lines.push("note: placement is provisional — finalized at handoff");
	return lines.join("\n");
}
function main(argv) {
	let specDir = ".";
	let concept = "";
	let name = "";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--spec-dir") specDir = argv[++i] ?? ".";
		else if (a === "--concept") concept = argv[++i] ?? "";
		else if (a === "--name") name = argv[++i] ?? "";
	}
	const records = scanProjectSpec(specDir);
	const homes = concept ? suggestHomes(records, concept) : [];
	const near = name ? findNear(records, name) : [];
	process.stdout.write(`${render(homes, near, concept, name)}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { findNear, main, parseConcepts, scanProjectSpec, suggestHomes };
