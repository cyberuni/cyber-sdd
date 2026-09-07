import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { SpecRecord } from '../../discover-specs/scripts/discover-specs.mts'
import {
	ENGINES,
	findCoverageGaps,
	findDroppedSpecFor,
	findRepoRoot,
	main,
	resolveSpecFor,
	unknownFlags,
} from './check-project-specs.mts'

function spec(path: string, projectPath: string): SpecRecord {
	return { path, name: path, nameSource: 'derived', status: 'implemented', projectPath, approvals: '' }
}

const withCheck = () => ({ scripts: { 'check:spec': 'sdd-check-specs' } })
const files = (...s: SpecRecord[]) => s.map((x) => `${x.path}/spec.md`)

// ─── resolveSpecFor ───────────────────────────────────────────────────────────

test('resolveSpecFor matches the spec whose project-path names the project dir', () => {
	const specs = [spec('.agents/specs/sdd', 'plugins/sdd'), spec('.agents/specs/aced', 'plugins/aced')]
	const r = resolveSpecFor(specs, 'plugins/aced')
	assert.equal(r.kind, 'resolved')
	assert.equal(r.kind === 'resolved' && r.spec.path, '.agents/specs/aced')
})

test('resolveSpecFor inverts a name-irregular mapping', () => {
	// The whole reason resolution is project-path-first: the spec folder does not
	// share the project's basename, so no name-derived lookup would find it.
	const specs = [spec('.agents/specs/cyberfleet-plugin', 'plugins/cyberfleet')]
	const r = resolveSpecFor(specs, 'plugins/cyberfleet')
	assert.equal(r.kind === 'resolved' && r.spec.path, '.agents/specs/cyberfleet-plugin')
})

test('resolveSpecFor resolves a nested spec by project-path like any other', () => {
	const specs = [spec('packages/cyberlegion/.agents/spec', 'packages/cyberlegion')]
	const r = resolveSpecFor(specs, 'packages/cyberlegion')
	assert.equal(r.kind === 'resolved' && r.spec.path, 'packages/cyberlegion/.agents/spec')
})

test('resolveSpecFor reports none for a project no spec governs', () => {
	const r = resolveSpecFor([spec('.agents/specs/sdd', 'plugins/sdd')], 'apps/website')
	assert.equal(r.kind, 'none')
})

test('resolveSpecFor never matches a spec carrying no project-path', () => {
	// '' must not match a falsy/empty project rel — that would claim every project.
	const r = resolveSpecFor([spec('.agents/specs/orphan', '')], '')
	assert.equal(r.kind, 'none')
})

test('resolveSpecFor reports ambiguous when two specs claim one project', () => {
	const specs = [spec('.agents/specs/a', 'plugins/x'), spec('.agents/specs/b', 'plugins/x')]
	const r = resolveSpecFor(specs, 'plugins/x')
	assert.equal(r.kind, 'ambiguous')
	assert.equal(r.kind === 'ambiguous' && r.specs.length, 2)
})

test('resolveSpecFor does not match on a path prefix', () => {
	const r = resolveSpecFor([spec('.agents/specs/sdd', 'plugins/sdd')], 'plugins/sdd-extra')
	assert.equal(r.kind, 'none')
})

// ─── findRepoRoot ─────────────────────────────────────────────────────────────

test('findRepoRoot walks up to the workspace marker', () => {
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		writeFileSync(join(tmp, 'pnpm-workspace.yaml'), 'packages:\n')
		const deep = join(tmp, 'plugins', 'thing', 'skills')
		mkdirSync(deep, { recursive: true })
		assert.equal(findRepoRoot(deep), tmp)
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

test('findRepoRoot returns empty when no marker exists above', () => {
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		assert.equal(findRepoRoot(tmp), '')
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

// ─── findCoverageGaps ─────────────────────────────────────────────────────────

test('findCoverageGaps passes when every spec names a project that checks it', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	assert.deepEqual(findCoverageGaps('.', files(...s), s, withCheck), [])
})

test('findCoverageGaps flags a spec whose project defines no check:spec', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', files(...s), s, () => ({ scripts: { test: 'x' } }))
	assert.equal(gaps.length, 1)
	assert.equal(gaps[0]?.reason, 'no-check-script')
})

test('findCoverageGaps flags a spec whose project is not a workspace member', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', files(...s), s, () => null)
	assert.equal(gaps[0]?.reason, 'no-manifest')
})

test('findCoverageGaps flags a spec declaring no project-path', () => {
	const s = [spec('.agents/specs/orphan', '')]
	const gaps = findCoverageGaps('.', files(...s), s, withCheck)
	assert.equal(gaps[0]?.reason, 'no-project-path')
})

test('findCoverageGaps flags a spec file discovery dropped for an out-of-enum status', () => {
	// The fail-open this guard exists to close: a spec.md sits at a recognized
	// location but carries a status outside the lifecycle enum, so discovery drops
	// it, every engine skips it, and nothing checks it. It must escalate, not exempt.
	const gaps = findCoverageGaps('.', ['.agents/specs/quill/spec.md'], [], withCheck)
	assert.equal(gaps.length, 1)
	assert.equal(gaps[0]?.reason, 'unrecognized')
	assert.equal(gaps[0]?.spec, '.agents/specs/quill/spec.md')
})

test('findCoverageGaps does not flag a discovered file that survived the status filter', () => {
	const s = [spec('.agents/specs/sdd', 'plugins/sdd')]
	const gaps = findCoverageGaps('.', ['.agents/specs/sdd/spec.md'], s, withCheck)
	assert.deepEqual(gaps, [])
})

// ─── findDroppedSpecFor (#316 — a per-project run must not read a corrupt status as "no spec") ──

const fm = (body: string) => (rel: string) => (rel === '.agents/specs/quill/spec.md' ? body : null)

test('findDroppedSpecFor catches a dropped spec that declares the project by project-path', () => {
	const dropped = findDroppedSpecFor(
		['.agents/specs/quill/spec.md'],
		[],
		'plugins/quill',
		fm('---\nstatus: aproved\nproject-path: plugins/quill\n---\n'),
	)
	assert.equal(dropped.length, 1)
	assert.equal(dropped[0]?.file, '.agents/specs/quill/spec.md')
	assert.equal(dropped[0]?.status, 'aproved')
})

test('findDroppedSpecFor catches a dropped nested spec by its location, not its frontmatter', () => {
	// A nested `<project>/.agents/spec/spec.md` names its project by where it sits, so
	// it is still attributable when the frontmatter is corrupt enough to lose project-path.
	const dropped = findDroppedSpecFor(
		['packages/cyberlegion/.agents/spec/spec.md'],
		[],
		'packages/cyberlegion',
		() => '---\nstatus: wip\n---\n',
	)
	assert.equal(dropped.length, 1)
	assert.equal(dropped[0]?.status, 'wip')
})

test('findDroppedSpecFor reports an empty status for a spec.md with no frontmatter at all', () => {
	const dropped = findDroppedSpecFor(['packages/x/.agents/spec/spec.md'], [], 'packages/x', () => '# spec\n')
	assert.equal(dropped.length, 1)
	assert.equal(dropped[0]?.status, '')
})

test('findDroppedSpecFor ignores a dropped spec belonging to another project', () => {
	const dropped = findDroppedSpecFor(
		['.agents/specs/quill/spec.md'],
		[],
		'plugins/sdd',
		fm('---\nstatus: aproved\nproject-path: plugins/quill\n---\n'),
	)
	assert.deepEqual(dropped, [])
})

test('findDroppedSpecFor ignores a spec that survived the status filter', () => {
	const s = [spec('.agents/specs/quill', 'plugins/quill')]
	const dropped = findDroppedSpecFor(
		files(...s),
		s,
		'plugins/quill',
		fm('---\nstatus: implemented\nproject-path: plugins/quill\n---\n'),
	)
	assert.deepEqual(dropped, [])
})

test('main --project exits non-zero for a project whose only spec has an out-of-enum status', () => {
	// End to end: before this, resolution reported `none` and the run printed
	// "no spec governs … — skipped" with exit 0 — the whole project exempted by a typo.
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		writeFileSync(join(tmp, 'pnpm-workspace.yaml'), 'packages:\n')
		mkdirSync(join(tmp, '.agents', 'specs', 'thing'), { recursive: true })
		writeFileSync(
			join(tmp, '.agents', 'specs', 'thing', 'spec.md'),
			'---\nstatus: aproved\nproject-path: plugins/thing\n---\n\n# thing\n',
		)
		mkdirSync(join(tmp, 'plugins', 'thing'), { recursive: true })
		assert.equal(main(['--project', join(tmp, 'plugins', 'thing')]), 1)
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

test('main --project still skips, exit 0, when the project genuinely has no spec', () => {
	const tmp = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		writeFileSync(join(tmp, 'pnpm-workspace.yaml'), 'packages:\n')
		mkdirSync(join(tmp, 'plugins', 'thing'), { recursive: true })
		assert.equal(main(['--project', join(tmp, 'plugins', 'thing')]), 0)
	} finally {
		rmSync(tmp, { recursive: true, force: true })
	}
})

// ─── the engine set ───────────────────────────────────────────────────────────

test('every engine is handed the spec dir it was resolved to', () => {
	for (const e of ENGINES) assert.ok(e.args('SPECDIR').includes('SPECDIR'), `${e.name} drops the spec dir`)
})

test('check-scenario-overlap is in the per-project set', () => {
	// #304 step 1 fixed the outline fingerprint (folds Examples into it), which
	// dissolved #314's deferral premise (10 engine-artifact findings, not corpus
	// duplication) — so the check now joins the per-project set it was held out of.
	assert.equal(
		ENGINES.some((e) => e.name === 'check-scenario-overlap'),
		true,
	)
})

test('check-spec-references is in the per-project set', () => {
	// Reference resolution is per-project by construction: a reference resolves against the
	// directory of the file carrying it, so the check is meaningful over one spec dir and
	// gains nothing from a corpus-wide run.
	assert.equal(
		ENGINES.some((e) => e.name === 'check-spec-references'),
		true,
	)
})

// ─── scope selection ──────────────────────────────────────────────────────────
//
// github-5. The scope is chosen by a flag, so a flag that is not recognized must
// not fall through to a default scope. It used to: project scope at a repo root
// resolves no governing spec and exits 0, so `--check-coverage` — which named a
// scope this harness no longer has — guarded every commit and every CI run while
// running no engine at all.

test('unknownFlags names a flag the harness does not define', () => {
	assert.deepEqual(unknownFlags(['--corpus', '--nope']), ['--nope'])
})

test('unknownFlags does not read a --project value as a flag', () => {
	assert.deepEqual(unknownFlags(['--project', '--weird-looking-dir']), [])
})

test('unknownFlags accepts every flag the harness defines', () => {
	assert.deepEqual(unknownFlags(['--corpus']), [])
	assert.deepEqual(unknownFlags(['--project', 'plugins/thing']), [])
})

test('main fails on an unrecognized flag instead of choosing a scope', () => {
	assert.equal(main(['--definitely-not-a-flag']), 1)
})

test('main fails on the retired coverage-only flag', () => {
	// THE regression pin for github-5. Before the fix this exact argv reached the
	// coverage-only branch; after a naive fix it would fall through to project
	// scope and — at a repo root, which is where the root chain runs it — exit 0.
	// Either way the run reports success having checked nothing.
	assert.equal(main(['--check-coverage']), 1)
})

test('main refuses both scopes at once', () => {
	assert.equal(main(['--corpus', '--project', 'plugins/thing']), 1)
})

// ─── the corpus scope ─────────────────────────────────────────────────────────

const ENTRY = fileURLToPath(new URL('./check-project-specs.mts', import.meta.url))

const CONCEPT_INDEX = join(
	fileURLToPath(new URL('.', import.meta.url)),
	'..',
	'..',
	'concept-index',
	'scripts',
	'concept-index.mts',
)

/** A workspace root holding `specs` — each `[slug, projectPath, nodes]`. */
function corpusFixture(specs: [string, string, Record<string, string>][], status = 'draft'): string {
	const root = mkdtempSync(join(tmpdir(), 'cps-corpus-'))
	writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n')
	for (const [slug, projectPath, nodes] of specs) {
		mkdirSync(join(root, projectPath), { recursive: true })
		writeFileSync(
			join(root, projectPath, 'package.json'),
			JSON.stringify({ name: slug, scripts: { 'check:spec': 'x' } }),
		)
		const specDir = join(root, '.agents', 'specs', slug)
		mkdirSync(specDir, { recursive: true })
		writeFileSync(
			join(specDir, 'spec.md'),
			`---\nstatus: ${status}\nproject-path: ${projectPath}\n---\n\n# ${slug}\n\nA project spec.\n`,
		)
		for (const [node, body] of Object.entries(nodes)) {
			mkdirSync(join(specDir, node), { recursive: true })
			writeFileSync(join(specDir, node, 'README.md'), body)
		}
		// Render the generated by-concept block rather than hand-writing it: a fixture
		// that hardcodes another engine's output rots silently when that output changes,
		// and these tests turn on whether the corpus scope FAILS for the injected reason.
		execFileSync('node', [CONCEPT_INDEX, '--spec-dir', specDir, '--write'], { stdio: 'ignore' })
	}
	return root
}

/** Run `main` with the fixture as the working directory, then restore. */
function inCwd(dir: string, fn: () => number): number {
	const prev = process.cwd()
	process.chdir(dir)
	try {
		return fn()
	} finally {
		process.chdir(prev)
	}
}

/** `inCwd`, also returning what the run wrote to stdout. */
function inCwdCapturing(dir: string, fn: () => number): { code: number; out: string } {
	const prev = process.cwd()
	process.chdir(dir)
	try {
		return captureStdout(fn)
	} finally {
		process.chdir(prev)
	}
}

// A behavioral node with no `## Use Cases` — the shape a truncated node leaves
// behind. It reads as a shorter node, which is why nothing downstream notices.
const TRUNCATED = '---\nspec-type: behavioral\n---\n\n# a node truncated mid-file\n\n## What\n\nIt does a thing.\n'

test('the corpus scope fails on a truncated spec node', () => {
	// github-5 trigger 1: a node's Use Cases, Control Flow and Scenario map
	// destroyed. The root chain reported exit 0 over exactly this.
	const root = corpusFixture([['thing', 'plugins/thing', { broken: TRUNCATED }]])
	try {
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			1,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the corpus scope fails on a spec node whose folder was removed', () => {
	// github-5 trigger 2: a whole node's spec AND its frozen suite gone from the
	// corpus, leaving the references that pointed at it dangling. Root exit 0.
	const root = corpusFixture([['thing', 'plugins/thing', {}]])
	try {
		const specMd = join(root, '.agents', 'specs', 'thing', 'spec.md')
		writeFileSync(
			specMd,
			`${readFileSync(specMd, 'utf8')}\n## Capability map\n\n| Folder | Owns |\n|---|---|\n| [\`gone/\`](./gone/README.md) | the node that was removed |\n`,
		)
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			1,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

/** Run `fn`, returning what it wrote to stdout along with its exit code. */
function captureStdout(fn: () => number): { code: number; out: string } {
	const real = process.stdout.write.bind(process.stdout)
	let out = ''
	process.stdout.write = ((chunk: unknown) => {
		out += String(chunk)
		return true
	}) as typeof process.stdout.write
	try {
		return { code: fn(), out }
	} finally {
		process.stdout.write = real
	}
}

test('the corpus scope sweeps every project-spec, not only the first', () => {
	// Asserted on the report rather than on the exit code: discovery order is not
	// guaranteed, so a harness that swept only specs[0] can still exit non-zero by
	// happening to visit the damaged one. Naming every spec it swept is the claim.
	const root = corpusFixture([
		['first', 'plugins/first', {}],
		['second', 'plugins/second', { broken: TRUNCATED }],
	])
	try {
		const { code, out } = inCwdCapturing(root, () => main(['--corpus']))
		assert.match(out, /\.agents\/specs\/first/)
		assert.match(out, /\.agents\/specs\/second/)
		assert.equal(code, 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the corpus scope catches a spec the sweep cannot see', () => {
	// The coverage guard's half of totality: discovery drops a spec whose status is
	// not in the lifecycle enum, so the sweep never visits it and would report clean.
	const root = corpusFixture([['thing', 'plugins/thing', {}]], 'whatever')
	try {
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			1,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the corpus scope catches a spec no project would check', () => {
	// The coverage guard's other half. A subject that reimplements only the
	// unrecognized-status detection — the half that mirrors discovery's own drop
	// logic — never checks reachability, and passes every other scenario.
	const root = corpusFixture([['thing', 'plugins/thing', {}]])
	try {
		// Classifies fine; names a directory that is not a workspace member.
		const specMd = join(root, '.agents', 'specs', 'thing', 'spec.md')
		writeFileSync(
			specMd,
			readFileSync(specMd, 'utf8').replace('project-path: plugins/thing', 'project-path: plugins/absent'),
		)
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			1,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a coverage gap does not stop the sweep', () => {
	// Both defects in one report. A floor that returns at the first sub-check makes
	// an author fix the corpus one run at a time, and the second defect stays unseen
	// until the first is gone.
	const root = corpusFixture([['thing', 'plugins/thing', { broken: TRUNCATED }]])
	try {
		// A spec file at a spec location that discovery cannot classify: the sweep
		// never visits it, so only the coverage guard reports it.
		const stray = join(root, '.agents', 'specs', 'stray')
		mkdirSync(stray, { recursive: true })
		writeFileSync(join(stray, 'spec.md'), '---\nstatus: whatever\nproject-path: plugins/thing\n---\n\n# stray\n')
		const { code, out } = inCwdCapturing(root, () => main(['--corpus']))
		assert.match(out, /\.agents\/specs\/thing/, 'the sweep must run after the coverage guard reported a gap')
		assert.equal(code, 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a failing engine does not stop the engines after it', () => {
	// A node that is both structurally incomplete (check-spec-state, first in the
	// set) and referenced from nowhere-that-exists (check-spec-references, sixth):
	// a set that stopped at the first failure would never reach the second.
	const root = corpusFixture([['thing', 'plugins/thing', { broken: TRUNCATED }]])
	try {
		const specMd = join(root, '.agents', 'specs', 'thing', 'spec.md')
		writeFileSync(
			specMd,
			readFileSync(specMd, 'utf8').replace(
				'A project spec.',
				'A project spec pointing at [`gone/`](./gone/README.md), which is not there.',
			),
		)
		const failures = (out: string) => [...out.matchAll(/^\s*FAIL\s+(\S+)\s*$/gm)].map((m) => m[1])
		// FAIL lines go to stderr, so read the run's own report through a subprocess.
		const res = spawnSync('node', [ENTRY, '--corpus'], { cwd: root, encoding: 'utf8' })
		const named = failures(`${res.stdout}${res.stderr}`)
		assert.ok(named.includes('check-spec-state'), `expected check-spec-state to fail, got ${named.join(', ')}`)
		assert.ok(
			named.includes('check-spec-references'),
			`expected check-spec-references to fail too, got ${named.join(', ')}`,
		)
		assert.equal(res.status, 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('an empty corpus passes', () => {
	const root = corpusFixture([])
	try {
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			0,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('a clean corpus exits 0', () => {
	const root = corpusFixture([['thing', 'plugins/thing', {}]])
	try {
		assert.equal(
			inCwd(root, () => main(['--corpus'])),
			0,
		)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('with no scope flag the working directory is the project', () => {
	// The default-directory decision. A subject that resolves the default from
	// anywhere else — the repo root, say — passes every scenario that supplies the
	// directory explicitly, and fails only this one.
	const root = corpusFixture([['thing', 'plugins/thing', {}]])
	try {
		const { code, out } = inCwdCapturing(join(root, 'plugins', 'thing'), () => main([]))
		assert.match(out, /plugins\/thing -> \.agents\/specs\/thing/)
		assert.equal(code, 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('neither scope runs without a repo root', () => {
	const outside = mkdtempSync(join(tmpdir(), 'cps-norepo-'))
	try {
		assert.equal(
			inCwd(outside, () => main(['--corpus'])),
			1,
		)
		assert.equal(main(['--project', outside]), 1)
	} finally {
		rmSync(outside, { recursive: true, force: true })
	}
})

// ─── the repo's own chain ─────────────────────────────────────────────────────

test('the root check chain runs the floor at corpus scope', () => {
	// The defect github-5 reported was here, not in the engine: both scopes worked,
	// and the chain guarding commits and CI asked for the one that runs no engine.
	const root = findRepoRoot(process.cwd())
	assert.notEqual(root, '', 'the test must run inside the workspace')
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
	const script = pkg.scripts?.['check:specs'] ?? ''
	assert.ok(script.includes('check-project-specs'), 'check:specs must invoke the project-spec harness')
	assert.ok(script.includes('--corpus'), 'check:specs must invoke the harness at corpus scope')
	assert.ok(!script.includes('--check-coverage'), 'check:specs must not invoke a coverage-only scope')
})
