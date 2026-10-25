#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-plugin-manifests/check-plugin-manifests.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.0","entry":"skills/check-plugin-manifests/scripts/check-plugin-manifests.mjs","commands":{}};
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-plugin-manifests/check-plugin-manifests.mts
/**
* Directories that hold a manifest one level below the plugin root.
*
* This is a path-shape list, not a provenance one: `.plugin/` holds the **canonical** manifest and
* the other two hold its generated vendor copies, but all three sit one level down, so a pointer
* inside any of them resolves against the parent. Naming it for vendors would contradict the
* spec's own vocabulary and has already misled one reader.
*/
const MANIFEST_DIRS = [
	".plugin",
	".claude-plugin",
	".codex-plugin"
];
const MANIFEST_NAME = "plugin.json";
const SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git"]);
/**
* Every manifest at a conventional location under `root`, repo-relative and path-sorted.
*
* A manifest is a `plugin.json` either inside a vendor directory, or sitting beside a
* `package.json` (a package-root manifest). Sorted so a sweep's report order is deterministic.
* A symlink is included: it resolves to a real manifest, and a broken one must surface as
* unreadable rather than vanish from the sweep.
*/
/** Directory entries, or none where the directory cannot be read. */
function safeReaddir(dir) {
	try {
		return readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
}
function discoverManifests(root) {
	const found = [];
	const walk = (dir) => {
		for (const e of safeReaddir(dir)) {
			const full = join(dir, e.name);
			if (e.isDirectory()) {
				if (!SKIP_DIRS.has(e.name)) walk(full);
				continue;
			}
			if (e.name !== MANIFEST_NAME) continue;
			const parent = dirname(full);
			if (MANIFEST_DIRS.includes(parent.split(sep).pop() ?? "") || existsSync(join(parent, "package.json"))) found.push(full);
		}
	};
	walk(root);
	return found.map((f) => relative(root, f).split(sep).join("/")).sort();
}
/**
* The plugin root a manifest's pointers resolve against — NOT the manifest's own directory.
*
* A vendor manifest sits one level down, and its `./skills` still names the plugin's skills
* directory. A guard resolving relative to the file it just read reports every vendor manifest as
* entirely broken.
*/
function pluginRootOf(manifestRelPath) {
	const parts = manifestRelPath.split("/");
	const parentName = parts[parts.length - 2];
	const drop = parentName !== void 0 && MANIFEST_DIRS.includes(parentName) ? 2 : 1;
	return parts.slice(0, parts.length - drop).join("/");
}
/** Every `./`-prefixed string value in the manifest, paired with the key it sits under. */
function extractPointers(manifest) {
	const out = [];
	const visit = (value, key) => {
		if (typeof value === "string") {
			if (value.startsWith("./")) out.push({
				key,
				pointer: value
			});
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) visit(item, key);
			return;
		}
		if (value !== null && typeof value === "object") for (const [k, v] of Object.entries(value)) visit(v, k);
	};
	visit(manifest, "");
	return out;
}
/**
* The nearest `package.json` at or above the plugin root, and whether it publishes.
*
* A package publishes when it is not `private` AND declares a `files` allowlist. A `private`
* package ships no tarball, so its `files` constrains nothing. A package declaring no `files` at
* all ships everything, so there is no allowlist to be outside of — npm's own semantic, and
* inverting it manufactures a finding against every pointer in the package.
*/
function owningPackage(root, pluginRoot) {
	let dir = pluginRoot;
	for (;;) {
		const candidate = dir === "" ? "package.json" : `${dir}/package.json`;
		const abs = join(root, candidate);
		if (existsSync(abs)) try {
			const pkg = JSON.parse(readFileSync(abs, "utf8"));
			const files = Array.isArray(pkg.files) ? pkg.files.filter((f) => typeof f === "string") : null;
			const packs = pkg.private !== true;
			return {
				path: candidate,
				packs,
				publishes: packs && files !== null,
				files: files ?? []
			};
		} catch {
			return {
				path: candidate,
				packs: false,
				publishes: false,
				files: []
			};
		}
		if (dir === "") return null;
		dir = dir.split("/").slice(0, -1).join("/");
	}
}
/**
* Whether a `files` allowlist covers a pointer, compared on the leading path segment.
*
* Both sides are normalized past a leading `./`, because an allowlist may legitimately spell an
* entry either way and a pointer always carries the prefix — comparing them raw reports a shipped
* component as unpublished.
*
* A `!`-prefixed entry is an exclusion and needs no special case: its leading `!` is part of its
* first segment, so it can never equal a real segment and is never read as an inclusion.
*/
function filesCovers(files, pointer) {
	const head = (path) => path.replace(/^\.\//, "").split("/")[0];
	const segment = head(pointer);
	if (segment === void 0 || segment === "") return true;
	return files.some((entry) => {
		const h = head(entry);
		return h === "*" || h === "**" || h === segment;
	});
}
/** Whether a package that packs a tarball ships the package-relative path `./<rel>`. */
function ships(pkg, rel) {
	return pkg?.packs === true && (!pkg.publishes || filesCovers(pkg.files, `./${rel}`));
}
/** Every symbolic link at or below `abs` — the path itself included, links never followed. */
function findSymlinks(abs) {
	let stat;
	try {
		stat = lstatSync(abs);
	} catch {
		return [];
	}
	if (stat.isSymbolicLink()) return [abs];
	if (!stat.isDirectory()) return [];
	return safeReaddir(abs).filter((e) => !SKIP_DIRS.has(e.name)).flatMap((e) => findSymlinks(join(abs, e.name)));
}
function sweep(root, manifests) {
	const findings = [];
	const linksSeen = /* @__PURE__ */ new Set();
	const reportLinks = (rel, abs, key, pointer) => {
		for (const link of findSymlinks(abs)) {
			const linkRel = relative(root, link).split(sep).join("/");
			if (linksSeen.has(linkRel)) continue;
			linksSeen.add(linkRel);
			findings.push({
				kind: "symlink",
				manifest: rel,
				...key === void 0 ? {} : {
					key,
					pointer
				},
				detail: `${linkRel} is a symbolic link — the registry rejects a package that ships one`
			});
		}
	};
	for (const rel of manifests) {
		let parsed;
		try {
			parsed = JSON.parse(readFileSync(join(root, rel), "utf8"));
		} catch {
			findings.push({
				kind: "unreadable",
				manifest: rel,
				detail: "not readable as JSON"
			});
			continue;
		}
		const pluginRoot = pluginRootOf(rel);
		const pkg = owningPackage(root, pluginRoot);
		const pkgDir = pkg ? dirname(pkg.path) : "";
		const fromPkg = (path) => relative(join(root, pkgDir), join(root, path)).split(sep).join("/");
		if (ships(pkg, fromPkg(rel))) reportLinks(rel, join(root, rel));
		for (const { key, pointer } of extractPointers(parsed)) {
			const target = join(root, pluginRoot, pointer);
			if (!existsSync(target)) {
				findings.push({
					kind: "unresolved",
					manifest: rel,
					key,
					pointer,
					detail: "names no path on disk"
				});
				continue;
			}
			if (pkg?.publishes && !filesCovers(pkg.files, pointer)) {
				findings.push({
					kind: "unpublished",
					manifest: rel,
					key,
					pointer,
					detail: `declared but not published — ${pkg.path} files omits it`
				});
				continue;
			}
			if (ships(pkg, fromPkg(join(pluginRoot, pointer)))) reportLinks(rel, target, key, pointer);
		}
	}
	return findings;
}
function formatReport(manifests, findings) {
	if (manifests.length === 0) return "check-plugin-manifests: no plugin manifest found\n";
	if (findings.length === 0) return `check-plugin-manifests: ${manifests.length} manifest(s) OK\n`;
	return `${findings.map((f) => `  ${f.kind.padEnd(11)} ${f.manifest}${f.key ? ` [${f.key}] ${f.pointer}` : ""} — ${f.detail}`).join("\n")}\ncheck-plugin-manifests: ${findings.length} finding(s) across ${manifests.length} manifest(s)\n`;
}
function main(argv) {
	let root = ".";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--root") {
			const next = argv[++i];
			if (next === void 0) {
				process.stderr.write("check-plugin-manifests: --root needs a directory\n");
				return 1;
			}
			root = next;
			continue;
		}
		process.stderr.write(`check-plugin-manifests: unrecognized flag ${a}\n`);
		return 1;
	}
	const manifests = discoverManifests(root);
	const findings = sweep(root, manifests);
	process.stdout.write(formatReport(manifests, findings));
	return findings.length === 0 ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { discoverManifests, extractPointers, filesCovers, findSymlinks, formatReport, main, owningPackage, pluginRootOf, sweep };
