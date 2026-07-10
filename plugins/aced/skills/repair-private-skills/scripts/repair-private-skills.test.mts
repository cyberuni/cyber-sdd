import assert from 'node:assert/strict'
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ensureInternalMetadata, main, repairPrivateSkills, validatePrivateSkills } from './repair-private-skills.mts'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'repair-private-skills-'))
}

function withTempRepo(check: (root: string) => void): void {
	const root = tmp()
	try {
		check(root)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
}

function writeSkill(dir: string, name: string, body: string): void {
	const skillDir = join(dir, '.agents', 'skills', name)
	mkdirSync(skillDir, { recursive: true })
	writeFileSync(join(skillDir, 'SKILL.md'), body)
}

function snapshot(dir: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(join(dir, rel), { withFileTypes: true })
		} catch {
			return
		}
		for (const e of entries) {
			const child = rel ? `${rel}/${e.name}` : e.name
			out.push(child)
			if (e.isDirectory() && !e.isSymbolicLink()) walk(child)
		}
	}
	walk('')
	return out.sort()
}

// ── reach (documented here; the routing behavior itself lives in the manage gateway skill) ──

test('reach: this module exports only the validate/repair engine, no user-invocation trigger', () => {
	// The engine is a plain module with pure functions + main(argv); the manage gateway is what
	// decides to load it. This test documents that the file itself carries no self-trigger.
	assert.equal(typeof validatePrivateSkills, 'function')
	assert.equal(typeof repairPrivateSkills, 'function')
})

// ── validate (read-only) ──

test('validate flags a repo-private entry that symlinks into the public skills tree', () => {
	withTempRepo((root) => {
		const publicSkillDir = join(root, 'skills', 'create-skill')
		mkdirSync(publicSkillDir, { recursive: true })
		writeFileSync(join(publicSkillDir, 'SKILL.md'), '---\nname: create-skill\ndescription: x\n---\n')
		const privateSkillsDir = join(root, '.agents', 'skills')
		mkdirSync(privateSkillsDir, { recursive: true })
		symlinkSync(publicSkillDir, join(privateSkillsDir, 'create-skill'))

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, false)
		assert.ok(result.issues.some((i) => i.issue === 'public_skill_symlink' && i.skill === 'create-skill'))
	})
})

test('validate flags a repo-private entry with no SKILL.md and no augmentation file', () => {
	withTempRepo((root) => {
		const skillDir = join(root, '.agents', 'skills', 'empty-dir')
		mkdirSync(skillDir, { recursive: true })

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, false)
		assert.ok(result.issues.some((i) => i.issue === 'missing_skill_file' && i.skill === 'empty-dir'))
	})
})

test('validate allows an augmentation-only directory with no SKILL.md', () => {
	withTempRepo((root) => {
		const skillDir = join(root, '.agents', 'skills', 'commit-work')
		mkdirSync(skillDir, { recursive: true })
		writeFileSync(join(skillDir, 'SKILL.local.md'), '# local augmentation\n')

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, true)
		assert.equal(result.issues.length, 0)
	})
})

test('validate allows a SKILL.project.md-only augmentation directory too', () => {
	withTempRepo((root) => {
		const skillDir = join(root, '.agents', 'skills', 'commit-work')
		mkdirSync(skillDir, { recursive: true })
		writeFileSync(join(skillDir, 'SKILL.project.md'), '# project augmentation\n')

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, true)
		assert.equal(result.issues.length, 0)
	})
})

test('validate flags a SKILL.md missing YAML frontmatter', () => {
	withTempRepo((root) => {
		writeSkill(root, 'no-frontmatter', '# Just a heading\n\nNo frontmatter here.\n')

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, false)
		assert.ok(result.issues.some((i) => i.issue === 'missing_frontmatter' && i.skill === 'no-frontmatter'))
	})
})

test('validate flags a SKILL.md missing metadata.internal true', () => {
	withTempRepo((root) => {
		writeSkill(root, 'audit-skill', '---\nname: audit-skill\ndescription: "Use this skill when testing."\n---\n')

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, false)
		assert.ok(result.issues.some((i) => i.issue === 'missing_metadata_internal' && i.skill === 'audit-skill'))
	})
})

test('validate reports ok when every entry passes all checks', () => {
	withTempRepo((root) => {
		writeSkill(root, 'audit-skill', '---\nname: audit-skill\ndescription: x\nmetadata:\n  internal: true\n---\n')

		const result = validatePrivateSkills(root)

		assert.equal(result.ok, true)
		assert.equal(result.issues.length, 0)
	})
})

test('validate makes no filesystem changes', () => {
	withTempRepo((root) => {
		const publicSkillDir = join(root, 'skills', 'create-skill')
		mkdirSync(publicSkillDir, { recursive: true })
		writeFileSync(join(publicSkillDir, 'SKILL.md'), '---\nname: create-skill\ndescription: x\n---\n')
		const privateSkillsDir = join(root, '.agents', 'skills')
		mkdirSync(privateSkillsDir, { recursive: true })
		symlinkSync(publicSkillDir, join(privateSkillsDir, 'create-skill'))
		writeSkill(root, 'no-frontmatter', '# heading only\n')
		writeSkill(root, 'missing-metadata', '---\nname: missing-metadata\ndescription: x\n---\n')
		mkdirSync(join(privateSkillsDir, 'empty-dir'), { recursive: true })

		const before = snapshot(root)
		const beforeContents = new Map(
			before
				.filter(
					(p) =>
						existsSync(join(root, p)) &&
						!lstatSync(join(root, p)).isSymbolicLink() &&
						!lstatSync(join(root, p)).isDirectory(),
				)
				.map((p) => [p, readFileSync(join(root, p), 'utf8')]),
		)

		const result = validatePrivateSkills(root)

		const after = snapshot(root)
		assert.deepEqual(after, before)
		for (const [p, content] of beforeContents) {
			assert.equal(readFileSync(join(root, p), 'utf8'), content)
		}
		assert.ok(result.issues.length > 0)
	})
})

// ── repair (writes) ──

test('repair deletes a stray symlink resolving into the public skills tree', () => {
	withTempRepo((root) => {
		const publicSkillDir = join(root, 'skills', 'create-skill')
		mkdirSync(publicSkillDir, { recursive: true })
		writeFileSync(join(publicSkillDir, 'SKILL.md'), '---\nname: create-skill\ndescription: x\n---\n')
		const privateSkillsDir = join(root, '.agents', 'skills')
		mkdirSync(privateSkillsDir, { recursive: true })
		symlinkSync(publicSkillDir, join(privateSkillsDir, 'create-skill'))

		const result = repairPrivateSkills(root)

		assert.equal(result.changed, true)
		assert.ok(result.actions.some((a) => a.action === 'removed_public_symlink' && a.skill === 'create-skill'))
		assert.equal(existsSync(join(privateSkillsDir, 'create-skill')), false)
	})
})

test('repair inserts metadata.internal true into a SKILL.md missing it', () => {
	withTempRepo((root) => {
		writeSkill(
			root,
			'audit-skill',
			'---\nname: audit-skill\ndescription: "Use this skill when testing."\n---\n\n# Audit\n',
		)

		const result = repairPrivateSkills(root)
		const updated = readFileSync(join(root, '.agents', 'skills', 'audit-skill', 'SKILL.md'), 'utf8')

		assert.equal(result.changed, true)
		assert.ok(result.actions.some((a) => a.action === 'updated_metadata' && a.skill === 'audit-skill'))
		assert.ok(updated.includes('metadata:\n  internal: true'))
	})
})

test('repair leaves a SKILL.md that already declares metadata.internal true unchanged', () => {
	withTempRepo((root) => {
		const body = '---\nname: audit-skill\ndescription: x\nmetadata:\n  internal: true\n---\n'
		writeSkill(root, 'audit-skill', body)

		const result = repairPrivateSkills(root)
		const after = readFileSync(join(root, '.agents', 'skills', 'audit-skill', 'SKILL.md'), 'utf8')

		assert.equal(after, body)
		assert.ok(result.actions.some((a) => a.action === 'already_internal' && a.skill === 'audit-skill'))
	})
})

test('repair skips an augmentation-only directory with no SKILL.md', () => {
	withTempRepo((root) => {
		const skillDir = join(root, '.agents', 'skills', 'commit-work')
		mkdirSync(skillDir, { recursive: true })
		writeFileSync(join(skillDir, 'SKILL.local.md'), '# local augmentation\n')

		const before = snapshot(root)
		const result = repairPrivateSkills(root)
		const after = snapshot(root)

		assert.deepEqual(after, before)
		assert.ok(result.actions.some((a) => a.action === 'local_augmentation_only' && a.skill === 'commit-work'))
	})
})

test('repair skips a SKILL.md missing frontmatter', () => {
	withTempRepo((root) => {
		const body = '# Just a heading\n\nNo frontmatter here.\n'
		writeSkill(root, 'no-frontmatter', body)

		const result = repairPrivateSkills(root)
		const after = readFileSync(join(root, '.agents', 'skills', 'no-frontmatter', 'SKILL.md'), 'utf8')

		assert.equal(after, body)
		assert.ok(result.actions.some((a) => a.action === 'skipped_no_frontmatter' && a.skill === 'no-frontmatter'))
	})
})

test("repair's writes are confined to .agents/skills", () => {
	withTempRepo((root) => {
		const publicSkillDir = join(root, 'skills', 'create-skill')
		mkdirSync(publicSkillDir, { recursive: true })
		writeFileSync(join(publicSkillDir, 'SKILL.md'), '---\nname: create-skill\ndescription: x\n---\n')
		const publicSkillsBefore = snapshot(join(root, 'skills'))
		const publicSkillMdBefore = readFileSync(join(publicSkillDir, 'SKILL.md'), 'utf8')

		const privateSkillsDir = join(root, '.agents', 'skills')
		mkdirSync(privateSkillsDir, { recursive: true })
		symlinkSync(publicSkillDir, join(privateSkillsDir, 'create-skill'))
		writeSkill(root, 'audit-skill', '---\nname: audit-skill\ndescription: x\n---\n')

		const result = repairPrivateSkills(root)

		// public tree untouched
		assert.deepEqual(snapshot(join(root, 'skills')), publicSkillsBefore)
		assert.equal(readFileSync(join(publicSkillDir, 'SKILL.md'), 'utf8'), publicSkillMdBefore)
		assert.equal(existsSync(publicSkillDir), true)

		// writes happened, and only under .agents/skills
		assert.equal(result.changed, true)
		assert.equal(existsSync(join(privateSkillsDir, 'create-skill')), false)
		assert.ok(
			readFileSync(join(privateSkillsDir, 'audit-skill', 'SKILL.md'), 'utf8').includes('metadata:\n  internal: true'),
		)
	})
})

// ── ensureInternalMetadata (pure helper) ──

test('ensureInternalMetadata is a no-op for content with no frontmatter delimiter', () => {
	const r = ensureInternalMetadata('# heading only\n')
	assert.equal(r.changed, false)
})

test('ensureInternalMetadata inserts under an existing metadata: block, preserving other keys', () => {
	const r = ensureInternalMetadata('---\nname: x\nmetadata:\n  foo: bar\n---\n')
	assert.equal(r.changed, true)
	assert.ok(
		r.content.includes('metadata:\n  internal: true\n  foo: bar') ||
			r.content.includes('metadata:\n  foo: bar\n  internal: true'),
	)
})

// ── main (CLI) ──

function captureMain(argv: string[]): { code: number; out: string } {
	const writes: string[] = []
	const original = process.stdout.write
	process.stdout.write = ((chunk: string) => {
		writes.push(String(chunk))
		return true
	}) as typeof process.stdout.write
	try {
		return { code: main(argv), out: writes.join('') }
	} finally {
		process.stdout.write = original
	}
}

test('main validate returns nonzero when issues exist, zero when clean', () => {
	withTempRepo((root) => {
		writeSkill(root, 'no-frontmatter', '# heading only\n')
		const dirty = captureMain(['--root', root, 'validate'])
		assert.equal(dirty.code, 1)

		const cleanRoot = tmp()
		try {
			const clean = captureMain(['--root', cleanRoot, 'validate'])
			assert.equal(clean.code, 0)
		} finally {
			rmSync(cleanRoot, { recursive: true, force: true })
		}
	})
})

test('main validate --format json emits parseable JSON and makes no writes', () => {
	withTempRepo((root) => {
		writeSkill(root, 'audit-skill', '---\nname: audit-skill\ndescription: x\n---\n')
		const before = snapshot(root)
		const { code, out } = captureMain(['--root', root, 'validate', '--format', 'json'])
		const after = snapshot(root)
		assert.deepEqual(after, before)
		const parsed = JSON.parse(out)
		assert.equal(parsed.ok, false)
		assert.equal(code, 1)
	})
})

test('main repair writes fixes and returns 0', () => {
	withTempRepo((root) => {
		writeSkill(root, 'audit-skill', '---\nname: audit-skill\ndescription: x\n---\n')
		const { code } = captureMain(['--root', root, 'repair'])
		assert.equal(code, 0)
		const updated = readFileSync(join(root, '.agents', 'skills', 'audit-skill', 'SKILL.md'), 'utf8')
		assert.ok(updated.includes('metadata:\n  internal: true'))
	})
})

test('main with no recognized operation prints usage and returns 1', () => {
	const { code, out } = captureMain(['--root', '.'])
	assert.equal(code, 1)
	assert.match(out, /usage:/)
})
