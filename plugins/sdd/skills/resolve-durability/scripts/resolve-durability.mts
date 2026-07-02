// resolve-durability — resolve one artifact's durability signal (durable | non-durable).
// Self-contained, no deps (repo's node-≥23.6 convention). Spec:
// .agents/specs/sdd/intake/resolve-durability/README.md

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Durability = 'durable' | 'non-durable'

// ─── durability.toml (.agents/sdd/durability.toml) — the universal override valve ────

// Same flat-TOML shape as the artifact-type tiebreaker map (resolve-governances.mts):
// "<path-or-glob>" = "durable" | "non-durable". No TOML dependency — intentionally flat.
export interface DurabilityBinding {
	glob: string
	value: Durability
}

export function parseDurabilityMap(text: string): DurabilityBinding[] {
	const out: DurabilityBinding[] = []
	for (const raw of text.split('\n')) {
		const line = raw.trim()
		if (!line || line.startsWith('#') || line.startsWith('[')) continue // blanks, comments, [section] headers
		const m = /^(?:"([^"]+)"|'([^']+)'|(\S+))\s*=\s*(?:"([^"]+)"|'([^']+)')\s*(?:#.*)?$/.exec(line)
		if (!m) continue
		const glob = m[1] ?? m[2] ?? m[3]
		const value = m[4] ?? m[5]
		if (glob && (value === 'durable' || value === 'non-durable')) out.push({ glob, value })
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

// Most-specific matching glob wins (most literal characters, then longest pattern).
// Returns null when nothing matches.
export function resolveDurabilityFromMap(map: DurabilityBinding[], path: string): Durability | null {
	const matches = map.filter((b) => globToRegExp(b.glob).test(path))
	if (matches.length === 0) return null
	const literal = (g: string) => g.replace(/[*?]/g, '').length
	matches.sort((a, b) => literal(b.glob) - literal(a.glob) || b.glob.length - a.glob.length)
	return matches[0].value
}

// A missing file is legal — most projects need no overrides.
export function loadDurabilityMap(root: string): DurabilityBinding[] {
	const path = join(root, '.agents', 'sdd', 'durability.toml')
	if (!existsSync(path)) return []
	return parseDurabilityMap(readFileSync(path, 'utf8'))
}

// ─── kind default — the fixed agent-config location convention ───────────────────────

// Only these three artifact-types carry a location-varying convention across this repo's
// own skill-authoring tooling. Durable globs are grounded in documented placement tables:
// skill's in define-skill/create-skill (project-public `skills/**`, `plugins/*/skills/**`,
// `packages/*/skills/**`); subagent's and command's in define-agent (`plugins/*/agents/**`,
// `plugins/*/commands/**` only — define-agent's own placement table has no `packages/*` row
// for either, and no such directory exists in this repo, so none is claimed here).
// agents-section has no location-varying convention (one AGENTS.md, not a multi-instance
// artifact-type); code artifact-types have no universal convention either — both fall
// through with no kind default.
const KIND_DEFAULT_GLOBS: Record<string, { nonDurable: string[]; durable: string[] }> = {
	skill: {
		nonDurable: ['.agents/skills/**'],
		durable: ['skills/**', 'plugins/*/skills/**', 'packages/*/skills/**'],
	},
	subagent: {
		nonDurable: ['.agents/agents/**'],
		durable: ['plugins/*/agents/**'],
	},
	command: {
		nonDurable: ['.agents/commands/**'],
		durable: ['plugins/*/commands/**'],
	},
}

export function resolveKindDefault(artifactType: string | undefined, path: string): Durability | null {
	if (!artifactType) return null
	const kind = KIND_DEFAULT_GLOBS[artifactType]
	if (!kind) return null
	if (kind.nonDurable.some((g) => globToRegExp(g).test(path))) return 'non-durable'
	if (kind.durable.some((g) => globToRegExp(g).test(path))) return 'durable'
	return null
}

// ─── the four-step resolution ─────────────────────────────────────────────────────────

export interface ResolveInput {
	root: string
	path: string
	artifactType?: string
	explicit?: Durability
}

export interface ResolveResult {
	value: Durability
	reason: string
}

export function resolveDurability(input: ResolveInput): ResolveResult {
	if (input.explicit) {
		return { value: input.explicit, reason: 'explicit override' }
	}
	const map = loadDurabilityMap(input.root)
	const tableMatch = resolveDurabilityFromMap(map, input.path)
	if (tableMatch) {
		return { value: tableMatch, reason: 'durability.toml' }
	}
	const kindDefault = resolveKindDefault(input.artifactType, input.path)
	if (kindDefault) {
		return { value: kindDefault, reason: `kind-default (${input.artifactType})` }
	}
	return { value: 'durable', reason: 'fail-closed (no signal)' }
}

// ─── validate the table (no --path given) ─────────────────────────────────────────────

export function validateDurabilityMap(root: string): { ok: boolean; message: string } {
	const path = join(root, '.agents', 'sdd', 'durability.toml')
	if (!existsSync(path)) return { ok: true, message: 'durability.toml OK (absent, fine)' }
	const text = readFileSync(path, 'utf8')
	const parsed = parseDurabilityMap(text)
	const nonBlankLines = text.split('\n').filter((l) => {
		const t = l.trim()
		return t && !t.startsWith('#') && !t.startsWith('[')
	})
	if (parsed.length !== nonBlankLines.length) {
		return {
			ok: false,
			message: `durability.toml has ${nonBlankLines.length - parsed.length} malformed line(s)`,
		}
	}
	return { ok: true, message: `durability.toml OK (${parsed.length} entries)` }
}

// ─── CLI ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
	const out: Record<string, string> = {}
	for (let i = 0; i < argv.length; i++) {
		if (argv[i].startsWith('--')) {
			out[argv[i].slice(2)] = argv[i + 1]
			i++
		}
	}
	return out
}

export function main(argv: string[]): void {
	const args = parseArgs(argv)
	const root = args.root ?? '.'

	if (!args.path) {
		const result = validateDurabilityMap(root)
		process.stdout.write(`${result.message}\n`)
		if (!result.ok) process.exitCode = 1
		return
	}

	const explicit = args.explicit === 'durable' || args.explicit === 'non-durable' ? args.explicit : undefined
	const result = resolveDurability({ root, path: args.path, artifactType: args['artifact-type'], explicit })
	process.stdout.write(`${result.value}\n`)
	process.stdout.write(`reason: ${result.reason}\n`)
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	main(process.argv.slice(2))
}
