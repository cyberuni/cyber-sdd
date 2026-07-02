import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	parseDurabilityMap,
	resolveDurability,
	resolveDurabilityFromMap,
	resolveKindDefault,
	validateDurabilityMap,
} from './resolve-durability.mts'

// ─── step 1 — explicit override wins first ───────────────────────────────────────

test('an explicit durability declaration wins over everything else', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	writeFileSync(join(dir, 'durability.toml'), '"foo/**" = "non-durable"\n')
	const result = resolveDurability({
		root: dir,
		path: 'foo/bar',
		explicit: 'durable',
	})
	assert.equal(result.value, 'durable')
	assert.equal(result.reason, 'explicit override')
	rmSync(dir, { recursive: true, force: true })
})

// ─── step 2 — durability.toml is the universal override valve ───────────────────

test('a durability.toml entry overrides an artifact-type kind default', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const sddDir = join(dir, '.agents', 'sdd')
	mkdirSync(sddDir, { recursive: true })
	writeFileSync(join(sddDir, 'durability.toml'), '".agents/skills/**" = "durable"\n')
	const result = resolveDurability({
		root: dir,
		path: '.agents/skills/foo',
		artifactType: 'skill',
	})
	assert.equal(result.value, 'durable')
	assert.equal(result.reason, 'durability.toml')
	rmSync(dir, { recursive: true, force: true })
})

test('a durability.toml entry resolves a code artifact with no kind default', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const sddDir = join(dir, '.agents', 'sdd')
	mkdirSync(sddDir, { recursive: true })
	writeFileSync(join(sddDir, 'durability.toml'), '"tools/**" = "non-durable"\n')
	const result = resolveDurability({ root: dir, path: 'tools/scratch.mts', artifactType: 'script' })
	assert.equal(result.value, 'non-durable')
	assert.equal(result.reason, 'durability.toml')
	rmSync(dir, { recursive: true, force: true })
})

test('the most specific glob in durability.toml wins', () => {
	const map = [
		{ glob: '.agents/skills/**', value: 'non-durable' as const },
		{ glob: '.agents/skills/exempt/**', value: 'durable' as const },
	]
	assert.equal(resolveDurabilityFromMap(map, '.agents/skills/exempt/foo'), 'durable')
})

test('a missing durability.toml is legal and falls through', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const result = resolveDurability({ root: dir, path: '.agents/skills/foo', artifactType: 'skill' })
	assert.equal(result.value, 'non-durable') // falls through to kind default
	assert.equal(result.reason, 'kind-default (skill)')
	rmSync(dir, { recursive: true, force: true })
})

test('durability.toml comments and blank lines are ignored', () => {
	const text = ['# a comment', '', '[section]', '"a/**" = "durable"', ''].join('\n')
	const parsed = parseDurabilityMap(text)
	assert.equal(parsed.length, 1)
	assert.deepEqual(parsed[0], { glob: 'a/**', value: 'durable' })
})

// ─── step 3 — kind default (agent-config location convention) ───────────────────

test('a project-private skill resolves non-durable by kind default', () => {
	assert.equal(resolveKindDefault('skill', '.agents/skills/foo'), 'non-durable')
})

test('a project-public skill resolves durable by kind default', () => {
	assert.equal(resolveKindDefault('skill', 'skills/foo'), 'durable')
	assert.equal(resolveKindDefault('skill', 'plugins/aced/skills/foo'), 'durable')
	assert.equal(resolveKindDefault('skill', 'packages/cyber-skills/skills/foo'), 'durable')
})

test('a project-private subagent resolves non-durable by kind default', () => {
	assert.equal(resolveKindDefault('subagent', '.agents/agents/foo.md'), 'non-durable')
})

test('a project-private command resolves non-durable by kind default', () => {
	assert.equal(resolveKindDefault('command', '.agents/commands/foo.md'), 'non-durable')
})

test('an agents-section artifact has no kind default', () => {
	assert.equal(resolveKindDefault('agents-section', 'AGENTS.md'), null)
})

test('a code artifact has no kind default', () => {
	assert.equal(resolveKindDefault('script', 'tools/scratch.mts'), null)
	assert.equal(resolveKindDefault(undefined, 'tools/scratch.mts'), null)
})

// ─── step 4 — fail closed to durable ─────────────────────────────────────────────

test('no resolvable signal resolves durable', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const result = resolveDurability({ root: dir, path: 'AGENTS.md', artifactType: 'agents-section' })
	assert.equal(result.value, 'durable')
	assert.equal(result.reason, 'fail-closed (no signal)')
	rmSync(dir, { recursive: true, force: true })
})

test('no resolvable signal resolves durable for an untyped code path', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const result = resolveDurability({ root: dir, path: 'tools/scratch.mts' })
	assert.equal(result.value, 'durable')
	assert.equal(result.reason, 'fail-closed (no signal)')
	rmSync(dir, { recursive: true, force: true })
})

// ─── validate the table ──────────────────────────────────────────────────────────

test('a well-formed durability.toml validates OK', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const sddDir = join(dir, '.agents', 'sdd')
	mkdirSync(sddDir, { recursive: true })
	writeFileSync(join(sddDir, 'durability.toml'), '"a/**" = "durable"\n"b/**" = "non-durable"\n')
	const result = validateDurabilityMap(dir)
	assert.equal(result.ok, true)
	assert.match(result.message, /OK/)
	rmSync(dir, { recursive: true, force: true })
})

test('a missing durability.toml validates OK', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const result = validateDurabilityMap(dir)
	assert.equal(result.ok, true)
	assert.match(result.message, /absent/)
	rmSync(dir, { recursive: true, force: true })
})

test('a malformed durability.toml reports a parse note', () => {
	const dir = mkdtempSync(join(tmpdir(), 'durability-'))
	const sddDir = join(dir, '.agents', 'sdd')
	mkdirSync(sddDir, { recursive: true })
	writeFileSync(join(sddDir, 'durability.toml'), '"a/**" = "durable"\nnot a valid line\n')
	const result = validateDurabilityMap(dir)
	assert.equal(result.ok, false)
	assert.match(result.message, /malformed/)
	rmSync(dir, { recursive: true, force: true })
})
