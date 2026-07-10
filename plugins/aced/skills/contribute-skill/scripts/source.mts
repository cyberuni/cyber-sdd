#!/usr/bin/env node
// source — the concrete skill-source-resolution engine for contribute-skill. Given a skill name,
// answers where its upstream repo lives so the skill's "Locating the source repo" step never
// guesses: it walks a fixed precedence ladder — repo-local lock, then global lock, then
// `npx skills find` — and returns the FIRST hit; nothing downstream of a hit is consulted. When
// none of the three resolve, every field comes back null so the caller surfaces the gap to the
// user instead of fabricating an owner/repo.
//
// Resolution order (frozen, do not reorder):
//   1. <root>/skills-lock.json                — repo-local lock (version 1 schema)
//   2. <homeDir>/.agents/.skill-lock.json      — global lock (version 3 schema, carries sourceUrl)
//   3. `npx --yes skills find <skillName>`     — shells out, parses "owner/repo@skillName" hits
//   4. not found                                — source/sourceUrl/skillPath/foundIn all null
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps
// (the repo's node-≥23.6 convention). Imports node:* only.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface SkillSourceResult {
	name: string
	source: string | null
	sourceUrl: string | null
	skillPath: string | null
	foundIn: 'repo' | 'global' | 'npx-skills' | null
}

export type NpxFindFn = (skillName: string) => string

// ── lockfile reads ──

export function readLock(lockPath: string): Record<string, unknown> | null {
	if (!existsSync(lockPath)) return null
	try {
		return JSON.parse(readFileSync(lockPath, 'utf8'))
	} catch {
		return null
	}
}

// ── npx skills find output parsing ──

// Strips ANSI color codes, then scans for "owner/repo@skillName" tokens; returns the first whose
// found name equals skillName.
export function parseNpxSkillsOutput(raw: string, skillName: string): { source: string } | null {
	const ansiRe = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
	const clean = raw.replace(ansiRe, '')
	const regex = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9_-]+)/g
	let match: RegExpExecArray | null
	while ((match = regex.exec(clean)) !== null) {
		const [, ownerRepo, foundName] = match
		if (foundName === skillName) return { source: ownerRepo! }
	}
	return null
}

// Real shellout: `npx --yes skills find <skillName>`, combined stdout+stderr, empty on any
// failure (npx missing, timeout, non-zero exit with no parseable output).
export function defaultNpxFind(skillName: string): string {
	try {
		const result = spawnSync('npx', ['--yes', 'skills', 'find', skillName], {
			encoding: 'utf8',
			timeout: 4_000,
			env: { ...process.env, NO_COLOR: '1', CI: '1' },
		})
		return (result.stdout ?? '') + (result.stderr ?? '')
	} catch {
		return ''
	}
}

// ── resolution ladder ──

// Resolves a skill's source repo by walking repo-local lock -> global lock -> npx skills find,
// returning the FIRST hit (nothing downstream of a hit is consulted). `homeDir` and `npxFind` are
// injectable for deterministic node:test coverage; production callers can omit both.
export function findSkillSource(
	skillName: string,
	root: string,
	homeDir: string = homedir(),
	npxFind: NpxFindFn = defaultNpxFind,
): SkillSourceResult {
	const repoLock = readLock(join(root, 'skills-lock.json'))
	if (repoLock) {
		const entry = (repoLock as { skills?: Record<string, Record<string, string>> }).skills?.[skillName]
		if (entry?.source) {
			return {
				name: skillName,
				source: entry.source,
				sourceUrl: `https://github.com/${entry.source}`,
				skillPath: entry.skillPath ?? null,
				foundIn: 'repo',
			}
		}
	}

	const globalLock = readLock(join(homeDir, '.agents', '.skill-lock.json'))
	if (globalLock) {
		const entry = (globalLock as { skills?: Record<string, Record<string, string>> }).skills?.[skillName]
		if (entry?.source) {
			return {
				name: skillName,
				source: entry.source,
				sourceUrl: entry.sourceUrl ?? `https://github.com/${entry.source}`,
				skillPath: entry.skillPath ?? null,
				foundIn: 'global',
			}
		}
	}

	const out = npxFind(skillName)
	const parsed = parseNpxSkillsOutput(out, skillName)
	if (parsed) {
		return {
			name: skillName,
			source: parsed.source,
			sourceUrl: `https://github.com/${parsed.source}`,
			skillPath: `skills/${skillName}/SKILL.md`,
			foundIn: 'npx-skills',
		}
	}

	return {
		name: skillName,
		source: null,
		sourceUrl: null,
		skillPath: null,
		foundIn: null,
	}
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

// The lone positional arg: any token that isn't a known flag or a known flag's value.
function positional(argv: string[]): string | undefined {
	const consumed = new Set<number>()
	for (const name of ['--root', '--format']) {
		const i = argv.indexOf(name)
		if (i !== -1) {
			consumed.add(i)
			consumed.add(i + 1)
		}
	}
	for (let i = 0; i < argv.length; i++) {
		if (!consumed.has(i)) return argv[i]
	}
	return undefined
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const format = flag(argv, '--format') ?? 'text'
	const skillName = positional(argv)

	if (!skillName) {
		process.stdout.write('usage: source <skill-name> [--root <path>] [--format json|text]\n')
		return 1
	}

	const result = findSkillSource(skillName, root)

	if (format === 'json') {
		process.stdout.write(`${JSON.stringify(result)}\n`)
	} else {
		if (result.foundIn) {
			process.stdout.write(`${result.name}: ${result.source} (found in ${result.foundIn})\n`)
			if (result.skillPath) process.stdout.write(`  skillPath: ${result.skillPath}\n`)
			process.stdout.write(`  sourceUrl: ${result.sourceUrl}\n`)
		} else {
			process.stdout.write(`${result.name}: not found in repo lock, global lock, or npx skills find\n`)
		}
	}

	return result.foundIn ? 0 : 1
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
