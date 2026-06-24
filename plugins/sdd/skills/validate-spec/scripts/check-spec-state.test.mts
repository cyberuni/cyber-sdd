import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkSpec, discoverSpecDirs, parseSpecState, type SpecState } from './check-spec-state.mts'

function state(over: Partial<SpecState> = {}): SpecState {
	return { status: 'draft', aligned: false, markerCount: 0, approval: null, type: null, subtasks: [], ...over }
}

test('parseSpecState reads status, aligned, and marker count', () => {
	const s = parseSpecState('---\nstatus: draft\naligned: false\n---\n\n<!-- open: a -->\n<!--   open: b -->\n')
	assert.equal(s.status, 'draft')
	assert.equal(s.aligned, false)
	assert.equal(s.markerCount, 2)
})

test('parseSpecState ignores marker syntax inside code spans and fences', () => {
	const text = [
		'---',
		'status: approved',
		'aligned: true',
		'---',
		'',
		'A content gap leaves an inline `<!-- open: ... -->` marker.',
		'',
		'```',
		'CONTENT_GAPS become <!-- open: --> markers',
		'```',
		'',
	].join('\n')
	assert.equal(parseSpecState(text).markerCount, 0)
})

test('parseSpecState reads a nested approval map with verdict and why', () => {
	const text = [
		'---',
		'status: approved',
		'aligned: true',
		'approval:',
		'  spec:',
		'    verdict: approve',
		'    by: unional',
		'  impl:',
		'    verdict: approve',
		'    by: agent',
		'    why:',
		'      reversibility: safe',
		'---',
		'',
	].join('\n')
	const s = parseSpecState(text)
	assert.equal(s.approval?.spec.verdict, 'approve')
	assert.equal(s.approval?.spec.by, 'unional')
	assert.equal(s.approval?.spec.hasWhy, false)
	assert.equal(s.approval?.impl.verdict, 'approve')
	assert.equal(s.approval?.impl.by, 'agent')
	assert.equal(s.approval?.impl.hasWhy, true)
})

test('parseSpecState reads a pause verdict that omits by', () => {
	const text = [
		'---',
		'status: draft',
		'approval:',
		'  spec:',
		'    verdict: pause',
		'    why:',
		'      blast-radius: risky',
		'---',
		'',
	].join('\n')
	const s = parseSpecState(text)
	assert.equal(s.approval?.spec.verdict, 'pause')
	assert.equal(s.approval?.spec.by, undefined)
	assert.equal(s.approval?.spec.hasWhy, true)
})

test('parseSpecState treats an empty approval as an empty map', () => {
	const s = parseSpecState('---\nstatus: draft\napproval: {}\n---\n')
	assert.deepEqual(s.approval, {})
})

test('parseSpecState reads type and a subtasks list', () => {
	const text = ['---', 'status: draft', 'type: project', 'subtasks:', '  - a', '  - sdd/b', '---', ''].join('\n')
	const s = parseSpecState(text)
	assert.equal(s.type, 'project')
	assert.deepEqual(s.subtasks, ['a', 'sdd/b'])
})

test('parseSpecState reads an inline subtasks array', () => {
	const s = parseSpecState('---\nstatus: draft\ntype: project\nsubtasks: [a, b]\n---\n')
	assert.deepEqual(s.subtasks, ['a', 'b'])
})

test('an unknown type is rejected', () => {
	const v = checkSpec('x', state({ type: 'epic' }), false)
	assert.ok(v.some((m) => /unknown type "epic"/.test(m)))
})

test('only a project may declare subtasks', () => {
	const v = checkSpec('x', state({ type: 'feature', subtasks: ['child'] }), false)
	assert.ok(v.some((m) => /only a project may declare subtasks/.test(m)))
})

test('a project with subtasks passes the per-spec check', () => {
	assert.deepEqual(checkSpec('x', state({ type: 'project', subtasks: ['child'] }), false), [])
})

test('draft + aligned:true is legal (contract synced, ready for the spec gate)', () => {
	assert.deepEqual(checkSpec('x', state({ status: 'draft', aligned: true }), true), [])
})

test('a clean draft passes', () => {
	assert.deepEqual(checkSpec('x', state(), false), [])
})

test('approved without a .feature is illegal', () => {
	const v = checkSpec(
		'x',
		state({ status: 'approved', approval: { spec: { verdict: 'approve', by: 'u', hasWhy: false } } }),
		false,
	)
	assert.ok(v.some((m) => /requires a frozen .feature/.test(m)))
})

test('implemented requires aligned:true', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			aligned: false,
			approval: {
				spec: { verdict: 'approve', by: 'u', hasWhy: false },
				impl: { verdict: 'approve', by: 'u', hasWhy: false },
			},
		}),
		true,
	)
	assert.ok(v.some((m) => /implemented requires aligned:true/.test(m)))
})

test('open markers block the gate once approved', () => {
	const v = checkSpec(
		'x',
		state({ status: 'approved', markerCount: 1, approval: { spec: { verdict: 'approve', by: 'u', hasWhy: false } } }),
		true,
	)
	assert.ok(v.some((m) => /open marker/.test(m)))
})

test('a by:agent entry without a why is illegal', () => {
	const v = checkSpec(
		'x',
		state({ status: 'draft', approval: { spec: { verdict: 'approve', by: 'agent', hasWhy: false } } }),
		true,
	)
	assert.ok(v.some((m) => /by:agent but has no why/.test(m)))
})

test('a pause carrying by is illegal', () => {
	const v = checkSpec(
		'x',
		state({ status: 'draft', approval: { spec: { verdict: 'pause', by: 'agent', hasWhy: true } } }),
		true,
	)
	assert.ok(v.some((m) => /pause but carries by/.test(m)))
})

test('an approve with no by is illegal', () => {
	const v = checkSpec('x', state({ status: 'draft', approval: { spec: { verdict: 'approve', hasWhy: false } } }), true)
	assert.ok(v.some((m) => /approve with no by/.test(m)))
})

test('an unknown verdict is rejected', () => {
	const v = checkSpec(
		'x',
		state({ status: 'draft', approval: { spec: { verdict: 'maybe', by: 'u', hasWhy: false } } }),
		true,
	)
	assert.ok(v.some((m) => /unknown verdict "maybe"/.test(m)))
})

test('a pause is legal on a gate the spec has not passed', () => {
	assert.deepEqual(
		checkSpec('x', state({ status: 'draft', approval: { spec: { verdict: 'pause', hasWhy: true } } }), false),
		[],
	)
})

test('a pause on an already-passed gate is illegal', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			aligned: true,
			approval: { spec: { verdict: 'pause', hasWhy: true }, impl: { verdict: 'approve', by: 'u', hasWhy: false } },
		}),
		true,
	)
	assert.ok(v.some((m) => /spec gate is already passed/.test(m)))
})

test('approved without an approve verdict on the spec gate is illegal', () => {
	const v = checkSpec('x', state({ status: 'approved' }), true)
	assert.ok(v.some((m) => /approval.spec has no approve verdict/.test(m)))
})

test('an unknown gate key is rejected', () => {
	const v = checkSpec('x', state({ approval: { release: { verdict: 'approve', by: 'u', hasWhy: false } } }), true)
	assert.ok(v.some((m) => /unknown gate "release"/.test(m)))
})

test('a fully approved-and-implemented spec passes', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			aligned: true,
			approval: {
				spec: { verdict: 'approve', by: 'u', hasWhy: false },
				impl: { verdict: 'approve', by: 'u', hasWhy: false },
			},
		}),
		true,
	)
	assert.deepEqual(v, [])
})

test('discoverSpecDirs finds both top-level and nested specs', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-specs-'))
	try {
		mkdirSync(join(root, 'auth'), { recursive: true })
		writeFileSync(join(root, 'auth', 'spec.md'), '---\nstatus: draft\n---\n')
		mkdirSync(join(root, 'sdd', 'sdd-skill'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'sdd-skill', 'spec.md'), '---\nstatus: draft\n---\n')
		mkdirSync(join(root, 'sdd', 'no-spec'), { recursive: true })

		const found = discoverSpecDirs(root).sort()
		assert.deepEqual(found, ['auth', join('sdd', 'sdd-skill')].sort())
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('discoverSpecDirs skips node_modules and dot dirs', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-specs-'))
	try {
		mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true })
		writeFileSync(join(root, 'node_modules', 'pkg', 'spec.md'), '---\nstatus: draft\n---\n')
		mkdirSync(join(root, '.cache'), { recursive: true })
		writeFileSync(join(root, '.cache', 'spec.md'), '---\nstatus: draft\n---\n')
		assert.deepEqual(discoverSpecDirs(root), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
