import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { SpecRecord } from '../../discover-specs/scripts/discover-specs.mts'
import { ENGINES, findCoverageGaps, findRepoRoot, resolveSpecFor } from './check-project-specs.mts'

function spec(path: string, projectPath: string): SpecRecord {
	return { path, name: path, nameSource: 'derived', status: 'implemented', projectPath, approvals: '' }
}

const withCheck = () => ({ scripts: { 'check:spec': 'sdd-check-specs' } })
const files = (...s: SpecRecord[]) => s.map((x) => `${x.path}/spec.md`)

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

// ─── findCoverageGaps ─────────────────────────────────────────────────────────

test('findCoverageGaps passes when every spec names a project that checks it', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	assert.deepEqual(findCoverageGaps('.', files(...s), s, withCheck), [])
})

test('findCoverageGaps flags a spec whose project defines no check:spec', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', files(...s), s, () => ({ scripts: { test: 'x' } }))
	assert.equal(gaps.length, 1)
	assert.equal(gaps[0]?.reason, 'no-check-script')
})

test('findCoverageGaps flags a spec whose project is not a workspace member', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', files(...s), s, () => null)
	assert.equal(gaps[0]?.reason, 'no-manifest')
})

test('findCoverageGaps flags a spec declaring no project-path', () => {
	const s = [spec('.agents/specs/orphan', '')]
	const gaps = findCoverageGaps('.', files(...s), s, withCheck)
	assert.equal(gaps[0]?.reason, 'no-project-path')
})

test('findCoverageGaps flags a spec file discovery dropped for an out-of-enum status', () => {
	// The fail-open this guard exists to close: a spec.md sits at a recognized
	// location but carries a status outside the lifecycle enum, so discovery drops
	// it, every engine skips it, and nothing checks it. It must escalate, not exempt.
	const gaps = findCoverageGaps('.', ['.agents/specs/quill/spec.md'], [], withCheck)
	assert.equal(gaps.length, 1)
	assert.equal(gaps[0]?.reason, 'unrecognized')
	assert.equal(gaps[0]?.spec, '.agents/specs/quill/spec.md')
})

test('findCoverageGaps does not flag a discovered file that survived the status filter', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', ['.agents/specs/sdd/spec.md'], s, withCheck)
	assert.deepEqual(gaps, [])
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
