import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { findSkillSource, main, parseNpxSkillsOutput } from './source.mts'

function tmp(prefix: string): string {
	return mkdtempSync(join(tmpdir(), `source-${prefix}-`))
}

function writeRepoLock(root: string, skills: Record<string, Record<string, string>>): void {
	writeFileSync(join(root, 'skills-lock.json'), JSON.stringify({ version: 1, skills }))
}

function writeGlobalLock(homeDir: string, skills: Record<string, Record<string, string>>): void {
	const dir = join(homeDir, '.agents')
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, '.skill-lock.json'), JSON.stringify({ version: 3, skills }))
}

// A shellout stub that records whether it was called; only used for the npx-fallback path.
function neverCalled(): (skillName: string) => string {
	return (skillName: string) => {
		throw new Error(`npx skills find should not have been called for "${skillName}"`)
	}
}

// ── Locating the source repo (frozen contract) ──

test('the source repo is resolved from the repo-local lock before any other source', () => {
	const root = tmp('repo')
	const home = tmp('repo-home')
	try {
		writeRepoLock(root, {
			'audit-skill': { source: 'cyberuni/cyberplace', skillPath: 'skills/audit-skill/SKILL.md' },
		})
		// A DIFFERENT entry in the global lock proves repo-local wins, not "global happened to agree".
		writeGlobalLock(home, {
			'audit-skill': { source: 'someone-else/decoy', skillPath: 'skills/audit-skill/SKILL.md' },
		})

		const result = findSkillSource('audit-skill', root, home, neverCalled())

		assert.deepEqual(result, {
			name: 'audit-skill',
			source: 'cyberuni/cyberplace',
			sourceUrl: 'https://github.com/cyberuni/cyberplace',
			skillPath: 'skills/audit-skill/SKILL.md',
			foundIn: 'repo',
		})
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('the source repo falls back to the global lock when absent from the repo-local lock', () => {
	const root = tmp('noglock')
	const home = tmp('globalhome')
	try {
		// No skills-lock.json in root at all.
		writeGlobalLock(home, {
			'setup-github-repo': {
				source: 'repobuddy/repobuddy',
				sourceUrl: 'https://github.com/repobuddy/repobuddy',
				skillPath: 'skills/setup-github-repo/SKILL.md',
			},
		})

		const result = findSkillSource('setup-github-repo', root, home, neverCalled())

		assert.deepEqual(result, {
			name: 'setup-github-repo',
			source: 'repobuddy/repobuddy',
			sourceUrl: 'https://github.com/repobuddy/repobuddy',
			skillPath: 'skills/setup-github-repo/SKILL.md',
			foundIn: 'global',
		})
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('the source repo falls back to npx skills find when absent from both lockfiles', () => {
	const root = tmp('nolock')
	const home = tmp('nolockhome')
	try {
		let calledWith: string | undefined
		const npxFind = (skillName: string) => {
			calledWith = skillName
			return 'Found cyberuni/cyberplace@audit-skill\n'
		}

		const result = findSkillSource('audit-skill', root, home, npxFind)

		assert.equal(calledWith, 'audit-skill')
		assert.deepEqual(result, {
			name: 'audit-skill',
			source: 'cyberuni/cyberplace',
			sourceUrl: 'https://github.com/cyberuni/cyberplace',
			skillPath: 'skills/audit-skill/SKILL.md',
			foundIn: 'npx-skills',
		})
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

test('an unresolved source repo is surfaced (null fields) instead of guessed', () => {
	const root = tmp('miss')
	const home = tmp('misshome')
	try {
		const npxFind = () => 'not found\n'

		const result = findSkillSource('definitely-does-not-exist-xyz', root, home, npxFind)

		assert.deepEqual(result, {
			name: 'definitely-does-not-exist-xyz',
			source: null,
			sourceUrl: null,
			skillPath: null,
			foundIn: null,
		})
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── supporting unit coverage ──

test('parseNpxSkillsOutput strips ANSI codes and matches only the requested skill name', () => {
	const raw = `[32mFound[0m cyberuni/cyberplace@audit-skill\nother/repo@decoy-skill\n`
	assert.deepEqual(parseNpxSkillsOutput(raw, 'audit-skill'), { source: 'cyberuni/cyberplace' })
	assert.equal(parseNpxSkillsOutput(raw, 'nonexistent'), null)
})

test('a malformed repo-local lock file is treated as absent, not fatal', () => {
	const root = tmp('malformed')
	const home = tmp('malformedhome')
	try {
		writeFileSync(join(root, 'skills-lock.json'), '{ not valid json')
		const npxFind = () => 'Found cyberuni/cyberplace@audit-skill\n'

		const result = findSkillSource('audit-skill', root, home, npxFind)

		assert.equal(result.foundIn, 'npx-skills')
	} finally {
		rmSync(root, { recursive: true, force: true })
		rmSync(home, { recursive: true, force: true })
	}
})

// ── CLI ──

test('main --format json prints the resolved result and exits 0 on a hit', () => {
	const root = tmp('cli-hit')
	try {
		writeRepoLock(root, { 'audit-skill': { source: 'cyberuni/cyberplace', skillPath: 'skills/audit-skill/SKILL.md' } })

		const written: string[] = []
		const originalWrite = process.stdout.write.bind(process.stdout)
		// @ts-expect-error -- capturing stdout for assertion
		process.stdout.write = (chunk: string) => {
			written.push(chunk)
			return true
		}
		let code: number
		try {
			code = main(['audit-skill', '--root', root, '--format', 'json'])
		} finally {
			process.stdout.write = originalWrite
		}

		assert.equal(code, 0)
		const parsed = JSON.parse(written.join(''))
		assert.equal(parsed.foundIn, 'repo')
		assert.equal(parsed.source, 'cyberuni/cyberplace')
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main exits 1 with a usage message when no skill name is given', () => {
	const written: string[] = []
	const originalWrite = process.stdout.write.bind(process.stdout)
	// @ts-expect-error -- capturing stdout for assertion
	process.stdout.write = (chunk: string) => {
		written.push(chunk)
		return true
	}
	let code: number
	try {
		code = main([])
	} finally {
		process.stdout.write = originalWrite
	}
	assert.equal(code, 1)
	assert.match(written.join(''), /usage: source/)
})
