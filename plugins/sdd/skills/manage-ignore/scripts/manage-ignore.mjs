#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/manage-ignore/manage-ignore.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/manage-ignore/scripts/manage-ignore.mjs","commands":{}};
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/manage-ignore/manage-ignore.mts
const IGNORE_FILE = ".agents/sdd/.sddignore";
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
function splitLines(text) {
	const lines = text.split("\n");
	if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	return lines;
}
function readIgnoreLines(root) {
	const file = join(root, IGNORE_FILE);
	if (!existsSync(file)) return [];
	try {
		return splitLines(readFileSync(file, "utf8"));
	} catch {
		return [];
	}
}
function writeIgnoreLines(root, lines) {
	const file = join(root, IGNORE_FILE);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, lines.length === 0 ? "" : `${lines.join("\n")}\n`);
}
function isRuleLine(line) {
	const t = line.trim();
	return t !== "" && !t.startsWith("#");
}
function listRules(root) {
	return readIgnoreLines(root).filter(isRuleLine).map((l) => l.trim());
}
function hasUnclosedBracket(s) {
	let i = 0;
	while (i < s.length) {
		if (s[i] === "\\") {
			i += 2;
			continue;
		}
		if (s[i] === "[") {
			const close = s.indexOf("]", i + 1);
			if (close === -1) return true;
			i = close + 1;
			continue;
		}
		i++;
	}
	return false;
}
function isValidPattern(pattern) {
	let s = pattern;
	if (s.startsWith("!")) s = s.slice(1);
	s = s.replace(/^\s+|\s+$/g, "");
	if (s === "" || s.startsWith("#")) return false;
	if (hasUnclosedBracket(s)) return false;
	return true;
}
function addRule(root, pattern) {
	const p = pattern.trim();
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed gitignore pattern"
	};
	const lines = readIgnoreLines(root);
	if (lines.some((l) => l.trim() === p)) return {
		ok: true,
		changed: false,
		rules: listRules(root),
		message: "already present"
	};
	const next = [...lines, p];
	writeIgnoreLines(root, next);
	return {
		ok: true,
		changed: true,
		rules: next.filter(isRuleLine).map((l) => l.trim()),
		message: `added ${p}`
	};
}
function removeRule(root, pattern) {
	const p = pattern.trim();
	const lines = readIgnoreLines(root);
	const next = lines.filter((l) => l.trim() !== p);
	if (next.length === lines.length) return {
		ok: true,
		changed: false,
		rules: listRules(root),
		message: "nothing was removed"
	};
	writeIgnoreLines(root, next);
	return {
		ok: true,
		changed: true,
		rules: next.filter(isRuleLine).map((l) => l.trim()),
		message: `removed ${p}`
	};
}
function inducePatterns(_root, samplePath) {
	const normalized = samplePath.trim().replace(/\\/g, "/");
	if (normalized.startsWith("/")) return {
		ok: false,
		reason: "path is not repo-relative (absolute)"
	};
	const rel = normalized.replace(/\/+$/g, "");
	if (rel === "" || /(^|\/)\.\.(\/|$)/.test(rel)) return {
		ok: false,
		reason: "path is not repo-relative"
	};
	const generalized = `**/${rel.split("/").pop() ?? rel}`;
	return {
		ok: true,
		candidates: generalized === rel ? [rel] : [rel, generalized]
	};
}
function gitignoreToRegExp(pattern) {
	let pat = pattern;
	if (pat.endsWith("/")) pat = pat.slice(0, -1);
	let anchored = pat.startsWith("/");
	if (anchored) pat = pat.slice(1);
	if (pat.includes("/")) anchored = true;
	let body = "";
	for (let i = 0; i < pat.length; i++) {
		const c = pat[i];
		if (c === "*") {
			if (pat[i + 1] === "*") {
				i++;
				if (pat[i + 1] === "/") {
					i++;
					body += "(?:.*/)?";
				} else body += ".*";
			} else body += "[^/]*";
		} else if (c === "?") body += "[^/]";
		else if (c === "[") {
			let j = i + 1;
			let cls = "[";
			if (pat[j] === "!") {
				cls += "^";
				j++;
			}
			while (j < pat.length && pat[j] !== "]") {
				cls += /[\\^\]]/.test(pat[j]) ? `\\${pat[j]}` : pat[j];
				j++;
			}
			cls += "]";
			body += cls;
			i = j;
		} else body += c.replace(/[.+^${}()|\\]/g, "\\$&");
	}
	return new RegExp(`${anchored ? "^" : "^(?:.*/)?"}${body}(?:/.*)?$`);
}
function matchesPattern(pattern, path) {
	return gitignoreToRegExp(pattern.startsWith("!") ? pattern.slice(1) : pattern).test(path);
}
function walkTree(root) {
	const out = [];
	const walk = (rel) => {
		let entries;
		try {
			entries = readdirSync(join(root, rel), { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			if (SKIP_DIRS.has(e.name)) continue;
			const child = rel ? `${rel}/${e.name}` : e.name;
			out.push(child);
			if (e.isDirectory()) walk(child);
		}
	};
	walk("");
	return out.sort();
}
function previewPattern(root, pattern) {
	const p = pattern.trim();
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed gitignore pattern"
	};
	return {
		ok: true,
		negated: p.startsWith("!"),
		matches: walkTree(root).filter((path) => matchesPattern(p, path))
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const w = (s) => process.stdout.write(`${s}\n`);
	if (argv.includes("--list")) {
		for (const rule of listRules(root)) w(rule);
		return 0;
	}
	if (argv.includes("--add")) {
		const r = addRule(root, flag(argv, "--add") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--remove")) {
		const r = removeRule(root, flag(argv, "--remove") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--induce")) {
		const r = inducePatterns(root, flag(argv, "--induce") ?? "");
		if (!r.ok) {
			w(`unusable: ${r.reason}`);
			return 1;
		}
		w("Candidate ignore patterns:");
		for (const c of r.candidates) w(`  ${c}`);
		return 0;
	}
	if (argv.includes("--preview")) {
		const r = previewPattern(root, flag(argv, "--preview") ?? "");
		if (!r.ok) {
			w(`invalid: ${r.reason}`);
			return 1;
		}
		const verb = r.negated ? "re-track" : "ignore";
		if (r.matches.length === 0) {
			w(`This pattern would ${verb} no path.`);
			return 0;
		}
		w(`This pattern would ${verb}:`);
		for (const m of r.matches) w(`  ${m}`);
		return 0;
	}
	w("usage: manage-ignore --list | --add <p> | --remove <p> | --induce <path> | --preview <p>");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { addRule, gitignoreToRegExp, inducePatterns, isRuleLine, isValidPattern, listRules, main, matchesPattern, previewPattern, readIgnoreLines, removeRule, splitLines };
