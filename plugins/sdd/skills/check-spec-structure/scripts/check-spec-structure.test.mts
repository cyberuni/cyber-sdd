import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	audit,
	checkOversized,
	checkUntagged,
	countScenarios,
	hasBlocking,
	main,
	parseNodeFrontmatter,
	scanProjectSpec,
} from './check-spec-structure.mts'

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'check-spec-structure-'))
}

// Seed a node folder: <cap>/<name>/README.md (+ optional <name>.feature with `scenarios` scenarios).
function seedNode(
	dir: string,
	cap: string,
	name: string,
	opts: { specType?: string; concept?: string; scenarios?: number; body?: string },
): void {
	const nodeDir = join(dir, cap, name)
	mkdirSync(nodeDir, { recursive: true })
	const fm: string[] = []
	if (opts.specType) fm.push(`spec-type: ${opts.specType}`)
	if (opts.concept) fm.push(`concept: ${opts.concept}`)
	const front = fm.length ? `---\n${fm.join('\n')}\n---\n\n` : ''
	writeFileSync(join(nodeDir, 'README.md'), `${front}# ${name}\n\n${opts.body ?? 'body'}\n`)
	if (opts.scenarios && opts.scenarios > 0) {
		let f = '@frozen\nFeature: x\n'
		for (let i = 0; i < opts.scenarios; i++) f += `\n  Scenario: s${i}\n    Given a\n    When b\n    Then c\n`
		writeFileSync(join(nodeDir, `${name}.feature`), f)
	}
}

function listFiles(dir: string): string[] {
	const out: string[] = []
	for (const e of readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (e.isFile()) out.push(join(e.parentPath, e.name))
	}
	return out.sort()
}

// ── parse / count helpers ──

test('parseNodeFrontmatter reads spec-type and concept', () => {
	const fm = parseNodeFrontmatter('---\nspec-type: behavioral\nconcept: spec-structure\n---\n\n# x\n')
	assert.equal(fm.specType, 'behavioral')
	assert.deepEqual(fm.concepts, ['spec-structure'])
})

test('parseNodeFrontmatter on a spec-typed node with no concept', () => {
	const fm = parseNodeFrontmatter('---\nspec-type: behavioral\n---\n\n# x\n')
	assert.equal(fm.specType, 'behavioral')
	assert.deepEqual(fm.concepts, [])
})

test('countScenarios counts Scenario lines only', () => {
	assert.equal(countScenarios('@frozen\nFeature: x\n  Scenario: a\n  Scenario: b\n    Then z\n'), 2)
})

// ── Audit node-shape (deterministic) ──

test('a spec-typed node missing a concept tag is flagged as an untagged orphan', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'lonely', { specType: 'behavioral', scenarios: 3 })
	const findings = audit(scanProjectSpec(d), 40)
	const untagged = findings.filter((f) => f.kind === 'untagged-node')
	assert.equal(untagged.length, 1)
	assert.match(untagged[0].node, /lonely/)
})

test('a node carrying a concept tag raises no untagged finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'tagged', { specType: 'behavioral', concept: 'spec-structure', scenarios: 3 })
	assert.equal(checkUntagged(scanProjectSpec(d)).length, 0)
})

test('a node whose suite exceeds the granularity threshold is flagged oversized', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'big', { specType: 'behavioral', concept: 'spec-structure', scenarios: 12 })
	const oversized = checkOversized(scanProjectSpec(d), 10)
	assert.equal(oversized.length, 1)
	assert.match(oversized[0].node, /big/)
	assert.match(oversized[0].detail, /propose a sub-node split/)
})

test('a node within the granularity threshold raises no oversized finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'small', { specType: 'behavioral', concept: 'spec-structure', scenarios: 5 })
	assert.equal(checkOversized(scanProjectSpec(d), 40).length, 0)
})

test('a structurally clean project-spec produces no findings', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'a', { specType: 'behavioral', concept: 'spec-structure', scenarios: 3 })
	seedNode(d, 'corpus', 'b', { specType: 'reference', concept: 'spec-structure' })
	assert.deepEqual(audit(scanProjectSpec(d), 40), [])
})

// ── Severity ──

test('an untagged orphan is a blocking finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'lonely', { specType: 'behavioral', scenarios: 1 })
	const f = checkUntagged(scanProjectSpec(d))[0]
	assert.equal(f.severity, 'blocking')
})

test('an oversized node is an advisory finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'big', { specType: 'behavioral', concept: 'spec-structure', scenarios: 12 })
	const f = checkOversized(scanProjectSpec(d), 10)[0]
	assert.equal(f.severity, 'advisory')
})

// ── Check mode (CI) ──

test('check mode exits non-zero on a blocking finding and writes nothing', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'lonely', { specType: 'behavioral', scenarios: 1 })
	const before = listFiles(d)
	const code = main(['--spec-dir', d, '--check'])
	assert.equal(code, 1)
	assert.deepEqual(listFiles(d), before) // writes nothing
})

test('check mode exits zero when only advisory findings exist', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'big', { specType: 'behavioral', concept: 'spec-structure', scenarios: 12 })
	assert.equal(main(['--spec-dir', d, '--check', '--max-scenarios', '10']), 0)
})

test('check mode exits zero on a clean project-spec', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'a', { specType: 'behavioral', concept: 'spec-structure', scenarios: 3 })
	assert.equal(main(['--spec-dir', d, '--check']), 0)
})

test('hasBlocking distinguishes severities', () => {
	assert.equal(hasBlocking([{ kind: 'oversized-node', severity: 'advisory', node: 'x', detail: '' }]), false)
	assert.equal(hasBlocking([{ kind: 'untagged-node', severity: 'blocking', node: 'x', detail: '' }]), true)
})

// ── The write boundary ──

test('the audit writes nothing in default mode', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'lonely', { specType: 'behavioral', scenarios: 1 })
	const before = listFiles(d)
	main(['--spec-dir', d])
	assert.deepEqual(listFiles(d), before)
})

test('frontmatter only — node body does not change the deterministic findings', () => {
	const d1 = mkCorpus()
	const d2 = mkCorpus()
	seedNode(d1, 'corpus', 'n', { specType: 'behavioral', concept: 'spec-structure', scenarios: 3, body: 'alpha' })
	seedNode(d2, 'corpus', 'n', {
		specType: 'behavioral',
		concept: 'spec-structure',
		scenarios: 3,
		body: 'OMEGA different body',
	})
	assert.deepEqual(audit(scanProjectSpec(d1), 40), audit(scanProjectSpec(d2), 40))
})
