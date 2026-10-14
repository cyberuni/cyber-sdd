// One test per frozen scenario (one per Examples row of an outline) in
// .agents/specs/aced/eval-run/bench/engine/engine.feature — the init, plan, and run use cases, plus
// the compare scenarios whose Given is a task set or a baseline the engine itself wrote.
// bench-compare.test.mts holds the compare scenarios whose Given is a pair of records.
//
// Level: boundary e2e. Every test drives the real CLI (`node bench.mts …`) in a throwaway git
// repository. The harness is the only thing stood in: a `claude` executable first on the PATH that
// appends its argv, cwd, CLAUDE_CONFIG_DIR, `git status --porcelain`, and the checkout's suite
// task sets to a log file, then replays a scripted stream-json transcript. A real run would spend
// money and is non-deterministic, so the harness seam is where the external is mocked. The package
// registry is stood in the same way: a fake `npm` on the PATH serving `view` and `pack`.
//
// Discrimination: a negative assertion is paired with a positive on the same output where an
// empty output would satisfy it (no launch AND a non-zero exit; no warning AND a written plan); the
// git-ref and file-arm scenarios pair the arm under test with one that must fail the same check.

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), 'bench.mts')
const SUITE = 'harbor.nightly'
const SUITE_DIR = `.agents/aced/bench/${SUITE}`
const RESULTS = `.agents/aced/results/bench/${SUITE}`

const roots: string[] = []
after(() => {
	for (const r of roots) rmSync(r, { recursive: true, force: true })
})

// ─── the stand-in harness and registry ────────────────────────────────────────

const STUB_CLAUDE = `
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const log = process.env.STUB_LOG
const cfg = existsSync(process.env.STUB_SCRIPT) ? JSON.parse(readFileSync(process.env.STUB_SCRIPT, 'utf8')) : {}
const args = process.argv.slice(2)
let pluginVersion = null
const pd = args.indexOf('--plugin-dir')
if (pd >= 0) { try { pluginVersion = JSON.parse(readFileSync(args[pd + 1] + '/package.json', 'utf8')).version } catch {} }
let gitStatus = null
try { gitStatus = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }) } catch {}
const suites = {}
const bd = '.agents/aced/bench'
if (existsSync(bd)) for (const s of readdirSync(bd)) { try { suites[s] = readFileSync(bd + '/' + s + '/tasks.json', 'utf8') } catch {} }
appendFileSync(log, JSON.stringify({ argv: args, cwd: process.cwd(), configDir: process.env.CLAUDE_CONFIG_DIR ?? null, gitStatus, suites, pluginVersion }) + '\\n')
const lines = []
if (cfg.model !== null) lines.push({ type: 'system', subtype: 'init', model: cfg.model ?? 'stub-model' })
lines.push({ type: 'assistant', message: { content: Array.from({ length: cfg.toolCalls ?? 2 }, () => ({ type: 'tool_use' })) } })
if (!cfg.noResult) lines.push({ type: 'result', subtype: cfg.subtype ?? 'success', is_error: cfg.isError ?? false, num_turns: cfg.turns ?? 3, total_cost_usd: cfg.cost ?? 0.01, usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 10, cache_creation_input_tokens: 5 } })
process.stdout.write(lines.map((l) => JSON.stringify(l)).join('\\n') + '\\n')
for (const f of cfg.touch ?? []) writeFileSync(f, '')
if (cfg.sleepMs) await new Promise((r) => setTimeout(r, cfg.sleepMs))
if (cfg.signal) process.kill(process.pid, cfg.signal)
`

const STUB_NPM = `
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const registry = JSON.parse(readFileSync(process.env.STUB_REGISTRY, 'utf8'))
const [verb, spec, ...rest] = process.argv.slice(2)
const at = spec.lastIndexOf('@')
const name = spec.slice(0, at)
const version = spec.slice(at + 1)
const known = (registry[name] ?? []).includes(version)
if (verb === 'view') {
  if (!known) { process.stderr.write('npm error code E404\\n'); process.exit(1) }
  process.stdout.write(JSON.stringify(version) + '\\n')
} else if (verb === 'pack') {
  if (!known) process.exit(1)
  const dest = rest[rest.indexOf('--pack-destination') + 1]
  const work = mkdtempSync(join(tmpdir(), 'stub-npm-'))
  mkdirSync(join(work, 'package'))
  writeFileSync(join(work, 'package', 'package.json'), JSON.stringify({ name, version }))
  const file = name + '-' + version + '.tgz'
  execFileSync('tar', ['-czf', join(dest, file), '-C', work, 'package'])
  process.stdout.write(file + '\\n')
} else process.exit(1)
`

interface Env {
	base: string
	repo: string
	bin: string
	npmBin: string
	log: string
	script: string
	planPath: string
	env: NodeJS.ProcessEnv
}

function wrapper(dir: string, name: string, script: string) {
	writeFileSync(join(dir, `${name}.mjs`), script)
	writeFileSync(join(dir, name), `#!/bin/sh\nexec '${process.execPath}' '${join(dir, `${name}.mjs`)}' "$@"\n`)
	chmodSync(join(dir, name), 0o755)
}

function operatorPathWithoutClaude(): string[] {
	return (process.env.PATH ?? '').split(delimiter).filter((d) => d && !existsSync(join(d, 'claude')))
}

function setup(): Env {
	const base = realpathSync(mkdtempSync(join(tmpdir(), 'aced-bench-test-')))
	roots.push(base)
	const repo = join(base, 'repo')
	const bin = join(base, 'bin')
	const npmBin = join(base, 'npm-bin')
	const home = join(base, 'home')
	for (const d of [repo, bin, npmBin, home]) mkdirSync(d)
	wrapper(bin, 'claude', STUB_CLAUDE)
	wrapper(npmBin, 'npm', STUB_NPM)
	const env: NodeJS.ProcessEnv = {}
	for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('GIT_') && k !== 'CLAUDE_CONFIG_DIR') env[k] = v
	Object.assign(env, {
		// The real harness never resolves: a test that loses its stand-in fails rather than spending.
		PATH: [bin, ...operatorPathWithoutClaude()].join(delimiter),
		HOME: home,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CONFIG_GLOBAL: join(home, '.gitconfig'),
		GIT_AUTHOR_NAME: 'Test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'Test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		STUB_LOG: join(base, 'harness.log'),
		STUB_SCRIPT: join(base, 'script.json'),
		STUB_REGISTRY: join(base, 'registry.json'),
	})
	const e: Env = {
		base,
		repo,
		bin,
		npmBin,
		log: join(base, 'harness.log'),
		script: join(base, 'script.json'),
		planPath: join(base, 'plan.json'),
		env,
	}
	git(e, 'init', '-q', '-b', 'main')
	write(e, 'README.md', 'repo\n')
	commit(e, 'initial')
	return e
}

function git(e: Env, ...args: string[]): string {
	return execFileSync('git', args, { cwd: e.repo, env: e.env, encoding: 'utf8' })
}

function write(e: Env, path: string, content: string) {
	mkdirSync(dirname(join(e.repo, path)), { recursive: true })
	writeFileSync(join(e.repo, path), content)
}

function commit(e: Env, message: string) {
	git(e, 'add', '-A')
	git(e, 'commit', '-q', '--allow-empty', '-m', message)
}

interface TaskDef {
	id: string
	prompt?: string
	check?: string
	setup?: string
	tags?: Record<string, string>
}

function taskSet(tasks: Array<TaskDef | string>, fields: Record<string, unknown> = {}) {
	return {
		...fields,
		tasks: tasks.map((t) => {
			const d = typeof t === 'string' ? { id: t } : t
			return { prompt: `Do ${d.id}`, check: 'true', ...d }
		}),
	}
}

/** Writes and commits the suite's tasks.json (and any checks). */
function suite(e: Env, set: object, checks: Record<string, string> = {}, name = SUITE) {
	write(e, `.agents/aced/bench/${name}/tasks.json`, `${JSON.stringify(set, null, '\t')}\n`)
	for (const [file, content] of Object.entries(checks)) write(e, `.agents/aced/bench/${name}/checks/${file}`, content)
	commit(e, `suite ${name}`)
}

function stub(e: Env, cfg: Record<string, unknown>) {
	writeFileSync(e.script, JSON.stringify(cfg))
}

function bench(e: Env, args: string[], env: NodeJS.ProcessEnv = e.env) {
	return spawnSync(process.execPath, [ENGINE, ...args], { cwd: e.repo, env, encoding: 'utf8' })
}

interface Launch {
	argv: string[]
	cwd: string
	configDir: string | null
	gitStatus: string | null
	suites: Record<string, string>
	pluginVersion: string | null
}

function launches(e: Env): Launch[] {
	if (!existsSync(e.log)) return []
	return readFileSync(e.log, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l))
}

function planArgs(arms: string[], extra: string[] = [], suiteName = SUITE): string[] {
	return ['plan', `--suite=${suiteName}`, ...arms.flatMap((a) => ['--arm', a]), '--out', '__PLAN__', ...extra]
}

function plan(e: Env, arms: string[] = ['after=git:HEAD'], extra: string[] = [], env = e.env) {
	const r = bench(
		e,
		planArgs(arms, extra).map((a) => (a === '__PLAN__' ? e.planPath : a)),
		env,
	)
	return r
}

type Json = any

function planOk(e: Env, arms?: string[], extra?: string[]): Json {
	const r = plan(e, arms, extra)
	assert.equal(r.status, 0, r.stderr)
	return JSON.parse(readFileSync(e.planPath, 'utf8'))
}

/** Plans and runs with consent; returns each arm's record, in plan order. */
function runOk(e: Env, arms?: string[], extra?: string[], env = e.env): Json[] {
	planOk(e, arms, extra)
	const r = bench(e, ['run', '--plan', e.planPath, '--consent'], env)
	assert.equal(r.status, 0, r.stderr)
	const out = JSON.parse(r.stdout)
	return out.records.map((p: string) => JSON.parse(readFileSync(join(e.repo, p), 'utf8')))
}

function resultFiles(e: Env): string[] {
	const dir = join(e.repo, RESULTS)
	return existsSync(dir) ? readdirSync(dir) : []
}

function pairAt(argv: string[], flag: string, value: string): boolean {
	return argv.some((a, i) => a === flag && argv[i + 1] === value)
}

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

// ─── Resolving the suite ──────────────────────────────────────────────────────

describe('Resolving the suite', () => {
	const rows: Array<[string, string]> = [
		['plan', 'Nightly'],
		['plan', 'nightly_checks'],
		['plan', 'nightly..core'],
		['plan', '-nightly'],
		['init', '../escape'],
	]
	for (const [verb, name] of rows) {
		test('a suite name outside the naming rule is refused', () => {
			const e = setup()
			const args =
				verb === 'plan'
					? ['plan', `--suite=${name}`, '--arm', 'after=git:HEAD', '--out', e.planPath]
					: ['init', `--suite=${name}`]
			const r = bench(e, args)
			assert.notEqual(r.status, 0)
			assert.match(r.stderr, /suite naming rule/)
			assert.equal(existsSync(join(e.repo, '.agents/aced/bench', name)), false)
			assert.equal(existsSync(join(e.repo, '.agents/aced')), false)
		})
	}

	test('a dotted owner-prefixed suite name is accepted', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const p = planOk(e)
		assert.equal(p.suite, 'harbor.nightly')
		assert.deepEqual(p.tasks, ['trim-logs', 'pin-versions'])
	})
})

// ─── UC1 — init ───────────────────────────────────────────────────────────────

describe('UC1 — init', () => {
	test('init writes a starter task set for a suite that has none', () => {
		const e = setup()
		suite(e, taskSet(['other-task']), {}, 'harbor.other')
		const r = bench(e, ['init', `--suite=${SUITE}`])
		assert.equal(r.status, 0, r.stderr)
		assert.ok(existsSync(join(e.repo, SUITE_DIR, 'tasks.json')))
		commit(e, 'init suite')
		const p = planOk(e)
		assert.ok(p.tasks.length >= 1)
	})

	test('init refuses to overwrite an existing task set', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		const before = readFileSync(join(e.repo, SUITE_DIR, 'tasks.json'))
		const r = bench(e, ['init', `--suite=${SUITE}`])
		assert.notEqual(r.status, 0)
		assert.deepEqual(readFileSync(join(e.repo, SUITE_DIR, 'tasks.json')), before)
	})
})

// ─── UC2 — plan ───────────────────────────────────────────────────────────────

describe('UC2 — plan', () => {
	test('a valid request writes a plan file and launches nothing', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const p = planOk(e, ['after=git:HEAD'], ['--runs', '3'])
		assert.deepEqual(
			{ arms: p.counts.arms, tasks: p.counts.tasks, runs: p.counts.runsPerArm },
			{ arms: 1, tasks: 2, runs: 3 },
		)
		assert.equal(launches(e).length, 0)
		assert.deepEqual(resultFiles(e), [])
	})

	test('a suite with no task set fails the plan and names init', () => {
		const e = setup()
		write(e, `${SUITE_DIR}/checks/ok.sh`, 'exit 0\n')
		commit(e, 'checks only')
		const r = plan(e)
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /aced-bench init --suite harbor\.nightly/)
	})

	const defects: Array<[string, string, RegExp]> = [
		[
			'the task id trim-logs twice',
			JSON.stringify(taskSet(['trim-logs', 'trim-logs'])),
			/task id "trim-logs" appears twice/,
		],
		[
			'a task with no check',
			JSON.stringify({ tasks: [{ id: 'trim-logs', prompt: 'Trim' }] }),
			/"trim-logs".*no "check"/,
		],
		['an empty tasks list', JSON.stringify({ tasks: [] }), /tasks list is empty/],
		['text that is not valid JSON', '{ "tasks": [ ', /not valid JSON/],
	]
	for (const [, text, message] of defects) {
		test('a malformed task set fails the plan and names the defect', () => {
			const e = setup()
			write(e, `${SUITE_DIR}/tasks.json`, text)
			commit(e, 'bad suite')
			const r = plan(e)
			assert.notEqual(r.status, 0)
			assert.match(r.stderr, message)
		})
	}

	test('a task filter naming no task in the set fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const r = plan(e, undefined, ['--task', 'rotate-keys'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /trim-logs/)
		assert.match(r.stderr, /pin-versions/)
	})

	test('a task filter limits the plan to that task', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions', 'fix-typo']))
		const p = planOk(e, undefined, ['--task', 'pin-versions'])
		assert.equal(p.counts.tasks, 1)
		assert.deepEqual(p.tasks, ['pin-versions'])
	})

	test('a harness with no adapter fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const r = plan(e, undefined, ['--harness', 'codex'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /"codex" has no adapter/)
	})

	test('a harness whose command is not on the path fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const path = operatorPathWithoutClaude().join(delimiter)
		const r = plan(e, undefined, ['--harness', 'claude-code'], { ...e.env, PATH: path })
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /"claude" is not on the PATH/)
		assert.equal(existsSync(e.planPath), false)
	})

	test('a baseline cannot be planned with more than one arm', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const r = plan(e, ['before=git:HEAD', 'after=git:HEAD'], ['--baseline'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /a suite records one baseline/)
	})

	test('a git-ref arm naming no commit fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const r = plan(e, ['after=git:no-such-branch'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /no-such-branch/)
	})

	test('a file arm whose source does not exist fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const r = plan(e, ['with=file:docs/GUIDE.md=path:drafts/missing.md'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /drafts\/missing\.md/)
	})

	test('a package arm naming a version the registry does not have fails the plan', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		writeFileSync(join(e.base, 'registry.json'), JSON.stringify({ 'lantern-kit': ['1.0.0', '1.1.0'] }))
		const env = { ...e.env, PATH: `${e.npmBin}${delimiter}${e.env.PATH}` }
		const r = plan(e, ['after=package:lantern-kit@9.9.9'], [], env)
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /lantern-kit/)
		assert.match(r.stderr, /9\.9\.9/)
		// The same registry serves a version it lists: the refusal is about the version, not the seam.
		assert.equal(plan(e, ['after=package:lantern-kit@1.1.0'], [], env).status, 0)
	})

	test('a suite with uncommitted changes warns that the committed suite is what runs', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		write(e, `${SUITE_DIR}/tasks.json`, JSON.stringify(taskSet(['trim-logs', 'pin-versions', 'rotate-keys'])))
		const p = planOk(e, ['after=git:HEAD'])
		const w = p.warnings.find((x: Json) => x.code === 'suite-uncommitted')
		assert.ok(w)
		assert.match(w.message, /committed suite .* is what runs/)
		assert.equal(p.tasks.includes('rotate-keys'), false)
	})

	test('a git-ref arm planned from a tree with uncommitted changes warns that they are not benched', () => {
		const e = setup()
		write(e, 'src/app.txt', 'v1\n')
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		write(e, 'src/app.txt', 'v2\n')
		const p = planOk(e, ['after=git:HEAD'])
		const w = p.warnings.find((x: Json) => x.code === 'uncommitted-not-benched')
		assert.ok(w)
		assert.match(w.message, /not benched/)
	})

	test('a git-ref arm planned from a clean tree carries no uncommitted-changes warning', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		assert.equal(git(e, 'status', '--porcelain'), '')
		const p = planOk(e, ['after=git:HEAD'])
		assert.ok(Array.isArray(p.warnings))
		assert.equal(
			p.warnings.some((x: Json) => x.code === 'uncommitted-not-benched' || x.code === 'suite-uncommitted'),
			false,
		)
	})

	test("the plan's ceiling is arms times tasks times runs times the per-run cap", () => {
		const e = setup()
		suite(e, taskSet(['a', 'b', 'c'], { maxBudgetUsd: 0.4 }))
		const p = planOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '5'])
		assert.equal(p.ceilingUsd, 12)
	})

	function storeRuns(e: Env, costs: number[], over: Record<string, unknown> = {}) {
		const record = {
			schemaVersion: 3,
			layer: 'measured',
			suite: SUITE,
			model: 'sonnet',
			harness: 'claude-code',
			runner: 'print',
			runs: costs.map((costUsd, i) => ({ task: 'trim-logs', run: i + 1, costUsd, error: null })),
			...over,
		}
		mkdirSync(join(e.repo, RESULTS), { recursive: true })
		writeFileSync(join(e.repo, RESULTS, '2026-01-01T00-00-00-000Z.after.json'), JSON.stringify(record))
	}

	test('a task with matching stored runs is estimated from their median cost', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions'], { maxBudgetUsd: 0.5 }))
		storeRuns(e, [0.05, 0.1, 0.45])
		const p = planOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '4', '--task', 'trim-logs'])
		assert.equal(p.estimate.tasks['trim-logs'].usd, 0.8)
	})

	test('a task with no stored runs is estimated at its cap for every run', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions'], { maxBudgetUsd: 0.4 }))
		const p = planOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '4', '--task', 'trim-logs'])
		assert.equal(p.estimate.tasks['trim-logs'].usd, 3.2)
	})

	const differ: Array<[string, Record<string, unknown>]> = [
		['model', { model: 'opus' }],
		['harness', { harness: 'codex' }],
		['runner', { runner: 'interactive' }],
	]
	for (const [_field, over] of differ) {
		test('stored runs that differ in <field> are not used for the estimate', () => {
			const e = setup()
			suite(e, taskSet(['trim-logs', 'pin-versions'], { maxBudgetUsd: 0.4 }))
			storeRuns(e, [0.1, 0.1, 0.1], over)
			const p = planOk(e, ['after=git:HEAD'], ['--runs', '4', '--task', 'trim-logs'])
			assert.equal(p.estimate.tasks['trim-logs'].usd, 1.6)
		})
	}

	test('a run count that cannot reach significance is flagged too few to call', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const p = planOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '3'])
		const w = p.warnings.find((x: Json) => x.code === 'too-few-to-call')
		assert.ok(w)
		assert.match(w.message, /no single task's result can be significant/)
		assert.match(w.message, /a pooled result across the 2 tasks still can/)
	})

	test('a run count that can reach significance carries no too-few warning', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const p = planOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '4'])
		assert.ok(Array.isArray(p.warnings))
		assert.equal(
			p.warnings.some((x: Json) => x.code === 'too-few-to-call'),
			false,
		)
	})

	test('the plan names the permission mode and that it applies only inside the throwaway checkout', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const p = planOk(e)
		assert.equal(p.permissionMode, 'bypassPermissions')
		assert.match(p.permissionScope, /bypassPermissions/)
		assert.match(p.permissionScope, /applies only inside the throwaway checkout/)
	})
})

// ─── UC3 — run ────────────────────────────────────────────────────────────────

describe('UC3 — run', () => {
	test('run without consent launches no agent and writes no record', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		planOk(e, ['after=git:HEAD'], ['--runs', '2'])
		const r = bench(e, ['run', '--plan', e.planPath])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /consent/)
		assert.equal(launches(e).length, 0)
		assert.deepEqual(resultFiles(e), [])
	})

	test('run with consent executes every planned run', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const records = runOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '3'])
		assert.equal(launches(e).length, 12)
		assert.deepEqual(
			records.map((r) => [r.arm, r.runs.length]),
			[
				['before', 6],
				['after', 6],
			],
		)
	})

	test('a plan whose suite changed since it was written is refused', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		planOk(e, ['after=git:HEAD'], ['--runs', '1'])
		suite(e, taskSet(['trim-logs', 'pin-versions', 'rotate-keys']))
		const r = bench(e, ['run', '--plan', e.planPath, '--consent'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /changed since the plan/)
		assert.equal(launches(e).length, 0)
	})

	test('a git-ref arm runs each task in a checkout of that commit', () => {
		const e = setup()
		write(e, 'VERSION', 'old\n')
		commit(e, 'old')
		git(e, 'tag', 'v-old')
		write(e, 'VERSION', 'new\n')
		suite(e, taskSet([{ id: 'read-version', check: 'grep -qx old VERSION' }]))
		const [before, head] = runOk(e, ['before=git:v-old', 'head=git:HEAD'], ['--runs', '2'])
		assert.deepEqual(
			before.runs.map((r: Json) => r.pass),
			[true, true],
		)
		assert.deepEqual(
			head.runs.map((r: Json) => r.pass),
			[false, false],
		)
	})

	test("a file arm sourced from a ref runs each task with that ref's content", () => {
		const e = setup()
		write(e, 'docs/GUIDE.md', 'legacy guide\n')
		commit(e, 'legacy')
		git(e, 'tag', 'v-old')
		write(e, 'docs/GUIDE.md', 'current guide\n')
		suite(e, taskSet([{ id: 'read-guide', check: 'grep -qx "legacy guide" docs/GUIDE.md' }]))
		const [withArm, head] = runOk(e, ['with=file:docs/GUIDE.md=ref:v-old', 'head=git:HEAD'], ['--runs', '2'])
		assert.deepEqual(
			withArm.runs.map((r: Json) => r.pass),
			[true, true],
		)
		assert.deepEqual(
			head.runs.map((r: Json) => r.pass),
			[false, false],
		)
	})

	test("a file arm sourced from a path runs each task with that path's content", () => {
		const e = setup()
		write(e, 'docs/GUIDE.md', 'current guide\n')
		suite(e, taskSet([{ id: 'read-guide', check: 'grep -qx "draft guide" docs/GUIDE.md' }]))
		write(e, 'drafts/guide-v2.md', 'draft guide\n')
		const [withArm, head] = runOk(
			e,
			['with=file:docs/GUIDE.md=path:drafts/guide-v2.md', 'head=git:HEAD'],
			['--runs', '2'],
		)
		assert.deepEqual(
			withArm.runs.map((r: Json) => r.pass),
			[true, true],
		)
		assert.deepEqual(
			head.runs.map((r: Json) => r.pass),
			[false, false],
		)
	})

	test('an absent file arm runs each task with that file deleted', () => {
		const e = setup()
		write(e, 'docs/GUIDE.md', 'current guide\n')
		suite(e, taskSet([{ id: 'no-guide', check: 'test ! -e docs/GUIDE.md' }]))
		const [without, head] = runOk(e, ['without=file:docs/GUIDE.md=absent', 'head=git:HEAD'], ['--runs', '2'])
		assert.deepEqual(
			without.runs.map((r: Json) => r.pass),
			[true, true],
		)
		assert.deepEqual(
			head.runs.map((r: Json) => r.pass),
			[false, false],
		)
	})

	test('a package arm loads that exact version from a fresh harness config directory', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		writeFileSync(join(e.base, 'registry.json'), JSON.stringify({ 'lantern-kit': ['1.0.0', '1.1.0'] }))
		const env = { ...e.env, PATH: `${e.npmBin}${delimiter}${e.env.PATH}` }
		const r = bench(
			e,
			planArgs(['after=package:lantern-kit@1.0.0'], ['--runs', '1']).map((a) => (a === '__PLAN__' ? e.planPath : a)),
			env,
		)
		assert.equal(r.status, 0, r.stderr)
		const run = bench(e, ['run', '--plan', e.planPath, '--consent'], env)
		assert.equal(run.status, 0, run.stderr)
		const [launch] = launches(e)
		assert.ok(launch)
		assert.ok(launch.argv.includes('--plugin-dir'))
		assert.equal(launch.pluginVersion, '1.0.0')
		const runTemp = dirname(launch.cwd)
		assert.ok(launch.configDir?.startsWith(`${runTemp}/`), `${launch.configDir} is not inside ${runTemp}`)
	})

	test("the agent starts on a clean tree carrying the task-set commit's suite", () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		git(e, 'tag', 'v-old')
		suite(e, taskSet(['trim-logs', 'rotate-keys']))
		runOk(e, ['before=git:v-old'], ['--runs', '1', '--task', 'rotate-keys'])
		const [launch] = launches(e)
		assert.ok(launch)
		assert.equal(launch.gitStatus, '')
		assert.match(launch.suites[SUITE] ?? '', /rotate-keys/)
	})

	test('a run whose setup fails is recorded as an error and the agent is not launched', () => {
		const e = setup()
		suite(
			e,
			taskSet([
				{ id: 'broken', setup: 'exit 1' },
				{ id: 'fine', prompt: 'Do fine' },
			]),
		)
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		const broken = record.runs.find((r: Json) => r.task === 'broken')
		assert.equal(typeof broken.error, 'string')
		assert.equal(broken.pass, false)
		const all = launches(e)
		assert.equal(all.length, 1)
		assert.ok(all[0]?.argv.includes('Do fine'))
	})

	test("setup time is not counted in the run's wall time", () => {
		const e = setup()
		suite(e, taskSet([{ id: 'slow-setup', setup: 'sleep 3' }]))
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		const [run] = record.runs
		assert.equal(run.error, null)
		assert.ok(run.wallMs < 3000, `wallMs ${run.wallMs}`)
	})

	test("every launch carries the plan's model, cap, and permission mode", () => {
		const e = setup()
		suite(e, taskSet(['trim-logs'], { model: 'model-alpha', maxBudgetUsd: 0.4, permissionMode: 'acceptEdits' }))
		runOk(e, ['after=git:HEAD'], ['--runs', '2'])
		const all = launches(e)
		assert.equal(all.length, 2)
		for (const { argv } of all) {
			assert.ok(pairAt(argv, '--model', 'model-alpha'), argv.join(' '))
			assert.ok(pairAt(argv, '--max-budget-usd', '0.4'), argv.join(' '))
			assert.ok(pairAt(argv, '--permission-mode', 'acceptEdits'), argv.join(' '))
			assert.ok(argv.includes('--no-session-persistence'), argv.join(' '))
		}
	})

	test("every run launches the harness on the checkout's own settings, never the operator's", () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		const [launch] = launches(e)
		assert.ok(launch)
		assert.ok(pairAt(launch.argv, '--setting-sources', 'project'), launch.argv.join(' '))
		assert.ok(launch.argv.includes('--strict-mcp-config'))
	})

	test('a checkout carrying an MCP config passes it to the harness', () => {
		const e = setup()
		write(e, '.mcp.json', '{ "mcpServers": {} }\n')
		suite(e, taskSet(['trim-logs']))
		runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		const [launch] = launches(e)
		assert.ok(launch)
		assert.ok(pairAt(launch.argv, '--mcp-config', '.mcp.json'), launch.argv.join(' '))
	})

	test('a checkout with no MCP config passes none to the harness', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		const [launch] = launches(e)
		assert.ok(launch?.argv.includes('-p'))
		assert.equal(launch.argv.includes('--mcp-config'), false)
	})

	const stops: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
		['a result event reporting the budget cap', { subtype: 'error_max_budget_usd' }, {}],
		['a result event marked as an error', { subtype: 'success', isError: true }, {}],
		[
			'running past a timeoutMinutes of 0.01 with no result',
			{ noResult: true, sleepMs: 10_000 },
			{ timeoutMinutes: 0.01 },
		],
		// A success result written before the process dies still ends in a signal: capped.
		['the harness process exiting on a signal', { signal: 'SIGKILL' }, {}],
	]
	for (const [_stop, cfg, fields] of stops) {
		test('a run stopped by <stop> is recorded as capped', () => {
			const e = setup()
			const marker = join(e.base, 'check-ran')
			suite(e, taskSet([{ id: 'trim-logs', check: `echo ran >> '${marker}'` }], fields))
			stub(e, cfg)
			const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
			assert.equal(record.runs[0].capped, true)
			assert.equal(readFileSync(marker, 'utf8'), 'ran\n')
		})
	}

	test('a run that ends in a success result is not capped', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		stub(e, { subtype: 'success' })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.runs[0].capped, false)
	})

	test('a check that exits zero records a pass', () => {
		const e = setup()
		suite(e, taskSet([{ id: 'make-done', check: 'test -f DONE' }]))
		stub(e, { touch: ['DONE'] })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.runs[0].pass, true)
	})

	test('a check that exits non-zero records a failure', () => {
		const e = setup()
		suite(e, taskSet([{ id: 'make-done', check: 'test -f DONE' }]))
		stub(e, {})
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.runs[0].pass, false)
		assert.equal(record.runs[0].error, null)
	})

	test('the worktree is removed even when the run throws', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		planOk(e, ['after=git:HEAD'], ['--runs', '1'])
		unlinkSync(join(e.bin, 'claude'))
		const r = bench(e, ['run', '--plan', e.planPath, '--consent'])
		assert.notEqual(r.status, 0)
		assert.match(r.stderr, /could not launch claude/)
		const worktrees = git(e, 'worktree', 'list', '--porcelain')
			.split('\n')
			.filter((l) => l.startsWith('worktree '))
		assert.deepEqual(worktrees, [`worktree ${e.repo}`])
	})

	test("each arm's record carries the measured layer, suite, subject, arm, harness, adapter, runner, and task-set provenance", () => {
		const e = setup()
		suite(e, taskSet(['trim-logs']))
		const head = git(e, 'rev-parse', 'HEAD').trim()
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.schemaVersion, 3)
		assert.equal(record.layer, 'measured')
		assert.equal(record.suite, 'harbor.nightly')
		assert.equal(record.arm, 'after')
		assert.equal(record.harness, 'claude-code')
		assert.equal(record.runner, 'print')
		assert.equal(typeof record.adapter, 'string')
		assert.ok(record.adapter.length > 0)
		assert.deepEqual(record.subject, { kind: 'git-ref', ref: 'HEAD', commit: head })
		assert.equal(record.taskSetCommit, head)
		assert.match(record.taskSetHash, /^[0-9a-f]{64}$/)
	})

	test("each arm's record and transcripts are written under the suite's bench results directory", () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '2'])
		const files = resultFiles(e).filter((f) => f.endsWith('.after.json'))
		assert.equal(files.length, 1)
		const stampOf = record.createdAt.replace(/[:.]/g, '-')
		assert.equal(files[0], `${stampOf}.after.json`)
		for (const run of record.runs) {
			const path = join(e.repo, RESULTS, stampOf, `${run.task}-${run.run}.jsonl.gz`)
			assert.ok(existsSync(path), path)
			assert.equal(run.transcript, `${RESULTS}/${stampOf}/${run.task}-${run.run}.jsonl.gz`)
			assert.match(gunzipSync(readFileSync(path)).toString('utf8'), /"type":"result"/)
		}
	})

	test("the record's evaluated set hashes the task set, the checks, and the file arm's source", () => {
		const e = setup()
		write(e, 'docs/GUIDE.md', 'current guide\n')
		suite(e, taskSet([{ id: 'read-guide', check: `sh ${SUITE_DIR}/checks/guide.sh` }]), {
			'guide.sh': 'grep -q guide docs/GUIDE.md\n',
			'lib/common.sh': 'true\n',
		})
		write(e, 'drafts/guide-v2.md', 'draft guide\n')
		const [record] = runOk(e, ['with=file:docs/GUIDE.md=path:drafts/guide-v2.md'], ['--runs', '1'])
		const expected = [
			`${SUITE_DIR}/checks/guide.sh`,
			`${SUITE_DIR}/checks/lib/common.sh`,
			`${SUITE_DIR}/tasks.json`,
			'drafts/guide-v2.md',
		]
		assert.deepEqual(record.evaluated.map((x: Json) => x.path).sort(), expected)
		for (const entry of record.evaluated) assert.equal(entry.sha256, sha256(join(e.repo, entry.path)), entry.path)
	})

	test('a record names the model the transcript reports', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs'], { model: 'sonnet' }))
		stub(e, { model: 'model-alpha-2026' })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.model, 'sonnet')
		assert.equal(record.scoring_model, 'model-alpha-2026')
	})

	test('a record whose transcript names no model records the launched model', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs'], { model: 'model-beta' }))
		stub(e, { model: null })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(record.scoring_model, 'model-beta')
	})

	test('an arm with no passing run reports no cost per success', () => {
		const e = setup()
		suite(e, taskSet([{ id: 'never', check: 'false' }]))
		stub(e, { cost: 0.2 })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '4'])
		assert.equal(record.summary.overall.passes, 0)
		assert.equal(record.summary.overall.costPerSuccessUsd, undefined)
		assert.equal(record.summary.overall.totalCostUsd, 0.8)
	})

	test('cost per success is total cost over passes', () => {
		const e = setup()
		suite(
			e,
			taskSet([
				{ id: 'always', check: 'true' },
				{ id: 'never', check: 'false' },
			]),
		)
		stub(e, { cost: 0.2 })
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '2'])
		assert.equal(record.summary.overall.runs, 4)
		assert.equal(record.summary.overall.passes, 2)
		assert.equal(record.summary.overall.costPerSuccessUsd, 0.4)
	})

	test('a baseline run writes the committed baseline with per-run metrics and no transcript references', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		const [record] = runOk(e, ['after=git:HEAD'], ['--runs', '3', '--baseline'])
		const path = join(e.repo, SUITE_DIR, 'baseline.json')
		assert.ok(existsSync(path))
		const text = readFileSync(path, 'utf8')
		const baseline = JSON.parse(text)
		assert.equal(baseline.runs.length, 6)
		for (const run of baseline.runs) assert.equal(typeof run.turns, 'number')
		assert.doesNotMatch(text, /"transcript"/)
		assert.ok(record.runs.every((r: Json) => typeof r.transcript === 'string'))
	})

	test('a run without the baseline flag leaves baseline.json untouched', () => {
		const e = setup()
		write(e, `${SUITE_DIR}/baseline.json`, '{ "schemaVersion": 3, "note": "committed" }\n')
		suite(e, taskSet(['trim-logs']))
		const before = readFileSync(join(e.repo, SUITE_DIR, 'baseline.json'))
		runOk(e, ['after=git:HEAD'], ['--runs', '1'])
		assert.equal(launches(e).length, 1)
		assert.deepEqual(readFileSync(join(e.repo, SUITE_DIR, 'baseline.json')), before)
	})
})

// ─── UC4 — compare (Givens the engine itself produces) ────────────────────────

describe('UC4 — compare', () => {
	test('a baseline is compared from its own per-run metrics without stored runs', () => {
		const e = setup()
		suite(e, taskSet(['trim-logs', 'pin-versions']))
		stub(e, { turns: 7 })
		runOk(e, ['before=git:HEAD'], ['--runs', '2', '--baseline'])
		stub(e, { turns: 9 })
		const [afterRecord] = runOk(e, ['after=git:HEAD'], ['--runs', '2'])
		const afterPath = join(e.base, 'after.json')
		writeFileSync(afterPath, JSON.stringify(afterRecord))
		rmSync(join(e.repo, '.agents/aced/results'), { recursive: true, force: true })
		const r = bench(e, ['compare', `--suite=${SUITE}`, '--before', 'baseline', '--after', afterPath])
		assert.equal(r.status, 0, r.stderr)
		const c = JSON.parse(r.stdout)
		const turns = c.rows.filter((x: Json) => x.scope === 'task' && x.metric === 'turns')
		assert.equal(turns.length, 2)
		for (const row of turns) {
			assert.equal(row.before.n, 2)
			assert.equal(row.before.mean, 7)
			assert.equal(row.after.mean, 9)
		}
	})

	test("a task's tags are copied into that task's rows", () => {
		const e = setup()
		suite(e, taskSet([{ id: 'trim-logs', tags: { area: 'logging' } }, 'pin-versions']))
		const [before, afterRecord] = runOk(e, ['before=git:HEAD', 'after=git:HEAD'], ['--runs', '1'])
		const paths = [before, afterRecord].map((rec, i) => {
			const p = join(e.base, `rec-${i}.json`)
			writeFileSync(p, JSON.stringify(rec))
			return p
		})
		const r = bench(e, ['compare', `--suite=${SUITE}`, '--before', paths[0] as string, '--after', paths[1] as string])
		assert.equal(r.status, 0, r.stderr)
		const rows = JSON.parse(r.stdout).rows.filter((x: Json) => x.task === 'trim-logs')
		assert.equal(rows.length, 8)
		for (const row of rows) assert.deepEqual(row.tags, { area: 'logging' })
		const other = JSON.parse(r.stdout).rows.filter((x: Json) => x.task === 'pin-versions')
		for (const row of other) assert.deepEqual(row.tags, {})
	})
})
