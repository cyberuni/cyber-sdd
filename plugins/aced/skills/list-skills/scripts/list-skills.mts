#!/usr/bin/env node
// list-skills — the concrete discovery engine for the ACED `manage` gateway's skill inventory. It
// scans the four fixed skill sources — repo-private (.agents/skills), repo-public (skills/),
// user-global (~/.agents/skills), and the cyberplace package's shipped skills dir — dedupes by
// name (repo takes precedence over global/package), applies an optional --grep glob filter, and
// reports each surviving skill's name, foundIn source, description, and package-managed status.
//
// Read-only: it never writes a SKILL.md, a manifest, or any other file. Validating or repairing
// skill content is a different engine's job; this one only inventories what is installed.
//
// Ported from packages/cyberplace/src/skill/list.ts + manifest.ts + hook/package-root.ts, folded
// into one self-contained file per the repo's node-≥23.6 / no-deps convention (import ONLY
// node:*). Pure functions are exported for node:test; running the file directly drives the CLI.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── package root (inlined + adapted from hook/package-root.ts) ──

// Walks up from a starting directory until a package.json is found. Mirrors the cyberplace CLI's
// original getPackageRoot algorithm, used here as the last-resort candidate.
function walkUpForPackageJson(startDir: string): string | undefined {
	let dir = startDir
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, 'package.json'))) return dir
		dir = dirname(dir)
	}
	return undefined
}

// Locates the cyberplace package's root — the source of its shipped `skills/` directory (the
// "package" scan source). This script is not itself bundled inside cyberplace, so it cannot rely
// on walking up from its own module location the way the original CLI helper did; instead it
// tries, in order: an installed dependency under the scanned repo's node_modules, this monorepo's
// own packages/cyberplace workspace sibling, then falls back to walking up from this module's own
// file location (covering the case this script is ever vendored inside the package itself).
// Never throws — an unresolved package root simply yields no "package" source skills.
export function getPackageRoot(root = '.'): string {
	const candidates = [join(root, 'node_modules', 'cyberplace'), join(root, 'packages', 'cyberplace')]
	for (const candidate of candidates) {
		if (existsSync(join(candidate, 'package.json'))) return candidate
	}
	return walkUpForPackageJson(dirname(fileURLToPath(import.meta.url))) ?? root
}

// ── skill manifest (inlined from skill/manifest.ts) ──

export interface SkillManifest {
	distribution?: {
		install_via: string
		package?: { name: string; bin?: string }
	}
}

// Reads a skill directory's skill.json, if present. Returns null when absent or malformed —
// package-managed status then defaults to false, never throws.
export function readSkillManifest(skillDir: string): SkillManifest | null {
	const filePath = join(skillDir, 'skill.json')
	if (!existsSync(filePath)) return null
	try {
		return JSON.parse(readFileSync(filePath, 'utf8')) as SkillManifest
	} catch {
		return null
	}
}

export function isPackageManaged(manifest: SkillManifest | null): boolean {
	return manifest?.distribution?.install_via === 'package_manager'
}

// ── discovery (inlined + extended from skill/list.ts) ──

export type SkillLocation = 'repo' | 'global' | 'package'

export interface SkillSummary {
	name: string
	description: string
	foundIn: SkillLocation
	packageManaged: boolean
}

function parseFrontmatter(content: string): { name: string; description: string } {
	const lines = content.split('\n')
	let fmCount = 0
	let name = ''
	let description = ''

	for (const line of lines) {
		if (line.trim() === '---') {
			fmCount++
			if (fmCount === 2) break
			continue
		}
		if (fmCount !== 1) continue

		const nameMatch = line.match(/^name:\s*(.+)/)
		if (nameMatch) name = nameMatch[1]!.trim().replace(/^["']|["']$/g, '')

		const descMatch = line.match(/^description:\s*(.+)/)
		if (descMatch) description = descMatch[1]!.trim().replace(/^["']|["']$/g, '')
	}

	return { name, description }
}

// Compile a `*`/`?` glob pattern (name-only, no path separators) into a full-match RegExp.
export function globToRegExp(pattern: string): RegExp {
	let regex = ''
	for (const char of pattern) {
		if (char === '*') regex += '.*'
		else if (char === '?') regex += '.'
		else if (/[.+^${}()|[\]\\]/.test(char)) regex += `\\${char}`
		else regex += char
	}
	return new RegExp(`^${regex}$`)
}

function collectSkillsFromDir(dir: string, foundIn: SkillLocation): SkillSummary[] {
	if (!existsSync(dir)) return []

	const results: SkillSummary[] = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue

		const skillDir = join(dir, entry.name)
		const skillFile = join(skillDir, 'SKILL.md')
		if (!existsSync(skillFile)) continue

		const { name, description } = parseFrontmatter(readFileSync(skillFile, 'utf8'))
		results.push({
			name: name || entry.name,
			description,
			foundIn,
			packageManaged: isPackageManaged(readSkillManifest(skillDir)),
		})
	}

	return results
}

export interface ListSkillsOptions {
	grep?: string
	home?: string
	packageRoot?: string
}

// Scan the four fixed sources, dedupe by name (repo > global > package, matching scan order),
// apply the optional --grep glob filter, and return the surviving skills sorted alphabetically.
export function listSkills(root: string, options: ListSkillsOptions = {}): SkillSummary[] {
	const grep = options.grep ? globToRegExp(options.grep) : undefined
	const home = options.home ?? homedir()
	const packageRoot = options.packageRoot ?? getPackageRoot(root)

	const sources: { dir: string; foundIn: SkillLocation }[] = [
		{ dir: join(root, '.agents', 'skills'), foundIn: 'repo' },
		{ dir: join(root, 'skills'), foundIn: 'repo' },
		{ dir: join(home, '.agents', 'skills'), foundIn: 'global' },
		{ dir: join(packageRoot, 'skills'), foundIn: 'package' },
	]

	const seen = new Set<string>()
	const results: SkillSummary[] = []

	for (const { dir, foundIn } of sources) {
		for (const skill of collectSkillsFromDir(dir, foundIn)) {
			if (seen.has(skill.name)) continue
			if (grep && !grep.test(skill.name)) continue

			seen.add(skill.name)
			results.push(skill)
		}
	}

	return results.sort((a, b) => a.name.localeCompare(b.name))
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

function formatText(skills: SkillSummary[]): string {
	if (skills.length === 0) return 'No skills found.'
	return skills
		.map((s) => `${s.name}  [${s.foundIn}]${s.packageManaged ? ' (package-managed)' : ''}\n  ${s.description}`)
		.join('\n')
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const grep = flag(argv, '--grep')
	const format = flag(argv, '--format') ?? 'text'

	const skills = listSkills(root, { grep })

	if (format === 'json') {
		process.stdout.write(`${JSON.stringify(skills, null, 2)}\n`)
	} else {
		process.stdout.write(`${formatText(skills)}\n`)
	}
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
