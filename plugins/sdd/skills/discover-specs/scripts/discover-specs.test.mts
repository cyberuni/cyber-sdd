import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	classifyLocation,
	collectSpecs,
	deriveName,
	expandAnchor,
	LIFECYCLE_STATUSES,
	main,
	parseAnchorsToml,
	parseFrontmatter,
	readAnchors,
	resolveByName,
	type SpecRecord,
	toToon,
} from './discover-specs.mts'

// Write a spec.md (relative to dir) with the given frontmatter body.
function seed(dir: string, relPath: string, frontmatter: string, body = '# body'): void {
	const full = join(dir, relPath)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `---\n${frontmatter}\n---\n\n${body}\n`)
}

function rec(over: Partial<SpecRecord> = {}): SpecRecord {
	return {
		path: '.agents/specs/x',
		name: 'x',
		nameSource: 'derived',
		status: 'draft',
		projectPath: '',
		approvals: '',
		...over,
	}
}

// ── parseFrontmatter ──

test('parseFrontmatter reads status, name, project-path, and approval verdicts', () => {
	const fm = parseFrontmatter(
		'---\nstatus: approved\nname: SDD\nproject-path: plugins/sdd-new\napproval:\n  spec:\n    verdict: approve\n    by: unional\n  impl:\n    verdict: approve\n---\n# body\n',
	)
	assert.equal(fm?.status, 'approved')
	assert.equal(fm?.name, 'SDD')
	assert.equal(fm?.projectPath, 'plugins/sdd-new')
	assert.deepEqual(fm?.approval, { spec: 'approve', impl: 'approve' })
})

test('parseFrontmatter ignores nested why blocks and unknown keys', () => {
	const fm = parseFrontmatter(
		'---\nstatus: draft\napproval:\n  spec:\n    verdict: approve\n    why:\n      leash: within\n      basis: judged\nproduced-by: sdd:automaton\n---\n',
	)
	assert.equal(fm?.status, 'draft')
	assert.deepEqual(fm?.approval, { spec: 'approve' })
})

test('parseFrontmatter returns null when there is no frontmatter block', () => {
	assert.equal(parseFrontmatter('# just a heading\n'), null)
})

test('parseFrontmatter strips quotes from scalar values', () => {
	const fm = parseFrontmatter('---\nstatus: "approved"\nname: \'Acme\'\n---\n')
	assert.equal(fm?.status, 'approved')
	assert.equal(fm?.name, 'Acme')
})

test('the lifecycle enum is exactly the four states', () => {
	assert.deepEqual([...LIFECYCLE_STATUSES].sort(), ['approved', 'deprecated', 'draft', 'implemented'])
})

// ── classifyLocation ──

test('classifyLocation recognizes the three spec locations', () => {
	assert.deepEqual(classifyLocation('.agents/spec/spec.md'), {
		pattern: 'root-single',
		locationDir: '',
	})
	assert.deepEqual(classifyLocation('.agents/specs/sdd/spec.md'), {
		pattern: 'root-multi',
		locationDir: 'sdd',
	})
	assert.deepEqual(classifyLocation('packages/pkg-a/.agents/spec/spec.md'), {
		pattern: 'nested',
		locationDir: 'packages/pkg-a',
	})
})

test('classifyLocation rejects a spec.md outside the three locations', () => {
	assert.equal(classifyLocation('src/foo/spec.md'), null)
	assert.equal(classifyLocation('spec.md'), null)
	assert.equal(classifyLocation('.agents/specs/sdd/nested/spec.md'), null)
})

// ── deriveName + name-source ──

test('deriveName: a declared frontmatter name is authoritative', () => {
	assert.deepEqual(deriveName({ pattern: 'nested', locationDir: 'packages/pkg-a' }, { name: 'Acme', approval: {} }), {
		name: 'Acme',
		nameSource: 'declared',
	})
})

test('deriveName: the repo-root single project is the assumable derived name', () => {
	assert.deepEqual(deriveName({ pattern: 'root-single', locationDir: '' }, { approval: {} }), {
		name: 'repo',
		nameSource: 'derived',
	})
})

test('deriveName: a .agents/specs/<project> folder names itself (derived)', () => {
	assert.deepEqual(deriveName({ pattern: 'root-multi', locationDir: 'sdd' }, { approval: {} }), {
		name: 'sdd',
		nameSource: 'derived',
	})
})

test('deriveName: a nested project falls back to its folder basename (guessed)', () => {
	assert.deepEqual(deriveName({ pattern: 'nested', locationDir: 'packages/pkg-a' }, { approval: {} }), {
		name: 'pkg-a',
		nameSource: 'guessed',
	})
})

// ── collectSpecs (scan + shape filter + name) ──

test('collectSpecs finds specs at all three locations and excludes non-specs', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/spec/spec.md', 'status: draft') // pattern 1
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved\nproject-path: plugins/sdd-new') // pattern 2
		seed(dir, 'packages/web/.agents/spec/spec.md', 'status: draft') // pattern 3
		seed(dir, '.agents/specs/notaspec/spec.md', 'title: not a spec') // no status
		seed(dir, 'src/feature/spec.md', 'status: approved') // outside the locations
		seed(dir, 'node_modules/pkg/.agents/spec/spec.md', 'status: draft') // skipped dir
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/spec', '.agents/specs/sdd', 'packages/web/.agents/spec'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs only matches root-level .agents/specs (pattern 2 has no ** prefix)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: draft')
		seed(dir, 'pkg/.agents/specs/inner/spec.md', 'status: draft')
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/specs/sdd'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// The fixed conventions need no registry: a spec is found at whatever FIXED location it sits, with
// nothing to keep in sync (the opt-in extra-anchor registry is a separate, additive concern).
test('collectSpecs finds a moved spec at its new fixed location without a path index', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/proj/spec.md', 'status: draft') // original location
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/specs/proj'],
		)
		// "move" it to a different spec location — nothing else updated
		rmSync(join(dir, '.agents/specs/proj'), { recursive: true, force: true })
		seed(dir, 'packages/proj/.agents/spec/spec.md', 'status: draft')
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['packages/proj/.agents/spec'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs joins multiple gate approvals in order', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(
			dir,
			'.agents/specs/sdd/spec.md',
			'status: implemented\napproval:\n  spec:\n    verdict: approve\n  impl:\n    verdict: approve',
		)
		assert.equal(collectSpecs(dir)[0].approvals, 'spec:approve;impl:approve')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs carries name, name-source, status, project-path, and approvals', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/spec/spec.md', 'status: draft') // root → derived `repo`
		seed(
			dir,
			'.agents/specs/sdd/spec.md',
			'status: approved\nproject-path: plugins/sdd-new\napproval:\n  spec:\n    verdict: approve',
		)
		seed(dir, 'packages/web/.agents/spec/spec.md', 'status: draft\nname: WebApp') // declared overrides basename
		const byPath = Object.fromEntries(collectSpecs(dir).map((s) => [s.path, s]))
		assert.deepEqual([byPath['.agents/spec'].name, byPath['.agents/spec'].nameSource], ['repo', 'derived'])
		assert.deepEqual(
			[
				byPath['.agents/specs/sdd'].name,
				byPath['.agents/specs/sdd'].nameSource,
				byPath['.agents/specs/sdd'].projectPath,
				byPath['.agents/specs/sdd'].approvals,
			],
			['sdd', 'derived', 'plugins/sdd-new', 'spec:approve'],
		)
		assert.deepEqual(
			[byPath['packages/web/.agents/spec'].name, byPath['packages/web/.agents/spec'].nameSource],
			['WebApp', 'declared'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// The deterministic half of "reads frontmatter only, never the body": the body never reaches the
// OUTPUT (the agentic half — the agent never knows the body — is an ACED eval, not a node:test).
test('collectSpecs output never carries spec body content', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(
			dir,
			'.agents/specs/sdd/spec.md',
			'status: approved',
			'# Heading\n\nSENTINEL_BODY_SECRET should never surface.',
		)
		const toon = toToon(collectSpecs(dir))
		assert.doesNotMatch(toon, /SENTINEL_BODY_SECRET/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── extra anchors — the opt-in registry (ADR-0019) ──

// Write the spec-anchors config with the given anchor patterns.
function seedAnchors(dir: string, patterns: string[]): void {
	const full = join(dir, '.agents/sdd/spec-anchors.toml')
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, `anchors = [\n${patterns.map((p) => `  "${p}",`).join('\n')}\n]\n`)
}

test('parseAnchorsToml pulls the string entries out of the anchors array', () => {
	assert.deepEqual(parseAnchorsToml('anchors = [\n  "source",\n  "a/*/<project>",\n]\n'), ['source', 'a/*/<project>'])
	assert.deepEqual(parseAnchorsToml('anchors = ["one", \'two\']'), ['one', 'two'])
})

test('parseAnchorsToml yields [] when there is no anchors array (all commented out)', () => {
	assert.deepEqual(parseAnchorsToml('# anchors = ["x"]\n'), [])
	assert.deepEqual(parseAnchorsToml('other = 1\n'), [])
})

test('readAnchors yields [] when there is no config file', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		assert.deepEqual(readAnchors(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('expandAnchor resolves a literal dir, a * glob, and a <project> capture', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'source/spec.md', 'status: draft')
		seed(dir, 'sessions/web/s1/spec.md', 'status: draft')
		seed(dir, 'sessions/api/s2/spec.md', 'status: draft')
		assert.deepEqual(expandAnchor(dir, 'source'), [{ rel: 'source/spec.md', capturedName: undefined }])
		assert.deepEqual(
			expandAnchor(dir, 'sessions/*/<project>').sort((a, b) => (a.rel < b.rel ? -1 : 1)),
			[
				{ rel: 'sessions/api/s2/spec.md', capturedName: 's2' },
				{ rel: 'sessions/web/s1/spec.md', capturedName: 's1' },
			],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('expandAnchor: a ** segment globs zero or more levels, at any depth', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'archive/spec.md', 'status: draft') // ** matches zero levels here
		seed(dir, 'archive/2024/q1/spec.md', 'status: draft')
		seed(dir, 'archive/2024/q2/deep/spec.md', 'status: draft')
		seed(dir, 'other/spec.md', 'status: draft') // outside the anchor root — must not match
		assert.deepEqual(
			expandAnchor(dir, 'archive/**').sort((a, b) => (a.rel < b.rel ? -1 : 1)),
			[
				{ rel: 'archive/2024/q1/spec.md', capturedName: undefined },
				{ rel: 'archive/2024/q2/deep/spec.md', capturedName: undefined },
				{ rel: 'archive/spec.md', capturedName: undefined },
			],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('deriveName: an extra anchor with a <project> capture is derived, without one is guessed', () => {
	assert.deepEqual(deriveName({ pattern: 'extra', locationDir: 'x/s1', capturedName: 's1' }, { approval: {} }), {
		name: 's1',
		nameSource: 'derived',
	})
	assert.deepEqual(deriveName({ pattern: 'extra', locationDir: 'source' }, { approval: {} }), {
		name: 'source',
		nameSource: 'guessed',
	})
})

test('collectSpecs with no config scans only the fixed conventions (back-compat)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved')
		seed(dir, 'source/spec.md', 'status: draft') // off-convention, no config → excluded
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/specs/sdd'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs adds a spec at a declared extra anchor', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'source/spec.md', 'status: draft')
		seedAnchors(dir, ['source'])
		const specs = collectSpecs(dir)
		assert.deepEqual(
			specs.map((s) => s.path),
			['source'],
		)
		assert.deepEqual([specs[0].name, specs[0].nameSource], ['source', 'guessed'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs still shape-filters a spec.md at an extra anchor with no status', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'source/spec.md', 'title: not a spec') // no lifecycle status
		seedAnchors(dir, ['source'])
		assert.deepEqual(collectSpecs(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs names an extra-anchor spec from its <project> capture (derived)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'curriculum/web/react/s-01/spec.md', 'status: draft')
		seedAnchors(dir, ['curriculum/*/*/<project>'])
		const specs = collectSpecs(dir)
		assert.deepEqual(
			specs.map((s) => [s.path, s.name, s.nameSource]),
			[['curriculum/web/react/s-01', 's-01', 'derived']],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs: a declared frontmatter name wins for an extra-anchor spec too', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, 'source/spec.md', 'status: draft\nname: MyProj')
		seedAnchors(dir, ['source'])
		const specs = collectSpecs(dir)
		assert.deepEqual([specs[0].name, specs[0].nameSource], ['MyProj', 'declared'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs dedupes a fixed-convention spec that an extra anchor also matches', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved')
		seedAnchors(dir, ['.agents/specs/<project>']) // also matches the fixed pattern-2 dir
		const specs = collectSpecs(dir)
		assert.equal(specs.length, 1)
		assert.equal(specs[0].path, '.agents/specs/sdd')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectSpecs is fail-safe: a malformed config falls back to the fixed conventions', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved')
		seed(dir, 'source/spec.md', 'status: draft')
		mkdirSync(join(dir, '.agents/sdd'), { recursive: true })
		writeFileSync(join(dir, '.agents/sdd/spec-anchors.toml'), 'this is not valid = = [')
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/specs/sdd'], // no crash; the off-convention spec stays excluded
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// An UNREADABLE config (here a directory in the config's place → EISDIR on read) exercises the
// readAnchors try/catch, not just the non-throwing "no anchors array" path.
test('collectSpecs is fail-safe: an unreadable config falls back to the fixed conventions', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved')
		seed(dir, 'source/spec.md', 'status: draft')
		mkdirSync(join(dir, '.agents/sdd/spec-anchors.toml'), { recursive: true }) // a dir → readFileSync throws
		assert.deepEqual(
			collectSpecs(dir).map((s) => s.path),
			['.agents/specs/sdd'], // no crash; falls back to the fixed conventions
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── resolveByName (deterministic exact match; disambiguation stays agentic) ──

test('resolveByName returns the single exact (case-insensitive) name match', () => {
	const specs = [rec({ path: 'a', name: 'sdd' }), rec({ path: 'b', name: 'aced' })]
	assert.deepEqual(resolveByName(specs, 'SDD'), { kind: 'match', spec: specs[0] })
})

test('resolveByName returns the candidate set when a name is ambiguous', () => {
	const specs = [rec({ path: 'a', name: 'api' }), rec({ path: 'b', name: 'api' })]
	const r = resolveByName(specs, 'api')
	assert.equal(r.kind, 'ambiguous')
	assert.deepEqual(r.kind === 'ambiguous' && r.candidates.map((s) => s.path), ['a', 'b'])
})

test('resolveByName returns none when no name matches', () => {
	assert.deepEqual(resolveByName([rec({ name: 'sdd' })], 'nope'), { kind: 'none' })
})

// ── toToon ──

test('toToon emits a tabular header and one row per spec', () => {
	const toon = toToon([
		rec({
			path: '.agents/specs/sdd',
			name: 'sdd',
			nameSource: 'derived',
			status: 'approved',
			projectPath: 'plugins/sdd-new',
			approvals: 'spec:approve',
		}),
		rec({
			path: '.agents/specs/aced',
			name: 'aced',
			nameSource: 'derived',
			status: 'draft',
			projectPath: 'plugins/aced',
			approvals: '',
		}),
	])
	assert.equal(
		toon,
		'specs[2]{path,name,nameSource,status,projectPath,approvals}:\n' +
			'  .agents/specs/sdd,sdd,derived,approved,plugins/sdd-new,spec:approve\n' +
			'  .agents/specs/aced,aced,derived,draft,plugins/aced,""',
	)
})

test('toToon on an empty set emits only the zero header', () => {
	assert.equal(toToon([]), 'specs[0]{path,name,nameSource,status,projectPath,approvals}:')
})

// ── main (CLI) ──

test('main scans the given root and returns 0', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	const writes: string[] = []
	const original = process.stdout.write
	process.stdout.write = ((chunk: string) => {
		writes.push(String(chunk))
		return true
	}) as typeof process.stdout.write
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved\nproject-path: plugins/sdd-new')
		assert.equal(main(['--root', dir]), 0)
		assert.match(writes.join(''), /specs\[1\]\{path,name,nameSource,status,projectPath,approvals\}:/)
		assert.match(writes.join(''), /\.agents\/specs\/sdd,sdd,derived,approved,plugins\/sdd-new/)
	} finally {
		process.stdout.write = original
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --resolve filters to the exact name matches', () => {
	const dir = mkdtempSync(join(tmpdir(), 'discover-specs-'))
	const writes: string[] = []
	const original = process.stdout.write
	process.stdout.write = ((chunk: string) => {
		writes.push(String(chunk))
		return true
	}) as typeof process.stdout.write
	try {
		seed(dir, '.agents/specs/sdd/spec.md', 'status: approved')
		seed(dir, '.agents/specs/aced/spec.md', 'status: approved')
		assert.equal(main(['--root', dir, '--resolve', 'aced']), 0)
		const out = writes.join('')
		assert.match(out, /specs\[1\]/)
		assert.match(out, /\.agents\/specs\/aced,aced/)
		assert.doesNotMatch(out, /sdd/)
	} finally {
		process.stdout.write = original
		rmSync(dir, { recursive: true, force: true })
	}
})
