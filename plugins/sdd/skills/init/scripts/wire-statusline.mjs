#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/init/wire-statusline.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.1","entry":"skills/init/scripts/wire-statusline.mjs","commands":{}};
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/init/wire-statusline.mts
const STATUS_FILE = ".agents/sdd/statusline";
const SETTINGS_FILE = ".claude/settings.json";
const GITIGNORE_FILE = ".gitignore";
const GLOBAL_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");
const MARKER_BEGIN = "# sdd-statusline:begin";
const MARKER_END = "# sdd-statusline:end";
const MODE_PREFIX = "# sdd-statusline:mode:";
const ORIG_OPEN = "__sdd_orig() {";
const ORIG_CLOSE = "}";
const NO_BASE = ":";
function buildCommand(base, mode) {
	const origBody = base && base.trim() !== "" ? base : NO_BASE;
	const render = mode === "own-line" ? `if [ -s "$__sdd_file" ]; then\n  __sdd_val="$(cat "$__sdd_file")"\n  printf '%s\\n%s\\n' "$__sdd_base" "$__sdd_val"\nelse\n  printf '%s\\n' "$__sdd_base"\nfi` : `if [ -s "$__sdd_file" ]; then\n  __sdd_val="$(cat "$__sdd_file")"\n  printf '%s | %s\\n' "$__sdd_base" "$__sdd_val"\nelse\n  printf '%s\\n' "$__sdd_base"\nfi`;
	return [
		MARKER_BEGIN,
		`${MODE_PREFIX}${mode}`,
		ORIG_OPEN,
		origBody,
		ORIG_CLOSE,
		"__sdd_base=\"$(__sdd_orig 2>/dev/null)\"",
		`__sdd_file="${STATUS_FILE}"`,
		render,
		MARKER_END
	].join("\n");
}
function parseCommand(command) {
	if (!command?.includes(MARKER_BEGIN)) return { wired: false };
	const modeMatch = new RegExp(`${MODE_PREFIX}(own-line|same-line)`).exec(command);
	const origMatch = /__sdd_orig\(\) \{\n([\s\S]*?)\n\}/.exec(command);
	const mode = modeMatch?.[1] ?? "own-line";
	const origBody = origMatch?.[1] ?? NO_BASE;
	return {
		wired: true,
		base: origBody === NO_BASE ? void 0 : origBody,
		mode
	};
}
function baseToWrap(existingCommand) {
	const parsed = parseCommand(existingCommand);
	return parsed.wired ? parsed.base : existingCommand;
}
function readSettingsFile(file) {
	if (!existsSync(file)) return {};
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return {};
	}
}
function readSettings(root) {
	return readSettingsFile(join(root, SETTINGS_FILE));
}
function readStatusLineCommand(file) {
	const command = readSettingsFile(file).statusLine?.command;
	if (typeof command !== "string" || command.trim() === "") return void 0;
	return command;
}
function writeSettings(root, settings) {
	const file = join(root, SETTINGS_FILE);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}
function composeStatusLine(root, mode, globalCommand) {
	const settings = readSettings(root);
	const existing = settings.statusLine?.command;
	const hasProjectStatusLine = typeof existing === "string" && existing.trim() !== "";
	const globalBaseComposed = !hasProjectStatusLine && globalCommand !== void 0;
	const command = buildCommand(hasProjectStatusLine ? baseToWrap(existing) : globalCommand, mode);
	if (existing === command) return {
		changed: false,
		command,
		globalBaseComposed: false
	};
	settings.statusLine = {
		...settings.statusLine,
		type: "command",
		command
	};
	writeSettings(root, settings);
	return {
		changed: true,
		command,
		globalBaseComposed
	};
}
function isGitRepo(root) {
	return existsSync(join(root, ".git"));
}
function splitLines(text) {
	const lines = text.split("\n");
	if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	return lines;
}
function addGitignoreEntry(root) {
	const file = join(root, GITIGNORE_FILE);
	const lines = existsSync(file) ? splitLines(readFileSync(file, "utf8")) : [];
	if (lines.some((l) => l.trim() === ".agents/sdd/statusline")) return { changed: false };
	const next = [...lines, STATUS_FILE];
	writeFileSync(file, `${next.join("\n")}\n`);
	return { changed: true };
}
function detectStatusLines(root, globalSettingsFile) {
	const projectCommand = readStatusLineCommand(join(root, SETTINGS_FILE));
	const project = projectCommand === void 0 ? "absent" : parseCommand(projectCommand).wired ? "wired" : "foreign";
	const global = readStatusLineCommand(globalSettingsFile ?? GLOBAL_SETTINGS_FILE) !== void 0 ? "present" : "absent";
	return {
		project,
		global,
		shadow: project === "absent" && global === "present"
	};
}
function wireStatusline(root, mode, opts) {
	return {
		settings: composeStatusLine(root, mode, opts?.globalBase ?? true ? readStatusLineCommand(opts?.globalSettingsFile ?? GLOBAL_SETTINGS_FILE) : void 0),
		gitignore: isGitRepo(root) ? {
			...addGitignoreEntry(root),
			skipped: false
		} : {
			changed: false,
			skipped: true
		}
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const globalSettingsFile = flag(argv, "--global-settings");
	const w = (s) => process.stdout.write(`${s}\n`);
	if (argv.includes("--detect")) {
		const result = detectStatusLines(root, globalSettingsFile);
		w(`project statusLine: ${result.project}`);
		w(`global statusLine: ${result.global}`);
		w(result.shadow ? "shadow risk: yes — wiring would shadow the global statusline; compose it as the base (default) or pass --no-global-base to shadow deliberately" : "shadow risk: no");
		return 0;
	}
	if (argv.includes("--wire")) {
		const mode = flag(argv, "--mode");
		if (mode !== "own-line" && mode !== "same-line") {
			w("refused: --mode must be own-line or same-line");
			return 1;
		}
		const result = wireStatusline(root, mode, {
			globalSettingsFile,
			globalBase: !argv.includes("--no-global-base")
		});
		w(result.settings.changed ? `wired statusLine (${mode})` : "statusLine already wired (unchanged)");
		if (result.settings.globalBaseComposed) w("composed the global statusLine command as the wrapped base");
		if (result.gitignore.skipped) w("not a git repo — gitignore skipped");
		else w(result.gitignore.changed ? `added ${STATUS_FILE} to .gitignore` : ".gitignore already up to date");
		return 0;
	}
	w("usage: wire-statusline --root <dir> --wire --mode own-line|same-line [--global-settings <file>] [--no-global-base]\n       wire-statusline --root <dir> --detect [--global-settings <file>]");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { GITIGNORE_FILE, GLOBAL_SETTINGS_FILE, SETTINGS_FILE, STATUS_FILE, addGitignoreEntry, buildCommand, composeStatusLine, detectStatusLines, isGitRepo, main, parseCommand, readStatusLineCommand, wireStatusline };
