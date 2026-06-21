import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { collectSpecs, detectCycle, parseFrontmatter, renderGraph, type SpecNode } from './render-spec-graph.mts'

function fm(status: string, blockedBy: string): string {
	return `---\nstatus: ${status}\n${blockedBy}\naligned: false\n---\n\n# x\n`
}

test('parseFrontmatter reads inline list', () => {
	const r = parseFrontmatter(fm('draft', 'blocked-by: [x, y]'))
	assert.deepEqual(r.blockedBy, ['x', 'y'])
	assert.equal(r.status, 'draft')
})

test('parseFrontmatter reads block list', () => {
	const r = parseFrontmatter(fm('draft', 'blocked-by:\n  - x\n  - y'))
	assert.deepEqual(r.blockedBy, ['x', 'y'])
})

test('parseFrontmatter reads empty list', () => {
	assert.deepEqual(parseFrontmatter(fm('draft', 'blocked-by: []')).blockedBy, [])
})

test('parseFrontmatter handles a missing blocked-by field', () => {
	const r = parseFrontmatter('---\nstatus: draft\n---\n\n# x\n')
	assert.deepEqual(r.blockedBy, [])
	assert.equal(r.status, 'draft')
})

test('detectCycle returns null for an acyclic graph', () => {
	const nodes: SpecNode[] = [
		{ slug: 'a', status: 'draft', blockedBy: [] },
		{ slug: 'b', status: 'draft', blockedBy: ['a'] },
	]
	assert.equal(detectCycle(nodes), null)
})

test('detectCycle finds a two-node cycle', () => {
	const nodes: SpecNode[] = [
		{ slug: 'a', status: 'draft', blockedBy: ['b'] },
		{ slug: 'b', status: 'draft', blockedBy: ['a'] },
	]
	assert.deepEqual(detectCycle(nodes), ['a', 'b', 'a'])
})

test('detectCycle finds a self-loop', () => {
	const nodes: SpecNode[] = [{ slug: 'a', status: 'draft', blockedBy: ['a'] }]
	assert.deepEqual(detectCycle(nodes), ['a', 'a'])
})

test('detectCycle ignores edges to unknown specs', () => {
	const nodes: SpecNode[] = [{ slug: 'a', status: 'draft', blockedBy: ['ghost'] }]
	assert.equal(detectCycle(nodes), null)
})

test('renderGraph emits an edge for a blocker', () => {
	const out = renderGraph([
		{ slug: 'child', status: 'draft', blockedBy: ['parent'] },
		{ slug: 'parent', status: 'draft', blockedBy: [] },
	])
	assert.match(out, /parent --> child/)
})

test('renderGraph declares a bare node with no edges', () => {
	const out = renderGraph([{ slug: 'lonely', status: 'draft', blockedBy: [] }])
	assert.match(out, /\n {2}lonely\n/)
})

test('renderGraph emits one edge per blocker', () => {
	const out = renderGraph([
		{ slug: 'c', status: 'draft', blockedBy: ['a', 'b'] },
		{ slug: 'a', status: 'draft', blockedBy: [] },
		{ slug: 'b', status: 'draft', blockedBy: [] },
	])
	assert.match(out, /a --> c/)
	assert.match(out, /b --> c/)
})

test('renderGraph writes a node-table row with blocked-by and status', () => {
	const out = renderGraph([{ slug: 'u', status: 'draft', blockedBy: ['p'] }])
	assert.match(out, /\| `u` \| `p` \| draft \|/)
})

test('renderGraph is deterministic regardless of input order', () => {
	const a: SpecNode[] = [
		{ slug: 'b', status: 'draft', blockedBy: ['a'] },
		{ slug: 'a', status: 'draft', blockedBy: [] },
	]
	const b: SpecNode[] = [...a].reverse()
	assert.equal(renderGraph(a), renderGraph(b))
})

test('collectSpecs skips folders without spec.md and sorts by slug', () => {
	const root = mkdtempSync(join(tmpdir(), 'specgraph-'))
	try {
		mkdirSync(join(root, 'zeta'))
		writeFileSync(join(root, 'zeta', 'spec.md'), fm('draft', 'blocked-by: [alpha]'))
		mkdirSync(join(root, 'alpha'))
		writeFileSync(join(root, 'alpha', 'spec.md'), fm('draft', 'blocked-by: []'))
		mkdirSync(join(root, 'empty-folder'))
		const nodes = collectSpecs(root)
		assert.deepEqual(
			nodes.map((n) => n.slug),
			['alpha', 'zeta'],
		)
		assert.deepEqual(nodes[1].blockedBy, ['alpha'])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
