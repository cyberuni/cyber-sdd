import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	type Candidate,
	detect,
	hasBlocking,
	main,
	normalize,
	parseFeature,
	scanSuites,
} from './check-scenario-overlap.mts'

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'check-scenario-overlap-'))
}

// Seed a node folder <cap>/<name>/ with a README (spec-type/concept) + a <name>.feature holding `raw`.
function seedNode(dir: string, cap: string, name: string, raw: string): void {
	const nodeDir = join(dir, cap, name)
	mkdirSync(nodeDir, { recursive: true })
	writeFileSync(join(nodeDir, 'README.md'), '---\nspec-type: behavioral\nconcept: x\n---\n')
	writeFileSync(join(nodeDir, `${name}.feature`), raw)
}

const MAIL_DELIVERED = `Feature: A
  Scenario: mail is delivered
    Given a message
    When it is sent
    Then it arrives
`
// same steps, different title/whitespace/case — same fingerprint
const MAIL_DELIVERED_VARIANT = `Feature: B
  Scenario: delivery works
    Given   a Message
    When It Is  SENT
    Then it arrives
`

function fpOf(raw: string): string {
	return parseFeature(raw)[0].fingerprint
}

// ── Detect cross-node overlap (deterministic) ──

test('same step fingerprint across two nodes → exact-duplicate naming both nodes and the scenario', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', MAIL_DELIVERED_VARIANT)
	const c = detect(scanSuites(dir))
	const dup = c.find((x) => x.kind === 'exact-duplicate')
	assert.ok(dup, 'an exact-duplicate candidate is emitted')
	assert.deepEqual([...dup!.nodes].sort(), ['cap/nodeA/', 'cap/nodeB/'])
	assert.equal(dup!.scenario, 'mail is delivered')
})

test('no shared step fingerprint → no candidate', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: something else\n    Given p\n    Then q\n')
	assert.equal(detect(scanSuites(dir)).length, 0)
})

test('same title, differing steps across two nodes → title-overlap naming both nodes and the scenario', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', 'Feature: A\n  Scenario: shared title\n    Given a\n    Then b\n')
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: shared title\n    Given c\n    Then d\n')
	const c = detect(scanSuites(dir))
	const to = c.find((x) => x.kind === 'title-overlap')
	assert.ok(to, 'a title-overlap candidate is emitted')
	assert.deepEqual([...to!.nodes].sort(), ['cap/nodeA/', 'cap/nodeB/'])
	assert.equal(to!.scenario, 'shared title')
})

test('a scenario duplicated within a single node raises no cross-node candidate', () => {
	const dir = mkCorpus()
	seedNode(
		dir,
		'cap',
		'nodeA',
		'Feature: A\n  Scenario: dup\n    Given a\n    Then b\n\n  Scenario: dup\n    Given a\n    Then b\n',
	)
	assert.equal(detect(scanSuites(dir)).length, 0)
})

test('a scenario appearing once across the corpus raises no candidate', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: unique\n    Given z\n    Then w\n')
	assert.equal(detect(scanSuites(dir)).length, 0)
})

test('a project-spec with no cross-node overlap produces no candidates', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', 'Feature: A\n  Scenario: a1\n    Given a\n    Then b\n')
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: b1\n    Given c\n    Then d\n')
	assert.deepEqual(detect(scanSuites(dir)), [])
})

// ── The step fingerprint — behavior-shaped, not cosmetic ──

test('the fingerprint is computed from step bodies only (title/tags/comments differ)', () => {
	const a = fpOf('Feature: A\n  @tagx\n  Scenario: title one\n    # a comment\n    Given a\n    Then b\n')
	const b = fpOf('Feature: B\n  Scenario: totally different title\n    Given a\n    Then b\n')
	assert.equal(a, b)
})

test('the fingerprint normalizes whitespace and case', () => {
	assert.equal(fpOf(MAIL_DELIVERED), fpOf(MAIL_DELIVERED_VARIANT))
})

test('step order is part of the fingerprint', () => {
	const a = fpOf('Feature: A\n  Scenario: s\n    Given a\n    Then b\n')
	const b = fpOf('Feature: B\n  Scenario: s\n    Then b\n    Given a\n')
	assert.notEqual(a, b)
})

// ── Severity & check mode (CI) ──

test('an exact-duplicate is blocking; a title-overlap is advisory', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', MAIL_DELIVERED_VARIANT)
	seedNode(dir, 'cap', 'nodeC', 'Feature: C\n  Scenario: shared title\n    Given q\n    Then r\n')
	seedNode(dir, 'cap', 'nodeD', 'Feature: D\n  Scenario: shared title\n    Given x\n    Then y\n')
	const c: Candidate[] = detect(scanSuites(dir))
	assert.equal(c.find((x) => x.kind === 'exact-duplicate')?.severity, 'blocking')
	assert.equal(c.find((x) => x.kind === 'title-overlap')?.severity, 'advisory')
})

test('check mode exits non-zero on an exact-duplicate', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', MAIL_DELIVERED_VARIANT)
	assert.equal(main(['--spec-dir', dir, '--check']), 1)
})

test('check mode exits zero when only title-overlap advisories exist', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', 'Feature: A\n  Scenario: shared\n    Given a\n    Then b\n')
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: shared\n    Given c\n    Then d\n')
	assert.equal(main(['--spec-dir', dir, '--check']), 0)
})

test('check mode exits zero on a project-spec with no overlap', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', 'Feature: A\n  Scenario: a1\n    Given a\n    Then b\n')
	assert.equal(main(['--spec-dir', dir, '--check']), 0)
})

// ── The write boundary + hasBlocking ──

test('hasBlocking reflects an exact-duplicate presence', () => {
	assert.equal(hasBlocking([{ kind: 'exact-duplicate', severity: 'blocking' } as Candidate]), true)
	assert.equal(hasBlocking([{ kind: 'title-overlap', severity: 'advisory' } as Candidate]), false)
})

test('no title or prose difference suppresses an exact-duplicate candidate', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', 'Feature: A\n  Scenario: alpha title\n    Given a\n    When b\n    Then c\n')
	seedNode(dir, 'cap', 'nodeB', 'Feature: B\n  Scenario: beta title\n    Given a\n    When b\n    Then c\n')
	const c = detect(scanSuites(dir))
	assert.equal(c.filter((x) => x.kind === 'exact-duplicate').length, 1)
})

test('normalize collapses whitespace and lowercases', () => {
	assert.equal(normalize('  Foo   BAR  '), 'foo bar')
})

// ── Scenario Outline: the Examples table reaches the fingerprint (#304 step 1) ──

const CANONICAL_OUTLINE = (title: string, examples: [string, string][]) => `Feature: F
  Scenario Outline: ${title}
    Given a user query "<query>"
    When cyberspace routes the request
    Then invocation is "<should_trigger>"

    Examples:
      | query | should_trigger |
${examples.map(([q, s]) => `      | ${q} | ${s} |`).join('\n')}
`

test('two outlines with identical steps but DIFFERING Examples rows are not an exact-duplicate', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'mechanic', CANONICAL_OUTLINE('mechanic', [['tune this agent so it uses opus', 'yes']]))
	seedNode(
		dir,
		'cap',
		'operator',
		CANONICAL_OUTLINE('operator', [['stand up the first ship so an agent can start on this project', 'yes']]),
	)
	const c = detect(scanSuites(dir))
	assert.equal(
		c.filter((x) => x.kind === 'exact-duplicate').length,
		0,
		'byte-identical steps alone must not fingerprint two different outlines as duplicates',
	)
})

test('two outlines with identical steps AND identical Examples rows are still caught as exact-duplicate', () => {
	const dir = mkCorpus()
	const rows: [string, string][] = [['tune this agent so it uses opus', 'yes']]
	seedNode(dir, 'cap', 'nodeA', CANONICAL_OUTLINE('nodeA outline', rows))
	seedNode(dir, 'cap', 'nodeB', CANONICAL_OUTLINE('nodeB outline', rows))
	const c = detect(scanSuites(dir))
	const dup = c.find((x) => x.kind === 'exact-duplicate')
	assert.ok(dup, 'identical steps + identical Examples rows is a real cross-node duplicate')
	assert.deepEqual([...dup!.nodes].sort(), ['cap/nodeA/', 'cap/nodeB/'])
})

test('an Examples row differing only in whitespace/case still fingerprints as identical', () => {
	const a = fpOf(CANONICAL_OUTLINE('a', [['some Query', 'YES']]))
	const b = fpOf(CANONICAL_OUTLINE('b', [['  some   query  ', 'yes']]))
	assert.equal(a, b)
})

test('a plain Scenario duplicate is still caught (no Examples table involved)', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', MAIL_DELIVERED_VARIANT)
	const c = detect(scanSuites(dir))
	assert.ok(c.some((x) => x.kind === 'exact-duplicate'))
})

// Guards frozen scenarios #12/#16 ("writes no artifact" / "writes no file") two ways:
// (1) static — the engine imports no fs WRITE API (a stray write mutation would have to add one);
// (2) behavioral — the spec dir is byte-identical after audit + check over a colliding corpus.
function snapshotDir(dir: string): Record<string, string> {
	const out: Record<string, string> = {}
	const walk = (d: string) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const full = join(d, e.name)
			if (e.isDirectory()) walk(full)
			else out[full] = readFileSync(full, 'utf8')
		}
	}
	walk(dir)
	return out
}

test('the engine imports no fs write API (static write-boundary guard)', () => {
	const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'check-scenario-overlap.mts'), 'utf8')
	for (const api of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'writeSync']) {
		assert.ok(!src.includes(api), `engine must not reference fs.${api}`)
	}
})

test('audit and check leave the spec dir byte-identical (behavioral write-boundary guard)', () => {
	const dir = mkCorpus()
	seedNode(dir, 'cap', 'nodeA', MAIL_DELIVERED)
	seedNode(dir, 'cap', 'nodeB', MAIL_DELIVERED_VARIANT)
	const before = snapshotDir(dir)
	main(['--spec-dir', dir]) // audit mode
	main(['--spec-dir', dir, '--check']) // check mode (exact-duplicate present)
	assert.deepEqual(snapshotDir(dir), before)
})
