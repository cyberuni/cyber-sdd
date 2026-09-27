import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { check, discoverDefinitions, main, type ParsedDefinition, parseDefinition } from './check-field-mandates.mts'

// One verification per frozen scenario in
// .agents/specs/sdd/plugin/check-field-mandates/check-field-mandates.feature —
// test names mirror scenario titles verbatim.
//
// Verification level: BOUNDARY for every scenario — a real temp tree, the engine's own discovery,
// parsing and reporting, driven through the CLI with only the process boundary (argv, cwd, the two
// output streams) stubbed. Every frozen `Then` is a claim about what the check SAYS and what the run
// EXITS with, so asserting an in-memory finding array would bind one level below the contract.
// The `root check chain` scenario is verified against the repo's real root manifest.
//
// The subject is itself a verification instrument, so a MUTATION SWEEP closes the file: each
// mutant is a plausible wrong implementation, and at least one scenario must catch it.

function withTree<T>(fn: (dir: string) => T): T {
	const dir = mkdtempSync(join(tmpdir(), 'cfm-'))
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

const fence = (...lines: string[]) => ['```', ...lines, '```'].join('\n')

/** A definition file: a heading, then the given body. */
const def = (...body: string[]) => ['# Definition', '', ...body, ''].join('\n')

const AGENT = 'plugins/demo/agents/demo-agent.md'
const SKILL = 'plugins/demo/skills/demo-skill/SKILL.md'
const OTHER = 'plugins/demo/agents/other-agent.md'
/** A definition that makes BLOCKER a known field, and explains it. */
const BLOCKER_OWNER = def(fence('BLOCKER: why it stopped'))

function captureMain(argv: string[], cwd?: string): { code: number; out: string; err: string } {
	const realOut = process.stdout.write.bind(process.stdout)
	const realErr = process.stderr.write.bind(process.stderr)
	const realCwd = process.cwd()
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
		if (cwd) process.chdir(cwd)
		return { code: main(argv), out, err }
	} finally {
		process.chdir(realCwd)
		process.stdout.write = realOut
		process.stderr.write = realErr
	}
}

/** Run the check exactly as the contract names it — through the CLI, over a real tree. */
function run(dir: string) {
	return captureMain(['--root', dir])
}

/** The report lines naming one file — what the check says against that definition. */
function linesFor(out: string, file: string): string[] {
	return out.split('\n').filter((l) => l.includes(`${file}:`))
}

// ── UC1 — check every shipped definition in the tree ──

test('a declared field nothing explains is reported unexplained', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE'), '', 'Set WORK_MODE before you start.'))
		const r = run(dir)
		const lines = linesFor(r.out, AGENT)
		assert.ok(
			lines.some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:4 TARGET_PATH`)),
			r.out,
		)
		assert.ok(!lines.some((l) => /\bWORK_MODE\b/.test(l)), r.out)
		assert.equal(r.code, 1)
	}))

test('a field glossed on its own declaration is explained', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('RETRY_COUNT: how many attempts ran')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a gloss on the line after a declaration explains it', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('SUBJECT:', '<the full text under evaluation>')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('the next declaration ends a gloss', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('SUBJECT:', 'WORK_MODE: the run mode')))
		const r = run(dir)
		const lines = linesFor(r.out, AGENT)
		assert.ok(
			lines.some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:4 SUBJECT`)),
			r.out,
		)
		assert.ok(!lines.some((l) => /\bWORK_MODE\b/.test(l)), r.out)
		assert.equal(r.code, 1)
	}))

test('a gloss after a comma list explains every field in it', () =>
	withTree((dir) => {
		write(
			dir,
			AGENT,
			def(
				fence('STATUS: done or failed', 'TARGET_PATH, WORK_MODE, RUN_ID: the target, the run mode and the run'),
				'',
				'Pick the `WORK_MODE` first.',
			),
		)
		write(dir, OTHER, def(fence('WORK_MODE: a mode')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a lone token on a block line glosses the declaration before it', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('SUBJECT:', 'RUN_ID')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a lone token opening a block declares nothing', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('RUN_ID', 'STATUS: done or failed')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a gloss stops at the end of its block', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('SUBJECT:'), 'The run reads its input and reports back.'))
		const r = run(dir)
		assert.ok(
			linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:4 SUBJECT`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('a field is named in the prose only as a whole word', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('MODE, RUN_ID'), '', 'Set WORK_MODE, then note RUN_ID.'))
		const r = run(dir)
		const lines = linesFor(r.out, AGENT)
		assert.ok(
			lines.some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:4 MODE`)),
			r.out,
		)
		assert.ok(!lines.some((l) => /\bRUN_ID\b/.test(l)), r.out)
		assert.equal(r.code, 1)
	}))

test('a field named only in the frontmatter is unexplained', () =>
	withTree((dir) => {
		write(
			dir,
			AGENT,
			[
				'---',
				'description: mentions RUN_ID here',
				'---',
				'# Definition',
				'',
				fence('RUN_ID, WORK_MODE'),
				'',
				'Set WORK_MODE.',
				'',
			].join('\n'),
		)
		const r = run(dir)
		assert.ok(
			linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:7 RUN_ID`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test("a comment after a declaration's colon explains it", () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('RUN_ID:   # the run being judged')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a bare field the prose names is explained', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE'), '', 'Read TARGET_PATH under WORK_MODE.'))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a list-item declaration declares every bold field it opens with', () =>
	withTree((dir) => {
		write(
			dir,
			AGENT,
			def(
				fence('STATUS: done or failed'),
				'',
				'- **FEATURE_PATH** + **SCENARIO** — the suite and one scenario in it',
				'',
				'Open `FEATURE_PATH` and find `SCENARIO` in it.',
			),
		)
		write(dir, OTHER, def(fence('FEATURE_PATH: a path', 'SCENARIO: a name')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a list-item declaration with nothing after its bold lead is unexplained', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('STATUS: done or failed'), '', '- **RUN_ID**'))
		const r = run(dir)
		assert.ok(
			linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && l.includes(`${AGENT}:7 RUN_ID`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test("a code span in a list item's gloss is a mandate like any other", () =>
	withTree((dir) => {
		write(
			dir,
			AGENT,
			def(fence('STATUS: done or failed'), '', '- **RUN_ID** — the run, or a `BLOCKER` when none started'),
		)
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.ok(
			linesFor(r.out, AGENT).some((l) => /undeclared/.test(l) && l.includes(`${AGENT}:7 BLOCKER`)),
			r.out,
		)
		assert.ok(!linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && /\bRUN_ID\b/.test(l)), r.out)
		assert.equal(r.code, 1)
	}))

test('a fenced block tagged text is a structured block', () =>
	withTree((dir) => {
		write(dir, AGENT, def('```text', 'TARGET_PATH, WORK_MODE', '```'))
		const r = run(dir)
		const lines = linesFor(r.out, AGENT)
		assert.ok(
			lines.some((l) => /unexplained/.test(l) && /\bTARGET_PATH\b/.test(l)),
			r.out,
		)
		assert.ok(
			lines.some((l) => /unexplained/.test(l) && /\bWORK_MODE\b/.test(l)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test("a declared token's plural suffix declares the bare token", () =>
	withTree((dir) => {
		write(
			dir,
			SKILL,
			def(fence('STATUS: done or failed', 'NODE_PATH(s): the node folders'), '', 'Open each `NODE_PATH` in turn.'),
		)
		write(dir, OTHER, def(fence('NODE_PATH: a node folder')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a line in a fenced block tagged with a language declares nothing', () =>
	withTree((dir) => {
		write(dir, AGENT, def('```yaml', 'ORPHAN_KEY: 1', '```', '', fence('STATUS: done or failed')))
		write(dir, OTHER, def(fence('STATUS: done or failed'), '', 'Leave `ORPHAN_KEY` alone.'))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, AGENT), [])
		assert.deepEqual(linesFor(r.out, OTHER), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a field the prose mandates and no block declares is reported undeclared', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed'), '', 'When stuck, return a `BLOCKER`.'))
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.ok(
			linesFor(r.out, SKILL).some((l) => /undeclared/.test(l) && l.includes(`${SKILL}:7 BLOCKER`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('a field the prose mandates and a block declares passes', () =>
	withTree((dir) => {
		write(
			dir,
			SKILL,
			def(fence('STATUS: done or failed', 'BLOCKER: why it stopped'), '', 'When stuck, return a `BLOCKER`.'),
		)
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a field named in the singular resolves to its plural declaration', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('CONTENT_GAPS: the gaps found'), '', 'Record each as a `CONTENT_GAP`.'))
		write(dir, OTHER, def(fence('CONTENT_GAP: one gap')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a field named in the plural resolves to its singular declaration', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('CONTENT_GAP: one gap'), '', 'Collect them into `CONTENT_GAPS`.'))
		write(dir, OTHER, def(fence('CONTENT_GAPS: the gaps found')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a code span that does not open with a field is not a mandate', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed'), '', 'Check `see BLOCKER` for the wording.'))
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a single capital letter is not a field', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed'), '', 'Pick `A` first.'))
		write(dir, OTHER, def(fence('STATUS: done or failed', 'A: the first option')))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.deepEqual(linesFor(r.out, OTHER), [])
		assert.equal(r.code, 0, r.out)
	}))

test('an uppercase code span that is no field is not a mandate', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed'), '', 'Leave no `TODO` behind.'))
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a field named outside a code span is not a mandate', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed'), '', 'A judge may answer BLOCKER instead of a score.'))
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('a definition that declares no field is not held to one', () =>
	withTree((dir) => {
		write(dir, SKILL, def('Read the judge report; a `BLOCKER` means it measured nothing.'))
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('an ignore marker with a reason excuses its line', () =>
	withTree((dir) => {
		write(
			dir,
			SKILL,
			def(
				fence('STATUS: done or failed'),
				'',
				"A judge may emit `BLOCKER` instead. <!-- field-mandate-ignore: the judge's field, not ours -->",
			),
		)
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.deepEqual(linesFor(r.out, SKILL), [])
		assert.equal(r.code, 0, r.out)
	}))

test('an ignore marker excuses only its own line', () =>
	withTree((dir) => {
		write(
			dir,
			SKILL,
			def(
				fence('STATUS: done or failed'),
				'',
				'A judge may emit `BLOCKER` instead.',
				'Unrelated note. <!-- field-mandate-ignore: an unrelated note -->',
			),
		)
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.ok(
			linesFor(r.out, SKILL).some((l) => /undeclared/.test(l) && l.includes(`${SKILL}:7 BLOCKER`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('an ignore marker without a reason excuses nothing', () =>
	withTree((dir) => {
		write(
			dir,
			SKILL,
			def(fence('STATUS: done or failed'), '', 'A judge may emit `BLOCKER` instead. <!-- field-mandate-ignore -->'),
		)
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		assert.ok(
			linesFor(r.out, SKILL).some((l) => /undeclared/.test(l) && l.includes(`${SKILL}:7 BLOCKER`)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('every mismatch in every definition is reported in one run', () =>
	withTree((dir) => {
		const nested = 'plugins/demo/skills/group/deeper/SKILL.md'
		write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE')))
		write(dir, nested, def(fence('STATUS: done or failed'), '', 'When stuck, return a `BLOCKER`.'))
		write(dir, OTHER, BLOCKER_OWNER)
		const r = run(dir)
		const agent = linesFor(r.out, AGENT)
		assert.ok(
			agent.some((l) => /unexplained/.test(l) && /\bTARGET_PATH\b/.test(l)),
			r.out,
		)
		assert.ok(
			agent.some((l) => /unexplained/.test(l) && /\bWORK_MODE\b/.test(l)),
			r.out,
		)
		assert.ok(
			linesFor(r.out, nested).some((l) => /undeclared/.test(l) && /\bBLOCKER\b/.test(l)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('a markdown file that is not a definition is not read', () =>
	withTree((dir) => {
		write(dir, SKILL, def(fence('STATUS: done or failed')))
		write(dir, 'plugins/demo/skills/demo-skill/README.md', def(fence('TARGET_PATH, WORK_MODE')))
		write(dir, 'plugins/demo/agents/nested/deep.md', def(fence('TARGET_PATH, WORK_MODE')))
		write(dir, 'plugins/demo/notskills/foo/SKILL.md', def(fence('TARGET_PATH, WORK_MODE')))
		const r = run(dir)
		assert.doesNotMatch(r.out, /unexplained|undeclared/)
		assert.equal(r.code, 0, r.out)
	}))

test('a tree with no definition passes', () =>
	withTree((dir) => {
		write(dir, 'plugins/demo/package.json', '{"name":"demo"}')
		const r = run(dir)
		assert.match(r.out, /no skill or agent definition found/)
		assert.equal(r.code, 0)
	}))

test('with no root flag the check reads the working directory', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE')))
		const r = captureMain([], dir)
		assert.ok(
			linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && /\bTARGET_PATH\b/.test(l)),
			r.out,
		)
		assert.equal(r.code, 1)
	}))

test('the check reads the tree it is pointed at, not the working directory', () =>
	withTree((dir) =>
		withTree((elsewhere) => {
			write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE: ignored', 'LONE_FIELD, OTHER_FIELD')))
			write(elsewhere, AGENT, def(fence('CLEAN_FIELD: explained')))
			const r = captureMain(['--root', dir], elsewhere)
			assert.ok(
				linesFor(r.out, AGENT).some((l) => /unexplained/.test(l) && /\bLONE_FIELD\b/.test(l)),
				r.out,
			)
			assert.equal(r.code, 1)
		}),
	))

test('a root that is not a directory fails instead of passing clean', () =>
	withTree((dir) => {
		const file = join(dir, 'not-a-dir.txt')
		writeFileSync(file, 'x')
		const r = captureMain(['--root', file])
		assert.ok(r.err.includes(file), r.err)
		assert.doesNotMatch(r.out, /OK|no skill or agent definition/)
		assert.equal(r.code, 1)
	}))

test('an unrecognized flag fails loudly instead of being ignored', () =>
	withTree((dir) => {
		write(dir, AGENT, def(fence('TARGET_PATH, WORK_MODE')))
		const r = captureMain(['--strict', '--root', dir])
		assert.match(r.err, /--strict/)
		assert.deepEqual(linesFor(r.out + r.err, AGENT), [])
		assert.equal(r.code, 1)
	}))

// ── The repo's own chain ──

test('the root check chain runs the field-mandate check', () => {
	const repoRoot = join(import.meta.dirname, '..', '..', '..', '..', '..')
	const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
		scripts: Record<string, string>
	}
	const verify = manifest.scripts.verify ?? ''
	const invoked = Object.entries(manifest.scripts).some(
		([name, body]) =>
			body.includes('check-field-mandates/scripts/check-field-mandates.mts') &&
			(verify.includes(`pnpm ${name}`) || verify.includes('check-field-mandates.mts')),
	)
	assert.ok(invoked, 'verify must invoke the field-mandate check')
})

// ── Mutation sweep ──
//
// Each mutant is a plausible wrong implementation of one rule, built by feeding the engine's own
// parse output through a deliberately broken variant. A mutant that no scenario could catch would
// mean the rule is stated but unbound.

function parsedOf(files: Record<string, string>): Map<string, ParsedDefinition> {
	return new Map(Object.entries(files).map(([f, t]) => [f, parseDefinition(t)]))
}

test('mutation: dropping the gloss rule makes a glossed field unexplained', () => {
	const parsed = parsedOf({ [AGENT]: def(fence('RETRY_COUNT: how many attempts ran')) })
	assert.deepEqual(check(parsed), [])
	for (const p of parsed.values()) for (const d of p.declarations) d.glossed = false
	assert.equal(check(parsed).length, 1)
})

test('mutation: treating every uppercase code span as a mandate reports TODO', () => {
	const parsed = parsedOf({ [SKILL]: def(fence('STATUS: done or failed'), '', 'Leave no `TODO` behind.') })
	assert.deepEqual(check(parsed), [])
	assert.ok(parsed.get(SKILL)?.mandates.some((m) => m.token === 'TODO'))
})

test('discovery reads only the two definition locations', () =>
	withTree((dir) => {
		write(dir, AGENT, 'x')
		write(dir, 'plugins/demo/skills/demo-skill/SKILL.md', 'x')
		write(dir, 'plugins/demo/skills/demo-skill/README.md', 'x')
		write(dir, 'plugins/demo/agents/nested/deep.md', 'x')
		write(dir, 'plugins/demo/skills/SKILL.md', 'x')
		write(dir, 'docs/agents/x.md', 'x')
		assert.deepEqual(discoverDefinitions(dir), [AGENT, 'plugins/demo/skills/demo-skill/SKILL.md'])
	}))

// ── Parse details bound here, not in the acceptance suite ──

test('a field is named as a whole word, not a substring', () => {
	const parsed = parsedOf({ [AGENT]: def(fence('MODE, OTHER_FIELD'), '', 'Set WORK_MODE and OTHER_FIELD.') })
	assert.deepEqual(
		check(parsed).map((f) => f.token),
		['MODE'],
	)
})

test('a SKILL.md outside a plugin skills directory is not a definition', () =>
	withTree((dir) => {
		write(dir, '.agents/skills/x/SKILL.md', def(fence('TARGET_PATH, WORK_MODE')))
		assert.deepEqual(discoverDefinitions(dir), [])
	}))
