import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	formatList,
	formatViolations,
	main,
	parseRegistryToml,
	RegistryParseError,
	type RetiredEntry,
	readRegistry,
	sweep,
} from './check-retired-terms.mts'

// One verification per frozen scenario in
// .agents/specs/sdd/corpus/retired-terms/retired-terms.feature — test names mirror scenario titles.

function withTmpDir<T>(fn: (dir: string) => T): T {
	const dir = mkdtempSync(join(tmpdir(), 'crt-'))
	try {
		return fn(dir)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

function seed(dir: string, relPath: string, contents: string): void {
	const full = join(dir, relPath)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, contents)
}

function fixedList(files: string[]): (root: string) => string[] {
	return () => files
}

function entry(over: Partial<RetiredEntry> = {}): RetiredEntry {
	return { term: 'artifacts/specs/', since: '304-m2-eval-suite-sweep', replacement: 'a colocated node', ...over }
}

// ── the registry loads one registered term per entry ──

test('the registry loads one registered term per entry', () => {
	const toml = `[[retired]]
term = "artifacts/specs/"
since = "304-m2-eval-suite-sweep"
replacement = "a colocated project-spec node"
`
	const entries = parseRegistryToml(toml)
	assert.equal(entries.length, 1)
	assert.equal(entries[0].term, 'artifacts/specs/')
	assert.equal(entries[0].since, '304-m2-eval-suite-sweep')
	assert.equal(entries[0].replacement, 'a colocated project-spec node')
})

// ── an absent registry sweeps clean ──

test('an absent registry sweeps clean', () => {
	withTmpDir((dir) => {
		execFileSync('git', ['init', '-q'], { cwd: dir })
		assert.deepEqual(readRegistry(dir), [])
		assert.equal(main(['--root', dir]), 0)
	})
})

// ── a malformed registry fails the check loudly ──

test('a malformed registry fails the check loudly', () => {
	withTmpDir((dir) => {
		seed(dir, '.agents/sdd/retired-terms.toml', 'this is not the registry format at all\n')
		assert.throws(() => readRegistry(dir), RegistryParseError)
		assert.equal(main(['--root', dir]), 1)
	})
})

// ── a survivor is reported with its location and replacement ──

test('a survivor is reported with its location and replacement', () => {
	withTmpDir((dir) => {
		seed(dir, 'plugins/x/readme.md', 'see artifacts/specs/foo for details\n')
		const violations = sweep(dir, [entry()], { listTrackedFiles: fixedList(['plugins/x/readme.md']) })
		assert.equal(violations.length, 1)
		assert.equal(violations[0].file, 'plugins/x/readme.md')
		assert.equal(violations[0].line, 1)
		assert.equal(violations[0].term, 'artifacts/specs/')
		assert.equal(violations[0].replacement, 'a colocated node')
	})
})

// ── a corpus with no survivor passes ──

test('a corpus with no survivor passes', () => {
	withTmpDir((dir) => {
		seed(dir, 'plugins/x/readme.md', 'nothing retired here\n')
		const violations = sweep(dir, [entry()], { listTrackedFiles: fixedList(['plugins/x/readme.md']) })
		assert.deepEqual(violations, [])
	})
})

// ── every survivor is reported, not the first ──

test('every survivor is reported, not the first', () => {
	withTmpDir((dir) => {
		seed(dir, 'a.md', 'artifacts/specs/a\n')
		seed(dir, 'b.md', 'artifacts/specs/b\n')
		seed(dir, 'c.md', 'artifacts/specs/c\n')
		const violations = sweep(dir, [entry()], { listTrackedFiles: fixedList(['a.md', 'b.md', 'c.md']) })
		assert.equal(violations.length, 3)
		assert.deepEqual(
			violations.map((v) => v.file),
			['a.md', 'b.md', 'c.md'],
		)
	})
})

// ── provenance is never flagged ──

test('provenance is never flagged', () => {
	withTmpDir((dir) => {
		seed(dir, '.agents/specs/aced/ledger/304.jsonl', '{"note":"artifacts/specs/ retired"}\n')
		const violations = sweep(dir, [entry()], {
			listTrackedFiles: fixedList(['.agents/specs/aced/ledger/304.jsonl']),
		})
		assert.deepEqual(violations, [])
	})
})

// ── the guard's own defining document passes the guard ──

test("the guard's own defining document passes the guard", () => {
	withTmpDir((dir) => {
		const relPath = '.agents/specs/sdd/corpus/retired-terms/README.md'
		seed(dir, relPath, 'the registered term is artifacts/specs/, it states the banned text\n')
		const violations = sweep(dir, [entry()], { listTrackedFiles: fixedList([relPath]) })
		assert.deepEqual(violations, [])
	})
})

// ── a file outside the entry's scope is not scanned ──

test("a file outside the entry's scope is not scanned", () => {
	withTmpDir((dir) => {
		seed(dir, 'website/docs/x.md', 'artifacts/specs/legacy\n')
		const scoped = entry({ scope: ['plugins/'] })
		const violations = sweep(dir, [scoped], { listTrackedFiles: fixedList(['website/docs/x.md']) })
		assert.deepEqual(violations, [])
	})
})

// ── an entry with no scope scans the whole tracked tree ──

test('an entry with no scope scans the whole tracked tree', () => {
	withTmpDir((dir) => {
		seed(dir, 'anywhere/deep/x.md', 'artifacts/specs/legacy\n')
		const unscoped = entry() // no scope
		const violations = sweep(dir, [unscoped], { listTrackedFiles: fixedList(['anywhere/deep/x.md']) })
		assert.equal(violations.length, 1)
		assert.equal(violations[0].file, 'anywhere/deep/x.md')
	})
})

// ── a file-only allow sanctions the whole file ──

test('a file-only allow sanctions the whole file', () => {
	withTmpDir((dir) => {
		seed(dir, 'design/notes.md', 'artifacts/specs/a\nunrelated\nartifacts/specs/b\n')
		const allowed = entry({ allow: ['design/notes.md'] })
		const violations = sweep(dir, [allowed], { listTrackedFiles: fixedList(['design/notes.md']) })
		assert.deepEqual(violations, [])
	})
})

// ── a substring allow sanctions the lines that match it ──

test('a substring allow sanctions the lines that match it', () => {
	withTmpDir((dir) => {
		seed(dir, 'glossary.md', 'the live project artifacts/specs/motive-model still lives there\n')
		const allowed = entry({ allow: ['glossary.md :: motive-model'] })
		const violations = sweep(dir, [allowed], { listTrackedFiles: fixedList(['glossary.md']) })
		assert.deepEqual(violations, [])
	})
})

// ── a substring allow leaves the rest of its file guarded ──

test('a substring allow leaves the rest of its file guarded', () => {
	withTmpDir((dir) => {
		seed(
			dir,
			'glossary.md',
			'the live project artifacts/specs/motive-model still lives there\nartifacts/specs/other-suite is stale\n',
		)
		const allowed = entry({ allow: ['glossary.md :: motive-model'] })
		const violations = sweep(dir, [allowed], { listTrackedFiles: fixedList(['glossary.md']) })
		assert.equal(violations.length, 1)
		assert.equal(violations[0].line, 2)
	})
})

// ── an untracked file is outside the sweep ──

test('an untracked file is outside the sweep', () => {
	withTmpDir((dir) => {
		execFileSync('git', ['init', '-q'], { cwd: dir })
		execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
		execFileSync('git', ['config', 'user.name', 'test'], { cwd: dir })
		seed(dir, 'tracked.md', 'clean\n')
		execFileSync('git', ['add', 'tracked.md'], { cwd: dir })
		seed(dir, 'untracked.md', 'artifacts/specs/legacy\n')
		// no listTrackedFiles override — exercises the real `git ls-files` default.
		const violations = sweep(dir, [entry()])
		assert.deepEqual(violations, [])
	})
})

// ── the root check chain runs the sweep ──

test('the root check chain runs the sweep', () => {
	// plugins/sdd/skills/check-retired-terms/scripts -> repo root is five levels up.
	const here = dirname(fileURLToPath(import.meta.url))
	const repoRoot = join(here, '..', '..', '..', '..', '..')
	const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
		scripts?: Record<string, string>
	}
	const script = pkg.scripts?.['check:specs'] ?? ''
	assert.ok(script.includes('check-retired-terms'), 'check:specs must invoke the retired-terms check')
})

// ── list shows each registered term with its replacement ──

test('list shows each registered term with its replacement', () => {
	withTmpDir((dir) => {
		seed(
			dir,
			'.agents/sdd/retired-terms.toml',
			`[[retired]]
term = "one/"
since = "cr-a"
replacement = "use A"

[[retired]]
term = "two/"
since = "cr-b"
replacement = "use B"
`,
		)
		const entries = readRegistry(dir)
		assert.equal(entries.length, 2)
		const rendered = formatList(entries)
		assert.match(rendered, /one\/.*cr-a.*use A/)
		assert.match(rendered, /two\/.*cr-b.*use B/)
		assert.equal(main(['--root', dir, '--list']), 0)
	})
})

// ── list states plainly that nothing is registered ──

test('list states plainly that nothing is registered', () => {
	withTmpDir((dir) => {
		assert.deepEqual(readRegistry(dir), [])
		assert.match(formatList([]), /no term is registered/)
		assert.equal(main(['--root', dir, '--list']), 0)
	})
})

// ── formatViolations renders every survivor, not just the first ──

test('formatViolations renders every survivor with its replacement, then a count', () => {
	const rendered = formatViolations([
		{ file: 'a.md', line: 1, term: 'artifacts/specs/', replacement: 'use B' },
		{ file: 'b.md', line: 2, term: 'artifacts/specs/', replacement: 'use B' },
	])
	assert.match(rendered, /a\.md:1:artifacts\/specs\/.*use B/)
	assert.match(rendered, /b\.md:2:artifacts\/specs\/.*use B/)
	assert.match(rendered, /2 survivor\(s\) found/)
})
