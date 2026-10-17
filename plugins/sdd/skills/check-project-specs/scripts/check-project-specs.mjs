#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-project-specs/check-project-specs.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/check-project-specs/scripts/check-project-specs.mjs","commands":{}};
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
if (process.argv[1] && false);
//#endregion
//#region src/sibling-engine.mts
/** The path of `<skill>/<engine>` for an engine running from the file `here`. */
function siblingEngine(here, skill, engine) {
	if (here.endsWith(".mts")) return join(dirname(here), "..", skill, `${engine}.mts`);
	return join(dirname(here), "..", "..", skill, "scripts", `${engine}.mjs`);
}
//#endregion
//#region src/check-project-specs/check-project-specs.mts
const HERE = fileURLToPath(import.meta.url);
const ENGINES = [
	{
		name: "check-spec-state",
		skill: "spec-gate",
		engine: "check-spec-state",
		args: (d) => ["--root", d]
	},
	{
		name: "check-suite",
		skill: "spec-gate",
		engine: "check-suite",
		args: (d) => ["--root", d]
	},
	{
		name: "concept-index",
		skill: "concept-index",
		engine: "concept-index",
		args: (d) => [
			"--spec-dir",
			d,
			"--check"
		]
	},
	{
		name: "check-spec-structure",
		skill: "check-spec-structure",
		engine: "check-spec-structure",
		args: (d) => [
			"--spec-dir",
			d,
			"--check"
		]
	},
	{
		name: "align-spec",
		skill: "align-spec",
		engine: "align-spec",
		args: (d) => [
			"--spec-dir",
			d,
			"--check"
		]
	},
	{
		name: "check-spec-references",
		skill: "check-spec-references",
		engine: "check-spec-references",
		args: (d) => ["--spec-dir", d]
	},
	{
		name: "check-scenario-overlap",
		skill: "check-scenario-overlap",
		engine: "check-scenario-overlap",
		args: (d) => [
			"--spec-dir",
			d,
			"--check"
		]
	}
];
/** Where an engine runs from: beside this one, in the same form (see sibling-engine.mts). */
function enginePath(e, here = HERE) {
	return siblingEngine(here, e.skill, e.engine);
}
/** Walk up from `start` for the workspace marker. Returns '' when not found. */
function findRepoRoot(start) {
	let dir = resolve(start);
	for (;;) {
		if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
		const up = dirname(dir);
		if (up === dir) return "";
		dir = up;
	}
}
/**
* Find the spec whose `project-path` names `projectRel` (a repo-relative dir).
* A project with no spec is `none` — not an error: the script is uniform across
* every workspace member, and some members are governed by no spec.
*/
function resolveSpecFor(specs, projectRel) {
	const hits = specs.filter((s) => s.projectPath !== "" && s.projectPath === projectRel);
	if (hits.length === 0) return { kind: "none" };
	if (hits.length > 1) return {
		kind: "ambiguous",
		specs: hits
	};
	return {
		kind: "resolved",
		spec: hits[0]
	};
}
/**
* Every spec must be reachable from a project that actually checks it. Without
* this, a spec silently goes unchecked the moment its project drops the script —
* which is exactly how the corpus ended up with one audited project out of ten.
*
* `specFiles` are the spec.md paths found at the recognized locations *before*
* the lifecycle-status filter; `specs` are the ones that survived it. A file in
* the first set and not the second is a spec whose status is not in the enum:
* discovery drops it, so every engine silently skips it and it is checked by
* nothing. That is a gap to escalate, not to exempt.
*/
function findCoverageGaps(root, specFiles, specs, readPkg) {
	const gaps = [];
	const recognized = new Set(specs.map((s) => s.path === "" ? "spec.md" : `${s.path}/spec.md`));
	for (const f of specFiles) if (!recognized.has(f)) gaps.push({
		spec: f,
		projectPath: "",
		reason: "unrecognized"
	});
	for (const s of specs) {
		if (s.projectPath === "") {
			gaps.push({
				spec: s.path,
				projectPath: "",
				reason: "no-project-path"
			});
			continue;
		}
		const pkg = readPkg(join(root, s.projectPath, "package.json"));
		if (!pkg) {
			gaps.push({
				spec: s.path,
				projectPath: s.projectPath,
				reason: "no-manifest"
			});
			continue;
		}
		if (!pkg.scripts?.["check:spec"]) gaps.push({
			spec: s.path,
			projectPath: s.projectPath,
			reason: "no-check-script"
		});
	}
	return gaps;
}
/**
* A spec.md sitting at a recognized location that discovery DROPPED (its status is not
* in the lifecycle enum) and that belongs to `projectRel` — by the `project-path` it
* declares, or by sitting inside the project (`<project>/.agents/spec/spec.md`, which
* survives frontmatter corruption because it is location-derived).
*
* Without this, a per-project run resolves such a spec to `none` and prints "no spec
* governs <project> — skipped" with exit 0: a status typo silently exempts the whole
* project from every engine. A spec that exists but cannot be classified is escalated,
* not exempted — the same call the corpus scope’s coverage guard makes.
*/
function findDroppedSpecFor(specFiles, specs, projectRel, readText) {
	const recognized = new Set(specs.map((s) => s.path === "" ? "spec.md" : `${s.path}/spec.md`));
	const out = [];
	for (const f of specFiles) {
		if (recognized.has(f)) continue;
		const text = readText(f);
		const fm = text === null ? null : parseFrontmatter(text);
		const dir = f.replace(/(^|\/)spec\.md$/, "");
		const nested = /^(.+)\/\.agents\/spec$/.exec(dir)?.[1] ?? "";
		if (fm?.projectPath === projectRel || nested === projectRel) out.push({
			file: f,
			status: fm?.status ?? ""
		});
	}
	return out;
}
const REASON_TEXT = {
	unrecognized: "sits at a spec location but its status is not in the lifecycle enum, so discovery drops it and nothing checks it",
	"no-project-path": "declares no project-path, so no project can be resolved to check it",
	"no-manifest": "names a project with no package.json, so it is not a workspace member",
	"no-check-script": "names a project that defines no `check:spec` script"
};
/** Read a file, or null when it cannot be read. */
function readTextOrNull(path) {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}
/**
* Run the whole engine set against one project-spec dir. Every engine runs even
* after one fails: a run that stops at the first failure reports one defect per
* invocation, and the corpus scope exists to report the tree's defects in one go.
*/
function runEngines(repoRoot, specDir) {
	let failed = 0;
	for (const e of ENGINES) try {
		execFileSync("node", [enginePath(e), ...e.args(specDir)], {
			cwd: repoRoot,
			stdio: "inherit"
		});
		process.stdout.write(`  ok   ${e.name}\n`);
	} catch {
		process.stderr.write(`  FAIL ${e.name}\n`);
		failed++;
	}
	return failed;
}
function checkCoverage(root) {
	const gaps = findCoverageGaps(root, discoverSpecFiles(root), collectSpecs(root), (p) => {
		try {
			return JSON.parse(readFileSync(p, "utf8"));
		} catch {
			return null;
		}
	});
	if (gaps.length === 0) {
		process.stdout.write("check-project-specs: every spec is checked by its project\n");
		return 0;
	}
	for (const g of gaps) process.stderr.write(`  ${g.spec} — ${REASON_TEXT[g.reason]}\n`);
	process.stderr.write(`check-project-specs: ${gaps.length} spec(s) no project checks\n`);
	return 1;
}
/** The flags the harness defines. Anything else is an error, never a default. */
const KNOWN_FLAGS = ["--corpus", "--project"];
/**
* The scope is chosen by a flag, so an unrecognized one must not fall through to a
* default. It used to: project scope at a repo root resolves no governing spec and
* exits 0, so a misspelled or retired flag reported success having checked nothing.
* That is how `--check-coverage` guarded commits and CI while running no engine.
*/
function unknownFlags(argv) {
	const out = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("-")) continue;
		if (a === "--project") {
			i++;
			continue;
		}
		if (!KNOWN_FLAGS.includes(a)) out.push(a);
	}
	return out;
}
function main(argv) {
	const unknown = unknownFlags(argv);
	if (unknown.length) {
		process.stderr.write(`check-project-specs: unrecognized flag(s) ${unknown.join(", ")} — the scope is ${KNOWN_FLAGS.join(" | ")} (or none, meaning the cwd's project)\n`);
		return 1;
	}
	if (argv.includes("--corpus") && argv.includes("--project")) {
		process.stderr.write("check-project-specs: --corpus and --project name contradictory scopes — pass one\n");
		return 1;
	}
	if (argv.includes("--corpus")) return checkCorpus();
	return checkProject(argv);
}
/**
* Corpus scope — the commit floor. Total by definition: every project-spec the
* corpus holds is checked, and a spec that cannot be classified fails rather than
* being skipped.
*
* It runs BOTH sub-checks because neither subsumes the other. The sweep iterates
* the specs discovery *recognizes*, so a spec whose lifecycle `status` is a typo is
* invisible to it — and would report clean. The coverage guard sees that file on
* disk and escalates it, but says nothing about whether the engines pass. Run either
* alone and a whole project-spec leaves the floor silently.
*/
function checkCorpus() {
	const root = findRepoRoot(process.cwd());
	if (!root) {
		process.stderr.write("check-project-specs: no pnpm-workspace.yaml found above the cwd\n");
		return 1;
	}
	let failed = checkCoverage(root) === 0 ? 0 : 1;
	const specs = collectSpecs(root);
	if (specs.length === 0) {
		process.stdout.write("check-project-specs: the corpus holds no project-spec\n");
		return failed;
	}
	for (const s of specs) {
		process.stdout.write(`check-project-specs: ${s.path}\n`);
		if (runEngines(root, join(root, s.path)) > 0) failed = 1;
	}
	return failed;
}
function checkProject(argv) {
	const projectArg = argv.includes("--project") ? argv[argv.indexOf("--project") + 1] : void 0;
	const projectDir = resolve(projectArg ?? process.cwd());
	const repoRoot = findRepoRoot(projectDir);
	if (!repoRoot) {
		process.stderr.write(`check-project-specs: no pnpm-workspace.yaml found above ${projectDir}\n`);
		return 1;
	}
	const projectRel = relative(repoRoot, projectDir) || ".";
	const specs = collectSpecs(repoRoot);
	const res = resolveSpecFor(specs, projectRel);
	if (res.kind === "none") {
		const dropped = findDroppedSpecFor(discoverSpecFiles(repoRoot), specs, projectRel, (rel) => readTextOrNull(join(repoRoot, rel)));
		for (const d of dropped) process.stderr.write(`check-project-specs: \`${d.file}\` sits at a spec location and governs \`${projectRel}\` but ` + (d.status === "" ? "declares no lifecycle status" : `its status \`${d.status}\` is not in the lifecycle enum`) + " (draft | approved | implemented | deprecated) — discovery drops it, so it is checked by nothing\n");
		if (dropped.length) return 1;
		process.stdout.write(`check-project-specs: no spec governs \`${projectRel}\` — skipped\n`);
		return 0;
	}
	if (res.kind === "ambiguous") {
		process.stderr.write(`check-project-specs: \`${projectRel}\` is claimed by ${res.specs.length} specs (${res.specs.map((s) => s.path).join(", ")}) — a project has exactly one spec\n`);
		return 1;
	}
	const specDir = join(repoRoot, res.spec.path);
	process.stdout.write(`check-project-specs: ${projectRel} -> ${res.spec.path}\n`);
	return runEngines(repoRoot, specDir) === 0 ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { ENGINES, KNOWN_FLAGS, enginePath, findCoverageGaps, findDroppedSpecFor, findRepoRoot, main, resolveSpecFor, unknownFlags };
