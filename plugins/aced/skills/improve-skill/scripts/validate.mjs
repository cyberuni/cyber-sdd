#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/improve-skill/validate.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.3","entry":"skills/improve-skill/scripts/validate.mjs","commands":{}};
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
//#region src/improve-skill/validate.mts
function readSkillManifest(skillDir) {
	const filePath = path.join(skillDir, "skill.json");
	if (!fs.existsSync(filePath)) return null;
	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch {
		return null;
	}
}
const SKILL_DIRS = ["skills", ".agents/skills"];
const SKILL_DIRS_CONFIG = ".agents/aced/skill-dirs.toml";
const SCAN_SKIP_DIRS = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	".turbo",
	".next",
	"coverage"
]);
function parseSkillDirsToml(text) {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text);
	if (!m) return [];
	const out = [];
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2] ?? "").trim());
	return out.filter((s) => s !== "");
}
function readSkillDirsConfig(cwd) {
	const file = path.join(cwd, SKILL_DIRS_CONFIG);
	if (!fs.existsSync(file)) return [];
	try {
		return parseSkillDirsToml(fs.readFileSync(file, "utf8"));
	} catch {
		return [];
	}
}
function collectDescendants(cwd, startDir) {
	const out = [startDir];
	let entries;
	try {
		entries = fs.readdirSync(path.join(cwd, startDir), { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (!entry.isDirectory() || SCAN_SKIP_DIRS.has(entry.name)) continue;
		out.push(...collectDescendants(cwd, startDir ? `${startDir}/${entry.name}` : entry.name));
	}
	return out;
}
function expandSkillDirPattern(cwd, pattern) {
	const segs = pattern.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
	let frontier = [""];
	for (const seg of segs) {
		const next = [];
		if (seg === "**") for (const dir of frontier) next.push(...collectDescendants(cwd, dir));
		else if (seg === "*") for (const dir of frontier) {
			let entries;
			try {
				entries = fs.readdirSync(path.join(cwd, dir), { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				if (!entry.isDirectory() || SCAN_SKIP_DIRS.has(entry.name)) continue;
				next.push(dir ? `${dir}/${entry.name}` : entry.name);
			}
		}
		else for (const dir of frontier) next.push(dir ? `${dir}/${seg}` : seg);
		frontier = next;
	}
	return frontier;
}
function resolveScanDirs(cwd, dirGlobs = []) {
	const dirs = new Set(SKILL_DIRS);
	for (const pattern of [...readSkillDirsConfig(cwd), ...dirGlobs]) for (const dir of expandSkillDirPattern(cwd, pattern)) dirs.add(dir);
	return [...dirs];
}
function recognizedScanRoots(cwd, dirGlobs = []) {
	const roots = /* @__PURE__ */ new Set();
	for (const dir of resolveScanDirs(cwd, dirGlobs)) try {
		roots.add(fs.realpathSync(path.join(cwd, dir)));
	} catch {}
	return roots;
}
function listScriptFiles(scriptsDir, rel = "") {
	const files = [];
	for (const entry of fs.readdirSync(path.join(scriptsDir, rel), { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const relPath = rel ? `${rel}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...listScriptFiles(scriptsDir, relPath));
		else if (entry.isFile() || entry.isSymbolicLink() && isFileTarget(path.join(scriptsDir, relPath))) files.push(relPath);
	}
	return files.sort();
}
function isFileTarget(filePath) {
	try {
		return fs.statSync(filePath).isFile();
	} catch {
		return false;
	}
}
function findSkillFiles(dirs, cwd) {
	const seen = /* @__PURE__ */ new Set();
	const results = [];
	for (const dir of dirs) {
		const base = path.join(cwd, dir);
		if (!fs.existsSync(base)) continue;
		for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
			const skillFile = path.join(base, entry.name, "SKILL.md");
			if (!fs.existsSync(skillFile)) continue;
			try {
				const real = fs.realpathSync(skillFile);
				if (!seen.has(real)) {
					seen.add(real);
					results.push(real);
				}
			} catch {}
		}
	}
	return results.sort();
}
const GENERIC_PHRASES = [
	"helps with",
	"general purpose",
	"handles tasks",
	"use this skill when the user asks anything",
	"does things"
];
const E1_CRITICAL_PATTERNS = [
	/\bsudo\s+rm\b/,
	/(curl|wget)[^|\n]*\|\s*(ba|z)?sh\b/,
	/\bdd\s+if=/,
	/\b(mkfs|fdisk|parted)\b/,
	/kill\s+-9\s+1\b/,
	/:\(\)\{\s*:\|:&\s*\}/,
	/chmod\s+-R\s+777\s+/
];
function classifyRmSeverity(line) {
	const m = /\brm\s+(.+)/.exec(line);
	if (!m) return null;
	const tokens = m[1].trim().split(/\s+/);
	const flagTokens = tokens.filter((t) => /^-\w+$/.test(t));
	const targetTokens = tokens.filter((t) => !t.startsWith("-"));
	const flags = flagTokens.join("");
	const hasRecursion = /[rR]/.test(flags);
	const hasForce = /f/.test(flags);
	if (!hasRecursion && !hasForce) return null;
	if (hasRecursion) return "CRITICAL";
	return targetTokens.length === 0 || targetTokens.some((t) => /[*?[]/.test(t) || t.startsWith("/") || t.startsWith("~") || t.includes("$")) ? "CRITICAL" : "HIGH";
}
function classifyE1Line(line) {
	for (const pat of E1_CRITICAL_PATTERNS) if (pat.test(line)) return "CRITICAL";
	return classifyRmSeverity(line);
}
const E2_PATTERNS = [
	/[Ii]gnore (previous|all|prior) instructions/,
	/[Yy]ou are now [A-Z][a-zA-Z]/,
	/[Ff]rom now on you are /,
	/[Dd]isregard your (guidelines|rules)/,
	/[Ff]orget your (guidelines|training)/,
	/[Yy]our new instructions are/
];
const INVISIBLE_UNICODE = /* @__PURE__ */ new Map([
	[173, "SOFT HYPHEN"],
	[847, "COMBINING GRAPHEME JOINER"],
	[1564, "ARABIC LETTER MARK"],
	[6158, "MONGOLIAN VOWEL SEPARATOR"],
	[8203, "ZERO WIDTH SPACE"],
	[8204, "ZERO WIDTH NON-JOINER"],
	[8205, "ZERO WIDTH JOINER"],
	[8206, "LEFT-TO-RIGHT MARK"],
	[8207, "RIGHT-TO-LEFT MARK"],
	[8234, "LEFT-TO-RIGHT EMBEDDING"],
	[8235, "RIGHT-TO-LEFT EMBEDDING"],
	[8236, "POP DIRECTIONAL FORMATTING"],
	[8237, "LEFT-TO-RIGHT OVERRIDE"],
	[8238, "RIGHT-TO-LEFT OVERRIDE"],
	[8288, "WORD JOINER"],
	[8289, "FUNCTION APPLICATION"],
	[8290, "INVISIBLE TIMES"],
	[8291, "INVISIBLE SEPARATOR"],
	[8292, "INVISIBLE PLUS"],
	[8294, "LEFT-TO-RIGHT ISOLATE"],
	[8295, "RIGHT-TO-LEFT ISOLATE"],
	[8296, "FIRST STRONG ISOLATE"],
	[8297, "POP DIRECTIONAL ISOLATE"],
	[65279, "ZERO WIDTH NO-BREAK SPACE / BOM"]
]);
const OP_DETAIL_FILEREF = /[\w-]+\.(?:mts|mjs|feature|jsonl|toml|sddignore)\b|[\w.-]+\/[\w./-]+\.(?:md|js|ts|json|sh)\b/;
const OP_DETAIL_DIR = /\.agents\/|\.github\/|(?<![\w.])scripts\//;
const OP_DETAIL_CHECKID = /\b[SQEP]\d{1,2}(?:[-–]\d{1,2})?\b/;
const STDOUT_AS_DATA_PATTERNS = [
	/\bparse (?:the )?(?:script )?output\b/i,
	/\bread (?:the )?(?:summary )?table\b/i,
	/\bshow (?:the )?(?:script )?output\b/i,
	/\bfrom (?:the )?script output\b/i
];
function hasStdoutAsDataMitigation(content) {
	return /(--json|--format json|--format agent)/.test(content) || /parse stdout json/i.test(content) || /read `<[^`]+>`/i.test(content) || /read the (?:artifact|file|report)/i.test(content);
}
function parseFrontmatter(content) {
	const lines = content.split("\n");
	let fmCount = 0;
	let name = "";
	let description = "";
	let internal = false;
	for (const line of lines) {
		if (line.trim() === "---") {
			fmCount++;
			if (fmCount === 2) break;
			continue;
		}
		if (fmCount !== 1) continue;
		const nameMatch = line.match(/^name:\s*(.+)/);
		if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, "");
		const descMatch = line.match(/^description:\s*(.+)/);
		if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, "");
		if (/^user-invocable:\s*false\s*$/i.test(line)) internal = true;
	}
	return {
		name,
		description,
		internal
	};
}
function extractBody(content) {
	const lines = content.split("\n");
	let fmCount = 0;
	const bodyLines = [];
	for (const line of lines) {
		if (line.trim() === "---") {
			fmCount++;
			continue;
		}
		if (fmCount >= 2) bodyLines.push(line);
	}
	return bodyLines.join("\n");
}
function extractCodeBlocks(content) {
	const lines = content.split("\n");
	let inBlock = false;
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith("```")) {
			inBlock = !inBlock;
			continue;
		}
		if (inBlock) out.push(`${i + 1}: ${lines[i]}`);
	}
	return out.join("\n");
}
function stripExamples(content) {
	return content.replace(/`[^`]*`/g, "").replace(/"[^"]*"/g, "");
}
function isShellExpandedReference(source, matchIndex) {
	const previousChar = source[matchIndex - 1];
	const previousTwoChars = source.slice(Math.max(0, matchIndex - 2), matchIndex);
	return previousChar === "$" || previousTwoChars === ")/" || previousTwoChars === "}/";
}
function findInvisibleUnicode(source) {
	let line = 1;
	let column = 1;
	for (const char of source) {
		if (char === "\n") {
			line++;
			column = 1;
			continue;
		}
		const codePoint = char.codePointAt(0);
		if (codePoint !== void 0) {
			const name = INVISIBLE_UNICODE.get(codePoint);
			if (name) return {
				line,
				column,
				codePoint,
				name
			};
		}
		column++;
	}
	return null;
}
const ROOT_LOCAL_PATH_PREFIXES = [
	"docs/",
	"governances/",
	"skills/",
	"src/",
	"apps/",
	"packages/"
];
const ALLOWED_SKILL_SUBDIRS = /* @__PURE__ */ new Set([
	"scripts",
	"references",
	"assets"
]);
const STATIC_RESOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".svg",
	".ico",
	".webp",
	".json",
	".yaml",
	".yml",
	".toml",
	".csv",
	".xml"
]);
const TEMPLATE_PATTERNS = [
	/\.template\./i,
	/\.tmpl$/i,
	/^template\./i
];
function normalizeLinkTarget(target) {
	const trimmed = target.trim().replace(/^<|>$/g, "");
	return trimmed.split(/\s+"/)[0] ?? trimmed;
}
function findPublicSkillExternalRefs(content, skillDir, repoRoot) {
	const findings = /* @__PURE__ */ new Map();
	const add = (ref, reason) => {
		if (!findings.has(ref)) findings.set(ref, reason);
	};
	const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
	let match;
	while ((match = markdownLinkPattern.exec(content)) !== null) {
		const target = normalizeLinkTarget(match[1] ?? "");
		if (!target || /^(https?:|mailto:|#)/i.test(target)) continue;
		if (target.startsWith("../")) {
			add(target, "parent-directory traversal escapes the skill folder");
			continue;
		}
		if (ROOT_LOCAL_PATH_PREFIXES.some((prefix) => target.startsWith(prefix) && target.length > prefix.length)) {
			add(target, "repo-local link points outside the skill folder");
			continue;
		}
		if (path.isAbsolute(target) && target.startsWith(repoRoot)) add(target, "absolute path points to a repo file outside the skill folder");
	}
	const prosePathPattern = /(^|[\s(<'"`])(\.\.\/[^\s)"'`<>]+|(?:docs|governances|skills|src|apps|packages)\/[^\s)"'`<>]+)(?![A-Za-z0-9_-])/gm;
	while ((match = prosePathPattern.exec(content)) !== null) {
		const ref = match[2] ?? "";
		if (!ref) continue;
		if (ref.startsWith("../")) add(ref, "parent-directory traversal escapes the skill folder");
		else {
			const resolved = path.resolve(repoRoot, ref);
			if (resolved.startsWith(skillDir)) continue;
			if (fs.existsSync(resolved)) add(ref, "repo-local path points outside the skill folder");
		}
	}
	return Array.from(findings, ([ref, reason]) => ({
		ref,
		reason
	}));
}
function runChecks(filePath, scanRoots) {
	const criticals = [];
	const warnings = [];
	const crit = (checkId, name, evidence, fix) => criticals.push({
		severity: "CRITICAL",
		checkId,
		name,
		evidence,
		fix
	});
	const warn = (severity, checkId, name, evidence, fix) => warnings.push({
		severity,
		checkId,
		name,
		evidence,
		fix
	});
	const content = fs.readFileSync(filePath, "utf8");
	const skillDir = path.dirname(filePath);
	const skillBaseDir = path.dirname(skillDir);
	const skillBaseParent = path.basename(path.dirname(skillBaseDir));
	const repoRoot = skillBaseParent === ".agents" ? path.dirname(path.dirname(skillBaseDir)) : path.dirname(skillBaseDir);
	const dirName = path.basename(skillDir);
	const parent = path.basename(skillBaseDir);
	const { name: fmName, description: fmDesc, internal: fmInternal } = parseFrontmatter(content);
	const body = extractBody(content);
	const codeBlocks = extractCodeBlocks(content);
	const stripped = stripExamples(content);
	const invisibleInSkill = findInvisibleUnicode(content);
	const isPartialSkill = fmInternal;
	const isByNameDescription = fmDesc === "By name only";
	const isPublicShippedSkill = parent === "skills" && skillBaseParent !== ".agents" && !fmInternal;
	let containerReal = skillBaseDir;
	try {
		containerReal = fs.realpathSync(skillBaseDir);
	} catch {}
	if (!(parent === "skills" || (scanRoots?.has(containerReal) ?? false))) crit("S1", "SKILL.md in own directory", `path: ${filePath}`, "Move SKILL.md into its own named subdirectory directly under a recognized skill-scan root");
	if (!fmName) crit("S2", "Required frontmatter: name", "name: field missing or empty", `Add 'name: ${dirName}' to the YAML frontmatter block`);
	if (!fmDesc) crit("S2", "Required frontmatter: description", "description: field missing or empty", "Add a description: field to the YAML frontmatter block");
	if (fmName && fmName !== dirName) warn("HIGH", "S3", "name matches directory", `name: '${fmName}' but directory is '${dirName}'`, `Set name: to '${dirName}'`);
	const s4RefPattern = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+\.[a-zA-Z]+)/g;
	const s4Skip = /[<>*]|^(https?:\/\/|~|\/|skills\/|\.agents\/|\.github\/|\.cursor\/|\.vscode\/)/;
	const s4Ext = /\.(md|sh|mts|mjs|js|ts|py|json|yaml|yml)$/;
	const s4Refs = /* @__PURE__ */ new Set();
	let m;
	while ((m = s4RefPattern.exec(codeBlocks)) !== null) {
		const ref = m[1];
		if (isShellExpandedReference(codeBlocks, m.index)) continue;
		if (m.index > 0 && codeBlocks[m.index - 1] === "/") continue;
		if (!s4Skip.test(ref) && s4Ext.test(ref)) s4Refs.add(ref);
	}
	for (const ref of s4Refs) if (!fs.existsSync(path.join(skillDir, ref))) warn("HIGH", "S4", "Referenced file does not exist in skill directory", `${ref} (looked for ${path.join(skillDir, ref)})`, "Create the file inside the skill directory or remove the reference");
	if (isPublicShippedSkill) for (const finding of findPublicSkillExternalRefs(content, skillDir, repoRoot)) warn("HIGH", "S4", "Public skill references files outside its skill directory", `${finding.ref} (${finding.reason})`, "Keep shipped skill references inside the skill folder or replace with external URLs / generic prose");
	const anchorPattern = /\[([^\]]+)\]\(#([^)]+)\)/g;
	while ((m = anchorPattern.exec(stripped)) !== null) {
		const anchor = m[2];
		const headingPat = anchor.replace(/-/g, "[- ]");
		if (!new RegExp(`^#{1,6}.*${headingPat}`, "im").test(content)) warn("MEDIUM", "S5", "Internal anchor link does not resolve", `#${anchor}`, `Add a heading matching '${anchor.replace(/-/g, " ")}' or fix the link target`);
	}
	if (fmDesc) {
		if (!isPartialSkill && !isByNameDescription) {
			const wordCount = fmDesc.split(/\s+/).filter(Boolean).length;
			if (wordCount < 12) warn("HIGH", "Q2", "Description too short (specificity)", `${wordCount} words: ${fmDesc}`, "Expand the description to at least 12 words with specific trigger conditions");
		}
		const genericHit = GENERIC_PHRASES.find((p) => new RegExp(p, "i").test(fmDesc));
		if (genericHit) warn("HIGH", "Q2", "Description uses vague generic phrase", `matched '${genericHit}' in: ${fmDesc}`, "Replace with specific trigger conditions and outcomes");
	}
	if (isPartialSkill && fmDesc && (OP_DETAIL_FILEREF.test(fmDesc) || OP_DETAIL_DIR.test(fmDesc) || OP_DETAIL_CHECKID.test(fmDesc))) warn("MEDIUM", "Q17", "Partial skill description carries operational detail", `description: ${fmDesc}`, "Trim to identity + named caller only; move paths, directories, check-IDs, and artifact filenames to the body or README");
	if (isPartialSkill && fmDesc && !/^(Partial Skill:|By name only$)/i.test(fmDesc.trim())) warn("MEDIUM", "Q3", "Partial skill description missing the \"Partial Skill:\" prefix", `description: ${fmDesc}`, "Set the description to exactly \"By name only\" (or lead with \"Partial Skill:\")");
	if (isPartialSkill && fmDesc && /use this skill when|when to use/i.test(fmDesc)) warn("MEDIUM", "Q18", "Trigger language on a partial (by-name) skill", `description: ${fmDesc}`, "Remove \"Use this skill when\"/\"when to use\" phrasing — a partial skill is invoked by name, and trigger-shaped text invites spurious harness auto-matching");
	if (!body.trim()) warn("MEDIUM", "Q4", "No actionable instruction body", "body is empty after frontmatter", "Add numbered steps, decision logic, or ## section headers");
	else if (!/^\d+\.|^#{1,4} /m.test(body)) warn("MEDIUM", "Q4", "No actionable instruction body", "body has no numbered steps or section headers", "Add numbered steps, decision logic, or ## section headers");
	if (fmDesc && fmDesc.length > 1024) warn("HIGH", "Q5", "Description exceeds 1024 characters (spec hard limit)", `description: ${fmDesc.slice(0, 80)}… (${fmDesc.length} chars)`, "Trim to ≤1024 chars; move example phrases to the skill body");
	const scriptsDir = path.join(skillDir, "scripts");
	const hasScripts = fs.existsSync(scriptsDir);
	for (const pat of STDOUT_AS_DATA_PATTERNS) if (pat.test(body) && !hasStdoutAsDataMitigation(content)) {
		warn("HIGH", "Q10", "SKILL.md instructs parsing stdout prose as data", body.match(pat)?.[0] ?? "stdout-as-data pattern", "Prefer artifact file paths, read stdout with --format agent, or parse with --format json for non-LLM consumers");
		break;
	}
	if (hasScripts) {
		if (listScriptFiles(scriptsDir).some((f) => {
			const src = fs.readFileSync(path.join(scriptsDir, f), "utf8");
			return /readline|createInterface|\.question\(/.test(src);
		}) && !/--yes|-y/.test(content)) warn("HIGH", "Q11", "Interactive script missing non-interactive agent path", "scripts/ uses readline/prompt but SKILL.md does not document --yes or -y", "Document --yes (or equivalent) in SKILL.md for autonomous agent runs");
	}
	for (const line of codeBlocks.split("\n")) {
		const severity = classifyE1Line(line);
		if (!severity) continue;
		if (severity === "CRITICAL") crit("E1", "Dangerous shell command (in code block)", line.trim(), "Remove or rewrite; never embed destructive commands in a skill");
		else warn("HIGH", "E1", "Dangerous shell command (in code block)", line.trim(), "Remove or rewrite; never embed destructive commands in a skill");
		break;
	}
	for (const pat of E2_PATTERNS) {
		const hit = stripped.split("\n").find((l) => pat.test(l));
		if (hit) {
			crit("E2", "Prompt injection pattern", hit.trim(), "Remove prompt-injection content; treat skill body as untrusted data");
			break;
		}
	}
	if (invisibleInSkill) crit("E9", "Invisible Unicode control character", `SKILL.md:${invisibleInSkill.line}:${invisibleInSkill.column} U+${invisibleInSkill.codePoint.toString(16).toUpperCase().padStart(4, "0")} ${invisibleInSkill.name}`, "Remove the hidden character or replace it with visible ASCII text");
	const e6Hit = stripped.split("\n").find((l) => /git push.*(--force|-f )/.test(l) && /(main|master)/.test(l));
	if (e6Hit) warn("HIGH", "E6", "Silent permission escalation: force-push to main/master", e6Hit.trim(), "Add an explicit user-confirmation step before the force-push");
	if (hasScripts) for (const f of listScriptFiles(scriptsDir)) {
		const invisibleInScript = findInvisibleUnicode(fs.readFileSync(path.join(scriptsDir, f), "utf8"));
		if (invisibleInScript) crit("E9", "Invisible Unicode control character", `scripts/${f}:${invisibleInScript.line}:${invisibleInScript.column} U+${invisibleInScript.codePoint.toString(16).toUpperCase().padStart(4, "0")} ${invisibleInScript.name}`, "Remove the hidden character or replace it with visible ASCII text");
	}
	const manifest = readSkillManifest(skillDir);
	if (manifest !== null) {
		const dist = manifest.distribution;
		if (dist !== void 0) {
			const knownInstallVia = ["package_manager"];
			if (!dist.install_via || !knownInstallVia.includes(dist.install_via)) crit("S6", "skill.json: invalid distribution.install_via", `install_via: ${dist.install_via ?? "(missing)"}`, `Set distribution.install_via to one of: ${knownInstallVia.join(", ")}`);
			else if (dist.install_via === "package_manager" && !dist.package?.name) crit("S6", "skill.json: distribution.package.name required when install_via is package_manager", "distribution.package.name is missing or empty", "Add distribution.package.name with the npm package name that provides the skill binary");
		}
	}
	try {
		const entries = fs.readdirSync(skillDir, { withFileTypes: true });
		const nonStandardDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".") && !ALLOWED_SKILL_SUBDIRS.has(e.name)).map((e) => e.name);
		if (nonStandardDirs.length > 0) warn("MEDIUM", "S7", "Non-standard directory in skill folder", `found: ${nonStandardDirs.join(", ")}`, "Move contents to scripts/, references/, or assets/ per agentskills.io spec");
		const staticInRoot = entries.filter((e) => {
			if (!e.isFile()) return false;
			const name = e.name;
			const ext = path.extname(name).toLowerCase();
			if (name === "skill.json") return false;
			if (TEMPLATE_PATTERNS.some((pat) => pat.test(name))) return true;
			return STATIC_RESOURCE_EXTENSIONS.has(ext);
		}).map((e) => e.name);
		if (staticInRoot.length > 0) warn("LOW", "S8", "Static resources in skill root instead of assets/", `found: ${staticInRoot.join(", ")}`, "Move to assets/ per agentskills.io spec");
		const extraDocs = entries.filter((e) => {
			if (!e.isFile()) return false;
			const name = e.name.toLowerCase();
			if (!name.endsWith(".md")) return false;
			if (name === "skill.md" || name === "readme.md") return false;
			if (TEMPLATE_PATTERNS.some((pat) => pat.test(name))) return false;
			return true;
		}).map((e) => e.name);
		if (extraDocs.length > 0) warn("LOW", "S9", "Extra documentation files in skill root instead of references/", `found: ${extraDocs.join(", ")}`, "Move to references/ with explicit load conditions per agentskills.io spec");
	} catch {}
	return {
		criticals,
		warnings
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function flagAll(argv, name) {
	const out = [];
	for (let i = 0; i < argv.length; i++) if (argv[i] === name && argv[i + 1] !== void 0) out.push(argv[i + 1]);
	return out;
}
function scan(cwd, pathArg, dirGlobs = []) {
	let skillFiles;
	if (pathArg) {
		const resolved = path.resolve(cwd, pathArg);
		const skillMd = resolved.endsWith("SKILL.md") ? resolved : path.join(resolved, "SKILL.md");
		if (!fs.existsSync(skillMd)) return {
			ok: false,
			exitCode: 1,
			message: `No SKILL.md found at ${skillMd}`,
			results: []
		};
		skillFiles = [skillMd];
	} else skillFiles = findSkillFiles(resolveScanDirs(cwd, dirGlobs), cwd);
	if (skillFiles.length === 0) return {
		ok: true,
		exitCode: 0,
		message: "No SKILL.md files found.",
		results: []
	};
	const scanRoots = recognizedScanRoots(cwd, dirGlobs);
	const results = skillFiles.map((filePath) => ({
		filePath,
		dirName: path.basename(path.dirname(filePath)),
		...runChecks(filePath, scanRoots)
	}));
	const totalCriticals = results.reduce((n, r) => n + r.criticals.length, 0);
	return {
		ok: totalCriticals === 0,
		exitCode: totalCriticals === 0 ? 0 : 1,
		results
	};
}
function printFinding(w, f) {
	w(`  ${f.severity === "CRITICAL" ? "❌" : "⚠️ "} [${f.severity}] ${f.checkId} — ${f.name}`);
	w(`     Evidence: ${f.evidence}`);
	w(`     Fix:      ${f.fix}`);
}
function printReport(w, outcome) {
	if (outcome.results.length === 0) {
		w(outcome.message ?? "");
		return;
	}
	w(`Validating ${outcome.results.length} skill(s)…`);
	let totalCriticals = 0;
	let totalWarnings = 0;
	for (const { dirName, criticals, warnings } of outcome.results) {
		w(`\n── ${dirName} ─────────────────────────`);
		totalCriticals += criticals.length;
		totalWarnings += warnings.length;
		for (const f of criticals) printFinding(w, f);
		for (const f of warnings) printFinding(w, f);
		if (criticals.length === 0) w("  ✅ no CRITICAL findings");
		else w("  🚨 DO NOT commit or install until all CRITICAL findings are resolved.");
	}
	w("\n══════════════════════════════════════");
	w(`Results: ${totalCriticals} critical failure(s), ${totalWarnings} warning(s)`);
	if (totalCriticals > 0) w("❌ Fix all CRITICAL findings before merging.");
	else {
		w("✅ All checks passed (S1–S9, Q2–Q5, Q10–Q11, Q17, Q18, E1–E2, E6, E9).");
		w("   Run the improve-skill agent skill for full quality review (Q1, Q6–Q16, E3–E5, E7–E8, P1–P3).");
	}
}
const HELP = `usage: validate.mjs [--path <path>] [--dir <glob>]... [--root <path>] [--format text|json]

Validate skills against the mechanical check subset (S1-S9, Q2-Q5, Q10-Q11, Q17, Q18, E1-E2, E6, E9).

  --path <path>    validate a single skill directory or SKILL.md file (default: whole-project scan)
  --dir <glob>     add a one-off scan location for this run (repeatable; ignored when --path is set)
  --root <path>    repo root to scan from (default: cwd)
  --format <fmt>   text (default) or json
  --help           show this message
`;
function main(argv) {
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(HELP);
		return 0;
	}
	const cwd = path.resolve(flag(argv, "--root") ?? ".");
	const pathArg = flag(argv, "--path");
	const dirGlobs = flagAll(argv, "--dir");
	const format = flag(argv, "--format") ?? (argv.includes("--json") ? "json" : "text");
	const outcome = scan(cwd, pathArg, dirGlobs);
	if (format === "json") {
		process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`);
		return outcome.exitCode;
	}
	if (!outcome.ok && outcome.results.length === 0) {
		process.stderr.write(`${outcome.message}\n`);
		return outcome.exitCode;
	}
	printReport((s) => process.stdout.write(`${s}\n`), outcome);
	return outcome.exitCode;
}
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { SKILL_DIRS, classifyRmSeverity, expandSkillDirPattern, findSkillFiles, listScriptFiles, main, parseSkillDirsToml, readSkillDirsConfig, recognizedScanRoots, resolveScanDirs, runChecks, scan };
