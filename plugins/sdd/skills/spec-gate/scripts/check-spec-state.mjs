#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/spec-gate/check-spec-state.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.0","entry":"skills/spec-gate/scripts/check-spec-state.mjs","commands":{}};
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/spec-gate/check-spec-state.mts
const LIFECYCLE_STATUSES = [
	"draft",
	"approved",
	"implemented",
	"deprecated"
];
const GATES = ["spec", "impl"];
const VERDICTS = [
	"approve",
	"pause",
	"reject"
];
const SPEC_TYPES = ["reference", "behavioral"];
const NODE_FORBIDDEN_FIELDS = [
	"status",
	"project-path",
	"approval",
	"produced-by",
	"aligned",
	"spec-layout",
	"leash"
];
function frontmatter(text) {
	const m = /^---\n([\s\S]*?)\n---/.exec(text);
	return m ? m[1].split("\n") : [];
}
function prose(text) {
	return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}
function parseSpecState(text) {
	const lines = frontmatter(text);
	let status = "";
	let projectPath = null;
	let approval = null;
	for (let i = 0; i < lines.length; i++) {
		const s = /^status:\s*(.+)$/.exec(lines[i]);
		if (s) {
			status = s[1].trim().replace(/^["']|["']$/g, "");
			continue;
		}
		const p = /^project-path:\s*(.+)$/.exec(lines[i]);
		if (p) {
			projectPath = p[1].trim().replace(/^["']|["']$/g, "");
			continue;
		}
		const ap = /^approval:\s*(.*)$/.exec(lines[i]);
		if (ap) {
			approval = {};
			if (ap[1].trim() && ap[1].trim() !== "{}") continue;
			let gate = null;
			for (let j = i + 1; j < lines.length; j++) {
				if (!/^\s/.test(lines[j])) break;
				const g = /^ {2}(\w+):\s*$/.exec(lines[j]);
				if (g) {
					gate = g[1];
					approval[gate] = { hasWhy: false };
					continue;
				}
				if (!gate) continue;
				const verdict = /^ {4}verdict:\s*(.+)$/.exec(lines[j]);
				if (verdict) approval[gate].verdict = verdict[1].trim().replace(/^["']|["']$/g, "");
				const by = /^ {4}by:\s*(.+)$/.exec(lines[j]);
				if (by) approval[gate].by = by[1].trim().replace(/^["']|["']$/g, "");
				if (/^ {4}why:/.test(lines[j])) approval[gate].hasWhy = true;
			}
		}
	}
	const markerCount = (prose(text).match(/<!--\s*open:/g) ?? []).length;
	return {
		status,
		projectPath,
		markerCount,
		approval
	};
}
function checkSpec(slug, state) {
	const { status, markerCount, approval } = state;
	const v = [];
	const tag = (msg) => v.push(`${slug}: ${msg}`);
	if (!LIFECYCLE_STATUSES.includes(status)) tag(status === "" ? `no lifecycle status in frontmatter — a spec.md must declare status (${LIFECYCLE_STATUSES.join(" | ")}), and one that does not is checked by nothing` : `status "${status}" is not in the lifecycle enum (${LIFECYCLE_STATUSES.join(" | ")}) — discovery drops it, so it is checked by nothing`);
	if ((status === "approved" || status === "implemented") && markerCount > 0) tag(`illegal state — ${markerCount} open marker(s) but status is ${status} (markers block the gate)`);
	if (approval) for (const [gate, entry] of Object.entries(approval)) {
		if (!GATES.includes(gate)) tag(`approval has unknown gate "${gate}" (expected spec | impl)`);
		if (entry.verdict && !VERDICTS.includes(entry.verdict)) tag(`approval.${gate} has unknown verdict "${entry.verdict}" (expected approve | pause | reject)`);
		if (entry.verdict === "pause" && entry.by) tag(`approval.${gate} is a pause but carries by — a pause is always the agent's act and omits by`);
		if (entry.verdict === "approve" && !entry.by) tag(`approval.${gate} is an approve with no by — an approve must record its approver`);
		if (entry.by === "agent" && !entry.hasWhy) tag(`approval.${gate} is by:agent but has no why block (a self-assertion must record its derivation)`);
		const passed = gate === "spec" && (status === "approved" || status === "implemented") || gate === "impl" && status === "implemented";
		if (entry.verdict === "pause" && passed) tag(`approval.${gate} is a pause but the ${gate} gate is already passed (status ${status})`);
	}
	if ((status === "approved" || status === "implemented") && !(approval?.spec?.verdict === "approve" && approval?.spec?.by)) tag(`status is ${status} but approval.spec has no approve verdict with an approver — the spec gate has no recorded ratification`);
	if (status === "implemented" && !(approval?.impl?.verdict === "approve" && approval?.impl?.by)) tag("status is implemented but approval.impl has no approve verdict with an approver — the impl gate has no recorded ratification");
	return v;
}
const PATH_PREFIXES = [
	".agents/",
	"plugins/",
	"packages/",
	"apps/",
	"docs/",
	".claude/"
];
function extractPathRefs(text) {
	const out = [];
	const re = /`([^`\n]+)`/g;
	let m;
	while (m = re.exec(text)) {
		const token = m[1].trim();
		if (/[<*]/.test(token)) continue;
		const isRelative = token.startsWith("./") || token.startsWith("../");
		const isRooted = PATH_PREFIXES.some((p) => token.startsWith(p));
		if (isRelative || isRooted) out.push(token);
	}
	return out;
}
function introducedPathRefs(baselineText, currentText) {
	const baseRefs = new Set(extractPathRefs(baselineText));
	return extractPathRefs(currentText).filter((ref) => !baseRefs.has(ref));
}
function checkReferencedArtifacts(slug, dir, text, baselineText = "") {
	const v = [];
	const tag = (msg) => v.push(`${slug}: introduces unresolved reference \`${msg}\` — surfaced for judgment`);
	for (const ref of introducedPathRefs(baselineText, text)) {
		const clean = ref.replace(/#.*$/, "");
		const resolved = clean.startsWith("./") || clean.startsWith("../") ? join(dir, clean) : clean;
		if (!existsSync(resolved)) tag(clean);
	}
	return v;
}
function parseNode(text) {
	let type = null;
	const lifecycleFields = [];
	for (const l of frontmatter(text)) {
		const key = /^([\w-]+):/.exec(l);
		if (!key) continue;
		if (key[1] === "spec-type") {
			const m = /^spec-type:\s*(.+)$/.exec(l);
			if (m) type = m[1].trim().replace(/^["']|["']$/g, "");
		} else if (NODE_FORBIDDEN_FIELDS.includes(key[1])) lifecycleFields.push(key[1]);
	}
	const body = prose(text);
	return {
		type,
		hasSubject: /^##\s+Subject\b/m.test(body),
		hasUseCases: /^##\s+Use Cases\b/m.test(body),
		lifecycleFields
	};
}
function checkNode(slug, node, hasFeature) {
	const { type, hasSubject, hasUseCases, lifecycleFields } = node;
	const v = [];
	const tag = (msg) => v.push(`${slug}: ${msg}`);
	for (const f of lifecycleFields) tag(`carries lifecycle field "${f}" — lifecycle frontmatter is root-spec.md-only (a node README carries only spec-type)`);
	if (type === null) return v;
	if (!SPEC_TYPES.includes(type)) {
		tag(`unknown spec-type "${type}" (expected reference | behavioral)`);
		return v;
	}
	if (type === "reference") {
		if (hasFeature) tag("spec-type: reference but a sibling .feature exists — a reference artifact is suite-less by design");
		if (!hasSubject) tag("spec-type: reference but no ## Subject section");
	}
	if (type === "behavioral" && !hasUseCases) tag("spec-type: behavioral but no ## Use Cases section");
	return v;
}
function parseLedgerGates(text) {
	const gates = [];
	for (const line of text.split("\n")) {
		const s = line.trim();
		if (!s) continue;
		let obj;
		try {
			obj = JSON.parse(s);
		} catch {
			continue;
		}
		if (obj.kind === "gate" && typeof obj.gate === "string" && typeof obj.verdict === "string") gates.push({
			gate: obj.gate,
			verdict: obj.verdict
		});
	}
	return gates;
}
function readLedgerText(root, slug) {
	const parts = [];
	const legacy = join(root, slug, "ledger.jsonl");
	if (existsSync(legacy)) parts.push(readFileSync(legacy, "utf8"));
	const dir = join(root, slug, "ledger");
	if (existsSync(dir)) {
		for (const e of readdirSync(dir, { withFileTypes: true })) if (e.isFile() && e.name.endsWith(".jsonl")) parts.push(readFileSync(join(dir, e.name), "utf8"));
	}
	return parts.join("\n");
}
function checkGateFloor(slug, status, gates) {
	const v = [];
	const tag = (msg) => v.push(`${slug}: ${msg}`);
	const approved = (gate) => gates.some((g) => g.gate === gate && g.verdict === "approve");
	if ((status === "approved" || status === "implemented") && !approved("spec")) tag(`status is ${status} but the ledger has no spec gate approve line — the durable gate floor is missing`);
	if (status === "implemented" && !approved("impl")) tag("status is implemented but the ledger has no impl gate approve line — the durable gate floor is missing");
	return v;
}
function hasFeatureFile(dir) {
	try {
		return readdirSync(dir).some((f) => f.endsWith(".feature"));
	} catch {
		return false;
	}
}
function discoverDirsWith(root, name) {
	const out = [];
	const walk = (dir, rel) => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		if (entries.some((e) => e.isFile() && e.name === name)) out.push(rel);
		for (const e of entries) {
			if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
			walk(join(dir, e.name), rel ? join(rel, e.name) : e.name);
		}
	};
	walk(root, "");
	return out;
}
const discoverSpecDirs = (root) => discoverDirsWith(root, "spec.md");
const discoverNodeDirs = (root) => discoverDirsWith(root, "README.md");
function parseFilesArg(argv) {
	const idx = argv.indexOf("--files");
	if (idx === -1) return [];
	const paths = [];
	for (let i = idx + 1; i < argv.length; i++) {
		if (argv[i].startsWith("--")) break;
		paths.push(argv[i]);
	}
	return paths;
}
function readBaselineFromGit(base, path) {
	try {
		return execFileSync("git", ["show", `${base}:${path}`], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		});
	} catch {
		return "";
	}
}
function checkReferencedArtifactsInFiles(paths, baseline = () => "") {
	const findings = [];
	const violations = [];
	for (const p of paths) {
		let text;
		try {
			text = readFileSync(p, "utf8");
		} catch {
			violations.push(`${p}: cannot read file`);
			continue;
		}
		findings.push(...checkReferencedArtifacts(p, dirname(p), text, baseline(p)));
	}
	return {
		findings,
		violations
	};
}
function isUnderSpecTree(path) {
	return /(^|\/)\.agents\/specs?(\/|$)/.test(path);
}
function filterProseMdInSpecTree(paths) {
	return paths.filter((p) => p.endsWith(".md") && isUnderSpecTree(p));
}
function splitTableRow(line) {
	return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}
function extractSection(body, heading) {
	const start = new RegExp(`(^|\\n)##\\s+${heading}\\b`).exec(body);
	if (!start) return null;
	const rest = body.slice(start.index + start[0].length);
	const end = /\n##\s/.exec(rest);
	return end ? rest.slice(0, end.index) : rest;
}
function extractUseCaseScenarioRefs(text) {
	const section = extractSection(text.replace(/```[\s\S]*?```/g, ""), "Use Cases");
	if (section === null) return {
		hasSection: false,
		refs: [],
		unparseable: []
	};
	const lines = section.split("\n");
	const headerIdx = lines.findIndex((l) => l.trim().startsWith("|"));
	if (headerIdx === -1) return {
		hasSection: true,
		refs: [],
		unparseable: []
	};
	const scenarioIdx = splitTableRow(lines[headerIdx]).findIndex((c) => /^scenario$/i.test(c));
	if (scenarioIdx === -1) return {
		hasSection: true,
		refs: [],
		unparseable: []
	};
	const refs = [];
	const unparseable = [];
	for (let i = headerIdx + 2; i < lines.length; i++) {
		if (!lines[i].trim().startsWith("|")) break;
		const cell = splitTableRow(lines[i])[scenarioIdx] ?? "";
		const ref = /`([^`\n]+)`/.exec(cell);
		if (ref) refs.push(ref[1].trim());
		else unparseable.push(lines[i].trim());
	}
	return {
		hasSection: true,
		refs,
		unparseable
	};
}
function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function resolveScenarioRef(ref, featureText) {
	if (ref.startsWith("@")) return new RegExp(`(^|\\s)${escapeRegExp(ref)}(\\s|$)`, "m").test(featureText);
	const m = /^Scenario:\s*(.+)$/.exec(ref);
	if (!m) return false;
	const title = m[1].trim();
	return new RegExp(`^\\s*Scenario:\\s*${escapeRegExp(title)}\\s*$`, "m").test(featureText);
}
function findSiblingFeature(dir) {
	let entries;
	try {
		entries = readdirSync(dir).filter((f) => f.endsWith(".feature"));
	} catch {
		return null;
	}
	if (entries.length === 0) return null;
	const named = `${basename(dir)}.feature`;
	if (entries.includes(named)) return join(dir, named);
	return join(dir, entries[0]);
}
function checkUseCaseCoverage(slug, dir, text) {
	const v = [];
	const tag = (msg) => v.push(`${slug}: ${msg}`);
	const { hasSection, refs, unparseable } = extractUseCaseScenarioRefs(text);
	if (!hasSection) return v;
	for (const raw of unparseable) tag(`Use Cases data row has no backtick-wrapped Scenario cell — ${raw}`);
	if (refs.length === 0) return v;
	const featurePath = findSiblingFeature(dir);
	const featureText = featurePath ? readFileSync(featurePath, "utf8") : "";
	for (const ref of refs) if (!resolveScenarioRef(ref, featureText)) tag(`Use Cases table names scenario \`${ref}\` that does not resolve in the sibling .feature`);
	return v;
}
function checkUseCaseCoverageInFiles(paths) {
	const violations = [];
	for (const p of paths) {
		let text;
		try {
			text = readFileSync(p, "utf8");
		} catch {
			continue;
		}
		violations.push(...checkUseCaseCoverage(p, dirname(p), text));
	}
	return violations;
}
function main(argv) {
	if (argv.includes("--files")) {
		const paths = parseFilesArg(argv);
		if (paths.length === 0) {
			console.error("✗ --files requires at least one .md path under the spec tree");
			return 1;
		}
		const proseFiles = filterProseMdInSpecTree(paths);
		const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : void 0;
		const { findings, violations: refReadErrors } = checkReferencedArtifactsInFiles(proseFiles, base ? (p) => readBaselineFromGit(base, p) : () => "");
		const ucViolations = checkUseCaseCoverageInFiles(proseFiles);
		const violations = [...refReadErrors, ...ucViolations];
		for (const f of findings) process.stdout.write(`⚠ ${f}\n`);
		if (violations.length) {
			for (const line of violations) console.error(`✗ ${line}`);
			return 1;
		}
		process.stdout.write(findings.length ? `referenced-artifact findings surfaced for judgment (${findings.length}); use-case-coverage OK\n` : "referenced-artifact and use-case-coverage checks OK\n");
		return 0;
	}
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : ".agents/specs";
	let violations = [];
	for (const slug of discoverSpecDirs(root)) {
		const specPath = join(root, slug, "spec.md");
		if (!existsSync(specPath)) continue;
		const state = parseSpecState(readFileSync(specPath, "utf8"));
		violations = violations.concat(checkSpec(slug, state));
		const gates = parseLedgerGates(readLedgerText(root, slug));
		violations = violations.concat(checkGateFloor(slug, state.status, gates));
	}
	for (const slug of discoverNodeDirs(root)) {
		const dir = join(root, slug);
		const readme = join(dir, "README.md");
		if (!existsSync(readme)) continue;
		violations = violations.concat(checkNode(slug, parseNode(readFileSync(readme, "utf8")), hasFeatureFile(dir)));
	}
	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`);
		return 1;
	}
	process.stdout.write("spec states OK\n");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { checkGateFloor, checkNode, checkReferencedArtifacts, checkReferencedArtifactsInFiles, checkSpec, checkUseCaseCoverage, checkUseCaseCoverageInFiles, discoverNodeDirs, discoverSpecDirs, extractPathRefs, extractUseCaseScenarioRefs, filterProseMdInSpecTree, findSiblingFeature, introducedPathRefs, isUnderSpecTree, main, parseFilesArg, parseLedgerGates, parseNode, parseSpecState, readLedgerText, resolveScenarioRef };
