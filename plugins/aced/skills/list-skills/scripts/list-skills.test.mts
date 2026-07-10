import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { getPackageRoot, globToRegExp, isPackageManaged, listSkills, readSkillManifest } from './list-skills.mts'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'list-skills-'))
}

function mkSkill(
	dir: string,
	name: string,
	opts: { skillName?: string; description?: string; noFrontmatterName?: boolean; manifest?: object } = {},
): void {
	mkdirSync(dir, { recursive: true })
	const skillName = opts.noFrontmatterName ? undefined : (opts.skillName ?? name)
	const description = opts.description ?? `${name} skill.`
	const fm = skillName ? `name: ${skillName}\ndescription: ${description}\n` : `description: ${description}\n`
	writeFileSync(join(dir, 'SKILL.md'), `---\n${fm}---\n`)
	if (opts.manifest) writeFileSync(join(dir, 'skill.json'), JSON.stringify(opts.manifest))
}

// ── source scan ──

test('discovery scans the repo-private skills directory (.agents/skills)', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'private-one'), 'private-one')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const found = skills.find((s) => s.name === 'private-one')
		assert.ok(found)
		assert.equal(found?.foundIn, 'repo')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('discovery scans the repo-public skills directory (skills/)', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, 'skills', 'public-one'), 'public-one')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const found = skills.find((s) => s.name === 'public-one')
		assert.ok(found)
		assert.equal(found?.foundIn, 'repo')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('discovery scans the user-global skills directory (~/.agents/skills)', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(home, '.agents', 'skills', 'global-one'), 'global-one')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const found = skills.find((s) => s.name === 'global-one')
		assert.ok(found)
		assert.equal(found?.foundIn, 'global')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test("discovery scans the cyberplace package's shipped skills directory", () => {
	const root = tmp()
	const home = tmp()
	const packageRoot = tmp()
	try {
		mkSkill(join(packageRoot, 'skills', 'package-one'), 'package-one')
		const skills = listSkills(root, { home, packageRoot })
		const found = skills.find((s) => s.name === 'package-one')
		assert.ok(found)
		assert.equal(found?.foundIn, 'package')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
		rmSync(packageRoot, { recursive: true, force: true })
	}
})

test('only a directory containing a SKILL.md is reported as a skill', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkdirSync(join(root, '.agents', 'skills', 'no-manifest-dir'), { recursive: true })
		writeFileSync(join(root, '.agents', 'skills', 'no-manifest-dir', 'notes.txt'), 'not a skill')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		assert.equal(
			skills.find((s) => s.name === 'no-manifest-dir'),
			undefined,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── dedupe ──

test('a name found in more than one source is reported once, repo taking precedence', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'shared'), 'shared', { description: 'Repo copy.' })
		mkSkill(join(home, '.agents', 'skills', 'shared'), 'shared', { description: 'Global copy.' })
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const matches = skills.filter((s) => s.name === 'shared')
		assert.equal(matches.length, 1)
		assert.equal(matches[0]?.foundIn, 'repo')
		assert.equal(matches[0]?.description, 'Repo copy.')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── filter ──

test('globToRegExp compiles * and ? glob syntax to a full-match RegExp', () => {
	assert.equal(globToRegExp('init-*').test('init-commit-discipline'), true)
	assert.equal(globToRegExp('init-*').test('init'), false)
	assert.equal(globToRegExp('audit-skill').test('audit-skill'), true)
	assert.equal(globToRegExp('a?dit-skill').test('audit-skill'), true)
	assert.equal(globToRegExp('a?dit-skill').test('audxxit-skill'), false)
})

test('a glob-style --grep pattern restricts the report to matching skills', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'init-commit-discipline'), 'init-commit-discipline')
		mkSkill(join(root, '.agents', 'skills', 'audit-skill'), 'audit-skill')
		const skills = listSkills(root, { home, packageRoot: tmp(), grep: 'init-*' })
		assert.equal(
			skills.every((s) => s.name.startsWith('init-')),
			true,
		)
		assert.equal(
			skills.some((s) => s.name === 'init-commit-discipline'),
			true,
		)
		assert.equal(
			skills.some((s) => s.name === 'audit-skill'),
			false,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('omitting --grep reports every discovered skill', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'init-commit-discipline'), 'init-commit-discipline')
		mkSkill(join(root, '.agents', 'skills', 'audit-skill'), 'audit-skill')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		assert.equal(
			skills.some((s) => s.name === 'init-commit-discipline'),
			true,
		)
		assert.equal(
			skills.some((s) => s.name === 'audit-skill'),
			true,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── reported fields ──

test('each reported skill carries name, foundIn, and description', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'commit'), 'commit', { description: 'Commit discipline guidance.' })
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const found = skills.find((s) => s.name === 'commit')
		assert.deepEqual(found && { name: found.name, foundIn: found.foundIn, description: found.description }, {
			name: 'commit',
			foundIn: 'repo',
			description: 'Commit discipline guidance.',
		})
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('a skill with no frontmatter name falls back to its directory name', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'directory-fallback'), 'directory-fallback', {
			noFrontmatterName: true,
		})
		const skills = listSkills(root, { home, packageRoot: tmp() })
		assert.ok(skills.find((s) => s.name === 'directory-fallback'))
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── package-managed ──

test('isPackageManaged is true only when distribution.install_via is package_manager', () => {
	assert.equal(isPackageManaged({ distribution: { install_via: 'package_manager' } }), true)
	assert.equal(isPackageManaged({ distribution: { install_via: 'git' } }), false)
	assert.equal(isPackageManaged(null), false)
	assert.equal(isPackageManaged({}), false)
})

test('a skill declaring package-manager distribution is reported as package-managed', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'managed-skill'), 'managed-skill', {
			manifest: { distribution: { install_via: 'package_manager', package: { name: 'foo' } } },
		})
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const found = skills.find((s) => s.name === 'managed-skill')
		assert.equal(found?.packageManaged, true)
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('a skill with no manifest or a non-package install path is not package-managed', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'no-manifest'), 'no-manifest')
		mkSkill(join(root, '.agents', 'skills', 'git-install'), 'git-install', {
			manifest: { distribution: { install_via: 'git' } },
		})
		const skills = listSkills(root, { home, packageRoot: tmp() })
		assert.equal(skills.find((s) => s.name === 'no-manifest')?.packageManaged, false)
		assert.equal(skills.find((s) => s.name === 'git-install')?.packageManaged, false)
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── output order ──

test('the reported skill list is sorted alphabetically by name', () => {
	const root = tmp()
	const home = tmp()
	try {
		mkSkill(join(root, '.agents', 'skills', 'zeta'), 'zeta')
		mkSkill(join(root, '.agents', 'skills', 'alpha'), 'alpha')
		mkSkill(join(root, '.agents', 'skills', 'mid'), 'mid')
		const skills = listSkills(root, { home, packageRoot: tmp() })
		const names = skills.map((s) => s.name)
		assert.deepEqual(
			names,
			[...names].sort((a, b) => a.localeCompare(b)),
		)
		assert.deepEqual(names, ['alpha', 'mid', 'zeta'])
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── package root resolution (smoke) ──

test('getPackageRoot resolves a node_modules/cyberplace install over the repo fallback', () => {
	const root = tmp()
	try {
		const pkgDir = join(root, 'node_modules', 'cyberplace')
		mkdirSync(pkgDir, { recursive: true })
		writeFileSync(join(pkgDir, 'package.json'), '{"name":"cyberplace"}')
		assert.equal(getPackageRoot(root), pkgDir)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('readSkillManifest returns null for a missing or malformed skill.json', () => {
	const root = tmp()
	try {
		mkdirSync(join(root, 'a'), { recursive: true })
		assert.equal(readSkillManifest(join(root, 'a')), null)

		mkdirSync(join(root, 'b'), { recursive: true })
		writeFileSync(join(root, 'b', 'skill.json'), 'not json')
		assert.equal(readSkillManifest(join(root, 'b')), null)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
