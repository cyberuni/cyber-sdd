#!/usr/bin/env node
// mission-graph — Op1.M1's concrete engine. A git-tracked, append-only event log (nodes, edges,
// status changes, tombstones — schema v:1) plus a zero-dependency fold into two read-only views:
// `ready` (the RAW-satisfied, not-WAW-held frontier) and `cycles` (the SCC-quarantine repair
// view), plus the Operation deliverability check (`checkOperation`).
//
// Architecture — pure derivations are kept separate from I/O, on purpose:
//   - fold / ready / cycles / checkOperation / proposeEdge and their helpers are PURE: they take
//     plain data (an event list, or an already-folded Graph) and return plain data. No fs access.
//     Tests exercise these directly over CONSTRUCTED fixtures — never the live store, which
//     mutates on every retirement (that would make pinned assertions flaky).
//   - readEvents / appendEvent / appendEdgeChecked are the thin store-IO SEAM: v1 reads/writes an
//     in-tree JSONL file. A later swap (to a shared, branch-independent store) only touches this
//     seam — the pure functions above never change.
//   - main() is a thin CLI: argv -> ready | cycles | operation | append(...), rendering TOON by
//     default (the token-efficient tabular form other sdd engines emit) or `--format json`.
//
// No dependencies (the repo's node-≥23.6 / no-deps convention). Pure functions are exported for
// node:test; running the file directly drives the CLI.

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// ── Schema (v:1) ──

export type NodeKind = 'mission' | 'operation'
export type NodeStatus = 'open' | 'claimed' | 'retired'
export type HitlOrAfk = 'hitl' | 'afk'
export type EdgeKind = 'RAW' | 'parent-child' | 'discovered-from'

/**
 * A node event: an add, or a partial update, for one node id. Later events sharing an id are
 * shallow-merged onto earlier ones (only the fields a later event actually carries overwrite —
 * this is how a bare status change folds without repeating the rest of the node). Every field
 * beyond `v`/`type`/`id` is optional so the write path can emit a lean status-only event.
 */
export interface NodeEvent {
	v: 1
	type: 'node'
	id: string
	kind?: NodeKind
	status?: NodeStatus
	touchSet?: string[]
	blast?: string
	hitlOrAfk?: HitlOrAfk
	modelTier?: string
	briefPointer?: string
	/** The originating request(s), kept for the record (README "Non-goals" — never acted on). */
	origin?: string[]
	/** Set only on an Operation node: the Mission that marks it "done enough to ship". */
	capstone?: string
	/** Which project the node belongs to. Absent -> the default project (a real project, the
	 *  sentinel `DEFAULT_PROJECT` — NOT a wildcard). */
	project?: string
	/** Marks the node a barrier — a project-wide mission the fleet must rebase onto before fanning
	 *  out again. Only a Mission may ever be a barrier (write-time INV-1). */
	barrier?: boolean
}

export interface EdgeEvent {
	v: 1
	type: 'edge'
	kind: EdgeKind
	from: string
	to: string
}

/**
 * A tombstone retracts one prior node or edge from the fold. An edge tombstone must name the
 * edge's kind — a (from, to) pair can carry more than one edge kind at once.
 */
export interface TombstoneEvent {
	v: 1
	type: 'tombstone'
	target: 'node' | 'edge'
	id?: string
	kind?: EdgeKind
	from?: string
	to?: string
}

export type MissionGraphEvent = NodeEvent | EdgeEvent | TombstoneEvent

// ── The folded graph ──

export interface GraphNode {
	id: string
	kind: NodeKind
	status: NodeStatus
	touchSet: string[]
	blast: string
	hitlOrAfk: HitlOrAfk
	modelTier: string
	briefPointer: string
	origin: string[]
	capstone?: string
	project: string
	barrier: boolean
	/** The schema version stamped on the node's latest event (forward-compat placeholder — v1
	 *  only exists today; a later version arrives on newer events and rides along unread). */
	schemaVersion: number
}

export interface GraphEdge {
	kind: EdgeKind
	from: string
	to: string
}

export interface Graph {
	nodes: Map<string, GraphNode>
	edges: GraphEdge[]
}

/** The shared default project — a REAL project every project-less node belongs to together, not a
 *  wildcard that matches every project. */
export const DEFAULT_PROJECT = ''

const NODE_DEFAULTS = {
	kind: 'mission' as NodeKind,
	status: 'open' as NodeStatus,
	blast: 'unknown',
	hitlOrAfk: 'hitl' as HitlOrAfk,
	modelTier: 'unspecified',
	briefPointer: '',
	project: DEFAULT_PROJECT,
	barrier: false,
}

function edgeKey(kind: EdgeKind, from: string, to: string): string {
	return JSON.stringify([kind, from, to])
}

/**
 * fold — read the whole append-only event log and work out the current picture: the latest
 * fields of each node win, a tombstone drops its target (node or edge) from the result, and a
 * field the reader doesn't recognize rides along unread — no known derivation looks at it, so a
 * later additive schema field never needs a migration or breaks the fold.
 */
export function fold(events: readonly MissionGraphEvent[]): Graph {
	const nodeFields = new Map<string, Record<string, unknown>>()
	const tombstonedNodes = new Set<string>()
	const edges = new Map<string, GraphEdge>()

	for (const ev of events) {
		if (ev.type === 'node') {
			const prev = nodeFields.get(ev.id) ?? {}
			const merged: Record<string, unknown> = { ...prev }
			for (const [key, value] of Object.entries(ev)) {
				if (key === 'type' || value === undefined) continue
				merged[key] = value
			}
			nodeFields.set(ev.id, merged)
		} else if (ev.type === 'edge') {
			edges.set(edgeKey(ev.kind, ev.from, ev.to), { kind: ev.kind, from: ev.from, to: ev.to })
		} else if (ev.type === 'tombstone') {
			if (ev.target === 'node' && ev.id !== undefined) {
				tombstonedNodes.add(ev.id)
			} else if (ev.target === 'edge' && ev.kind !== undefined && ev.from !== undefined && ev.to !== undefined) {
				edges.delete(edgeKey(ev.kind, ev.from, ev.to))
			}
		}
	}

	const nodes = new Map<string, GraphNode>()
	for (const [id, fields] of nodeFields) {
		if (tombstonedNodes.has(id)) continue
		nodes.set(id, {
			id,
			kind: (fields.kind as NodeKind | undefined) ?? NODE_DEFAULTS.kind,
			status: (fields.status as NodeStatus | undefined) ?? NODE_DEFAULTS.status,
			touchSet: Array.isArray(fields.touchSet) ? [...(fields.touchSet as string[])] : [],
			blast: typeof fields.blast === 'string' ? fields.blast : NODE_DEFAULTS.blast,
			hitlOrAfk: (fields.hitlOrAfk as HitlOrAfk | undefined) ?? NODE_DEFAULTS.hitlOrAfk,
			modelTier: typeof fields.modelTier === 'string' ? fields.modelTier : NODE_DEFAULTS.modelTier,
			briefPointer: typeof fields.briefPointer === 'string' ? fields.briefPointer : NODE_DEFAULTS.briefPointer,
			origin: Array.isArray(fields.origin) ? [...(fields.origin as string[])] : [],
			capstone: typeof fields.capstone === 'string' ? fields.capstone : undefined,
			project: typeof fields.project === 'string' ? fields.project : NODE_DEFAULTS.project,
			barrier: typeof fields.barrier === 'boolean' ? fields.barrier : NODE_DEFAULTS.barrier,
			schemaVersion: typeof fields.v === 'number' ? fields.v : 1,
		})
	}

	// Defensive: an edge whose endpoint was tombstoned (or never existed) never surfaces to a
	// consumer — none of the frozen scenarios exercise this ordering, but a dangling reference
	// must never crash a downstream derivation.
	const liveEdges = [...edges.values()].filter((e) => nodes.has(e.from) && nodes.has(e.to))
	return { nodes, edges: liveEdges }
}

// ── The pinned tie-break — numeric-aware, never random ──

function extractNumber(id: string): number | null {
	const m = /(\d+)/.exec(id)
	return m ? Number(m[1]) : null
}

/**
 * compareIds — the pinned mission-ref tie-break: numeric-aware so "#136" sorts before "#137" and
 * "M2" before "M10" (a plain string sort would get the latter backwards); falls back to plain
 * string order when either side carries no digits. Deterministic, never random.
 */
export function compareIds(a: string, b: string): number {
	const na = extractNumber(a)
	const nb = extractNumber(b)
	if (na !== null && nb !== null && na !== nb) return na - nb
	return a < b ? -1 : a > b ? 1 : 0
}

function intersects(a: readonly string[], b: readonly string[]): boolean {
	if (a.length === 0 || b.length === 0) return false
	const set = new Set(a)
	return b.some((x) => set.has(x))
}

// ── RAW — the dependency edges ──

/** Every node id with a RAW edge pointing at `id` (its direct "must finish before" predecessors). */
export function rawPredecessors(graph: Graph, id: string): string[] {
	return graph.edges.filter((e) => e.kind === 'RAW' && e.to === id).map((e) => e.from)
}

// ── cycles — SCC over RAW edges only; parent-child/discovered-from never form a "wait for" loop ──

export interface RepairItem {
	members: string[]
}

function rawAdjacency(graph: Graph): Map<string, string[]> {
	const adj = new Map<string, string[]>()
	for (const id of graph.nodes.keys()) adj.set(id, [])
	for (const e of graph.edges) {
		if (e.kind !== 'RAW') continue
		const list = adj.get(e.from) ?? []
		list.push(e.to)
		adj.set(e.from, list)
	}
	return adj
}

/** Tarjan's strongly-connected-components pass, restricted to RAW edges. */
export function computeSCCs(graph: Graph): string[][] {
	const adj = rawAdjacency(graph)
	let index = 0
	const indices = new Map<string, number>()
	const lowlink = new Map<string, number>()
	const onStack = new Set<string>()
	const stack: string[] = []
	const sccs: string[][] = []

	function strongconnect(v: string): void {
		indices.set(v, index)
		lowlink.set(v, index)
		index += 1
		stack.push(v)
		onStack.add(v)
		for (const w of adj.get(v) ?? []) {
			if (!indices.has(w)) {
				strongconnect(w)
				lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0))
			} else if (onStack.has(w)) {
				lowlink.set(v, Math.min(lowlink.get(v) ?? 0, indices.get(w) ?? 0))
			}
		}
		if (lowlink.get(v) === indices.get(v)) {
			const component: string[] = []
			let w: string | undefined
			do {
				w = stack.pop()
				if (w === undefined) break
				onStack.delete(w)
				component.push(w)
			} while (w !== v)
			sccs.push(component)
		}
	}

	for (const v of [...graph.nodes.keys()].sort(compareIds)) {
		if (!indices.has(v)) strongconnect(v)
	}
	return sccs
}

/**
 * cycles — reports every RAW strongly-connected component of size > 1, plus any single-node RAW
 * self-loop, as a repair item. An acyclic graph reports none. Never throws — a knotted plan is
 * surfaced, not crashed on.
 */
export function cycles(graph: Graph): RepairItem[] {
	const sccs = computeSCCs(graph)
	const selfLoop = new Set(graph.edges.filter((e) => e.kind === 'RAW' && e.from === e.to).map((e) => e.from))
	const items: RepairItem[] = []
	for (const comp of sccs) {
		const isCycle = comp.length > 1 || selfLoop.has(comp[0])
		if (!isCycle) continue
		items.push({ members: [...comp].sort(compareIds) })
	}
	return items.sort((a, b) => compareIds(a.members[0], b.members[0]))
}

/** Every mission id sitting on a RAW cycle — excluded from `ready` and from unblocking anything
 *  that depends on it; the only way clear is repairing the plan (a merge, or a tombstoned edge). */
export function quarantinedIds(graph: Graph): Set<string> {
	const ids = new Set<string>()
	for (const item of cycles(graph)) for (const m of item.members) ids.add(m)
	return ids
}

// ── The write-time cycle guard (a pure decision — the seam applies it before appending) ──

function canReach(graph: Graph, start: string, target: string): boolean {
	const visited = new Set<string>()
	const stack = [start]
	while (stack.length > 0) {
		const cur = stack.pop()
		if (cur === undefined) continue
		if (cur === target) return true
		if (visited.has(cur)) continue
		visited.add(cur)
		for (const e of graph.edges) {
			if (e.kind === 'RAW' && e.from === cur) stack.push(e.to)
		}
	}
	return false
}

/** Would appending this edge close a RAW cycle? Only RAW ("wait for") edges can — parent-child
 *  and discovered-from are exempt from the guard entirely. */
export function wouldCloseCycle(graph: Graph, proposed: { kind: EdgeKind; from: string; to: string }): boolean {
	if (proposed.kind !== 'RAW') return false
	if (proposed.from === proposed.to) return true
	return canReach(graph, proposed.to, proposed.from)
}

export interface EdgeDecision {
	accepted: boolean
	reason?: string
}

/**
 * proposeEdge — the gentle write-time guard: rejects a RAW edge that would close a cycle unless
 * the writer passes `override: true` to record a genuinely-discovered mutual dependency.
 */
export function proposeEdge(
	graph: Graph,
	proposed: { kind: EdgeKind; from: string; to: string },
	override = false,
): EdgeDecision {
	if (!override && wouldCloseCycle(graph, proposed)) {
		return {
			accepted: false,
			reason: `would close a RAW cycle (${proposed.to} already reaches ${proposed.from})`,
		}
	}
	if (proposed.kind === 'RAW') {
		const candidate: Graph = {
			nodes: graph.nodes,
			edges: [...graph.edges, { kind: proposed.kind, from: proposed.from, to: proposed.to }],
		}
		const violation = checkBarrierInvariants(candidate)
		if (violation) return { accepted: false, reason: violation }
	}
	return { accepted: true }
}

// ── The barrier write-time guards — all fold-then-check: apply the proposed change to the
//    already-folded graph, then reject if the resulting state violates an invariant. Re-run on
//    EVERY append (node or edge) so no ordering of "mark barrier" vs "add the offending edge"
//    can slip a violation through. ──

/**
 * checkBarrierInvariants — runs INV-1/INV-2/INV-3 over an already-simulated (post-append) graph.
 * Returns the first violation's reason, or null when the graph is clean.
 *   INV-1: only a Mission may carry a barrier marking.
 *   INV-2: no un-retired barrier may have a RAW predecessor that is an Operation (an Operation
 *     never retires, so such a barrier would fence its project forever, invisibly to `cycles`).
 *   INV-3: no two un-retired barriers of one project may both be `claimed` at once.
 */
function checkBarrierInvariants(graph: Graph): string | null {
	for (const n of graph.nodes.values()) {
		if (n.barrier && n.kind !== 'mission') {
			return 'INV-1: a barrier marking is only valid on a mission node'
		}
	}
	for (const n of graph.nodes.values()) {
		if (!n.barrier || n.status === 'retired') continue
		for (const predId of rawPredecessors(graph, n.id)) {
			if (graph.nodes.get(predId)?.kind === 'operation') {
				return 'INV-2: an un-retired barrier may not have a RAW predecessor that is an operation'
			}
		}
	}
	const claimedBarriersByProject = new Map<string, number>()
	for (const n of graph.nodes.values()) {
		if (n.barrier && n.status === 'claimed') {
			claimedBarriersByProject.set(n.project, (claimedBarriersByProject.get(n.project) ?? 0) + 1)
		}
	}
	for (const count of claimedBarriersByProject.values()) {
		if (count > 1) return 'INV-3: at most one barrier of a project may be claimed at once'
	}
	return null
}

/**
 * applyNodeEventSimulated — shallow-merges one more node event onto an already-folded graph's
 * existing node (or NODE_DEFAULTS when absent), mirroring `fold`'s per-field merge semantics
 * without re-folding the whole event log — the guard only needs the ONE resulting node.
 */
function applyNodeEventSimulated(graph: Graph, event: NodeEvent): Graph {
	const prev = graph.nodes.get(event.id)
	const merged: GraphNode = {
		id: event.id,
		kind: event.kind ?? prev?.kind ?? NODE_DEFAULTS.kind,
		status: event.status ?? prev?.status ?? NODE_DEFAULTS.status,
		touchSet: event.touchSet ? [...event.touchSet] : (prev?.touchSet ?? []),
		blast: event.blast ?? prev?.blast ?? NODE_DEFAULTS.blast,
		hitlOrAfk: event.hitlOrAfk ?? prev?.hitlOrAfk ?? NODE_DEFAULTS.hitlOrAfk,
		modelTier: event.modelTier ?? prev?.modelTier ?? NODE_DEFAULTS.modelTier,
		briefPointer: event.briefPointer ?? prev?.briefPointer ?? NODE_DEFAULTS.briefPointer,
		origin: event.origin ? [...event.origin] : (prev?.origin ?? []),
		capstone: event.capstone ?? prev?.capstone,
		project: event.project ?? prev?.project ?? NODE_DEFAULTS.project,
		barrier: event.barrier ?? prev?.barrier ?? NODE_DEFAULTS.barrier,
		schemaVersion: typeof event.v === 'number' ? event.v : (prev?.schemaVersion ?? 1),
	}
	const nodes = new Map(graph.nodes)
	nodes.set(event.id, merged)
	return { nodes, edges: graph.edges }
}

/**
 * proposeNode — the write-time guard for a node event: simulates the merge onto the already-
 * folded graph, then rejects (INV-1/INV-2/INV-3) if the resulting state is invalid. Fold-then-
 * check, exactly like `proposeEdge` — so marking a node a barrier AFTER an Operation RAW edge
 * already exists is caught exactly like the reverse order.
 */
export function proposeNode(graph: Graph, event: NodeEvent): EdgeDecision {
	const candidate = applyNodeEventSimulated(graph, event)
	const violation = checkBarrierInvariants(candidate)
	if (violation) return { accepted: false, reason: violation }
	return { accepted: true }
}

// ── Operations — grouping (parent-child) ──

function declaredMembers(graph: Graph, operationId: string): string[] {
	return graph.edges.filter((e) => e.kind === 'parent-child' && e.from === operationId).map((e) => e.to)
}

/** The Operation a Mission is declared under (via a parent-child edge), or null when it is its
 *  own Mission with no group. */
export function operationOf(graph: Graph, missionId: string): string | null {
	const edge = graph.edges.find((e) => e.kind === 'parent-child' && e.to === missionId)
	return edge ? edge.from : null
}

export interface OperationSummary {
	id: string
	capstone?: string
	members: string[]
}

/** Every Operation node and its declared Mission members, sorted for stable reading. */
export function listOperations(graph: Graph): OperationSummary[] {
	const ops: OperationSummary[] = []
	for (const n of graph.nodes.values()) {
		if (n.kind !== 'operation') continue
		ops.push({ id: n.id, capstone: n.capstone, members: declaredMembers(graph, n.id).sort(compareIds) })
	}
	return ops.sort((a, b) => compareIds(a.id, b.id))
}

function rawClosure(graph: Graph, start: string): Set<string> {
	const seen = new Set<string>()
	const stack = [start]
	while (stack.length > 0) {
		const cur = stack.pop()
		if (cur === undefined || seen.has(cur)) continue
		seen.add(cur)
		for (const e of graph.edges) {
			if (e.kind === 'RAW' && e.to === cur) stack.push(e.from)
		}
	}
	return seen
}

export interface OperationCheck {
	dependencyClosed: boolean
	missingPrereqs: string[]
	releaseFloor: string[]
	progress: { completed: number; total: number }
}

/**
 * checkOperation — the shippable-group view for one Operation: dependency-closed iff the
 * capstone's RAW closure is a subset of the declared set (a missing prerequisite is flagged; a
 * declared support member outside the closure is legal and never flagged); the release floor is
 * the capstone's closure alone (support members never gate release); progress is completed/total
 * over the declared Missions only.
 */
export function checkOperation(graph: Graph, operationId: string): OperationCheck {
	const declared = declaredMembers(graph, operationId)
	const declaredSet = new Set(declared)
	const capstone = graph.nodes.get(operationId)?.capstone
	const closure = capstone !== undefined ? rawClosure(graph, capstone) : new Set<string>()
	const missingPrereqs = [...closure].filter((id) => !declaredSet.has(id)).sort(compareIds)
	const completed = declared.filter((id) => graph.nodes.get(id)?.status === 'retired').length

	return {
		dependencyClosed: missingPrereqs.length === 0,
		missingPrereqs,
		releaseFloor: [...closure].sort(compareIds),
		progress: { completed, total: declared.length },
	}
}

// ── ready — the RAW-satisfied, not-WAW-held frontier ──

export interface FrontierEntry {
	id: string
	/** The node's kind — always 'mission' in v1: an Operation is a container, never itself
	 *  scheduled, so it never becomes a frontier candidate. */
	node: NodeKind
	operation: string | null
	blast: string
	hitlOrAfk: HitlOrAfk
	modelTier: string
	briefPointer: string
	whyReady: string
}

function isRawSatisfied(graph: Graph, quarantined: ReadonlySet<string>, id: string): boolean {
	return rawPredecessors(graph, id).every((p) => {
		if (quarantined.has(p)) return false
		return graph.nodes.get(p)?.status === 'retired'
	})
}

function whyReady(graph: Graph, id: string): string {
	const preds = rawPredecessors(graph, id)
	if (preds.length === 0) return 'no RAW predecessors'
	return `RAW-satisfied: ${[...preds].sort(compareIds).join(', ')} retired`
}

/** An un-retired barrier — open or claimed — is "live": it grants exemption (clause 1), fences its
 *  project (clause 3), and occupies its project's at-most-one slot (clause 2). */
function isLiveBarrier(n: GraphNode): boolean {
	return n.barrier && n.status !== 'retired'
}

/**
 * fenceExempt — clause 1's exempt set: every NON-barrier mission in the STRICT RAW-predecessor
 * closure of any live (un-retired) barrier, graph-global (not scoped to the barrier's own
 * project — an acyclic two-project deadlock needs the exemption to cross project lines). Barriers
 * are NEVER exempt, so a barrier that is itself a RAW predecessor of another project's barrier
 * cannot use exemption to dodge its own project's at-most-one cap (clause 2).
 */
function fenceExempt(graph: Graph): Set<string> {
	const exempt = new Set<string>()
	for (const b of graph.nodes.values()) {
		if (!isLiveBarrier(b)) continue
		for (const id of rawClosure(graph, b.id)) {
			if (id === b.id) continue // strict — rawClosure is reflexive
			const m = graph.nodes.get(id)
			if (m && !m.barrier) exempt.add(id)
		}
	}
	return exempt
}

/**
 * barrierHeldByCap — clause 2, the at-most-one-barrier-per-project offer cap, evaluated over
 * UN-RETIRED barriers of `candidate`'s project (open ∪ claimed, never just the open `candidates`
 * set — a claimed barrier still fills the slot even though it's no longer itself a candidate).
 * Holds `candidate` when either another un-retired barrier of the project is already claimed, or a
 * lower-id OPEN RAW-satisfied barrier of the project exists (a quarantined or RAW-blocked one never
 * fills the slot).
 */
function barrierHeldByCap(
	graph: Graph,
	quarantined: ReadonlySet<string>,
	liveBarriersOfProject: readonly GraphNode[],
	candidate: GraphNode,
): boolean {
	const claimedElsewhere = liveBarriersOfProject.some((b) => b.id !== candidate.id && b.status === 'claimed')
	if (claimedElsewhere) return true
	const lowerIdOpenRawSatisfied = liveBarriersOfProject.some(
		(b) =>
			b.id !== candidate.id &&
			b.status === 'open' &&
			!quarantined.has(b.id) &&
			isRawSatisfied(graph, quarantined, b.id) &&
			compareIds(b.id, candidate.id) < 0,
	)
	return lowerIdOpenRawSatisfied
}

/**
 * ready — reads the graph without changing it and returns every Mission that is both RAW-satisfied
 * (every RAW predecessor retired, transitively — realized here as each direct predecessor's own
 * recorded status, which composes: a blocked predecessor can never itself be retired) and not
 * WAW-held. Two WAW triggers: (1) an open candidate whose touch-set intersects an in-flight
 * (claimed) mission's is held; (2) among the remaining RAW-satisfied candidates, an intersecting
 * pair never both surface — the pinned lowest-id tie-break (compareIds) admits one and holds the
 * rest, guaranteeing the frontier never contains a WAW pair. A cycle-quarantined mission (and
 * anything depending on it) is excluded regardless of its recorded status.
 *
 * Before the WAW-mutex, the RAW-satisfied non-quarantined candidates pass through the barrier
 * fence (fold-time, never a stored edge — see the .feature "ready — the barrier fence" block):
 * clause 1 lifts a non-barrier in any live barrier's strict RAW-predecessor closure from every
 * fence (graph-global); clause 2 caps each project to at most one offered barrier (counting
 * open+claimed, so an in-flight barrier still fills the slot); clause 3 holds every other
 * non-barrier, non-exempt candidate of a fenced project outright, regardless of touch-set (an
 * empty-touch-set barrier still fences — the fence never delegates to the WAW-mutex).
 *
 * Deterministic: same graph in, same frontier in the same order out. Read-only: never mutates
 * `graph`.
 */
export function ready(graph: Graph): FrontierEntry[] {
	const quarantined = quarantinedIds(graph)
	const missions = [...graph.nodes.values()].filter((n) => n.kind === 'mission')
	const inFlightTouchSets = missions.filter((n) => n.status === 'claimed').map((n) => n.touchSet)

	const rawSatisfiedOpen = missions.filter(
		(n) => n.status === 'open' && !quarantined.has(n.id) && isRawSatisfied(graph, quarantined, n.id),
	)

	// ── The barrier fence (fold-time, applied to the RAW-satisfied candidates before the WAW-mutex) ──
	const liveBarriers = missions.filter(isLiveBarrier)
	const exempt = fenceExempt(graph)
	const fencedProjects = new Set(liveBarriers.map((b) => b.project))

	const candidates = rawSatisfiedOpen.filter((c) => {
		if (c.barrier) {
			const ofProject = liveBarriers.filter((b) => b.project === c.project)
			return !barrierHeldByCap(graph, quarantined, ofProject, c)
		}
		if (exempt.has(c.id)) return true // clause 1 — lifted from every fence, graph-global
		if (fencedProjects.has(c.project)) return false // clause 3 — held outright, regardless of touch-set
		return true
	})

	const notHeldByInFlight = candidates.filter((n) => !inFlightTouchSets.some((t) => intersects(t, n.touchSet)))

	// Trigger 2: the pinned lowest-id tie-break. Processing in ascending id order and admitting a
	// candidate only when its touch-set is disjoint from every already-admitted (necessarily
	// lower-id) candidate's guarantees no two admitted candidates ever collide.
	const sorted = [...notHeldByInFlight].sort((a, b) => compareIds(a.id, b.id))
	const admitted: GraphNode[] = []
	const claimedTouch: string[] = []
	for (const n of sorted) {
		if (intersects(n.touchSet, claimedTouch)) continue
		admitted.push(n)
		claimedTouch.push(...n.touchSet)
	}

	return admitted
		.sort((a, b) => compareIds(a.id, b.id))
		.map((n) => ({
			id: n.id,
			node: n.kind,
			operation: operationOf(graph, n.id),
			blast: n.blast,
			hitlOrAfk: n.hitlOrAfk,
			modelTier: n.modelTier,
			briefPointer: n.briefPointer,
			whyReady: whyReady(graph, n.id),
		}))
}

// ── Store IO seam (v1: in-tree JSONL under <root>/.agents/mission-graph/events.jsonl;
//    F3 adds a second backend: a git orphan ref, branch-independent and working-tree-clean) ──
// Isolated so a store swap never touches any pure function above — every one of them takes/
// returns plain data, with no fs access of its own.

const STORE_RELATIVE_PATH = ['.agents', 'mission-graph', 'events.jsonl']

function storePath(root: string): string {
	return join(root, ...STORE_RELATIVE_PATH)
}

/** Read the in-tree JSONL store's raw (trimmed, non-empty) lines — used by both the in-tree
 *  backend and `migrate` (which copies these verbatim, never re-serialized). */
function readInTreeLines(root: string): string[] {
	const path = storePath(root)
	if (!existsSync(path)) return []
	return readFileSync(path, 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

function readInTreeEvents(root: string): MissionGraphEvent[] {
	return readInTreeLines(root).map((line) => JSON.parse(line) as MissionGraphEvent)
}

function appendInTreeEvent(root: string, event: MissionGraphEvent): void {
	const path = storePath(root)
	mkdirSync(dirname(path), { recursive: true })
	appendFileSync(path, `${JSON.stringify(event)}\n`)
}

// ── F3: the orphan-ref backend — refs/sdd/mission-graph, read/written via git plumbing ──

export const ORPHAN_REF = 'refs/sdd/mission-graph'
const ORPHAN_STORE_FILE = 'events.jsonl'

function git(root: string, args: string[], input?: string): string {
	return execFileSync('git', args, { cwd: root, input, encoding: 'utf8' }).trim()
}

function isGitWorkTree(root: string): boolean {
	try {
		return git(root, ['rev-parse', '--is-inside-work-tree']) === 'true'
	} catch {
		return false
	}
}

function orphanRefExists(root: string): boolean {
	try {
		git(root, ['rev-parse', '--verify', '--quiet', ORPHAN_REF])
		return true
	} catch {
		return false
	}
}

export function orphanHead(root: string): string | null {
	if (!orphanRefExists(root)) return null
	return git(root, ['rev-parse', ORPHAN_REF])
}

export function readOrphanLines(root: string): string[] {
	if (!orphanRefExists(root)) return []
	const text = git(root, ['cat-file', '-p', `${ORPHAN_REF}:${ORPHAN_STORE_FILE}`])
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

function readOrphanEvents(root: string): MissionGraphEvent[] {
	return readOrphanLines(root).map((line) => JSON.parse(line) as MissionGraphEvent)
}

/** blob -> tree -> commit -> update-ref, compare-and-swap on `expectedOld` (the ref value the
 *  caller last observed). `null` means "the ref must not yet exist"; a stale/mismatched old value
 *  makes `update-ref` throw — that throw IS the CAS rejection, and the ref is left unchanged. */
export function commitOrphan(root: string, lines: string[], expectedOld: string | null): string {
	const content = lines.length ? `${lines.join('\n')}\n` : ''
	const blob = git(root, ['hash-object', '-w', '--stdin'], content)
	const tree = git(root, ['mktree'], `100644 blob ${blob}\t${ORPHAN_STORE_FILE}\n`)
	const commitArgs = ['commit-tree', tree]
	if (expectedOld !== null) commitArgs.push('-p', expectedOld)
	const commit = git(root, commitArgs, 'mission-graph: append')
	git(root, ['update-ref', ORPHAN_REF, commit, expectedOld ?? ''])
	return commit
}

export function appendOrphanEvent(root: string, event: MissionGraphEvent): void {
	const old = orphanHead(root)
	const lines = readOrphanLines(root)
	lines.push(JSON.stringify(event))
	commitOrphan(root, lines, old)
}

// ── Backend selection ──

export type StoreBackend = 'in-tree' | 'orphan-ref'

/**
 * resolveBackend — an explicit `MISSION_GRAPH_STORE` override wins outright; otherwise a
 * non-git-work-tree always stays in-tree (the orphan-ref backend needs git plumbing); inside a
 * work-tree, an existing orphan ref wins (already migrated); otherwise an existing in-tree store
 * keeps the in-tree backend so a pre-migrate v1 adopter is never silently orphaned; only a fresh
 * work-tree with neither picks the orphan-ref backend outright.
 */
export function resolveBackend(root: string, env: Record<string, string | undefined> = process.env): StoreBackend {
	const override = env.MISSION_GRAPH_STORE
	if (override === 'in-tree' || override === 'orphan-ref') return override
	if (!isGitWorkTree(root)) return 'in-tree'
	if (orphanRefExists(root)) return 'orphan-ref'
	if (existsSync(storePath(root))) return 'in-tree'
	return 'orphan-ref'
}

/** Read the append-only event log back. An absent store reads as the empty log (a fresh project). */
export function readEvents(root: string): MissionGraphEvent[] {
	if (resolveBackend(root) === 'orphan-ref') return readOrphanEvents(root)
	return readInTreeEvents(root)
}

/** Append one event line. The one writer for now is a person at the CLI; later, one automated
 *  coordinator — never split across writers, so there is nothing to reconcile. */
export function appendEvent(root: string, event: MissionGraphEvent): void {
	if (resolveBackend(root) === 'orphan-ref') {
		appendOrphanEvent(root, event)
		return
	}
	appendInTreeEvent(root, event)
}

export interface MigrateResult {
	migrated: boolean
	reason: string
	count: number
}

/**
 * migrate — one-time, idempotent: seeds the orphan ref from the existing in-tree store, copying
 * its raw lines verbatim (never parsed and re-serialized, so exact bytes/order are preserved).
 * A no-op (never throws) when there is nothing to seed from, or the ref is already seeded.
 */
export function migrate(root: string): MigrateResult {
	if (!isGitWorkTree(root)) return { migrated: false, reason: 'not a git work-tree', count: 0 }
	if (orphanRefExists(root)) {
		return { migrated: false, reason: 'orphan ref already seeded', count: readOrphanLines(root).length }
	}
	const rawLines = readInTreeLines(root)
	if (rawLines.length === 0) return { migrated: false, reason: 'no in-tree store to seed from', count: 0 }
	commitOrphan(root, rawLines, null)
	return { migrated: true, reason: 'seeded orphan ref from in-tree store', count: rawLines.length }
}

/** Append a proposed RAW/parent-child/discovered-from edge through the write-time cycle guard;
 *  only appends when the guard accepts (or the caller overrides it). */
export function appendEdgeChecked(
	root: string,
	proposed: { kind: EdgeKind; from: string; to: string },
	override = false,
): EdgeDecision {
	const graph = fold(readEvents(root))
	const decision = proposeEdge(graph, proposed, override)
	if (decision.accepted) appendEvent(root, { v: 1, type: 'edge', ...proposed })
	return decision
}

/** Append a node event through the write-time barrier guards (INV-1/INV-2/INV-3); only appends
 *  when the guard accepts. */
export function appendNodeChecked(root: string, event: NodeEvent): EdgeDecision {
	const graph = fold(readEvents(root))
	const decision = proposeNode(graph, event)
	if (decision.accepted) appendEvent(root, event)
	return decision
}

// ── Render (TOON — the token-efficient tabular form the repo's other sdd engines emit) ──

function toonQuote(v: string): string {
	if (v === '' || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function renderFrontierToon(entries: FrontierEntry[]): string {
	const header = `ready[${entries.length}]{id,node,operation,blast,hitlOrAfk,modelTier,briefPointer,whyReady}:`
	const rows = entries.map((e) =>
		[e.id, e.node, e.operation ?? '', e.blast, e.hitlOrAfk, e.modelTier, e.briefPointer, e.whyReady]
			.map((v) => toonQuote(v))
			.join(','),
	)
	return [header, ...rows.map((r) => `  ${r}`)].join('\n')
}

export function renderCyclesToon(items: RepairItem[]): string {
	const header = `cycles[${items.length}]{scc,members}:`
	const rows = items.map((item, i) => `  scc-${i + 1},"${item.members.join(';')}"`)
	return [header, ...rows].join('\n')
}

export function renderOperationToon(id: string, check: OperationCheck): string {
	return [
		`operation: ${id}`,
		`dependencyClosed: ${check.dependencyClosed}`,
		`missingPrereqs: ${check.missingPrereqs.join(';')}`,
		`releaseFloor: ${check.releaseFloor.join(';')}`,
		`progress: ${check.progress.completed}/${check.progress.total}`,
	].join('\n')
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

function hasFlag(argv: string[], name: string): boolean {
	return argv.includes(name)
}

function splitCsv(v: string | undefined): string[] {
	if (v === undefined || v === '') return []
	return v
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

function isEdgeKind(v: string | undefined): v is EdgeKind {
	return v === 'RAW' || v === 'parent-child' || v === 'discovered-from'
}

function runAppendNode(rest: string[], root: string): number {
	const id = flag(rest, '--id')
	if (id === undefined) {
		process.stderr.write('mission-graph append node: --id is required\n')
		return 1
	}
	const event: NodeEvent = { v: 1, type: 'node', id }
	const nodeKind = flag(rest, '--kind')
	if (nodeKind === 'mission' || nodeKind === 'operation') event.kind = nodeKind
	const status = flag(rest, '--status')
	if (status === 'open' || status === 'claimed' || status === 'retired') event.status = status
	const touchSet = flag(rest, '--touch-set')
	if (touchSet !== undefined) event.touchSet = splitCsv(touchSet)
	const blast = flag(rest, '--blast')
	if (blast !== undefined) event.blast = blast
	if (hasFlag(rest, '--hitl')) event.hitlOrAfk = 'hitl'
	if (hasFlag(rest, '--afk')) event.hitlOrAfk = 'afk'
	const modelTier = flag(rest, '--model-tier')
	if (modelTier !== undefined) event.modelTier = modelTier
	const briefPointer = flag(rest, '--brief-pointer')
	if (briefPointer !== undefined) event.briefPointer = briefPointer
	const capstone = flag(rest, '--capstone')
	if (capstone !== undefined) event.capstone = capstone
	const project = flag(rest, '--project')
	if (project !== undefined) event.project = project
	if (hasFlag(rest, '--barrier')) event.barrier = true
	const decision = appendNodeChecked(root, event)
	if (!decision.accepted) {
		process.stderr.write(`mission-graph append node: rejected — ${decision.reason}\n`)
		return 1
	}
	process.stdout.write(`mission-graph: appended node ${id}\n`)
	return 0
}

function runAppendEdge(rest: string[], root: string): number {
	const edgeKind = flag(rest, '--kind')
	const from = flag(rest, '--from')
	const to = flag(rest, '--to')
	if (!isEdgeKind(edgeKind) || from === undefined || to === undefined) {
		process.stderr.write(
			'mission-graph append edge: --kind <RAW|parent-child|discovered-from> --from <id> --to <id> are required\n',
		)
		return 1
	}
	const decision = appendEdgeChecked(root, { kind: edgeKind, from, to }, hasFlag(rest, '--override'))
	if (!decision.accepted) {
		process.stderr.write(`mission-graph append edge: rejected — ${decision.reason}\n`)
		return 1
	}
	process.stdout.write(`mission-graph: appended edge ${edgeKind} ${from} -> ${to}\n`)
	return 0
}

function runAppendTombstone(rest: string[], root: string): number {
	const target = flag(rest, '--target')
	if (target === 'node') {
		const id = flag(rest, '--id')
		if (id === undefined) {
			process.stderr.write('mission-graph append tombstone: --id is required for a node tombstone\n')
			return 1
		}
		appendEvent(root, { v: 1, type: 'tombstone', target: 'node', id })
		process.stdout.write(`mission-graph: tombstoned node ${id}\n`)
		return 0
	}
	if (target === 'edge') {
		const edgeKind = flag(rest, '--kind')
		const from = flag(rest, '--from')
		const to = flag(rest, '--to')
		if (!isEdgeKind(edgeKind) || from === undefined || to === undefined) {
			process.stderr.write('mission-graph append tombstone: --kind --from --to are required for an edge tombstone\n')
			return 1
		}
		appendEvent(root, { v: 1, type: 'tombstone', target: 'edge', kind: edgeKind, from, to })
		process.stdout.write(`mission-graph: tombstoned edge ${edgeKind} ${from} -> ${to}\n`)
		return 0
	}
	process.stderr.write('mission-graph append tombstone: --target <node|edge> is required\n')
	return 1
}

function runAppend(argv: string[], root: string): number {
	const [kind, ...rest] = argv
	if (kind === 'node') return runAppendNode(rest, root)
	if (kind === 'edge') return runAppendEdge(rest, root)
	if (kind === 'tombstone') return runAppendTombstone(rest, root)
	process.stderr.write('mission-graph append: usage: append <node|edge|tombstone> ...\n')
	return 1
}

export function main(argv: string[]): number {
	const [cmd, ...rest] = argv
	const root = flag(rest, '--root') ?? '.'
	const format = flag(rest, '--format') === 'json' ? 'json' : 'toon'

	if (cmd === 'ready') {
		const entries = ready(fold(readEvents(root)))
		process.stdout.write(`${format === 'json' ? JSON.stringify(entries, null, 2) : renderFrontierToon(entries)}\n`)
		return 0
	}
	if (cmd === 'cycles') {
		const items = cycles(fold(readEvents(root)))
		process.stdout.write(`${format === 'json' ? JSON.stringify(items, null, 2) : renderCyclesToon(items)}\n`)
		return 0
	}
	if (cmd === 'operation') {
		const id = flag(rest, '--id')
		if (id === undefined) {
			process.stderr.write('mission-graph operation: --id <operation-id> is required\n')
			return 1
		}
		const check = checkOperation(fold(readEvents(root)), id)
		process.stdout.write(`${format === 'json' ? JSON.stringify(check, null, 2) : renderOperationToon(id, check)}\n`)
		return 0
	}
	if (cmd === 'append') return runAppend(rest, root)
	if (cmd === 'migrate') {
		const result = migrate(root)
		process.stdout.write(
			`${
				format === 'json'
					? JSON.stringify(result, null, 2)
					: `migrated: ${result.migrated}\nreason: ${result.reason}\ncount: ${result.count}`
			}\n`,
		)
		return result.reason === 'not a git work-tree' ? 1 : 0
	}

	process.stderr.write(
		'mission-graph: usage: ready | cycles | operation --id <id> | append <node|edge|tombstone> ... | migrate\n',
	)
	return 1
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
