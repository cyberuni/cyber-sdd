// One test per frozen scenario in .agents/specs/aced/eval-run/check-freshness/check-freshness.feature.
//
// The fixtures here are chosen to DISCRIMINATE, which is the whole reason this node exists — the
// rejected first attempt at freshness guessed with mtimes, slug inference, and a regex over judge
// prose, and a suite built from agreeable fixtures would have passed it. So:
//
//   - the "matched by recorded target" fixture files the result under a DELIBERATELY WRONG
//     directory name, so a slug-guessing implementation cannot pass;
//   - the "newest" fixture makes alphabetical filename order the REVERSE of recorded timestamp
//     order, so a filename-sorting implementation cannot pass;
//   - the "touched" fixture rewrites mtime with identical bytes, so an mtime oracle cannot pass.
//
// Every negative assertion is paired with a positive on the same output: `assert.doesNotMatch` is
// satisfied by empty output, so alone it can never prove the mechanism ran.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
	canonicalListing,
	decideVerdict,
	hashDirListing,
	hashFile,
	incoherence,
	readSubject,
	selectNewest,
} from './check-freshness.mts'

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), 'check-freshness.mts')
const roots: string[] = []
after(() => {
	for (const r of roots) rmSync(r, { recursive: true, force: true })
})

const NODE_REL = join('.agents', 'specs', 'demo', 'cap')
const TARGET_REL = join('plugins', 'demo', 'skills', 'thing', 'SKILL.md')

function write(root: string, rel: string, text: string): string {
	const abs = join(root, rel)
	mkdirSync(dirname(abs), { recursive: true })
	writeFileSync(abs, text)
	return abs
}

/** A minimal repo: node dir with eval.md + frozen .feature, a target config, no results yet. */
function makeRepo(opts: { evalMd?: string | null } = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'freshness-'))
	roots.push(root)
	mkdirSync(join(root, '.git'), { recursive: true })
	if (opts.evalMd !== null) {
		write(root, join(NODE_REL, 'eval.md'), opts.evalMd ?? `---\nsubject: ${TARGET_REL}\nlayers: [behavior]\n---\n`)
	}
	write(
		root,
		join(NODE_REL, 'cap.feature'),
		'@frozen\nFeature: cap\n\n  Scenario: one\n    Given a\n    When b\n    Then c\n',
	)
	write(root, TARGET_REL, '# Thing\n\noriginal body\n')
	return root
}

const FEATURE_REL = join(NODE_REL, 'cap.feature')

function entry(root: string, rel: string, kind: 'file' | 'directory' = 'file') {
	return { path: rel, sha256: kind === 'directory' ? hashDirListing(join(root, rel)) : hashFile(join(root, rel)), kind }
}

/** A coherent record: scores one scenario, names the target, records both plus anything extra. */
function writeResult(
	root: string,
	opts: {
		file?: string
		timestamp?: string
		target?: string
		extra?: object[]
		evaluated?: object[] | null
		scenarios?: unknown[]
	},
) {
	const rec: Record<string, unknown> = {
		timestamp: opts.timestamp ?? '2026-08-01T00:00:00Z',
		target: opts.target ?? TARGET_REL,
		pass_rate: 1,
		scenarios: opts.scenarios ?? [{ name: 'one', pass: true }],
	}
	if (opts.evaluated !== null) {
		rec.evaluated = opts.evaluated ?? [entry(root, TARGET_REL), entry(root, FEATURE_REL), ...(opts.extra ?? [])]
	}
	return write(root, opts.file ?? join('.agents', 'aced', 'results', 'demo', 'r1.json'), JSON.stringify(rec, null, 1))
}

interface Run {
	code: number
	out: string
}
function run(root: string, nodeRel = NODE_REL): Run {
	try {
		const out = execFileSync('node', [ENGINE, '--node', join(root, nodeRel)], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		return { code: 0, out }
	} catch (e) {
		const err = e as { status: number; stdout: string; stderr: string }
		return { code: err.status, out: (err.stdout ?? '') + (err.stderr ?? '') }
	}
}

// ─── Resolve the target ───────────────────────────────────────────────────────

describe('resolve the target', () => {
	test('a node whose eval.md names a subject resolves that target', () => {
		const root = makeRepo()
		writeResult(root, {})
		const r = run(root)
		assert.match(r.out, new RegExp(`target: ${TARGET_REL.replace(/\\/g, '\\\\')}`))
	})

	test('a node with no eval.md fails closed', () => {
		const r = run(makeRepo({ evalMd: null }))
		assert.notEqual(r.code, 0)
		assert.match(r.out, /no eval\.md/)
		// No verdict — "absent" would read as "checked, nothing recorded".
		assert.doesNotMatch(r.out, /verdict:/)
	})

	test('an eval.md with no subject key fails closed', () => {
		const r = run(makeRepo({ evalMd: '---\nlayers: [behavior]\njudge: aced-case-judge\n---\n' }))
		assert.notEqual(r.code, 0)
		assert.match(r.out, /no subject key/)
		assert.doesNotMatch(r.out, /verdict:/)
	})

	test('readSubject reads the key and only the key', () => {
		assert.equal(readSubject('---\nsubject: a/b.md\nlayers: [x]\n---\n'), 'a/b.md')
		assert.equal(readSubject('---\nsubject: "a/b.md"\n---\n'), 'a/b.md')
		assert.equal(readSubject('---\nlayers: [x]\n---\n'), null)
	})
})

// ─── Select the recorded result ───────────────────────────────────────────────

describe('select the recorded result', () => {
	test('a repository with no results directory reports absent', () => {
		const r = run(makeRepo())
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /no result is recorded anywhere/)
	})

	test('a target with no recorded result reports absent', () => {
		const root = makeRepo()
		writeResult(root, { target: 'plugins/other/SKILL.md' })
		const r = run(root)
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /no result is recorded for this target/)
	})

	test('the result is matched by the target it records, not by the directory it sits in', () => {
		const root = makeRepo()
		// Filed under a directory named after something else entirely.
		writeResult(root, { file: join('.agents', 'aced', 'results', 'completely-unrelated-slug', 'r1.json') })
		const r = run(root)
		assert.equal(r.code, 0)
		assert.match(r.out, /verdict: current/)
	})

	test('the newest result is the one whose recorded timestamp is greatest', () => {
		const root = makeRepo()
		// Alphabetical order (a.json < b.json) is the REVERSE of recorded timestamp order.
		writeResult(root, { file: join('.agents', 'aced', 'results', 'demo', 'a.json'), timestamp: '2026-09-09T00:00:00Z' })
		writeResult(root, {
			file: join('.agents', 'aced', 'results', 'demo', 'b.json'),
			timestamp: '2026-01-01T00:00:00Z',
			evaluated: null,
		})
		// If it picked b.json (last alphabetically) it would read "no recorded provenance".
		const r = run(root)
		assert.match(r.out, /verdict: current/)
		assert.doesNotMatch(r.out, /no recorded provenance/)
	})

	test('selectNewest ignores file order entirely', () => {
		const pick = selectNewest([
			{ file: 'z.json', record: { timestamp: '2026-01-01T00:00:00Z' } },
			{ file: 'a.json', record: { timestamp: '2026-09-09T00:00:00Z' } },
		])
		assert.equal(pick?.file, 'a.json')
	})

	test('an unreadable result file is skipped and named', () => {
		const root = makeRepo()
		writeResult(root, {
			file: join('.agents', 'aced', 'results', 'demo', 'good.json'),
			timestamp: '2026-01-01T00:00:00Z',
		})
		write(root, join('.agents', 'aced', 'results', 'demo', 'newest.json'), 'this is not json {{{')
		const r = run(root)
		assert.match(r.out, /skipped \(unreadable\).*newest\.json/)
		// Positive half: it still reached a verdict from the readable one.
		assert.match(r.out, /verdict: current/)
	})

	test('a target whose every recorded result is unreadable reports absent', () => {
		const root = makeRepo()
		write(root, join('.agents', 'aced', 'results', 'demo', 'x.json'), 'nope {{{')
		write(root, join('.agents', 'aced', 'results', 'demo', 'y.json'), 'also nope {{{')
		const r = run(root)
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /x\.json/)
		assert.match(r.out, /y\.json/)
	})

	test('a result carrying no evaluated set reports absent', () => {
		const root = makeRepo()
		writeResult(root, { evaluated: null })
		const r = run(root)
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /no recorded provenance/)
	})

	test('a result whose evaluated set omits the suite it scored reports absent', () => {
		const root = makeRepo()
		writeResult(root, { evaluated: [entry(root, TARGET_REL)] })
		const r = run(root)
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /contradicts the result it accompanies/)
	})

	test('a result whose evaluated set omits the configuration it names reports absent', () => {
		const root = makeRepo()
		writeResult(root, { evaluated: [entry(root, FEATURE_REL)] })
		const r = run(root)
		assert.match(r.out, /verdict: absent/)
		assert.match(r.out, /omits the configuration the result names/)
	})

	test('incoherence is conditional on the record, and silent when the record is coherent', () => {
		const coherent = {
			target: 't',
			scenarios: [{}],
			evaluated: [
				{ path: 't', sha256: 'x', kind: 'file' as const },
				{ path: 'f', sha256: 'y', kind: 'file' as const },
			],
		}
		assert.equal(incoherence(coherent, 'f', 't'), null)
		// A record scoring nothing implies no suite read, so omitting the suite is not a contradiction.
		assert.equal(
			incoherence({ target: 't', scenarios: [], evaluated: [{ path: 't', sha256: 'x', kind: 'file' }] }, 'f', 't'),
			null,
		)
	})
})

// ─── Decide the verdict ───────────────────────────────────────────────────────

describe('decide the verdict', () => {
	test('a result whose recorded files all match the working tree is current', () => {
		const root = makeRepo()
		writeResult(root, {})
		const r = run(root)
		assert.equal(r.code, 0)
		assert.match(r.out, /verdict: current/)
	})

	test('a recorded subject file whose content changed makes the result stale', () => {
		const root = makeRepo()
		writeResult(root, {})
		write(root, TARGET_REL, '# Thing\n\nEDITED body\n')
		const r = run(root)
		assert.match(r.out, /verdict: stale/)
		assert.match(r.out, new RegExp(`no longer matching: ${TARGET_REL.replace(/\\/g, '\\\\')}`))
	})

	test('a recorded file that is no longer in the tree makes the result stale', () => {
		const root = makeRepo()
		const refRel = join('plugins', 'demo', 'skills', 'thing', 'reference.md')
		write(root, refRel, 'reference body\n')
		writeResult(root, { extra: [entry(root, refRel)] })
		rmSync(join(root, refRel))
		const r = run(root)
		assert.match(r.out, /verdict: stale/)
		assert.match(r.out, /reference\.md \(missing from the tree\)/)
	})

	test('a changed suite with an unchanged subject is incomplete, not stale', () => {
		const root = makeRepo()
		writeResult(root, {})
		write(
			root,
			FEATURE_REL,
			'@frozen\nFeature: cap\n\n  Scenario: one\n    Given a\n    When b\n    Then c\n\n  Scenario: two\n    Given d\n    When e\n    Then f\n',
		)
		const r = run(root)
		assert.match(r.out, /verdict: incomplete/)
		assert.match(r.out, /cap\.feature/)
		// The distinction is the point: merging this into stale throws away the surviving scores.
		assert.doesNotMatch(r.out, /verdict: stale/)
	})

	test('a subject change alongside a suite change is reported stale', () => {
		const root = makeRepo()
		writeResult(root, {})
		write(root, TARGET_REL, '# Thing\n\nEDITED\n')
		write(root, FEATURE_REL, '@frozen\nFeature: cap\n\n  Scenario: two\n    Given d\n    When e\n    Then f\n')
		const r = run(root)
		assert.match(r.out, /verdict: stale/)
		assert.doesNotMatch(r.out, /verdict: incomplete/)
	})

	test('a file touched without a content change stays current', () => {
		const root = makeRepo()
		writeResult(root, {})
		// Same bytes, later mtime. An mtime oracle reports stale here; a content hash does not.
		const later = new Date(Date.now() + 60_000)
		utimesSync(join(root, TARGET_REL), later, later)
		const r = run(root)
		assert.equal(r.code, 0)
		assert.match(r.out, /verdict: current/)
	})

	test('the listing canonical form is order-independent', () => {
		// Not reachable through the filesystem: ext4 hands back readdirSync already sorted, so a mutant
		// deleting the sort stays green on Linux and breaks only on APFS/NTFS — as a wrong verdict,
		// never an error. Asserting the pure function is the only way to bind it here.
		assert.equal(canonicalListing(['b.md', 'a.md']), canonicalListing(['a.md', 'b.md']))
		assert.equal(canonicalListing(['b.md', 'a.md']), 'a.md\nb.md')
	})

	test('a file added to a recorded directory makes the result stale', () => {
		const root = makeRepo()
		const dirRel = join('plugins', 'demo', 'skills', 'thing', 'references')
		write(root, join(dirRel, 'a.md'), 'a\n')
		write(root, join(dirRel, 'b.md'), 'b\n')
		writeResult(root, {
			extra: [entry(root, dirRel, 'directory'), entry(root, join(dirRel, 'a.md')), entry(root, join(dirRel, 'b.md'))],
		})
		write(root, join(dirRel, 'c.md'), 'c\n')
		const r = run(root)
		assert.match(r.out, /verdict: stale/)
		assert.match(r.out, /references \(content changed\)/)
	})

	test('growth the result never consumed is not reported', () => {
		const root = makeRepo()
		writeResult(root, {})
		// A sibling directory the configuration does not load from, and no recorded entry names.
		write(root, join('plugins', 'demo', 'skills', 'thing', 'assets', 'new.png'), 'binary-ish\n')
		const r = run(root)
		assert.equal(r.code, 0)
		assert.match(r.out, /verdict: current/)
		assert.doesNotMatch(r.out, /no longer matching/)
	})

	test('decideVerdict orders the two questions: subject drift outranks suite drift', () => {
		const root = makeRepo()
		const rec = { target: TARGET_REL, evaluated: [entry(root, TARGET_REL), entry(root, FEATURE_REL)] }
		assert.equal(decideVerdict(rec, root, FEATURE_REL).verdict, 'current')
		write(root, TARGET_REL, 'changed\n')
		assert.equal(decideVerdict(rec, root, FEATURE_REL).verdict, 'stale')
	})
})

// ─── Report the verdict ───────────────────────────────────────────────────────

describe('report the verdict', () => {
	test('only a current verdict exits zero', () => {
		// current
		const a = makeRepo()
		writeResult(a, {})
		assert.equal(run(a).code, 0)

		// stale
		const b = makeRepo()
		writeResult(b, {})
		write(b, TARGET_REL, 'edited\n')
		assert.notEqual(run(b).code, 0)

		// incomplete
		const c = makeRepo()
		writeResult(c, {})
		write(c, FEATURE_REL, '@frozen\nFeature: cap\n\n  Scenario: two\n    Given d\n    When e\n    Then f\n')
		assert.notEqual(run(c).code, 0)

		// absent
		assert.notEqual(run(makeRepo()).code, 0)
	})

	test('it writes nothing', () => {
		const root = makeRepo()
		writeResult(root, {})
		const before = snapshot(root)
		run(root)
		assert.deepEqual(snapshot(root), before)
	})
})

/** Every file's path and bytes, so a create, a modify, and a delete are all visible. */
function snapshot(root: string): Record<string, string> {
	const out: Record<string, string> = {}
	const walk = (dir: string, rel: string) => {
		for (const e of readdirSyncSafe(dir)) {
			const abs = join(dir, e)
			const r = join(rel, e)
			try {
				if (isDir(abs)) walk(abs, r)
				else out[r] = readFileSync(abs, 'utf8')
			} catch {
				/* unreadable entries are compared by absence, which is still a change */
			}
		}
	}
	walk(root, '')
	return out
}
function readdirSyncSafe(d: string): string[] {
	try {
		return readdirSync(d)
	} catch {
		return []
	}
}
function isDir(p: string): boolean {
	return statSync(p).isDirectory()
}
