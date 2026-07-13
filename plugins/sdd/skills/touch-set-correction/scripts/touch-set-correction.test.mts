// touch-set-correction — one test per scenario in the frozen
// .agents/specs/sdd/touch-set-correction/touch-set-correction.feature (21 scenarios). Each test
// title is prefixed `scenario:` followed by the VERBATIM frozen scenario name, so the mapping is
// grep-auditable against the .feature. Every fixture here is CONSTRUCTED (hand-built ChangedFile
// lists, ProjectLayouts, and declared sets) — never a live git diff or the live mission-graph
// store; only the pure functions (isFeature, fileToNode, reconcile, assembleCorrection, plus the
// render helper) are exercised.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	assembleCorrection,
	type ChangedFile,
	fileToNode,
	isFeature,
	type ProjectLayout,
	reconcile,
	renderCorrectionToon,
} from './touch-set-correction.mts'

// ── Fixture builders (constructed only — see file banner) ──

function changedFile(path: string, overrides: Partial<Omit<ChangedFile, 'path'>> = {}): ChangedFile {
	return { path, artifactType: 'unknown', changedScenarios: [], ...overrides }
}

const SDD_LAYOUT: ProjectLayout = { project: 'sdd', roots: ['.agents/specs/sdd', 'plugins/sdd/skills'] }

// ── Reconcile the declared prediction against the actual diff ──

test('scenario: a node touched in the diff but not declared is reported as missed', () => {
	const r = reconcile(['A'], ['A', 'B'])
	assert.deepEqual(r.missed, ['B'])
})

test('scenario: a node declared but not touched in the diff is reported as over-declared', () => {
	const r = reconcile(['A', 'B'], ['A'])
	assert.deepEqual(r.overDeclared, ['B'])
})

test('scenario: a node both declared and touched is reported as confirmed', () => {
	const r = reconcile(['A'], ['A'])
	assert.deepEqual(r.confirmed, ['A'])
})

test('scenario: an exact prediction reports no missed and no over-declared nodes', () => {
	const r = reconcile(['A', 'B'], ['A', 'B'])
	assert.deepEqual(r.missed, [])
	assert.deepEqual(r.overDeclared, [])
})

test('scenario: the corrected touch-set is the actual touched set, not the declared set', () => {
	const r = reconcile(['A', 'B'], ['A', 'C'])
	assert.deepEqual(r.corrected, ['A', 'C'])
})

test('scenario: the reconciliation is deterministic and stably ordered for a fixed input', () => {
	const declared = ['B', 'A']
	const actual = ['C', 'A']
	const first = reconcile(declared, actual)
	const second = reconcile(declared, actual)
	assert.deepEqual(first, second)
})

// ── Recover the touched work area from a changed file (capability-first) ──

test('scenario: a changed file under a capability folder maps to its project-and-capability node', () => {
	const node = fileToNode('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', [SDD_LAYOUT])
	assert.equal(node, 'sdd/mission-graph')
})

test('scenario: a spec file and an impl file in the same capability collapse to one node', () => {
	const specNode = fileToNode('.agents/specs/sdd/mission-graph/README.md', [SDD_LAYOUT])
	const implNode = fileToNode('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', [SDD_LAYOUT])
	assert.equal(specNode, 'sdd/mission-graph')
	assert.equal(implNode, 'sdd/mission-graph')
	assert.equal(specNode, implNode)
})

test('scenario: changed files in different capabilities yield distinct touched nodes', () => {
	const a = fileToNode('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', [SDD_LAYOUT])
	const b = fileToNode('plugins/sdd/skills/touch-set-correction/scripts/touch-set-correction.mts', [SDD_LAYOUT])
	assert.equal(a, 'sdd/mission-graph')
	assert.equal(b, 'sdd/touch-set-correction')
	assert.notEqual(a, b)
})

test('scenario: a changed file outside any known project root is surfaced as unmapped', () => {
	const node = fileToNode('unrelated/dir/file.txt', [SDD_LAYOUT])
	assert.equal(node, null)
	const correction = assembleCorrection([], [changedFile('unrelated/dir/file.txt')], [SDD_LAYOUT])
	assert.deepEqual(correction.unmapped, ['unrelated/dir/file.txt'])
	assert.deepEqual(correction.corrected, [])
})

// ── artifact-type per touched file (the semantic-rung gate) ──

test('scenario: each changed file carries the artifact-type resolved for it', () => {
	const correction = assembleCorrection(
		[],
		[changedFile('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', { artifactType: 'sdd-engine' })],
		[SDD_LAYOUT],
	)
	assert.equal(correction.nodes[0].node, 'sdd/mission-graph')
	// The resolved artifact-type must ride through into the output — the file entry carries it
	// (node membership still derives from the path, never the type).
	assert.deepEqual(correction.nodes[0].files, [
		{ path: 'plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', artifactType: 'sdd-engine' },
	])
	assert.equal(correction.unmapped.length, 0)
})

test('scenario: a changed file whose artifact-type does not resolve still counts as a touched node', () => {
	const correction = assembleCorrection(
		[],
		[changedFile('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', { artifactType: 'unknown' })],
		[SDD_LAYOUT],
	)
	// still a touched node …
	assert.deepEqual(correction.corrected, ['sdd/mission-graph'])
	// … and the file entry carries the unknown artifact-type
	const node = correction.nodes.find((n) => n.node === 'sdd/mission-graph')
	assert.ok(node)
	assert.deepEqual(node.files, [
		{ path: 'plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', artifactType: 'unknown' },
	])
})

test('scenario: the scenario rung is gated by the feature extension, not the resolved artifact-type', () => {
	const correction = assembleCorrection(
		[],
		[
			changedFile('plugins/sdd/skills/mission-graph/mission-graph.feature', {
				artifactType: 'unknown',
				changedScenarios: ['a scenario'],
			}),
			changedFile('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', {
				artifactType: 'sdd-engine',
				changedScenarios: ['should never surface — not a .feature'],
			}),
		],
		[SDD_LAYOUT],
	)
	const node = correction.nodes.find((n) => n.node === 'sdd/mission-graph')
	assert.ok(node)
	assert.deepEqual(node.changedScenarios, ['a scenario'])
})

// ── Finer detail: changed scenarios for a touched .feature (frozen or not) ──

test('scenario: a touched feature records the scenario names its diff changed', () => {
	const correction = assembleCorrection(
		[],
		[
			changedFile('plugins/sdd/skills/mission-graph/mission-graph.feature', {
				changedScenarios: ['added scenario', 'modified scenario'],
			}),
		],
		[SDD_LAYOUT],
	)
	assert.deepEqual(correction.nodes[0].changedScenarios, ['added scenario', 'modified scenario'])
})

test('scenario: an unfrozen touched feature records its changed scenarios the same as a frozen one', () => {
	// The pure function has no notion of freeze at all — feeding it an "unfrozen" .feature is
	// indistinguishable at this layer from a frozen one; both simply carry .feature extension.
	const correction = assembleCorrection(
		[],
		[changedFile('plugins/sdd/skills/draft-thing/draft-thing.feature', { changedScenarios: ['a new scenario'] })],
		[{ project: 'sdd', roots: ['plugins/sdd/skills'] }],
	)
	assert.deepEqual(correction.nodes[0].changedScenarios, ['a new scenario'])
})

test('scenario: a touched non-feature file records no scenario detail', () => {
	const correction = assembleCorrection(
		[],
		[changedFile('plugins/sdd/skills/mission-graph/README.md', { changedScenarios: ['should be dropped'] })],
		[SDD_LAYOUT],
	)
	assert.deepEqual(correction.nodes[0].changedScenarios, [])
})

test('scenario: the recorded scenario detail does not reclassify the node collision', () => {
	const correction = assembleCorrection(
		[],
		[changedFile('plugins/sdd/skills/mission-graph/mission-graph.feature', { changedScenarios: ['x'] })],
		[SDD_LAYOUT],
	)
	const node = correction.nodes[0]
	// NodeDetail's shape carries only node/files/changedScenarios — no collision verdict or tier.
	assert.deepEqual(Object.keys(node).sort(), ['changedScenarios', 'files', 'node'])
})

// ── The correction record — shape and read-only ──

test('scenario: the correction carries the corrected set, the three-way split, and per-node changed files', () => {
	const correction = assembleCorrection(
		['sdd/mission-graph'],
		[
			changedFile('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts'),
			changedFile('plugins/sdd/skills/touch-set-correction/scripts/touch-set-correction.mts'),
		],
		[SDD_LAYOUT],
	)
	assert.deepEqual(correction.corrected, ['sdd/mission-graph', 'sdd/touch-set-correction'])
	assert.deepEqual(correction.confirmed, ['sdd/mission-graph'])
	assert.deepEqual(correction.missed, ['sdd/touch-set-correction'])
	assert.deepEqual(correction.overDeclared, [])
	assert.equal(correction.nodes.length, 2)
	assert.deepEqual(correction.nodes.find((n) => n.node === 'sdd/mission-graph')?.files, [
		{ path: 'plugins/sdd/skills/mission-graph/scripts/mission-graph.mts', artifactType: 'unknown' },
	])
})

test('scenario: computing a correction does not write to the mission graph', () => {
	// assembleCorrection is pure — it takes and returns plain data with no fs/network access, so
	// there is trivially nothing it could write. Asserted here by construction: the return value is
	// plain data and the function signature carries no store handle.
	const before = { declared: ['A'], files: [changedFile('plugins/sdd/skills/a/x.mts')], projects: [SDD_LAYOUT] }
	const correction = assembleCorrection(before.declared, before.files, before.projects)
	assert.deepEqual(before.files, [changedFile('plugins/sdd/skills/a/x.mts')]) // inputs untouched
	assert.ok(correction) // returns data only, no side channel
})

test('scenario: the whole correction is deterministic and stably ordered for a fixed diff', () => {
	const declared = ['sdd/b', 'sdd/a']
	const files: ChangedFile[] = [
		changedFile('plugins/sdd/skills/b/x.mts'),
		changedFile('plugins/sdd/skills/a/y.feature', { changedScenarios: ['s1'] }),
		changedFile('outside/z.txt'),
	]
	const projects = [{ project: 'sdd', roots: ['plugins/sdd/skills'] }]
	const first = assembleCorrection(declared, files, projects)
	const second = assembleCorrection(declared, files, projects)
	assert.deepEqual(first, second)
})

test('scenario: the correction is emitted as TOON by default and as JSON on request', () => {
	const correction = assembleCorrection(
		['sdd/mission-graph'],
		[changedFile('plugins/sdd/skills/mission-graph/scripts/mission-graph.mts')],
		[SDD_LAYOUT],
	)
	const toon = renderCorrectionToon(correction)
	assert.match(toon, /^corrected\[1\]: sdd\/mission-graph/)
	assert.match(toon, /nodes\[1\]\{node,files,changedScenarios\}:/)

	const json = JSON.stringify(correction)
	const parsed = JSON.parse(json) as typeof correction
	assert.deepEqual(parsed, correction)
})

// ── Beyond-scenario: isFeature unit coverage (structural gate, not scenario-mapped on its own) ──

test('isFeature is true only for a .feature extension', () => {
	assert.equal(isFeature('a/b/x.feature'), true)
	assert.equal(isFeature('a/b/x.mts'), false)
	assert.equal(isFeature('a/b/x.feature.md'), false)
})

test('fileToNode matches the longest root prefix when roots nest', () => {
	// With a shallow and a deep root of the same project both matching, the DEEPER root wins so the
	// capability is read after `skills`, not after the plugin folder.
	const nested: ProjectLayout[] = [{ project: 'sdd', roots: ['plugins/sdd', 'plugins/sdd/skills'] }]
	assert.equal(fileToNode('plugins/sdd/skills/mission-graph/x.mts', nested), 'sdd/mission-graph')
	// order of roots must not change the answer
	const reversed: ProjectLayout[] = [{ project: 'sdd', roots: ['plugins/sdd/skills', 'plugins/sdd'] }]
	assert.equal(fileToNode('plugins/sdd/skills/mission-graph/x.mts', reversed), 'sdd/mission-graph')
})
