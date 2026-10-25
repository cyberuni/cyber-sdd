#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/manage-spec-anchors/manage-spec-anchors.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.0","entry":"skills/manage-spec-anchors/scripts/manage-spec-anchors.mjs","commands":{}};
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/manage-spec-anchors/manage-spec-anchors.mts
const ANCHORS_CONFIG = ".agents/sdd/spec-anchors.toml";
const LIFECYCLE_STATUSES = /* @__PURE__ */ new Set([
	"draft",
	"approved",
	"implemented",
	"deprecated"
]);
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
const FIXED_ANCHORS = [
	{
		pattern: ".agents/spec/",
		kind: "fixed",
		explanation: "the repo-root single-project spec"
	},
	{
		pattern: ".agents/specs/<project>/",
		kind: "fixed",
		explanation: "each repo-root multi-project spec (the folder names the project)"
	},
	{
		pattern: "<project-path>/.agents/spec/",
		kind: "fixed",
		explanation: "a nested project's hoisted spec, at any depth"
	}
];
function parseAnchorsToml(text) {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text);
	if (!m) return [];
	const out = [];
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim());
	return out.filter((s) => s !== "");
}
function readCustomAnchors(root) {
	const file = join(root, ANCHORS_CONFIG);
	if (!existsSync(file)) return [];
	try {
		return parseAnchorsToml(readFileSync(file, "utf8"));
	} catch {
		return [];
	}
}
function serializeAnchors(patterns) {
	if (patterns.length === 0) return "anchors = []\n";
	return `anchors = [\n${patterns.map((p) => `  "${p}",`).join("\n")}\n]\n`;
}
function writeCustomAnchors(root, patterns) {
	const file = join(root, ANCHORS_CONFIG);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, serializeAnchors(patterns));
}
function isValidPattern(pattern) {
	const p = pattern.trim().replace(/\\/g, "/");
	if (p === "" || p.startsWith("/") || /(^|\/)\.\.(\/|$)/.test(p)) return false;
	const segs = p.replace(/^\/+|\/+$/g, "").split("/");
	if (segs.some((s) => s === "")) return false;
	return segs.every((s) => s === "*" || s === "**" || s === "<project>" || !/[<>]/.test(s));
}
function isFixedConvention(pattern) {
	const p = pattern.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
	return p === ".agents/spec" || p === ".agents/specs/<project>" || p === ".agents/specs/*" || p.endsWith("/.agents/spec") || p.endsWith("/.agents/specs/<project>");
}
function listAnchors(root) {
	const custom = readCustomAnchors(root).map((pattern) => ({
		pattern,
		kind: "custom",
		explanation: "a declared extra anchor"
	}));
	return [...FIXED_ANCHORS, ...custom];
}
function addAnchor(root, pattern) {
	const p = pattern.trim();
	if (isFixedConvention(p)) return {
		ok: false,
		reason: "that is a fixed convention — always scanned, never curated"
	};
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed anchor pattern"
	};
	const current = readCustomAnchors(root);
	if (current.includes(p)) return {
		ok: true,
		changed: false,
		anchors: current,
		message: "already present"
	};
	const next = [...current, p];
	writeCustomAnchors(root, next);
	return {
		ok: true,
		changed: true,
		anchors: next,
		message: `added ${p}`
	};
}
function removeAnchor(root, pattern) {
	const p = pattern.trim();
	const current = readCustomAnchors(root);
	if (!current.includes(p)) return {
		ok: true,
		changed: false,
		anchors: current,
		message: "nothing was removed"
	};
	const next = current.filter((a) => a !== p);
	writeCustomAnchors(root, next);
	return {
		ok: true,
		changed: true,
		anchors: next,
		message: `removed ${p}`
	};
}
function editAnchor(root, oldPattern, newPattern) {
	const oldP = oldPattern.trim();
	const newP = newPattern.trim();
	if (isFixedConvention(oldP)) return {
		ok: false,
		reason: "cannot edit a fixed convention"
	};
	if (!isValidPattern(newP)) return {
		ok: false,
		reason: "malformed replacement pattern"
	};
	if (isFixedConvention(newP)) return {
		ok: false,
		reason: "replacement is a fixed convention"
	};
	const current = readCustomAnchors(root);
	if (!current.includes(oldP)) return {
		ok: false,
		reason: `no such custom anchor: ${oldP}`
	};
	const next = current.map((a) => a === oldP ? newP : a);
	writeCustomAnchors(root, next);
	return {
		ok: true,
		changed: true,
		anchors: next,
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
	const generalized = [...rel.split("/").slice(0, -1), "<project>"].join("/");
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
function previewPattern(root, pattern) {
	const p = pattern.trim();
	if (!isValidPattern(p)) return {
		ok: false,
		reason: "malformed candidate pattern"
	};
	const segs = p.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
	let frontier = [{ dir: "" }];
	for (const seg of segs) {
		const next = [];
		if (seg === "**") {
			for (const node of frontier) for (const dir of collectDescendants(root, node.dir)) next.push({
				dir,
				capturedName: node.capturedName
			});
			frontier = next;
			continue;
		}
		const isGlob = seg === "*" || seg === "<project>";
		for (const node of frontier) if (isGlob) {
			let entries;
			try {
				entries = readdirSync(join(root, node.dir), { withFileTypes: true });
			} catch {
				continue;
			}
			for (const e of entries) {
				if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
				next.push({
					dir: node.dir ? `${node.dir}/${e.name}` : e.name,
					capturedName: seg === "<project>" ? e.name : node.capturedName
				});
			}
		} else next.push({
			dir: node.dir ? `${node.dir}/${seg}` : seg,
			capturedName: node.capturedName
		});
		frontier = next;
	}
	const matches = [];
	for (const node of frontier) {
		const rel = node.dir ? `${node.dir}/spec.md` : "spec.md";
		let status;
		try {
			status = /(^|\n)status:\s*["']?([a-z]+)/.exec(readFileSync(join(root, rel), "utf8"))?.[2];
		} catch {
			continue;
		}
		if (!status || !LIFECYCLE_STATUSES.has(status)) continue;
		matches.push({
			path: node.dir,
			name: node.capturedName ?? node.dir.split("/").pop() ?? node.dir
		});
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
		w("Spec anchors discovery scans (fixed conventions are always scanned):");
		for (const a of listAnchors(root)) w(`  [${a.kind}] ${a.pattern} — ${a.explanation}`);
		return 0;
	}
	if (argv.includes("--add")) {
		const r = addAnchor(root, flag(argv, "--add") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--remove")) {
		const r = removeAnchor(root, flag(argv, "--remove") ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--edit")) {
		const i = argv.indexOf("--edit");
		const r = editAnchor(root, argv[i + 1] ?? "", argv[i + 2] ?? "");
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--induce")) {
		const r = inducePatterns(root, flag(argv, "--induce") ?? "");
		if (!r.ok) {
			w(`unusable: ${r.reason}`);
			return 1;
		}
		w("Candidate anchor patterns:");
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
			w("This pattern matches no project.");
			return 0;
		}
		w("This pattern would discover:");
		for (const m of r.matches) w(`  ${m.path} (${m.name})`);
		return 0;
	}
	w("usage: manage-spec-anchors --list | --add <p> | --remove <p> | --edit <old> <new> | --induce <path> | --preview <p>");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { FIXED_ANCHORS, addAnchor, editAnchor, inducePatterns, isFixedConvention, isValidPattern, listAnchors, main, parseAnchorsToml, previewPattern, readCustomAnchors, removeAnchor, serializeAnchors };
