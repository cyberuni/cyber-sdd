import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	audit,
	extractReferences,
	type Finding,
	formatFindings,
	listMarkdownFiles,
	main,
	resolveReference,
	scanCodeSpans,
} from './check-spec-references.mts'

// ─── fixtures ─────────────────────────────────────────────────────────────────

function mkSpec(): string {
	return mkdtempSync(join(tmpdir(), 'check-spec-references-'))
}

/** Seed a file at a spec-relative path, creating its parents. */
function seed(root: string, rel: string, text: string): string {
	const p = join(root, rel)
	mkdirSync(dirname(p), { recursive: true })
	writeFileSync(p, text)
	return p
}

function refs(findings: Finding[]): string[] {
	return findings.map((f) => f.ref)
}

// ─── the two reference forms ──────────────────────────────────────────────────

test('a markdown link to a path that does not exist is reported', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/README.md', 'see [the sibling](./nope.md)\n')
		assert.deepEqual(refs(audit(root)), ['./nope.md'])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a markdown link to a path that exists is not reported', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/sibling.md', 'x\n')
		seed(root, 'a/README.md', 'see [the sibling](./sibling.md)\n')
		assert.deepEqual(refs(audit(root)), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('an inline-code path that does not exist is reported', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/README.md', 'the source is `../../src/foo.ts`\n')
		assert.deepEqual(refs(audit(root)), ['../../src/foo.ts'])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('an inline-code path that exists is not reported', () => {
	const root = mkSpec()
	try {
		seed(root, 'b/target.ts', 'x\n')
		seed(root, 'a/README.md', 'the source is `../b/target.ts`\n')
		assert.deepEqual(refs(audit(root)), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── resolution is against the file's own directory ───────────────────────────

test('a reference resolves against the directory of the file that carries it', () => {
	const root = mkSpec()
	try {
		// The same reference text from two depths. `../target.md` reaches the seeded file only
		// from `deep/node/`; from `shallow/` it resolves to the spec root and finds nothing.
		seed(root, 'deep/target.md', 'x\n')
		seed(root, 'deep/node/README.md', 'up to `../target.md`\n')
		seed(root, 'shallow/README.md', 'up to `../target.md`\n')
		const found = audit(root)
		assert.equal(found.length, 1)
		assert.equal(found[0]?.file, join(root, 'shallow/README.md'))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a reference one directory level short of its target is reported', () => {
	const root = mkSpec()
	try {
		// The driving case: the target exists, but one level further up than the reference reaches.
		// The node sits three levels down, so reaching the seeded file takes three `../`. The
		// reference carries two — the whole recurrence: right filename, right-looking depth,
		// one level short.
		seed(root, 'src/foo.ts', 'x\n')
		seed(root, 'cap/sub/node/README.md', 'source: `../../src/foo.ts`\n')
		const found = audit(root)
		assert.deepEqual(refs(found), ['../../src/foo.ts'])
		assert.equal(found[0]?.resolved, join(root, 'cap/src/foo.ts'))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the finding names the path the reference resolved to', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/README.md', 'source: `../../src/foo.ts`\n')
		const rendered = formatFindings(audit(root), root)
		assert.match(rendered, /`\.\.\/\.\.\/src\/foo\.ts`/) // the reference as written
		assert.match(rendered, /-> \.\.\/src\/foo\.ts/) // AND the path it resolved to
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── what is not a reference ──────────────────────────────────────────────────

test('a repo-root-relative path is not extracted', () => {
	// The trap: `.research/<topic>/` is legitimate and relative to the repo root. Requiring the
	// `./`-or-`../` prefix makes it pass by construction rather than by exception.
	const found = extractReferences('backed by `.research/agentic-configuration-standards/`\n')
	assert.deepEqual(found, [])
})

test('a URL is not extracted', () => {
	assert.deepEqual(extractReferences('see [the standard](https://agents.md/)\n'), [])
})

test('an absolute or home-relative path is not extracted', () => {
	assert.deepEqual(extractReferences('`/etc/hosts` and `~/.codex/config.toml`\n'), [])
})

test('a relative path inside a fenced code block is not extracted', () => {
	const text = ['before', '```bash', 'node `../../nope.mts`', '```', 'after `../../also-nope`'].join('\n')
	assert.deepEqual(
		extractReferences(text).map((r) => r.ref),
		['../../also-nope'],
	)
})

// ─── directories and fragments ────────────────────────────────────────────────

test('a reference resolving to a directory resolves', () => {
	const root = mkSpec()
	try {
		seed(root, 'b/keep.md', 'x\n')
		seed(root, 'a/README.md', 'the sibling `../b`\n')
		assert.deepEqual(refs(audit(root)), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a trailing slash on a directory reference is immaterial', () => {
	const root = mkSpec()
	try {
		seed(root, 'b/keep.md', 'x\n')
		seed(root, 'a/README.md', 'the sibling `../b/` and `../b`\n')
		assert.deepEqual(refs(audit(root)), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a heading fragment is stripped before the path is resolved', () => {
	const root = mkSpec()
	try {
		seed(root, 'b/doc.md', '# H\n')
		seed(root, 'a/README.md', 'see [H](../b/doc.md#h)\n')
		assert.deepEqual(refs(audit(root)), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── the suppression marker ───────────────────────────────────────────────────

test('a line carrying the ignore marker has none of its references extracted', () => {
	const text = 'the file holds the text `../.agents/skills` <!-- spec-ref-ignore: quoted content -->\n'
	assert.deepEqual(extractReferences(text), [])
})

test('a fence closes only on its own delimiter character, at its own length or longer', () => {
	// A bare in-fence toggle flips on any fence-shaped line. Then a reference genuinely inside a
	// fence gets extracted — and, worse, a fence-shaped line nested in another fence leaves the
	// parity inverted, so every genuinely broken reference AFTER the block is silently swallowed.
	const insideBacktickFence = ['```bash', 'echo hi', '~~~', '`../nope-inside.md`', '```'].join('\n')
	assert.deepEqual(extractReferences(insideBacktickFence), [])

	const afterTildeFence = ['~~~', 'example', '```', '~~~', '`../nope-outside.md`'].join('\n')
	assert.deepEqual(
		extractReferences(afterTildeFence).map((r) => r.ref),
		['../nope-outside.md'],
	)

	// a run of the same character CLOSES when it is at least as long as the opener...
	assert.deepEqual(
		extractReferences(['```', 'x', '`````', '`../after.md`'].join('\n')).map((r) => r.ref),
		['../after.md'],
	)
	// ...and does not when it is shorter
	assert.deepEqual(
		extractReferences(['`````', 'x', '```', '`../still-inside.md`', '`````', '`../out.md`'].join('\n')).map(
			(r) => r.ref,
		),
		['../out.md'],
	)
})

test('a code span carrying a path plus other text is prose, not a citation', () => {
	// "the span's WHOLE content is the path" means what it says. This also discriminates the
	// code-span closing rule: a scanner that closed on a LONGER run would split this span and
	// read the head as a reference the document never made.
	assert.deepEqual(extractReferences('a `../nope`` b` c\n'), [])
})

test('a code span that wraps across a line break is still one span', () => {
	// Prose here hard-wraps, so a long path in backticks landing across a line break is ordinary.
	// CommonMark folds the line ending to a space, so the span's content is still just the path;
	// a line-by-line scan would read two halves and report neither.
	assert.deepEqual(extractReferences('the source is ` ../ghost-wrapped\n` and more\n'), [
		{ line: 1, ref: '../ghost-wrapped' },
	])
	// the marker goes beside the line the span OPENS on — where a reader would put it
	assert.deepEqual(extractReferences('the source is ` ../ghost <!-- spec-ref-ignore: q -->\n` and more\n'), [])
})

test('a code span does not reach past a block boundary', () => {
	// Inline parsing happens within a block. Without this bound, one unclosed backtick left by a
	// typo pairs with the first backtick of the next block — swallowing the span about to open and
	// every reference after it in the flow. Whole-text scanning is what makes the bound necessary.
	for (const boundary of ['## Architecture', '- a list item', '> a quote', '---', '1. an item']) {
		const text = ['intro mentioning `pnpm test', boundary, 'See `../../src/engine.ts` for details.'].join('\n')
		assert.deepEqual(
			extractReferences(text).map((r) => r.ref),
			['../../src/engine.ts'],
			boundary,
		)
	}
})

test('a fenced block bounds a code span by the same rule', () => {
	assert.deepEqual(
		extractReferences(['a `open', '```', 'x', '```', 'see `../nope.md` here'].join('\n')).map((r) => r.ref),
		['../nope.md'],
	)
})

// a fenced block's blanked lines keep their length, so a finding after one still names its own line
test('a finding after a fenced block reports its own line number', () => {
	assert.deepEqual(extractReferences(['```', 'a long sample line', '```', '', 'see `../nope.md`'].join('\n')), [
		{ line: 5, ref: '../nope.md' },
	])
})

test('a code span does not cross a blank line', () => {
	// A blank line ends the paragraph, so the run never closes — the text after it is prose, and a
	// stray backtick two paragraphs up cannot reach forward to swallow it.
	assert.deepEqual(
		extractReferences('open ` here\n\nplain `../nope/x.md` text\n').map((r) => r.ref),
		['../nope/x.md'],
	)
})

test('a code span holding another code span is not a path', () => {
	// Its content still carries backticks, so it is not a path — the same rule, not an exception.
	// This is how a spec exhibits the reference form it specifies without firing on itself.
	assert.deepEqual(extractReferences('the form is `` `../nope` ``\n'), [])
})

test('a code span closes on a backtick run of its own length, not the first one it meets', () => {
	// `` a `b` ../nope `` is ONE span whose content carries backticks, so it is not a path. A
	// scanner that closed on the first backtick it met would split it and read the tail as a
	// reference — reporting something the document never cited.
	assert.deepEqual(extractReferences('the form is ``a `b` ../nope``\n'), [])
	assert.deepEqual(
		scanCodeSpans('the form is ``a `b` ../nope``').map((s) => s.content),
		['a `b` ../nope'],
	)
})

test('an unmatched backtick run does not suppress a later reference on the same line', () => {
	// An unmatched run is literal text and the scan resumes after it. Abandoning the rest of the
	// line would let one stray backtick silently swallow every reference after it — this engine's
	// own failure class wearing a different hat.
	assert.deepEqual(
		extractReferences('a stray `` run, then `../src/foo.ts` here.\n').map((r) => r.ref),
		['../src/foo.ts'],
	)
})

test('a marker quoted inside a code span does not suppress the line', () => {
	// The marker is read from outside the code spans, like everything else. Read from the raw line
	// it would fire on a line that merely QUOTES it — which is how this node documents it — and
	// that line's real references would vanish. An escape hatch a description of the escape hatch
	// can trigger hides exactly what this engine exists to find.
	assert.deepEqual(
		extractReferences('the marker is `<!-- spec-ref-ignore -->`, see [broken](../nope/file.md)\n').map((r) => r.ref),
		['../nope/file.md'],
	)
	// and the live marker still suppresses
	assert.deepEqual(extractReferences('see [broken](../nope/file.md) <!-- spec-ref-ignore: why -->\n'), [])
})

test('a link target is extracted whichever inline form carries it', () => {
	// The label form and the title change where the path is written, not what it points at.
	for (const line of [
		'[t](../nope/file.md)',
		'[t](../nope/file.md "a title")',
		"[t](../nope/file.md 'a title')",
		'[t](<../nope/file.md>)',
		'[1]: ../nope/file.md',
		'[1]: <../nope/file.md>',
		'[a [b]]: ../nope/file.md',
	]) {
		assert.deepEqual(
			extractReferences(`${line}\n`).map((r) => r.ref),
			['../nope/file.md'],
			line,
		)
	}
	// the angle-bracket form exists to carry a path with a space; it is not held to the
	// no-whitespace rule a bare target and a code span are
	assert.deepEqual(
		extractReferences('[t](<../no pe/file.md>)\n').map((r) => r.ref),
		['../no pe/file.md'],
	)
})

test('the ignore marker is matched as a complete comment, not as a prefix', () => {
	// A marker whose name merely starts with this one's must not inherit its power to hide a
	// reference.
	assert.deepEqual(
		extractReferences('`../nope` <!-- spec-ref-ignored-typo -->\n').map((r) => r.ref),
		['../nope'],
	)
	assert.deepEqual(extractReferences('`../nope` <!-- spec-ref-ignore -->\n'), [])
	assert.deepEqual(extractReferences('`../nope` <!-- spec-ref-ignore: a reason -->\n'), [])
})

test('a doubled-backtick span whose content is a bare path is still a reference', () => {
	// The complement, and the hole an unconditional doubled-span exclusion would have opened: a
	// genuinely broken reference does not escape by being written in double backticks.
	assert.deepEqual(
		extractReferences('the anchor is ``../nope``\n').map((r) => r.ref),
		['../nope'],
	)
})

test('a markdown link written inside a code span is markup on display, not a link', () => {
	assert.deepEqual(extractReferences('the link form is `](./nope)`\n'), [])
})

test('the marker suppresses only the line it appears on', () => {
	const text = ['quoted `../nope-one` <!-- spec-ref-ignore: why -->', 'anchored `../nope-two`'].join('\n')
	assert.deepEqual(
		extractReferences(text).map((r) => r.ref),
		['../nope-two'],
	)
})

// ─── modes ────────────────────────────────────────────────────────────────────

test('an unresolved reference exits non-zero', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/README.md', '`../../nope`\n')
		assert.equal(main(['--spec-dir', root]), 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a spec whose every reference resolves exits zero', () => {
	const root = mkSpec()
	try {
		seed(root, 'b/target.md', 'x\n')
		seed(root, 'a/README.md', 'see [t](../b/target.md)\n')
		assert.equal(main(['--spec-dir', root]), 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a missing --spec-dir is refused rather than defaulted', () => {
	assert.equal(main([]), 1)
})

test('a --spec-dir that does not exist is refused by name, not a crash', () => {
	const root = mkSpec()
	try {
		assert.equal(main(['--spec-dir', join(root, 'no-such-dir')]), 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── determinism and boundaries ───────────────────────────────────────────────

test('every unresolved reference is reported, not only the first', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/README.md', '`../../one`\n\n`../../two`\n')
		seed(root, 'b/README.md', 'see [three](../../three.md)\n')
		assert.equal(audit(root).length, 3)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('findings are ordered deterministically', () => {
	const root = mkSpec()
	try {
		seed(root, 'z/README.md', '`../../zed`\n')
		seed(root, 'a/README.md', '`../../bee`\n`../../ay`\n')
		const first = formatFindings(audit(root), root)
		const second = formatFindings(audit(root), root)
		assert.equal(first, second)
		assert.deepEqual(refs(audit(root)), ['../../bee', '../../ay', '../../zed'])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the walk covers markdown at any depth and reads nothing else', () => {
	const root = mkSpec()
	try {
		seed(root, 'a/b/c/deep.md', '`../../../../nope`\n')
		seed(root, 'a/b/c/notes.txt', '`../../../../also-nope`\n')
		assert.deepEqual(listMarkdownFiles(root), [join(root, 'a/b/c/deep.md')])

		const read: string[] = []
		audit(root, {
			readFile: (p) => {
				read.push(p)
				return readFileSync(p, 'utf8')
			},
		})
		assert.deepEqual(read, [join(root, 'a/b/c/deep.md')])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the audit writes nothing', () => {
	const root = mkSpec()
	try {
		const file = seed(root, 'a/README.md', '`../../nope`\n')
		const before = readFileSync(file, 'utf8')
		audit(root)
		assert.equal(readFileSync(file, 'utf8'), before)
		assert.deepEqual(listMarkdownFiles(root), [file])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── unit-level resolution ────────────────────────────────────────────────────

test('resolveReference resolves against the given directory and strips the fragment', () => {
	assert.equal(resolveReference('/spec/cap/node', '../../src/foo.ts'), '/spec/src/foo.ts')
	assert.equal(resolveReference('/spec/cap/node', '../sib/doc.md#heading'), '/spec/cap/sib/doc.md')
})

test('a clean spec renders a definitive clean line rather than silence', () => {
	assert.match(formatFindings([], '/spec'), /every relative reference resolves/)
})
