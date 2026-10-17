// Compiled by `universal-plugin plugin build` from src/resolve-tracking/resolve-tracking.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/resolve-tracking/scripts/resolve-tracking.mjs","commands":{}};
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/resolve-tracking/resolve-tracking.mts
function globToRegExpBody(glob) {
	return glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, (m) => m.length > 1 ? ".*" : "[^/]*").replace(/\?/g, "[^/]");
}
function parseIgnoreLine(raw) {
	const trimmed = raw.replace(/\r$/, "").trim();
	if (!trimmed || trimmed.startsWith("#")) return "skip";
	let body = trimmed;
	const negated = body.startsWith("!");
	if (negated) body = body.slice(1);
	if (body.endsWith("/")) body = body.slice(0, -1);
	let anchored = false;
	if (body.startsWith("/")) {
		anchored = true;
		body = body.slice(1);
	} else if (body.includes("/")) anchored = true;
	if (body === "") return null;
	const prefix = anchored ? "^" : "^(?:.*/)?";
	const core = globToRegExpBody(body);
	const suffix = "(?:/.*)?$";
	try {
		return {
			negated,
			regex: new RegExp(prefix + core + suffix),
			source: trimmed
		};
	} catch {
		return null;
	}
}
function parseIgnoreFile(text) {
	const out = [];
	for (const raw of text.split("\n")) {
		const rule = parseIgnoreLine(raw);
		if (rule && rule !== "skip") out.push(rule);
	}
	return out;
}
function loadIgnoreRules(root) {
	const path = join(root, ".agents", "sdd", ".sddignore");
	if (!existsSync(path)) return [];
	return parseIgnoreFile(readFileSync(path, "utf8"));
}
function resolveFromIgnore(rules, path) {
	let value = null;
	for (const rule of rules) if (rule.regex.test(path)) value = rule.negated ? "tracked" : "ignored";
	return value;
}
const KIND_DEFAULT_GLOBS = {
	skill: {
		ignored: [".agents/skills/**"],
		tracked: [
			"skills/**",
			"plugins/*/skills/**",
			"packages/*/skills/**"
		]
	},
	subagent: {
		ignored: [".agents/agents/**"],
		tracked: ["plugins/*/agents/**", "packages/*/agents/**"]
	},
	command: {
		ignored: [".agents/commands/**"],
		tracked: ["plugins/*/commands/**", "packages/*/commands/**"]
	}
};
function globMatch(glob, path) {
	return new RegExp(`^${globToRegExpBody(glob)}$`).test(path);
}
function resolveKindDefault(artifactType, path) {
	if (!artifactType) return null;
	const kind = KIND_DEFAULT_GLOBS[artifactType];
	if (!kind) return null;
	if (kind.ignored.some((g) => globMatch(g, path))) return "ignored";
	if (kind.tracked.some((g) => globMatch(g, path))) return "tracked";
	return null;
}
function resolveTracking(input) {
	if (input.explicit) return {
		value: input.explicit,
		reason: "explicit override"
	};
	const ignoreMatch = resolveFromIgnore(loadIgnoreRules(input.root), input.path);
	if (ignoreMatch) return {
		value: ignoreMatch,
		reason: ".sddignore"
	};
	const kindDefault = resolveKindDefault(input.artifactType, input.path);
	if (kindDefault) return {
		value: kindDefault,
		reason: `kind-default (${input.artifactType})`
	};
	return {
		value: "tracked",
		reason: "fail-closed (no signal)"
	};
}
function validateIgnoreFile(root) {
	const path = join(root, ".agents", "sdd", ".sddignore");
	if (!existsSync(path)) return {
		ok: true,
		message: ".sddignore OK (absent, fine)"
	};
	const text = readFileSync(path, "utf8");
	const notes = [];
	text.split("\n").forEach((raw, i) => {
		if (parseIgnoreLine(raw) === null) notes.push(`line ${i + 1}: not a valid gitignore pattern: ${raw.trim()}`);
	});
	if (notes.length > 0) return {
		ok: false,
		message: notes.join("\n")
	};
	return {
		ok: true,
		message: `.sddignore OK (${parseIgnoreFile(text).length} rule(s))`
	};
}
function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) {
		out[argv[i].slice(2)] = argv[i + 1];
		i++;
	}
	return out;
}
function main(argv) {
	const args = parseArgs(argv);
	const root = args.root ?? ".";
	if (!args.path) {
		const result = validateIgnoreFile(root);
		process.stdout.write(`${result.message}\n`);
		if (!result.ok) process.exitCode = 1;
		return;
	}
	const explicit = args.explicit === "tracked" || args.explicit === "ignored" ? args.explicit : void 0;
	const result = resolveTracking({
		root,
		path: args.path,
		artifactType: args["artifact-type"],
		explicit
	});
	process.stdout.write(`${result.value}\n`);
	process.stdout.write(`reason: ${result.reason}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2));
//#endregion
export { loadIgnoreRules, main, parseIgnoreFile, parseIgnoreLine, resolveFromIgnore, resolveKindDefault, resolveTracking, validateIgnoreFile };
