import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { collectLeaks, type Leak, main, scanText, toToon } from './check-plan-safety.mts'

// Write a <name> file under <dir>/.agents/plans with the given contents.
function seedPlan(dir: string, name: string, contents: string): void {
	const plansDir = join(dir, '.agents', 'plans')
	mkdirSync(plansDir, { recursive: true })
	writeFileSync(join(plansDir, name), contents)
}

// ── scanText: the leak classes it flags ──

test('scanText flags a /home/<user>/ absolute path', () => {
	const leaks = scanText('brief.md', 'see `/home/alice/.claude/plans/x.md`.')
	assert.equal(leaks.length, 1)
	assert.equal(leaks[0].kind, 'home-abs-path')
	assert.equal(leaks[0].line, 1)
	assert.ok(leaks[0].token.startsWith('/home/alice/'))
})

test('scanText flags a /Users/<user>/ absolute path', () => {
	const leaks = scanText('brief.md', 'ref /Users/bob/Documents/design.md here')
	assert.equal(leaks.length, 1)
	assert.equal(leaks[0].kind, 'home-abs-path')
})

test('scanText flags a Windows user-profile path (both separators)', () => {
	const back = scanText('brief.md', 'C:\\Users\\carol\\notes.md')
	const fwd = scanText('brief.md', 'C:/Users/carol/notes.md')
	assert.equal(back.length, 1)
	assert.equal(back[0].kind, 'home-abs-path')
	assert.equal(fwd.length, 1)
})

test('scanText flags $HOME, braced $HOME, and %USERPROFILE% env expansions', () => {
	const braced = `$${'{HOME}'}` // the literal ${HOME} form, built without a source template placeholder
	const leaks = scanText('brief.md', `$HOME and ${braced} and %USERPROFILE% roots`)
	assert.equal(leaks.length, 3)
	assert.ok(leaks.every((l) => l.kind === 'env-home'))
})

test('scanText flags $USER / %USERNAME%', () => {
	const leaks = scanText('brief.md', 'owner is $USER (%USERNAME%)')
	assert.equal(leaks.length, 2)
	assert.ok(leaks.every((l) => l.kind === 'env-user'))
})

// ── scanText: what it deliberately does NOT flag (false-positive guards) ──

test('scanText does not flag a bare ~/ home-rooted feature path', () => {
	// `~/.cyberfleet/<hash>` carries no username and is legitimate design prose.
	assert.deepEqual(scanText('design.md', 'phase 2 root: `~/.cyberfleet/<project-hash>`'), [])
})

test('scanText does not flag a repo-relative path', () => {
	assert.deepEqual(scanText('brief.md', 'build from `.agents/plans/add-fleet.design.md`'), [])
})

test('scanText does not flag $HOMEBREW / $USERDATA (name is a prefix, not the var)', () => {
	assert.deepEqual(scanText('brief.md', 'set $HOMEBREW and $USERDATA'), [])
})

test('scanText reports each leak on its own line with a 1-indexed line number', () => {
	const leaks = scanText('brief.md', 'clean line\n/home/dan/x and $USER\nalso clean')
	assert.equal(leaks.length, 2)
	assert.ok(leaks.every((l) => l.line === 2))
})

// ── collectLeaks: scanning the plan directory ──

test('collectLeaks scans every *.md under .agents/plans and returns them sorted', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		seedPlan(dir, 'a.plan.md', 'ref `/home/eve/secret.md`')
		seedPlan(dir, 'a.design.md', 'clean repo-relative `.agents/x.md`')
		seedPlan(dir, 'b.plan.md', 'uses $HOME')
		const leaks = collectLeaks(dir)
		assert.equal(leaks.length, 2)
		assert.equal(leaks[0].file, join('.agents', 'plans', 'a.plan.md'))
		assert.equal(leaks[1].file, join('.agents', 'plans', 'b.plan.md'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectLeaks returns nothing for a clean plan directory', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		seedPlan(dir, 'ok.plan.md', 'design at `.agents/plans/ok.design.md`, root `~/.tool/`')
		assert.deepEqual(collectLeaks(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectLeaks returns nothing when the plans dir is absent', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		assert.deepEqual(collectLeaks(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectLeaks scans an explicit --path file set instead of the plan dir', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		const p = join(dir, 'loose.md')
		writeFileSync(p, 'leak `/Users/frank/x`')
		const leaks = collectLeaks(dir, [p])
		assert.equal(leaks.length, 1)
		assert.equal(leaks[0].file, p)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── main: the CI guard exit code ──

test('main --check exits non-zero when a leak is present', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		seedPlan(dir, 'x.plan.md', 'ref `/home/gina/x.md`')
		assert.equal(main(['--root', dir, '--check', '--format', 'json']), 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --check exits zero for a clean plan directory', () => {
	const dir = mkdtempSync(join(tmpdir(), 'cps-'))
	try {
		seedPlan(dir, 'x.plan.md', 'clean `.agents/plans/x.design.md`')
		assert.equal(main(['--root', dir, '--check']), 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── toToon ──

test('toToon renders a header count and one row per leak', () => {
	const leaks: Leak[] = [{ file: 'a.md', line: 3, kind: 'home-abs-path', token: '/home/x/y' }]
	const toon = toToon(leaks)
	assert.ok(toon.startsWith('leaks[1]{file,line,kind,token}:'))
	assert.ok(toon.includes('home-abs-path'))
})
