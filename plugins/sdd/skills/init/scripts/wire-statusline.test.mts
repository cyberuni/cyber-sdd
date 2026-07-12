import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import {
	addGitignoreEntry,
	buildCommand,
	composeStatusLine,
	GITIGNORE_FILE,
	isGitRepo,
	main,
	parseCommand,
	SETTINGS_FILE,
	STATUS_FILE,
	wireStatusline,
} from './wire-statusline.mts'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'wire-statusline-'))
}

function seedSettings(dir: string, content: unknown): void {
	const full = join(dir, SETTINGS_FILE)
	mkdirSync(dirname(full), { recursive: true })
	writeFileSync(full, JSON.stringify(content, null, 2))
}

function readSettings(dir: string): { statusLine?: { type: string; command: string } } {
	return JSON.parse(readFileSync(join(dir, SETTINGS_FILE), 'utf8'))
}

function markRepo(dir: string): void {
	mkdirSync(join(dir, '.git'), { recursive: true })
}

// Run a wired command against a working tree and return stdout (used for behavioral checks).
function runCommand(dir: string, command: string): string {
	return execFileSync('sh', ['-c', command], { cwd: dir, encoding: 'utf8' })
}

// ── create when none ──

test('composeStatusLine creates a statusLine command when none exists', () => {
	const dir = tmp()
	try {
		assert.equal(existsSync(join(dir, SETTINGS_FILE)), false)
		const r = composeStatusLine(dir, 'own-line')
		assert.ok(r.changed)
		const settings = readSettings(dir)
		assert.equal(settings.statusLine?.type, 'command')
		assert.match(settings.statusLine?.command ?? '', /sdd-statusline:begin/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── compose onto an existing statusLine (not replaced) ──

test('composeStatusLine preserves an existing statusLine command as the wrapped base', () => {
	const dir = tmp()
	try {
		seedSettings(dir, { statusLine: { type: 'command', command: 'echo "user base"' } })
		composeStatusLine(dir, 'own-line')
		const settings = readSettings(dir)
		assert.match(settings.statusLine?.command ?? '', /echo "user base"/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('composeStatusLine does not overwrite the existing command — its output survives with no status file', () => {
	const dir = tmp()
	try {
		seedSettings(dir, { statusLine: { type: 'command', command: 'printf "base-output"' } })
		const { command } = composeStatusLine(dir, 'own-line')
		const out = runCommand(dir, command)
		assert.equal(out, 'base-output\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── own-line vs same-line rendering ──

test('own-line mode renders the SDD segment on its own row beneath the base', () => {
	const dir = tmp()
	try {
		mkdirSync(join(dir, '.agents/sdd'), { recursive: true })
		writeFileSync(join(dir, STATUS_FILE), 'deliver')
		seedSettings(dir, { statusLine: { type: 'command', command: 'printf "base"' } })
		const { command } = composeStatusLine(dir, 'own-line')
		const out = runCommand(dir, command)
		assert.equal(out, 'base\ndeliver\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('same-line mode appends the SDD segment to the base output', () => {
	const dir = tmp()
	try {
		mkdirSync(join(dir, '.agents/sdd'), { recursive: true })
		writeFileSync(join(dir, STATUS_FILE), 'deliver')
		seedSettings(dir, { statusLine: { type: 'command', command: 'printf "base"' } })
		const { command } = composeStatusLine(dir, 'same-line')
		const out = runCommand(dir, command)
		assert.equal(out, 'base | deliver\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── fall-through when absent ──

test('the wired command shows nothing beyond the base when the status file is absent (own-line)', () => {
	const dir = tmp()
	try {
		const { command } = composeStatusLine(dir, 'own-line')
		const out = runCommand(dir, command)
		assert.equal(out, '\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the wired command shows nothing beyond the base when the status file is absent (same-line)', () => {
	const dir = tmp()
	try {
		seedSettings(dir, { statusLine: { type: 'command', command: 'printf "base"' } })
		const { command } = composeStatusLine(dir, 'same-line')
		const out = runCommand(dir, command)
		assert.equal(out, 'base\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an empty (not just absent) status file also falls through to the base', () => {
	const dir = tmp()
	try {
		mkdirSync(join(dir, '.agents/sdd'), { recursive: true })
		writeFileSync(join(dir, STATUS_FILE), '')
		seedSettings(dir, { statusLine: { type: 'command', command: 'printf "base"' } })
		const { command } = composeStatusLine(dir, 'own-line')
		const out = runCommand(dir, command)
		assert.equal(out, 'base\n')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── project, not global ──

test('composeStatusLine writes only the project .claude/settings.json path', () => {
	const dir = tmp()
	try {
		composeStatusLine(dir, 'own-line')
		assert.ok(existsSync(join(dir, '.claude/settings.json')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── gitignore: added in a repo, skipped otherwise ──

test('wireStatusline adds the status file to .gitignore in a git repo', () => {
	const dir = tmp()
	try {
		markRepo(dir)
		const r = wireStatusline(dir, 'own-line')
		assert.equal(r.gitignore.skipped, false)
		assert.equal(r.gitignore.changed, true)
		assert.match(readFileSync(join(dir, GITIGNORE_FILE), 'utf8'), new RegExp(STATUS_FILE.replace(/\./g, '\\.')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('wireStatusline skips the gitignore when the folder is not a git repo', () => {
	const dir = tmp()
	try {
		assert.equal(isGitRepo(dir), false)
		const r = wireStatusline(dir, 'own-line')
		assert.equal(r.gitignore.skipped, true)
		assert.equal(existsSync(join(dir, GITIGNORE_FILE)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('addGitignoreEntry appends to an existing .gitignore, preserving prior entries', () => {
	const dir = tmp()
	try {
		writeFileSync(join(dir, GITIGNORE_FILE), 'node_modules/\n')
		addGitignoreEntry(dir)
		assert.equal(readFileSync(join(dir, GITIGNORE_FILE), 'utf8'), `node_modules/\n${STATUS_FILE}\n`)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── idempotent re-run ──

test('re-running composeStatusLine with the same mode is a no-op (byte-identical command)', () => {
	const dir = tmp()
	try {
		const first = composeStatusLine(dir, 'own-line')
		const second = composeStatusLine(dir, 'own-line')
		assert.equal(second.changed, false)
		assert.equal(second.command, first.command)
		const settings = readSettings(dir)
		const occurrences = (settings.statusLine?.command.match(/sdd-statusline:begin/g) ?? []).length
		assert.equal(occurrences, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('re-running with a different mode rewrites the one managed block — no second segment', () => {
	const dir = tmp()
	try {
		composeStatusLine(dir, 'own-line')
		const second = composeStatusLine(dir, 'same-line')
		assert.ok(second.changed)
		const occurrences = (second.command.match(/sdd-statusline:begin/g) ?? []).length
		assert.equal(occurrences, 1)
		const parsed = parseCommand(second.command)
		assert.equal(parsed.mode, 'same-line')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('re-wiring preserves a user base across a mode change — no nested wrapping', () => {
	const dir = tmp()
	try {
		seedSettings(dir, { statusLine: { type: 'command', command: 'echo "user base"' } })
		composeStatusLine(dir, 'own-line')
		const second = composeStatusLine(dir, 'same-line')
		const occurrencesOfBase = (second.command.match(/echo "user base"/g) ?? []).length
		assert.equal(occurrencesOfBase, 1)
		assert.equal((second.command.match(/__sdd_orig\(\)/g) ?? []).length, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('wireStatusline does not duplicate the gitignore entry on re-run', () => {
	const dir = tmp()
	try {
		markRepo(dir)
		wireStatusline(dir, 'own-line')
		const r = wireStatusline(dir, 'own-line')
		assert.equal(r.gitignore.changed, false)
		const lines = readFileSync(join(dir, GITIGNORE_FILE), 'utf8').split('\n').filter(Boolean)
		assert.equal(lines.filter((l) => l === STATUS_FILE).length, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── parseCommand / buildCommand (unit-level) ──

test('parseCommand recognizes an unwired command as pure base', () => {
	const parsed = parseCommand('echo "hi"')
	assert.equal(parsed.wired, false)
})

test('parseCommand recovers mode and base from a wired command', () => {
	const command = buildCommand('echo "base"', 'same-line')
	const parsed = parseCommand(command)
	assert.equal(parsed.wired, true)
	assert.equal(parsed.mode, 'same-line')
	assert.equal(parsed.base, 'echo "base"')
})

test('buildCommand with no base recovers as undefined base (no-op original)', () => {
	const command = buildCommand(undefined, 'own-line')
	const parsed = parseCommand(command)
	assert.equal(parsed.base, undefined)
})

// ── boundary: writes only settings.json + .gitignore, never spec/contract state ──

function snapshot(dir: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(join(dir, rel), { withFileTypes: true })
		} catch {
			return
		}
		for (const e of entries) {
			const child = rel ? `${rel}/${e.name}` : e.name
			if (e.isDirectory()) walk(child)
			else out.push(child)
		}
	}
	walk('')
	return out.sort()
}

test('wireStatusline touches only .claude/settings.json and .gitignore', () => {
	const dir = tmp()
	try {
		markRepo(dir)
		wireStatusline(dir, 'own-line')
		const files = snapshot(dir).filter((f) => !f.startsWith('.git/'))
		assert.deepEqual(files, ['.claude/settings.json', '.gitignore'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── CLI ──

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

test('main --wire wires the statusLine and reports the gitignore outcome', () => {
	const dir = tmp()
	try {
		markRepo(dir)
		const { code, out } = captureMain(['--root', dir, '--wire', '--mode', 'own-line'])
		assert.equal(code, 0)
		assert.match(out, /wired statusLine/)
		assert.match(out, /added .* to \.gitignore/)
		assert.ok(existsSync(join(dir, SETTINGS_FILE)))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --wire outside a git repo reports the gitignore skip', () => {
	const dir = tmp()
	try {
		const { code, out } = captureMain(['--root', dir, '--wire', '--mode', 'same-line'])
		assert.equal(code, 0)
		assert.match(out, /not a git repo/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --wire refuses a missing/invalid --mode', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--root', dir, '--wire']).code, 1)
		assert.equal(captureMain(['--root', dir, '--wire', '--mode', 'bogus']).code, 1)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
