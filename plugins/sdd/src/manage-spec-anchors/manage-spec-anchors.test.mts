import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	addAnchor,
	editAnchor,
	FIXED_ANCHORS,
	inducePatterns,
	isFixedConvention,
	isValidPattern,
	listAnchors,
	main,
	parseAnchorsToml,
	previewPattern,
	readCustomAnchors,
	removeAnchor,
	serializeAnchors,
} from './manage-spec-anchors.mts'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'spec-anchors-'))
}

function seedSpec(dir: string, rel: string, status = 'draft'): void {
	const full = join(dir, rel)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `---\nstatus: ${status}\n---\n\n# body\n`)
}

function seedConfig(dir: string, patterns: string[]): void {
	const full = join(dir, '.agents/sdd/spec-anchors.toml')
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, serializeAnchors(patterns))
}

// ── the config format ──

test('parseAnchorsToml reads the anchors array; absent array yields []', () => {
	assert.deepEqual(parseAnchorsToml('anchors = [\n  "source",\n  "a/<project>",\n]\n'), ['source', 'a/<project>'])
	assert.deepEqual(parseAnchorsToml('# nothing here\n'), [])
})

test('readCustomAnchors yields [] when there is no config file', () => {
	const dir = tmp()
	try {
		assert.deepEqual(readCustomAnchors(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── list ──

test('list shows the three fixed anchors each with an explanation', () => {
	const dir = tmp()
	try {
		const fixed = listAnchors(dir).filter((a) => a.kind === 'fixed')
		assert.equal(fixed.length, 3)
		assert.equal(fixed.length, FIXED_ANCHORS.length)
		assert.ok(fixed.every((a) => a.explanation.length > 0))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('list shows the custom anchors from the config alongside the fixed ones', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['source', 'x/<project>'])
		const all = listAnchors(dir)
		assert.deepEqual(
			all.filter((a) => a.kind === 'custom').map((a) => a.pattern),
			['source', 'x/<project>'],
		)
		assert.equal(all.filter((a) => a.kind === 'fixed').length, 3)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── CRUD ──

test('add writes a new custom anchor to the config', () => {
	const dir = tmp()
	try {
		seedConfig(dir, [])
		const r = addAnchor(dir, 'source')
		assert.ok(r.ok && r.changed)
		assert.deepEqual(readCustomAnchors(dir), ['source'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add creates the config file when none exists', () => {
	const dir = tmp()
	try {
		assert.equal(existsSync(join(dir, '.agents/sdd/spec-anchors.toml')), false)
		assert.ok(addAnchor(dir, 'source').ok)
		assert.ok(existsSync(join(dir, '.agents/sdd/spec-anchors.toml')))
		assert.deepEqual(readCustomAnchors(dir), ['source'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('remove deletes a custom anchor from the config', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['source', 'keep'])
		assert.ok(removeAnchor(dir, 'source').ok)
		assert.deepEqual(readCustomAnchors(dir), ['keep'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('edit replaces one custom anchor pattern with another', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['old/<project>'])
		assert.ok(editAnchor(dir, 'old/<project>', 'new/<project>').ok)
		assert.deepEqual(readCustomAnchors(dir), ['new/<project>'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a fixed convention cannot be added, edited, or removed as a custom anchor', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['source'])
		assert.equal(addAnchor(dir, '.agents/spec').ok, false)
		assert.equal(addAnchor(dir, '.agents/specs/<project>').ok, false)
		assert.equal(editAnchor(dir, 'source', '.agents/spec').ok, false)
		assert.ok(isFixedConvention('pkg/.agents/spec'))
		assert.deepEqual(readCustomAnchors(dir), ['source']) // unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('adding an invalid pattern is rejected before it is persisted', () => {
	const dir = tmp()
	try {
		seedConfig(dir, [])
		assert.equal(isValidPattern('../escape'), false)
		assert.equal(addAnchor(dir, '../escape').ok, false)
		assert.equal(addAnchor(dir, '/absolute').ok, false)
		assert.equal(addAnchor(dir, 'a/<bogus>/b').ok, false)
		assert.deepEqual(readCustomAnchors(dir), []) // config unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('removing an anchor absent from the config changes nothing', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['keep'])
		const before = readFileSync(join(dir, '.agents/sdd/spec-anchors.toml'), 'utf8')
		const r = removeAnchor(dir, 'not-there')
		assert.ok(r.ok && !r.changed)
		assert.equal(readFileSync(join(dir, '.agents/sdd/spec-anchors.toml'), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('editing a custom anchor to a malformed pattern is rejected and the config is unchanged', () => {
	const dir = tmp()
	try {
		seedConfig(dir, ['good'])
		assert.equal(editAnchor(dir, 'good', '../bad').ok, false)
		assert.deepEqual(readCustomAnchors(dir), ['good'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── induce ──

test('induce offers a literal directory candidate and a <project> generalization', () => {
	const dir = tmp()
	try {
		mkdirSync(join(dir, 'curriculum/web/react/s-01'), { recursive: true })
		const r = inducePatterns(dir, 'curriculum/web/react/s-01')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.candidates, ['curriculum/web/react/s-01', 'curriculum/web/react/<project>'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('induce rejects a sample path that does not resolve inside the repo', () => {
	const dir = tmp()
	try {
		assert.equal(inducePatterns(dir, 'does/not/exist').ok, false)
		assert.equal(inducePatterns(dir, '../outside').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── preview ──

test('preview lists the projects a candidate pattern would discover', () => {
	const dir = tmp()
	try {
		seedSpec(dir, 'curriculum/web/s-01/spec.md')
		seedSpec(dir, 'curriculum/api/s-02/spec.md')
		const r = previewPattern(dir, 'curriculum/*/<project>')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches.map((m) => [m.path, m.name]), [
			['curriculum/api/s-02', 's-02'],
			['curriculum/web/s-01', 's-01'],
		])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview does not persist the candidate pattern', () => {
	const dir = tmp()
	try {
		seedSpec(dir, 'source/spec.md')
		previewPattern(dir, 'source')
		assert.equal(existsSync(join(dir, '.agents/sdd/spec-anchors.toml')), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview of a pattern that matches no spec reports an empty match', () => {
	const dir = tmp()
	try {
		const r = previewPattern(dir, 'nowhere/<project>')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches, [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview only counts a dir that holds a status-bearing spec.md', () => {
	const dir = tmp()
	try {
		seedSpec(dir, 'a/real/spec.md', 'approved')
		mkdirSync(join(dir, 'a/empty'), { recursive: true }) // no spec.md
		mkdirSync(join(dir, 'a/nostatus'), { recursive: true })
		writeFileSync(join(dir, 'a/nostatus/spec.md'), '---\ntitle: x\n---\n') // no lifecycle status
		const r = previewPattern(dir, 'a/<project>')
		assert.deepEqual(r.ok && r.matches.map((m) => m.path), ['a/real'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview: a ** segment globs zero or more levels, at any depth', () => {
	const dir = tmp()
	try {
		seedSpec(dir, 'archive/spec.md') // ** matches zero levels here
		seedSpec(dir, 'archive/2024/q1/spec.md')
		seedSpec(dir, 'archive/2024/q2/deep/spec.md')
		seedSpec(dir, 'other/spec.md') // outside the anchor root — must not match
		const r = previewPattern(dir, 'archive/**')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.matches.map((m) => m.path), ['archive', 'archive/2024/q1', 'archive/2024/q2/deep'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('isValidPattern accepts a ** segment', () => {
	assert.equal(isValidPattern('archive/**'), true)
	assert.equal(isValidPattern('archive/**/<project>'), true)
})

test('preview rejects a malformed candidate pattern', () => {
	const dir = tmp()
	try {
		assert.equal(previewPattern(dir, '../bad').ok, false)
		assert.equal(previewPattern(dir, 'a/<bogus>').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── boundary: curation writes ONLY the config ──

// Snapshot every file under dir (relative paths).
function snapshot(dir: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
			const child = rel ? `${rel}/${e.name}` : e.name
			if (e.isDirectory()) walk(child)
			else out.push(child)
		}
	}
	walk('')
	return out.sort()
}

test('curation writes only .agents/sdd/spec-anchors.toml — no other file is touched', () => {
	const dir = tmp()
	try {
		seedSpec(dir, 'source/spec.md') // a pre-existing, unrelated file
		const before = snapshot(dir).filter((f) => f !== '.agents/sdd/spec-anchors.toml')
		addAnchor(dir, 'source')
		editAnchor(dir, 'source', 'source2')
		removeAnchor(dir, 'source2')
		previewPattern(dir, 'source')
		inducePatterns(dir, 'source')
		const after = snapshot(dir).filter((f) => f !== '.agents/sdd/spec-anchors.toml')
		assert.deepEqual(after, before) // every non-config file is untouched
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── main (CLI) ──

function captureMain(argv: string[]): { code: number; out: string } {
	const writes: string[] = []
	const original = process.stdout.write
	process.stdout.write = ((chunk: string) => {
		writes.push(String(chunk))
		return true
	}) as typeof process.stdout.write
	try {
		return { code: main(argv), out: writes.join('') }
	} finally {
		process.stdout.write = original
	}
}

test('main --list prints the fixed anchors and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--list'])
		assert.equal(code, 0)
		assert.match(out, /\[fixed\] \.agents\/spec\//)
		assert.match(out, /\[fixed\] \.agents\/specs\/<project>\//)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --add persists a valid anchor (0) and refuses an invalid one (1)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--add', 'source']).code, 0)
		assert.deepEqual(readCustomAnchors(dir), ['source'])
		assert.equal(captureMain(['--root', dir, '--add', '../escape']).code, 1)
		assert.deepEqual(readCustomAnchors(dir), ['source']) // unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --preview reports the empty match and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--preview', 'nowhere/<project>'])
		assert.equal(code, 0)
		assert.match(out, /matches no project/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
