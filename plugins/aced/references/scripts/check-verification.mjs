#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/skill-design/check-verification.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.0","entry":"references/scripts/check-verification.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
// src/skill-design/check-verification.mts
const SKIP = /* @__PURE__ */ new Set([
	"node_modules",
	"ledger",
	".git"
]);
/** The repository root: the nearest ancestor of the skill folder that holds `.agents/specs`. */
function findRoot(skillFolder) {
	let dir = resolve(skillFolder);
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, ".agents", "specs"))) return dir;
		dir = dirname(dir);
	}
}
/** Every `<name>.feature` under `.agents/specs`, repo-relative, ledgers excluded. */
function findSuites(root, name) {
	const found = [];
	const walk = (dir) => {
		for (const e of readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) {
			if (!SKIP.has(e.name)) walk(join(dir, e.name));
		} else if (e.name === `${name}.feature`) found.push(relative(root, join(dir, e.name)));
	};
	walk(join(root, ".agents", "specs"));
	return found.sort();
}
function countScenarios(text) {
	return (text.match(/^\s*Scenario(?: Outline)?:/gm) ?? []).length;
}
function check(skillFolder) {
	const name = basename(resolve(skillFolder));
	const root = findRoot(skillFolder);
	if (!root) return { checks: [{
		id: "VER-1",
		status: "not-checked",
		message: "no `.agents/specs` folder above the skill"
	}] };
	const suites = findSuites(root, name);
	if (suites.length === 0) return { checks: [{
		id: "VER-1",
		status: "not-checked",
		message: `no frozen suite \`${name}.feature\` under .agents/specs yet`
	}] };
	const empty = suites.filter((s) => countScenarios(readFileSync(join(root, s), "utf8")) === 0);
	if (empty.length > 0) return { checks: [{
		id: "VER-1",
		status: "fail",
		message: "the suite holds no Scenario",
		file: empty[0]
	}] };
	return { checks: [{
		id: "VER-1",
		status: "pass",
		file: suites[0]
	}] };
}
function main(argv) {
	const folder = argv[0];
	if (!folder) {
		process.stderr.write("usage: check-verification <skill folder>\n");
		return 2;
	}
	process.stdout.write(`${JSON.stringify(check(folder))}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
export { check, countScenarios, findRoot, findSuites };
