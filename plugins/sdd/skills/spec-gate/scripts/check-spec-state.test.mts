import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	checkGateFloor,
	checkNode,
	checkReferencedArtifacts,
	checkReferencedArtifactsInFiles,
	checkSpec,
	checkUseCaseCoverage,
	checkUseCaseCoverageInFiles,
	discoverNodeDirs,
	discoverSpecDirs,
	extractPathRefs,
	extractUseCaseScenarioRefs,
	filterProseMdInSpecTree,
	findSiblingFeature,
	introducedPathRefs,
	isUnderSpecTree,
	type LedgerGate,
	main,
	type NodeSpec,
	parseFilesArg,
	parseLedgerGates,
	parseNode,
	parseSpecState,
	readLedgerText,
	resolveScenarioRef,
	type SpecState,
} from './check-spec-state.mts'

// The engine resolves a repo-root-relative reference against process.cwd() (the
// CWD-is-repo-root convention this script documents). Establish that precondition
// rather than inherit it — the suite also runs from the package dir.
process.chdir(join(dirname(fileURLToPath(import.meta.url)), '../../../../..'))

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

test('introducedPathRefs returns only the refs current adds beyond baseline', () => {
	const baseline = 'See `../a.md`.'
	const current = 'See `../a.md` and `../b.md`.'
	assert.deepEqual(introducedPathRefs(baseline, current), ['../b.md'])
})

test('introducedPathRefs: empty baseline means every ref is introduced', () => {
	assert.deepEqual(introducedPathRefs('', 'See `../a.md` and `../b.md`.'), ['../a.md', '../b.md'])
})

test('checkReferencedArtifacts surfaces an introduced unresolved reference as a finding', () => {
	const v = checkReferencedArtifacts('sdd/foo', '.agents/specs/sdd/foo', 'See `../bar/baz.md`.')
	assert.equal(v.length, 1)
	assert.match(v[0], /introduces unresolved reference `\.\.\/bar\/baz\.md`/)
	assert.match(v[0], /surfaced for judgment/)
})

test('checkReferencedArtifacts does not gate a pre-existing unresolved reference the CR left untouched', () => {
	const text = 'See `../nope.md`.'
	const v = checkReferencedArtifacts('sdd/foo', '.agents/specs/sdd/foo', text, text)
	assert.deepEqual(v, [])
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
	const { findings, violations } = checkReferencedArtifactsInFiles(['/nonexistent/nope.md'])
	assert.deepEqual(findings, [])
	assert.equal(violations.length, 1)
	assert.match(violations[0], /cannot read file/)
})

test('checkReferencedArtifactsInFiles reads named files and reports findings, not violations', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'sdd', 'foo'), { recursive: true })
		writeFileSync(join(root, 'sdd', 'foo', 'README.md'), 'See `../bar/baz.md`.\n')
		const { findings, violations } = checkReferencedArtifactsInFiles([join(root, 'sdd', 'foo', 'README.md')])
		assert.deepEqual(violations, [])
		assert.equal(findings.length, 1)
		assert.match(findings[0], /introduces unresolved reference/)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('checkReferencedArtifactsInFiles: an injected baseline scopes findings to the introduced ref only', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'sdd', 'foo'), { recursive: true })
		const path = join(root, 'sdd', 'foo', 'README.md')
		const baselineText = 'See `../old-broken.md`.\n'
		writeFileSync(path, 'See `../old-broken.md` and `../new-broken.md`.\n')
		const { findings, violations } = checkReferencedArtifactsInFiles([path], () => baselineText)
		assert.deepEqual(violations, [])
		assert.equal(findings.length, 1)
		assert.match(findings[0], /introduces unresolved reference `\.\.\/new-broken\.md`/)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ── referenced-artifact-exists: sibling-prose sweep (widened beyond spec.md/README.md) ──

test('isUnderSpecTree recognizes the three fixed spec-tree roots', () => {
	assert.equal(isUnderSpecTree('.agents/spec/design/foo.md'), true)
	assert.equal(isUnderSpecTree('.agents/specs/sdd/design/foo.md'), true)
	assert.equal(isUnderSpecTree('plugins/sdd-new/.agents/spec/design/foo.md'), true)
	assert.equal(isUnderSpecTree('docs/research/2026-01-foo.md'), false)
	assert.equal(isUnderSpecTree('README.md'), false)
})

test('filterProseMdInSpecTree keeps only .md files under the spec tree', () => {
	const paths = [
		'.agents/specs/sdd/design/loops.md',
		'.agents/specs/sdd/authoring/spec-gate/README.md',
		'.agents/specs/sdd/authoring/spec-gate/spec-gate.feature', // not .md
		'docs/research/2026-01-foo.md', // outside the spec tree
		'README.md', // outside the spec tree
	]
	assert.deepEqual(filterProseMdInSpecTree(paths), [
		'.agents/specs/sdd/design/loops.md',
		'.agents/specs/sdd/authoring/spec-gate/README.md',
	])
})

// Scenario: an unresolved reference the CR introduces in a design or nested node doc is surfaced for judgment
test('main --files surfaces a broken reference in a touched design doc as a finding, exit 0', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	const cwd = process.cwd()
	try {
		mkdirSync(join(root, '.agents', 'specs', 'sdd', 'design'), { recursive: true })
		writeFileSync(join(root, '.agents', 'specs', 'sdd', 'design', 'loops.md'), 'See `../nope/nope.md`.\n')
		process.chdir(root)
		// no --base ⇒ every ref in the file counts as introduced (no committed baseline to diff against)
		const code = main(['--files', '.agents/specs/sdd/design/loops.md'])
		assert.equal(code, 0)
	} finally {
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: an introduced reference resolving in a design or nested node doc raises no finding
test('main --files raises no finding when every introduced reference resolves', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	const cwd = process.cwd()
	try {
		mkdirSync(join(root, '.agents', 'specs', 'sdd', 'design'), { recursive: true })
		writeFileSync(
			join(root, '.agents', 'specs', 'sdd', 'design', 'loops.md'),
			'See `.agents/specs/sdd/design/loops.md`.\n',
		)
		process.chdir(root)
		const code = main(['--files', '.agents/specs/sdd/design/loops.md'])
		assert.equal(code, 0)
	} finally {
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: the referenced-artifact sweep covers every touched prose .md under the spec tree
test('the sweep covers a design doc and a nested node doc, not only spec.md/README.md', () => {
	const paths = [
		'.agents/specs/sdd/design/loops.md',
		'.agents/specs/sdd/authoring/spec-gate/README.md',
		'.agents/specs/sdd/spec.md',
	]
	assert.deepEqual(filterProseMdInSpecTree(paths), paths)
})

// Scenario: the sibling-prose sweep stays scoped to the touched files and never the whole tree
test('main --files only checks the passed paths, never sweeps the whole tree', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	const cwd = process.cwd()
	try {
		mkdirSync(join(root, '.agents', 'specs', 'sdd', 'design'), { recursive: true })
		// an untouched file with a broken reference sits in the tree...
		writeFileSync(join(root, '.agents', 'specs', 'sdd', 'design', 'untouched.md'), 'See `../nope/nope.md`.\n')
		// ...but the CR only touched this clean file.
		writeFileSync(join(root, '.agents', 'specs', 'sdd', 'design', 'loops.md'), 'nothing to see here\n')
		process.chdir(root)
		const code = main(['--files', '.agents/specs/sdd/design/loops.md'])
		assert.equal(code, 0)
	} finally {
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: a touched prose .md outside the spec tree is not swept
test('a touched .md outside the spec tree is not swept', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	const cwd = process.cwd()
	try {
		mkdirSync(join(root, 'docs', 'research'), { recursive: true })
		writeFileSync(join(root, 'docs', 'research', '2026-01-foo.md'), 'See `../../nope/nope.md`.\n')
		process.chdir(root)
		const code = main(['--files', 'docs/research/2026-01-foo.md'])
		assert.equal(code, 0) // not swept, so the broken reference raises nothing
	} finally {
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})

// ── use-case-coverage pre-filter ──

test('extractUseCaseScenarioRefs reads backtick-wrapped Scenario titles and @tags from a table', () => {
	const text = [
		'## Use Cases',
		'',
		'**Subject** — x.',
		'',
		'| Trigger | Scenario |',
		'|---|---|',
		'| a happens | `Scenario: a happens and resolves` |',
		'| b happens | `@shared-tag` |',
		'',
	].join('\n')
	assert.deepEqual(extractUseCaseScenarioRefs(text), {
		hasSection: true,
		refs: ['Scenario: a happens and resolves', '@shared-tag'],
	})
})

test('extractUseCaseScenarioRefs reports no section when absent', () => {
	assert.deepEqual(extractUseCaseScenarioRefs('# x\n\nno use cases here\n'), { hasSection: false, refs: [] })
})

test('extractUseCaseScenarioRefs reports the section with no refs for a prose/EARS form', () => {
	const text = '## Use Cases\n\nWhen X happens, Y results. No table here.\n'
	assert.deepEqual(extractUseCaseScenarioRefs(text), { hasSection: true, refs: [] })
})

test('extractUseCaseScenarioRefs reports no refs for a table with no Scenario column', () => {
	const text = ['## Use Cases', '', '| Trigger | Inputs | Outcome |', '|---|---|---|', '| a | b | c |', ''].join('\n')
	assert.deepEqual(extractUseCaseScenarioRefs(text), { hasSection: true, refs: [] })
})

test('resolveScenarioRef matches an exact Scenario title', () => {
	const feature = 'Feature: x\n\n  Scenario: a happens and resolves\n    Given a\n    Then b\n'
	assert.equal(resolveScenarioRef('Scenario: a happens and resolves', feature), true)
	assert.equal(resolveScenarioRef('Scenario: a happens and does not resolve', feature), false)
})

test('resolveScenarioRef matches a shared @tag token', () => {
	const feature = '@shared-tag\nFeature: x\n\n  Scenario: a\n    Then b\n'
	assert.equal(resolveScenarioRef('@shared-tag', feature), true)
	assert.equal(resolveScenarioRef('@other-tag', feature), false)
})

test('findSiblingFeature prefers the dir-named feature, falls back to the single file', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'spec-gate'), { recursive: true })
		writeFileSync(join(root, 'spec-gate', 'spec-gate.feature'), 'Feature: x\n')
		assert.equal(findSiblingFeature(join(root, 'spec-gate')), join(root, 'spec-gate', 'spec-gate.feature'))

		mkdirSync(join(root, 'other'), { recursive: true })
		writeFileSync(join(root, 'other', 'whatever.feature'), 'Feature: y\n')
		assert.equal(findSiblingFeature(join(root, 'other')), join(root, 'other', 'whatever.feature'))

		mkdirSync(join(root, 'none'), { recursive: true })
		assert.equal(findSiblingFeature(join(root, 'none')), null)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: a Use Cases table row naming a scenario absent from the sibling feature fails the gate closed
test('checkUseCaseCoverage flags a row naming a scenario absent from the sibling feature', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'node'), { recursive: true })
		writeFileSync(join(root, 'node', 'node.feature'), 'Feature: x\n\n  Scenario: the real one\n    Then y\n')
		const text = [
			'## Use Cases',
			'',
			'| Trigger | Scenario |',
			'|---|---|',
			'| a | `Scenario: a scenario that does not exist` |',
			'',
		].join('\n')
		const v = checkUseCaseCoverage('node', join(root, 'node'), text)
		assert.equal(v.length, 1)
		assert.match(v[0], /does not resolve in the sibling \.feature/)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: a Use Cases table whose every row resolves to a real scenario raises no violation
test('checkUseCaseCoverage raises nothing when every row resolves', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'node'), { recursive: true })
		writeFileSync(join(root, 'node', 'node.feature'), 'Feature: x\n\n  Scenario: the real one\n    Then y\n')
		const text = [
			'## Use Cases',
			'',
			'| Trigger | Scenario |',
			'|---|---|',
			'| a | `Scenario: the real one` |',
			'',
		].join('\n')
		assert.deepEqual(checkUseCaseCoverage('node', join(root, 'node'), text), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// Scenario: a spec.md with no Use Cases section raises no use-case-coverage violation
test('checkUseCaseCoverage raises nothing for a reference/descriptive doc with no Use Cases section', () => {
	assert.deepEqual(checkUseCaseCoverage('sdd', '.', '---\nspec-type: reference\n---\n\n## Subject\n\nfoo\n'), [])
})

// Scenario: prose or EARS use cases carry no row to link and stay judge-checked
test('checkUseCaseCoverage raises no mechanical violation for prose/EARS use cases', () => {
	const text = '## Use Cases\n\nWhen X happens, Y results. No table, no Scenario cell.\n'
	assert.deepEqual(checkUseCaseCoverage('node', '.', text), [])
})

// Scenario: the use-case-coverage check scopes to the CR's touched behavioral spec.md files
test('checkUseCaseCoverageInFiles only checks the passed paths, never sweeps the whole tree', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	try {
		mkdirSync(join(root, 'touched'), { recursive: true })
		mkdirSync(join(root, 'untouched'), { recursive: true })
		writeFileSync(join(root, 'touched', 'touched.feature'), 'Feature: x\n\n  Scenario: real\n    Then y\n')
		writeFileSync(
			join(root, 'touched', 'README.md'),
			['## Use Cases', '', '| Trigger | Scenario |', '|---|---|', '| a | `Scenario: real` |', ''].join('\n'),
		)
		// untouched carries a broken link, but the CR never touched it
		writeFileSync(
			join(root, 'untouched', 'README.md'),
			['## Use Cases', '', '| Trigger | Scenario |', '|---|---|', '| a | `Scenario: does not exist` |', ''].join('\n'),
		)
		const v = checkUseCaseCoverageInFiles([join(root, 'touched', 'README.md')])
		assert.deepEqual(v, [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// Integration: the gate's --files entry point runs both the widened referenced-artifact
// sweep and the use-case-coverage check together, both fail-closed.
test('main --files fails closed on an unresolved Use Cases scenario link', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-'))
	const cwd = process.cwd()
	try {
		mkdirSync(join(root, '.agents', 'specs', 'sdd', 'node'), { recursive: true })
		writeFileSync(
			join(root, '.agents', 'specs', 'sdd', 'node', 'node.feature'),
			'Feature: x\n\n  Scenario: the real one\n    Then y\n',
		)
		writeFileSync(
			join(root, '.agents', 'specs', 'sdd', 'node', 'README.md'),
			['## Use Cases', '', '| Trigger | Scenario |', '|---|---|', '| a | `Scenario: nope` |', ''].join('\n'),
		)
		process.chdir(root)
		const code = main(['--files', '.agents/specs/sdd/node/README.md'])
		assert.equal(code, 1)
	} finally {
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})

// Integration: exercise readBaselineFromGit / --base against a REAL git repo end-to-end
// (the other --base-shaped tests inject the baseline callback, so a regression in the
// `git show <base>:<path>` invocation itself would otherwise go uncaught). A ref present
// in the committed baseline is not gated; a ref the working tree introduces is surfaced.
test('main --base reads the committed baseline via git and diff-scopes to introduced refs', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-spec-state-git-'))
	const cwd = process.cwd()
	const rel = join('.agents', 'specs', 'sdd', 'node', 'README.md')
	const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'ignore' })
	const writes: string[] = []
	const origWrite = process.stdout.write.bind(process.stdout)
	try {
		mkdirSync(join(root, '.agents', 'specs', 'sdd', 'node'), { recursive: true })
		// committed baseline already carries a broken ref — must NOT be gated later.
		writeFileSync(join(root, rel), 'See `../pre-existing-broken.md`.\n')
		git('init', '-q')
		git('config', 'user.email', 't@t')
		git('config', 'user.name', 't')
		git('add', '-A')
		git('commit', '-q', '-m', 'baseline')
		// working tree introduces a SECOND broken ref.
		writeFileSync(join(root, rel), 'See `../pre-existing-broken.md` and `../introduced-broken.md`.\n')
		process.chdir(root)
		process.stdout.write = ((s: string) => {
			writes.push(String(s))
			return true
		}) as typeof process.stdout.write
		const code = main(['--files', rel, '--base', 'HEAD'])
		process.stdout.write = origWrite
		const out = writes.join('')
		assert.equal(code, 0) // a surfaced finding never fails the gate closed
		assert.match(out, /introduces unresolved reference `\.\.\/introduced-broken\.md`/)
		assert.doesNotMatch(out, /pre-existing-broken/) // pre-existing ref is diff-scoped out
	} finally {
		process.stdout.write = origWrite
		process.chdir(cwd)
		rmSync(root, { recursive: true, force: true })
	}
})
