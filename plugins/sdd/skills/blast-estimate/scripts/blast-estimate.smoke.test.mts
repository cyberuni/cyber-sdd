// blast-estimate — LIVE-CORPUS smoke check.
//
// WHY THIS FILE EXISTS (read before weakening anything in it):
//
// `blast-estimate.feature` is @frozen and its preamble mandates that every scenario run over a
// CONSTRUCTED corpus — "never the project's live store or live corpus". That is the right call for a
// behavior contract: it keeps the suite deterministic and reorganization-proof. But it also means
// the frozen suite is STRUCTURALLY BLIND to the only question that decides whether this node is
// worth anything: does it measure real reach on a real tree?
//
// Three separate defects reached an impl gate green on every one of the frozen scenarios, each invisible to the
// constructed corpora by construction:
//   1. work-area recovery invented a path-shape rule; on the real repo it produced 25 garbage atoms
//      and could not find `sdd/mission-graph` at all (fixtures collapse a node's two roots into one);
//   2. repo-relative paths were computed by string-slicing `root.length`, which corrupts every path
//      under a RELATIVE root (fixtures all pass an absolute tmpdir root; the CLI defaults to `.`);
//   3. the reference matcher only recognized a BARE `project/capability` id — the one form real prose
//      never uses for a real reference — scoring 56 of 62 `sdd` areas at fan-in 0, while the fixtures
//      write `refs: sdd/a2` and sail through.
//
// Every one of those is a live-tree property. So this file is deliberately NOT bound to any frozen
// scenario and must never claim to be — it is a smoke check that the engine's three inputs are
// operative against THIS repo. It asserts PROPERTIES, never magic numbers, so a corpus
// reorganization does not break it; each assertion below is chosen to have FAILED LOUDLY before the
// fix above that it guards, and to pass after.
//
// If an assertion here starts failing, the honest first question is "did the engine regress?", not
// "can I relax the threshold?".

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discoverLayouts } from '../../touch-set-correction/scripts/touch-set-correction.mts'
import { computeFanInMap, discoverWorkAreas, estimateBlast } from './blast-estimate.mts'

const REPO_ROOT = new URL('../../../../../', import.meta.url).pathname.replace(/\/$/, '')

/** A node that is structurally central to this repo: the SDD spec gate, which the lifecycle,
 *  conductor, and judges all lean on. Named explicitly rather than derived, because deriving "the
 *  most central node" from the tool under test would be circular. */
const HUB = 'sdd/spec-gate'

/** This node — excluded from the referencer set below. blast-estimate's own source and docs name
 *  other areas' ids (in comments, in this very file), so leaving it in lets the tool's own text
 *  inflate the fan-in it reports. Measured live: with the matcher reverted to bare-ids-only, the ONLY
 *  area "referencing" `sdd/spec-gate` was `sdd/blast-estimate` itself — a self-reference that made a
 *  fully-inoperative centrality measure still look non-zero. Excluding self keeps the reading honest
 *  and keeps these assertions sharp enough to fire on a regression. */
const SELF = 'sdd/blast-estimate'

/** Live fan-in over the sdd project, measured EXCLUDING this node's own files (see SELF). */
function liveFanIn(): { fan: Map<string, number>; sddIds: string[] } {
	const layouts = discoverLayouts(REPO_ROOT, REPO_ROOT)
	const byNode = discoverWorkAreas(layouts, REPO_ROOT)
	const sansSelf = new Map([...byNode].filter(([id]) => id !== SELF))
	const sddIds = [...sansSelf.keys()].filter((id) => id.startsWith('sdd/'))
	return { fan: computeFanInMap(sansSelf, REPO_ROOT, layouts, sddIds), sddIds }
}

function median(values: number[]): number {
	const s = [...values].sort((a, b) => a - b)
	const mid = Math.floor(s.length / 2)
	return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

test('live corpus: the repo resolves into work areas at all', () => {
	const layouts = discoverLayouts(REPO_ROOT, REPO_ROOT)
	assert.ok(layouts.length > 0, 'discover-specs must declare at least one project layout')
	const byNode = discoverWorkAreas(layouts, REPO_ROOT)
	const sddIds = [...byNode.keys()].filter((id) => id.startsWith('sdd/'))
	// Guards defect 1: the path-shape walk could not find sdd/* from the repo root at all.
	assert.ok(sddIds.length > 10, `expected the sdd project to resolve into many work areas, got ${sddIds.length}`)
	assert.ok(byNode.has(HUB), `${HUB} must resolve as a work area — if it was renamed, re-anchor this smoke check`)
})

test('live corpus: a known-central node has real, non-zero fan-in', () => {
	const { fan } = liveFanIn()
	const hubFanIn = fan.get(HUB) ?? 0
	// Guards defect 3: with the bare-id-only matcher this was exactly 0 (excluding self-reference),
	// despite a dozen files referencing the node — the ★ centrality dimension was inoperative on the
	// real tree while all 21 frozen scenarios stayed green.
	assert.ok(hubFanIn > 0, `${HUB} is referenced across this repo; fan-in must be > 0, got ${hubFanIn}`)
})

test('live corpus: a known-central node outranks the middle of the corpus', () => {
	const { fan, sddIds } = liveFanIn()
	const hubFanIn = fan.get(HUB) ?? 0
	const med = median(sddIds.map((id) => fan.get(id) ?? 0))
	// A property, not a number: a genuine hub sits above the median area. Before the matcher fix the
	// median was 0 and the hub was 0, so `0 > 0` failed. This survives reorganization — it only asks
	// that the distribution still discriminate a hub from a typical area.
	assert.ok(hubFanIn > med, `${HUB} (fan-in ${hubFanIn}) must outrank the median sdd area (${med})`)
})

test('live corpus: centrality discriminates — most areas are not stuck at zero', () => {
	const { fan, sddIds } = liveFanIn()
	const nonZero = sddIds.filter((id) => (fan.get(id) ?? 0) > 0).length
	const ratio = nonZero / sddIds.length
	// Guards defect 3 at the distribution level: the bare-id matcher left 56/62 (90%) at zero, i.e.
	// ~10% non-zero. A measure that says "nothing depends on anything" is not measuring dependency.
	// The 50% floor sits far from both the broken value (~10%) and the current one (~87%), so it is a
	// real regression tripwire rather than a restatement of today's number.
	assert.ok(ratio > 0.5, `expected most sdd areas to have measurable fan-in, got ${nonZero}/${sddIds.length}`)
})

test('live corpus: an end-to-end estimate on a real touch-set names real reasons', () => {
	const layouts = discoverLayouts(REPO_ROOT, REPO_ROOT)
	const r = estimateBlast([HUB], layouts, { root: REPO_ROOT, declared: 'high' })
	// Guards defect 2 (relative/absolute root handling) and defect 1 end-to-end: the area resolves,
	// nothing is left unresolved, and the reasons carry a real measurement rather than a zero.
	assert.deepEqual(r.resolved, [HUB])
	assert.deepEqual(r.unresolved, [])
	assert.equal(r.error, undefined)
	assert.ok((r.reasons?.maxFanIn ?? 0) > 0, 'a real central node must carry a real fan-in in its reasons')
	assert.ok(r.computed === 'low' || r.computed === 'medium' || r.computed === 'high')
})

test('live corpus: the estimate is deterministic across two live runs', () => {
	const layouts = discoverLayouts(REPO_ROOT, REPO_ROOT)
	const a = estimateBlast([HUB], layouts, { root: REPO_ROOT })
	const b = estimateBlast([HUB], layouts, { root: REPO_ROOT })
	assert.deepEqual(a, b)
})
