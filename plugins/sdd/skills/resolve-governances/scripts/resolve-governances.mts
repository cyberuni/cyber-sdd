#!/usr/bin/env node
// Deterministic governance MATCHER for SDD production-chain roles. For a touched
// file's artifact-type it NAMES, per role, the agent that runs it plus the
// resolved-actor bar candidates it loads — matching governances by
// metadata{artifact-type, actor, gate} across the caller-passed project anchors,
// the matched plugin squad, and the sdd defaults. It does NOT order by precedence
// or compose: each bar's candidates come back BUCKETED BY TIER (project /
// project-root / plugin / sdd), and the consuming agent loads each ref and
// composes by precedence (sdd-default < plugin < project-root < project), reading
// each governance's own `compose` at load time (see sdd:plugin-contract-governance).
// The conductor and the cold judges never hand-enumerate — they run this and load
// what it names.
//
// Anchors are CALLER-PASSED, never discovered: --project <path> (the file's own
// project) and optional --project-root <path> (the outer shared layer in a
// monorepo); a single-project repo passes only --project. --root is the registry
// location (`.agents/universal-plugin.json`), default ".".
//
// Pure functions are exported for node:test; running the file directly drives the
// CLI. No dependencies — plain node strips the types.

import { type Dirent, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── the closed sets ───────────────────────────────────────────────────────────

export const ROLE_KEYS = ['spec-producer', 'solution-producer', 'spec-judge', 'impl-producer', 'impl-judge'] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export const BAR_KEYS = ['oracle-spec', 'builder-spec', 'builder-impl', 'architect-spec', 'architect-impl'] as const
export type BarKey = (typeof BAR_KEYS)[number]

export const ACTORS = ['oracle', 'builder', 'architect'] as const
export const GATES = ['spec', 'impl'] as const

// The resolved-actor bars each role loads (plugin-contract-governance "Which
// governances each role loads"). Only the resolved-actor bars are matched here;
// the FIXED-UNIVERSAL governances (ownership, lifecycle, spec-format,
// suite-format, gate-validation, combat-log) are invariant per role and stay
// declared in each role/agent definition — this matcher does not re-emit them.
export const ROLE_LOADOUT: Record<RoleKey, { bars: BarKey[] }> = {
	'spec-producer': { bars: ['oracle-spec', 'builder-spec'] },
	'solution-producer': { bars: ['architect-spec'] },
	'spec-judge': { bars: ['oracle-spec', 'builder-spec', 'architect-spec'] },
	'impl-producer': { bars: ['builder-impl', 'architect-impl'] },
	'impl-judge': { bars: ['builder-impl', 'architect-impl'] },
}

// The SDD-default agent per role. A null ref means the conductor runs the role
// INLINE in the main session (spec/solution-producer) or via a generic spawned
// builder (impl-producer); both are recorded produced-by sdd:automaton. The two
// judges are spawned cold by name.
export const SDD_DEFAULT_AGENT: Record<RoleKey, string | null> = {
	'spec-producer': null,
	'solution-producer': null,
	'spec-judge': 'sdd-spec-judge',
	'impl-producer': null,
	'impl-judge': 'sdd-impl-judge',
}

// ─── types ──────────────────────────────────────────────────────────────────────

// A squad serves a SET of artifact-types with one production chain. A plugin lists
// one or more squads (specialists-and-squads.md "Registry SHAPE"); a type appears
// in at most one squad per plugin.
export interface Squad {
	'artifact-types': string[]
	roles: Partial<Record<RoleKey, string | null>>
	governances: Partial<Record<BarKey, string | null>>
}

export interface RegistryEntry {
	name: string
	version?: string
	squads: Squad[]
}

export interface Registry {
	'sdd-plugins': RegistryEntry[]
}

// A matched squad carries its owning plugin name (for `<plugin>:<bar>` /
// `<plugin>-<role>` refs).
export interface SquadMatch {
	plugin: string
	squad: Squad
}

export interface GovMetadata {
	artifactType: string | null
	actor: string | null
	gate: string | null
	compose: 'union' | 'replace' // parsed but NOT emitted — the agent reads it from the loaded file
}

// The two project tiers a candidate can come from. project = the file's own
// project (most specific); project-root = the outer shared layer in a monorepo.
export type Tier = 'project' | 'project-root'

export interface GovCandidate extends GovMetadata {
	tier: Tier
	path: string // root-relative file path (direct-read ref)
}

// One bar's matched candidates, BUCKETED BY TIER — never ordered, never composed.
// project / project-root are direct-read file paths; plugin / sdd are harness-load
// skill refs. The agent applies precedence sdd < plugin < project-root < project.
export interface BarPlan {
	key: BarKey
	candidates: {
		project: string[]
		'project-root': string[]
		plugin: string | null // <plugin>:<bar> harness-load ref, or null when no squad bar
		sdd: string // sdd:<key>-governance harness-load ref (always present)
	}
}

export interface AgentResolution {
	source: 'plugin' | 'sdd'
	ref: string | null // agent name; null = inline (producer) / generic builder (impl-producer)
}

export interface RolePlan {
	role: RoleKey
	agent: AgentResolution
	bars: BarPlan[] // resolved-actor bars only; fixed-universal live in the role/agent def
}

export interface LoadPlan {
	artifactType: string | null
	status: 'complete' | 'needs-input'
	plugin: string | null
	ambiguous: string[] // plugin names, when status is needs-input
	roles: RolePlan[]
}

// ─── registry parse + migrate-on-read ───────────────────────────────────────────

// Within a squad: rename the legacy plan-producer role key to solution-producer
// and expand the flat governances{oracle,builder,architect} to the Model-B
// (actor,gate) keys.
function migrateRoles(rolesIn: Record<string, string | null> | undefined): Partial<Record<RoleKey, string | null>> {
	const roles = { ...(rolesIn ?? {}) }
	if ('plan-producer' in roles) {
		const legacy = roles['plan-producer']
		if (!('solution-producer' in roles)) roles['solution-producer'] = legacy
		delete roles['plan-producer']
	}
	return roles as Partial<Record<RoleKey, string | null>>
}

function migrateGovernances(gIn: Record<string, string | null> | undefined): Partial<Record<BarKey, string | null>> {
	const g = (gIn ?? {}) as Record<string, string | null>
	const isLegacy = 'oracle' in g || 'builder' in g || 'architect' in g
	return isLegacy
		? {
				'oracle-spec': g.oracle ?? null,
				'builder-spec': g.builder ?? null,
				'builder-impl': g.builder ?? null,
				'architect-spec': g.architect ?? null,
				'architect-impl': g.architect ?? null,
			}
		: { ...(g as Partial<Record<BarKey, string | null>>) }
}

function migrateSquad(sq: Record<string, unknown>): Squad {
	const types = (sq['artifact-types'] ?? sq.domains ?? []) as string[]
	return {
		'artifact-types': Array.isArray(types) ? types : [],
		roles: migrateRoles(sq.roles as Record<string, string | null>),
		governances: migrateGovernances(sq.governances as Record<string, string | null>),
	}
}

// Migrate a registry entry on read. The legacy shape carried `domains[]` + a
// shared `roles{}` + `governances{}` directly on the entry; fold it into one
// squad. A live registry still on the legacy shape is migrated on encounter
// (plugin-contract-governance).
export function migrateEntry(entry: Record<string, unknown>): RegistryEntry {
	const squads = Array.isArray(entry.squads)
		? (entry.squads as Record<string, unknown>[]).map(migrateSquad)
		: [migrateSquad({ 'artifact-types': entry.domains, roles: entry.roles, governances: entry.governances })]
	return { name: entry.name as string, version: entry.version as string | undefined, squads }
}

export function parseRegistry(text: string): Registry {
	let raw: unknown
	try {
		raw = JSON.parse(text)
	} catch (e) {
		throw new Error(`registry is not valid JSON: ${(e as Error).message}`)
	}
	if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { 'sdd-plugins': unknown })['sdd-plugins']))
		throw new Error('registry has no sdd-plugins array')
	const entries = (raw as { 'sdd-plugins': Record<string, unknown>[] })['sdd-plugins'].map(migrateEntry)
	return { 'sdd-plugins': entries }
}

// A project anchor with no registry resolves to all-SDD-defaults — a missing file
// is legal, not an error.
export function loadRegistry(root: string): Registry {
	const path = join(root, '.agents', 'universal-plugin.json')
	if (!existsSync(path)) return { 'sdd-plugins': [] }
	return parseRegistry(readFileSync(path, 'utf8'))
}

// ─── artifact-type tiebreaker map (.agents/sdd/artifact-types.toml) ──────────────

// An OPTIONAL, agent-maintained lookup that records resolved path->type bindings
// for the ambiguities convention can't settle (the artifact-type model). It is
// NOT the primary classifier — convention is, and that is the conductor's
// judgment; this table is consulted only on a known ambiguity or a user-flagged
// path. A flat TOML map "<path-or-glob>" = "<artifact-type>"; most-specific glob
// wins. No TOML dependency — the table is intentionally flat key=value.
export interface TypeBinding {
	glob: string
	type: string
}

export function parseArtifactTypeMap(text: string): TypeBinding[] {
	const out: TypeBinding[] = []
	for (const raw of text.split('\n')) {
		const line = raw.trim()
		if (!line || line.startsWith('#') || line.startsWith('[')) continue // blanks, comments, [section] headers
		const m = /^(?:"([^"]+)"|'([^']+)'|(\S+))\s*=\s*(?:"([^"]+)"|'([^']+)')\s*(?:#.*)?$/.exec(line)
		if (!m) continue
		const glob = m[1] ?? m[2] ?? m[3]
		const type = m[4] ?? m[5]
		if (glob && type) out.push({ glob, type })
	}
	return out
}

// Compile a glob to a full-match RegExp: ** spans path separators, * does not.
function globToRegExp(glob: string): RegExp {
	const re = glob
		.replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials (leave * ?)
		.replace(/\*+/g, (m) => (m.length > 1 ? '.*' : '[^/]*')) // ** spans separators, * does not
		.replace(/\?/g, '.')
	return new RegExp(`^${re}$`)
}

// Resolve a file path to an artifact-type via the tiebreaker map: the
// most-specific matching glob wins (most literal characters, then longest
// pattern). Returns null when nothing matches — the caller falls back to
// convention.
export function resolveArtifactTypeFromMap(map: TypeBinding[], path: string): string | null {
	const matches = map.filter((b) => globToRegExp(b.glob).test(path))
	if (matches.length === 0) return null
	const literal = (g: string) => g.replace(/[*?]/g, '').length
	matches.sort((a, b) => literal(b.glob) - literal(a.glob) || b.glob.length - a.glob.length)
	return matches[0].type
}

// Load the optional tiebreaker map. A missing file is legal (most projects need
// none) — returns an empty table.
export function loadArtifactTypeMap(root: string): TypeBinding[] {
	const path = join(root, '.agents', 'sdd', 'artifact-types.toml')
	if (!existsSync(path)) return []
	return parseArtifactTypeMap(readFileSync(path, 'utf8'))
}

// ─── project governance discovery ───────────────────────────────────────────────

function frontmatter(text: string): string[] {
	const m = /^---\n([\s\S]*?)\n---/.exec(text)
	return m ? m[1].split('\n') : []
}

const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '')

// Read metadata{artifact-type?, actor, gate, compose} from a governance file's
// frontmatter. Returns null when there is no metadata block with an actor+gate —
// a plain doc that is not a resolvable bar.
export function parseGovernanceFrontmatter(text: string): GovMetadata | null {
	const lines = frontmatter(text)
	let inMeta = false
	let artifactType: string | null = null
	let actor: string | null = null
	let gate: string | null = null
	let compose: 'union' | 'replace' = 'union'

	for (const line of lines) {
		if (/^metadata:\s*$/.test(line)) {
			inMeta = true
			continue
		}
		if (inMeta && /^\S/.test(line)) inMeta = false // dedent ends the block
		if (!inMeta) continue
		const at = /^\s+artifact-type:\s*(.+)$/.exec(line)
		if (at) artifactType = unquote(at[1])
		const ac = /^\s+actor:\s*(.+)$/.exec(line)
		if (ac) actor = unquote(ac[1])
		const ga = /^\s+gate:\s*(.+)$/.exec(line)
		if (ga) gate = unquote(ga[1])
		const co = /^\s+compose:\s*(.+)$/.exec(line)
		if (co) compose = unquote(co[1]) === 'replace' ? 'replace' : 'union'
	}

	if (!actor || !gate) return null
	return { artifactType, actor, gate, compose }
}

// Collect project governance candidates from the CALLER-PASSED anchors — never a
// tree walk. Each anchor names a tier and a root; the candidate carries its tier
// (for the agent's precedence) and its root-relative path (the direct-read ref).
// A missing `.agents/governances/` at an anchor contributes nothing. Both .md and
// SKILL.md are read in place — no build.
export function collectAnchorGovernances(anchors: { tier: Tier; root: string }[]): GovCandidate[] {
	const out: GovCandidate[] = []
	for (const { tier, root } of anchors) {
		const dir = join(root, '.agents', 'governances')
		let entries: Dirent[]
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			continue
		}
		for (const e of entries) {
			if (!e.isFile() || !e.name.endsWith('.md')) continue
			const meta = parseGovernanceFrontmatter(readFileSync(join(dir, e.name), 'utf8'))
			if (meta) out.push({ ...meta, tier, path: join(root, '.agents', 'governances', e.name) })
		}
	}
	return out
}

// ─── plugin matching ────────────────────────────────────────────────────────────

// Match an artifact-type against each plugin's squads: the squad whose
// artifact-types contains it serves the file. Zero matches → all SDD defaults;
// one → that squad; two or more distinct plugins → ambiguous (the conductor
// consults the contested-type choice or asks).
export function matchSquad(
	registry: Registry,
	artifactType: string | null,
): { match: SquadMatch | null; ambiguous: string[] } {
	if (!artifactType) return { match: null, ambiguous: [] }
	const matches: SquadMatch[] = []
	for (const p of registry['sdd-plugins'])
		for (const sq of p.squads ?? [])
			if (sq['artifact-types']?.includes(artifactType)) matches.push({ plugin: p.name, squad: sq })
	if (matches.length === 0) return { match: null, ambiguous: [] }
	if (matches.length === 1) return { match: matches[0], ambiguous: [] }
	return { match: null, ambiguous: [...new Set(matches.map((m) => m.plugin))] }
}

// ─── bar matching ───────────────────────────────────────────────────────────────

// Match one (actor, gate) bar across the sources and return the candidates
// BUCKETED BY TIER — no ordering, no compose collapse. A project candidate matches
// when its frontmatter (actor, gate) matches and its artifact-type is the file's
// type OR typeless (a typeless project bar applies to every type). The agent reads
// each candidate's own `compose` at load time and composes by precedence
// (sdd-default < plugin < project-root < project).
export function matchBar(
	artifactType: string | null,
	actor: string,
	gate: string,
	ctx: { match: SquadMatch | null; projectGovs: GovCandidate[] },
): BarPlan {
	const key = `${actor}-${gate}` as BarKey
	const bucket = (tier: Tier) =>
		ctx.projectGovs
			.filter((c) => c.tier === tier && c.actor === actor && c.gate === gate)
			.filter((c) => c.artifactType === artifactType || c.artifactType === null)
			.map((c) => c.path)

	const pluginBar = ctx.match?.squad.governances?.[key]
	return {
		key,
		candidates: {
			project: bucket('project'),
			'project-root': bucket('project-root'),
			plugin: ctx.match && pluginBar ? `${ctx.match.plugin}:${pluginBar}` : null,
			sdd: `sdd:${key}-governance`,
		},
	}
}

// ─── role + plan resolution ─────────────────────────────────────────────────────

// Resolve the agent that runs a role: a named plugin delegate, the SDD default,
// or — for a present-but-missing role key — the <plugin>-<role> convention.
export function resolveAgent(role: RoleKey, match: SquadMatch | null): AgentResolution {
	if (!match) return { source: 'sdd', ref: SDD_DEFAULT_AGENT[role] }
	if (role in match.squad.roles) {
		const named = match.squad.roles[role]
		if (named) return { source: 'plugin', ref: named }
		return { source: 'sdd', ref: SDD_DEFAULT_AGENT[role] } // explicit null = SDD default
	}
	return { source: 'plugin', ref: `${match.plugin}-${role}` } // omitted = convention
}

export function resolveRole(
	role: RoleKey,
	artifactType: string | null,
	ctx: { match: SquadMatch | null; projectGovs: GovCandidate[] },
): RolePlan {
	const bars = ROLE_LOADOUT[role].bars.map((b) => {
		const [actor, gate] = b.split('-')
		return matchBar(artifactType, actor, gate, ctx)
	})
	return { role, agent: resolveAgent(role, ctx.match), bars }
}

export function buildLoadPlan(artifactType: string | null, registry: Registry, projectGovs: GovCandidate[]): LoadPlan {
	const { match, ambiguous } = matchSquad(registry, artifactType)
	if (ambiguous.length > 0)
		return {
			artifactType,
			status: 'needs-input',
			plugin: null,
			ambiguous,
			roles: [],
		}
	const ctx = { match, projectGovs }
	return {
		artifactType,
		status: 'complete',
		plugin: match?.plugin ?? null,
		ambiguous: [],
		roles: ROLE_KEYS.map((r) => resolveRole(r, artifactType, ctx)),
	}
}

// ─── registry structural validation (the no-artifact-type CLI gate) ─────────────

// Validate the registry is well-formed and unambiguous: known role/governance
// keys, a type in at most one squad per plugin, and no artifact-type claimed by
// two plugins (which would force every spec of that type into needs-input).
export function validateRegistry(registry: Registry): string[] {
	const v: string[] = []
	const typeOwners = new Map<string, string[]>()
	for (const entry of registry['sdd-plugins']) {
		const where = entry.name || '<unnamed plugin>'
		if (!entry.name) v.push('an sdd-plugins entry has no name')
		if (!Array.isArray(entry.squads)) {
			v.push(`${where}: squads is not an array`)
			continue
		}
		const seenTypes = new Set<string>()
		for (const sq of entry.squads) {
			if (!Array.isArray(sq['artifact-types'])) v.push(`${where}: a squad's artifact-types is not an array`)
			for (const r of Object.keys(sq.roles ?? {}))
				if (!ROLE_KEYS.includes(r as RoleKey)) v.push(`${where}: unknown role key "${r}"`)
			for (const k of Object.keys(sq.governances ?? {}))
				if (!BAR_KEYS.includes(k as BarKey)) v.push(`${where}: unknown governance key "${k}"`)
			for (const t of sq['artifact-types'] ?? []) {
				if (seenTypes.has(t)) v.push(`${where}: artifact-type "${t}" appears in more than one squad`)
				seenTypes.add(t)
			}
		}
		for (const t of seenTypes) typeOwners.set(t, [...(typeOwners.get(t) ?? []), where])
	}
	for (const [t, owners] of typeOwners)
		if (owners.length > 1)
			v.push(`artifact-type "${t}" is claimed by ${owners.length} plugins (${owners.join(', ')}) — ambiguous`)
	return v
}

// ─── CLI entry ──────────────────────────────────────────────────────────────────

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.'
	const explicitType = argv.includes('--artifact-type') ? argv[argv.indexOf('--artifact-type') + 1] : null
	const pathArg = argv.includes('--path') ? argv[argv.indexOf('--path') + 1] : null
	// Caller-passed project anchors. --project defaults to --root (single-project);
	// --project-root is the outer shared layer in a monorepo (omitted otherwise).
	const projectArg = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : root
	const projectRootArg = argv.includes('--project-root') ? argv[argv.indexOf('--project-root') + 1] : null
	const anchors: { tier: Tier; root: string }[] = [{ tier: 'project', root: projectArg }]
	if (projectRootArg) anchors.push({ tier: 'project-root', root: projectRootArg })

	// --artifact-type wins (explicit override); else --path consults the optional
	// tiebreaker map (most-specific glob). A --path with no map match stays null —
	// the caller falls back to convention, it is not a registry-validation request.
	let artifactType = explicitType
	if (!artifactType && pathArg) artifactType = resolveArtifactTypeFromMap(loadArtifactTypeMap(root), pathArg)

	let registry: Registry
	try {
		registry = loadRegistry(root)
	} catch (e) {
		console.error(`✗ ${(e as Error).message}`)
		return 1
	}

	if (!artifactType && pathArg) {
		process.stdout.write(
			`${JSON.stringify({ path: pathArg, artifactType: null, note: 'no tiebreaker match — classify by convention' }, null, 2)}\n`,
		)
		return 0
	}

	// No artifact-type and no path → validate the registry is well-formed + unambiguous.
	if (!artifactType) {
		const violations = validateRegistry(registry)
		if (violations.length) {
			for (const line of violations) console.error(`✗ ${line}`)
			return 1
		}
		process.stdout.write('governance registry OK\n')
		return 0
	}

	// With an artifact-type → emit the per-role plan (agent + tier-bucketed bars).
	const plan = buildLoadPlan(artifactType, registry, collectAnchorGovernances(anchors))
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
	if (plan.status === 'needs-input')
		console.error(`needs-input: artifact-type "${artifactType}" is claimed by ${plan.ambiguous.join(', ')}`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
