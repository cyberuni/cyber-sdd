#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-plan-safety/check-plan-safety.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.1","entry":"skills/check-plan-safety/scripts/check-plan-safety.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-plan-safety/check-plan-safety.mts
const LEAK_PATTERNS = [
	{
		kind: "home-abs-path",
		re: /\/(?:home|Users)\/[^\s'"`)\]]+/g
	},
	{
		kind: "home-abs-path",
		re: /[A-Za-z]:\\Users\\[^\s'"`)\]]+/g
	},
	{
		kind: "env-home",
		re: /\$\{?HOME\}?(?![A-Za-z])|%USERPROFILE%|%HOMEPATH%/g
	},
	{
		kind: "env-user",
		re: /\$\{?USER\}?(?![A-Za-z])|%USERNAME%/g
	}
];
/** Cap a matched token so a pathological long path does not blow up the report. */
function capToken(t) {
	return t.length > 80 ? `${t.slice(0, 77)}...` : t;
}
function scanText(file, text) {
	const out = [];
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].replace(/\r$/, "");
		for (const { kind, re } of LEAK_PATTERNS) {
			re.lastIndex = 0;
			let m = re.exec(line);
			while (m !== null) {
				out.push({
					file,
					line: i + 1,
					kind,
					token: capToken(m[0])
				});
				if (m.index === re.lastIndex) re.lastIndex++;
				m = re.exec(line);
			}
		}
	}
	return out;
}
function planFiles(root) {
	const dir = join(root, ".agents", "plans");
	if (!existsSync(dir)) return [];
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name).sort();
}
function collectLeaks(root, paths) {
	const targets = paths ? paths.map((p) => ({
		rel: p,
		abs: p
	})) : planFiles(root).map((name) => ({
		rel: join(".agents", "plans", name),
		abs: join(root, ".agents", "plans", name)
	}));
	const out = [];
	for (const { rel, abs } of targets) {
		let text;
		try {
			text = readFileSync(abs, "utf8");
		} catch {
			continue;
		}
		out.push(...scanText(rel, text));
	}
	return out.sort((a, b) => a.file !== b.file ? a.file < b.file ? -1 : 1 : a.line - b.line);
}
const COLUMNS = [
	"file",
	"line",
	"kind",
	"token"
];
function toonField(v) {
	if (v === "" || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
function toToon(leaks) {
	return [`leaks[${leaks.length}]{${COLUMNS.join(",")}}:`, ...leaks.map((l) => `  ${COLUMNS.map((c) => toonField(String(l[c]))).join(",")}`)].join("\n");
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] ?? "." : ".";
	const format = argv.includes("--format") ? argv[argv.indexOf("--format") + 1] : "toon";
	const check = argv.includes("--check");
	const paths = [];
	for (let i = 0; i < argv.length; i++) if (argv[i] === "--path" && argv[i + 1]) paths.push(argv[++i]);
	const leaks = collectLeaks(root, paths.length ? paths : void 0);
	const out = format === "json" ? JSON.stringify(leaks, null, 2) : toToon(leaks);
	process.stdout.write(`${out}\n`);
	return check && leaks.length > 0 ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { LEAK_PATTERNS, collectLeaks, main, scanText, toToon };
