import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	discoverManifests,
	extractPointers,
	type Finding,
	filesCovers,
	formatReport,
	main,
	pluginRootOf,
	sweep,
} from './check-plugin-manifests.mts'

// One verification per frozen scenario in
// .agents/specs/sdd/plugin/check-plugin-manifests/check-plugin-manifests.feature —
// test names mirror scenario titles verbatim.
//
// Verification level: BOUNDARY for every scenario — a real temp filesystem, the engine's own
// discovery and reporting, only the process boundary (argv, cwd) stubbed. The subject is a
// filesystem guard, so a fixture tree is the honest apparatus; mocking `fs` would verify the mock.
// The `root check chain` scenario is the one exception, verified against the repo's real manifest.
//
// The subject is itself a verification instrument, so the cold-instrument doctrine makes a
// MUTATION SWEEP the primary method — see the final block. Reading the engine is supplementary.

function withTree<T>(fn: (dir: string) => T): T {
	const dir = mkdtempSync(join(tmpdir(), 'cpm-'))
	try {
		return fn(dir)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

function write(dir: string, rel: string, contents: string): void {
	const full = join(dir, rel)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, contents)
}

function manifest(dir: string, rel: string, body: Record<string, unknown>): void {
	write(dir, rel, JSON.stringify(body, null, 2))
}

function pkg(dir: string, rel: string, body: Record<string, unknown>): void {
	write(dir, rel, JSON.stringify(body, null, 2))
}

/** Run the CLI capturing both streams — the only way to bind a `Then` about what it *says*. */
function captureMain(argv: string[]): { code: number; out: string; err: string } {
	const realOut = process.stdout.write.bind(process.stdout)
	const realErr = process.stderr.write.bind(process.stderr)
	let out = ''
	let err = ''
	process.stdout.write = ((c: string) => {
		out += c
		return true
	}) as typeof process.stdout.write
	process.stderr.write = ((c: string) => {
		err += c
		return true
	}) as typeof process.stderr.write
	try {
		return { code: main(argv), out, err }
	} finally {
		process.stdout.write = realOut
		process.stderr.write = realErr
	}
}

/**
 * Run the guard exactly as the contract names it — through the CLI, over a real tree.
 *
 * Every frozen `When` is "the guard runs" and every `Then` is a claim about what the guard SAYS
 * and what the RUN exits with. Asserting `sweep()`'s in-memory array instead binds the engine one
 * level below the contract's subject: a guard that computes the right findings and then prints
 * nothing, prints them to the wrong stream, or exits zero anyway would pass.
 */
function guard(dir: string): { code: number; out: string; err: string } {
	return captureMain(['--root', dir])
}

/** The in-memory sweep — for inner-layer tests only, never for a frozen scenario. */
function run(dir: string): Finding[] {
	return sweep(dir, discoverManifests(dir))
}

// ── UC1 — check every plugin manifest in the tree ──

test('a manifest pointer that resolves to nothing fails the check', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', widgets: './widgets' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /p\/\.plugin\/plugin\.json/, 'names the manifest')
		assert.match(out, /\[widgets\]/, 'names the key')
		assert.match(out, /\.\/widgets/, 'names the pointer')
		assert.match(out, /unresolved/)
		assert.match(out, /1 finding\(s\)/)
	})
})

test('a dead pointer in a generated vendor manifest is caught too', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.claude-plugin/plugin.json', { name: 'p', widgets: './widgets' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /p\/\.claude-plugin\/plugin\.json/, 'names the vendor manifest')
		assert.match(out, /unresolved/)
		assert.match(out, /1 finding\(s\)/)
	})
})

test('a pointer under a component key the guard does not know is checked the same way', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', prompts: './prompts' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /\[prompts\]/, 'names the key it does not know')
		assert.match(out, /unresolved/)
	})
})

test('pointers that resolve pass, whichever manifest location they sit at', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		const body = { name: 'p', skills: './skills', homepage: 'https://example.invalid/p' }
		manifest(dir, 'p/.plugin/plugin.json', body)
		manifest(dir, 'p/.claude-plugin/plugin.json', body)
		const { code, out } = guard(dir)
		assert.equal(code, 0, 'a clean tree exits zero')
		assert.match(out, /2 manifest\(s\) OK/)
	})
})

test('a package marked private has its files allowlist left unread', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true, files: ['other'] })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 0, 'a clean tree exits zero')
		assert.match(out, /1 manifest\(s\) OK/)
	})
})

test('a package that declares no files allowlist has its publish check skipped', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p' })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 0, 'a clean tree exits zero')
		assert.match(out, /1 manifest\(s\) OK/)
	})
})

test('a package that publishes and will not ship a declared component fails', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', files: ['dist'] })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /unpublished/, 'names it as declared but unpublished')
		assert.match(out, /\.\/skills/)
		assert.match(out, /1 finding\(s\)/)
	})
})

test('a package that publishes everything it declares passes', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', files: ['skills'] })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 0, 'a clean tree exits zero')
		assert.match(out, /1 manifest\(s\) OK/)
	})
})

test('a pointer dead on disk is reported once, not again as unpublished', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', files: ['dist'] })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /1 finding\(s\)/, 'exactly one finding, not one per sub-check')
		assert.match(out, /unresolved/)
		assert.doesNotMatch(out, /unpublished/, 'no separate unpublished finding for that pointer')
	})
})

test('an unparseable manifest fails instead of being skipped', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		write(dir, 'p/.plugin/plugin.json', '{ this is not json')
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /unreadable/)
		assert.match(out, /p\/\.plugin\/plugin\.json/, 'names THAT manifest, not some other file')
	})
})

test('every dead pointer within one manifest is reported', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', widgets: './widgets', gadgets: './gadgets' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /\.\/widgets/, 'names the first')
		assert.match(out, /\.\/gadgets/, 'names the second')
		assert.match(out, /2 finding\(s\)/)
	})
})

test('every dead pointer is reported, not only the first', () => {
	withTree((dir) => {
		pkg(dir, 'a/package.json', { name: 'a', private: true })
		pkg(dir, 'b/package.json', { name: 'b', private: true })
		manifest(dir, 'a/.plugin/plugin.json', { name: 'a', widgets: './widgets' })
		manifest(dir, 'b/.plugin/plugin.json', { name: 'b', gadgets: './gadgets' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /a\/\.plugin\/plugin\.json/)
		assert.match(out, /b\/\.plugin\/plugin\.json/)
		assert.match(out, /2 finding\(s\)/)
	})
})

test('the sweep continues past an unparseable manifest', () => {
	withTree((dir) => {
		pkg(dir, 'a/package.json', { name: 'a', private: true })
		pkg(dir, 'b/package.json', { name: 'b', private: true })
		// 'a/...' sorts before 'b/...', so the unparseable one is reached first.
		write(dir, 'a/.plugin/plugin.json', 'not json at all')
		manifest(dir, 'b/.plugin/plugin.json', { name: 'b', widgets: './widgets' })
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /unreadable\s+a\/\.plugin\/plugin\.json/, 'names the unreadable one')
		assert.match(out, /unresolved\s+b\/\.plugin\/plugin\.json/, 'and reaches the one after it')
		assert.ok(
			out.indexOf('a/.plugin/plugin.json') < out.indexOf('b/.plugin/plugin.json'),
			'the unreadable manifest really is the one scanned FIRST — otherwise nothing follows it and the scenario stops exercising itself',
		)
		assert.match(out, /2 finding\(s\)/)
	})
})

test('a tree with no plugin manifest passes', () => {
	withTree((dir) => {
		pkg(dir, 'package.json', { name: 'root' })
		const { code, out } = guard(dir)
		assert.equal(code, 0)
		assert.match(out, /no plugin manifest found/)
	})
})

test('the guard checks the tree it is pointed at, not the working directory', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', widgets: './widgets' })
		const cwd = process.cwd()
		const elsewhere = mkdtempSync(join(tmpdir(), 'cpm-cwd-'))
		try {
			process.chdir(elsewhere)
			const named = captureMain(['--root', dir])
			assert.equal(named.code, 1, 'the named tree is checked, not the working directory')
			assert.match(named.out, /p\/\.plugin\/plugin\.json/, 'names the manifest')
			assert.match(named.out, /\[widgets\]/, 'names the key')
			assert.match(named.out, /\.\/widgets/, 'names the pointer')
			const bare = captureMain([])
			assert.equal(bare.code, 0, 'the working directory holds no manifest')
			assert.match(bare.out, /no plugin manifest found/)
		} finally {
			process.chdir(cwd)
			rmSync(elsewhere, { recursive: true, force: true })
		}
	})
})

test('an unrecognized flag fails loudly instead of being ignored', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		// The pointer RESOLVES, so an engine that ignored the flag would exit 0. A fixture carrying a
		// dead pointer cannot tell rejection from ignoring — both exit 1.
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		const { code, out, err } = captureMain(['--root', dir, '--check'])
		assert.equal(code, 1, 'an undefined flag is an error, not an input to ignore')
		assert.match(err, /--check/, 'it names the unrecognized flag')
		assert.equal(out, '', 'exits without checking any manifest')
	})
})

// ── The repo's own chain ──

test('the root check chain runs the manifest guard', () => {
	// Verification level: the repo's real root manifest. The promise to an installer is that the
	// chain guarding commits invokes the guard; only the real chain can settle that.
	const root = new URL('../../../../../package.json', import.meta.url)
	const scripts = (JSON.parse(readFileSync(root, 'utf8')) as { scripts: Record<string, string> }).scripts
	assert.match(scripts.verify ?? '', /check:plugins/, 'verify chain invokes the manifest guard')
	assert.match(scripts['check:plugins'] ?? '', /check-plugin-manifests/, 'check:plugins runs this engine')
})

// ── Mutation sweep — the primary method for an instrument subject ──
//
// Each entry names a plausible wrong implementation and the scenario that must catch it. A guard
// that survives every mutation here is not being measured by its suite.

test('mutation sweep: each plausible wrong subject loses to a distinct scenario', () => {
	withTree((dir) => {
		// hardcoded key list — misses a component key it does not know
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', prompts: './prompts' })
		const known = ['commands', 'skills', 'agents']
		const body: unknown = JSON.parse(readFileSync(join(dir, 'p/.plugin/plugin.json'), 'utf8'))
		const hardcoded = extractPointers(body).filter((p) => known.includes(p.key))
		assert.equal(hardcoded.length, 0, 'the hardcoding subject sees nothing')
		assert.equal(run(dir).length, 1, 'the value-shape rule catches it')
	})

	withTree((dir) => {
		// absent `files` read as an empty allowlist — inverts npm's semantic
		pkg(dir, 'p/package.json', { name: 'p' })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', skills: './skills' })
		assert.equal(filesCovers([], './skills'), false, 'an empty allowlist covers nothing')
		assert.deepEqual(run(dir), [], 'but an absent allowlist is not an empty one')
	})

	withTree((dir) => {
		// manifest-dir-relative resolution — would break every vendor manifest
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/.claude-plugin/plugin.json', { name: 'p', skills: './skills' })
		assert.equal(pluginRootOf('p/.claude-plugin/plugin.json'), 'p', 'resolves against the plugin root')
		assert.notEqual(pluginRootOf('p/.claude-plugin/plugin.json'), 'p/.claude-plugin')
		assert.deepEqual(run(dir), [], 'the vendor manifest is not falsely reported')
	})

	withTree((dir) => {
		// a symlinked vendor manifest is a real path an installer resolves — reported by path
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', widgets: './widgets' })
		mkdirSync(join(dir, 'p/.codex-plugin'), { recursive: true })
		symlinkSync('../.plugin/plugin.json', join(dir, 'p/.codex-plugin/plugin.json'))
		const findings = run(dir)
		assert.equal(findings.length, 2, 'both paths are reported, not deduped to the inode')
	})
})

// ── Inner layer — the deterministic rules the per-scenario duty does not reach ──
//
// Separate from the one-check-per-scenario duty above: these bind rules the engine implements
// that no frozen scenario names. Array traversal is the load-bearing one — 12 real pointers in
// this repo ride in `agents: [...]` arrays, and removing array recursion leaves every
// per-scenario test green while silently dropping all of them.

test('extractPointers walks arrays — the shape 12 real pointers in this repo use', () => {
	const found = extractPointers({ agents: ['./agents/a.md', './agents/b.md'], skills: './skills' })
	assert.deepEqual(found.map((p) => p.pointer).sort(), ['./agents/a.md', './agents/b.md', './skills'])
	assert.deepEqual(found.filter((p) => p.key === 'agents').length, 2, 'each array element keeps the key it sits under')
})

test('extractPointers walks nested objects', () => {
	const found = extractPointers({ outer: { inner: './deep' } })
	assert.deepEqual(found, [{ key: 'inner', pointer: './deep' }])
})

test('extractPointers ignores a string that is not a relative path', () => {
	const found = extractPointers({ name: 'p', homepage: 'https://example.invalid/p', repository: 'git@x:y.git' })
	assert.deepEqual(found, [], 'only a ./-prefixed value is a pointer')
})

test('a dead pointer inside an array is caught end to end', () => {
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		mkdirSync(join(dir, 'p/agents'), { recursive: true })
		writeFileSync(join(dir, 'p/agents/present.md'), '')
		manifest(dir, 'p/.plugin/plugin.json', { name: 'p', agents: ['./agents/present.md', './agents/absent.md'] })
		const findings = run(dir)
		assert.equal(findings.length, 1)
		assert.equal(findings[0]?.pointer, './agents/absent.md')
	})
})

test('filesCovers reads an exclusion as an exclusion', () => {
	assert.equal(filesCovers(['!dist'], './dist'), false, 'an exclusion does not include')
	assert.equal(filesCovers(['dist', '!dist/**/*.test.*'], './dist'), true, 'the include still includes')
})

test('filesCovers matches an allowlist entry however it spells the path', () => {
	// A `files` entry may legitimately be written `./skills`; comparing raw against a `./`-prefixed
	// pointer reports a genuinely shipped component as unpublished.
	assert.equal(filesCovers(['./skills'], './skills'), true)
	assert.equal(filesCovers(['skills'], './skills'), true)
})

test('the root flag with no directory is an error, not a silent default', () => {
	const { code, err } = captureMain(['--root'])
	assert.equal(code, 1)
	assert.match(err, /--root/)
})

test('the report names the manifest, the key and the pointer', () => {
	// The per-scenario tests assert the Finding record; this binds the rendered row those
	// scenarios' "it names the manifest, the key, and the pointer" clauses are actually about.
	const rendered = formatReport(
		['p/.plugin/plugin.json'],
		[
			{
				kind: 'unresolved',
				manifest: 'p/.plugin/plugin.json',
				key: 'widgets',
				pointer: './widgets',
				detail: 'names no path on disk',
			},
		],
	)
	assert.match(rendered, /p\/\.plugin\/plugin\.json/)
	assert.match(rendered, /widgets/)
	assert.match(rendered, /\.\/widgets/)
})

test('filesCovers reads a wildcard allowlist as covering everything', () => {
	// A glob-only allowlist ships every path; reading it literally manufactures an unpublished
	// finding against a package that in fact ships the component.
	assert.equal(filesCovers(['*'], './skills'), true)
	assert.equal(filesCovers(['**'], './agents/a.md'), true)
})

test('filesCovers matches on the leading segment, not the whole path', () => {
	// 12 real pointers in this repo are `./agents/<file>.md` against a files entry of `agents`.
	assert.equal(filesCovers(['agents'], './agents/a.md'), true)
	assert.equal(filesCovers(['agents'], './skills'), false, 'a different segment is not covered')
})

test('a package-root manifest is discovered, not only a vendor-directory one', () => {
	// `packages/cyber-sdd/plugin.json` is 1 of this repo's 11 live manifests and sits beside its
	// package.json rather than inside a vendor directory.
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		manifest(dir, 'p/plugin.json', { name: 'p', widgets: './widgets' })
		assert.deepEqual(discoverManifests(dir), ['p/plugin.json'])
		const { code, out } = guard(dir)
		assert.equal(code, 1)
		assert.match(out, /p\/plugin\.json/)
	})
})

test('a plugin.json that is neither in a vendor directory nor beside a package.json is not a manifest', () => {
	withTree((dir) => {
		manifest(dir, 'stray/plugin.json', { name: 'x', widgets: './widgets' })
		assert.deepEqual(discoverManifests(dir), [], 'the positive companion to the discovery rule')
	})
})

test('a package-root manifest resolves its pointers against the package, not its parent', () => {
	// The discovery test above uses a dead pointer, which cannot tell the two plugin-root rules
	// apart. A RESOLVING pointer can: treating a package-root manifest like a one-level-down one
	// resolves against the tree root instead, and reports a shipped component as missing.
	withTree((dir) => {
		pkg(dir, 'p/package.json', { name: 'p', private: true })
		mkdirSync(join(dir, 'p/skills'), { recursive: true })
		manifest(dir, 'p/plugin.json', { name: 'p', skills: './skills' })
		const { code, out } = guard(dir)
		assert.equal(code, 0, 'a package-root manifest resolves against its own directory')
		assert.match(out, /1 manifest\(s\) OK/)
	})
})

test('a flag that merely starts with a defined flag name is still unrecognized', () => {
	// The near-miss the flag scenario admits no fixture for: prefix-matching `--root` would accept
	// `--rooty` and then silently scan the wrong tree.
	const near = captureMain(['--rooty', '.'])
	assert.equal(near.code, 1)
	assert.match(near.err, /--rooty/)
})

test('manifests are discovered in a deterministic, path-sorted order', () => {
	// A documented promise the report order depends on — the unparseable-sweep scenario stops
	// exercising itself if discovery order flips.
	withTree((dir) => {
		for (const n of ['c', 'a', 'b']) {
			pkg(dir, `${n}/package.json`, { name: n, private: true })
			manifest(dir, `${n}/.plugin/plugin.json`, { name: n })
		}
		assert.deepEqual(discoverManifests(dir), [
			'a/.plugin/plugin.json',
			'b/.plugin/plugin.json',
			'c/.plugin/plugin.json',
		])
	})
})
