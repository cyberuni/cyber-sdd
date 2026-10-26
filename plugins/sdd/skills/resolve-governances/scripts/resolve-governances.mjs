#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/resolve-governances/resolve-governances.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.1","entry":"skills/resolve-governances/scripts/resolve-governances.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/resolve-governances/resolve-governances.mts
const ROLE_KEYS = [
	"spec-producer",
	"solution-producer",
	"spec-judge",
	"impl-producer",
	"impl-judge"
];
const BAR_KEYS = [
	"oracle-spec",
	"builder-spec",
	"builder-impl",
	"architect-spec",
	"architect-impl"
];
const ACTORS = [
	"oracle",
	"builder",
	"architect"
];
const GATES = ["spec", "impl"];
const ROLE_LOADOUT = {
	"spec-producer": { bars: ["oracle-spec", "builder-spec"] },
	"solution-producer": { bars: ["architect-spec"] },
	"spec-judge": { bars: [
		"oracle-spec",
		"builder-spec",
		"architect-spec"
	] },
	"impl-producer": { bars: ["builder-impl", "architect-impl"] },
	"impl-judge": { bars: ["builder-impl", "architect-impl"] }
};
const SDD_DEFAULT_AGENT = {
	"spec-producer": null,
	"solution-producer": null,
	"spec-judge": "sdd-spec-judge",
	"impl-producer": null,
	"impl-judge": "sdd-impl-judge"
};
function migrateRoles(rolesIn) {
	const roles = { ...rolesIn ?? {} };
	if ("plan-producer" in roles) {
		const legacy = roles["plan-producer"];
		if (!("solution-producer" in roles)) roles["solution-producer"] = legacy;
		delete roles["plan-producer"];
	}
	return roles;
}
function migrateGovernances(gIn) {
	const g = gIn ?? {};
	return "oracle" in g || "builder" in g || "architect" in g ? {
		"oracle-spec": g.oracle ?? null,
		"builder-spec": g.builder ?? null,
		"builder-impl": g.builder ?? null,
		"architect-spec": g.architect ?? null,
		"architect-impl": g.architect ?? null
	} : { ...g };
}
function migrateSquad(sq) {
	const types = sq["artifact-types"] ?? sq.domains ?? [];
	return {
		"artifact-types": Array.isArray(types) ? types : [],
		roles: migrateRoles(sq.roles),
		governances: migrateGovernances(sq.governances)
	};
}
function migrateEntry(entry) {
	const squads = Array.isArray(entry.squads) ? entry.squads.map(migrateSquad) : [migrateSquad({
		"artifact-types": entry.domains,
		roles: entry.roles,
		governances: entry.governances
	})];
	return {
		name: entry.name,
		version: entry.version,
		squads
	};
}
function parseRegistry(text) {
	let raw;
	try {
		raw = JSON.parse(text);
	} catch (e) {
		throw new Error(`registry is not valid JSON: ${e.message}`);
	}
	if (!raw || typeof raw !== "object" || !Array.isArray(raw["sdd-plugins"])) throw new Error("registry has no sdd-plugins array");
	return { "sdd-plugins": raw["sdd-plugins"].map(migrateEntry) };
}
function loadRegistry(root) {
	const path = join(root, ".agents", "universal-plugin.json");
	if (!existsSync(path)) return { "sdd-plugins": [] };
	return parseRegistry(readFileSync(path, "utf8"));
}
function parseArtifactTypeMap(text) {
	const out = [];
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#") || line.startsWith("[")) continue;
		const m = /^(?:"([^"]+)"|'([^']+)'|(\S+))\s*=\s*(?:"([^"]+)"|'([^']+)')\s*(?:#.*)?$/.exec(line);
		if (!m) continue;
		const glob = m[1] ?? m[2] ?? m[3];
		const type = m[4] ?? m[5];
		if (glob && type) out.push({
			glob,
			type
		});
	}
	return out;
}
function globToRegExp(glob) {
	const re = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, (m) => m.length > 1 ? ".*" : "[^/]*").replace(/\?/g, ".");
	return new RegExp(`^${re}$`);
}
function resolveArtifactTypeFromMap(map, path) {
	const matches = map.filter((b) => globToRegExp(b.glob).test(path));
	if (matches.length === 0) return null;
	const literal = (g) => g.replace(/[*?]/g, "").length;
	matches.sort((a, b) => literal(b.glob) - literal(a.glob) || b.glob.length - a.glob.length);
	return matches[0].type;
}
function loadArtifactTypeMap(root) {
	const path = join(root, ".agents", "sdd", "artifact-types.toml");
	if (!existsSync(path)) return [];
	return parseArtifactTypeMap(readFileSync(path, "utf8"));
}
function frontmatter(text) {
	const m = /^---\n([\s\S]*?)\n---/.exec(text);
	return m ? m[1].split("\n") : [];
}
const unquote = (s) => s.trim().replace(/^["']|["']$/g, "");
function parseGovernanceFrontmatter(text) {
	const lines = frontmatter(text);
	let inMeta = false;
	let artifactType = null;
	let actor = null;
	let gate = null;
	let compose = "union";
	for (const line of lines) {
		if (/^metadata:\s*$/.test(line)) {
			inMeta = true;
			continue;
		}
		if (inMeta && /^\S/.test(line)) inMeta = false;
		if (!inMeta) continue;
		const at = /^\s+artifact-type:\s*(.+)$/.exec(line);
		if (at) artifactType = unquote(at[1]);
		const ac = /^\s+actor:\s*(.+)$/.exec(line);
		if (ac) actor = unquote(ac[1]);
		const ga = /^\s+gate:\s*(.+)$/.exec(line);
		if (ga) gate = unquote(ga[1]);
		const co = /^\s+compose:\s*(.+)$/.exec(line);
		if (co) compose = unquote(co[1]) === "replace" ? "replace" : "union";
	}
	if (!actor || !gate) return null;
	return {
		artifactType,
		actor,
		gate,
		compose
	};
}
function collectAnchorGovernances(anchors) {
	const out = [];
	for (const { tier, root } of anchors) {
		const dir = join(root, ".agents", "governances");
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const e of entries) {
			if (!e.isFile() || !e.name.endsWith(".md")) continue;
			const meta = parseGovernanceFrontmatter(readFileSync(join(dir, e.name), "utf8"));
			if (meta) out.push({
				...meta,
				tier,
				path: join(root, ".agents", "governances", e.name)
			});
		}
	}
	return out;
}
function matchSquad(registry, artifactType) {
	if (!artifactType) return {
		match: null,
		ambiguous: []
	};
	const matches = [];
	for (const p of registry["sdd-plugins"]) for (const sq of p.squads ?? []) if (sq["artifact-types"]?.includes(artifactType)) matches.push({
		plugin: p.name,
		squad: sq
	});
	if (matches.length === 0) return {
		match: null,
		ambiguous: []
	};
	if (matches.length === 1) return {
		match: matches[0],
		ambiguous: []
	};
	return {
		match: null,
		ambiguous: [...new Set(matches.map((m) => m.plugin))]
	};
}
function matchBar(artifactType, actor, gate, ctx) {
	const key = `${actor}-${gate}`;
	const bucket = (tier) => ctx.projectGovs.filter((c) => c.tier === tier && c.actor === actor && c.gate === gate).filter((c) => c.artifactType === artifactType || c.artifactType === null).map((c) => c.path);
	const pluginBar = ctx.match?.squad.governances?.[key];
	return {
		key,
		candidates: {
			project: bucket("project"),
			"project-root": bucket("project-root"),
			plugin: ctx.match && pluginBar ? `${ctx.match.plugin}:${pluginBar}` : null,
			sdd: `sdd:${key}-governance`
		}
	};
}
function resolveAgent(role, match) {
	if (!match) return {
		source: "sdd",
		ref: SDD_DEFAULT_AGENT[role]
	};
	if (role in match.squad.roles) {
		const named = match.squad.roles[role];
		if (named) return {
			source: "plugin",
			ref: named
		};
		return {
			source: "sdd",
			ref: SDD_DEFAULT_AGENT[role]
		};
	}
	return {
		source: "plugin",
		ref: `${match.plugin}-${role}`
	};
}
function resolveRole(role, artifactType, ctx) {
	const bars = ROLE_LOADOUT[role].bars.map((b) => {
		const [actor, gate] = b.split("-");
		return matchBar(artifactType, actor, gate, ctx);
	});
	return {
		role,
		agent: resolveAgent(role, ctx.match),
		bars
	};
}
function buildLoadPlan(artifactType, registry, projectGovs) {
	const { match, ambiguous } = matchSquad(registry, artifactType);
	if (ambiguous.length > 0) return {
		artifactType,
		status: "needs-input",
		plugin: null,
		ambiguous,
		roles: []
	};
	const ctx = {
		match,
		projectGovs
	};
	return {
		artifactType,
		status: "complete",
		plugin: match?.plugin ?? null,
		ambiguous: [],
		roles: ROLE_KEYS.map((r) => resolveRole(r, artifactType, ctx))
	};
}
function validateRegistry(registry) {
	const v = [];
	const typeOwners = /* @__PURE__ */ new Map();
	for (const entry of registry["sdd-plugins"]) {
		const where = entry.name || "<unnamed plugin>";
		if (!entry.name) v.push("an sdd-plugins entry has no name");
		if (!Array.isArray(entry.squads)) {
			v.push(`${where}: squads is not an array`);
			continue;
		}
		const seenTypes = /* @__PURE__ */ new Set();
		for (const sq of entry.squads) {
			if (!Array.isArray(sq["artifact-types"])) v.push(`${where}: a squad's artifact-types is not an array`);
			for (const r of Object.keys(sq.roles ?? {})) if (!ROLE_KEYS.includes(r)) v.push(`${where}: unknown role key "${r}"`);
			for (const k of Object.keys(sq.governances ?? {})) if (!BAR_KEYS.includes(k)) v.push(`${where}: unknown governance key "${k}"`);
			for (const t of sq["artifact-types"] ?? []) {
				if (seenTypes.has(t)) v.push(`${where}: artifact-type "${t}" appears in more than one squad`);
				seenTypes.add(t);
			}
		}
		for (const t of seenTypes) typeOwners.set(t, [...typeOwners.get(t) ?? [], where]);
	}
	for (const [t, owners] of typeOwners) if (owners.length > 1) v.push(`artifact-type "${t}" is claimed by ${owners.length} plugins (${owners.join(", ")}) — ambiguous`);
	return v;
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : ".";
	const explicitType = argv.includes("--artifact-type") ? argv[argv.indexOf("--artifact-type") + 1] : null;
	const pathArg = argv.includes("--path") ? argv[argv.indexOf("--path") + 1] : null;
	const projectArg = argv.includes("--project") ? argv[argv.indexOf("--project") + 1] : root;
	const projectRootArg = argv.includes("--project-root") ? argv[argv.indexOf("--project-root") + 1] : null;
	const anchors = [{
		tier: "project",
		root: projectArg
	}];
	if (projectRootArg) anchors.push({
		tier: "project-root",
		root: projectRootArg
	});
	let artifactType = explicitType;
	if (!artifactType && pathArg) artifactType = resolveArtifactTypeFromMap(loadArtifactTypeMap(root), pathArg);
	let registry;
	try {
		registry = loadRegistry(root);
	} catch (e) {
		console.error(`✗ ${e.message}`);
		return 1;
	}
	if (!artifactType && pathArg) {
		process.stdout.write(`${JSON.stringify({
			path: pathArg,
			artifactType: null,
			note: "no tiebreaker match — classify by convention"
		}, null, 2)}\n`);
		return 0;
	}
	if (!artifactType) {
		const violations = validateRegistry(registry);
		if (violations.length) {
			for (const line of violations) console.error(`✗ ${line}`);
			return 1;
		}
		process.stdout.write("governance registry OK\n");
		return 0;
	}
	const plan = buildLoadPlan(artifactType, registry, collectAnchorGovernances(anchors));
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
	if (plan.status === "needs-input") console.error(`needs-input: artifact-type "${artifactType}" is claimed by ${plan.ambiguous.join(", ")}`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { ACTORS, BAR_KEYS, GATES, ROLE_KEYS, ROLE_LOADOUT, SDD_DEFAULT_AGENT, buildLoadPlan, collectAnchorGovernances, loadArtifactTypeMap, loadRegistry, main, matchBar, matchSquad, migrateEntry, parseArtifactTypeMap, parseGovernanceFrontmatter, parseRegistry, resolveAgent, resolveArtifactTypeFromMap, resolveRole, validateRegistry };
