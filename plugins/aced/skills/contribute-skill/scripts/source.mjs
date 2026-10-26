#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/contribute-skill/source.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.5.0","entry":"skills/contribute-skill/scripts/source.mjs","commands":{}};
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/contribute-skill/source.mts
function readLock(lockPath) {
	if (!existsSync(lockPath)) return null;
	try {
		return JSON.parse(readFileSync(lockPath, "utf8"));
	} catch {
		return null;
	}
}
function parseNpxSkillsOutput(raw, skillName) {
	const ansiRe = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
	const clean = raw.replace(ansiRe, "");
	const regex = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9_-]+)/g;
	let match;
	while ((match = regex.exec(clean)) !== null) {
		const [, ownerRepo, foundName] = match;
		if (foundName === skillName) return { source: ownerRepo };
	}
	return null;
}
function defaultNpxFind(skillName) {
	try {
		const result = spawnSync("npx", [
			"--yes",
			"skills",
			"find",
			skillName
		], {
			encoding: "utf8",
			timeout: 4e3,
			env: {
				...process.env,
				NO_COLOR: "1",
				CI: "1"
			}
		});
		return (result.stdout ?? "") + (result.stderr ?? "");
	} catch {
		return "";
	}
}
function findSkillSource(skillName, root, homeDir = homedir(), npxFind = defaultNpxFind) {
	const repoLock = readLock(join(root, "skills-lock.json"));
	if (repoLock) {
		const entry = repoLock.skills?.[skillName];
		if (entry?.source) return {
			name: skillName,
			source: entry.source,
			sourceUrl: `https://github.com/${entry.source}`,
			skillPath: entry.skillPath ?? null,
			foundIn: "repo"
		};
	}
	const globalLock = readLock(join(homeDir, ".agents", ".skill-lock.json"));
	if (globalLock) {
		const entry = globalLock.skills?.[skillName];
		if (entry?.source) return {
			name: skillName,
			source: entry.source,
			sourceUrl: entry.sourceUrl ?? `https://github.com/${entry.source}`,
			skillPath: entry.skillPath ?? null,
			foundIn: "global"
		};
	}
	const parsed = parseNpxSkillsOutput(npxFind(skillName), skillName);
	if (parsed) return {
		name: skillName,
		source: parsed.source,
		sourceUrl: `https://github.com/${parsed.source}`,
		skillPath: `skills/${skillName}/SKILL.md`,
		foundIn: "npx-skills"
	};
	return {
		name: skillName,
		source: null,
		sourceUrl: null,
		skillPath: null,
		foundIn: null
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function positional(argv) {
	const consumed = /* @__PURE__ */ new Set();
	for (const name of ["--root", "--format"]) {
		const i = argv.indexOf(name);
		if (i !== -1) {
			consumed.add(i);
			consumed.add(i + 1);
		}
	}
	for (let i = 0; i < argv.length; i++) if (!consumed.has(i)) return argv[i];
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const format = flag(argv, "--format") ?? "text";
	const skillName = positional(argv);
	if (!skillName) {
		process.stdout.write("usage: source <skill-name> [--root <path>] [--format json|text]\n");
		return 1;
	}
	const result = findSkillSource(skillName, root);
	if (format === "json") process.stdout.write(`${JSON.stringify(result)}\n`);
	else if (result.foundIn) {
		process.stdout.write(`${result.name}: ${result.source} (found in ${result.foundIn})\n`);
		if (result.skillPath) process.stdout.write(`  skillPath: ${result.skillPath}\n`);
		process.stdout.write(`  sourceUrl: ${result.sourceUrl}\n`);
	} else process.stdout.write(`${result.name}: not found in repo lock, global lock, or npx skills find\n`);
	return result.foundIn ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { defaultNpxFind, findSkillSource, main, parseNpxSkillsOutput, readLock };
