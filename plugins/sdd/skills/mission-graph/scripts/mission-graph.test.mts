// mission-graph — one (or more) test per scenario in the frozen
// .agents/specs/sdd/mission-graph/mission-graph.feature (36 scenarios). Each test title is
// prefixed `scenario:` followed by the VERBATIM frozen scenario name, so the mapping is
// grep-auditable against the .feature. Every fixture here is a CONSTRUCTED event list / folded
// graph — never the live store, which mutates on every retirement.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	appendEdgeChecked,
	appendEvent,
	appendOrphanEvent,
	checkOperation,
	commitOrphan,
	compareIds,
	computeSCCs,
	cycles,
	type EdgeEvent,
	type EdgeKind,
	fold,
	listOperations,
	main,
	migrate,
	type NodeEvent,
	operationOf,
	orphanHead,
	proposeEdge,
	proposeNode,
	quarantinedIds,
	readEvents,
	readOrphanLines,
	ready,
	renderCyclesToon,
	renderFrontierToon,
	renderOperationToon,
	resolveBackend,
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

// ── ready — the barrier fence ──

test('scenario: a node records that it is a barrier and the project it fences', () => {
	const graph = fold([node('B1', { barrier: true, project: 'P' })])
	const b = graph.nodes.get('B1')
	assert.equal(b?.barrier, true)
	assert.equal(b?.project, 'P')
})

test('scenario: a node appended without a barrier marking is a normal mission', () => {
	const graph = fold([node('A')])
	assert.equal(graph.nodes.get('A')?.barrier, false)
})

test('scenario: the write path rejects a barrier marking on a node that is not a mission', () => {
	const graph = fold([])
	const decision = proposeNode(graph, { v: 1, type: 'node', id: 'Op1', kind: 'operation', barrier: true })
	assert.equal(decision.accepted, false)
})

test('scenario: a later event cannot fold a barrier onto a node that is not a mission', () => {
	const graph = fold([node('X', { barrier: true, project: 'P' })])
	const decision = proposeNode(graph, { v: 1, type: 'node', id: 'X', kind: 'operation' })
	assert.equal(decision.accepted, false)
})

test('scenario: the write path rejects marking a node a barrier when it already has a RAW predecessor that is an operation', () => {
	const graph = fold([
		{ v: 1, type: 'node', id: 'Op1', kind: 'operation', status: 'open', touchSet: [] },
		node('X'),
		edge('RAW', 'Op1', 'X'),
	])
	const decision = proposeNode(graph, { v: 1, type: 'node', id: 'X', barrier: true, project: 'P' })
	assert.equal(decision.accepted, false)
})

test('scenario: the write path rejects a RAW edge from an operation into a barrier', () => {
	const graph = fold([
		{ v: 1, type: 'node', id: 'Op1', kind: 'operation', status: 'open', touchSet: [] },
		node('X', { barrier: true, project: 'P' }),
	])
	const decision = proposeEdge(graph, { kind: 'RAW', from: 'Op1', to: 'X' })
	assert.equal(decision.accepted, false)
})

test('scenario: the write path rejects a claim that would put two barriers of one project in-flight at once', () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P', status: 'claimed' }),
		node('B2', { barrier: true, project: 'P', status: 'open' }),
	])
	const decision = proposeNode(graph, { v: 1, type: 'node', id: 'B2', status: 'claimed' })
	assert.equal(decision.accepted, false)
})

test('scenario: an un-retired barrier holds the other missions of the project it fences', () => {
	const graph = fold([node('B', { barrier: true, project: 'P' }), node('M', { project: 'P', touchSet: ['x'] })])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a barrier with an empty declared touch-set still holds its project', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P', touchSet: [] }),
		node('M', { project: 'P', touchSet: [] }),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a barrier does not fence a project it does not fence', () => {
	const graph = fold([node('B', { barrier: true, project: 'P' }), node('M', { project: 'Q' })])
	assert.ok(ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a graph holding no barrier is not fenced at all', () => {
	const graph = fold([node('A'), node('B')])
	const ids = ready(graph).map((f) => f.id)
	assert.deepEqual(ids.sort(), ['A', 'B'])
})

test('scenario: a barrier fences the default project of a store that declares no projects', () => {
	const graph = fold([node('B', { barrier: true }), node('M')])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: the default project is a project of its own, not a wildcard', () => {
	const graph = fold([node('B', { barrier: true }), node('M', { project: 'named' })])
	assert.ok(ready(graph).some((f) => f.id === 'M'))
})

test('scenario: an in-flight barrier still fences its project', () => {
	const graph = fold([node('B', { barrier: true, project: 'P', status: 'claimed' }), node('M', { project: 'P' })])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a retired barrier no longer fences its project', () => {
	const graph = fold([node('B', { barrier: true, project: 'P', status: 'retired' }), node('M', { project: 'P' })])
	assert.ok(ready(graph).some((f) => f.id === 'M'))
})

test('scenario: the fence holds a RAW-satisfied mission downstream of the exempt closure', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P' }),
		node('X', { status: 'retired', project: 'P' }), // exempt (RAW pred of B), retired
		node('M', { project: 'P' }), // downstream of X, RAW-satisfied, but NOT in B's pred closure
		edge('RAW', 'X', 'B'),
		edge('RAW', 'X', 'M'),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a RAW predecessor of an un-retired barrier is exempt from the fence', () => {
	const graph = fold([node('B', { barrier: true, project: 'P' }), node('X', { project: 'P' }), edge('RAW', 'X', 'B')])
	assert.ok(ready(graph).some((f) => f.id === 'X'))
})

test('scenario: exemption reaches the whole RAW-predecessor closure but never lifts RAW satisfaction', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P' }),
		node('X', { project: 'P' }), // head of chain, no RAW predecessor
		node('Y', { project: 'P' }), // between X and B, blocked because X is not retired
		edge('RAW', 'X', 'Y'),
		edge('RAW', 'Y', 'B'),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(ids.includes('X'))
	assert.ok(!ids.includes('Y'))
})

test("scenario: a predecessor of one project's barrier is exempt from another project's fence", () => {
	const graph = fold([
		node('Bq', { barrier: true, project: 'Q' }),
		node('Bp', { barrier: true, project: 'P' }),
		node('X', { project: 'Q' }), // RAW pred of Bp (project P's barrier), sits in project Q
		edge('RAW', 'X', 'Bp'),
	])
	assert.ok(ready(graph).some((f) => f.id === 'X'))
})

test('scenario: retiring a barrier withdraws the exemption it granted', () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P1', status: 'retired' }),
		node('B2', { barrier: true, project: 'P2' }),
		node('M', { project: 'P2' }), // in retired B1's pred closure, but not any un-retired barrier's
		edge('RAW', 'M', 'B1'),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'M'))
})

test('scenario: a barrier is not held by the fence of the project it fences', () => {
	const graph = fold([node('B', { barrier: true, project: 'P' }), node('M', { project: 'P' })])
	assert.ok(ready(graph).some((f) => f.id === 'B'))
})

test('scenario: two barriers fencing one project never both surface', () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P', touchSet: [] }),
		node('B2', { barrier: true, project: 'P', touchSet: [] }),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(!(ids.includes('B1') && ids.includes('B2')))
	assert.ok(ids.includes('B1')) // lowest id offered
})

test('scenario: an open barrier is not offered while another barrier of its project is in-flight', () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P', status: 'claimed', touchSet: [] }),
		node('B2', { barrier: true, project: 'P', status: 'open', touchSet: [] }),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'B2'))
})

test('scenario: a quarantined lower-id barrier does not hold a ready barrier of its project', () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P' }),
		node('B2', { barrier: true, project: 'P' }),
		edge('RAW', 'B1', 'B1'), // self-loop -> quarantines B1
	])
	assert.ok(ready(graph).some((f) => f.id === 'B2'))
})

test("scenario: a barrier that RAW-precedes another project's barrier is still capped by its own project", () => {
	const graph = fold([
		node('P-b1', { barrier: true, project: 'P' }), // lower id -> fills P's barrier slot
		node('P-b2', { barrier: true, project: 'P' }), // higher id; RAW-precedes Q's barrier (would be exempt if barriers could be)
		node('Q-b', { barrier: true, project: 'Q' }),
		edge('RAW', 'P-b2', 'Q-b'), // P-b2 in Q-b's strict RAW-predecessor closure
	])
	const ids = ready(graph).map((f) => f.id)
	// Barriers are never exempt: P-b2 stays subject to P's at-most-one cap and is held; only the lowest-id P barrier surfaces.
	assert.ok(!ids.includes('P-b2'), 'P-b2 must be held by P’s cap, never lifted past it by exemption')
	assert.ok(ids.includes('P-b1'), 'P-b1 (lower id) fills P’s barrier slot')
})

test("scenario: a barrier surfaces alongside its project's exempt work when their touch-sets are disjoint", () => {
	const graph = fold([
		node('Bq', { barrier: true, project: 'Q' }),
		node('Bp', { barrier: true, project: 'P', touchSet: ['a'] }),
		node('X', { project: 'P', touchSet: ['b'] }), // exempt via Bq, sibling of Bp's project
		edge('RAW', 'X', 'Bq'),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(ids.includes('Bp') && ids.includes('X'))
})

test("scenario: a barrier waits behind its project's exempt sibling when their touch-sets collide", () => {
	const graph = fold([
		node('Bq', { barrier: true, project: 'Q' }),
		node('Bp', { barrier: true, project: 'P', touchSet: ['a'] }),
		node('A', { project: 'P', touchSet: ['a'] }), // exempt via Bq, collides with Bp, sorts before Bp
		edge('RAW', 'A', 'Bq'),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(ids.includes('A'))
	assert.ok(!ids.includes('Bp'))
})

test("scenario: a barrier predecessor does not stop its project's barrier surfacing", () => {
	const graph = fold([
		node('B1', { barrier: true, project: 'P' }),
		node('B2', { barrier: true, project: 'P' }),
		edge('RAW', 'B2', 'B1'), // B2 is a RAW predecessor of B1; B2 itself has none
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(ids.includes('B2'))
	assert.ok(!ids.includes('B1'))
})

test('scenario: a fenced mission does not consume the WAW tie-break slot from an exempt one', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P' }),
		node('AHeld', { project: 'P', touchSet: ['t'] }), // held by the fence; sorts strictly BEFORE ZExempt under compareIds
		node('ZExempt', { project: 'P', touchSet: ['t'] }), // exempt (RAW pred of B), WAW-collides with AHeld
		edge('RAW', 'ZExempt', 'B'),
	])
	// If the fence ran AFTER the WAW mutex, AHeld (lower id, non-exempt) would win the tie-break slot and
	// starve ZExempt; the fence must run FIRST so AHeld is held before the mutex and ZExempt surfaces.
	assert.ok(ready(graph).some((f) => f.id === 'ZExempt'))
})

test('scenario: exemption lifts the fence but not the WAW-mutex against in-flight work', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P' }),
		node('InFlight', { project: 'P', status: 'claimed', touchSet: ['t'] }),
		node('Exempt', { project: 'P', touchSet: ['t'] }),
		edge('RAW', 'Exempt', 'B'),
	])
	assert.ok(!ready(graph).some((f) => f.id === 'Exempt'))
})

test('scenario: two exempt missions that are WAW-paired never both surface', () => {
	const graph = fold([
		node('B', { barrier: true, project: 'P' }),
		node('E1', { project: 'P', touchSet: ['t'] }),
		node('E2', { project: 'P', touchSet: ['t'] }),
		edge('RAW', 'E1', 'B'),
		edge('RAW', 'E2', 'B'),
	])
	const ids = ready(graph).map((f) => f.id)
	assert.ok(!(ids.includes('E1') && ids.includes('E2')))
})

test("scenario: two projects whose barriers each wait on the other's work still offer progress", () => {
	const graph = fold([
		node('Bp', { barrier: true, project: 'P' }),
		node('Bq', { barrier: true, project: 'Q' }),
		node('Xq', { project: 'Q' }), // Bp's RAW predecessor, sits in project Q
		node('Xp', { project: 'P' }), // Bq's RAW predecessor, sits in project P
		edge('RAW', 'Xq', 'Bp'),
		edge('RAW', 'Xp', 'Bq'),
	])
	assert.ok(ready(graph).length > 0)
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

// ── F3 — the orphan-ref store backend (real, constructed temp git repos) ──

function initGitRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), 'mission-graph-git-'))
	execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir })
	execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
	execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
	writeFileSync(join(dir, 'README.md'), 'dummy\n')
	execFileSync('git', ['add', '.'], { cwd: dir })
	execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir })
	return dir
}

// Writes the in-tree JSONL store directly, bypassing backend resolution — used to construct a
// "pre-migrate" fixture (an in-tree store, no orphan ref) without appendEvent's own backend
// selection picking the orphan-ref backend on a fresh repo.
function writeInTreeEventDirect(dir: string, event: NodeEvent): void {
	const path = join(dir, '.agents', 'mission-graph', 'events.jsonl')
	mkdirSync(join(dir, '.agents', 'mission-graph'), { recursive: true })
	appendFileSync(path, `${JSON.stringify(event)}\n`)
}

test('scenario: an append to the orphan-ref store leaves the working tree clean', () => {
	const dir = initGitRepo()
	try {
		appendOrphanEvent(dir, node('A'))
		const events = readOrphanLines(dir).map((l) => JSON.parse(l))
		assert.equal(events.length, 1)
		assert.equal(events[0].id, 'A')
		const status = execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).trim()
		assert.equal(status, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: an event appended on one branch is visible when read from another branch', () => {
	const dir = initGitRepo()
	try {
		appendOrphanEvent(dir, node('A'))
		execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: dir })
		const events = readOrphanLines(dir).map((l) => JSON.parse(l))
		assert.ok(events.some((e) => e.id === 'A'))

		appendOrphanEvent(dir, node('B'))
		execFileSync('git', ['checkout', '-q', 'main'], { cwd: dir })
		const eventsOnMain = readOrphanLines(dir).map((l) => JSON.parse(l))
		assert.ok(eventsOnMain.some((e) => e.id === 'B'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: an absent orphan ref reads as the empty log', () => {
	const dir = initGitRepo()
	try {
		assert.deepEqual(readOrphanLines(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: a write against a stale ref value is rejected', () => {
	const dir = initGitRepo()
	try {
		appendOrphanEvent(dir, node('A')) // ref = H1
		const stale = orphanHead(dir)
		appendOrphanEvent(dir, node('B')) // ref = H2
		const current = orphanHead(dir)
		assert.notEqual(stale, current)

		assert.throws(() => commitOrphan(dir, [...readOrphanLines(dir), JSON.stringify(node('C'))], stale))
		assert.equal(orphanHead(dir), current) // unchanged after the rejected CAS
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: migrate seeds the orphan ref from an existing in-tree store', () => {
	const dir = initGitRepo()
	try {
		writeInTreeEventDirect(dir, node('A'))
		writeInTreeEventDirect(dir, node('B'))
		assert.equal(resolveBackend(dir, {}), 'in-tree') // pre-migrate: in-tree store exists, no orphan ref
		const before = readEvents(dir)

		const result = migrate(dir)
		assert.equal(result.migrated, true)
		assert.equal(result.count, 2)

		const seeded = readOrphanLines(dir).map((l) => JSON.parse(l))
		assert.deepEqual(
			seeded.map((e) => e.id),
			before.map((e) => (e as NodeEvent).id),
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: migrate is idempotent when the orphan ref is already seeded', () => {
	const dir = initGitRepo()
	try {
		writeInTreeEventDirect(dir, node('A'))
		migrate(dir)
		const head1 = orphanHead(dir)

		const second = migrate(dir)
		assert.equal(second.migrated, false)
		assert.equal(second.reason, 'orphan ref already seeded')
		assert.equal(orphanHead(dir), head1)
		assert.equal(readOrphanLines(dir).length, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: migrate with no in-tree store to seed from creates no ref', () => {
	const dir = initGitRepo()
	try {
		const result = migrate(dir)
		assert.equal(result.migrated, false)
		assert.equal(result.reason, 'no in-tree store to seed from')
		assert.equal(orphanHead(dir), null)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// Precedence guard for "an existing orphan ref selects the orphan-ref backend": pins that the ref
// wins over a LEFTOVER in-tree file — the exact steady state after migrate(), which intentionally
// never deletes the in-tree file. Without this, a resolveBackend precedence regression that silently
// reverted every post-migrate repo to the stale in-tree file would pass the whole suite (impl-judge
// coexistence-gap, #190).
test('resolveBackend: an existing orphan ref wins over a leftover in-tree file (post-migrate coexistence)', () => {
	const dir = initGitRepo()
	try {
		writeInTreeEventDirect(dir, node('A'))
		migrate(dir) // seeds the ref; leaves the in-tree file in place
		assert.notEqual(orphanHead(dir), null) // ref now exists
		assert.equal(resolveBackend(dir, {}), 'orphan-ref') // ref present + in-tree file present -> ref wins
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Backend selection ──

test('scenario: a git work-tree with no in-tree store selects the orphan-ref backend', () => {
	const dir = initGitRepo()
	try {
		assert.equal(resolveBackend(dir, {}), 'orphan-ref')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: an existing orphan ref selects the orphan-ref backend', () => {
	const dir = initGitRepo()
	try {
		appendOrphanEvent(dir, node('A'))
		assert.equal(resolveBackend(dir, {}), 'orphan-ref')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: an in-tree store with no orphan ref keeps the in-tree backend before migration', () => {
	const dir = initGitRepo()
	try {
		writeInTreeEventDirect(dir, node('A'))
		assert.equal(resolveBackend(dir, {}), 'in-tree')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scenario: an explicit store override selects the named backend', () => {
	const dir = initGitRepo()
	try {
		assert.equal(resolveBackend(dir, { MISSION_GRAPH_STORE: 'in-tree' }), 'in-tree')
		assert.equal(resolveBackend(dir, { MISSION_GRAPH_STORE: 'orphan-ref' }), 'orphan-ref')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
