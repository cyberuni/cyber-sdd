import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	checkComposition,
	collectSpecs,
	detectCycle,
	parseFrontmatter,
	renderComposition,
	renderGraph,
	type SpecNode,
} from './render-spec-graph.mts'

function fm(status: string, blockedBy: string): string {
	return `---\nstatus: ${status}\n${blockedBy}\naligned: false\n---\n\n# x\n`
}

function node(slug: string, over: Partial<SpecNode> = {}): SpecNode {
	return { slug, status: 'draft', blockedBy: [], type: null, subtasks: [], ...over }
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

test('parseFrontmatter reads type and subtasks', () => {
	const r = parseFrontmatter('---\nstatus: draft\ntype: project\nsubtasks:\n  - a\n  - sdd/b\n---\n\n# x\n')
	assert.equal(r.type, 'project')
	assert.deepEqual(r.subtasks, ['a', 'sdd/b'])
})

test('detectCycle returns null for an acyclic graph', () => {
	assert.equal(detectCycle([node('a'), node('b', { blockedBy: ['a'] })]), null)
})

test('detectCycle finds a two-node cycle', () => {
	assert.deepEqual(detectCycle([node('a', { blockedBy: ['b'] }), node('b', { blockedBy: ['a'] })]), ['a', 'b', 'a'])
})

test('detectCycle finds a self-loop', () => {
	assert.deepEqual(detectCycle([node('a', { blockedBy: ['a'] })]), ['a', 'a'])
})

test('detectCycle ignores edges to unknown specs', () => {
	assert.equal(detectCycle([node('a', { blockedBy: ['ghost'] })]), null)
})

test('renderGraph emits an edge for a blocker', () => {
	const out = renderGraph([node('child', { blockedBy: ['parent'] }), node('parent')])
	assert.match(out, /parent --> child/)
})

test('renderGraph declares a bare node with no edges', () => {
	const out = renderGraph([node('lonely')])
	assert.match(out, /\n {2}lonely\n/)
})

test('renderGraph emits one edge per blocker', () => {
	const out = renderGraph([node('c', { blockedBy: ['a', 'b'] }), node('a'), node('b')])
	assert.match(out, /a --> c/)
	assert.match(out, /b --> c/)
})

test('renderGraph writes a node-table row with type, blocked-by, and status', () => {
	const out = renderGraph([node('u', { blockedBy: ['p'], type: 'feature' })])
	assert.match(out, /\| `u` \| feature \| `p` \| draft \|/)
})

test('renderGraph is deterministic regardless of input order', () => {
	const a: SpecNode[] = [node('b', { blockedBy: ['a'] }), node('a')]
	const b: SpecNode[] = [...a].reverse()
	assert.equal(renderGraph(a), renderGraph(b))
})

test('renderComposition emits a project -> feature containment edge', () => {
	const out = renderComposition([
		node('proj', { type: 'project', subtasks: ['feat'] }),
		node('feat', { type: 'feature' }),
	])
	assert.match(out, /proj --> feat/)
})

test('checkComposition passes a clean project/feature tree', () => {
	const v = checkComposition([node('proj', { type: 'project', subtasks: ['feat'] }), node('feat', { type: 'feature' })])
	assert.deepEqual(v, [])
})

test('checkComposition flags a feature with two parents', () => {
	const v = checkComposition([
		node('p1', { type: 'project', subtasks: ['feat'] }),
		node('p2', { type: 'project', subtasks: ['feat'] }),
		node('feat', { type: 'feature' }),
	])
	assert.ok(v.some((m) => /feat: claimed by 2 projects/.test(m)))
})

test('checkComposition flags an orphan feature', () => {
	const v = checkComposition([node('feat', { type: 'feature' })])
	assert.ok(v.some((m) => /orphan/.test(m)))
})

test('checkComposition flags a subtask that is not a feature', () => {
	const v = checkComposition([
		node('proj', { type: 'project', subtasks: ['other'] }),
		node('other', { type: 'project' }),
	])
	assert.ok(v.some((m) => /not type:feature/.test(m)))
})

test('checkComposition flags an unresolved subtask', () => {
	const v = checkComposition([node('proj', { type: 'project', subtasks: ['ghost'] })])
	assert.ok(v.some((m) => /does not resolve/.test(m)))
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

test('collectSpecs includes nested specs with root-relative slugs', () => {
	const root = mkdtempSync(join(tmpdir(), 'specgraph-'))
	try {
		mkdirSync(join(root, 'alpha'))
		writeFileSync(join(root, 'alpha', 'spec.md'), fm('draft', 'blocked-by: []'))
		mkdirSync(join(root, 'sdd', 'sdd-skill'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'sdd-skill', 'spec.md'), fm('draft', 'blocked-by: [alpha]'))
		const nodes = collectSpecs(root)
		assert.deepEqual(
			nodes.map((n) => n.slug),
			['alpha', 'sdd/sdd-skill'],
		)
		assert.deepEqual(nodes[1].blockedBy, ['alpha'])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
