import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	addRule,
	inducePatterns,
	isRuleLine,
	isValidPattern,
	listRules,
	main,
	matchesPattern,
	previewPattern,
	readIgnoreLines,
	removeRule,
	splitLines,
} from './manage-ignore.mts'

const IGNORE_FILE = '.agents/sdd/.sddignore'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'manage-ignore-'))
}

function seedIgnore(dir: string, lines: string[]): void {
	const full = join(dir, IGNORE_FILE)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `${lines.join('\n')}\n`)
}

function seedFile(dir: string, rel: string): void {
	const full = join(dir, rel)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, 'x')
}

// ── list ──

test('list reports every rule in file order (including a !re-track rule)', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['# a comment', 'build/', '', '*.log', '!keep.log'])
		assert.deepEqual(listRules(dir), ['build/', '*.log', '!keep.log'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('list a missing .sddignore reports nothing without error', () => {
	const dir = tmp()
	try {
		assert.deepEqual(readIgnoreLines(dir), [])
		assert.deepEqual(listRules(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── add / remove (CRUD) ──

test('add appends a well-formed rule', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['build/'])
		const r = addRule(dir, '*.log')
		assert.ok(r.ok && r.changed)
		assert.deepEqual(listRules(dir), ['build/', '*.log'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add creates the ignore file when absent', () => {
	const dir = tmp()
	try {
		assert.equal(existsSync(join(dir, IGNORE_FILE)), false)
		assert.ok(addRule(dir, 'build/').ok)
		assert.ok(existsSync(join(dir, IGNORE_FILE)))
		assert.deepEqual(listRules(dir), ['build/'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add preserves existing rule order — the new rule lands after the existing ones', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['a/', 'b/', 'c/'])
		addRule(dir, 'd/')
		assert.deepEqual(listRules(dir), ['a/', 'b/', 'c/', 'd/'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('add refuses a malformed pattern and leaves .sddignore unchanged', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['keep/'])
		const before = readFileSync(join(dir, IGNORE_FILE), 'utf8')
		assert.equal(isValidPattern(''), false)
		assert.equal(isValidPattern('   '), false)
		assert.equal(isValidPattern('!'), false)
		assert.equal(isValidPattern('foo['), false)
		assert.equal(addRule(dir, '').ok, false)
		assert.equal(addRule(dir, 'foo[').ok, false)
		assert.equal(readFileSync(join(dir, IGNORE_FILE), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('remove drops a present rule and the others keep their order', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['a/', 'b/', 'c/'])
		assert.ok(removeRule(dir, 'b/').ok)
		assert.deepEqual(listRules(dir), ['a/', 'c/'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('remove an absent rule is a no-op — the file is byte-for-byte unchanged', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['a/', 'b/'])
		const before = readFileSync(join(dir, IGNORE_FILE), 'utf8')
		const r = removeRule(dir, 'not-there/')
		assert.ok(r.ok && !r.changed)
		assert.equal(readFileSync(join(dir, IGNORE_FILE), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('CRUD preserves comments and blank lines in the raw file', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['# header', 'a/', '', 'b/'])
		addRule(dir, 'c/')
		removeRule(dir, 'a/')
		assert.deepEqual(splitLines(readFileSync(join(dir, IGNORE_FILE), 'utf8')), ['# header', '', 'b/', 'c/'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── induce ──

test('induce offers a literal-path candidate and a ** generalization; persists nothing', () => {
	const dir = tmp()
	try {
		const r = inducePatterns(dir, 'build/output/app.log')
		assert.ok(r.ok)
		assert.deepEqual(r.ok && r.candidates, ['build/output/app.log', '**/app.log'])
		assert.equal(existsSync(join(dir, IGNORE_FILE)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('induce refuses a path outside the repo', () => {
	const dir = tmp()
	try {
		assert.equal(inducePatterns(dir, '../outside').ok, false)
		assert.equal(inducePatterns(dir, '/abs/path').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── preview ──

test('preview lists the paths a pattern would ignore without saving', () => {
	const dir = tmp()
	try {
		seedFile(dir, 'a/x.log')
		seedFile(dir, 'b/y.log')
		seedFile(dir, 'b/keep.txt')
		const r = previewPattern(dir, '*.log')
		assert.ok(r.ok && !r.negated)
		assert.deepEqual(r.ok && r.matches, ['a/x.log', 'b/y.log'])
		assert.equal(existsSync(join(dir, IGNORE_FILE)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview shows a !rule re-tracking an already-ignored path; .sddignore unchanged', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['*.log'])
		seedFile(dir, 'logs/keep.log')
		const before = readFileSync(join(dir, IGNORE_FILE), 'utf8')
		const r = previewPattern(dir, '!keep.log')
		assert.ok(r.ok && r.negated)
		assert.deepEqual(r.ok && r.matches, ['logs/keep.log'])
		assert.equal(readFileSync(join(dir, IGNORE_FILE), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('preview refuses a malformed pattern', () => {
	const dir = tmp()
	try {
		assert.equal(previewPattern(dir, '').ok, false)
		assert.equal(previewPattern(dir, 'bad[').ok, false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── gitignore glob semantics ──

test('matchesPattern: ** spans separators, * stays within a segment', () => {
	assert.equal(matchesPattern('docs/**', 'docs/a/b.md'), true)
	assert.equal(matchesPattern('docs/**', 'other/a.md'), false)
	assert.equal(matchesPattern('*.log', 'app.log'), true)
	assert.equal(matchesPattern('*.log', 'nested/app.log'), true)
})

test('matchesPattern: a leading / anchors to the repo root', () => {
	assert.equal(matchesPattern('/root-only', 'root-only'), true)
	assert.equal(matchesPattern('/root-only', 'nested/root-only'), false)
})

test('matchesPattern: a plain dir name ignores the dir and its descendants', () => {
	assert.equal(matchesPattern('build/', 'build'), true)
	assert.equal(matchesPattern('build/', 'build/out.js'), true)
})

test('isRuleLine: blanks and # comments are not rules; !rules are', () => {
	assert.equal(isRuleLine(''), false)
	assert.equal(isRuleLine('   '), false)
	assert.equal(isRuleLine('# note'), false)
	assert.equal(isRuleLine('!keep.log'), true)
	assert.equal(isRuleLine('build/'), true)
})

// ── boundary: curation writes ONLY the ignore file ──

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

test('curation writes only .agents/sdd/.sddignore — no other file is touched', () => {
	const dir = tmp()
	try {
		seedFile(dir, 'src/app.log') // a pre-existing, unrelated file
		const before = snapshot(dir).filter((f) => f !== IGNORE_FILE)
		addRule(dir, '*.log')
		removeRule(dir, '*.log')
		previewPattern(dir, '*.log')
		inducePatterns(dir, 'src/app.log')
		const after = snapshot(dir).filter((f) => f !== IGNORE_FILE)
		assert.deepEqual(after, before)
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

test('main --list prints every rule in order and returns 0', () => {
	const dir = tmp()
	try {
		seedIgnore(dir, ['build/', '!keep.log'])
		const { code, out } = captureMain(['--root', dir, '--list'])
		assert.equal(code, 0)
		assert.equal(out, 'build/\n!keep.log\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --list on a missing file prints nothing and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--list'])
		assert.equal(code, 0)
		assert.equal(out, '')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --add persists a valid rule (0) and refuses a malformed one (1)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--add', '*.log']).code, 0)
		assert.deepEqual(listRules(dir), ['*.log'])
		assert.equal(captureMain(['--root', dir, '--add', 'bad[']).code, 1)
		assert.deepEqual(listRules(dir), ['*.log']) // unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --induce refuses an outside path (1) and offers candidates for a repo path (0)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--induce', '../outside']).code, 1)
		const { code, out } = captureMain(['--root', dir, '--induce', 'build/app.log'])
		assert.equal(code, 0)
		assert.match(out, /build\/app\.log/)
		assert.match(out, /\*\*\/app\.log/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --preview reports the no-match case and returns 0', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--preview', 'nowhere/*.log'])
		assert.equal(code, 0)
		assert.match(out, /would ignore no path/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --preview refuses a malformed pattern (1)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--preview', 'bad[']).code, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
