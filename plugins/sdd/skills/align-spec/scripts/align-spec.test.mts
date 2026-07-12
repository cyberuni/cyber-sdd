import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { scanProjectSpec } from '../../check-spec-structure/scripts/check-spec-structure.mts'
import {
	appendScenario,
	detect,
	detectNarrowing,
	findFeaturePath,
	hasDrift,
	main,
	selectNodes,
	splitFrontmatter,
	trimProse,
} from './align-spec.mts'

// ─── real git-repo fixture helper (mirrors spec-gate/classify-edit-class.test.mts) ───────────
// The scenario-diff claim is a claim about a real gherkin-cli + git interaction, not about
// internal plumbing, so these fixtures are real temp git repos.

function git(cwd: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function initRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), 'align-spec-'))
	git(dir, 'init', '-q')
	git(dir, 'config', 'user.email', 'test@example.com')
	git(dir, 'config', 'user.name', 'test')
	return dir
}

function commitAll(dir: string, message: string): void {
	git(dir, 'add', '-A')
	git(dir, 'commit', '-q', '-m', message)
}

function seedNode(
	repoDir: string,
	specDir: string,
	name: string,
	opts: { concept?: string; readme?: string; feature?: string },
): void {
	const nodeDir = join(repoDir, specDir, name)
	mkdirSync(nodeDir, { recursive: true })
	const fm = opts.concept ? `---\nconcept: ${opts.concept}\n---\n\n` : ''
	writeFileSync(join(nodeDir, 'README.md'), opts.readme ?? `${fm}# ${name}\n\nsome prose\n`)
	if (opts.feature) writeFileSync(join(nodeDir, `${name}.feature`), opts.feature)
}

function listFiles(dir: string): string[] {
	const out: string[] = []
	for (const e of readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (e.isFile()) out.push(join(e.parentPath, e.name))
	}
	return out.sort()
}

const FROZEN_BASELINE = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'    Then beta holds',
].join('\n')

const PURE_NARROWING = [
	'@frozen',
	'Feature: sample',
	'',
	'  Scenario: alpha',
	'    Given a precondition',
	'    When the event fires',
	'    Then alpha holds',
	'',
	'  Scenario: beta',
	'    Given another precondition',
	'    When another event fires',
	'    Then beta sometimes holds',
].join('\n')

// ── 1. a scenario-diff flags a narrowing of the frozen suite → Clearance ──

test('a scenario-diff flags a narrowing of the frozen suite as a Clearance finding', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		commitAll(dir, 'baseline')
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: PURE_NARROWING })

		const records = scanProjectSpec(join(dir, 'specs'))
		const node = records.find((r) => r.display.includes('sample'))
		assert.ok(node, 'the seeded node is discovered')
		const findings = detectNarrowing(node!, join(dir, 'specs'), 'HEAD', dir)

		assert.equal(findings.length, 1)
		assert.equal(findings[0].kind, 'narrowing')
		assert.equal(findings[0].severity, 'clearance')
		assert.match(findings[0].detail, /Clearance/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an unnarrowed frozen node reports no drift', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		commitAll(dir, 'baseline')
		// No change since baseline.

		const records = scanProjectSpec(join(dir, 'specs'))
		const node = records.find((r) => r.display.includes('sample'))
		const findings = detectNarrowing(node!, join(dir, 'specs'), 'HEAD', dir)
		assert.deepEqual(findings, [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── 2 & 3. check mode exit code + write boundary ──

test('check mode exits non-zero on drift and writes nothing', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		commitAll(dir, 'baseline')
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: PURE_NARROWING })
		commitAll(dir, 'narrow it') // commit so the node's own README write isn't itself "drift" in the fs

		const before = listFiles(dir)
		const checkCode = main(['--spec-dir', join(dir, 'specs'), '--base', 'HEAD~1', '--check'])
		assert.equal(checkCode, 1)
		assert.deepEqual(listFiles(dir), before) // writes nothing
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('check mode exits zero when there is no drift', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		commitAll(dir, 'baseline')

		const code = main(['--spec-dir', join(dir, 'specs'), '--check'])
		assert.equal(code, 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── 4. detect runs over every node of the project spec (a chosen set) ──

test('detect reports drift per node across exactly the chosen set', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		seedNode(dir, 'specs', 'other', { concept: 'x', feature: FROZEN_BASELINE.replace('sample', 'other') })
		commitAll(dir, 'baseline')
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: PURE_NARROWING })
		seedNode(dir, 'specs', 'other', { concept: 'x', feature: PURE_NARROWING.replace('sample', 'other') })

		const specDir = join(dir, 'specs')
		const all = detect(scanProjectSpec(specDir), specDir, 'HEAD', dir)
		assert.equal(all.length, 2, 'both narrowed nodes are reported when no node set is chosen')

		const chosen = selectNodes(scanProjectSpec(specDir), ['sample'])
		assert.equal(chosen.length, 1)
		const scoped = detect(chosen, specDir, 'HEAD', dir)
		assert.equal(scoped.length, 1, 'only the chosen node is reported')
		assert.match(scoped[0].node, /sample/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('selectNodes with no set returns every discovered node', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'a', { concept: 'x' })
		seedNode(dir, 'specs', 'b', { concept: 'x' })
		const specDir = join(dir, 'specs')
		assert.equal(selectNodes(scanProjectSpec(specDir)).length, 2)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('findFeaturePath locates the sibling .feature file, or null when absent', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		seedNode(dir, 'specs', 'prose-only', { concept: 'x' })
		const specDir = join(dir, 'specs')
		const records = scanProjectSpec(specDir)
		const sample = records.find((r) => r.display.includes('sample'))!
		const proseOnly = records.find((r) => r.display.includes('prose-only'))!
		assert.match(findFeaturePath(specDir, sample) ?? '', /sample\.feature$/)
		assert.equal(findFeaturePath(specDir, proseOnly), null)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('hasDrift distinguishes an empty finding set from a populated one', () => {
	assert.equal(hasDrift([]), false)
	assert.equal(hasDrift([{ kind: 'narrowing', severity: 'clearance', node: 'x', detail: 'd' }]), true)
})

// ── 5. reconcile never writes lifecycle state — the write primitives structurally cannot ──

test('trimProse only ever touches the README body, never the frontmatter', () => {
	const readme = '---\nstatus: approved\nconcept: x\n---\n\n# Node\n\nkeep this. drop this out-of-scope claim.\n'
	const result = trimProse(readme, 'drop this out-of-scope claim.')
	const { frontmatter } = splitFrontmatter(result)
	assert.equal(frontmatter, '---\nstatus: approved\nconcept: x\n---\n\n')
	assert.doesNotMatch(result, /drop this out-of-scope claim\./)
	assert.match(result, /keep this\./)
})

test('splitFrontmatter separates lifecycle frontmatter from prose body', () => {
	const { frontmatter, body } = splitFrontmatter('---\nstatus: draft\napproval: null\n---\n\nbody text\n')
	assert.match(frontmatter, /status: draft/)
	assert.match(frontmatter, /approval: null/)
	assert.equal(body, 'body text\n')
})

test('splitFrontmatter on a document with no frontmatter returns it whole as body', () => {
	const { frontmatter, body } = splitFrontmatter('# Just a feature file\nno frontmatter here\n')
	assert.equal(frontmatter, '')
	assert.equal(body, '# Just a feature file\nno frontmatter here\n')
})

test('appendScenario only appends a whole scenario block, leaving existing scenarios byte-identical', () => {
	const result = appendScenario(FROZEN_BASELINE, '  Scenario: gamma\n    Given g\n    When h\n    Then i')
	assert.match(result, /Scenario: alpha/)
	assert.match(result, /Scenario: beta/)
	assert.match(result, /Scenario: gamma/)
	// The original text up to its trailing whitespace is preserved verbatim (a true append).
	assert.equal(result.startsWith(FROZEN_BASELINE.replace(/\s+$/, '')), true)
})

test('the write primitives never accept or touch a status/approval/freeze field', () => {
	// Structural guarantee: trimProse/appendScenario operate on strings the caller supplies (a
	// README body sans frontmatter, or a .feature's scenario text) — neither function's
	// signature nor implementation references a lifecycle key, so there is no code path from
	// either primitive to a status/approval/freeze write.
	const src = trimProse.toString() + appendScenario.toString()
	assert.doesNotMatch(src, /\bstatus\b/)
	assert.doesNotMatch(src, /\bapproval\b/)
	assert.doesNotMatch(src, /\bfreeze\b/)
})

test('running detect (audit mode) writes no files to disk', () => {
	const dir = initRepo()
	try {
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: FROZEN_BASELINE })
		commitAll(dir, 'baseline')
		seedNode(dir, 'specs', 'sample', { concept: 'x', feature: PURE_NARROWING })

		const before = listFiles(dir)
		main(['--spec-dir', join(dir, 'specs'), '--format', 'json'])
		assert.deepEqual(listFiles(dir), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
