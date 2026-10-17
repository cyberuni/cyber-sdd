import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { findNear, main, parseConcepts, scanProjectSpec, suggestHomes } from './place-node.mts'

function seed(dir: string, relPath: string, frontmatter: string, body = '# body'): void {
	const full = join(dir, relPath)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `---\n${frontmatter}\n---\n\n${body}\n`)
}

function mkCorpus(): string {
	return mkdtempSync(join(tmpdir(), 'place-node-'))
}

test('parseConcepts reads scalar, flow, and block lists', () => {
	assert.deepEqual(parseConcepts('---\nconcept: resolution\n---\n'), ['resolution'])
	assert.deepEqual(parseConcepts('---\nconcept: [a, b]\n---\n'), ['a', 'b'])
	assert.deepEqual(parseConcepts('---\nconcept:\n  - a\n  - b\n---\n'), ['a', 'b'])
	assert.deepEqual(parseConcepts('# no frontmatter\n'), [])
})

test('suggestHomes returns the capabilities where the concept already lives', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'design/governance-resolution.md', 'concept: resolution')
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		const homes = suggestHomes(scanProjectSpec(dir), 'resolution')
		assert.deepEqual(homes.map((h) => h.capability).sort(), ['design', 'mission'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('suggestHomes ranks by facet count', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'common-governances/a/README.md', 'spec-type: reference\nconcept: governance')
		seed(dir, 'common-governances/b/README.md', 'spec-type: reference\nconcept: governance')
		seed(dir, 'common-governances/c/README.md', 'spec-type: reference\nconcept: governance')
		seed(dir, 'design/actors-governance.md', 'concept: governance')
		const homes = suggestHomes(scanProjectSpec(dir), 'governance')
		assert.equal(homes[0].capability, 'common-governances')
		assert.equal(homes[0].count, 3)
		assert.equal(homes[1].capability, 'design')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('suggestHomes returns nothing for a concept with no prior home', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		assert.deepEqual(suggestHomes(scanProjectSpec(dir), 'telemetry'), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('findNear surfaces an overlapping name and nothing for a unique one', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		const near = findNear(scanProjectSpec(dir), 'resolution')
		assert.equal(near.length, 1)
		assert.deepEqual(findNear(scanProjectSpec(dir), 'leash'), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main runs read-only and emits a suggestion', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		assert.equal(main(['--spec-dir', dir, '--concept', 'resolution', '--name', 'leash']), 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
