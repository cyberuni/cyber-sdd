#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/init-aced/ensure-results-ignored.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.4.2","entry":"skills/init-aced/scripts/ensure-results-ignored.mjs","commands":{}};
import { execFileSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/init-aced/ensure-results-ignored.mts
const RESULTS_DIR_RULE = ".agents/aced/results/";
const PROBE_PATH = ".agents/aced/results/.ensure-ignored-probe";
function resolveRepoRoot(startDir) {
	try {
		return execFileSync("git", [
			"-C",
			startDir,
			"rev-parse",
			"--show-toplevel"
		], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
	} catch {
		return null;
	}
}
function isIgnored(repoRoot, relPath) {
	try {
		execFileSync("git", [
			"-C",
			repoRoot,
			"check-ignore",
			"-q",
			relPath
		], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}
function canWriteGitignore(repoRoot) {
	const file = join(repoRoot, ".gitignore");
	try {
		if (existsSync(file)) accessSync(file, constants.W_OK);
		else accessSync(repoRoot, constants.W_OK);
		return true;
	} catch {
		return false;
	}
}
function appendRuleLast(repoRoot, rule) {
	const file = join(repoRoot, ".gitignore");
	let content = "";
	if (existsSync(file)) {
		content = readFileSync(file, "utf8");
		if (content.length > 0 && !content.endsWith("\n")) content += "\n";
	}
	content += `${rule}\n`;
	writeFileSync(file, content);
}
function ensureResultsIgnored(startDir) {
	const repoRoot = resolveRepoRoot(startDir);
	if (!repoRoot) return {
		ok: false,
		reason: "not inside a git repository"
	};
	if (isIgnored(repoRoot, PROBE_PATH)) return {
		ok: true,
		changed: false,
		repoRoot
	};
	if (!canWriteGitignore(repoRoot)) return {
		ok: false,
		reason: ".gitignore is not writable or creatable"
	};
	appendRuleLast(repoRoot, RESULTS_DIR_RULE);
	return {
		ok: true,
		changed: true,
		repoRoot
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const w = (s) => process.stdout.write(`${s}\n`);
	const r = ensureResultsIgnored(root);
	if (!r.ok) {
		w(`refused: ${r.reason}`);
		return 1;
	}
	w(r.changed ? `${RESULTS_DIR_RULE} appended to .gitignore at ${r.repoRoot}` : `already ignored under ${r.repoRoot}`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { RESULTS_DIR_RULE, canWriteGitignore, ensureResultsIgnored, isIgnored, main, resolveRepoRoot };
