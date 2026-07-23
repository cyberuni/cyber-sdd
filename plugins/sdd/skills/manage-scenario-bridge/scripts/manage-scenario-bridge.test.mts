import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { addSource, configPath, listSources, main, scaffoldSource } from './manage-scenario-bridge.mts'

function tmp(): string {
	return mkdtempSync(join(tmpdir(), 'manage-scenario-bridge-'))
}

function seedConfig(projectPath: string, toml: string): void {
	const file = configPath(projectPath)
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, toml)
}

// ── List (@ "listing a project with a configured bridge returns its sources" /
//           "listing a project with no configured bridge returns no sources without error") ──

test('listing a project with a configured bridge returns its sources', () => {
	const dir = tmp()
	try {
		seedConfig(
			dir,
			`[[source]]\nadapter    = "junit"\ncommand    = "vitest run --reporter=junit"\nreportPath = "report.xml"\n\n[[source]]\nadapter    = "junit"\nreportPath = "other.xml"\n`,
		)
		const sources = listSources(dir)
		assert.deepEqual(sources, [
			{ adapter: 'junit', command: 'vitest run --reporter=junit', reportPath: 'report.xml' },
			{ adapter: 'junit', command: undefined, reportPath: 'other.xml' },
		])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('listing a project with no configured bridge returns no sources without error', () => {
	const dir = tmp()
	try {
		assert.deepEqual(listSources(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Scaffold (@ "scaffolding a project's first source creates the config under its project-path" /
//               "a colocated project's config lands at the familiar repo-root path" /
//               "scaffolding over an existing config is refused") ──

test("scaffolding a project's first source creates the config under its project-path", () => {
	const dir = tmp()
	try {
		const r = scaffoldSource(dir, { adapter: 'junit', command: 'vitest run', reportPath: 'report.xml' })
		assert.ok(r.ok)
		assert.ok(existsSync(configPath(dir)))
		assert.deepEqual(listSources(dir), [{ adapter: 'junit', command: 'vitest run', reportPath: 'report.xml' }])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test("a colocated project's config lands at the familiar repo-root path", () => {
	const dir = tmp() // project-path IS the repo root in this test — no nesting
	try {
		scaffoldSource(dir, { adapter: 'junit', reportPath: 'report.xml' })
		assert.equal(configPath(dir), join(dir, '.agents/sdd/scenario-bridge.toml'))
		assert.ok(existsSync(join(dir, '.agents/sdd/scenario-bridge.toml')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('scaffolding over an existing config is refused', () => {
	const dir = tmp()
	try {
		seedConfig(dir, `[[source]]\nadapter    = "junit"\nreportPath = "report.xml"\n`)
		const before = readFileSync(configPath(dir), 'utf8')
		const r = scaffoldSource(dir, { adapter: 'junit', reportPath: 'other.xml' })
		assert.equal(r.ok, false)
		assert.equal(readFileSync(configPath(dir), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Add (@ "adding a source to an existing config appends without disturbing the others" /
//          "adding a source to a project with no config yet is refused") ──

test('adding a source to an existing config appends without disturbing the others', () => {
	const dir = tmp()
	try {
		scaffoldSource(dir, { adapter: 'junit', command: 'vitest run', reportPath: 'a.xml' })
		const r = addSource(dir, { adapter: 'junit', reportPath: 'b.xml' })
		assert.ok(r.ok)
		assert.deepEqual(listSources(dir), [
			{ adapter: 'junit', command: 'vitest run', reportPath: 'a.xml' },
			{ adapter: 'junit', command: undefined, reportPath: 'b.xml' },
		])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('adding a source to a project with no config yet is refused, naming scaffold as the entry point', () => {
	const dir = tmp()
	try {
		const r = addSource(dir, { adapter: 'junit', reportPath: 'report.xml' })
		assert.equal(r.ok, false)
		assert.ok(!r.ok && /scaffold/.test(r.reason))
		assert.equal(existsSync(configPath(dir)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Missing required field (@ "a scaffold or add missing a required field is refused") ──

test('a scaffold missing adapter or reportPath is refused and writes no source block', () => {
	const dir = tmp()
	try {
		assert.equal(scaffoldSource(dir, { reportPath: 'report.xml' }).ok, false)
		assert.equal(scaffoldSource(dir, { adapter: 'junit' }).ok, false)
		assert.equal(existsSync(configPath(dir)), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an add missing adapter or reportPath is refused and writes no source block', () => {
	const dir = tmp()
	try {
		scaffoldSource(dir, { adapter: 'junit', reportPath: 'a.xml' })
		const before = readFileSync(configPath(dir), 'utf8')
		assert.equal(addSource(dir, { reportPath: 'b.xml' }).ok, false)
		assert.equal(addSource(dir, { adapter: 'junit' }).ok, false)
		assert.equal(readFileSync(configPath(dir), 'utf8'), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── Boundaries (@ "the tool writes only the scenario-bridge config" /
//                 "the tool never authors a binding test") ──

function snapshot(dir: string): string[] {
	const out: string[] = []
	const walk = (rel: string): void => {
		for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
			const child = rel ? `${rel}/${e.name}` : e.name
			if (e.isDirectory()) walk(child)
			else out.push(child)
		}
	}
	walk('')
	return out.sort()
}

test('the tool writes only the scenario-bridge config — no spec.md, status, approval, or freeze', () => {
	const dir = tmp()
	try {
		const relConfig = '.agents/sdd/scenario-bridge.toml'
		scaffoldSource(dir, { adapter: 'junit', reportPath: 'a.xml' })
		addSource(dir, { adapter: 'junit', reportPath: 'b.xml' })
		const written = snapshot(dir)
		assert.deepEqual(written, [relConfig])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the tool never authors a binding test — scaffolding a source creates no test file', () => {
	const dir = tmp()
	try {
		scaffoldSource(dir, { adapter: 'junit', command: 'vitest run', reportPath: 'report.xml' })
		const written = snapshot(dir)
		assert.ok(written.every((f) => !/\.test\.[mc]?[jt]s$/.test(f)))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── main (CLI) ──

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

test('main --list prints every source and returns 0', () => {
	const dir = tmp()
	try {
		seedConfig(dir, `[[source]]\nadapter    = "junit"\nreportPath = "report.xml"\n`)
		const { code, out } = captureMain(['--project-path', dir, '--list'])
		assert.equal(code, 0)
		assert.match(out, /junit.*report\.xml/)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --scaffold persists a valid source (0) and refuses a second scaffold (1)', () => {
	const dir = tmp()
	try {
		assert.equal(
			captureMain(['--project-path', dir, '--scaffold', '--adapter', 'junit', '--report-path', 'a.xml']).code,
			0,
		)
		assert.equal(
			captureMain(['--project-path', dir, '--scaffold', '--adapter', 'junit', '--report-path', 'b.xml']).code,
			1,
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --add refuses without an existing config (1) and succeeds after scaffold (0)', () => {
	const dir = tmp()
	try {
		assert.equal(captureMain(['--project-path', dir, '--add', '--adapter', 'junit', '--report-path', 'a.xml']).code, 1)
		captureMain(['--project-path', dir, '--scaffold', '--adapter', 'junit', '--report-path', 'a.xml'])
		assert.equal(captureMain(['--project-path', dir, '--add', '--adapter', 'junit', '--report-path', 'b.xml']).code, 0)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
