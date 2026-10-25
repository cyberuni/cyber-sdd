import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	parseIgnoreFile,
	resolveFromIgnore,
	resolveKindDefault,
	resolveTracking,
	validateIgnoreFile,
} from './resolve-tracking.mts'

function makeRepo(sddignore?: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'tracking-'))
	if (sddignore !== undefined) {
		const sddDir = join(dir, '.agents', 'sdd')
		mkdirSync(sddDir, { recursive: true })
		writeFileSync(join(sddDir, '.sddignore'), sddignore)
	}
	return dir
}

// ─── step 1 — explicit override wins first ───────────────────────────────────────

test('an explicit tracking declaration wins over everything else', () => {
	const dir = makeRepo('foo/**\n') // would ignore foo/bar, but explicit wins
	const result = resolveTracking({ root: dir, path: 'foo/bar', explicit: 'tracked' })
	assert.equal(result.value, 'tracked')
	assert.equal(result.reason, 'explicit override')
	rmSync(dir, { recursive: true, force: true })
})

// ─── step 2 — .sddignore is the universal override valve (gitignore syntax) ──────

test('a matching .sddignore pattern resolves an artifact ignored', () => {
	// kind default for this project-public skill path would be tracked; the rule overrides.
	const dir = makeRepo('plugins/foo/skills/**\n')
	const result = resolveTracking({ root: dir, path: 'plugins/foo/skills/bar', artifactType: 'skill' })
	assert.equal(result.value, 'ignored')
	assert.equal(result.reason, '.sddignore')
	rmSync(dir, { recursive: true, force: true })
})

test('a bang rule re-tracks a path an earlier pattern ignored', () => {
	const dir = makeRepo('plugins/foo/skills/\n!plugins/foo/skills/keep/**\n')
	const result = resolveTracking({ root: dir, path: 'plugins/foo/skills/keep/x', artifactType: 'skill' })
	assert.equal(result.value, 'tracked')
	assert.equal(result.reason, '.sddignore')
	rmSync(dir, { recursive: true, force: true })
})

test('the last matching rule wins', () => {
	const rules = parseIgnoreFile('a/**\n!a/**\n')
	assert.equal(resolveFromIgnore(rules, 'a/b'), 'tracked') // later !a/** disagrees with a/**
	const rules2 = parseIgnoreFile('!a/**\na/**\n')
	assert.equal(resolveFromIgnore(rules2, 'a/b'), 'ignored')
})

test('a bang rule re-tracks a code artifact that has no kind default', () => {
	const dir = makeRepo('tools/**\n!tools/keep/**\n')
	const result = resolveTracking({ root: dir, path: 'tools/keep/scratch.mts', artifactType: 'script' })
	assert.equal(result.value, 'tracked')
	assert.equal(result.reason, '.sddignore')
	rmSync(dir, { recursive: true, force: true })
})

test('a path no .sddignore rule matches falls through', () => {
	const rules = parseIgnoreFile('foo/**\n')
	assert.equal(resolveFromIgnore(rules, 'bar/baz'), null)
})

test('a missing .sddignore is legal and falls through', () => {
	const dir = makeRepo() // no .sddignore written
	const result = resolveTracking({ root: dir, path: '.agents/skills/foo', artifactType: 'skill' })
	assert.equal(result.value, 'ignored') // falls through to kind default
	assert.equal(result.reason, 'kind-default (skill)')
	rmSync(dir, { recursive: true, force: true })
})

test('.sddignore comments and blank lines are ignored', () => {
	const rules = parseIgnoreFile(['# a comment', '', 'a/**', ''].join('\n'))
	assert.equal(rules.length, 1)
	assert.equal(resolveFromIgnore(rules, 'a/b'), 'ignored')
})

// ─── step 3 — kind default (agent-config location convention) ───────────────────

test('a project-private skill resolves ignored by kind default', () => {
	assert.equal(resolveKindDefault('skill', '.agents/skills/foo'), 'ignored')
})

test('a project-public skill resolves tracked by kind default', () => {
	assert.equal(resolveKindDefault('skill', 'skills/foo'), 'tracked')
	assert.equal(resolveKindDefault('skill', 'plugins/aced/skills/foo'), 'tracked')
	assert.equal(resolveKindDefault('skill', 'packages/cyberplace/skills/foo'), 'tracked')
})

test('a project-private subagent resolves ignored by kind default', () => {
	assert.equal(resolveKindDefault('subagent', '.agents/agents/foo.md'), 'ignored')
})

test('a project-private command resolves ignored by kind default', () => {
	assert.equal(resolveKindDefault('command', '.agents/commands/foo.md'), 'ignored')
})

test('an agents-section artifact has no kind default', () => {
	assert.equal(resolveKindDefault('agents-section', 'AGENTS.md'), null)
})

test('a code artifact has no kind default', () => {
	assert.equal(resolveKindDefault('script', 'tools/scratch.mts'), null)
	assert.equal(resolveKindDefault(undefined, 'tools/scratch.mts'), null)
})

// ─── step 4 — fail closed to tracked ─────────────────────────────────────────────

test('no resolvable signal resolves tracked', () => {
	const dir = makeRepo() // no override, no rule
	const result = resolveTracking({ root: dir, path: 'AGENTS.md', artifactType: 'agents-section' })
	assert.equal(result.value, 'tracked')
	assert.equal(result.reason, 'fail-closed (no signal)')
	rmSync(dir, { recursive: true, force: true })
})

test('no resolvable signal resolves tracked for an untyped code path', () => {
	const dir = makeRepo()
	const result = resolveTracking({ root: dir, path: 'tools/scratch.mts' })
	assert.equal(result.value, 'tracked')
	assert.equal(result.reason, 'fail-closed (no signal)')
	rmSync(dir, { recursive: true, force: true })
})

// ─── validate the ignore file (no --path given) ──────────────────────────────────

test('a well-formed .sddignore validates OK', () => {
	const dir = makeRepo(['# comment', '', 'a/**', '!a/keep/**', 'build/'].join('\n'))
	const result = validateIgnoreFile(dir)
	assert.equal(result.ok, true)
	assert.match(result.message, /\.sddignore OK/)
	rmSync(dir, { recursive: true, force: true })
})

test('a missing .sddignore validates OK', () => {
	const dir = makeRepo() // absent
	const result = validateIgnoreFile(dir)
	assert.equal(result.ok, true)
	assert.match(result.message, /OK/)
	rmSync(dir, { recursive: true, force: true })
})

test('a malformed .sddignore reports a parse note', () => {
	const dir = makeRepo(['a/**', '!'].join('\n')) // `!` has an empty pattern — malformed
	const result = validateIgnoreFile(dir)
	assert.equal(result.ok, false)
	assert.match(result.message, /line 2/)
	rmSync(dir, { recursive: true, force: true })
})
