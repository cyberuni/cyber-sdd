#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/blast-estimate/blast-estimate.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/blast-estimate/scripts/blast-estimate.mjs","commands":{}};
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
//#region src/sibling-engine.mts
/** The path of `<skill>/<engine>` for an engine running from the file `here`. */
function siblingEngine(here, skill, engine) {
	if (here.endsWith(".mts")) return join(dirname(here), "..", skill, `${engine}.mts`);
	return join(dirname(here), "..", "..", skill, "scripts", `${engine}.mjs`);
}
//#endregion
//#region src/vendor/gherkin-cli.mjs
var TokenType;
(function(TokenType) {
	TokenType[TokenType["None"] = 0] = "None";
	TokenType[TokenType["EOF"] = 1] = "EOF";
	TokenType[TokenType["Empty"] = 2] = "Empty";
	TokenType[TokenType["Comment"] = 3] = "Comment";
	TokenType[TokenType["TagLine"] = 4] = "TagLine";
	TokenType[TokenType["FeatureLine"] = 5] = "FeatureLine";
	TokenType[TokenType["RuleLine"] = 6] = "RuleLine";
	TokenType[TokenType["BackgroundLine"] = 7] = "BackgroundLine";
	TokenType[TokenType["ScenarioLine"] = 8] = "ScenarioLine";
	TokenType[TokenType["ExamplesLine"] = 9] = "ExamplesLine";
	TokenType[TokenType["StepLine"] = 10] = "StepLine";
	TokenType[TokenType["DocStringSeparator"] = 11] = "DocStringSeparator";
	TokenType[TokenType["TableRow"] = 12] = "TableRow";
	TokenType[TokenType["Language"] = 13] = "Language";
	TokenType[TokenType["Other"] = 14] = "Other";
})(TokenType || (TokenType = {}));
var RuleType;
(function(RuleType) {
	RuleType[RuleType["None"] = 0] = "None";
	RuleType[RuleType["_EOF"] = 1] = "_EOF";
	RuleType[RuleType["_Empty"] = 2] = "_Empty";
	RuleType[RuleType["_Comment"] = 3] = "_Comment";
	RuleType[RuleType["_TagLine"] = 4] = "_TagLine";
	RuleType[RuleType["_FeatureLine"] = 5] = "_FeatureLine";
	RuleType[RuleType["_RuleLine"] = 6] = "_RuleLine";
	RuleType[RuleType["_BackgroundLine"] = 7] = "_BackgroundLine";
	RuleType[RuleType["_ScenarioLine"] = 8] = "_ScenarioLine";
	RuleType[RuleType["_ExamplesLine"] = 9] = "_ExamplesLine";
	RuleType[RuleType["_StepLine"] = 10] = "_StepLine";
	RuleType[RuleType["_DocStringSeparator"] = 11] = "_DocStringSeparator";
	RuleType[RuleType["_TableRow"] = 12] = "_TableRow";
	RuleType[RuleType["_Language"] = 13] = "_Language";
	RuleType[RuleType["_Other"] = 14] = "_Other";
	RuleType[RuleType["GherkinDocument"] = 15] = "GherkinDocument";
	RuleType[RuleType["Feature"] = 16] = "Feature";
	RuleType[RuleType["FeatureHeader"] = 17] = "FeatureHeader";
	RuleType[RuleType["Rule"] = 18] = "Rule";
	RuleType[RuleType["RuleHeader"] = 19] = "RuleHeader";
	RuleType[RuleType["Background"] = 20] = "Background";
	RuleType[RuleType["ScenarioDefinition"] = 21] = "ScenarioDefinition";
	RuleType[RuleType["Scenario"] = 22] = "Scenario";
	RuleType[RuleType["ExamplesDefinition"] = 23] = "ExamplesDefinition";
	RuleType[RuleType["Examples"] = 24] = "Examples";
	RuleType[RuleType["ExamplesTable"] = 25] = "ExamplesTable";
	RuleType[RuleType["Step"] = 26] = "Step";
	RuleType[RuleType["StepArg"] = 27] = "StepArg";
	RuleType[RuleType["DataTable"] = 28] = "DataTable";
	RuleType[RuleType["DocString"] = 29] = "DocString";
	RuleType[RuleType["Tags"] = 30] = "Tags";
	RuleType[RuleType["DescriptionHelper"] = 31] = "DescriptionHelper";
	RuleType[RuleType["Description"] = 32] = "Description";
})(RuleType || (RuleType = {}));
var AttachmentContentEncoding;
(function(AttachmentContentEncoding) {
	AttachmentContentEncoding["IDENTITY"] = "IDENTITY";
	AttachmentContentEncoding["BASE64"] = "BASE64";
})(AttachmentContentEncoding || (AttachmentContentEncoding = {}));
var HookType;
(function(HookType) {
	HookType["BEFORE_TEST_RUN"] = "BEFORE_TEST_RUN";
	HookType["AFTER_TEST_RUN"] = "AFTER_TEST_RUN";
	HookType["BEFORE_TEST_CASE"] = "BEFORE_TEST_CASE";
	HookType["AFTER_TEST_CASE"] = "AFTER_TEST_CASE";
	HookType["BEFORE_TEST_STEP"] = "BEFORE_TEST_STEP";
	HookType["AFTER_TEST_STEP"] = "AFTER_TEST_STEP";
})(HookType || (HookType = {}));
var PickleStepType;
(function(PickleStepType) {
	PickleStepType["UNKNOWN"] = "Unknown";
	PickleStepType["CONTEXT"] = "Context";
	PickleStepType["ACTION"] = "Action";
	PickleStepType["OUTCOME"] = "Outcome";
})(PickleStepType || (PickleStepType = {}));
var SourceMediaType;
(function(SourceMediaType) {
	SourceMediaType["TEXT_X_CUCUMBER_GHERKIN_PLAIN"] = "text/x.cucumber.gherkin+plain";
	SourceMediaType["TEXT_X_CUCUMBER_GHERKIN_MARKDOWN"] = "text/x.cucumber.gherkin+markdown";
})(SourceMediaType || (SourceMediaType = {}));
var StepDefinitionPatternType;
(function(StepDefinitionPatternType) {
	StepDefinitionPatternType["CUCUMBER_EXPRESSION"] = "CUCUMBER_EXPRESSION";
	StepDefinitionPatternType["REGULAR_EXPRESSION"] = "REGULAR_EXPRESSION";
})(StepDefinitionPatternType || (StepDefinitionPatternType = {}));
var StepKeywordType;
(function(StepKeywordType) {
	StepKeywordType["UNKNOWN"] = "Unknown";
	StepKeywordType["CONTEXT"] = "Context";
	StepKeywordType["ACTION"] = "Action";
	StepKeywordType["OUTCOME"] = "Outcome";
	StepKeywordType["CONJUNCTION"] = "Conjunction";
})(StepKeywordType || (StepKeywordType = {}));
var TestStepResultStatus;
(function(TestStepResultStatus) {
	TestStepResultStatus["UNKNOWN"] = "UNKNOWN";
	TestStepResultStatus["PASSED"] = "PASSED";
	TestStepResultStatus["SKIPPED"] = "SKIPPED";
	TestStepResultStatus["PENDING"] = "PENDING";
	TestStepResultStatus["UNDEFINED"] = "UNDEFINED";
	TestStepResultStatus["AMBIGUOUS"] = "AMBIGUOUS";
	TestStepResultStatus["FAILED"] = "FAILED";
})(TestStepResultStatus || (TestStepResultStatus = {}));
var KeywordPrefix;
(function(KeywordPrefix) {
	KeywordPrefix["BULLET"] = "^(\\s*[*+-]\\s*)";
	KeywordPrefix["HEADER"] = "^(#{1,6}\\s)";
})(KeywordPrefix || (KeywordPrefix = {}));
StepKeywordType.UNKNOWN, PickleStepType.UNKNOWN, StepKeywordType.CONTEXT, PickleStepType.CONTEXT, StepKeywordType.ACTION, PickleStepType.ACTION, StepKeywordType.OUTCOME, PickleStepType.OUTCOME, StepKeywordType.CONJUNCTION;
//#endregion
//#region src/touch-set-correction/touch-set-correction.mts
function stripTrailingSlash$1(root) {
	return root.endsWith("/") ? root.slice(0, -1) : root;
}
/**
* fileToNode — capability-first work-area recovery. For each project's root, if `path` sits under
* `root/`, the CAPABILITY is the first path segment after the matched root; the node is
* `project/capability`. Matches the LONGEST matching root prefix across every project + root (so a
* deeper root like `plugins/sdd/skills` wins over a shallower `plugins/sdd`, when both are
* declared). Returns null when no root matches — the file is unmapped.
*/
function fileToNode(path, projects) {
	let best = null;
	for (const p of projects) for (const rawRoot of p.roots) {
		const root = stripTrailingSlash$1(rawRoot);
		const prefix = root === "" ? "" : `${root}/`;
		if (prefix === "" || !path.startsWith(prefix)) continue;
		const capability = path.slice(prefix.length).split("/")[0];
		if (!capability) continue;
		if (best === null || prefix.length > best.rootLen) best = {
			project: p.project,
			capability,
			rootLen: prefix.length
		};
	}
	return best ? `${best.project}/${best.capability}` : null;
}
const HERE = fileURLToPath(import.meta.url);
siblingEngine(HERE, "resolve-governances", "resolve-governances");
const DISCOVER_SPECS_PATH = siblingEngine(HERE, "discover-specs", "discover-specs");
/** Best-effort project-layout discovery via `discover-specs`: each project's spec-path plus an
*  impl-root convention (`plugins/<p>` → also `plugins/<p>/skills`; `packages/<p>` → also
*  `packages/<p>/src`; else the project-path itself). `--layout` (CLI) overrides this entirely. On
*  any failure returns []. */
function discoverLayouts(root, cwd) {
	try {
		const out = execFileSync("node", [
			DISCOVER_SPECS_PATH,
			"--root",
			root,
			"--format",
			"json"
		], {
			encoding: "utf8",
			cwd,
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		});
		return JSON.parse(out).map((s) => {
			const roots = [s.path];
			const projectPath = s.projectPath ?? "";
			const pluginsMatch = /^plugins\/([^/]+)$/.exec(projectPath);
			const packagesMatch = /^packages\/([^/]+)$/.exec(projectPath);
			if (pluginsMatch) roots.push(`plugins/${pluginsMatch[1]}/skills`);
			else if (packagesMatch) roots.push(`packages/${packagesMatch[1]}/src`);
			else if (projectPath) roots.push(projectPath);
			return {
				project: s.name,
				roots
			};
		});
	} catch {
		return [];
	}
}
if (process.argv[1] && false);
//#endregion
//#region src/blast-estimate/blast-estimate.mts
const SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
const SENSITIVE_PATHS_FILE = ".agents/sdd/sensitive-paths.toml";
/** Every repo-relative file path under `dir` (recursively), skipping build/vendor noise. Paths are
*  made relative with `path.relative`, never string-sliced: `join('.', x)` normalizes the `./` away,
*  so slicing by `root.length` silently corrupts every path under a RELATIVE root (`--root .`, the
*  CLI's default) while working fine under an absolute one. */
function walkFiles(dir, root, out) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walkFiles(full, root, out);
		else out.push(relative(root, full).replace(/\\/g, "/"));
	}
}
/**
* discoverWorkAreas — the corpus's work areas, grouped by node id, over the DECLARED layouts. Walks
* every root of every project, maps each file through touch-set-correction's pure `fileToNode`, and
* groups by the node it names. Because a node's roots include BOTH its spec root and its impl root,
* one node's file set spans both trees — which is exactly what makes fan-in measure real dependency
* rather than spec-prose cross-reference. A file that maps to no node (`fileToNode` returns null —
* the existing "unmapped" concept) is dropped from the area map, never invented into an atom.
*
* Values are repo-relative paths; `root` is the repo root they are resolved against.
*/
function discoverWorkAreas(layouts, root) {
	const byNode = /* @__PURE__ */ new Map();
	const seen = /* @__PURE__ */ new Set();
	for (const layout of layouts) for (const rawRoot of layout.roots) {
		const rel = rawRoot.replace(/\/+$/, "");
		const files = [];
		walkFiles(join(root, rel), root, files);
		for (const path of files) {
			if (seen.has(path)) continue;
			seen.add(path);
			const node = fileToNode(path, layouts);
			if (node === null) continue;
			const bucket = byNode.get(node);
			if (bucket) bucket.push(path);
			else byNode.set(node, [path]);
		}
	}
	return byNode;
}
function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Left boundary: a reference must not start mid-token. */
const LB = "(?:^|[^\\w/:.-])";
function stripTrailingSlash(s) {
	return s.replace(/\/+$/, "");
}
/** The reference forms that name `nodeId` unambiguously from ANYWHERE (each is project-qualified):
*  the bare id (`sdd/spec-gate`), the skill-style ref (`sdd:spec-gate`), and a path under any of the
*  project's declared roots, at any nesting depth (`plugins/sdd/skills/spec-gate/`,
*  `.agents/specs/sdd/authoring/spec-gate/`). */
function globalReferencePattern(project, capability, roots) {
	const alts = [`${LB}${escapeRegExp(`${project}/${capability}`)}(?![\\w-])`, `${LB}${escapeRegExp(`${project}:${capability}`)}(?![\\w-])`];
	for (const root of roots) alts.push(`${escapeRegExp(stripTrailingSlash(root))}/(?:[\\w.-]+/)*${escapeRegExp(capability)}/`);
	return new RegExp(alts.join("|"));
}
/** The relative-link form (`../spec-gate/`, `../../authoring/spec-gate/`) — a sibling-node link. It
*  carries no project, so it is only counted from a file in the SAME project; otherwise two projects
*  sharing a capability name (`manage`, `design`) would cross-credit each other's fan-in. */
function relativeReferencePattern(capability) {
	return new RegExp(`(?:\\.\\./)+(?:[\\w.-]+/)*${escapeRegExp(capability)}/`);
}
function projectRoots(project, layouts) {
	return layouts.filter((l) => l.project === project).flatMap((l) => l.roots);
}
/**
* computeFanInMap — centrality for the requested areas: area A's fan-in is the number of OTHER areas
* holding at least one file that REFERENCES A in any of the forms the corpus actually uses (see
* `globalReferencePattern` / `relativeReferencePattern`). Because a node's file set spans its spec
* AND impl roots, a reference from an implementation file counts exactly as spec prose does — fan-in
* measures the project's real lean on an area. An area's own files never count toward its own fan-in.
*
* `targets` defaults to every known area; passing only the areas actually being scored keeps the CLI
* cheap (a one-area touch-set costs 1 pattern × N files instead of 229 × N). Each file is read at
* most once, and an owner already credited for a target is skipped.
*/
function computeFanInMap(byNode, root, layouts, targets) {
	const ids = targets ?? [...byNode.keys()];
	const specs = ids.map((id) => {
		const slash = id.indexOf("/");
		const project = id.slice(0, slash);
		const capability = id.slice(slash + 1);
		return {
			id,
			project,
			global: globalReferencePattern(project, capability, projectRoots(project, layouts)),
			relative: relativeReferencePattern(capability)
		};
	});
	const referencers = new Map(ids.map((id) => [id, /* @__PURE__ */ new Set()]));
	for (const [owner, files] of byNode) {
		const ownerProject = projectOf(owner);
		for (const rel of files) {
			let text;
			try {
				text = readFileSync(join(root, rel), "utf8");
			} catch {
				continue;
			}
			for (const spec of specs) {
				if (spec.id === owner) continue;
				const seen = referencers.get(spec.id);
				if (seen?.has(owner)) continue;
				if (spec.global.test(text) || ownerProject === spec.project && spec.relative.test(text)) seen?.add(owner);
			}
		}
	}
	return new Map(ids.map((id) => [id, referencers.get(id)?.size ?? 0]));
}
/**
* Parses the opt-in `.agents/sdd/sensitive-paths.toml`: a `sensitive = [ "id", ... ]` string array.
*
* LINE-anchored and lenient, matching manage-spec-anchors' `anchors = [ … ]` parser byte for byte in
* shape — a leading comment, a trailing comment, or a neighbouring key are ordinary TOML and must
* parse. An earlier whole-file-anchored regex rejected all three, so a perfectly valid file that
* marked an area computed no level at all.
*
* An EMPTY file is `[]` (a real "nothing marked" declaration). A file with no `sensitive` array at
* all throws — that is genuinely malformed, and an unreadable marking is not evidence of no
* markings.
*/
function parseSensitivePaths(text) {
	if (text.trim() === "") return [];
	const m = /(^|\n)\s*sensitive\s*=\s*\[([\s\S]*?)\]/.exec(text);
	if (!m) throw new Error("expected a `sensitive = [...]` array");
	const out = [];
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim());
	return out.filter((s) => s !== "");
}
/** Reads the opt-in sensitive-paths file. **Absent** (ENOENT) = `{ ok: true, marked: [] }` — no area
*  is sensitive, and that is NOT an error. Anything else — present-but-unparseable, unreadable
*  (permissions), or not a regular file — = `{ ok: false, error }`, and the caller computes no level.
*
*  ONLY ENOENT is benign. A bare `catch` here would swallow EACCES and a directory-at-the-path into
*  "no markings", which fails in the DANGEROUS direction: the estimate silently UNDER-calls blast on
*  exactly the areas a project took the trouble to mark. A read that cannot classify must fail loud,
*  never default to the safe-looking answer — the same duty the absent-vs-unparseable scenarios draw:
*  an unreadable marking is not evidence of no markings. */
function readSensitivePaths(corpusRoot) {
	const file = join(corpusRoot, SENSITIVE_PATHS_FILE);
	let text;
	try {
		if (!statSync(file).isFile()) return {
			ok: false,
			error: `${SENSITIVE_PATHS_FILE} is not a regular file`
		};
		text = readFileSync(file, "utf8");
	} catch (err) {
		if (err.code === "ENOENT") return {
			ok: true,
			marked: []
		};
		return {
			ok: false,
			error: `${SENSITIVE_PATHS_FILE} is unreadable: ${err.message}`
		};
	}
	try {
		return {
			ok: true,
			marked: parseSensitivePaths(text)
		};
	} catch (err) {
		return {
			ok: false,
			error: `${SENSITIVE_PATHS_FILE} is unreadable: ${err.message}`
		};
	}
}
function countScore(n) {
	if (n <= 1) return 0;
	if (n <= 3) return 1;
	return 3;
}
const COVERAGE_SCORE = 3;
function centralityScore(fanIn) {
	if (fanIn <= 0) return 0;
	if (fanIn <= 2) return 1;
	if (fanIn <= 6) return 2;
	return 3;
}
const SENSITIVITY_SCORE = 2;
function levelFromScore(score) {
	if (score >= 3) return "high";
	if (score >= 1) return "medium";
	return "low";
}
/** The project a work area belongs to — the first segment of its `project/capability` id. */
function projectOf(nodeId) {
	return nodeId.split("/")[0];
}
/**
* projectsCoveredEntirely — the touched projects whose EVERY work area is in the touch-set, among
* projects holding >= 2 work areas. Coverage is relative reach: it asks what fraction of a project
* is disturbed, where `count` only asks how many areas in absolute terms. A project with a single
* work area never qualifies (see the guard note above).
*
* "Every work area of its project" means every area the LAYOUTS declare — `byNode` is the discovered
* area map keyed by node id, so a project's area set is its nodes across all of its declared roots
* (spec + impl), not whatever a directory walk happened to find.
*/
function projectsCoveredEntirely(resolved, byNode) {
	const areasByProject = /* @__PURE__ */ new Map();
	for (const node of byNode.keys()) {
		const p = projectOf(node);
		const areas = areasByProject.get(p);
		if (areas) areas.push(node);
		else areasByProject.set(p, [node]);
	}
	const resolvedSet = new Set(resolved);
	const covered = [];
	for (const project of new Set(resolved.map(projectOf))) {
		const areas = areasByProject.get(project) ?? [];
		if (areas.length < 2) continue;
		if (areas.every((a) => resolvedSet.has(a))) covered.push(project);
	}
	return covered.sort();
}
/** The pure scoring step, once `count`/`maxFanIn`/`sensitiveAreas`/`projectWide` are known. Exported
*  so the ordering-property scenarios (hub-vs-leaf, marked-vs-unmarked) can be driven directly. */
function scoreBlast(count, maxFanIn, sensitiveAreas, projectWide = []) {
	return {
		level: levelFromScore(Math.max(countScore(count), projectWide.length > 0 ? COVERAGE_SCORE : 0) + centralityScore(maxFanIn) + (sensitiveAreas.length > 0 ? SENSITIVITY_SCORE : 0)),
		reasons: {
			count,
			maxFanIn,
			sensitiveAreas,
			projectWide
		}
	};
}
const ORDER = [
	"low",
	"medium",
	"high"
];
/** Lines the computed level up against the hand-typed declared one. An absent or `unknown` declared
*  blast is not an error — it is `no-declared`, and the computed level still stands on its own. */
function lineUp(computed, declared) {
	if (declared === void 0 || declared === "unknown") return {
		outcome: "no-declared",
		computed
	};
	const di = ORDER.indexOf(declared);
	const ci = ORDER.indexOf(computed);
	if (di === ci) return {
		outcome: "agrees",
		computed,
		declared
	};
	if (di < ci) return {
		outcome: "under-called",
		computed,
		declared
	};
	return {
		outcome: "over-called",
		computed,
		declared
	};
}
/**
* estimateBlast — the whole derivation, over INJECTED layouts. Discovers the corpus's work areas by
* mapping every file under every declared root through touch-set-correction's pure `fileToNode`,
* resolves the touch-set against those areas (unresolved areas are surfaced, never dropped), reads
* the opt-in sensitive-paths file (fails loud on a malformed one — computed/reasons/lineUp all come
* back null, `error` names why), and — when at least one area resolved — scores
* breadth × centrality × sensitivity and lines the result up against `opts.declared`. A touch-set
* that resolves to zero known areas (including the empty touch-set) computes `unknown`: nothing
* touched is not evidence of low reach.
*
* Layouts are INJECTED rather than discovered here: `fileToNode` is pure, so tests construct layouts
* as fixtures over a constructed corpus (the frozen suite's "never the live corpus" preamble holds),
* while the CLI sources them from `discoverLayouts`.
*/
function estimateBlast(touchSet, layouts, opts = {}) {
	const root = opts.root ?? ".";
	const byNode = discoverWorkAreas(layouts, root);
	const known = new Set(byNode.keys());
	const unique = [...new Set(touchSet)];
	const resolved = unique.filter((a) => known.has(a));
	const unresolved = unique.filter((a) => !known.has(a));
	const sensitive = readSensitivePaths(root);
	if (!sensitive.ok) return {
		touchSet,
		resolved,
		unresolved,
		computed: null,
		reasons: null,
		lineUp: null,
		error: sensitive.error
	};
	if (resolved.length === 0) return {
		touchSet,
		resolved,
		unresolved,
		computed: "unknown",
		reasons: {
			count: 0,
			maxFanIn: 0,
			sensitiveAreas: [],
			projectWide: []
		},
		lineUp: null
	};
	const markedSet = new Set(sensitive.marked);
	const fanInMap = computeFanInMap(byNode, root, layouts, resolved);
	const maxFanIn = Math.max(...resolved.map((a) => fanInMap.get(a) ?? 0));
	const sensitiveAreas = resolved.filter((a) => markedSet.has(a));
	const projectWide = projectsCoveredEntirely(resolved, byNode);
	const { level, reasons } = scoreBlast(resolved.length, maxFanIn, sensitiveAreas, projectWide);
	return {
		touchSet,
		resolved,
		unresolved,
		computed: level,
		reasons,
		lineUp: lineUp(level, opts.declared)
	};
}
function toonQuote(v) {
	if (v === "" || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
function renderResultToon(r) {
	if (r.error) return [`blast-estimate: error="${r.error}"`, `unresolved[${r.unresolved.length}]: ${r.unresolved.map(toonQuote).join(";")}`].join("\n");
	const lines = [];
	const lu = r.lineUp;
	const lineUpPart = lu ? lu.outcome === "no-declared" ? "lineup=no-declared" : `lineup=${lu.outcome}(declared=${lu.declared})` : "lineup=n/a";
	lines.push(`blast-estimate: computed=${r.computed} ${lineUpPart}`);
	if (r.reasons) lines.push(`reasons: count=${r.reasons.count} maxFanIn=${r.reasons.maxFanIn} sensitiveAreas=[${r.reasons.sensitiveAreas.join(";")}] projectWide=[${r.reasons.projectWide.join(";")}]`);
	lines.push(`resolved[${r.resolved.length}]: ${r.resolved.map(toonQuote).join(";")}`);
	lines.push(`unresolved[${r.unresolved.length}]: ${r.unresolved.map(toonQuote).join(";")}`);
	return lines.join("\n");
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function allFlags(argv, name) {
	const out = [];
	for (let i = 0; i < argv.length; i++) if (argv[i] === name && argv[i + 1] !== void 0) out.push(argv[i + 1]);
	return out;
}
function splitCsv(v) {
	if (v === void 0 || v === "") return [];
	return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
/** Parses one `--layout '<project>:<root1>,<root2>'` flag value into a ProjectLayout (the same shape
*  and flag touch-set-correction accepts, so the two tools take identical layout overrides). */
function parseLayoutFlag(value) {
	const idx = value.indexOf(":");
	if (idx === -1) return null;
	const project = value.slice(0, idx).trim();
	const roots = splitCsv(value.slice(idx + 1));
	if (project === "" || roots.length === 0) return null;
	return {
		project,
		roots
	};
}
/** The legal `--declared` values, exactly. Returns `null` for anything else so the CLI can fail loud
*  rather than let an unranked value masquerade as "below everything". Case-sensitive on purpose: the
*  store writes these lowercase, and quietly accepting `High` would invite a second spelling. */
function parseDeclared(raw) {
	return raw === "low" || raw === "medium" || raw === "high" || raw === "unknown" ? raw : null;
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const touchSet = splitCsv(flag(argv, "--touch-set"));
	const declaredRaw = flag(argv, "--declared");
	const declared = declaredRaw === void 0 ? void 0 : parseDeclared(declaredRaw);
	if (declared === null) {
		process.stderr.write(`blast-estimate: --declared must be one of low, medium, high, unknown (got "${declaredRaw}")\n`);
		return 1;
	}
	const format = flag(argv, "--format") === "json" ? "json" : "toon";
	const layoutFlags = allFlags(argv, "--layout");
	const result = estimateBlast(touchSet, layoutFlags.length > 0 ? layoutFlags.map(parseLayoutFlag).filter((l) => l !== null) : discoverLayouts(root, root), {
		root,
		declared
	});
	process.stdout.write(`${format === "json" ? JSON.stringify(result, null, 2) : renderResultToon(result)}\n`);
	return result.error ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { computeFanInMap, discoverWorkAreas, estimateBlast, levelFromScore, lineUp, main, parseDeclared, parseLayoutFlag, parseSensitivePaths, projectsCoveredEntirely, readSensitivePaths, renderResultToon, scoreBlast };
