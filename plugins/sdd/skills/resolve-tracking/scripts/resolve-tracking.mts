// resolve-tracking — resolve one artifact's tracking signal (tracked | ignored).
// Self-contained, no deps (repo's node-≥23.6 convention). Spec:
// .agents/specs/sdd/intake/resolve-tracking/README.md

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Tracking = 'tracked' | 'ignored'

// ─── .sddignore (.agents/sdd/.sddignore) — the universal override valve ───────────────
//
// gitignore syntax. Each non-blank, non-comment line is a pattern. A leading `!` marks the
// path tracked (re-include); any other pattern marks it ignored. Matching is
// last-match-wins: the LAST rule whose pattern matches the path decides.

export interface IgnoreRule {
	negated: boolean // leading `!` — re-includes (tracked)
	regex: RegExp
	source: string // the original pattern text (for notes)
}

// Compile the pattern body (no ! / trailing slash) to a regex fragment:
// ** spans path separators, * and ? stay within a segment.
function globToRegExpBody(glob: string): string {
	return glob
		.replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials (leave * ?)
		.replace(/\*+/g, (m) => (m.length > 1 ? '.*' : '[^/]*')) // ** spans separators, * does not
		.replace(/\?/g, '[^/]')
}

// Parse one raw line into a rule. Returns:
//   - a rule for a well-formed pattern
//   - 'skip' for a blank line or a comment (nothing loaded)
//   - null for a malformed line (an empty pattern after stripping ! and trailing /)
export function parseIgnoreLine(raw: string): IgnoreRule | 'skip' | null {
	const line = raw.replace(/\r$/, '')
	const trimmed = line.trim()
	if (!trimmed || trimmed.startsWith('#')) return 'skip'

	let body = trimmed
	const negated = body.startsWith('!')
	if (negated) body = body.slice(1)
	const dirOnly = body.endsWith('/')
	if (dirOnly) body = body.slice(0, -1)

	let anchored = false
	if (body.startsWith('/')) {
		anchored = true
		body = body.slice(1)
	} else if (body.includes('/')) {
		anchored = true
	}

	if (body === '') return null // nothing to match — malformed

	// A leading `**/` matches at any depth; otherwise anchored patterns pin to root and
	// unanchored patterns (no interior slash) match the name at any level. A trailing
	// component (or dir-only pattern) also matches everything under it, mirroring git's
	// "ignore a directory ⇒ ignore its contents".
	const prefix = anchored ? '^' : '^(?:.*/)?'
	const core = globToRegExpBody(body)
	const suffix = '(?:/.*)?$'
	try {
		return { negated, regex: new RegExp(prefix + core + suffix), source: trimmed }
	} catch {
		return null // uncompilable — malformed
	}
}

export function parseIgnoreFile(text: string): IgnoreRule[] {
	const out: IgnoreRule[] = []
	for (const raw of text.split('\n')) {
		const rule = parseIgnoreLine(raw)
		if (rule && rule !== 'skip') out.push(rule)
	}
	return out
}

// A missing file is legal — most projects need no overrides.
export function loadIgnoreRules(root: string): IgnoreRule[] {
	const path = join(root, '.agents', 'sdd', '.sddignore')
	if (!existsSync(path)) return []
	return parseIgnoreFile(readFileSync(path, 'utf8'))
}

// Last-match-wins: iterate rules in file order; the LAST rule that matches decides.
// `!` => tracked, else => ignored. No match => null (fall through).
export function resolveFromIgnore(rules: IgnoreRule[], path: string): Tracking | null {
	let value: Tracking | null = null
	for (const rule of rules) {
		if (rule.regex.test(path)) value = rule.negated ? 'tracked' : 'ignored'
	}
	return value
}

// ─── kind default — the fixed agent-config location convention ───────────────────────
//
// Only skill / subagent / command carry a location-varying convention. Project-private
// paths (`.agents/{skills,agents,commands}/**`) => ignored; project-public / shipped paths
// (`skills/**`, `plugins/*/skills/**`, `packages/*/skills/**`, and the agents/commands
// equivalents) => tracked. agents-section has one AGENTS.md (no location convention); code
// artifact-types have no universal convention — both fall through with no kind default.
const KIND_DEFAULT_GLOBS: Record<string, { ignored: string[]; tracked: string[] }> = {
	skill: {
		ignored: ['.agents/skills/**'],
		tracked: ['skills/**', 'plugins/*/skills/**', 'packages/*/skills/**'],
	},
	subagent: {
		ignored: ['.agents/agents/**'],
		tracked: ['plugins/*/agents/**', 'packages/*/agents/**'],
	},
	command: {
		ignored: ['.agents/commands/**'],
		tracked: ['plugins/*/commands/**', 'packages/*/commands/**'],
	},
}

function globMatch(glob: string, path: string): boolean {
	return new RegExp(`^${globToRegExpBody(glob)}$`).test(path)
}

export function resolveKindDefault(artifactType: string | undefined, path: string): Tracking | null {
	if (!artifactType) return null
	const kind = KIND_DEFAULT_GLOBS[artifactType]
	if (!kind) return null
	if (kind.ignored.some((g) => globMatch(g, path))) return 'ignored'
	if (kind.tracked.some((g) => globMatch(g, path))) return 'tracked'
	return null
}

// ─── the four-step resolution ─────────────────────────────────────────────────────────

export interface ResolveInput {
	root: string
	path: string
	artifactType?: string
	explicit?: Tracking
}

export interface ResolveResult {
	value: Tracking
	reason: string
}

export function resolveTracking(input: ResolveInput): ResolveResult {
	if (input.explicit) {
		return { value: input.explicit, reason: 'explicit override' }
	}
	const rules = loadIgnoreRules(input.root)
	const ignoreMatch = resolveFromIgnore(rules, input.path)
	if (ignoreMatch) {
		return { value: ignoreMatch, reason: '.sddignore' }
	}
	const kindDefault = resolveKindDefault(input.artifactType, input.path)
	if (kindDefault) {
		return { value: kindDefault, reason: `kind-default (${input.artifactType})` }
	}
	return { value: 'tracked', reason: 'fail-closed (no signal)' }
}

// ─── validate the ignore file (no --path given) ───────────────────────────────────────

export function validateIgnoreFile(root: string): { ok: boolean; message: string } {
	const path = join(root, '.agents', 'sdd', '.sddignore')
	if (!existsSync(path)) return { ok: true, message: '.sddignore OK (absent, fine)' }
	const text = readFileSync(path, 'utf8')
	const notes: string[] = []
	const lines = text.split('\n')
	lines.forEach((raw, i) => {
		if (parseIgnoreLine(raw) === null) {
			notes.push(`line ${i + 1}: not a valid gitignore pattern: ${raw.trim()}`)
		}
	})
	if (notes.length > 0) {
		return { ok: false, message: notes.join('\n') }
	}
	const loaded = parseIgnoreFile(text).length
	return { ok: true, message: `.sddignore OK (${loaded} rule(s))` }
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
		const result = validateIgnoreFile(root)
		process.stdout.write(`${result.message}\n`)
		if (!result.ok) process.exitCode = 1
		return
	}

	const explicit = args.explicit === 'tracked' || args.explicit === 'ignored' ? args.explicit : undefined
	const result = resolveTracking({ root, path: args.path, artifactType: args['artifact-type'], explicit })
	process.stdout.write(`${result.value}\n`)
	process.stdout.write(`reason: ${result.reason}\n`)
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	main(process.argv.slice(2))
}
