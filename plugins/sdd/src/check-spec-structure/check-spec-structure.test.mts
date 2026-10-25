import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	audit,
	checkGlossary,
	checkIncomplete,
	checkOversized,
	checkUntagged,
	countScenarios,
	hasBlocking,
	main,
	parseNodeFrontmatter,
	parseSectionHeadings,
	profileFeature,
	scanProjectSpec,
} from './check-spec-structure.mts'

const FOUR_SECTIONS = '## What\n\nw\n\n## Use Cases\n\nu\n\n## Control Flow\n\nc\n\n## Scenario map\n\nm\n'

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'check-spec-structure-'))
}

// Seed a node folder: <cap>/<name>/README.md (+ optional <name>.feature with `scenarios` scenarios,
// or verbatim `raw` feature text when the profile shape — tags / section headers — matters).
function seedNode(
	dir: string,
	cap: string,
	name: string,
	opts: { specType?: string; concept?: string; scenarios?: number; body?: string; raw?: string },
): void {
	const nodeDir = join(dir, cap, name)
	mkdirSync(nodeDir, { recursive: true })
	const fm: string[] = []
	if (opts.specType) fm.push(`spec-type: ${opts.specType}`)
	if (opts.concept) fm.push(`concept: ${opts.concept}`)
	const front = fm.length ? `---\n${fm.join('\n')}\n---\n\n` : ''
	writeFileSync(join(nodeDir, 'README.md'), `${front}# ${name}\n\n${opts.body ?? 'body'}\n`)
	if (opts.raw !== undefined) {
		writeFileSync(join(nodeDir, `${name}.feature`), opts.raw)
	} else if (opts.scenarios && opts.scenarios > 0) {
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

test('parseSectionHeadings extracts level-2 headings and strips backticks', () => {
	assert.deepEqual(parseSectionHeadings('# Title\n\n## What\n\n## `## Control Flow`\n\n### sub\n'), [
		'What',
		'## Control Flow',
	])
})

test('parseSectionHeadings ignores ## lines inside a fenced code block', () => {
	const text = '## Real\n\n```bash\n## not a heading\n```\n\n## Also Real\n'
	assert.deepEqual(parseSectionHeadings(text), ['Real', 'Also Real'])
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

test('a behavioral leaf spec that stops at ## Use Cases is flagged incomplete (advisory)', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'partial', {
		specType: 'behavioral',
		concept: 'spec-structure',
		scenarios: 3,
		body: '## Use Cases\n\nu\n',
	})
	const findings = checkIncomplete(scanProjectSpec(d))
	assert.equal(findings.length, 1)
	assert.match(findings[0].node, /partial/)
	assert.equal(findings[0].severity, 'advisory')
	assert.match(findings[0].detail, /## What/)
	assert.match(findings[0].detail, /## Control Flow/)
	assert.match(findings[0].detail, /## Scenario map/)
	// advisory only — it never fails --check
	assert.equal(hasBlocking(findings), false)
})

test('a behavioral leaf with all four sections raises no incomplete finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'complete', {
		specType: 'behavioral',
		concept: 'spec-structure',
		scenarios: 3,
		body: FOUR_SECTIONS,
	})
	assert.equal(checkIncomplete(scanProjectSpec(d)).length, 0)
})

test('a reference-type node is not held to the four-section shape', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'ref', {
		specType: 'reference',
		concept: 'spec-structure',
		scenarios: 3,
		body: '## What\n\nw\n\n## Subject\n\ns\n',
	})
	assert.equal(checkIncomplete(scanProjectSpec(d)).length, 0)
})

test('an index node with no colocated feature is not flagged incomplete', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'index', {
		specType: 'behavioral',
		concept: 'spec-structure',
		body: '## Use Cases\n\nu\n',
	})
	assert.equal(checkIncomplete(scanProjectSpec(d)).length, 0)
})

test('a node whose suite exceeds the granularity threshold is flagged oversized with a shape profile', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'big', { specType: 'behavioral', concept: 'spec-structure', scenarios: 12 })
	const oversized = checkOversized(scanProjectSpec(d), 10)
	assert.equal(oversized.length, 1)
	assert.match(oversized[0].node, /big/)
	assert.match(oversized[0].detail, /plain \d+/)
	assert.match(oversized[0].detail, /clusters \d+/)
})

test('a node within the granularity threshold raises no oversized finding', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'small', { specType: 'behavioral', concept: 'spec-structure', scenarios: 5 })
	assert.equal(checkOversized(scanProjectSpec(d), 40).length, 0)
})

test('a structurally clean project-spec produces no findings', () => {
	const d = mkCorpus()
	seedNode(d, 'corpus', 'a', {
		specType: 'behavioral',
		concept: 'spec-structure',
		scenarios: 3,
		body: FOUR_SECTIONS,
	})
	seedNode(d, 'corpus', 'b', { specType: 'reference', concept: 'spec-structure' })
	assert.deepEqual(audit(scanProjectSpec(d), 40), [])
})

// ── The shape profile ──

test('the shape profile reports the plain and tagged scenario counts', () => {
	let raw = '@frozen\nFeature: x\n'
	for (let i = 0; i < 8; i++) raw += `\n  Scenario: plain${i}\n    Given a\n    When b\n    Then c\n`
	for (let i = 0; i < 5; i++) raw += `\n  @rubric\n  Scenario: tagged${i}\n    Given a\n    When b\n    Then c\n`
	const profile = profileFeature(raw)
	assert.equal(profile.scenarioCount, 13)
	assert.equal(profile.plainCount, 8)
	assert.equal(profile.taggedCount, 5)
})

test('the oversized finding carries the shape profile through the scan → checkOversized pipeline', () => {
	const d = mkCorpus()
	const raw = [
		'@frozen',
		'Feature: x',
		'',
		'  # ── First ──',
		'  Scenario: a\n    Given a\n    When b\n    Then c',
		'  Scenario: b\n    Given a\n    When b\n    Then c',
		'',
		'  # ---- Second ----',
		'  @rubric',
		'  Scenario: c\n    Given a\n    When b\n    Then c',
		'  Scenario: d\n    Given a\n    When b\n    Then c',
		'',
	].join('\n')
	seedNode(d, 'corpus', 'shaped', { specType: 'behavioral', concept: 'spec-structure', raw })
	const oversized = checkOversized(scanProjectSpec(d), 3)
	assert.equal(oversized.length, 1)
	assert.match(oversized[0].detail, /plain 3/)
	assert.match(oversized[0].detail, /tagged 1/)
	assert.match(oversized[0].detail, /clusters 2/)
})

test('section clusters are counted across both comment header styles', () => {
	const raw = [
		'@frozen',
		'Feature: x',
		'',
		'  # ── Audit ──',
		'',
		'  Scenario: a',
		'    Given a',
		'',
		'  # ---- Classification ----',
		'',
		'  Scenario: b',
		'    Given a',
	].join('\n')
	assert.equal(profileFeature(raw).clusterCount, 2)
})

test('a suite with no section headers reports zero clusters', () => {
	let raw = '@frozen\nFeature: x\n'
	for (let i = 0; i < 3; i++) raw += `\n  Scenario: s${i}\n    Given a\n    When b\n    Then c\n`
	assert.equal(profileFeature(raw).clusterCount, 0)
})

test('the oversized finding prescribes no route', () => {
	const d = mkCorpus()
	let raw = '@frozen\nFeature: x\n\n  # ── Section ──\n'
	for (let i = 0; i < 12; i++) raw += `\n  Scenario: s${i}\n    Given a\n    When b\n    Then c\n`
	seedNode(d, 'corpus', 'big', { specType: 'behavioral', concept: 'spec-structure', raw })
	const oversized = checkOversized(scanProjectSpec(d), 10)
	assert.equal(oversized.length, 1)
	assert.doesNotMatch(oversized[0].detail, /\b(split|down-?level|redesign)\b/i)
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

test('a project spec with no root glossary.md reports the advisory missing-glossary finding', () => {
	const d = mkCorpus()
	const findings = checkGlossary(d)
	assert.equal(findings.length, 1)
	assert.equal(findings[0]?.kind, 'missing-glossary')
	assert.equal(findings[0]?.severity, 'advisory')
})

test('a project spec carrying a root glossary.md reports nothing', () => {
	const d = mkCorpus()
	writeFileSync(join(d, 'glossary.md'), '# glossary\n')
	assert.deepEqual(checkGlossary(d), [])
})

test('a glossary FOLDER does not satisfy the check — the mandate is a root file', () => {
	const d = mkCorpus()
	mkdirSync(join(d, 'glossary'), { recursive: true })
	writeFileSync(join(d, 'glossary', 'README.md'), '# glossary\n')
	assert.equal(checkGlossary(d).length, 1)
})

test('missing-glossary never blocks — audit stays non-blocking on it alone', () => {
	const d = mkCorpus()
	const findings = audit([], 40, d)
	assert.equal(findings.length, 1)
	assert.equal(hasBlocking(findings), false)
})
