// mission-graph — one (or more) test per scenario in the frozen
// .agents/specs/sdd/mission-graph/mission-graph.feature (36 scenarios). Each test title is
// prefixed `scenario:` followed by the VERBATIM frozen scenario name, so the mapping is
// grep-auditable against the .feature. Every fixture here is a CONSTRUCTED event list / folded
// graph — never the live store, which mutates on every retirement.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	appendEdgeChecked,
	appendEvent,
	checkOperation,
	compareIds,
	computeSCCs,
	cycles,
	type EdgeEvent,
	type EdgeKind,
	fold,
	listOperations,
	main,
	type NodeEvent,
	operationOf,
	proposeEdge,
	quarantinedIds,
	readEvents,
	ready,
	renderCyclesToon,
	renderFrontierToon,
	renderOperationToon,
	type TombstoneEvent,
	wouldCloseCycle,
} from './mission-graph.mts'

// ── Fixture builders (constructed graphs only — see file banner) ──

function node(id: string, overrides: Partial<Omit<NodeEvent, 'v' | 'type' | 'id'>> = {}): NodeEvent {
	return { v: 1, type: 'node', id, kind: 'mission', status: 'open', touchSet: [], ...overrides }
}

function operationNode(id: string, capstone: string, overrides: Partial<NodeEvent> = {}): NodeEvent {
	return { v: 1, type: 'node', id, kind: 'operation', status: 'open', touchSet: [], capstone, ...overrides }
}

function edge(kind: EdgeKind, from: string, to: string): EdgeEvent {
	return { v: 1, type: 'edge', kind, from, to }
}

function tombstoneNode(id: string): TombstoneEvent {
	return { v: 1, type: 'tombstone', target: 'node', id }
}

function tombstoneEdge(kind: EdgeKind, from: string, to: string): TombstoneEvent {
	return { v: 1, type: 'tombstone', target: 'edge', kind, from, to }
}

// The #135/#136/#137 worked example, distilled into one reusable fixture (README "How it's
// tested"): RAW #135 -> #136; #137 WAW-paired with #136 (intersecting touch-sets); #135 retired;
// an Operation groups #135 + #136 (capstone #136); #137 stands alone.
const WORKED_EXAMPLE_OPERATION = 'Op-135-136'

function buildWorkedExample() {
	return [
		operationNode(WORKED_EXAMPLE_OPERATION, '#136'),
		node('#135', { status: 'retired', touchSet: ['schema/store'] }),
		node('#136', { status: 'open', touchSet: ['engine/ready'] }),
		node('#137', { status: 'open', touchSet: ['engine/ready'] }),
		edge('parent-child', WORKED_EXAMPLE_OPERATION, '#135'),
		edge('parent-child', WORKED_EXAMPLE_OPERATION, '#136'),
		edge('RAW', '#135', '#136'),
	]
}

// ── The store — schema, nodes, edges ──

test('scenario: a node carries the v1 schema version', () => {
	const graph = fold([node('A')])
	assert.equal(graph.nodes.get('A')?.schemaVersion, 1)
})

test('scenario: a node records its kind, status, and declared touch-set', () => {
	const graph = fold([node('A', { kind: 'mission', status: 'open', touchSet: ['x', 'y'] })])
	const a = graph.nodes.get('A')
	assert.equal(a?.kind, 'mission')
	assert.equal(a?.status, 'open')
	assert.deepEqual(a?.touchSet, ['x', 'y'])
})

test('scenario: an edge records its kind', () => {
	const graph = fold([
		node('A'),
		node('B'),
		node('C'),
		node('D'),
		edge('RAW', 'A', 'B'),
		edge('parent-child', 'C', 'A'),
		edge('discovered-from', 'A', 'D'),
	])
	assert.deepEqual(graph.edges.map((e) => e.kind).sort(), ['RAW', 'discovered-from', 'parent-child'])
})

test('scenario: WAW and WAR relationships are not stored as edges', () => {
	const graph = fold([node('A', { touchSet: ['x'] }), node('B', { touchSet: ['x'] })])
	assert.equal(graph.edges.length, 0)
})

test('scenario: the fold tolerates a node carrying a later additive schema field', () => {
	// `riskScore` is not part of the schema today — a plausible later-version additive field.
	const withExtra = {
		v: 1,
		type: 'node',
		id: 'B',
		kind: 'mission',
		status: 'open',
		touchSet: [],
		riskScore: 42,
	} as NodeEvent
	assert.doesNotThrow(() => fold([node('A'), withExtra]))
	const graph = fold([node('A'), withExtra])
	assert.equal(graph.nodes.size, 2)
	assert.equal(graph.nodes.get('B')?.kind, 'mission')
	assert.equal(graph.nodes.get('B')?.status, 'open')
})

// ── The write path — append-only, single writer, tombstone ──

test('scenario: a status change appends a new event and the latest status wins', () => {
	const opened: NodeEvent = { v: 1, type: 'node', id: 'A', kind: 'mission', status: 'open', touchSet: ['x'] }
	// A lean status-only follow-up event — the rest of the node is not repeated.
	const retired: NodeEvent = { v: 1, type: 'node', id: 'A', status: 'retired' }
	const events = [opened, retired]
	assert.equal(events.length, 2) // both events remain in the store — append-only, nothing overwritten
	const graph = fold(events)
	assert.equal(graph.nodes.get('A')?.status, 'retired')
	assert.deepEqual(graph.nodes.get('A')?.touchSet, ['x']) // untouched fields survive the merge
})

test('scenario: a tombstone event retracts an edge from the fold', () => {
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B'), tombstoneEdge('RAW', 'A', 'B')])
	assert.equal(graph.edges.length, 0)
})

test('scenario: a tombstone event retracts a node from the fold', () => {
	const graph = fold([node('A'), tombstoneNode('A')])
	assert.equal(graph.nodes.has('A'), false)
})

test('scenario: the write path rejects an edge that closes a cycle', () => {
	const graph = fold([node('A'), node('B'), node('C'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'C')])
	const decision = proposeEdge(graph, { kind: 'RAW', from: 'C', to: 'A' })
	assert.equal(decision.accepted, false)
})

test('scenario: the write-time cycle guard is overridable for a discovered mutual dependency', () => {
	const graph = fold([node('A'), node('B'), node('C'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'C')])
	const decision = proposeEdge(graph, { kind: 'RAW', from: 'C', to: 'A' }, true)
	assert.equal(decision.accepted, true)
	const graphAfter = fold([
		node('A'),
		node('B'),
		node('C'),
		edge('RAW', 'A', 'B'),
		edge('RAW', 'B', 'C'),
		edge('RAW', 'C', 'A'),
	])
	assert.ok(graphAfter.edges.some((e) => e.kind === 'RAW' && e.from === 'C' && e.to === 'A'))
})

// ── ready — the RAW frontier ──

test('scenario: a mission with no RAW predecessor is in the frontier', () => {
	const graph = fold([node('A')])
	assert.ok(ready(graph).some((f) => f.id === 'A'))
})

test('scenario: a mission whose RAW predecessor is retired is in the frontier', () => {
	const graph = fold([node('A', { status: 'retired' }), node('B'), edge('RAW', 'A', 'B')])
	assert.ok(ready(graph).some((f) => f.id === 'B'))
})

test('scenario: a mission whose RAW predecessor is not retired is held back', () => {
	const graph = fold([node('A', { status: 'open' }), node('B'), edge('RAW', 'A', 'B')])
	assert.ok(!ready(graph).some((f) => f.id === 'B'))
})

test('scenario: a mission transitively blocked by an unretired predecessor is held back', () => {
	const graph = fold([
		node('A', { status: 'open' }),
		node('B'),
		node('C'),
		edge('RAW', 'A', 'B'),
		edge('RAW', 'B', 'C'),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(!ids.includes('B'))
	assert.ok(!ids.includes('C'))
})

test('scenario: a discovered-from edge does not block the fold', () => {
	const graph = fold([node('A', { status: 'open' }), node('B'), edge('discovered-from', 'A', 'B')])
	assert.ok(ready(graph).some((f) => f.id === 'B'))
})

// ── ready — the node-level WAW-mutex ──

test('scenario: a candidate whose touch-set intersects an in-flight mission is held back', () => {
	const graph = fold([
		node('X', { status: 'claimed', touchSet: ['f'] }),
		node('Y', { status: 'open', touchSet: ['f'] }),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'Y'))
})

test('scenario: a candidate whose touch-set is disjoint from all in-flight missions is not WAW-held', () => {
	const graph = fold([
		node('X', { status: 'claimed', touchSet: ['f'] }),
		node('Y', { status: 'open', touchSet: ['g'] }),
	])
	assert.ok(ready(graph).some((f) => f.id === 'Y'))
})

test('scenario: two WAW-paired frontier missions never both surface', () => {
	const graph = fold([node('M1', { status: 'open', touchSet: ['f'] }), node('M2', { status: 'open', touchSet: ['f'] })])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(!(ids.includes('M1') && ids.includes('M2')))
})

// ── ready — determinism and read-only ──

test('scenario: the fold is deterministic given a snapshot', () => {
	const graph = fold([
		node('A', { status: 'retired' }),
		node('B'),
		node('C', { touchSet: ['f'] }),
		node('D', { touchSet: ['f'] }),
		edge('RAW', 'A', 'B'),
	])
	assert.deepEqual(ready(graph), ready(graph))
})

test('scenario: a WAW tie is broken by the pinned mission ref, not at random', () => {
	// M2 vs M10: a naive string sort would put "M10" first — the numeric-aware pin must not.
	const graph = fold([
		node('M2', { status: 'open', touchSet: ['f'] }),
		node('M10', { status: 'open', touchSet: ['f'] }),
	])
	const frontier = ready(graph)
	assert.equal(frontier.length, 1)
	assert.equal(frontier[0].id, 'M2')
})

test('scenario: each frontier entry carries its scheduling attributes', () => {
	const graph = fold([
		operationNode('Op1', 'A'),
		node('A', {
			status: 'open',
			touchSet: ['f'],
			blast: 'medium',
			hitlOrAfk: 'afk',
			modelTier: 'sonnet',
			briefPointer: '.agents/plans/a.plan.md',
		}),
		edge('parent-child', 'Op1', 'A'),
	])
	const [entry] = ready(graph)
	assert.equal(entry.id, 'A')
	assert.equal(entry.node, 'mission')
	assert.equal(entry.operation, 'Op1')
	assert.equal(entry.blast, 'medium')
	assert.equal(entry.hitlOrAfk, 'afk')
	assert.equal(entry.modelTier, 'sonnet')
	assert.equal(entry.briefPointer, '.agents/plans/a.plan.md')
	assert.ok(entry.whyReady.length > 0)
})

test('scenario: ready derives with no side effects', () => {
	const graph = fold([node('A'), node('B', { touchSet: ['f'] }), edge('RAW', 'A', 'B')])
	const before = structuredClone(graph)
	ready(graph)
	assert.deepStrictEqual(graph, before)
})

// ── cycles — write-guard, quarantine, repair ──

test('scenario: the fold quarantines a cycle instead of failing', () => {
	assert.doesNotThrow(() => {
		fold([node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A')])
	})
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A')])
	const quarantined = quarantinedIds(graph)
	assert.ok(quarantined.has('A') && quarantined.has('B'))
})

test('scenario: a mission on a cycle is excluded from the frontier', () => {
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A')])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(!ids.includes('A') && !ids.includes('B'))
})

test('scenario: a dependent of a quarantined cycle is transitively blocked', () => {
	const graph = fold([
		node('A'),
		node('B'),
		node('C'),
		edge('RAW', 'A', 'B'),
		edge('RAW', 'B', 'A'),
		edge('RAW', 'B', 'C'),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'C'))
})

test('scenario: cycles reports each strongly-connected component as a repair item', () => {
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A')])
	const items = cycles(graph)
	assert.equal(items.length, 1)
	assert.deepEqual(items[0].members.sort(), ['A', 'B'])
})

test('scenario: an acyclic graph surfaces no repair items', () => {
	const graph = fold([node('A', { status: 'retired' }), node('B'), edge('RAW', 'A', 'B')])
	assert.deepEqual(cycles(graph), [])
})

test('scenario: retracting the offending edge repairs a cycle', () => {
	const events = [node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A'), tombstoneEdge('RAW', 'B', 'A')]
	const graph = fold(events)
	assert.deepEqual(cycles(graph), [])
})

// ── Operations — declared set, capstone closure, progress ──

test('scenario: an Operation whose capstone closure is within the declared set is dependency-closed', () => {
	const graph = fold([
		operationNode('Op1', 'M3'),
		node('M1', { status: 'retired' }),
		node('M3'),
		edge('parent-child', 'Op1', 'M1'),
		edge('parent-child', 'Op1', 'M3'),
		edge('RAW', 'M1', 'M3'),
	])
	const check = checkOperation(graph, 'Op1')
	assert.equal(check.dependencyClosed, true)
	assert.deepEqual(check.missingPrereqs, [])
})

test('scenario: an Operation whose capstone closure exceeds the declared set is flagged', () => {
	const graph = fold([
		operationNode('Op1', 'M3'),
		node('M1'),
		node('M3'),
		edge('parent-child', 'Op1', 'M3'), // M1 is NOT declared, though M3 (the capstone) needs it
		edge('RAW', 'M1', 'M3'),
	])
	const check = checkOperation(graph, 'Op1')
	assert.equal(check.dependencyClosed, false)
	assert.deepEqual(check.missingPrereqs, ['M1'])
})

test('scenario: a declared support member outside the capstone closure is legal', () => {
	const graph = fold([
		operationNode('Op1', 'M3'),
		node('M1', { status: 'retired' }),
		node('M3'),
		node('M5'),
		edge('parent-child', 'Op1', 'M1'),
		edge('parent-child', 'Op1', 'M3'),
		edge('parent-child', 'Op1', 'M5'), // support: not a capstone prerequisite
		edge('RAW', 'M1', 'M3'),
	])
	const check = checkOperation(graph, 'Op1')
	assert.equal(check.dependencyClosed, true)
	assert.deepEqual(check.missingPrereqs, [])
	assert.ok(!check.releaseFloor.includes('M5'))
})

test('scenario: the release floor is the capstone closure, not the full declared set', () => {
	const graph = fold([
		operationNode('Op1', 'M3'),
		node('M1'),
		node('M3'),
		node('M5'),
		edge('parent-child', 'Op1', 'M1'),
		edge('parent-child', 'Op1', 'M3'),
		edge('parent-child', 'Op1', 'M5'),
		edge('RAW', 'M1', 'M3'),
	])
	const check = checkOperation(graph, 'Op1')
	assert.deepEqual(check.releaseFloor.sort(), ['M1', 'M3'])
	assert.ok(!check.releaseFloor.includes('M5'))
})

test('scenario: Operation progress is the ratio of completed to total declared missions', () => {
	const graph = fold([
		operationNode('Op1', 'M3'),
		node('M1', { status: 'retired' }),
		node('M3'),
		node('M5'),
		edge('parent-child', 'Op1', 'M1'),
		edge('parent-child', 'Op1', 'M3'),
		edge('parent-child', 'Op1', 'M5'),
	])
	const check = checkOperation(graph, 'Op1')
	assert.deepEqual(check.progress, { completed: 1, total: 3 })
})

// ── Status authority — the graph, not the brief ──

test('scenario: scheduling state is read from the graph, not the brief', () => {
	// The graph says M1 is retired; briefPointer only names where its (possibly stale) brief
	// lives — the pure derivation never opens it, so a brief's existence/content cannot matter.
	// M2 must unblock because the GRAPH, not any brief, says M1 is retired.
	const graph = fold([
		node('M1', { status: 'retired', briefPointer: '.agents/plans/m1.plan.md' }),
		node('M2'),
		edge('RAW', 'M1', 'M2'),
	])
	assert.ok(ready(graph).some((f) => f.id === 'M2'))
})

// ── The worked example — the #135/#136/#137 fixture ──

test('scenario: the worked-example fixture surfaces one WAW-paired mission at a time', () => {
	const events = buildWorkedExample()
	const frontier = ready(fold(events))
	assert.equal(frontier.length, 1)
	assert.equal(frontier[0].id, '#136') // pinned tie-break: 136 < 137

	const afterRetire = fold([...events, node('#136', { status: 'retired' })])
	assert.ok(ready(afterRetire).some((f) => f.id === '#137'))
})

test('scenario: the worked example groups #135 and #136 into one Operation', () => {
	const graph = fold(buildWorkedExample())
	const ops = listOperations(graph)
	assert.equal(ops.length, 1)
	assert.equal(ops[0].id, WORKED_EXAMPLE_OPERATION)
	assert.equal(ops[0].capstone, '#136')
	assert.deepEqual(ops[0].members.sort(), ['#135', '#136'])
	assert.equal(operationOf(graph, '#137'), null) // #137 is its own Mission
})

// ── Beyond-scenario: SCC helper, compareIds, wouldCloseCycle (unit-level, not scenario-mapped) ──

test('compareIds sorts numeric-aware and falls back to string order without digits', () => {
	assert.ok(compareIds('#136', '#137') < 0)
	assert.ok(compareIds('M2', 'M10') < 0)
	assert.ok(compareIds('A', 'B') < 0)
})

test('computeSCCs isolates each acyclic node into its own singleton component', () => {
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B')])
	const sccs = computeSCCs(graph)
	assert.equal(sccs.length, 2)
})

test('wouldCloseCycle is false for a non-RAW edge kind', () => {
	const graph = fold([node('A'), node('B')])
	assert.equal(wouldCloseCycle(graph, { kind: 'parent-child', from: 'B', to: 'A' }), false)
})

// ── Beyond-scenario: the store-IO seam (temp-dir smoke tests, not the live project store) ──

test('readEvents returns the empty log when the store is absent', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-'))
	try {
		assert.deepEqual(readEvents(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('appendEvent + readEvents round-trip a node event', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-'))
	try {
		appendEvent(dir, node('A'))
		const events = readEvents(dir)
		assert.equal(events.length, 1)
		assert.equal((events[0] as NodeEvent).id, 'A')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('appendEdgeChecked rejects a cycle-closing edge and does not append it', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-'))
	try {
		appendEvent(dir, node('A'))
		appendEvent(dir, node('B'))
		appendEvent(dir, node('C'))
		appendEvent(dir, edge('RAW', 'A', 'B'))
		appendEvent(dir, edge('RAW', 'B', 'C'))
		const decision = appendEdgeChecked(dir, { kind: 'RAW', from: 'C', to: 'A' })
		assert.equal(decision.accepted, false)
		const graph = fold(readEvents(dir))
		assert.equal(
			graph.edges.some((e) => e.from === 'C' && e.to === 'A'),
			false,
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Beyond-scenario: render + CLI smoke ──

test('renderFrontierToon emits a TOON header sized to the entry count', () => {
	const graph = fold([node('A')])
	const toon = renderFrontierToon(ready(graph))
	assert.match(toon, /^ready\[1\]\{id,node,operation,blast,hitlOrAfk,modelTier,briefPointer,whyReady\}:/)
})

test('renderCyclesToon emits one row per repair item', () => {
	const graph = fold([node('A'), node('B'), edge('RAW', 'A', 'B'), edge('RAW', 'B', 'A')])
	const toon = renderCyclesToon(cycles(graph))
	assert.match(toon, /^cycles\[1\]\{scc,members\}:/)
	assert.match(toon, /scc-1,"A;B"/)
})

test('renderOperationToon reports the checked fields', () => {
	const graph = fold([operationNode('Op1', 'M1'), node('M1', { status: 'retired' }), edge('parent-child', 'Op1', 'M1')])
	const toon = renderOperationToon('Op1', checkOperation(graph, 'Op1'))
	assert.match(toon, /operation: Op1/)
	assert.match(toon, /dependencyClosed: true/)
	assert.match(toon, /progress: 1\/1/)
})

test('main ready prints a TOON header for an empty store', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-'))
	const writes: string[] = []
	const orig = process.stdout.write.bind(process.stdout)
	;(process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
		writes.push(s)
		return true
	}
	try {
		const code = main(['ready', '--root', dir])
		assert.equal(code, 0)
		assert.match(writes.join(''), /^ready\[0\]\{/)
	} finally {
		;(process.stdout as unknown as { write: typeof orig }).write = orig
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main append node then ready reflects it', () => {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-'))
	const writes: string[] = []
	const orig = process.stdout.write.bind(process.stdout)
	;(process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
		writes.push(s)
		return true
	}
	try {
		assert.equal(main(['append', 'node', '--id', 'A', '--root', dir]), 0)
		writes.length = 0
		assert.equal(main(['ready', '--root', dir]), 0)
		assert.match(writes.join(''), /^ready\[1\]\{/)
	} finally {
		;(process.stdout as unknown as { write: typeof orig }).write = orig
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main with an unrecognized command returns 1', () => {
	assert.equal(main(['nonesuch']), 1)
})
