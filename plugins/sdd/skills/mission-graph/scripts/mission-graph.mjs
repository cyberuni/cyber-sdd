#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/mission-graph/mission-graph.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/mission-graph/scripts/mission-graph.mjs","commands":{}};
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/mission-graph/mission-graph.mts
/** The shared default project — a REAL project every project-less node belongs to together, not a
*  wildcard that matches every project. */
const DEFAULT_PROJECT = "";
const NODE_DEFAULTS = {
	kind: "mission",
	status: "open",
	blast: "unknown",
	hitlOrAfk: "hitl",
	modelTier: "unspecified",
	briefPointer: "",
	project: "",
	barrier: false
};
function edgeKey(kind, from, to) {
	return JSON.stringify([
		kind,
		from,
		to
	]);
}
/**
* fold — read the whole append-only event log and work out the current picture: the latest
* fields of each node win, a tombstone drops its target (node or edge) from the result, and a
* field the reader doesn't recognize rides along unread — no known derivation looks at it, so a
* later additive schema field never needs a migration or breaks the fold.
*/
function fold(events) {
	const nodeFields = /* @__PURE__ */ new Map();
	const tombstonedNodes = /* @__PURE__ */ new Set();
	const edges = /* @__PURE__ */ new Map();
	for (const ev of events) if (ev.type === "node") {
		const merged = { ...nodeFields.get(ev.id) ?? {} };
		for (const [key, value] of Object.entries(ev)) {
			if (key === "type" || value === void 0) continue;
			merged[key] = value;
		}
		nodeFields.set(ev.id, merged);
	} else if (ev.type === "edge") edges.set(edgeKey(ev.kind, ev.from, ev.to), {
		kind: ev.kind,
		from: ev.from,
		to: ev.to
	});
	else if (ev.type === "tombstone") {
		if (ev.target === "node" && ev.id !== void 0) tombstonedNodes.add(ev.id);
		else if (ev.target === "edge" && ev.kind !== void 0 && ev.from !== void 0 && ev.to !== void 0) edges.delete(edgeKey(ev.kind, ev.from, ev.to));
	}
	const nodes = /* @__PURE__ */ new Map();
	for (const [id, fields] of nodeFields) {
		if (tombstonedNodes.has(id)) continue;
		nodes.set(id, {
			id,
			kind: fields.kind ?? NODE_DEFAULTS.kind,
			status: fields.status ?? NODE_DEFAULTS.status,
			touchSet: Array.isArray(fields.touchSet) ? [...fields.touchSet] : [],
			blast: typeof fields.blast === "string" ? fields.blast : NODE_DEFAULTS.blast,
			hitlOrAfk: fields.hitlOrAfk ?? NODE_DEFAULTS.hitlOrAfk,
			modelTier: typeof fields.modelTier === "string" ? fields.modelTier : NODE_DEFAULTS.modelTier,
			briefPointer: typeof fields.briefPointer === "string" ? fields.briefPointer : NODE_DEFAULTS.briefPointer,
			origin: Array.isArray(fields.origin) ? [...fields.origin] : [],
			capstone: typeof fields.capstone === "string" ? fields.capstone : void 0,
			project: typeof fields.project === "string" ? fields.project : NODE_DEFAULTS.project,
			barrier: typeof fields.barrier === "boolean" ? fields.barrier : NODE_DEFAULTS.barrier,
			schemaVersion: typeof fields.v === "number" ? fields.v : 1
		});
	}
	return {
		nodes,
		edges: [...edges.values()].filter((e) => nodes.has(e.from) && nodes.has(e.to))
	};
}
function extractNumber(id) {
	const m = /(\d+)/.exec(id);
	return m ? Number(m[1]) : null;
}
/**
* compareIds — the pinned mission-ref tie-break: numeric-aware so "#136" sorts before "#137" and
* "M2" before "M10" (a plain string sort would get the latter backwards); falls back to plain
* string order when either side carries no digits. Deterministic, never random.
*/
function compareIds(a, b) {
	const na = extractNumber(a);
	const nb = extractNumber(b);
	if (na !== null && nb !== null && na !== nb) return na - nb;
	return a < b ? -1 : a > b ? 1 : 0;
}
function intersects(a, b) {
	if (a.length === 0 || b.length === 0) return false;
	const set = new Set(a);
	return b.some((x) => set.has(x));
}
/** Every node id with a RAW edge pointing at `id` (its direct "must finish before" predecessors). */
function rawPredecessors(graph, id) {
	return graph.edges.filter((e) => e.kind === "RAW" && e.to === id).map((e) => e.from);
}
function rawAdjacency(graph) {
	const adj = /* @__PURE__ */ new Map();
	for (const id of graph.nodes.keys()) adj.set(id, []);
	for (const e of graph.edges) {
		if (e.kind !== "RAW") continue;
		const list = adj.get(e.from) ?? [];
		list.push(e.to);
		adj.set(e.from, list);
	}
	return adj;
}
/** Tarjan's strongly-connected-components pass, restricted to RAW edges. */
function computeSCCs(graph) {
	const adj = rawAdjacency(graph);
	let index = 0;
	const indices = /* @__PURE__ */ new Map();
	const lowlink = /* @__PURE__ */ new Map();
	const onStack = /* @__PURE__ */ new Set();
	const stack = [];
	const sccs = [];
	function strongconnect(v) {
		indices.set(v, index);
		lowlink.set(v, index);
		index += 1;
		stack.push(v);
		onStack.add(v);
		for (const w of adj.get(v) ?? []) if (!indices.has(w)) {
			strongconnect(w);
			lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
		} else if (onStack.has(w)) lowlink.set(v, Math.min(lowlink.get(v) ?? 0, indices.get(w) ?? 0));
		if (lowlink.get(v) === indices.get(v)) {
			const component = [];
			let w;
			do {
				w = stack.pop();
				if (w === void 0) break;
				onStack.delete(w);
				component.push(w);
			} while (w !== v);
			sccs.push(component);
		}
	}
	for (const v of [...graph.nodes.keys()].sort(compareIds)) if (!indices.has(v)) strongconnect(v);
	return sccs;
}
/**
* cycles — reports every RAW strongly-connected component of size > 1, plus any single-node RAW
* self-loop, as a repair item. An acyclic graph reports none. Never throws — a knotted plan is
* surfaced, not crashed on.
*/
function cycles(graph) {
	const sccs = computeSCCs(graph);
	const selfLoop = new Set(graph.edges.filter((e) => e.kind === "RAW" && e.from === e.to).map((e) => e.from));
	const items = [];
	for (const comp of sccs) {
		if (!(comp.length > 1 || selfLoop.has(comp[0]))) continue;
		items.push({ members: [...comp].sort(compareIds) });
	}
	return items.sort((a, b) => compareIds(a.members[0], b.members[0]));
}
/** Every mission id sitting on a RAW cycle — excluded from `ready` and from unblocking anything
*  that depends on it; the only way clear is repairing the plan (a merge, or a tombstoned edge). */
function quarantinedIds(graph) {
	const ids = /* @__PURE__ */ new Set();
	for (const item of cycles(graph)) for (const m of item.members) ids.add(m);
	return ids;
}
function canReach(graph, start, target) {
	const visited = /* @__PURE__ */ new Set();
	const stack = [start];
	while (stack.length > 0) {
		const cur = stack.pop();
		if (cur === void 0) continue;
		if (cur === target) return true;
		if (visited.has(cur)) continue;
		visited.add(cur);
		for (const e of graph.edges) if (e.kind === "RAW" && e.from === cur) stack.push(e.to);
	}
	return false;
}
/** Would appending this edge close a RAW cycle? Only RAW ("wait for") edges can — parent-child
*  and discovered-from are exempt from the guard entirely. */
function wouldCloseCycle(graph, proposed) {
	if (proposed.kind !== "RAW") return false;
	if (proposed.from === proposed.to) return true;
	return canReach(graph, proposed.to, proposed.from);
}
/**
* proposeEdge — the gentle write-time guard: rejects a RAW edge that would close a cycle unless
* the writer passes `override: true` to record a genuinely-discovered mutual dependency.
*/
function proposeEdge(graph, proposed, override = false) {
	if (!override && wouldCloseCycle(graph, proposed)) return {
		accepted: false,
		reason: `would close a RAW cycle (${proposed.to} already reaches ${proposed.from})`
	};
	if (proposed.kind === "RAW") {
		const violation = checkBarrierInvariants({
			nodes: graph.nodes,
			edges: [...graph.edges, {
				kind: proposed.kind,
				from: proposed.from,
				to: proposed.to
			}]
		});
		if (violation) return {
			accepted: false,
			reason: violation
		};
	}
	return { accepted: true };
}
/**
* checkBarrierInvariants — runs INV-1/INV-2/INV-3 over an already-simulated (post-append) graph.
* Returns the first violation's reason, or null when the graph is clean.
*   INV-1: only a Mission may carry a barrier marking.
*   INV-2: no un-retired barrier may have a RAW predecessor that is an Operation (an Operation
*     never retires, so such a barrier would fence its project forever, invisibly to `cycles`).
*   INV-3: no two un-retired barriers of one project may both be `claimed` at once.
*/
function checkBarrierInvariants(graph) {
	for (const n of graph.nodes.values()) if (n.barrier && n.kind !== "mission") return "INV-1: a barrier marking is only valid on a mission node";
	for (const n of graph.nodes.values()) {
		if (!n.barrier || n.status === "retired") continue;
		for (const predId of rawPredecessors(graph, n.id)) if (graph.nodes.get(predId)?.kind === "operation") return "INV-2: an un-retired barrier may not have a RAW predecessor that is an operation";
	}
	const claimedBarriersByProject = /* @__PURE__ */ new Map();
	for (const n of graph.nodes.values()) if (n.barrier && n.status === "claimed") claimedBarriersByProject.set(n.project, (claimedBarriersByProject.get(n.project) ?? 0) + 1);
	for (const count of claimedBarriersByProject.values()) if (count > 1) return "INV-3: at most one barrier of a project may be claimed at once";
	return null;
}
/**
* applyNodeEventSimulated — shallow-merges one more node event onto an already-folded graph's
* existing node (or NODE_DEFAULTS when absent), mirroring `fold`'s per-field merge semantics
* without re-folding the whole event log — the guard only needs the ONE resulting node.
*/
function applyNodeEventSimulated(graph, event) {
	const prev = graph.nodes.get(event.id);
	const merged = {
		id: event.id,
		kind: event.kind ?? prev?.kind ?? NODE_DEFAULTS.kind,
		status: event.status ?? prev?.status ?? NODE_DEFAULTS.status,
		touchSet: event.touchSet ? [...event.touchSet] : prev?.touchSet ?? [],
		blast: event.blast ?? prev?.blast ?? NODE_DEFAULTS.blast,
		hitlOrAfk: event.hitlOrAfk ?? prev?.hitlOrAfk ?? NODE_DEFAULTS.hitlOrAfk,
		modelTier: event.modelTier ?? prev?.modelTier ?? NODE_DEFAULTS.modelTier,
		briefPointer: event.briefPointer ?? prev?.briefPointer ?? NODE_DEFAULTS.briefPointer,
		origin: event.origin ? [...event.origin] : prev?.origin ?? [],
		capstone: event.capstone ?? prev?.capstone,
		project: event.project ?? prev?.project ?? NODE_DEFAULTS.project,
		barrier: event.barrier ?? prev?.barrier ?? NODE_DEFAULTS.barrier,
		schemaVersion: typeof event.v === "number" ? event.v : prev?.schemaVersion ?? 1
	};
	const nodes = new Map(graph.nodes);
	nodes.set(event.id, merged);
	return {
		nodes,
		edges: graph.edges
	};
}
/**
* proposeNode — the write-time guard for a node event: simulates the merge onto the already-
* folded graph, then rejects (INV-1/INV-2/INV-3) if the resulting state is invalid. Fold-then-
* check, exactly like `proposeEdge` — so marking a node a barrier AFTER an Operation RAW edge
* already exists is caught exactly like the reverse order.
*/
function proposeNode(graph, event) {
	const violation = checkBarrierInvariants(applyNodeEventSimulated(graph, event));
	if (violation) return {
		accepted: false,
		reason: violation
	};
	return { accepted: true };
}
function declaredMembers(graph, operationId) {
	return graph.edges.filter((e) => e.kind === "parent-child" && e.from === operationId).map((e) => e.to);
}
/** The Operation a Mission is declared under (via a parent-child edge), or null when it is its
*  own Mission with no group. */
function operationOf(graph, missionId) {
	const edge = graph.edges.find((e) => e.kind === "parent-child" && e.to === missionId);
	return edge ? edge.from : null;
}
/** Every Operation node and its declared Mission members, sorted for stable reading. */
function listOperations(graph) {
	const ops = [];
	for (const n of graph.nodes.values()) {
		if (n.kind !== "operation") continue;
		ops.push({
			id: n.id,
			capstone: n.capstone,
			members: declaredMembers(graph, n.id).sort(compareIds)
		});
	}
	return ops.sort((a, b) => compareIds(a.id, b.id));
}
function rawClosure(graph, start) {
	const seen = /* @__PURE__ */ new Set();
	const stack = [start];
	while (stack.length > 0) {
		const cur = stack.pop();
		if (cur === void 0 || seen.has(cur)) continue;
		seen.add(cur);
		for (const e of graph.edges) if (e.kind === "RAW" && e.to === cur) stack.push(e.from);
	}
	return seen;
}
/**
* checkOperation — the shippable-group view for one Operation: dependency-closed iff the
* capstone's RAW closure is a subset of the declared set (a missing prerequisite is flagged; a
* declared support member outside the closure is legal and never flagged); the release floor is
* the capstone's closure alone (support members never gate release); progress is completed/total
* over the declared Missions only.
*/
function checkOperation(graph, operationId) {
	const declared = declaredMembers(graph, operationId);
	const declaredSet = new Set(declared);
	const capstone = graph.nodes.get(operationId)?.capstone;
	const closure = capstone !== void 0 ? rawClosure(graph, capstone) : /* @__PURE__ */ new Set();
	const missingPrereqs = [...closure].filter((id) => !declaredSet.has(id)).sort(compareIds);
	const completed = declared.filter((id) => graph.nodes.get(id)?.status === "retired").length;
	return {
		dependencyClosed: missingPrereqs.length === 0,
		missingPrereqs,
		releaseFloor: [...closure].sort(compareIds),
		progress: {
			completed,
			total: declared.length
		}
	};
}
function isRawSatisfied(graph, quarantined, id) {
	return rawPredecessors(graph, id).every((p) => {
		if (quarantined.has(p)) return false;
		return graph.nodes.get(p)?.status === "retired";
	});
}
function whyReady(graph, id) {
	const preds = rawPredecessors(graph, id);
	if (preds.length === 0) return "no RAW predecessors";
	return `RAW-satisfied: ${[...preds].sort(compareIds).join(", ")} retired`;
}
/** An un-retired barrier — open or claimed — is "live": it grants exemption (clause 1), fences its
*  project (clause 3), and occupies its project's at-most-one slot (clause 2). */
function isLiveBarrier(n) {
	return n.barrier && n.status !== "retired";
}
/**
* fenceExempt — clause 1's exempt set: every NON-barrier mission in the STRICT RAW-predecessor
* closure of any live (un-retired) barrier, graph-global (not scoped to the barrier's own
* project — an acyclic two-project deadlock needs the exemption to cross project lines). Barriers
* are NEVER exempt, so a barrier that is itself a RAW predecessor of another project's barrier
* cannot use exemption to dodge its own project's at-most-one cap (clause 2).
*/
function fenceExempt(graph) {
	const exempt = /* @__PURE__ */ new Set();
	for (const b of graph.nodes.values()) {
		if (!isLiveBarrier(b)) continue;
		for (const id of rawClosure(graph, b.id)) {
			if (id === b.id) continue;
			const m = graph.nodes.get(id);
			if (m && !m.barrier) exempt.add(id);
		}
	}
	return exempt;
}
/**
* barrierHeldByCap — clause 2, the at-most-one-barrier-per-project offer cap, evaluated over
* UN-RETIRED barriers of `candidate`'s project (open ∪ claimed, never just the open `candidates`
* set — a claimed barrier still fills the slot even though it's no longer itself a candidate).
* Holds `candidate` when either another un-retired barrier of the project is already claimed, or a
* lower-id OPEN RAW-satisfied barrier of the project exists (a quarantined or RAW-blocked one never
* fills the slot).
*/
function barrierHeldByCap(graph, quarantined, liveBarriersOfProject, candidate) {
	if (liveBarriersOfProject.some((b) => b.id !== candidate.id && b.status === "claimed")) return true;
	return liveBarriersOfProject.some((b) => b.id !== candidate.id && b.status === "open" && !quarantined.has(b.id) && isRawSatisfied(graph, quarantined, b.id) && compareIds(b.id, candidate.id) < 0);
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
function ready(graph) {
	const quarantined = quarantinedIds(graph);
	const missions = [...graph.nodes.values()].filter((n) => n.kind === "mission");
	const inFlightTouchSets = missions.filter((n) => n.status === "claimed").map((n) => n.touchSet);
	const rawSatisfiedOpen = missions.filter((n) => n.status === "open" && !quarantined.has(n.id) && isRawSatisfied(graph, quarantined, n.id));
	const liveBarriers = missions.filter(isLiveBarrier);
	const exempt = fenceExempt(graph);
	const fencedProjects = new Set(liveBarriers.map((b) => b.project));
	const sorted = [...rawSatisfiedOpen.filter((c) => {
		if (c.barrier) {
			const ofProject = liveBarriers.filter((b) => b.project === c.project);
			return !barrierHeldByCap(graph, quarantined, ofProject, c);
		}
		if (exempt.has(c.id)) return true;
		if (fencedProjects.has(c.project)) return false;
		return true;
	}).filter((n) => !inFlightTouchSets.some((t) => intersects(t, n.touchSet)))].sort((a, b) => compareIds(a.id, b.id));
	const admitted = [];
	const claimedTouch = [];
	for (const n of sorted) {
		if (intersects(n.touchSet, claimedTouch)) continue;
		admitted.push(n);
		claimedTouch.push(...n.touchSet);
	}
	return admitted.sort((a, b) => compareIds(a.id, b.id)).map((n) => ({
		id: n.id,
		node: n.kind,
		operation: operationOf(graph, n.id),
		blast: n.blast,
		hitlOrAfk: n.hitlOrAfk,
		modelTier: n.modelTier,
		briefPointer: n.briefPointer,
		whyReady: whyReady(graph, n.id)
	}));
}
const STORE_RELATIVE_PATH = [
	".agents",
	"mission-graph",
	"events.jsonl"
];
function storePath(root) {
	return join(root, ...STORE_RELATIVE_PATH);
}
/** Read the in-tree JSONL store's raw (trimmed, non-empty) lines — used by both the in-tree
*  backend and `migrate` (which copies these verbatim, never re-serialized). */
function readInTreeLines(root) {
	const path = storePath(root);
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8").split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}
function readInTreeEvents(root) {
	return readInTreeLines(root).map((line) => JSON.parse(line));
}
function appendInTreeEvent(root, event) {
	const path = storePath(root);
	mkdirSync(dirname(path), { recursive: true });
	appendFileSync(path, `${JSON.stringify(event)}\n`);
}
const ORPHAN_REF = "refs/sdd/mission-graph";
const ORPHAN_STORE_FILE = "events.jsonl";
function git(root, args, input) {
	return execFileSync("git", args, {
		cwd: root,
		input,
		encoding: "utf8"
	}).trim();
}
function isGitWorkTree(root) {
	try {
		return git(root, ["rev-parse", "--is-inside-work-tree"]) === "true";
	} catch {
		return false;
	}
}
function orphanRefExists(root) {
	try {
		git(root, [
			"rev-parse",
			"--verify",
			"--quiet",
			ORPHAN_REF
		]);
		return true;
	} catch {
		return false;
	}
}
function orphanHead(root) {
	if (!orphanRefExists(root)) return null;
	return git(root, ["rev-parse", ORPHAN_REF]);
}
function readOrphanLines(root) {
	if (!orphanRefExists(root)) return [];
	return git(root, [
		"cat-file",
		"-p",
		`${ORPHAN_REF}:${ORPHAN_STORE_FILE}`
	]).split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}
function readOrphanEvents(root) {
	return readOrphanLines(root).map((line) => JSON.parse(line));
}
/** blob -> tree -> commit -> update-ref, compare-and-swap on `expectedOld` (the ref value the
*  caller last observed). `null` means "the ref must not yet exist"; a stale/mismatched old value
*  makes `update-ref` throw — that throw IS the CAS rejection, and the ref is left unchanged. */
function commitOrphan(root, lines, expectedOld) {
	const commitArgs = ["commit-tree", git(root, ["mktree"], `100644 blob ${git(root, [
		"hash-object",
		"-w",
		"--stdin"
	], lines.length ? `${lines.join("\n")}\n` : "")}\t${ORPHAN_STORE_FILE}\n`)];
	if (expectedOld !== null) commitArgs.push("-p", expectedOld);
	const commit = git(root, commitArgs, "mission-graph: append");
	git(root, [
		"update-ref",
		ORPHAN_REF,
		commit,
		expectedOld ?? ""
	]);
	return commit;
}
function appendOrphanEvent(root, event) {
	const old = orphanHead(root);
	const lines = readOrphanLines(root);
	lines.push(JSON.stringify(event));
	commitOrphan(root, lines, old);
}
/**
* resolveBackend — an explicit `MISSION_GRAPH_STORE` override wins outright; otherwise a
* non-git-work-tree always stays in-tree (the orphan-ref backend needs git plumbing); inside a
* work-tree, an existing orphan ref wins (already migrated); otherwise an existing in-tree store
* keeps the in-tree backend so a pre-migrate v1 adopter is never silently orphaned; only a fresh
* work-tree with neither picks the orphan-ref backend outright.
*/
function resolveBackend(root, env = process.env) {
	const override = env.MISSION_GRAPH_STORE;
	if (override === "in-tree" || override === "orphan-ref") return override;
	if (!isGitWorkTree(root)) return "in-tree";
	if (orphanRefExists(root)) return "orphan-ref";
	if (existsSync(storePath(root))) return "in-tree";
	return "orphan-ref";
}
/** Read the append-only event log back. An absent store reads as the empty log (a fresh project). */
function readEvents(root) {
	if (resolveBackend(root) === "orphan-ref") return readOrphanEvents(root);
	return readInTreeEvents(root);
}
/** Append one event line. The one writer for now is a person at the CLI; later, one automated
*  coordinator — never split across writers, so there is nothing to reconcile. */
function appendEvent(root, event) {
	if (resolveBackend(root) === "orphan-ref") {
		appendOrphanEvent(root, event);
		return;
	}
	appendInTreeEvent(root, event);
}
function relativeStorePath() {
	return STORE_RELATIVE_PATH.join("/");
}
/** Every raw seed line must already be present among the orphan ref's lines — the guard that
*  keeps retirement from ever being the data loss the migration exists to prevent. An empty seed
*  vacuously counts as fully carried (nothing to lose). */
function seedFullyCarried(root) {
	const seedLines = readInTreeLines(root);
	if (seedLines.length === 0) return true;
	const orphanLines = new Set(readOrphanLines(root));
	return seedLines.every((line) => orphanLines.has(line));
}
/**
* retireSeed — migrate's final, guarded act: once (and only once) the orphan ref already carries
* every line of the in-tree seed, deletes the seed file and stages the deletion (never commits
* it — landing that commit is the caller's next step, and is what actually makes the retirement
* reach other clones). Refuses when the ref does not yet carry every seed line. Idempotent and
* safe to re-run: a pre-fix project whose seed was left behind by an earlier migrate is repaired
* simply by calling migrate again.
*/
function retireSeed(root) {
	const path = storePath(root);
	if (!existsSync(path)) return {
		retired: false,
		retiredReason: "no in-tree seed remains to retire"
	};
	if (!seedFullyCarried(root)) return {
		retired: false,
		retiredReason: "will not retire a seed the orphan ref does not carry"
	};
	rmSync(path);
	try {
		git(root, [
			"add",
			"--",
			relativeStorePath()
		]);
	} catch {}
	return {
		retired: true,
		retiredReason: "seed deleted; the staged deletion must be committed to reach other clones"
	};
}
/**
* migrate — one-time, idempotent: seeds the orphan ref from the existing in-tree store, copying
* its raw lines verbatim (never parsed and re-serialized, so exact bytes/order are preserved),
* then retires the seed (see `retireSeed`) as its final, guarded act — a seed left tracked would
* travel to every clone and shadow the (never-fetched) ref there. A no-op on the seeding half
* (never throws) when there is nothing to seed from, or the ref is already seeded; the retirement
* half still runs either way, so a pre-fix project (ref seeded, seed left behind) is repaired by
* simply re-running migrate.
*/
function migrate(root) {
	if (!isGitWorkTree(root)) return {
		migrated: false,
		reason: "not a git work-tree",
		count: 0,
		retired: false,
		retiredReason: "not a git work-tree"
	};
	let migrated = false;
	let reason;
	let count;
	if (orphanRefExists(root)) {
		reason = "orphan ref already seeded";
		count = readOrphanLines(root).length;
	} else {
		const rawLines = readInTreeLines(root);
		if (rawLines.length === 0) return {
			migrated: false,
			reason: "no in-tree store to seed from",
			count: 0,
			retired: false,
			retiredReason: "no in-tree seed remains to retire"
		};
		commitOrphan(root, rawLines, null);
		migrated = true;
		reason = "seeded orphan ref from in-tree store";
		count = rawLines.length;
	}
	const { retired, retiredReason } = retireSeed(root);
	return {
		migrated,
		reason,
		count,
		retired,
		retiredReason
	};
}
function refTransferSpec(refName) {
	return `${refName}:${refName}`;
}
/** A remote NAME is configured at all (distinct from being reachable — see `remoteReachable`). */
function remoteConfigured(root, remote) {
	try {
		git(root, [
			"remote",
			"get-url",
			remote
		]);
		return true;
	} catch {
		return false;
	}
}
/** Whether the remote can actually be talked to right now. Deliberately checked SEPARATELY from
*  "does it have the ref" — `git ls-remote` reports an unreachable remote and an empty one the
*  same way, so establishing reachability first (and failing loudly when it cannot be) is the
*  only way to avoid conflating the two. */
function remoteReachable(root, remote) {
	try {
		git(root, ["ls-remote", remote]);
		return true;
	} catch {
		return false;
	}
}
/** The remote's current orphan-ref tip, or null when the remote has no such ref (but IS
*  reachable — reachability is checked by the caller before this is ever consulted). */
function remoteOrphanHead(root, remote) {
	const out = git(root, [
		"ls-remote",
		remote,
		ORPHAN_REF
	]);
	if (out === "") return null;
	const [hash] = out.split("\n")[0].split("	");
	return hash ?? null;
}
function gitFetchOrphanRef(root, remote) {
	git(root, [
		"fetch",
		remote,
		refTransferSpec(ORPHAN_REF)
	]);
}
function gitPushOrphanRef(root, remote) {
	git(root, [
		"push",
		remote,
		refTransferSpec(ORPHAN_REF)
	]);
}
function isAncestor(root, ancestor, descendant) {
	try {
		execFileSync("git", [
			"merge-base",
			"--is-ancestor",
			ancestor,
			descendant
		], { cwd: root });
		return true;
	} catch {
		return false;
	}
}
/**
* syncStore — carries the orphan ref between this clone and `remote`, fast-forward only. Two
* prechecks run first, in this exact order: (1) backend — under the in-tree backend, sync is a
* no-op that reports the active backend, even when the remote is unreachable (an in-tree project
* must not fail merely for being offline); (2) reachability — an unreachable remote, or no remote
* configured at all, is a loud non-zero failure, never reported as "no list there". Only once both
* are settled does the 7-case partition of (local ref, remote ref) apply — see the README's sync
* table. Writes no git configuration, ever; never uses the forced (`+`-prefixed) refspec form.
*/
function syncStore(root, remote = "origin") {
	const backend = resolveBackend(root);
	if (backend !== "orphan-ref") return {
		backend,
		ok: true,
		action: "no-op",
		message: `the ${backend} backend is in use; sync only carries the shared orphan ref, so this is a no-op`,
		localHead: null,
		remoteHead: null
	};
	if (!remoteConfigured(root, remote)) return {
		backend,
		ok: false,
		action: "no-remote",
		message: `no remote '${remote}' is configured to reach`,
		localHead: orphanHead(root),
		remoteHead: null
	};
	if (!remoteReachable(root, remote)) return {
		backend,
		ok: false,
		action: "unreachable",
		message: `could not reach remote '${remote}'`,
		localHead: orphanHead(root),
		remoteHead: null
	};
	const localHead = orphanHead(root);
	const remoteHead = remoteOrphanHead(root, remote);
	if (localHead === null && remoteHead === null) return {
		backend,
		ok: true,
		action: "both-empty",
		message: "neither side holds a store ref",
		localHead: null,
		remoteHead: null
	};
	if (localHead !== null && remoteHead === null) {
		gitPushOrphanRef(root, remote);
		return {
			backend,
			ok: true,
			action: "push",
			message: "published the local-only store ref to the remote",
			localHead,
			remoteHead: localHead
		};
	}
	if (localHead === null && remoteHead !== null) {
		gitFetchOrphanRef(root, remote);
		return {
			backend,
			ok: true,
			action: "collect",
			message: "collected the remote store ref",
			localHead: remoteHead,
			remoteHead
		};
	}
	if (localHead === remoteHead) return {
		backend,
		ok: true,
		action: "agree",
		message: "the store refs already agree",
		localHead,
		remoteHead
	};
	git(root, [
		"fetch",
		remote,
		ORPHAN_REF
	]);
	if (isAncestor(root, localHead, remoteHead)) {
		gitFetchOrphanRef(root, remote);
		return {
			backend,
			ok: true,
			action: "collect",
			message: "fast-forwarded the local store ref to the remote",
			localHead: remoteHead,
			remoteHead
		};
	}
	if (isAncestor(root, remoteHead, localHead)) {
		gitPushOrphanRef(root, remote);
		return {
			backend,
			ok: true,
			action: "push",
			message: "published the ahead store ref to the remote",
			localHead,
			remoteHead: localHead
		};
	}
	return {
		backend,
		ok: false,
		action: "refuse",
		message: `refused: the store refs have diverged (local ${localHead}, remote ${remoteHead}) — see the node README's "Getting out of a refusal"`,
		localHead,
		remoteHead
	};
}
/** Append a proposed RAW/parent-child/discovered-from edge through the write-time cycle guard;
*  only appends when the guard accepts (or the caller overrides it). */
function appendEdgeChecked(root, proposed, override = false) {
	const decision = proposeEdge(fold(readEvents(root)), proposed, override);
	if (decision.accepted) appendEvent(root, {
		v: 1,
		type: "edge",
		...proposed
	});
	return decision;
}
/** Append a node event through the write-time barrier guards (INV-1/INV-2/INV-3); only appends
*  when the guard accepts. */
function appendNodeChecked(root, event) {
	const decision = proposeNode(fold(readEvents(root)), event);
	if (decision.accepted) appendEvent(root, event);
	return decision;
}
function toonQuote(v) {
	if (v === "" || /[",;]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
function renderFrontierToon(entries) {
	return [`ready[${entries.length}]{id,node,operation,blast,hitlOrAfk,modelTier,briefPointer,whyReady}:`, ...entries.map((e) => [
		e.id,
		e.node,
		e.operation ?? "",
		e.blast,
		e.hitlOrAfk,
		e.modelTier,
		e.briefPointer,
		e.whyReady
	].map((v) => toonQuote(v)).join(",")).map((r) => `  ${r}`)].join("\n");
}
function renderCyclesToon(items) {
	return [`cycles[${items.length}]{scc,members}:`, ...items.map((item, i) => `  scc-${i + 1},"${item.members.join(";")}"`)].join("\n");
}
function renderSyncToon(result) {
	return [
		`backend: ${result.backend}`,
		`action: ${result.action}`,
		`ok: ${result.ok}`,
		`message: ${result.message}`,
		`localHead: ${result.localHead ?? ""}`,
		`remoteHead: ${result.remoteHead ?? ""}`
	].join("\n");
}
function renderOperationToon(id, check) {
	return [
		`operation: ${id}`,
		`dependencyClosed: ${check.dependencyClosed}`,
		`missingPrereqs: ${check.missingPrereqs.join(";")}`,
		`releaseFloor: ${check.releaseFloor.join(";")}`,
		`progress: ${check.progress.completed}/${check.progress.total}`
	].join("\n");
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function hasFlag(argv, name) {
	return argv.includes(name);
}
function splitCsv(v) {
	if (v === void 0 || v === "") return [];
	return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function isEdgeKind(v) {
	return v === "RAW" || v === "parent-child" || v === "discovered-from";
}
function runAppendNode(rest, root) {
	const id = flag(rest, "--id");
	if (id === void 0) {
		process.stderr.write("mission-graph append node: --id is required\n");
		return 1;
	}
	const event = {
		v: 1,
		type: "node",
		id
	};
	const nodeKind = flag(rest, "--kind");
	if (nodeKind === "mission" || nodeKind === "operation") event.kind = nodeKind;
	const status = flag(rest, "--status");
	if (status === "open" || status === "claimed" || status === "retired") event.status = status;
	const touchSet = flag(rest, "--touch-set");
	if (touchSet !== void 0) event.touchSet = splitCsv(touchSet);
	const blast = flag(rest, "--blast");
	if (blast !== void 0) event.blast = blast;
	if (hasFlag(rest, "--hitl")) event.hitlOrAfk = "hitl";
	if (hasFlag(rest, "--afk")) event.hitlOrAfk = "afk";
	const modelTier = flag(rest, "--model-tier");
	if (modelTier !== void 0) event.modelTier = modelTier;
	const briefPointer = flag(rest, "--brief-pointer");
	if (briefPointer !== void 0) event.briefPointer = briefPointer;
	const capstone = flag(rest, "--capstone");
	if (capstone !== void 0) event.capstone = capstone;
	const project = flag(rest, "--project");
	if (project !== void 0) event.project = project;
	if (hasFlag(rest, "--barrier")) event.barrier = true;
	const decision = appendNodeChecked(root, event);
	if (!decision.accepted) {
		process.stderr.write(`mission-graph append node: rejected — ${decision.reason}\n`);
		return 1;
	}
	process.stdout.write(`mission-graph: appended node ${id}\n`);
	return 0;
}
function runAppendEdge(rest, root) {
	const edgeKind = flag(rest, "--kind");
	const from = flag(rest, "--from");
	const to = flag(rest, "--to");
	if (!isEdgeKind(edgeKind) || from === void 0 || to === void 0) {
		process.stderr.write("mission-graph append edge: --kind <RAW|parent-child|discovered-from> --from <id> --to <id> are required\n");
		return 1;
	}
	const decision = appendEdgeChecked(root, {
		kind: edgeKind,
		from,
		to
	}, hasFlag(rest, "--override"));
	if (!decision.accepted) {
		process.stderr.write(`mission-graph append edge: rejected — ${decision.reason}\n`);
		return 1;
	}
	process.stdout.write(`mission-graph: appended edge ${edgeKind} ${from} -> ${to}\n`);
	return 0;
}
function runAppendTombstone(rest, root) {
	const target = flag(rest, "--target");
	if (target === "node") {
		const id = flag(rest, "--id");
		if (id === void 0) {
			process.stderr.write("mission-graph append tombstone: --id is required for a node tombstone\n");
			return 1;
		}
		appendEvent(root, {
			v: 1,
			type: "tombstone",
			target: "node",
			id
		});
		process.stdout.write(`mission-graph: tombstoned node ${id}\n`);
		return 0;
	}
	if (target === "edge") {
		const edgeKind = flag(rest, "--kind");
		const from = flag(rest, "--from");
		const to = flag(rest, "--to");
		if (!isEdgeKind(edgeKind) || from === void 0 || to === void 0) {
			process.stderr.write("mission-graph append tombstone: --kind --from --to are required for an edge tombstone\n");
			return 1;
		}
		appendEvent(root, {
			v: 1,
			type: "tombstone",
			target: "edge",
			kind: edgeKind,
			from,
			to
		});
		process.stdout.write(`mission-graph: tombstoned edge ${edgeKind} ${from} -> ${to}\n`);
		return 0;
	}
	process.stderr.write("mission-graph append tombstone: --target <node|edge> is required\n");
	return 1;
}
function runAppend(argv, root) {
	const [kind, ...rest] = argv;
	if (kind === "node") return runAppendNode(rest, root);
	if (kind === "edge") return runAppendEdge(rest, root);
	if (kind === "tombstone") return runAppendTombstone(rest, root);
	process.stderr.write("mission-graph append: usage: append <node|edge|tombstone> ...\n");
	return 1;
}
function main(argv) {
	const [cmd, ...rest] = argv;
	const root = flag(rest, "--root") ?? ".";
	const format = flag(rest, "--format") === "json" ? "json" : "toon";
	if (cmd === "ready") {
		const entries = ready(fold(readEvents(root)));
		process.stdout.write(`${format === "json" ? JSON.stringify(entries, null, 2) : renderFrontierToon(entries)}\n`);
		return 0;
	}
	if (cmd === "cycles") {
		const items = cycles(fold(readEvents(root)));
		process.stdout.write(`${format === "json" ? JSON.stringify(items, null, 2) : renderCyclesToon(items)}\n`);
		return 0;
	}
	if (cmd === "operation") {
		const id = flag(rest, "--id");
		if (id === void 0) {
			process.stderr.write("mission-graph operation: --id <operation-id> is required\n");
			return 1;
		}
		const check = checkOperation(fold(readEvents(root)), id);
		process.stdout.write(`${format === "json" ? JSON.stringify(check, null, 2) : renderOperationToon(id, check)}\n`);
		return 0;
	}
	if (cmd === "append") return runAppend(rest, root);
	if (cmd === "migrate") {
		const result = migrate(root);
		process.stdout.write(`${format === "json" ? JSON.stringify(result, null, 2) : `migrated: ${result.migrated}\nreason: ${result.reason}\ncount: ${result.count}\nretired: ${result.retired}\nretiredReason: ${result.retiredReason}`}\n`);
		return result.reason === "not a git work-tree" ? 1 : 0;
	}
	if (cmd === "sync") {
		const result = syncStore(root, flag(rest, "--remote") ?? "origin");
		process.stdout.write(`${format === "json" ? JSON.stringify(result, null, 2) : renderSyncToon(result)}\n`);
		return result.ok ? 0 : 1;
	}
	process.stderr.write("mission-graph: usage: ready | cycles | operation --id <id> | append <node|edge|tombstone> ... | migrate | sync [--remote <name>]\n");
	return 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { DEFAULT_PROJECT, ORPHAN_REF, appendEdgeChecked, appendEvent, appendNodeChecked, appendOrphanEvent, checkOperation, commitOrphan, compareIds, computeSCCs, cycles, fold, listOperations, main, migrate, operationOf, orphanHead, proposeEdge, proposeNode, quarantinedIds, rawPredecessors, readEvents, readOrphanLines, ready, renderCyclesToon, renderFrontierToon, renderOperationToon, renderSyncToon, resolveBackend, syncStore, wouldCloseCycle };
