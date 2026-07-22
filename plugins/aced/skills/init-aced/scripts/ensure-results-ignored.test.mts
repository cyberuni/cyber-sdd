// Verification for ignore-run-output — one check per frozen scenario (9), each constructing a
// temp git repo fixture exhibiting that scenario's Given and asserting its Then against the
// engine at plugins/aced/skills/init-aced/scripts/ensure-results-ignored.mts.
//
// Includes mutation controls (per the README's "no post-write verification branch" guarantee):
//   - the negation-override scenario asserts the appended rule is the LAST matching line (not just
//     present anywhere) — an impl that inserted the rule before the negation would pass a
//     presence-only check but still leave the path un-ignored;
//   - the idempotence scenario asserts EXACTLY one matching rule remains after two runs — an
//     unconditional-append impl (skipping the already-ignored check) would produce two and fail.
//
// Run by the impl-judge; plain `node --test` strips the types (node >= 22.6 --experimental-strip-types,
// node >= 24 natively).

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { ensureResultsIgnored, isIgnored, RESULTS_DIR_RULE, resolveRepoRoot } from './ensure-results-ignored.mts'

const PROBE = '.agents/aced/results/some-run.json'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'ignore-run-output-'))
}

function initRepo(dir: string): void {
	execFileSync('git', ['-C', dir, 'init', '-q'])
}

function gitignorePath(dir: string): string {
	return join(dir, '.gitignore')
}

function readGitignore(dir: string): string {
	return readFileSync(gitignorePath(dir), 'utf8')
}

// True when `line` is a matching rule for the results directory (verbatim or the exact rule).
function isMatchingRule(line: string): boolean {
	return line.trim() === RESULTS_DIR_RULE.trim() || line.trim() === RESULTS_DIR_RULE.trim().replace(/\/$/, '')
}

test('Scenario: an absent gitignore is created carrying the rule', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		assert.equal(existsSync(gitignorePath(dir)), false)
		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok && r.changed)
		assert.ok(existsSync(gitignorePath(dir)))
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: a gitignore missing the rule gains it', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		writeFileSync(gitignorePath(dir), 'node_modules/\n')
		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok && r.changed)
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: existing gitignore lines are left unchanged', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		writeFileSync(gitignorePath(dir), 'node_modules/\ndist/\n')
		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok && r.changed)
		const lines = readGitignore(dir)
			.split('\n')
			.filter((l) => l.length > 0)
		assert.deepEqual(lines.slice(0, 2), ['node_modules/', 'dist/'])
		// the new rule was added AFTER them
		const ruleIdx = lines.findIndex((l) => isMatchingRule(l))
		assert.ok(ruleIdx > 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: an already-ignored path adds no duplicate', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		writeFileSync(gitignorePath(dir), '.agents/\n')
		const before = readGitignore(dir)
		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok && !r.changed)
		assert.equal(readGitignore(dir), before) // byte-for-byte unchanged
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: an earlier un-ignore of the path is overridden by the appended rule', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		// ignore everything under .agents/aced/, then re-include the results dir specifically —
		// so BEFORE the engine runs, the probe path is NOT ignored (negation wins so far).
		writeFileSync(gitignorePath(dir), '.agents/aced/**\n!.agents/aced/results/\n!.agents/aced/results/**\n')
		assert.equal(isIgnored(dir, PROBE), false)

		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok && r.changed)

		// MUTATION CONTROL: the appended rule must be the LAST matching line, not merely present —
		// an impl that inserted it before the negation would leave the path un-ignored.
		const lines = readGitignore(dir)
			.split('\n')
			.filter((l) => l.length > 0)
		const lastLine = lines[lines.length - 1]
		assert.ok(isMatchingRule(lastLine ?? ''), `expected last line to be the results rule, got: ${lastLine}`)
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: the results directory is git-ignored after the engine runs', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		// any starting state that reaches the write — here, no gitignore at all
		const r = ensureResultsIgnored(dir)
		assert.ok(r.ok)
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: a second run leaves exactly one matching rule', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		const first = ensureResultsIgnored(dir)
		assert.ok(first.ok && first.changed)

		const second = ensureResultsIgnored(dir)
		assert.ok(second.ok && !second.changed)

		// MUTATION CONTROL: an unconditional-append impl (skipping the already-ignored gate) would
		// leave TWO matching lines here instead of one.
		const matching = readGitignore(dir)
			.split('\n')
			.filter((l) => isMatchingRule(l))
		assert.equal(matching.length, 1)
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: outside a git repository it fails closed', () => {
	const dir = tmp()
	try {
		// no `git init` — not a repository at all
		assert.equal(resolveRepoRoot(dir), null)
		const r = ensureResultsIgnored(dir)
		assert.equal(r.ok, false)
		// creates or modifies no file
		assert.equal(existsSync(gitignorePath(dir)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('Scenario: an unwritable gitignore fails closed', { skip: process.getuid?.() === 0 }, () => {
	const dir = tmp()
	try {
		initRepo(dir)
		writeFileSync(gitignorePath(dir), 'unrelated/\n')
		chmodSync(gitignorePath(dir), 0o444) // read-only
		const before = readGitignore(dir)
		try {
			const r = ensureResultsIgnored(dir)
			assert.equal(r.ok, false)
			assert.equal(readGitignore(dir), before) // changes nothing
		} finally {
			chmodSync(gitignorePath(dir), 0o644) // restore so rmSync can clean up
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── CLI smoke (init-aced invokes this as `node ensure-results-ignored.mts --root <repo>`) ──

test('CLI: main reports success and returns 0 for a fresh repo', () => {
	const dir = tmp()
	try {
		initRepo(dir)
		mkdirSync(join(dir, '.git'), { recursive: true }) // no-op if already present, keeps intent explicit
		const out = execFileSync(
			process.execPath,
			[join(import.meta.dirname, 'ensure-results-ignored.mts'), '--root', dir],
			{ encoding: 'utf8' },
		)
		assert.match(out, /appended/)
		assert.ok(isIgnored(dir, PROBE))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
