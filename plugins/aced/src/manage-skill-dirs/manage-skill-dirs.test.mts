import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	addSkillDir,
	editSkillDir,
	FIXED_SKILL_DIRS,
	inducePatterns,
	isFixedConvention,
	isValidPattern,
	listSkillDirs,
	main,
	parseSkillDirsToml,
	previewPattern,
	readCustomSkillDirs,
	removeSkillDir,
	serializeSkillDirs,
} from './manage-skill-dirs.mts'

// NOTE: the one @rubric scenario in the frozen .feature ("the manage skill previews the effect and
// confirms before it persists a new pattern") is agentic — judged by hand / ACED against the skill's
// behavior, not this script's output. No node:test covers it.

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'skill-dirs-'))
}

function seedSkill(dir: string, rel: string): void {
	const full = join(dir, rel, 'SKILL.md')
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, '---\nname: x\ndescription: "x"\n---\n\n# body\n')
}

function seedConfig(dir: string, patterns: string[]): void {
	const full = join(dir, '.agents/aced/skill-dirs.toml')
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, serializeSkillDirs(patterns))
}

// ── the config format ──

test('parseSkillDirsToml reads the anchors array; absent array yields []', () => {
	assert.deepEqual(parseSkillDirsToml('anchors = [\n  "plugins/*/skills",\n  "curriculum/**",\n]\n'), [
		'plugins/*/skills',
		'curriculum/**',
	])
	assert.deepEqual(parseSkillDirsToml('# nothing here\n'), [])
})

test('a skill-dir pattern names a directory whose children are scanned for a SKILL.md', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'plugins/aced/skills/manage-skill-dirs')
		const r = previewPattern(dir, 'plugins/aced/skills')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches.map((m) => m.path), ['plugins/aced/skills/manage-skill-dirs/SKILL.md'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a ** segment globs zero or more directory levels, any depth including zero', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'archive/one') // ** matches zero levels here
		seedSkill(dir, 'archive/2024/q1/two')
		seedSkill(dir, 'archive/2024/q2/deep/three')
		seedSkill(dir, 'other/four') // outside the anchor root — must not match
		const r = previewPattern(dir, 'archive/**')
		assert.ok(r.ok)
		assert.deepEqual(
			r.ok && r.matches.map((m) => m.path).sort(),
			['archive/2024/q1/two/SKILL.md', 'archive/2024/q2/deep/three/SKILL.md', 'archive/one/SKILL.md'].sort(),
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('readCustomSkillDirs yields [] when there is no config file', () => {
	const dir = tmp()
	try {
		assert.deepEqual(readCustomSkillDirs(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── list ──

test('list shows the two fixed default roots each with an explanation', () => {
	const dir = tmp()
	try {
		const fixed = listSkillDirs(dir).filter((a) => a.kind === 'fixed')
		assert.equal(fixed.length, 2)
		assert.equal(fixed.length, FIXED_SKILL_DIRS.length)
		assert.ok(fixed.every((a) => a.explanation.length > 0))
		assert.deepEqual(
			fixed.map((a) => a.pattern),
			['skills/', '.agents/skills/'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('list shows the custom patterns from the config alongside the fixed defaults', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['plugins/*/skills', 'packages/*/skills'])
		const all = listSkillDirs(dir)
		assert.deepEqual(
			all.filter((a) => a.kind === 'custom').map((a) => a.pattern),
			['plugins/*/skills', 'packages/*/skills'],
		)
		assert.equal(all.filter((a) => a.kind === 'fixed').length, 2)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── CRUD ──

test('add writes a new custom pattern to the config', () => {
	const dir = tmp()
	try {
		seedConfig(dir, [])
		const r = addSkillDir(dir, 'plugins/*/skills')
		assert.ok(r.ok && r.changed)
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add creates the config file when none exists', () => {
	const dir = tmp()
	try {
		assert.equal(existsSync(join(dir, '.agents/aced/skill-dirs.toml')), false)
		assert.ok(addSkillDir(dir, 'plugins/*/skills').ok)
		assert.ok(existsSync(join(dir, '.agents/aced/skill-dirs.toml')))
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('remove deletes a custom pattern from the config', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['plugins/*/skills', 'keep/**'])
		assert.ok(removeSkillDir(dir, 'plugins/*/skills').ok)
		assert.deepEqual(readCustomSkillDirs(dir), ['keep/**'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('edit replaces one custom pattern with another', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['old/*/skills'])
		assert.ok(editSkillDir(dir, 'old/*/skills', 'new/*/skills').ok)
		assert.deepEqual(readCustomSkillDirs(dir), ['new/*/skills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add of an already-present pattern is a no-op — nothing added, no duplicate', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['plugins/*/skills'])
		const r = addSkillDir(dir, 'plugins/*/skills')
		assert.ok(r.ok && !r.changed)
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('remove of a pattern absent from the config is a no-op reporting nothing changed', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['keep/**'])
		const before = readFileSync(join(dir, '.agents/aced/skill-dirs.toml'), 'utf8')
		const r = removeSkillDir(dir, 'not-there')
		assert.ok(r.ok && !r.changed)
		assert.equal(readFileSync(join(dir, '.agents/aced/skill-dirs.toml'), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('edit of a pattern absent from the config is a no-op reporting nothing changed', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['keep/**'])
		const r = editSkillDir(dir, 'not-there', 'new/**')
		assert.equal(r.ok, false)
		assert.deepEqual(readCustomSkillDirs(dir), ['keep/**'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a fixed default root cannot be added, edited, or removed', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['plugins/*/skills'])
		assert.equal(addSkillDir(dir, 'skills').ok, false)
		assert.equal(addSkillDir(dir, '.agents/skills').ok, false)
		assert.equal(editSkillDir(dir, 'plugins/*/skills', 'skills').ok, false)
		assert.ok(isFixedConvention('skills'))
		assert.ok(isFixedConvention('.agents/skills'))
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills']) // unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('adding an invalid pattern is rejected before it is persisted', () => {
	const dir = tmp()
	try {
		seedConfig(dir, [])
		assert.equal(isValidPattern('../escape'), false)
		assert.equal(addSkillDir(dir, '../escape').ok, false)
		assert.equal(addSkillDir(dir, '/absolute').ok, false)
		assert.equal(addSkillDir(dir, 'a/<project>/b').ok, false)
		assert.deepEqual(readCustomSkillDirs(dir), []) // config unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a pattern containing < or > is rejected — no capture token in this grammar', () => {
	assert.equal(isValidPattern('plugins/<project>/skills'), false)
	assert.equal(isValidPattern('a/<b>/c'), false)
})

test('editing a custom pattern to a malformed one is rejected and the config is unchanged', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['good/**'])
		assert.equal(editSkillDir(dir, 'good/**', '../bad').ok, false)
		assert.deepEqual(readCustomSkillDirs(dir), ['good/**'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── induce ──

test('induce offers a literal directory candidate for a sample path', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'plugins/aced/skills/manage-skill-dirs')
		const r = inducePatterns(dir, 'plugins/aced/skills')
		assert.ok(r.ok)
		assert.ok(r.ok && r.candidates.includes('plugins/aced/skills'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('induce offers a * generalization replacing a variable segment such as a plugin name', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'plugins/aced/skills/manage-skill-dirs')
		const r = inducePatterns(dir, 'plugins/aced/skills')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.candidates, ['plugins/aced/skills', 'plugins/*/skills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('induce offers only the literal candidate when the sample path has no variable segment', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'topskills/manage-skill-dirs')
		const r = inducePatterns(dir, 'topskills')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.candidates, ['topskills'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('induce rejects a sample path that does not resolve inside the repo', () => {
	const dir = tmp()
	try {
		assert.equal(inducePatterns(dir, 'does/not/exist').ok, false)
		assert.equal(inducePatterns(dir, '../outside').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── preview ──

test('preview lists the SKILL.md file(s) a candidate pattern would discover', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'plugins/aced/skills/manage-skill-dirs')
		seedSkill(dir, 'plugins/aced/skills/improve-skill')
		const r = previewPattern(dir, 'plugins/aced/skills')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches.map((m) => [m.path, m.name]), [
			['plugins/aced/skills/improve-skill/SKILL.md', 'improve-skill'],
			['plugins/aced/skills/manage-skill-dirs/SKILL.md', 'manage-skill-dirs'],
		])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview does not persist the candidate pattern', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'source/skills/a')
		previewPattern(dir, 'source/skills')
		assert.equal(existsSync(join(dir, '.agents/aced/skill-dirs.toml')), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview of a pattern that matches no skill reports an empty match', () => {
	const dir = tmp()
	try {
		const r = previewPattern(dir, 'nowhere/*')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches, [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview rejects a malformed candidate pattern', () => {
	const dir = tmp()
	try {
		assert.equal(previewPattern(dir, '../bad').ok, false)
		assert.equal(previewPattern(dir, 'a/<bogus>').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── boundary: curation writes ONLY the config ──

// Snapshot every file under dir (relative paths).
function snapshot(dir: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
			const child = rel ? `${rel}/${e.name}` : e.name
			if (e.isDirectory()) walk(child)
			else out.push(child)
		}
	}
	walk('')
	return out.sort()
}

test('curation writes only .agents/aced/skill-dirs.toml — no other file is touched', () => {
	const dir = tmp()
	try {
		seedSkill(dir, 'source/skills/a') // pre-existing, unrelated files
		const before = snapshot(dir).filter((f) => f !== '.agents/aced/skill-dirs.toml')
		addSkillDir(dir, 'source/skills')
		editSkillDir(dir, 'source/skills', 'source2/skills')
		removeSkillDir(dir, 'source2/skills')
		previewPattern(dir, 'source/skills')
		inducePatterns(dir, 'source/skills')
		const after = snapshot(dir).filter((f) => f !== '.agents/aced/skill-dirs.toml')
		assert.deepEqual(after, before) // every non-config file is untouched
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
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

test('main --list prints the fixed default roots and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--list'])
		assert.equal(code, 0)
		assert.match(out, /\[fixed\] skills\//)
		assert.match(out, /\[fixed\] \.agents\/skills\//)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --add persists a valid pattern (0) and refuses an invalid one (1)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--add', 'plugins/*/skills']).code, 0)
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills'])
		assert.equal(captureMain(['--root', dir, '--add', '../escape']).code, 1)
		assert.deepEqual(readCustomSkillDirs(dir), ['plugins/*/skills']) // unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --preview reports the empty match and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--preview', 'nowhere/*'])
		assert.equal(code, 0)
		assert.match(out, /matches no skill/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
