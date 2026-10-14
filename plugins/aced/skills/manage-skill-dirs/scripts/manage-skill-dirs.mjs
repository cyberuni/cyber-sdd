#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/manage-skill-dirs/manage-skill-dirs.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.2","entry":"skills/manage-skill-dirs/scripts/manage-skill-dirs.mjs","commands":{}};
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/manage-skill-dirs/manage-skill-dirs.mts
const SKILL_DIRS_CONFIG = ".agents/aced/skill-dirs.toml";
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
const FIXED_SKILL_DIRS = [{
	pattern: "skills/",
	kind: "fixed",
	explanation: "the repo-root public skill directory (agentskills-standard)"
}, {
	pattern: ".agents/skills/",
	kind: "fixed",
	explanation: "the repo-root private skill directory (agentskills-standard)"
}];
function parseSkillDirsToml(text) {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text);
	if (!m) return [];
	const out = [];
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim());
	return out.filter((s) => s !== "");
}
function readCustomSkillDirs(root) {
	const file = join(root, SKILL_DIRS_CONFIG);
	if (!existsSync(file)) return [];
	try {
		return parseSkillDirsToml(readFileSync(file, "utf8"));
	} catch {
		return [];
	}
}
function serializeSkillDirs(patterns) {
	if (patterns.length === 0) return "anchors = []\n";
	return `anchors = [\n${patterns.map((p) => `  "${p}",`).join("\n")}\n]\n`;
}
function writeCustomSkillDirs(root, patterns) {
	const file = join(root, SKILL_DIRS_CONFIG);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, serializeSkillDirs(patterns));
}
function isValidPattern(pattern) {
	const p = pattern.trim().replace(/\\/g, "/");
	if (p === "" || p.startsWith("/") || /(^|\/)\.\.(\/|$)/.test(p)) return false;
	const segs = p.replace(/^\/+|\/+$/g, "").split("/");
	if (segs.some((s) => s === "")) return false;
	return segs.every((s) => s === "*" || s === "**" || !/[<>]/.test(s));
}
function isFixedConvention(pattern) {
	const p = pattern.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	return p === "skills" || p === ".agents/skills";
}
function listSkillDirs(root) {
	const custom = readCustomSkillDirs(root).map((pattern) => ({
		pattern,
		kind: "custom",
		explanation: "a declared extra skill-dir pattern"
	}));
	return [...FIXED_SKILL_DIRS, ...custom];
}
function addSkillDir(root, pattern) {
	const p = pattern.trim();
	if (isFixedConvention(p)) return {
		ok: false,
		reason: "that is a fixed default root — always scanned, never curated"
	};
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed skill-dir pattern"
	};
	const current = readCustomSkillDirs(root);
	if (current.includes(p)) return {
		ok: true,
		changed: false,
		patterns: current,
		message: "already present"
	};
	const next = [...current, p];
	writeCustomSkillDirs(root, next);
	return {
		ok: true,
		changed: true,
		patterns: next,
		message: `added ${p}`
	};
}
function removeSkillDir(root, pattern) {
	const p = pattern.trim();
	const current = readCustomSkillDirs(root);
	if (!current.includes(p)) return {
		ok: true,
		changed: false,
		patterns: current,
		message: "nothing was removed"
	};
	const next = current.filter((a) => a !== p);
	writeCustomSkillDirs(root, next);
	return {
		ok: true,
		changed: true,
		patterns: next,
		message: `removed ${p}`
	};
}
function editSkillDir(root, oldPattern, newPattern) {
	const oldP = oldPattern.trim();
	const newP = newPattern.trim();
	if (isFixedConvention(oldP)) return {
		ok: false,
		reason: "cannot edit a fixed default root"
	};
	if (!isValidPattern(newP)) return {
		ok: false,
		reason: "malformed replacement pattern"
	};
	if (isFixedConvention(newP)) return {
		ok: false,
		reason: "replacement is a fixed default root"
	};
	const current = readCustomSkillDirs(root);
	if (!current.includes(oldP)) return {
		ok: false,
		reason: `no such custom pattern: ${oldP}`
	};
	const next = current.map((a) => a === oldP ? newP : a);
	writeCustomSkillDirs(root, next);
	return {
		ok: true,
		changed: true,
		patterns: next,
		message: `edited ${oldP} -> ${newP}`
	};
}
function inducePatterns(root, samplePath) {
	const rel = samplePath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	if (rel === "" || /(^|\/)\.\.(\/|$)/.test(rel)) return {
		ok: false,
		reason: "path is not repo-relative"
	};
	let ok = false;
	try {
		ok = statSync(join(root, rel)).isDirectory();
	} catch {
		ok = false;
	}
	if (!ok) return {
		ok: false,
		reason: `sample path does not resolve to a directory under the repo: ${rel}`
	};
	const segs = rel.split("/");
	let generalized = rel;
	if (segs.length >= 2) {
		const g = [...segs];
		g[segs.length - 2] = "*";
		generalized = g.join("/");
	}
	return {
		ok: true,
		candidates: generalized === rel ? [rel] : [rel, generalized]
	};
}
function collectDescendants(root, startDir) {
	const out = [startDir];
	let entries;
	try {
		entries = readdirSync(join(root, startDir), { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
		out.push(...collectDescendants(root, startDir ? `${startDir}/${e.name}` : e.name));
	}
	return out;
}
function expandPattern(root, pattern) {
	const segs = pattern.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
	let frontier = [""];
	for (const seg of segs) {
		const next = [];
		if (seg === "**") {
			for (const dir of frontier) next.push(...collectDescendants(root, dir));
			frontier = next;
			continue;
		}
		if (seg === "*") {
			for (const dir of frontier) {
				let entries;
				try {
					entries = readdirSync(join(root, dir), { withFileTypes: true });
				} catch {
					continue;
				}
				for (const e of entries) {
					if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
					next.push(dir ? `${dir}/${e.name}` : e.name);
				}
			}
			frontier = next;
			continue;
		}
		frontier = frontier.map((dir) => dir ? `${dir}/${seg}` : seg);
	}
	return frontier;
}
function previewPattern(root, pattern) {
	const p = pattern.trim();
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed candidate pattern"
	};
	const matches = [];
	for (const matchedDir of expandPattern(root, p)) {
		let entries;
		try {
			entries = readdirSync(join(root, matchedDir), { withFileTypes: true });
		} catch {
			continue;
		}
		for (const e of entries) {
			if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
			const skillFile = matchedDir ? `${matchedDir}/${e.name}/SKILL.md` : `${e.name}/SKILL.md`;
			if (!existsSync(join(root, skillFile))) continue;
			matches.push({
				path: skillFile,
				name: e.name
			});
		}
	}
	matches.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
	return {
		ok: true,
		matches
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
		w("Skill-dir patterns the validate engine scans (fixed default roots are always scanned):");
		for (const a of listSkillDirs(root)) w(`  [${a.kind}] ${a.pattern} — ${a.explanation}`);
		return 0;
	}
	if (argv.includes("--add")) {
		const r = addSkillDir(root, flag(argv, "--add") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--remove")) {
		const r = removeSkillDir(root, flag(argv, "--remove") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--edit")) {
		const i = argv.indexOf("--edit");
		const r = editSkillDir(root, argv[i + 1] ?? "", argv[i + 2] ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--induce")) {
		const r = inducePatterns(root, flag(argv, "--induce") ?? "");
		if (!r.ok) {
			w(`unusable: ${r.reason}`);
			return 1;
		}
		w("Candidate skill-dir patterns:");
		for (const c of r.candidates) w(`  ${c}`);
		return 0;
	}
	if (argv.includes("--preview")) {
		const r = previewPattern(root, flag(argv, "--preview") ?? "");
		if (!r.ok) {
			w(`invalid: ${r.reason}`);
			return 1;
		}
		if (r.matches.length === 0) {
			w("This pattern matches no skill.");
			return 0;
		}
		w("This pattern would discover:");
		for (const m of r.matches) w(`  ${m.path} (${m.name})`);
		return 0;
	}
	w("usage: manage-skill-dirs --list | --add <p> | --remove <p> | --edit <old> <new> | --induce <path> | --preview <p>");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { FIXED_SKILL_DIRS, addSkillDir, editSkillDir, inducePatterns, isFixedConvention, isValidPattern, listSkillDirs, main, parseSkillDirsToml, previewPattern, readCustomSkillDirs, removeSkillDir, serializeSkillDirs };
