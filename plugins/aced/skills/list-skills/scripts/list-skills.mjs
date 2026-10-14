#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/list-skills/list-skills.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.2","entry":"skills/list-skills/scripts/list-skills.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
//#region src/list-skills/list-skills.mts
function walkUpForPackageJson(startDir) {
	let dir = startDir;
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) return dir;
		dir = dirname(dir);
	}
}
function getPackageRoot(root = ".") {
	const candidates = [join(root, "node_modules", "cyberplace"), join(root, "packages", "cyberplace")];
	for (const candidate of candidates) if (existsSync(join(candidate, "package.json"))) return candidate;
	return walkUpForPackageJson(dirname(fileURLToPath(import.meta.url))) ?? root;
}
function readSkillManifest(skillDir) {
	const filePath = join(skillDir, "skill.json");
	if (!existsSync(filePath)) return null;
	try {
		return JSON.parse(readFileSync(filePath, "utf8"));
	} catch {
		return null;
	}
}
function isPackageManaged(manifest) {
	return manifest?.distribution?.install_via === "package_manager";
}
function parseFrontmatter(content) {
	const lines = content.split("\n");
	let fmCount = 0;
	let name = "";
	let description = "";
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
	}
	return {
		name,
		description
	};
}
function globToRegExp(pattern) {
	let regex = "";
	for (const char of pattern) if (char === "*") regex += ".*";
	else if (char === "?") regex += ".";
	else if (/[.+^${}()|[\]\\]/.test(char)) regex += `\\${char}`;
	else regex += char;
	return new RegExp(`^${regex}$`);
}
function collectSkillsFromDir(dir, foundIn) {
	if (!existsSync(dir)) return [];
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const skillDir = join(dir, entry.name);
		const skillFile = join(skillDir, "SKILL.md");
		if (!existsSync(skillFile)) continue;
		const { name, description } = parseFrontmatter(readFileSync(skillFile, "utf8"));
		results.push({
			name: name || entry.name,
			description,
			foundIn,
			packageManaged: isPackageManaged(readSkillManifest(skillDir))
		});
	}
	return results;
}
function listSkills(root, options = {}) {
	const grep = options.grep ? globToRegExp(options.grep) : void 0;
	const home = options.home ?? homedir();
	const packageRoot = options.packageRoot ?? getPackageRoot(root);
	const sources = [
		{
			dir: join(root, ".agents", "skills"),
			foundIn: "repo"
		},
		{
			dir: join(root, "skills"),
			foundIn: "repo"
		},
		{
			dir: join(home, ".agents", "skills"),
			foundIn: "global"
		},
		{
			dir: join(packageRoot, "skills"),
			foundIn: "package"
		}
	];
	const seen = /* @__PURE__ */ new Set();
	const results = [];
	for (const { dir, foundIn } of sources) for (const skill of collectSkillsFromDir(dir, foundIn)) {
		if (seen.has(skill.name)) continue;
		if (grep && !grep.test(skill.name)) continue;
		seen.add(skill.name);
		results.push(skill);
	}
	return results.sort((a, b) => a.name.localeCompare(b.name));
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function formatText(skills) {
	if (skills.length === 0) return "No skills found.";
	return skills.map((s) => `${s.name}  [${s.foundIn}]${s.packageManaged ? " (package-managed)" : ""}\n  ${s.description}`).join("\n");
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const grep = flag(argv, "--grep");
	const format = flag(argv, "--format") ?? "text";
	const skills = listSkills(root, { grep });
	if (format === "json") process.stdout.write(`${JSON.stringify(skills, null, 2)}\n`);
	else process.stdout.write(`${formatText(skills)}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { getPackageRoot, globToRegExp, isPackageManaged, listSkills, main, readSkillManifest };
