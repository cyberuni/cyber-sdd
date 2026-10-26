#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-field-mandates/check-field-mandates.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.1","entry":"skills/check-field-mandates/scripts/check-field-mandates.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-field-mandates/check-field-mandates.mts
/** UPPER_CASE, or snake_case with at least one underscore — a bare lowercase word is prose. */
const TOKEN = "(?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*|[a-z][a-z0-9]*(?:_[a-z0-9]+)+)";
const TOKEN_ITEM = `${TOKEN}(?:\\(s\\))?`;
/** A block line opening with a comma list of tokens, then a colon, a trailing comment, or nothing. */
const BLOCK_DECLARATION_RE = new RegExp(`^\\s*(${TOKEN_ITEM}(?:\\s*,\\s*${TOKEN_ITEM})*)\\s*(:.*|#.*)?$`);
/** A list item opening with one or more bold tokens joined by `+`. */
const LIST_DECLARATION_RE = new RegExp(`^\\s*[-*+]\\s+(\\*\\*${TOKEN}\\*\\*(?:\\s*\\+\\s*\\*\\*${TOKEN}\\*\\*)*)(.*)$`);
const BOLD_TOKEN_RE = new RegExp(`\\*\\*(${TOKEN})\\*\\*`, "g");
const WORD_RE = new RegExp(`(?<![A-Za-z0-9_])${TOKEN}(?![A-Za-z0-9_])`, "g");
const CODE_SPAN_RE = /`([^`\n]+)`/g;
const MANDATE_LEAD_RE = new RegExp(`^<?(${TOKEN})(?=$|[\\s.:\\[\\]>(,=])`);
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
/** The marker must carry a reason — a bare marker excuses nothing. */
const IGNORE_MARKER_RE = /<!--\s*field-mandate-ignore\s*:\s*[^\s>-][^>]*-->/;
/** A field token is two or more characters: a lone capital is a word, not a field. */
function isField(token) {
	return token.length >= 2;
}
/** A token's case-folded form: the spelling-independent name of the field. */
function fold(token) {
	return token.toUpperCase();
}
/** The folded forms a token may take and still be the same field — equal, or one trailing `S` apart. */
function sameFieldForms(token) {
	const t = fold(token);
	const forms = [t, `${t}S`];
	if (t.endsWith("S") && t.length > 2) forms.push(t.slice(0, -1));
	return forms;
}
/** Does the set of folded tokens hold the same field as `token`? */
function hasSameField(folded, token) {
	return sameFieldForms(token).some((f) => folded.has(f));
}
/** Is the token spelled lowercase (snake_case) rather than uppercase? */
function isLower(token) {
	return token !== fold(token);
}
function parseDefinition(text) {
	const lines = text.split(/\r?\n/);
	const declarations = [];
	const mandates = [];
	const proseWords = /* @__PURE__ */ new Set();
	let i = 0;
	if (lines[0]?.trim() === "---") {
		const end = lines.findIndex((l, n) => n > 0 && l.trim() === "---");
		if (end > 0) i = end + 1;
	}
	let fence = null;
	let group = [];
	/** Record a span of text as prose: its field-shaped words, and any code-span mandate. */
	function scanProse(text, lineNo) {
		for (const m of text.matchAll(WORD_RE)) if (isField(m[0])) proseWords.add(m[0]);
		if (IGNORE_MARKER_RE.test(text)) return;
		for (const m of text.matchAll(CODE_SPAN_RE)) {
			const token = (m[1] ?? "").trim().match(MANDATE_LEAD_RE)?.[1];
			if (token && isField(token)) mandates.push({
				token,
				line: lineNo
			});
		}
	}
	for (; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const lineNo = i + 1;
		const fenceMatch = line.match(FENCE_RE);
		if (fence) {
			if (fenceMatch && fenceMatch[1]?.[0] === fence.char && (fenceMatch[1]?.length ?? 0) >= fence.length && fenceMatch[2]?.trim() === "") {
				fence = null;
				group = [];
				continue;
			}
			if (!fence.structured) continue;
			const decl = line.match(BLOCK_DECLARATION_RE);
			const tokens = decl ? (decl[1] ?? "").split(",").map((t) => t.trim().replace(/\(s\)$/, "")) : [];
			const rest = decl?.[2];
			if (decl !== null && (rest?.startsWith(":") || tokens.length >= 2)) {
				const glossed = rest?.startsWith(":") === true && rest.slice(1).trim() !== "";
				group = tokens.filter(isField).map((token) => ({
					token,
					line: lineNo,
					glossed
				}));
				declarations.push(...group);
			} else if (line.trim() !== "") for (const d of group) d.glossed = true;
			continue;
		}
		if (fenceMatch) {
			const info = fenceMatch[2]?.trim() ?? "";
			fence = {
				char: fenceMatch[1]?.[0] ?? "`",
				length: fenceMatch[1]?.length ?? 3,
				structured: info === "" || info === "text"
			};
			group = [];
			continue;
		}
		const listDecl = line.match(LIST_DECLARATION_RE);
		if (listDecl) {
			const rest = listDecl[2] ?? "";
			const glossed = rest.trim() !== "";
			for (const m of (listDecl[1] ?? "").matchAll(BOLD_TOKEN_RE)) {
				const token = m[1] ?? "";
				if (isField(token)) declarations.push({
					token,
					line: lineNo,
					glossed
				});
			}
			scanProse(rest, lineNo);
			continue;
		}
		scanProse(line, lineNo);
	}
	return {
		declarations,
		mandates,
		proseWords
	};
}
function walk(dir, out) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) walk(full, out);
		else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
	}
}
/** Is this root-relative path a skill (`plugins/<p>/skills/**\/SKILL.md`) or agent (`plugins/<p>/agents/*.md`)? */
function isDefinitionPath(rel) {
	const parts = rel.split("/");
	if (parts[0] !== "plugins" || parts.length < 4) return false;
	if (parts[2] === "agents") return parts.length === 4 && (parts[3] ?? "").endsWith(".md");
	if (parts[2] === "skills") return parts.length >= 5 && parts[parts.length - 1] === "SKILL.md";
	return false;
}
/** Every definition under `root`, root-relative, `/`-separated, path-sorted. */
function discoverDefinitions(root) {
	const pluginsDir = join(root, "plugins");
	if (!existsSync(pluginsDir)) return [];
	const files = [];
	walk(pluginsDir, files);
	return files.map((f) => relative(root, f).split(sep).join("/")).filter(isDefinitionPath).sort();
}
function check(parsed) {
	const known = /* @__PURE__ */ new Set();
	for (const p of parsed.values()) for (const d of p.declarations) known.add(fold(d.token));
	const findings = [];
	for (const [file, p] of parsed) {
		if (p.declarations.length === 0) continue;
		const declared = new Set(p.declarations.map((d) => fold(d.token)));
		const proseWords = new Set([...p.proseWords].map(fold));
		const seen = /* @__PURE__ */ new Set();
		for (const d of p.declarations) {
			if (seen.has(d.token)) continue;
			seen.add(d.token);
			if (!p.declarations.some((o) => o.token === d.token && o.glossed) && !hasSameField(proseWords, d.token)) findings.push({
				kind: "unexplained",
				file,
				line: d.line,
				token: d.token
			});
		}
		const reported = /* @__PURE__ */ new Set();
		for (const m of p.mandates) {
			if (!hasSameField(known, m.token)) continue;
			const key = `${m.line}:${m.token}`;
			if (reported.has(key)) continue;
			if (!hasSameField(declared, m.token)) {
				reported.add(key);
				findings.push({
					kind: "undeclared",
					file,
					line: m.line,
					token: m.token
				});
				continue;
			}
			const forms = sameFieldForms(m.token);
			const same = p.declarations.filter((d) => forms.includes(fold(d.token)));
			if (same.some((d) => isLower(d.token) === isLower(m.token))) continue;
			reported.add(key);
			findings.push({
				kind: "miscased",
				file,
				line: m.line,
				token: m.token,
				declared: same[0]?.token
			});
		}
	}
	return findings.sort((a, b) => a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1);
}
const DETAIL = {
	unexplained: "declared in a block, but no gloss and no prose explains it",
	undeclared: "mandated in the prose, but no block in this file declares it",
	miscased: "mandated in the prose, but this file declares it in the other case"
};
function formatReport(definitions, findings) {
	if (definitions.length === 0) return "check-field-mandates: no skill or agent definition found\n";
	if (findings.length === 0) return `check-field-mandates: ${definitions.length} definition(s) OK\n`;
	return `${findings.map((f) => `  ${f.kind.padEnd(11)} ${f.file}:${f.line} ${f.token} — ${DETAIL[f.kind]}${f.declared ? ` (${f.declared})` : ""}`).join("\n")}\ncheck-field-mandates: ${findings.length} finding(s) across ${definitions.length} definition(s)\n`;
}
function isReadableDirectory(path) {
	try {
		if (!statSync(path).isDirectory()) return false;
		readdirSync(path);
		return true;
	} catch {
		return false;
	}
}
function main(argv) {
	let root = ".";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--root") {
			const next = argv[++i];
			if (next === void 0) {
				process.stderr.write("check-field-mandates: --root needs a directory\n");
				return 1;
			}
			root = next;
			continue;
		}
		process.stderr.write(`check-field-mandates: unrecognized flag ${a}\n`);
		return 1;
	}
	if (!isReadableDirectory(root)) {
		process.stderr.write(`check-field-mandates: root ${root} is not a readable directory\n`);
		return 1;
	}
	const definitions = discoverDefinitions(root);
	const parsed = /* @__PURE__ */ new Map();
	for (const rel of definitions) parsed.set(rel, parseDefinition(readFileSync(join(root, rel), "utf8")));
	const findings = check(parsed);
	process.stdout.write(formatReport(definitions, findings));
	return findings.length === 0 ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { check, discoverDefinitions, formatReport, isDefinitionPath, main, parseDefinition };
