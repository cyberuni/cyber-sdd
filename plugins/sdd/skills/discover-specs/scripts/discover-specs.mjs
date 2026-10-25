#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/discover-specs/discover-specs.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.0","entry":"skills/discover-specs/scripts/discover-specs.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/discover-specs/discover-specs.mts
const LIFECYCLE_STATUSES = /* @__PURE__ */ new Set([
	"draft",
	"approved",
	"implemented",
	"deprecated"
]);
const ROOT_PROJECT_NAME = "repo";
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
/**
* A directory that is itself a checkout is a DIFFERENT repository's tree, not part of this corpus.
*
* A name blocklist cannot express this: it can only say "this is called X", never "this is a
* boundary". `SKIP_DIRS` already holds `.git`, so the walk skipped the METADATA directory while
* descending straight into the checkout that directory marks — one level off from where the guard
* was needed. Agent-harness worktree isolation checks this repo out inside itself, and the scan then
* found the whole corpus once per worktree: 38 spec files where 10 exist, and every corpus-wide
* guard silently auditing a tree nobody has.
*
* `.git` is a DIRECTORY in a clone and a FILE in a worktree or submodule, so both forms count.
*/
function isNestedCheckout(abs) {
	return existsSync(join(abs, ".git"));
}
const ANCHORS_CONFIG = ".agents/sdd/spec-anchors.toml";
function parseFrontmatter(text) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return null;
	const fm = { approval: {} };
	let gate = null;
	for (const raw of m[1].split("\n")) {
		const line = raw.replace(/\r$/, "");
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		const indent = line.length - line.trimStart().length;
		const [key, ...rest] = line.trim().split(":");
		const value = rest.join(":").trim();
		if (indent === 0) {
			gate = null;
			if (key === "status") fm.status = unquote(value);
			else if (key === "project-path") fm.projectPath = unquote(value);
			else if (key === "name") fm.name = unquote(value);
			else if (key === "approval") gate = null;
		} else if (indent === 2 && value === "" && insideApproval(m[1], line)) gate = key;
		else if (indent >= 4 && key === "verdict" && gate) fm.approval[gate] = unquote(value);
	}
	return fm;
}
function insideApproval(block, line) {
	const lines = block.split("\n");
	const idx = lines.indexOf(line);
	for (let i = idx - 1; i >= 0; i--) {
		const l = lines[i].replace(/\r$/, "");
		if (l.trim() === "" || l.trim().startsWith("#")) continue;
		if (l.length - l.trimStart().length === 0) return l.trim().replace(/:.*$/, "") === "approval";
	}
	return false;
}
function unquote(v) {
	return v.replace(/^["']|["']$/g, "");
}
function classifyLocation(relPath) {
	const p = relPath.replace(/\\/g, "/");
	if (p === ".agents/spec/spec.md") return {
		pattern: "root-single",
		locationDir: ""
	};
	const multi = /^\.agents\/specs\/([^/]+)\/spec\.md$/.exec(p);
	if (multi) return {
		pattern: "root-multi",
		locationDir: multi[1]
	};
	const nested = /^(.+)\/\.agents\/spec\/spec\.md$/.exec(p);
	if (nested) return {
		pattern: "nested",
		locationDir: nested[1]
	};
	return null;
}
function deriveName(loc, fm) {
	if (fm.name) return {
		name: fm.name,
		nameSource: "declared"
	};
	if (loc.pattern === "root-single") return {
		name: ROOT_PROJECT_NAME,
		nameSource: "derived"
	};
	if (loc.pattern === "root-multi") return {
		name: loc.locationDir,
		nameSource: "derived"
	};
	if (loc.pattern === "extra" && loc.capturedName) return {
		name: loc.capturedName,
		nameSource: "derived"
	};
	return {
		name: loc.locationDir.split("/").pop() ?? loc.locationDir,
		nameSource: "guessed"
	};
}
function discoverSpecFiles(root) {
	const found = [];
	const walk = (relDir) => {
		let entries;
		try {
			entries = readdirSync(join(root, relDir), { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
			const childRel = relDir ? `${relDir}/${e.name}` : e.name;
			if (isNestedCheckout(join(root, childRel))) continue;
			if (e.name === ".agents") {
				probeAgents(root, childRel, found);
				continue;
			}
			walk(childRel);
		}
	};
	walk("");
	return found;
}
function probeAgents(root, agentsRel, found) {
	const single = `${agentsRel}/spec/spec.md`;
	if (existsSync(join(root, single))) found.push(single);
	if (agentsRel === ".agents") {
		const specsDir = join(root, ".agents", "specs");
		let projects;
		try {
			projects = readdirSync(specsDir, { withFileTypes: true });
		} catch {
			projects = [];
		}
		for (const p of projects) {
			if (!p.isDirectory()) continue;
			const rel = `.agents/specs/${p.name}/spec.md`;
			if (existsSync(join(root, rel))) found.push(rel);
		}
	}
}
function parseAnchorsToml(text) {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text);
	if (!m) return [];
	const out = [];
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim());
	return out.filter((s) => s !== "");
}
function readAnchors(root) {
	const file = join(root, ANCHORS_CONFIG);
	if (!existsSync(file)) return [];
	try {
		return parseAnchorsToml(readFileSync(file, "utf8"));
	} catch {
		process.stderr.write(`discover-specs: ignoring unreadable ${ANCHORS_CONFIG}\n`);
		return [];
	}
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
		const childRel = startDir ? `${startDir}/${e.name}` : e.name;
		if (isNestedCheckout(join(root, childRel))) continue;
		out.push(...collectDescendants(root, childRel));
	}
	return out;
}
function expandAnchor(root, pattern) {
	const segs = pattern.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
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
				const childRel = node.dir ? `${node.dir}/${e.name}` : e.name;
				if (isNestedCheckout(join(root, childRel))) continue;
				next.push({
					dir: childRel,
					capturedName: seg === "<project>" ? e.name : node.capturedName
				});
			}
		} else next.push({
			dir: node.dir ? `${node.dir}/${seg}` : seg,
			capturedName: node.capturedName
		});
		frontier = next;
	}
	const out = [];
	for (const node of frontier) {
		const rel = node.dir ? `${node.dir}/spec.md` : "spec.md";
		if (existsSync(join(root, rel))) out.push({
			rel,
			capturedName: node.capturedName
		});
	}
	return out;
}
function recordFor(root, rel, loc) {
	let fm;
	try {
		fm = parseFrontmatter(readFileSync(join(root, rel), "utf8"));
	} catch {
		return null;
	}
	if (!fm?.status || !LIFECYCLE_STATUSES.has(fm.status)) return null;
	const { name, nameSource } = deriveName(loc, fm);
	return {
		path: rel.replace(/\/spec\.md$/, ""),
		name,
		nameSource,
		status: fm.status,
		projectPath: fm.projectPath ?? "",
		approvals: Object.entries(fm.approval).map(([gate, verdict]) => `${gate}:${verdict}`).join(";")
	};
}
function collectSpecs(root) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const rel of discoverSpecFiles(root)) {
		const loc = classifyLocation(rel);
		if (!loc) continue;
		const rec = recordFor(root, rel, loc);
		if (rec) {
			out.push(rec);
			seen.add(rel);
		}
	}
	for (const pattern of readAnchors(root)) for (const { rel, capturedName } of expandAnchor(root, pattern)) {
		if (seen.has(rel)) continue;
		const rec = recordFor(root, rel, {
			pattern: "extra",
			locationDir: rel.replace(/\/spec\.md$/, ""),
			capturedName
		});
		if (rec) {
			out.push(rec);
			seen.add(rel);
		}
	}
	return out.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function resolveByName(specs, name) {
	const want = name.trim().toLowerCase();
	const hits = specs.filter((s) => s.name.toLowerCase() === want);
	if (hits.length === 0) return { kind: "none" };
	if (hits.length === 1) return {
		kind: "match",
		spec: hits[0]
	};
	return {
		kind: "ambiguous",
		candidates: hits
	};
}
const COLUMNS = [
	"path",
	"name",
	"nameSource",
	"status",
	"projectPath",
	"approvals"
];
function toonField(v) {
	if (v === "" || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
function toToon(specs) {
	return [`specs[${specs.length}]{${COLUMNS.join(",")}}:`, ...specs.map((s) => `  ${COLUMNS.map((c) => toonField(s[c])).join(",")}`)].join("\n");
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] ?? "." : ".";
	const format = argv.includes("--format") ? argv[argv.indexOf("--format") + 1] : "toon";
	let specs = collectSpecs(root);
	if (argv.includes("--resolve")) {
		const name = argv[argv.indexOf("--resolve") + 1] ?? "";
		const r = resolveByName(specs, name);
		specs = r.kind === "match" ? [r.spec] : r.kind === "ambiguous" ? r.candidates : [];
	}
	const out = format === "json" ? JSON.stringify(specs, null, 2) : toToon(specs);
	process.stdout.write(`${out}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { LIFECYCLE_STATUSES, classifyLocation, collectSpecs, deriveName, discoverSpecFiles, expandAnchor, main, parseAnchorsToml, parseFrontmatter, readAnchors, resolveByName, toToon };
