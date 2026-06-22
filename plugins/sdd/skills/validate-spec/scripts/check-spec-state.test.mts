import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkSpec, discoverSpecDirs, parseSpecState, type SpecState } from './check-spec-state.mts'

function state(over: Partial<SpecState> = {}): SpecState {
	return { status: 'draft', aligned: false, markerCount: 0, approvedBy: null, ...over }
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

test('parseSpecState reads a nested approved-by map with why', () => {
	const text = [
		'---',
		'status: approved',
		'aligned: false',
		'approved-by:',
		'  spec:',
		'    by: unional',
		'  impl:',
		'    by: agent',
		'    leash: auto',
		'    why:',
		'      reversibility: safe',
		'---',
		'',
	].join('\n')
	const s = parseSpecState(text)
	assert.equal(s.approvedBy?.spec.by, 'unional')
	assert.equal(s.approvedBy?.spec.hasWhy, false)
	assert.equal(s.approvedBy?.impl.by, 'agent')
	assert.equal(s.approvedBy?.impl.hasWhy, true)
})

test('parseSpecState treats an empty approved-by as an empty map', () => {
	const s = parseSpecState('---\nstatus: draft\napproved-by: {}\n---\n')
	assert.deepEqual(s.approvedBy, {})
})

test('draft + aligned:true is illegal', () => {
	const v = checkSpec('x', state({ status: 'draft', aligned: true }), true)
	assert.equal(v.length, 1)
	assert.match(v[0], /draft must have aligned:false/)
})

test('a clean draft passes', () => {
	assert.deepEqual(checkSpec('x', state(), false), [])
})

test('approved without a .feature is illegal', () => {
	const v = checkSpec('x', state({ status: 'approved', approvedBy: { spec: { by: 'u', hasWhy: false } } }), false)
	assert.ok(v.some((m) => /requires a frozen .feature/.test(m)))
})

test('implemented requires aligned:true', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			aligned: false,
			approvedBy: { spec: { by: 'u', hasWhy: false }, impl: { by: 'u', hasWhy: false } },
		}),
		true,
	)
	assert.ok(v.some((m) => /implemented requires aligned:true/.test(m)))
})

test('open markers block the gate once approved', () => {
	const v = checkSpec(
		'x',
		state({ status: 'approved', markerCount: 1, approvedBy: { spec: { by: 'u', hasWhy: false } } }),
		true,
	)
	assert.ok(v.some((m) => /open marker/.test(m)))
})

test('a by:agent entry without a why is illegal', () => {
	const v = checkSpec('x', state({ status: 'draft', approvedBy: { spec: { by: 'agent', hasWhy: false } } }), true)
	assert.ok(v.some((m) => /by:agent but has no why/.test(m)))
})

test('approved without approved-by.spec is illegal', () => {
	const v = checkSpec('x', state({ status: 'approved' }), true)
	assert.ok(v.some((m) => /approved-by.spec is missing/.test(m)))
})

test('an unknown gate key is rejected', () => {
	const v = checkSpec('x', state({ approvedBy: { release: { by: 'u', hasWhy: false } } }), true)
	assert.ok(v.some((m) => /unknown gate "release"/.test(m)))
})

test('a fully approved-and-implemented spec passes', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			aligned: true,
			approvedBy: { spec: { by: 'u', hasWhy: false }, impl: { by: 'u', hasWhy: false } },
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
