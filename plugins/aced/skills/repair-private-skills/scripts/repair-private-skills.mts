#!/usr/bin/env node
// repair-private-skills — the concrete validate/repair engine for repo-private skill hygiene under
// `.agents/skills`. Loaded in-session by the ACED `manage` gateway; not user-invocable.
//
// Checks each repo-private skill directory for two problems:
//   - a stray symlink resolving into the public `skills/` tree (should be a real repo-private dir)
//   - a SKILL.md missing `metadata.internal: true` in its YAML frontmatter
// A directory holding only SKILL.local.md / SKILL.project.md (no SKILL.md) is an augmentation-only
// entry and is never flagged.
//
// Operations:
//   validate   read-only; reports issues; makes NO filesystem changes; nonzero exit when issues exist
//   repair     writes fixes — deletes the stray symlink, inserts the missing metadata.internal: true
//
// Write boundary: repair writes/deletes ONLY under `.agents/skills` — it never creates, modifies, or
// deletes anything under the public `skills/` tree. validate performs no writes at all.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps (the
// repo's node-≥23.6 convention).

import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'

// ── shared shapes ──

export interface RepairAction {
	skill: string
	action:
		| 'removed_public_symlink'
		| 'updated_metadata'
		| 'already_internal'
		| 'local_augmentation_only'
		| 'skipped_missing_skill'
		| 'skipped_no_frontmatter'
	details?: string
}

export interface RepairResult {
	changed: boolean
	actions: RepairAction[]
}

export interface PrivateSkillIssue {
	skill: string
	issue: 'missing_metadata_internal' | 'public_skill_symlink' | 'missing_skill_file' | 'missing_frontmatter'
	details?: string
}

export interface PrivateSkillCheckResult {
	ok: boolean
	issues: PrivateSkillIssue[]
}

// ── frontmatter metadata.internal: true insertion (pure — never touches disk) ──

// Given a SKILL.md's raw content, returns whether metadata.internal: true is already present and,
// if not, the content with it inserted (under an existing `metadata:` block or a new one appended
// to the frontmatter). Content whose first line is not a `---` delimiter is returned unchanged.
export function ensureInternalMetadata(content: string): { changed: boolean; content: string } {
	const lines = content.split('\n')
	if (lines[0]?.trim() !== '---') return { changed: false, content }

	let endIndex = -1
	for (let i = 1; i < lines.length; i++) {
		if (lines[i]?.trim() === '---') {
			endIndex = i
			break
		}
	}
	if (endIndex === -1) return { changed: false, content }

	const frontmatter = lines.slice(1, endIndex)
	let metadataIndex = -1
	let metadataIndent = 0
	let hasInternal = false

	for (let i = 0; i < frontmatter.length; i++) {
		const line = frontmatter[i] ?? ''
		const metadataMatch = line.match(/^(\s*)metadata:\s*$/)
		if (metadataMatch) {
			metadataIndex = i
			metadataIndent = metadataMatch[1]?.length ?? 0
			for (let j = i + 1; j < frontmatter.length; j++) {
				const nested = frontmatter[j] ?? ''
				if (!nested.trim()) continue
				const indent = nested.match(/^(\s*)/)?.[1]?.length ?? 0
				if (indent <= metadataIndent) break
				if (/^\s*internal:\s*true\s*$/i.test(nested)) hasInternal = true
			}
			break
		}
	}

	if (hasInternal) return { changed: false, content }

	if (metadataIndex >= 0) {
		frontmatter.splice(metadataIndex + 1, 0, `${' '.repeat(metadataIndent + 2)}internal: true`)
	} else {
		frontmatter.push('metadata:', '  internal: true')
	}

	const updated = ['---', ...frontmatter, '---', ...lines.slice(endIndex + 1)].join('\n')
	return { changed: true, content: updated }
}

// Resolve the public skills tree's real path (handles a symlinked ancestor, e.g. macOS
// /var -> /private/var), falling back to the nominal path when it does not exist.
function resolvePublicSkillsDir(root: string): string {
	const publicSkillsDir = join(root, 'skills')
	return existsSync(publicSkillsDir) ? realpathSync(publicSkillsDir) : publicSkillsDir
}

// True when a repo-private entry's resolved target lives inside (or equals) the public skills tree.
function isPublicSkillSymlink(
	skillDir: string,
	entryName: string,
	resolvedPublicSkillsDir: string,
): { isSymlink: boolean; inPublicTree: boolean; resolved?: string } {
	const stat = lstatSync(skillDir)
	if (!stat.isSymbolicLink()) return { isSymlink: false, inPublicTree: false }
	const resolved = realpathSync(skillDir)
	const resolvedPublicSkillDir = join(resolvedPublicSkillsDir, entryName)
	const inPublicTree = resolved === resolvedPublicSkillDir || resolved.startsWith(`${resolvedPublicSkillsDir}${sep}`)
	return { isSymlink: true, inPublicTree, resolved }
}

// ── validate (read-only) ──

// Checks every repo-private skill under `.agents/skills` and reports issues. Makes NO filesystem
// changes — a missing `.agents/skills` directory is not an error (ok: true, no issues).
export function validatePrivateSkills(root: string): PrivateSkillCheckResult {
	const privateSkillsDir = join(root, '.agents', 'skills')
	const issues: PrivateSkillIssue[] = []

	if (!existsSync(privateSkillsDir)) return { ok: true, issues }

	const resolvedPublicSkillsDir = resolvePublicSkillsDir(root)

	for (const entry of readdirSync(privateSkillsDir, { withFileTypes: true })) {
		const skillDir = join(privateSkillsDir, entry.name)

		const symlinkCheck = isPublicSkillSymlink(skillDir, entry.name, resolvedPublicSkillsDir)
		if (symlinkCheck.isSymlink && symlinkCheck.inPublicTree) {
			issues.push({
				skill: entry.name,
				issue: 'public_skill_symlink',
				details: `${skillDir} -> ${symlinkCheck.resolved}`,
			})
			continue
		}

		const skillFile = join(skillDir, 'SKILL.md')
		if (!existsSync(skillFile)) {
			if (existsSync(join(skillDir, 'SKILL.local.md')) || existsSync(join(skillDir, 'SKILL.project.md'))) continue
			issues.push({ skill: entry.name, issue: 'missing_skill_file' })
			continue
		}

		const original = readFileSync(skillFile, 'utf8')
		if (original.split('\n')[0]?.trim() !== '---') {
			issues.push({ skill: entry.name, issue: 'missing_frontmatter' })
			continue
		}

		const metadata = ensureInternalMetadata(original)
		if (metadata.changed) {
			issues.push({ skill: entry.name, issue: 'missing_metadata_internal' })
		}
	}

	return { ok: issues.length === 0, issues }
}

// ── repair (writes) ──

// Fixes every repo-private skill under `.agents/skills`: deletes a stray public-tree symlink and
// inserts a missing `metadata.internal: true`. Every write/delete this makes is confined to
// `.agents/skills` — it never touches the public `skills/` tree.
export function repairPrivateSkills(root: string): RepairResult {
	const privateSkillsDir = join(root, '.agents', 'skills')
	const actions: RepairAction[] = []
	let changed = false

	if (!existsSync(privateSkillsDir)) return { changed: false, actions }

	const resolvedPublicSkillsDir = resolvePublicSkillsDir(root)

	for (const entry of readdirSync(privateSkillsDir, { withFileTypes: true })) {
		const skillDir = join(privateSkillsDir, entry.name)

		const symlinkCheck = isPublicSkillSymlink(skillDir, entry.name, resolvedPublicSkillsDir)
		if (symlinkCheck.isSymlink && symlinkCheck.inPublicTree) {
			unlinkSync(skillDir)
			actions.push({
				skill: entry.name,
				action: 'removed_public_symlink',
				details: `${skillDir} -> ${symlinkCheck.resolved}`,
			})
			changed = true
			continue
		}

		const skillFile = join(skillDir, 'SKILL.md')
		if (!existsSync(skillFile)) {
			if (existsSync(join(skillDir, 'SKILL.local.md')) || existsSync(join(skillDir, 'SKILL.project.md'))) {
				actions.push({ skill: entry.name, action: 'local_augmentation_only' })
				continue
			}
			actions.push({ skill: entry.name, action: 'skipped_missing_skill' })
			continue
		}

		const original = readFileSync(skillFile, 'utf8')
		if (original.split('\n')[0]?.trim() !== '---') {
			actions.push({ skill: entry.name, action: 'skipped_no_frontmatter' })
			continue
		}

		const updated = ensureInternalMetadata(original)
		if (updated.changed) {
			writeFileSync(skillFile, updated.content)
			actions.push({ skill: entry.name, action: 'updated_metadata' })
			changed = true
		} else {
			actions.push({ skill: entry.name, action: 'already_internal' })
		}
	}

	return { changed, actions }
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const json = flag(argv, '--format') === 'json'
	const w = (s: string) => process.stdout.write(`${s}\n`)

	if (argv.includes('validate')) {
		const result = validatePrivateSkills(root)
		if (json) {
			w(JSON.stringify(result))
		} else if (result.ok) {
			w('ok: no issues found')
		} else {
			for (const issue of result.issues) {
				w(`${issue.skill}: ${issue.issue}${issue.details ? ` (${issue.details})` : ''}`)
			}
		}
		return result.ok ? 0 : 1
	}

	if (argv.includes('repair')) {
		const result = repairPrivateSkills(root)
		if (json) {
			w(JSON.stringify(result))
		} else if (!result.changed) {
			w('no changes needed')
		} else {
			for (const action of result.actions) {
				w(`${action.skill}: ${action.action}${action.details ? ` (${action.details})` : ''}`)
			}
		}
		return 0
	}

	w('usage: repair-private-skills.mts [--root .] <validate|repair> [--format json]')
	return 1
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
