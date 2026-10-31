#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-retired-terms/check-retired-terms.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/check-retired-terms/scripts/check-retired-terms.mjs","commands":{}};
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-retired-terms/check-retired-terms.mts
var RegistryParseError = class extends Error {};
const REGISTRY_PATH = ".agents/sdd/retired-terms.toml";
function isBlankOrComment(line) {
	const t = line.trim();
	return t === "" || t.startsWith("#");
}
function extractString(block, key) {
	const m = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*"([^"]*)"[^\\n]*`).exec(block);
	if (!m) throw new RegistryParseError(`[[retired]] entry is missing a string "${key}"`);
	return m[2];
}
function extractArray(block, key) {
	const openMatch = new RegExp(`(^|\\n)\\s*${key}\\s*=\\s*\\[`).exec(block);
	if (!openMatch) return [];
	const openIdx = openMatch.index + openMatch[0].length - 1;
	const closeIdx = block.indexOf("]", openIdx);
	if (closeIdx === -1) throw new RegistryParseError(`"${key}" array is never closed with "]"`);
	const arrText = block.slice(openIdx, closeIdx);
	const out = [];
	for (const q of arrText.matchAll(/"([^"]*)"/g)) out.push(q[1]);
	return out;
}
/** Parses the registry's minimal TOML subset: an array of `[[retired]]` tables carrying string
* keys (term/since/replacement, all required) and optional string-array keys (scope/allow). Throws
* `RegistryParseError` on anything that does not fit that shape — an absent registry is handled by
* the caller (`readRegistry`), not here; an empty/comment-only file parses to `[]`. */
function parseRegistryToml(text) {
	const marker = "[[retired]]";
	const firstIdx = text.indexOf(marker);
	if (firstIdx === -1) {
		if (text.split("\n").every(isBlankOrComment)) return [];
		throw new RegistryParseError("no [[retired]] table found and the file is not empty/comment-only");
	}
	if (!text.slice(0, firstIdx).split("\n").every(isBlankOrComment)) throw new RegistryParseError("content found before the first [[retired]] table header");
	return text.slice(firstIdx).split(marker).slice(1).map((block) => {
		const term = extractString(block, "term");
		const since = extractString(block, "since");
		const replacement = extractString(block, "replacement");
		const scope = extractArray(block, "scope");
		const allow = extractArray(block, "allow");
		const entry = {
			term,
			since,
			replacement
		};
		if (scope.length) entry.scope = scope;
		if (allow.length) entry.allow = allow;
		return entry;
	});
}
/** Reads and parses the registry at `<root>/.agents/sdd/retired-terms.toml`. An absent file yields
* `[]` (an "an absent registry sweeps clean" registry, not an error). A present-but-malformed file
* throws `RegistryParseError` — the caller must surface that loudly and exit non-zero. */
function readRegistry(root) {
	const file = join(root, REGISTRY_PATH);
	if (!existsSync(file)) return [];
	return parseRegistryToml(readFileSync(file, "utf8"));
}
const DEFAULT_BUILTIN_EXCLUDED_FILES = [
	REGISTRY_PATH,
	"plugins/sdd/src/check-retired-terms/check-retired-terms.mts",
	"plugins/sdd/src/check-retired-terms/check-retired-terms.test.mts",
	".agents/specs/sdd/corpus/retired-terms/README.md",
	".agents/specs/sdd/corpus/retired-terms/retired-terms.feature"
];
const DEFAULT_BUILTIN_EXCLUDED_PREFIXES = [".agents/plans/"];
function isUnderLedgerDir(relPath) {
	return relPath.split("/").slice(0, -1).includes("ledger");
}
function isBuiltinExcluded(relPath, excludedFiles, excludedPrefixes) {
	if (excludedFiles.includes(relPath)) return true;
	if (excludedPrefixes.some((p) => relPath.startsWith(p))) return true;
	if (isUnderLedgerDir(relPath)) return true;
	return false;
}
function inScope(relPath, scope) {
	if (!scope || scope.length === 0) return true;
	return scope.some((prefix) => relPath.startsWith(prefix));
}
function parseAllowEntry(raw) {
	const idx = raw.indexOf("::");
	if (idx === -1) return { file: raw.trim() };
	return {
		file: raw.slice(0, idx).trim(),
		substring: raw.slice(idx + 2).trim()
	};
}
function isAllowed(relPath, lineText, allow) {
	if (!allow) return false;
	for (const raw of allow) {
		const parsed = parseAllowEntry(raw);
		if (parsed.file !== relPath) continue;
		if (parsed.substring === void 0) return true;
		if (lineText.includes(parsed.substring)) return true;
	}
	return false;
}
/** The git-tracked file set, repo-relative, one per line. An untracked file is outside the sweep
* by construction — it is never in this list. */
function listTrackedFiles(root) {
	return execFileSync("git", ["ls-files"], {
		cwd: root,
		encoding: "utf8"
	}).split("\n").filter((l) => l !== "");
}
/** Sweeps `root` for survivors of every entry in `entries`. `options` lets callers (tests)
* substitute fixture-scoped config — the tracked-file source and the built-in exclusion lists —
* in place of the real repo and the real defaults, mirroring `findMetaphorViolations`'s
* `ScanOptions` (packages/cyberlegion/src/metaphor-free.ts). */
function sweep(root, entries, options = {}) {
	const listFiles = options.listTrackedFiles ?? listTrackedFiles;
	const excludedFiles = options.builtinExcludedFiles ?? DEFAULT_BUILTIN_EXCLUDED_FILES;
	const excludedPrefixes = options.builtinExcludedPrefixes ?? DEFAULT_BUILTIN_EXCLUDED_PREFIXES;
	const violations = [];
	for (const relPath of listFiles(root)) {
		if (isBuiltinExcluded(relPath, excludedFiles, excludedPrefixes)) continue;
		let text;
		try {
			text = readFileSync(join(root, relPath), "utf8");
		} catch {
			continue;
		}
		const lines = text.split("\n");
		for (const entry of entries) {
			if (!inScope(relPath, entry.scope)) continue;
			lines.forEach((lineText, i) => {
				if (!lineText.includes(entry.term)) return;
				if (isAllowed(relPath, lineText, entry.allow)) return;
				violations.push({
					file: relPath,
					line: i + 1,
					term: entry.term,
					replacement: entry.replacement
				});
			});
		}
	}
	return violations.sort((a, b) => a.file !== b.file ? a.file < b.file ? -1 : 1 : a.line - b.line);
}
/** Renders `--list` output: one line per registered term with its `since` and `replacement`, or a
* definitive empty-state line when nothing is registered — never silence. */
function formatList(entries) {
	if (entries.length === 0) return "check-retired-terms: no term is registered\n";
	return entries.map((e) => `${e.term}  (since ${e.since})  -> ${e.replacement}\n`).join("");
}
/** Renders the sweep report: `file:line:term` plus the declared replacement, one per survivor
* (every survivor, not just the first), then a count summary. */
function formatViolations(violations) {
	const lines = violations.map((v) => `${v.file}:${v.line}:${v.term} — replace with: ${v.replacement}\n`);
	lines.push(`check-retired-terms: ${violations.length} survivor(s) found\n`);
	return lines.join("");
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] ?? "." : ".";
	const list = argv.includes("--list");
	let entries;
	try {
		entries = readRegistry(root);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		process.stderr.write(`check-retired-terms: malformed registry — ${message}\n`);
		return 1;
	}
	if (list) {
		process.stdout.write(formatList(entries));
		return 0;
	}
	const violations = sweep(root, entries);
	if (violations.length === 0) {
		process.stdout.write("check-retired-terms: clean — no survivors found\n");
		return 0;
	}
	process.stdout.write(formatViolations(violations));
	return 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { RegistryParseError, formatList, formatViolations, listTrackedFiles, main, parseRegistryToml, readRegistry, sweep };
