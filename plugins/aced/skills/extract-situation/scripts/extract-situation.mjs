#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/extract-situation/extract-situation.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.2","entry":"skills/extract-situation/scripts/extract-situation.mjs","commands":{}};
import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
//#region src/extract-situation/extract-situation.mts
function parseScenarios(text) {
	const lines = text.split("\n");
	const scenarios = [];
	let current = null;
	let lastKeyword = null;
	let docstringFence = null;
	let docstringOwner = null;
	for (const raw of lines) {
		const line = raw.trimStart();
		const fence = /^("""|```)/.exec(line)?.[1];
		if (docstringFence) {
			if (fence === docstringFence) {
				docstringFence = null;
				docstringOwner = null;
			} else if (docstringOwner?.docstring) docstringOwner.docstring.lines.push(raw);
			continue;
		}
		if (fence) {
			docstringFence = fence;
			const owner = current?.steps.at(-1) ?? null;
			if (owner) {
				owner.docstring = {
					fence,
					lines: []
				};
				docstringOwner = owner;
			}
			continue;
		}
		if (/^Scenario:/i.test(line) || /^Scenario Outline:/i.test(line)) {
			if (current) scenarios.push(current);
			const isOutline = /^Scenario Outline:/i.test(line);
			current = {
				name: line.replace(/^Scenario(?: Outline)?:/i, "").trim(),
				steps: [],
				isOutline,
				examples: null
			};
			lastKeyword = null;
			continue;
		}
		if (current && /^Examples:/i.test(line)) {
			current.examples = {
				header: [],
				rows: []
			};
			continue;
		}
		if (current?.examples && line.startsWith("|")) {
			const cells = line.split("|").slice(1, -1).map((c) => c.trim());
			if (current.examples.header.length === 0) current.examples.header = cells;
			else current.examples.rows.push(cells);
			continue;
		}
		const stepMatch = /^(Given|When|Then|And|But)\b/i.exec(line);
		if (current && stepMatch) {
			const literal = stepMatch[1];
			const resolved = /^(Given|When|Then)$/i.test(literal) ? literal[0].toUpperCase() + literal.slice(1).toLowerCase() : lastKeyword ?? "unresolved";
			current.steps.push({
				text: line,
				effectiveKeyword: resolved,
				docstring: null
			});
			if (resolved !== "unresolved") lastKeyword = resolved;
		}
	}
	if (current) scenarios.push(current);
	return scenarios;
}
var ScenarioNotFoundError = class extends Error {};
var AmbiguousScenarioError = class extends Error {};
var UnparseableFeatureError = class extends Error {};
var EmptySituationError = class extends Error {};
var RowOutOfRangeError = class extends Error {};
function extractSituation(text, scenarioName, fileLabel, row) {
	if (!/^\s*Feature:/im.test(text)) throw new UnparseableFeatureError(`${fileLabel}: not a valid .feature file (no Feature: line)`);
	const matches = parseScenarios(text).filter((s) => s.name === scenarioName);
	if (matches.length === 0) throw new ScenarioNotFoundError(`${fileLabel}: scenario not found: "${scenarioName}"`);
	if (matches.length > 1) throw new AmbiguousScenarioError(`${fileLabel}: scenario name is ambiguous (${matches.length} matches): "${scenarioName}"`);
	const scenario = matches[0];
	const emitted = scenario.steps.filter((s) => s.effectiveKeyword === "Given" || s.effectiveKeyword === "When");
	const steps = emitted.flatMap((s) => s.docstring ? [
		s.text,
		s.docstring.fence,
		...s.docstring.lines,
		s.docstring.fence
	] : [s.text]);
	const withDoc = (s) => s.docstring ? [
		s.text,
		s.docstring.fence,
		...s.docstring.lines,
		s.docstring.fence
	] : [s.text];
	const given = emitted.filter((s) => s.effectiveKeyword === "Given").flatMap(withDoc);
	const when = emitted.filter((s) => s.effectiveKeyword === "When").flatMap(withDoc);
	if (steps.length === 0) throw new EmptySituationError(`${fileLabel}: scenario has no Given or When steps: "${scenarioName}"`);
	const placeholders = [...new Set(steps.flatMap((s) => [...s.matchAll(/<([^>]+)>/g)].map((m) => m[1])))];
	let examples = null;
	if (scenario.isOutline && scenario.examples && placeholders.length > 0) {
		const keepIdx = scenario.examples.header.map((col, i) => placeholders.includes(col) ? i : -1).filter((i) => i !== -1);
		if (keepIdx.length > 0) {
			const allRows = scenario.examples.rows;
			if (row !== void 0 && (row < 0 || row >= allRows.length)) throw new RowOutOfRangeError(`${fileLabel}: row ${row} is outside the Examples table (${allRows.length} rows): "${scenarioName}"`);
			const picked = row === void 0 ? allRows : [allRows[row]];
			examples = {
				header: keepIdx.map((i) => scenario.examples.header[i]),
				rows: picked.map((r) => keepIdx.map((i) => r[i]))
			};
		}
	}
	return {
		steps,
		given,
		when,
		placeholders,
		examples
	};
}
function formatTable(table) {
	const line = (cells) => `| ${cells.join(" | ")} |`;
	return [line(table.header), ...table.rows.map(line)].join("\n");
}
function formatMarkdown(situation) {
	const lines = ["## Situation", ""];
	for (const step of situation.steps) lines.push(step);
	if (situation.examples) lines.push("", "Examples:", formatTable(situation.examples));
	return `${lines.join("\n")}\n`;
}
function formatJson(situation) {
	return `${JSON.stringify(situation, null, 2)}\n`;
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function main(argv) {
	const featurePath = flag(argv, "--feature");
	const scenarioName = flag(argv, "--scenario");
	const rowRaw = flag(argv, "--row");
	const format = flag(argv, "--format") ?? (argv.includes("--json") ? "json" : "text");
	if (!featurePath || !scenarioName) {
		console.error("✗ usage: extract-situation.mjs --feature <path> --scenario \"<name>\" [--row <n>] [--format json]");
		return 1;
	}
	let row;
	if (rowRaw !== void 0) {
		row = Number(rowRaw);
		if (!Number.isInteger(row) || row < 0) {
			console.error(`✗ --row must be a non-negative integer, got "${rowRaw}"`);
			return 1;
		}
	}
	let text;
	try {
		text = readFileSync(featurePath, "utf8");
	} catch {
		console.error(`✗ ${featurePath}: cannot read file`);
		return 1;
	}
	try {
		const situation = extractSituation(text, scenarioName, featurePath, row);
		process.stdout.write(format === "json" ? formatJson(situation) : formatMarkdown(situation));
		return 0;
	} catch (err) {
		console.error(`✗ ${err.message}`);
		return 1;
	}
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { AmbiguousScenarioError, EmptySituationError, RowOutOfRangeError, ScenarioNotFoundError, UnparseableFeatureError, extractSituation, formatJson, formatMarkdown, main, parseScenarios };
