import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { SpecRecord } from '../../discover-specs/scripts/discover-specs.mts'
import { ENGINES, findRepoRoot, resolveSpecFor } from './check-project-specs.mts'

function spec(path: string, projectPath: string): SpecRecord {
	return { path, name: path, nameSource: 'derived', status: 'implemented', projectPath, approvals: '' }
}

// ─── resolveSpecFor ───────────────────────────────────────────────────────────

test('resolveSpecFor matches the spec whose project-path names the project dir', () => {
	const specs = [spec('.agents/specs/sdd', 'plugins/sdd'), spec('.agents/specs/aced', 'plugins/aced')]
	const r = resolveSpecFor(specs, 'plugins/aced')
	assert.equal(r.kind, 'resolved')
	assert.equal(r.kind === 'resolved' && r.spec.path, '.agents/specs/aced')
})

test('resolveSpecFor inverts a name-irregular mapping', () => {
	// The whole reason resolution is project-path-first: the spec folder does not
	// share the project's basename, so no name-derived lookup would find it.
	const specs = [spec('.agents/specs/cyberfleet-plugin', 'plugins/cyberfleet')]
	const r = resolveSpecFor(specs, 'plugins/cyberfleet')
	assert.equal(r.kind === 'resolved' && r.spec.path, '.agents/specs/cyberfleet-plugin')
})

test('resolveSpecFor resolves a nested spec by project-path like any other', () => {
	const specs = [spec('packages/cyberlegion/.agents/spec', 'packages/cyberlegion')]
	const r = resolveSpecFor(specs, 'packages/cyberlegion')
	assert.equal(r.kind === 'resolved' && r.spec.path, 'packages/cyberlegion/.agents/spec')
})

test('resolveSpecFor reports none for a project no spec governs', () => {
	const r = resolveSpecFor([spec('.agents/specs/sdd', 'plugins/sdd')], 'apps/website')
	assert.equal(r.kind, 'none')
})

test('resolveSpecFor never matches a spec carrying no project-path', () => {
	// '' must not match a falsy/empty project rel — that would claim every project.
	const r = resolveSpecFor([spec('.agents/specs/orphan', '')], '')
	assert.equal(r.kind, 'none')
})

test('resolveSpecFor reports ambiguous when two specs claim one project', () => {
	const specs = [spec('.agents/specs/a', 'plugins/x'), spec('.agents/specs/b', 'plugins/x')]
	const r = resolveSpecFor(specs, 'plugins/x')
	assert.equal(r.kind, 'ambiguous')
	assert.equal(r.kind === 'ambiguous' && r.specs.length, 2)
})

test('resolveSpecFor does not match on a path prefix', () => {
	const r = resolveSpecFor([spec('.agents/specs/sdd', 'plugins/sdd')], 'plugins/sdd-extra')
	assert.equal(r.kind, 'none')
})

// ─── findRepoRoot ─────────────────────────────────────────────────────────────

test('findRepoRoot walks up to the workspace marker', () => {
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		writeFileSync(join(tmp, 'pnpm-workspace.yaml'), 'packages:\n')
		const deep = join(tmp, 'plugins', 'thing', 'skills')
		mkdirSync(deep, { recursive: true })
		assert.equal(findRepoRoot(deep), tmp)
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

test('findRepoRoot returns empty when no marker exists above', () => {
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		assert.equal(findRepoRoot(tmp), '')
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

// ─── the engine set ───────────────────────────────────────────────────────────

test('every engine is handed the spec dir it was resolved to', () => {
	for (const e of ENGINES) assert.ok(e.args('SPECDIR').includes('SPECDIR'), `${e.name} drops the spec dir`)
})

test('check-scenario-overlap is held out of the per-project set', () => {
	// It reports pre-existing @trigger sibling-deference duplicates whose removal
	// is a Clearance-bound narrowing; it still runs corpus-wide at the root.
	assert.equal(
		ENGINES.some((e) => e.name === 'check-scenario-overlap'),
		false,
	)
})
