import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	checkGateFloor,
	checkNode,
	checkReferencedArtifacts,
	checkReferencedArtifactsInFiles,
	checkSpec,
	discoverNodeDirs,
	discoverSpecDirs,
	extractPathRefs,
	type LedgerGate,
	type NodeSpec,
	parseFilesArg,
	parseLedgerGates,
	parseNode,
	parseSpecState,
	readLedgerText,
	type SpecState,
} from './check-spec-state.mts'

function state(over: Partial<SpecState> = {}): SpecState {
	return {
		status: 'draft',
		projectPath: null,
		markerCount: 0,
		approval: null,
		...over,
	}
}

function node(over: Partial<NodeSpec> = {}): NodeSpec {
	return { type: null, hasSubject: false, hasUseCases: false, lifecycleFields: [], ...over }
}

// ── root lifecycle tuple ──

test('parseSpecState reads status, project-path, and marker count', () => {
	const s = parseSpecState(
		'---\nstatus: draft\nproject-path: plugins/sdd-new\n---\n\n<!-- open: a -->\n<!--   open: b -->\n',
	)
	assert.equal(s.status, 'draft')
	assert.equal(s.projectPath, 'plugins/sdd-new')
	assert.equal(s.markerCount, 2)
})

test('parseSpecState ignores marker syntax inside code spans and fences', () => {
	const text = [
		'---',
		'status: approved',
		'---',
		'',
		'an inline `<!-- open: x -->` marker',
		'',
		'```',
		'<!-- open: y -->',
		'```',
		'',
	].join('\n')
	assert.equal(parseSpecState(text).markerCount, 0)
})

test('parseSpecState reads a nested approval map with verdict and why', () => {
	const text = [
		'---',
		'status: approved',
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
	assert.equal(s.approval?.spec.by, 'unional')
	assert.equal(s.approval?.spec.hasWhy, false)
	assert.equal(s.approval?.impl.by, 'agent')
	assert.equal(s.approval?.impl.hasWhy, true)
})

test('a clean draft passes', () => {
	assert.deepEqual(checkSpec('x', state()), [])
})

test('open markers block the gate once approved', () => {
	const v = checkSpec(
		'x',
		state({ status: 'approved', markerCount: 1, approval: { spec: { verdict: 'approve', by: 'u', hasWhy: false } } }),
	)
	assert.ok(v.some((m) => /open marker/.test(m)))
})

test('approved without an approve verdict on the spec gate is illegal', () => {
	const v = checkSpec('x', state({ status: 'approved' }))
	assert.ok(v.some((m) => /approval.spec has no approve verdict/.test(m)))
})

test('a by:agent entry without a why is illegal', () => {
	const v = checkSpec('x', state({ approval: { spec: { verdict: 'approve', by: 'agent', hasWhy: false } } }))
	assert.ok(v.some((m) => /by:agent but has no why/.test(m)))
})

test('a pause carrying by is illegal', () => {
	const v = checkSpec('x', state({ approval: { spec: { verdict: 'pause', by: 'agent', hasWhy: true } } }))
	assert.ok(v.some((m) => /pause but carries by/.test(m)))
})

test('an unknown gate key is rejected', () => {
	const v = checkSpec('x', state({ approval: { release: { verdict: 'approve', by: 'u', hasWhy: false } } }))
	assert.ok(v.some((m) => /unknown gate "release"/.test(m)))
})

test('a fully approved-and-implemented spec passes', () => {
	const v = checkSpec(
		'x',
		state({
			status: 'implemented',
			approval: {
				spec: { verdict: 'approve', by: 'u', hasWhy: false },
				impl: { verdict: 'approve', by: 'u', hasWhy: false },
			},
		}),
	)
	assert.deepEqual(v, [])
})

test('a descriptive root with no frontmatter is a no-op (no .feature requirement)', () => {
	assert.deepEqual(checkSpec('sdd', parseSpecState('# Spec\n\nbody only, no frontmatter\n')), [])
})

// ── project-path (the router index) ──

test('parseSpecState reads project-path; absent leaves it null', () => {
	assert.equal(
		parseSpecState('---\nstatus: draft\nproject-path: plugins/sdd-new\n---\n').projectPath,
		'plugins/sdd-new',
	)
	assert.equal(parseSpecState('---\nstatus: draft\n---\n').projectPath, null)
})

test('project-path is a router hint, not a lifecycle-legality concern — its absence is not a violation', () => {
	assert.deepEqual(checkSpec('x', state({ projectPath: null })), [])
})

// ── per-node spec-type reconcile ──

test('parseNode reads spec-type and detects Subject / Use Cases sections', () => {
	const ref = parseNode('---\nspec-type: reference\n---\n\n# x\n\n## Subject\n\nfoo\n')
	assert.deepEqual(ref, { type: 'reference', hasSubject: true, hasUseCases: false, lifecycleFields: [] })
	const beh = parseNode('---\nspec-type: behavioral\n---\n\n# y\n\n## Use Cases\n\nbar\n')
	assert.deepEqual(beh, { type: 'behavioral', hasSubject: false, hasUseCases: true, lifecycleFields: [] })
	const desc = parseNode('# overview\n\nno marker\n')
	assert.equal(desc.type, null)
})

test('parseNode ignores a heading shown inside a code fence', () => {
	const n = parseNode('---\nspec-type: reference\n---\n\n```\n## Subject\n```\n')
	assert.equal(n.hasSubject, false)
})

test('a descriptive node (no marker) raises no spec-type violation', () => {
	assert.deepEqual(checkNode('authoring', node({ type: null }), true), [])
})

test('a reference node with a Subject and no .feature passes', () => {
	assert.deepEqual(checkNode('authoring/spec-format', node({ type: 'reference', hasSubject: true }), false), [])
})

test('a reference node carrying a .feature is illegal', () => {
	const v = checkNode('authoring/spec-format', node({ type: 'reference', hasSubject: true }), true)
	assert.ok(v.some((m) => /reference but a sibling .feature exists/.test(m)))
})

test('a reference node with no Subject section is illegal', () => {
	const v = checkNode('authoring/spec-format', node({ type: 'reference', hasSubject: false }), false)
	assert.ok(v.some((m) => /reference but no ## Subject/.test(m)))
})

test('a behavioral node with Use Cases passes', () => {
	assert.deepEqual(checkNode('authoring/spec-producer', node({ type: 'behavioral', hasUseCases: true }), true), [])
})

test('a behavioral node with no Use Cases section is illegal', () => {
	const v = checkNode('authoring/spec-producer', node({ type: 'behavioral', hasUseCases: false }), true)
	assert.ok(v.some((m) => /behavioral but no ## Use Cases/.test(m)))
})

test('an unknown spec-type is rejected', () => {
	const v = checkNode('x', node({ type: 'descriptive' }), false)
	assert.ok(v.some((m) => /unknown spec-type "descriptive"/.test(m)))
})

// ── lifecycle frontmatter is root-spec.md-only ──

test('parseNode collects forbidden lifecycle fields from a node README', () => {
	const n = parseNode('---\nspec-type: behavioral\nstatus: draft\nproject-path: x\n---\n\n## Use Cases\n')
	assert.deepEqual(n.lifecycleFields, ['status', 'project-path'])
	assert.equal(n.type, 'behavioral')
})

test('a node carrying a stray status field fails closed', () => {
	const v = checkNode(
		'mission/conductor',
		node({ type: 'behavioral', hasUseCases: true, lifecycleFields: ['status'] }),
		true,
	)
	assert.ok(v.some((m) => /carries lifecycle field "status" — lifecycle frontmatter is root-spec.md-only/.test(m)))
})

test('a descriptive node carrying lifecycle frontmatter still fails closed', () => {
	const v = checkNode('mission', node({ type: null, lifecycleFields: ['approval', 'produced-by'] }), false)
	assert.ok(v.some((m) => /carries lifecycle field "approval"/.test(m)))
	assert.ok(v.some((m) => /carries lifecycle field "produced-by"/.test(m)))
})

test('a clean spec-type-only node raises no lifecycle violation', () => {
	assert.deepEqual(checkNode('authoring/spec-producer', node({ type: 'behavioral', hasUseCases: true }), true), [])
})

test('a retired schema field on a node fails closed', () => {
	const v = checkNode(
		'x',
		node({ type: 'reference', hasSubject: true, lifecycleFields: ['aligned', 'spec-layout'] }),
		false,
	)
	assert.ok(v.some((m) => /carries lifecycle field "aligned"/.test(m)))
	assert.ok(v.some((m) => /carries lifecycle field "spec-layout"/.test(m)))
})

test('a run-level leash frontmatter field on a node fails closed', () => {
	// parseNode-level: proves `leash` is actually wired into NODE_FORBIDDEN_FIELDS via a real
	// frontmatter scan (not just a hand-built fixture), then that checkNode flags it.
	const n = parseNode('---\nspec-type: behavioral\nleash: auto-spec\n---\n\n## Use Cases\n')
	assert.deepEqual(n.lifecycleFields, ['leash'])
	const v = checkNode('mission/conductor', n, true)
	assert.ok(v.some((m) => /carries lifecycle field "leash"/.test(m)))
})

// ── discovery ──

test('discoverSpecDirs finds the project root; discoverNodeDirs finds README nodes', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-specs-'))
	try {
		mkdirSync(join(root, 'sdd', 'authoring', 'spec-format'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'spec.md'), '---\nstatus: draft\n---\n')
		writeFileSync(join(root, 'sdd', 'authoring', 'README.md'), '# overview\n')
		writeFileSync(
			join(root, 'sdd', 'authoring', 'spec-format', 'README.md'),
			'---\nspec-type: reference\n---\n## Subject\n',
		)
		assert.deepEqual(discoverSpecDirs(root), ['sdd'])
		assert.deepEqual(
			discoverNodeDirs(root).sort(),
			[join('sdd', 'authoring'), join('sdd', 'authoring', 'spec-format')].sort(),
		)
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

// ── the durable gate-line floor ──

const gate = (over: Partial<LedgerGate> = {}): LedgerGate => ({ gate: 'spec', verdict: 'approve', ...over })

test('parseLedgerGates reads gate lines and skips blank, malformed, and non-gate lines', () => {
	const text = [
		'{"seq":1,"kind":"gate","gate":"spec","verdict":"approve","by":"unional"}',
		'',
		'{"seq":2,"kind":"strategy","recommendation":"x","ratified":false}',
		'not json at all',
		'{"seq":3,"kind":"gate","gate":"impl","verdict":"approve","by":"unional"}',
	].join('\n')
	assert.deepEqual(parseLedgerGates(text), [
		{ gate: 'spec', verdict: 'approve' },
		{ gate: 'impl', verdict: 'approve' },
	])
})

test('readLedgerText: globs every ledger/ shard plus a legacy ledger.jsonl', () => {
	const root = mkdtempSync(join(tmpdir(), 'ledger-'))
	try {
		const slug = 'proj'
		mkdirSync(join(root, slug, 'ledger'), { recursive: true })
		// legacy single file (pre-shard) — still counted
		writeFileSync(join(root, slug, 'ledger.jsonl'), '{"seq":1,"kind":"gate","gate":"spec","verdict":"approve"}\n')
		// two per-writer shards
		writeFileSync(
			join(root, slug, 'ledger', 'reshard-ledger.a3f9c1.jsonl'),
			'{"seq":1,"kind":"gate","gate":"impl","verdict":"approve"}\n',
		)
		writeFileSync(join(root, slug, 'ledger', 'strategy.7b2e08.jsonl'), '{"seq":1,"kind":"strategy","ratified":false}\n')
		// a non-jsonl file in the dir is ignored
		writeFileSync(join(root, slug, 'ledger', 'README.md'), 'not a shard\n')

		const gates = parseLedgerGates(readLedgerText(root, slug))
		// the legacy spec-gate line and the shard impl-gate line are both seen; strategy is not a gate
		assert.deepEqual(gates, [
			{ gate: 'spec', verdict: 'approve' },
			{ gate: 'impl', verdict: 'approve' },
		])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('readLedgerText: reads shards when no legacy file exists', () => {
	const root = mkdtempSync(join(tmpdir(), 'ledger-'))
	try {
		const slug = 'proj'
		mkdirSync(join(root, slug, 'ledger'), { recursive: true })
		writeFileSync(
			join(root, slug, 'ledger', 'cr.abc123.jsonl'),
			'{"seq":1,"kind":"gate","gate":"spec","verdict":"approve"}\n',
		)
		assert.deepEqual(parseLedgerGates(readLedgerText(root, slug)), [{ gate: 'spec', verdict: 'approve' }])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('readLedgerText: returns empty string when neither ledger/ nor ledger.jsonl exists', () => {
	const root = mkdtempSync(join(tmpdir(), 'ledger-'))
	try {
		mkdirSync(join(root, 'proj'), { recursive: true })
		assert.equal(readLedgerText(root, 'proj'), '')
		assert.deepEqual(parseLedgerGates(readLedgerText(root, 'proj')), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkGateFloor: a draft needs no ledger gate line', () => {
	assert.deepEqual(checkGateFloor('sdd', 'draft', []), [])
})

test('checkGateFloor: approved with no spec gate line is illegal', () => {
	const v = checkGateFloor('sdd', 'approved', [])
	assert.equal(v.length, 1)
	assert.match(v[0], /no spec gate approve line/)
})

test('checkGateFloor: approved with a spec gate approve line is legal', () => {
	assert.deepEqual(checkGateFloor('sdd', 'approved', [gate()]), [])
})

test('checkGateFloor: a spec gate reject does not satisfy the floor', () => {
	const v = checkGateFloor('sdd', 'approved', [gate({ verdict: 'reject' })])
	assert.equal(v.length, 1)
	assert.match(v[0], /no spec gate approve line/)
})

test('checkGateFloor: implemented requires both a spec and an impl approve line', () => {
	assert.deepEqual(checkGateFloor('sdd', 'implemented', [gate(), gate({ gate: 'impl' })]), [])
	const missingImpl = checkGateFloor('sdd', 'implemented', [gate()])
	assert.equal(missingImpl.length, 1)
	assert.match(missingImpl[0], /no impl gate approve line/)
	const missingBoth = checkGateFloor('sdd', 'implemented', [])
	assert.equal(missingBoth.length, 2)
})

// ── referenced-artifact-exists (--files only, never the --root sweep) ──

test('extractPathRefs picks up relative and repo-root-relative backtick paths', () => {
	const text = 'See `../../design/foo.md` and `plugins/sdd-new/skills/bar/` for the rest.'
	assert.deepEqual(extractPathRefs(text), ['../../design/foo.md', 'plugins/sdd-new/skills/bar/'])
})

test('extractPathRefs ignores slash-containing prose with no path prefix', () => {
	assert.deepEqual(extractPathRefs('The lens triad is `Oracle/Builder/Architect`.'), [])
})

test('extractPathRefs ignores template placeholders and globs', () => {
	const text = 'See `.agents/specs/<project>/spec.md` and `.agents/plans/*.plan.md`.'
	assert.deepEqual(extractPathRefs(text), [])
})

test('checkReferencedArtifacts flags a relative reference that resolves to nothing', () => {
	const v = checkReferencedArtifacts('sdd/foo', '.agents/specs/sdd/foo', 'See `../bar/baz.md`.')
	assert.equal(v.length, 1)
	assert.match(v[0], /references nonexistent artifact `\.\.\/bar\/baz\.md`/)
})

test('checkReferencedArtifacts passes a relative reference that resolves to a real file', () => {
	const v = checkReferencedArtifacts(
		'sdd/spec-gate',
		'plugins/sdd/skills/spec-gate',
		'See `./scripts/check-spec-state.mts`.',
	)
	assert.deepEqual(v, [])
})

test('checkReferencedArtifacts passes a repo-root-relative reference that resolves', () => {
	const v = checkReferencedArtifacts('sdd', '.', 'See `plugins/sdd/skills/spec-gate/README.md`.')
	assert.deepEqual(v, [])
})

test('checkReferencedArtifacts strips an anchor fragment before resolving', () => {
	const v = checkReferencedArtifacts('sdd', '.', 'See `plugins/sdd/skills/spec-gate/README.md#gate`.')
	assert.deepEqual(v, [])
})

test('parseFilesArg collects paths after --files (spec-state)', () => {
	assert.deepEqual(parseFilesArg(['--files', 'a.md', 'b.md']), ['a.md', 'b.md'])
})

test('parseFilesArg stops at the next flag (spec-state)', () => {
	assert.deepEqual(parseFilesArg(['--files', 'a.md', '--root', 'x']), ['a.md'])
})

test('checkReferencedArtifactsInFiles fails closed on an unreadable path', () => {
	const v = checkReferencedArtifactsInFiles(['/nonexistent/nope.md'])
	assert.equal(v.length, 1)
	assert.match(v[0], /cannot read file/)
})

test('checkReferencedArtifactsInFiles reads named files and reports their violations', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'sdd', 'foo'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'foo', 'README.md'), 'See `../bar/baz.md`.\n')
		const v = checkReferencedArtifactsInFiles([join(root, 'sdd', 'foo', 'README.md')])
		assert.equal(v.length, 1)
		assert.match(v[0], /references nonexistent artifact/)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
