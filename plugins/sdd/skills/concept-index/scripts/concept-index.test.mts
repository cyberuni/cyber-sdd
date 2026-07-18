import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	applySection,
	BEGIN_MARKER,
	END_MARKER,
	extractSection,
	facetKind,
	groupByConcept,
	main,
	parseFrontmatter,
	parseScalarOrFlow,
	renderSection,
	scanProjectSpec,
} from './concept-index.mts'

// Write a node md file (relative to dir) with the given frontmatter body.
function seed(dir: string, relPath: string, frontmatter: string, body = '# body'): void {
	const full = join(dir, relPath)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `---\n${frontmatter}\n---\n\n${body}\n`)
}

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'concept-index-'))
}

// ── parseFrontmatter ──

test('parseFrontmatter reads a scalar concept', () => {
	const fm = parseFrontmatter('---\nspec-type: behavioral\nconcept: resolution\n---\n\n# x\n')
	assert.deepEqual(fm?.concepts, ['resolution'])
	assert.equal(fm?.specType, 'behavioral')
})

test('parseFrontmatter reads a flow-list concept', () => {
	const fm = parseFrontmatter('---\nconcept: [governance, resolution]\n---\n\n# x\n')
	assert.deepEqual(fm?.concepts, ['governance', 'resolution'])
})

test('parseFrontmatter reads a block-list concept', () => {
	const fm = parseFrontmatter('---\nconcept:\n  - governance\n  - resolution\n---\n\n# x\n')
	assert.deepEqual(fm?.concepts, ['governance', 'resolution'])
})

test('parseFrontmatter reads model and a concept-less block', () => {
	const fm = parseFrontmatter('---\nmodel: true\n---\n\n# x\n')
	assert.equal(fm?.model, true)
	assert.deepEqual(fm?.concepts, [])
})

test('parseFrontmatter returns null with no frontmatter', () => {
	assert.equal(parseFrontmatter('# just a heading\n'), null)
})

test('parseScalarOrFlow handles both shapes', () => {
	assert.deepEqual(parseScalarOrFlow('resolution'), ['resolution'])
	assert.deepEqual(parseScalarOrFlow('[a, b]'), ['a', 'b'])
	assert.deepEqual(parseScalarOrFlow(''), [])
})

// ── facetKind ──

test('facetKind derives from location then spec-type', () => {
	assert.equal(facetKind('design/lifecycle-model.md', undefined), 'rule')
	assert.equal(facetKind('workflows/README.md', 'behavioral'), 'workflow')
	assert.equal(facetKind('mission/resolution/README.md', 'behavioral'), 'behavior')
	assert.equal(facetKind('common-governances/ownership/README.md', 'reference'), 'reference')
	assert.equal(facetKind('mission/README.md', undefined), 'index')
})

// ── scan + group ──

test('scanProjectSpec collects only concept-tagged nodes and omits the rest', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		seed(dir, 'design/governance-resolution.md', 'concept: [governance, resolution]')
		seed(dir, 'mission/README.md', '') // no frontmatter → omitted
		seed(dir, 'spec.md', 'status: approved') // no concept → omitted
		const records = scanProjectSpec(dir)
		assert.equal(records.length, 2)
		assert.ok(records.some((r) => r.relPath === 'mission/resolution/README.md'))
		assert.ok(records.some((r) => r.relPath === 'design/governance-resolution.md'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('groupByConcept places a multi-tagged node under each concept', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'design/governance-resolution.md', 'concept: [governance, resolution]')
		const grouped = groupByConcept(scanProjectSpec(dir))
		assert.ok(grouped.has('governance'))
		assert.ok(grouped.has('resolution'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('group order is deterministic: concepts and nodes sorted', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		seed(dir, 'design/autonomy-rubric.md', 'concept: autonomy')
		seed(dir, 'workflows/README.md', 'spec-type: behavioral\nconcept: resolution')
		const grouped = groupByConcept(scanProjectSpec(dir))
		assert.deepEqual([...grouped.keys()], ['autonomy', 'resolution'])
		// mission/resolution/ sorts before workflows/ by display path
		assert.deepEqual(
			grouped.get('resolution')?.map((n) => n.display),
			['mission/resolution/', 'workflows/'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── render determinism + no body leak ──

test('renderSection is byte-identical across two runs', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution', '# sentinel-BODY')
		const a = renderSection(groupByConcept(scanProjectSpec(dir)))
		const b = renderSection(groupByConcept(scanProjectSpec(dir)))
		assert.equal(a, b)
		assert.ok(!a.includes('sentinel-BODY'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── applySection / extractSection ──

test('applySection replaces only the delimited block', () => {
	const spec = `# Title\n\nprose before\n\n${BEGIN_MARKER}\nOLD\n${END_MARKER}\n\n## Invariants\n\nprose after\n`
	const next = applySection(spec, `${BEGIN_MARKER}\nNEW\n${END_MARKER}`)
	assert.ok(next.includes('NEW'))
	assert.ok(!next.includes('OLD'))
	assert.ok(next.includes('prose before'))
	assert.ok(next.includes('prose after'))
})

test('applySection inserts at the anchor when markers are absent', () => {
	const spec = '# Title\n\nprose\n\n## Invariants\n\nrules\n'
	const section = `${BEGIN_MARKER}\nX\n${END_MARKER}`
	const next = applySection(spec, section)
	assert.equal((next.match(new RegExp(BEGIN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 1)
	assert.ok(next.indexOf(BEGIN_MARKER) < next.indexOf('## Invariants'))
})

test('applySection is idempotent on an already-current block', () => {
	const section = `${BEGIN_MARKER}\nX\n${END_MARKER}`
	const spec = `# Title\n\n${section}\n\n## Invariants\n`
	assert.equal(applySection(spec, section), spec)
})

test('extractSection returns the block or null', () => {
	const section = `${BEGIN_MARKER}\nX\n${END_MARKER}`
	assert.equal(extractSection(`a\n${section}\nb`), section)
	assert.equal(extractSection('no markers here'), null)
})

// ── CLI write + check ──

test('main --write then --check round-trips with no drift', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		writeFileSync(join(dir, 'spec.md'), '---\nstatus: approved\n---\n\n# Spec\n\n## Invariants\n\n- one\n')
		assert.equal(main(['--spec-dir', dir, '--write']), 0)
		const written = readFileSync(join(dir, 'spec.md'), 'utf8')
		assert.ok(written.includes('`resolution`'))
		assert.equal(main(['--spec-dir', dir, '--check']), 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --check fails on a stale block', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		writeFileSync(
			join(dir, 'spec.md'),
			`---\nstatus: approved\n---\n\n# Spec\n\n${BEGIN_MARKER}\nstale\n${END_MARKER}\n\n## Invariants\n`,
		)
		assert.equal(main(['--spec-dir', dir, '--check']), 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --write is idempotent', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		writeFileSync(join(dir, 'spec.md'), '---\nstatus: approved\n---\n\n# Spec\n\n## Invariants\n')
		main(['--spec-dir', dir, '--write'])
		const once = readFileSync(join(dir, 'spec.md'), 'utf8')
		main(['--spec-dir', dir, '--write'])
		const twice = readFileSync(join(dir, 'spec.md'), 'utf8')
		assert.equal(once, twice)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
