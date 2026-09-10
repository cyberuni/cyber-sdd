import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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

function snapshot(dir: string): [string, string][] {
	const walk = (d: string, base: string): [string, string][] =>
		readdirSync(d, { withFileTypes: true }).flatMap((e) =>
			e.isDirectory()
				? walk(join(d, e.name), `${base}${e.name}/`)
				: ([[`${base}${e.name}`, readFileSync(join(d, e.name), 'utf8')]] as [string, string][]),
		)
	return walk(dir, '').sort((a, b) => a[0].localeCompare(b[0]))
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

test('main emits a suggestion and modifies no file under the spec directory', () => {
	const dir = mkCorpus()
	try {
		seed(dir, 'mission/resolution/README.md', 'spec-type: behavioral\nconcept: resolution')
		const before = snapshot(dir)

		const out: string[] = []
		const write = process.stdout.write.bind(process.stdout)
		process.stdout.write = ((chunk: string) => {
			out.push(String(chunk))
			return true
		}) as typeof process.stdout.write
		let code: number
		try {
			code = main(['--spec-dir', dir, '--concept', 'resolution', '--name', 'leash'])
		} finally {
			process.stdout.write = write
		}

		assert.equal(code, 0)
		assert.match(out.join(''), /homes\[1\]/)
		assert.deepEqual(snapshot(dir), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
