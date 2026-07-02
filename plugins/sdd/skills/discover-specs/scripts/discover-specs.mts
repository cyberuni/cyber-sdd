#!/usr/bin/env node
// discover-specs — corpus/discovery's concrete frontmatter engine. Scans the three
// SDD spec locations, filters candidates by the lifecycle `status` shape, parses each
// spec.md's frontmatter ONLY (never its body), and emits a TOON list of the specs found,
// each carrying its project NAME (so a consumer can resolve a name → spec).
//
// Recognition is location-bounded AND shape-confirmed (ADR-0017, narrowed):
//   1. <root>/.agents/spec/spec.md            — repo-root single-project
//   2. <root>/.agents/specs/<project>/spec.md — repo-root multi-project
//   3. <project-path>/.agents/spec/spec.md    — a nested project (** = project-path, any depth)
//   4. any extra anchor declared in .agents/sdd/spec-anchors.toml (ADR-0019) — opt-in and additive;
//      absent config ⇒ only 1–3 are scanned (today's behavior). A pattern may carry a <project>
//      capture token that both globs a segment and names the spec from it; `**` globs zero or more
//      segments (any depth), for a spec whose depth under an anchor root varies.
// A spec.md at one of these locations is a spec only if its frontmatter `status` is in the
// lifecycle enum; a status-bearing spec.md elsewhere, or a stray spec.md at a spec location
// with no lifecycle status, is NOT loaded (so the scan never grabs the wrong file by accident).
//
// The project NAME cannot always be derived: it is `declared` (frontmatter `name`, authoritative),
// else `derived` (the repo-root single-project → `repo`; a `.agents/specs/<project>` folder → the
// folder), else `guessed` (a nested project's folder basename — may not be the name the user uses).
// `name-source` flags which, so a consumer knows when to confirm a guessed name.
//
// Pure functions are exported for node:test; running the file directly drives the CLI.
// No dependencies (the repo's node-≥23.6 / no-deps convention). --format json for a flat array;
// default output is TOON (the token-efficient tabular form the gateway scans). --resolve <name>
// filters to the exact name matches (0 rows = none, 1 = resolved, >1 = ambiguous).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const LIFECYCLE_STATUSES = new Set(['draft', 'approved', 'implemented', 'deprecated'])

// The repo-root single-project (`.agents/spec`) has no folder to name it; this assumable label does.
const ROOT_PROJECT_NAME = 'repo'

// Dirs the scan never descends into (keep `.agents` — specs live under it).
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

// The opt-in extra-anchor registry (ADR-0019). Scanned IN ADDITION TO the three fixed conventions;
// absent ⇒ only the fixed conventions are scanned (today's behavior, unchanged).
const ANCHORS_CONFIG = '.agents/sdd/spec-anchors.toml'

export type NameSource = 'declared' | 'derived' | 'guessed'

export interface SpecRecord {
	/** Root-relative directory of the spec.md (its slug). */
	path: string
	/** The project name — declared in frontmatter, else derived, else guessed. */
	name: string
	/** Where `name` came from, so a consumer knows when to confirm a guess. */
	nameSource: NameSource
	status: string
	/** Frontmatter project-path (the governed source dir), or '' when absent. */
	projectPath: string
	/** Gate verdicts as `<gate>:<verdict>` pairs, in spec→impl order; '' when none. */
	approvals: string
}

export interface Frontmatter {
	status?: string
	projectPath?: string
	/** Declared project name (authoritative over derivation), when present. */
	name?: string
	/** gate → verdict (e.g. spec → approve). */
	approval: Record<string, string>
}

// ── Frontmatter parse (a minimal YAML subset — only the router-index schema) ──
// Extracts the leading `---` … `---` block and reads status, name, project-path, and each
// approval gate's verdict. Returns null when there is no frontmatter block at all.
export function parseFrontmatter(text: string): Frontmatter | null {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text)
	if (!m) return null
	const fm: Frontmatter = { approval: {} }
	let gate: string | null = null // current gate under `approval:`
	for (const raw of m[1].split('\n')) {
		const line = raw.replace(/\r$/, '')
		if (line.trim() === '' || line.trim().startsWith('#')) continue
		const indent = line.length - line.trimStart().length
		const [key, ...rest] = line.trim().split(':')
		const value = rest.join(':').trim()
		if (indent === 0) {
			gate = null
			if (key === 'status') fm.status = unquote(value)
			else if (key === 'project-path') fm.projectPath = unquote(value)
			else if (key === 'name') fm.name = unquote(value)
			else if (key === 'approval') gate = null // enter the approval block
		} else if (indent === 2 && value === '' && insideApproval(m[1], line)) {
			gate = key // a gate name under approval:
		} else if (indent >= 4 && key === 'verdict' && gate) {
			fm.approval[gate] = unquote(value)
		}
	}
	return fm
}

// True when `line` sits under the top-level `approval:` key (the nearest indent-0 parent is it).
function insideApproval(block: string, line: string): boolean {
	const lines = block.split('\n')
	const idx = lines.indexOf(line)
	for (let i = idx - 1; i >= 0; i--) {
		const l = lines[i].replace(/\r$/, '')
		if (l.trim() === '' || l.trim().startsWith('#')) continue
		if (l.length - l.trimStart().length === 0) return l.trim().replace(/:.*$/, '') === 'approval'
	}
	return false
}

function unquote(v: string): string {
	return v.replace(/^["']|["']$/g, '')
}

// ── Location recognition ──
// Classify a root-relative spec.md path to one of the three spec locations, returning the
// pattern + the location dir it implies (the <project> folder for root-multi, the project-path
// for nested, '' for root-single). Returns null for any other location.
type LocationPattern = 'root-single' | 'root-multi' | 'nested' | 'extra'

export interface Location {
	pattern: LocationPattern
	locationDir: string
	/** For an extra anchor whose pattern carried a <project> token: the captured name segment. */
	capturedName?: string
}

export function classifyLocation(relPath: string): Location | null {
	const p = relPath.replace(/\\/g, '/')
	if (p === '.agents/spec/spec.md') return { pattern: 'root-single', locationDir: '' }
	const multi = /^\.agents\/specs\/([^/]+)\/spec\.md$/.exec(p)
	if (multi) return { pattern: 'root-multi', locationDir: multi[1] }
	const nested = /^(.+)\/\.agents\/spec\/spec\.md$/.exec(p)
	if (nested) return { pattern: 'nested', locationDir: nested[1] }
	return null
}

// Derive a project's name + the confidence in it. A declared frontmatter `name` is authoritative;
// otherwise the repo-root single-project is the assumable `repo`, a `.agents/specs/<project>` folder
// names itself (derived), and a nested project falls back to its folder basename (guessed — it may
// not be the name the user uses; a consumer should confirm).
export function deriveName(loc: Location, fm: Frontmatter): { name: string; nameSource: NameSource } {
	if (fm.name) return { name: fm.name, nameSource: 'declared' }
	if (loc.pattern === 'root-single') return { name: ROOT_PROJECT_NAME, nameSource: 'derived' }
	if (loc.pattern === 'root-multi') return { name: loc.locationDir, nameSource: 'derived' }
	// An extra anchor with a <project> capture names the spec from the captured segment (derived);
	// without a capture it falls back to the folder basename (guessed), like a nested project.
	if (loc.pattern === 'extra' && loc.capturedName) {
		return { name: loc.capturedName, nameSource: 'derived' }
	}
	return { name: loc.locationDir.split('/').pop() ?? loc.locationDir, nameSource: 'guessed' }
}

// ── Scan ──
// Walk the tree under root, returning root-relative paths of every spec.md sitting at one of
// the three spec locations. The walk finds `.agents` dirs at any depth (pattern 3) and probes
// `spec/spec.md` (patterns 1 & 3) plus, only at the repo root, `specs/<project>/spec.md`
// (pattern 2).
function discoverSpecFiles(root: string): string[] {
	const found: string[] = []
	const walk = (relDir: string): void => {
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(join(root, relDir), { withFileTypes: true })
		} catch {
			return
		}
		for (const e of entries) {
			if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
			const childRel = relDir ? `${relDir}/${e.name}` : e.name
			if (e.name === '.agents') {
				probeAgents(root, childRel, found)
				continue // spec locations live directly under .agents, no deeper walk needed
			}
			walk(childRel)
		}
	}
	walk('')
	return found
}

// Probe a discovered `.agents` dir for the spec locations beneath it.
function probeAgents(root: string, agentsRel: string, found: string[]): void {
	const single = `${agentsRel}/spec/spec.md`
	if (existsSync(join(root, single))) found.push(single)
	if (agentsRel === '.agents') {
		// pattern 2 — repo-root multi-project — is root-only (no ** prefix).
		const specsDir = join(root, '.agents', 'specs')
		let projects: import('node:fs').Dirent[]
		try {
			projects = readdirSync(specsDir, { withFileTypes: true })
		} catch {
			projects = []
		}
		for (const p of projects) {
			if (!p.isDirectory()) continue
			const rel = `.agents/specs/${p.name}/spec.md`
			if (existsSync(join(root, rel))) found.push(rel)
		}
	}
}

// ── Extra anchors — the opt-in registry (ADR-0019) ──
// A minimal TOML read: pull the string entries out of the `anchors = [ … ]` array. Paths carry no
// `#`, so entries are the quoted strings inside the array literal (across newlines). Returns [] when
// there is no anchors array (a config that commented them all out is a valid empty set).
export function parseAnchorsToml(text: string): string[] {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text)
	if (!m) return []
	const out: string[] = []
	for (const q of m[2].matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2]).trim())
	return out.filter((s) => s !== '')
}

// Read the extra-anchor patterns, FAIL-SAFE: an absent config yields []; an unreadable/malformed one
// warns and yields [] so the gateway's status scan never crashes on a hand-corrupted config.
export function readAnchors(root: string): string[] {
	const file = join(root, ANCHORS_CONFIG)
	if (!existsSync(file)) return []
	try {
		return parseAnchorsToml(readFileSync(file, 'utf8'))
	} catch {
		process.stderr.write(`discover-specs: ignoring unreadable ${ANCHORS_CONFIG}\n`)
		return []
	}
}

// Every dir reachable from `startDir` by descending zero or more levels (startDir itself included),
// skipping SKIP_DIRS. Backs the `**` segment (any-depth glob) below.
function collectDescendants(root: string, startDir: string): string[] {
	const out = [startDir]
	let entries: import('node:fs').Dirent[]
	try {
		entries = readdirSync(join(root, startDir), { withFileTypes: true })
	} catch {
		return out
	}
	for (const e of entries) {
		if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
		out.push(...collectDescendants(root, startDir ? `${startDir}/${e.name}` : e.name))
	}
	return out
}

// Expand one anchor pattern against the filesystem into the spec dirs it matches. A `*` segment globs
// one directory level; a `**` segment globs zero or more levels (any depth); a `<project>` segment
// globs AND captures one level as the spec name. A literal segment must exist. The matched dir is a
// spec dir iff it holds a spec.md.
export function expandAnchor(root: string, pattern: string): { rel: string; capturedName?: string }[] {
	const segs = pattern
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean)
	let frontier: { dir: string; capturedName?: string }[] = [{ dir: '' }]
	for (const seg of segs) {
		const next: { dir: string; capturedName?: string }[] = []
		if (seg === '**') {
			for (const node of frontier) {
				for (const dir of collectDescendants(root, node.dir)) next.push({ dir, capturedName: node.capturedName })
			}
			frontier = next
			continue
		}
		const isGlob = seg === '*' || seg === '<project>'
		for (const node of frontier) {
			if (isGlob) {
				let entries: import('node:fs').Dirent[]
				try {
					entries = readdirSync(join(root, node.dir), { withFileTypes: true })
				} catch {
					continue
				}
				for (const e of entries) {
					if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue
					next.push({
						dir: node.dir ? `${node.dir}/${e.name}` : e.name,
						capturedName: seg === '<project>' ? e.name : node.capturedName,
					})
				}
			} else {
				next.push({ dir: node.dir ? `${node.dir}/${seg}` : seg, capturedName: node.capturedName })
			}
		}
		frontier = next
	}
	const out: { rel: string; capturedName?: string }[] = []
	for (const node of frontier) {
		const rel = node.dir ? `${node.dir}/spec.md` : 'spec.md'
		if (existsSync(join(root, rel))) out.push({ rel, capturedName: node.capturedName })
	}
	return out
}

// ── Collect ──
// Build a SpecRecord from a spec.md at `rel` under `loc`, or null when it fails the status shape
// filter (or the file is unreadable). Shared by the fixed-convention and extra-anchor passes.
function recordFor(root: string, rel: string, loc: Location): SpecRecord | null {
	let fm: Frontmatter | null
	try {
		fm = parseFrontmatter(readFileSync(join(root, rel), 'utf8'))
	} catch {
		return null
	}
	if (!fm?.status || !LIFECYCLE_STATUSES.has(fm.status)) return null // shape filter
	const { name, nameSource } = deriveName(loc, fm)
	return {
		path: rel.replace(/\/spec\.md$/, ''),
		name,
		nameSource,
		status: fm.status,
		projectPath: fm.projectPath ?? '',
		approvals: Object.entries(fm.approval)
			.map(([gate, verdict]) => `${gate}:${verdict}`)
			.join(';'),
	}
}

// The list of specs under root: every spec.md at one of the three fixed conventions PLUS every
// spec.md at a declared extra anchor, whose frontmatter status is in the lifecycle enum, keyed by
// its folder slug, sorted by path. Extra anchors are additive and deduped against the fixed set.
export function collectSpecs(root: string): SpecRecord[] {
	const out: SpecRecord[] = []
	const seen = new Set<string>()
	for (const rel of discoverSpecFiles(root)) {
		const loc = classifyLocation(rel)
		if (!loc) continue
		const rec = recordFor(root, rel, loc)
		if (rec) {
			out.push(rec)
			seen.add(rel)
		}
	}
	for (const pattern of readAnchors(root)) {
		for (const { rel, capturedName } of expandAnchor(root, pattern)) {
			if (seen.has(rel)) continue // already found at a fixed convention
			const rec = recordFor(root, rel, {
				pattern: 'extra',
				locationDir: rel.replace(/\/spec\.md$/, ''),
				capturedName,
			})
			if (rec) {
				out.push(rec)
				seen.add(rel)
			}
		}
	}
	return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

// ── Resolve a name (the deterministic half of resolve-a-name) ──
// Exact, case-insensitive name match over the discovered list. `match` resolves to one spec;
// `ambiguous` returns the candidate set for a consumer to disambiguate WITH THE USER (the agentic
// half, not this function's job); `none` when no name matches.
export type ResolveResult =
	| { kind: 'match'; spec: SpecRecord }
	| { kind: 'ambiguous'; candidates: SpecRecord[] }
	| { kind: 'none' }

export function resolveByName(specs: SpecRecord[], name: string): ResolveResult {
	const want = name.trim().toLowerCase()
	const hits = specs.filter((s) => s.name.toLowerCase() === want)
	if (hits.length === 0) return { kind: 'none' }
	if (hits.length === 1) return { kind: 'match', spec: hits[0] }
	return { kind: 'ambiguous', candidates: hits }
}

// ── Output ──
const COLUMNS = ['path', 'name', 'nameSource', 'status', 'projectPath', 'approvals'] as const

// Quote a TOON field only when it carries the delimiter, a quote, or edge whitespace.
function toonField(v: string): string {
	if (v === '' || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function toToon(specs: SpecRecord[]): string {
	const header = `specs[${specs.length}]{${COLUMNS.join(',')}}:`
	const rows = specs.map((s) => `  ${COLUMNS.map((c) => toonField(s[c])).join(',')}`)
	return [header, ...rows].join('\n')
}

export function main(argv: string[]): number {
	const root = argv.includes('--root') ? (argv[argv.indexOf('--root') + 1] ?? '.') : '.'
	const format = argv.includes('--format') ? argv[argv.indexOf('--format') + 1] : 'toon'
	let specs = collectSpecs(root)
	if (argv.includes('--resolve')) {
		const name = argv[argv.indexOf('--resolve') + 1] ?? ''
		const r = resolveByName(specs, name)
		specs = r.kind === 'match' ? [r.spec] : r.kind === 'ambiguous' ? r.candidates : []
	}
	const out = format === 'json' ? JSON.stringify(specs, null, 2) : toToon(specs)
	process.stdout.write(`${out}\n`)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
