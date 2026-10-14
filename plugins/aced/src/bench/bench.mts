#!/usr/bin/env node
// aced-bench — the measured layer's engine: plan, run, and compare real headless agent runs.
//
//   aced-bench init    --suite <s>
//   aced-bench plan    --suite <s> --arm <label>=<subject> … [--harness claude-code] [--runs N]
//                      [--task <id>] [--baseline] --out <plan.json>
//   aced-bench run     --plan <plan.json> --consent
//   aced-bench compare --suite <s> --before <record.json|baseline> --after <record.json> [--tag k=v …]
//
// A subject is `git:<ref>`, `package:<name>@<version>`, or `file:<path>=ref:<ref>` /
// `file:<path>=path:<source>` / `file:<path>=absent`.
//
// `plan` spends nothing: it prices the run (ceiling and estimate), checks it can start, and states
// every warning. `run` spends only with `--consent`, and only on the plan it was given — a suite
// that changed since the plan is refused, because the consent was given to a different plan.
// `compare` reads schema-version-3 run records only and writes a comparison record whose verdict
// follows the spec's closed form (bench-compare.mts).
//
// Every verb prints JSON on stdout and exits 0 on success; a refusal prints `aced-bench: <reason>`
// on stderr and exits 1; a malformed command line exits 2.
//
// Spec: .agents/specs/aced/eval-run/bench/engine/README.md. A port of repobuddy's
// agent-readiness bench, generalized to three subject kinds and a harness adapter seam.

import { type SpawnSyncReturns, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	accessSync,
	constants,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'
import { ADAPTER_HARNESSES, type Adapter, adapterFor } from './bench-claude-code.mts'
import { compareRecords, minAttainableP } from './bench-compare.mts'
import {
	type EvaluatedEntry,
	median,
	type RunRecord,
	type RunResult,
	resultsDir,
	round,
	SCHEMA_VERSION,
	SUITE_NAME_RULE,
	type Subject,
	type Summary,
	stamp,
	suiteDir,
} from './bench-record.mts'

class BenchError extends Error {}

// ─── task set ─────────────────────────────────────────────────────────────────

interface Task {
	id: string
	prompt: string
	check: string
	setup?: string
	tags?: Record<string, string>
}

interface TaskSet {
	model: string
	runs: number
	maxBudgetUsd: number
	permissionMode: string
	timeoutMinutes: number
	setup?: string
	tasks: Task[]
}

const DEFAULTS = {
	model: 'sonnet',
	runs: 3,
	maxBudgetUsd: 0.5,
	permissionMode: 'bypassPermissions',
	timeoutMinutes: 20,
}

const TEMPLATE = {
	model: DEFAULTS.model,
	runs: DEFAULTS.runs,
	maxBudgetUsd: DEFAULTS.maxBudgetUsd,
	permissionMode: DEFAULTS.permissionMode,
	timeoutMinutes: DEFAULTS.timeoutMinutes,
	tasks: [
		{
			id: 'example-task',
			prompt:
				'Replace this with one small, self-contained task, then write a one-line summary of what you did to SUMMARY.md.',
			check: 'test -s SUMMARY.md',
			tags: { area: 'example' },
		},
	],
}

function positive(raw: Record<string, unknown>, key: keyof typeof DEFAULTS, integer = false): number {
	const v = raw[key]
	if (v === undefined) return DEFAULTS[key] as number
	if (typeof v !== 'number' || !(v > 0) || (integer && !Number.isInteger(v)))
		throw new BenchError(`tasks.json: "${key}" must be a positive ${integer ? 'whole ' : ''}number`)
	return v
}

function parseTaskSet(text: string): TaskSet {
	let raw: Record<string, unknown>
	try {
		raw = JSON.parse(text)
	} catch (e) {
		throw new BenchError(`tasks.json is not valid JSON: ${(e as Error).message}`)
	}
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
		throw new BenchError('tasks.json must hold a JSON object')
	if (!Array.isArray(raw.tasks)) throw new BenchError('tasks.json: "tasks" must be a list of tasks')
	if (raw.tasks.length === 0) throw new BenchError('tasks.json: the tasks list is empty; list at least one task')
	const ids = new Set<string>()
	const tasks = raw.tasks.map((t: Record<string, unknown>, i: number): Task => {
		if (t === null || typeof t !== 'object') throw new BenchError(`tasks.json: tasks[${i}] must be an object`)
		const label = typeof t.id === 'string' && t.id ? `tasks[${i}] ("${t.id}")` : `tasks[${i}]`
		for (const key of ['id', 'prompt', 'check'] as const) {
			if (typeof t[key] !== 'string' || t[key] === '') throw new BenchError(`tasks.json: ${label} has no "${key}"`)
		}
		if (t.setup !== undefined && typeof t.setup !== 'string')
			throw new BenchError(`tasks.json: ${label} "setup" must be a string`)
		if (
			t.tags !== undefined &&
			(t.tags === null ||
				typeof t.tags !== 'object' ||
				Array.isArray(t.tags) ||
				Object.values(t.tags).some((v) => typeof v !== 'string'))
		)
			throw new BenchError(`tasks.json: ${label} "tags" must map keys to string values`)
		const id = t.id as string
		if (ids.has(id)) throw new BenchError(`tasks.json: the task id "${id}" appears twice`)
		ids.add(id)
		return {
			id,
			prompt: t.prompt as string,
			check: t.check as string,
			...(t.setup ? { setup: t.setup as string } : {}),
			...(t.tags ? { tags: t.tags as Record<string, string> } : {}),
		}
	})
	if (raw.setup !== undefined && typeof raw.setup !== 'string')
		throw new BenchError('tasks.json: "setup" must be a string')
	for (const key of ['model', 'permissionMode'] as const)
		if (raw[key] !== undefined && (typeof raw[key] !== 'string' || raw[key] === ''))
			throw new BenchError(`tasks.json: "${key}" must be a non-empty string`)
	return {
		model: (raw.model as string | undefined) ?? DEFAULTS.model,
		runs: positive(raw, 'runs', true),
		maxBudgetUsd: positive(raw, 'maxBudgetUsd'),
		permissionMode: (raw.permissionMode as string | undefined) ?? DEFAULTS.permissionMode,
		timeoutMinutes: positive(raw, 'timeoutMinutes'),
		...(raw.setup ? { setup: raw.setup as string } : {}),
		tasks,
	}
}

// ─── git ──────────────────────────────────────────────────────────────────────

function git(cwd: string, args: string[]): SpawnSyncReturns<string> {
	return spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
}

function gitOk(cwd: string, args: string[], what: string): string {
	const r = git(cwd, args)
	if (r.status !== 0) throw new BenchError(`${what}: ${(r.stderr || r.error?.message || '').trim()}`)
	return r.stdout
}

function repoRoot(cwd: string): string {
	const r = git(cwd, ['rev-parse', '--show-toplevel'])
	if (r.status !== 0) throw new BenchError('not inside a git repository')
	return r.stdout.trim()
}

function resolveCommit(root: string, ref: string): string | undefined {
	const r = git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
	return r.status === 0 ? r.stdout.trim() : undefined
}

function showAt(root: string, commit: string, path: string): Buffer | undefined {
	const r = spawnSync('git', ['show', `${commit}:${path}`], { cwd: root, maxBuffer: 256 * 1024 * 1024 })
	return r.status === 0 ? r.stdout : undefined
}

/** The task set's committed files at `commit`: tasks.json and everything under checks/, path-sorted. */
function taskSetFiles(root: string, suite: string, commit: string): Array<{ path: string; content: Buffer }> {
	const dir = suiteDir(suite)
	const listed = git(root, ['ls-tree', '-r', '--name-only', commit, '--', `${dir}/tasks.json`, `${dir}/checks`])
	if (listed.status !== 0) return []
	return listed.stdout
		.split('\n')
		.filter(Boolean)
		.sort()
		.map((path) => ({ path, content: showAt(root, commit, path) ?? Buffer.alloc(0) }))
}

function taskSetHash(files: Array<{ path: string; content: Buffer }>): string {
	const h = createHash('sha256')
	for (const f of files) h.update(f.path).update('\0').update(f.content).update('\0')
	return h.digest('hex')
}

const sha256 = (content: Buffer) => createHash('sha256').update(content).digest('hex')

// ─── subjects ─────────────────────────────────────────────────────────────────

interface Arm {
	label: string
	subject: Subject & { commit?: string }
}

const ARM_LABEL = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

type ArmSpec =
	| { label: string; kind: 'git-ref'; ref: string }
	| { label: string; kind: 'package'; name: string; version: string }
	| { label: string; kind: 'file'; path: string; from: string }

function parseArm(text: string): ArmSpec {
	const eq = text.indexOf('=')
	const label = text.slice(0, eq)
	const subject = text.slice(eq + 1)
	if (eq <= 0 || !ARM_LABEL.test(label)) throw new UsageError(`--arm "${text}" needs <label>=<subject>`)
	if (subject.startsWith('git:') && subject.length > 4) return { label, kind: 'git-ref', ref: subject.slice(4) }
	if (subject.startsWith('package:')) {
		const spec = subject.slice(8)
		const at = spec.lastIndexOf('@')
		if (at > 0 && at < spec.length - 1)
			return { label, kind: 'package', name: spec.slice(0, at), version: spec.slice(at + 1) }
	}
	const file = /^file:(.+?)=(ref:.+|path:.+|absent)$/.exec(subject)
	if (file) return { label, kind: 'file', path: file[1] as string, from: file[2] as string }
	throw new UsageError(
		`--arm "${text}": the subject must be git:<ref>, package:<name>@<version>, or file:<path>=ref:<ref>|path:<source>|absent`,
	)
}

function insideRepo(path: string): boolean {
	const n = normalize(path)
	return !isAbsolute(n) && n !== '..' && !n.startsWith(`..${'/'}`) && n !== '.'
}

function resolveArm(root: string, spec: ArmSpec): Arm {
	if (spec.kind === 'git-ref') {
		const commit = resolveCommit(root, spec.ref)
		if (!commit)
			throw new BenchError(`arm "${spec.label}": the git ref "${spec.ref}" names no commit in this repository`)
		return { label: spec.label, subject: { kind: 'git-ref', ref: spec.ref, commit } }
	}
	if (spec.kind === 'package') {
		const r = spawnSync('npm', ['view', `${spec.name}@${spec.version}`, 'version', '--json'], {
			cwd: root,
			encoding: 'utf8',
		})
		const found = r.status === 0 && r.stdout.trim() !== '' && r.stdout.trim() !== '[]'
		if (!found)
			throw new BenchError(
				`arm "${spec.label}": the registry has no package "${spec.name}" at version "${spec.version}"`,
			)
		return { label: spec.label, subject: { kind: 'package', name: spec.name, version: spec.version } }
	}
	if (!insideRepo(spec.path))
		throw new BenchError(`arm "${spec.label}": the file path "${spec.path}" is outside the repository`)
	const subject: Arm['subject'] = { kind: 'file', path: spec.path, from: spec.from }
	if (spec.from.startsWith('ref:')) {
		const ref = spec.from.slice(4)
		const commit = resolveCommit(root, ref)
		if (!commit) throw new BenchError(`arm "${spec.label}": the git ref "${ref}" names no commit in this repository`)
		if (git(root, ['cat-file', '-e', `${commit}:${spec.path}`]).status !== 0)
			throw new BenchError(`arm "${spec.label}": ${spec.path} does not exist at "${ref}"`)
		subject.commit = commit
	} else if (spec.from.startsWith('path:')) {
		const source = spec.from.slice(5)
		if (!insideRepo(source) || !existsSync(join(root, source)))
			throw new BenchError(`arm "${spec.label}": the source file ${source} does not exist`)
	}
	return { label: spec.label, subject }
}

function onPath(executable: string): boolean {
	for (const dir of (process.env.PATH ?? '').split(delimiter)) {
		if (!dir) continue
		try {
			accessSync(join(dir, executable), constants.X_OK)
			return true
		} catch {}
	}
	return false
}

// ─── plan ─────────────────────────────────────────────────────────────────────

interface Warning {
	code: 'suite-uncommitted' | 'uncommitted-not-benched' | 'too-few-to-call'
	message: string
}

interface Plan {
	planVersion: 1
	suite: string
	harness: string
	adapter: string
	runner: string
	model: string
	permissionMode: string
	permissionScope: string
	maxBudgetUsd: number
	timeoutMinutes: number
	runsPerArm: number
	baseline: boolean
	arms: Arm[]
	tasks: string[]
	counts: { arms: number; tasks: number; runsPerArm: number; totalRuns: number }
	ceilingUsd: number
	estimate: {
		totalUsd: number
		tasks: Record<string, { usd: number; perRunUsd: number; source: 'stored' | 'cap'; storedRuns: number }>
	}
	warnings: Warning[]
	taskSetCommit: string
	taskSetHash: string
}

function checkSuiteName(suite: string | undefined): string {
	if (suite === undefined) throw new UsageError('--suite is required')
	if (!SUITE_NAME_RULE.test(suite))
		throw new BenchError(
			`suite name "${suite}" is outside the suite naming rule ${SUITE_NAME_RULE.source} (lowercase letters and digits, segments joined by a single "-" or ".")`,
		)
	return suite
}

function loadCommittedTaskSet(root: string, suite: string, commit: string): TaskSet {
	const path = `${suiteDir(suite)}/tasks.json`
	const text = showAt(root, commit, path)
	if (text === undefined) {
		if (existsSync(join(root, path)))
			throw new BenchError(`${path} is not committed; the committed task set is what runs, so commit it first`)
		throw new BenchError(
			`suite "${suite}" has no task set: ${path} does not exist (create one with \`aced-bench init --suite ${suite}\`)`,
		)
	}
	return parseTaskSet(text.toString('utf8'))
}

/** Per task: the cost of each stored, error-free run on the same model, harness, and runner. */
function storedCosts(
	root: string,
	suite: string,
	model: string,
	harness: string,
	runner: string,
): Map<string, number[]> {
	const dir = join(root, resultsDir(suite))
	const costs = new Map<string, number[]>()
	if (!existsSync(dir)) return costs
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.json') || file.startsWith('compare-')) continue
		let record: Partial<RunRecord>
		try {
			record = JSON.parse(readFileSync(join(dir, file), 'utf8'))
		} catch {
			continue
		}
		if (
			record?.schemaVersion !== SCHEMA_VERSION ||
			record.layer !== 'measured' ||
			record.model !== model ||
			record.harness !== harness ||
			record.runner !== runner ||
			!Array.isArray(record.runs)
		)
			continue
		for (const r of record.runs) {
			if (r.error || typeof r.costUsd !== 'number') continue
			costs.set(r.task, [...(costs.get(r.task) ?? []), r.costUsd])
		}
	}
	return costs
}

function porcelain(root: string, pathspecs: string[]): string {
	return gitOk(root, ['status', '--porcelain', '--untracked-files=all', '--', ...pathspecs], 'git status failed').trim()
}

function plan(root: string, args: Args): Plan {
	const suite = checkSuiteName(args.suite)
	const specs = (args.arm ?? []).map(parseArm)
	if (specs.length === 0) throw new UsageError('plan needs at least one --arm <label>=<subject>')
	if (new Set(specs.map((s) => s.label)).size !== specs.length) throw new UsageError('each --arm needs its own label')
	if (!args.out) throw new UsageError('plan needs --out <file>')
	let runsOverride: number | undefined
	if (args.runs !== undefined) {
		runsOverride = Number(args.runs)
		if (!Number.isInteger(runsOverride) || runsOverride < 1)
			throw new UsageError('--runs must be a positive whole number')
	}
	const harness = args.harness ?? 'claude-code'

	const taskSetCommit = resolveCommit(root, 'HEAD')
	if (!taskSetCommit) throw new BenchError('the repository has no commit; the task set must be committed')
	const taskSet = loadCommittedTaskSet(root, suite, taskSetCommit)

	let tasks = taskSet.tasks
	if (args.task !== undefined) {
		tasks = tasks.filter((t) => t.id === args.task)
		if (tasks.length === 0)
			throw new BenchError(
				`no task "${args.task}" in suite "${suite}" (tasks: ${taskSet.tasks.map((t) => t.id).join(', ')})`,
			)
	}

	const adapter = adapterFor(harness)
	if (!adapter)
		throw new BenchError(
			`the harness "${harness}" has no adapter (harnesses with one: ${ADAPTER_HARNESSES.join(', ')})`,
		)
	if (!onPath(adapter.executable))
		throw new BenchError(
			`the ${harness} command "${adapter.executable}" is not on the PATH, so no run could start; install it or fix PATH before planning`,
		)
	if (args.baseline && specs.length > 1)
		throw new BenchError(`a suite records one baseline: --baseline takes exactly one --arm, not ${specs.length}`)

	const arms = specs.map((s) => resolveArm(root, s))

	const warnings: Warning[] = []
	const dir = suiteDir(suite)
	if (porcelain(root, [`${dir}/tasks.json`, `${dir}/checks`]) !== '')
		warnings.push({
			code: 'suite-uncommitted',
			message: `the suite has uncommitted changes; the committed suite (${taskSetCommit.slice(0, 12)}) is what runs`,
		})
	if (
		arms.some((a) => a.subject.kind === 'git-ref') &&
		porcelain(root, [
			'.',
			`:(exclude)${dir}/tasks.json`,
			`:(exclude)${dir}/checks`,
			':(exclude).agents/aced/results',
		]) !== ''
	)
		warnings.push({
			code: 'uncommitted-not-benched',
			message:
				'the working tree has uncommitted changes; they are not benched, since a git-ref arm runs its committed tree',
		})

	const runsPerArm = runsOverride ?? taskSet.runs
	const ceilingUsd = round(arms.length * tasks.length * runsPerArm * taskSet.maxBudgetUsd)
	const stored = storedCosts(root, suite, taskSet.model, harness, adapter.runner)
	const estimateTasks: Plan['estimate']['tasks'] = {}
	for (const t of tasks) {
		const costs = stored.get(t.id) ?? []
		const perRunUsd = costs.length > 0 ? median(costs) : taskSet.maxBudgetUsd
		estimateTasks[t.id] = {
			usd: round(arms.length * runsPerArm * perRunUsd),
			perRunUsd: round(perRunUsd),
			source: costs.length > 0 ? 'stored' : 'cap',
			storedRuns: costs.length,
		}
	}
	const totalUsd = round(Object.values(estimateTasks).reduce((s, e) => s + e.usd, 0))

	const perTaskMinP = minAttainableP([[runsPerArm, runsPerArm]])
	if (perTaskMinP > 0.05) {
		const pooledMinP = minAttainableP(tasks.map(() => [runsPerArm, runsPerArm]))
		const pooled =
			tasks.length >= 2 && pooledMinP <= 0.05
				? `a pooled result across the ${tasks.length} tasks still can (smallest attainable p ${round(pooledMinP, 6)})`
				: `a pooled result across ${tasks.length === 1 ? 'one task' : `the ${tasks.length} tasks`} cannot either`
		warnings.push({
			code: 'too-few-to-call',
			message: `too few to call: at ${runsPerArm} runs per arm no single task's result can be significant (smallest attainable p ${round(perTaskMinP, 6)} > 0.05); ${pooled}`,
		})
	}

	return {
		planVersion: 1,
		suite,
		harness,
		adapter: adapter.name,
		runner: adapter.runner,
		model: taskSet.model,
		permissionMode: taskSet.permissionMode,
		permissionScope: `the agent runs with --permission-mode ${taskSet.permissionMode}; it applies only inside the throwaway checkout each run gets, never to this working tree`,
		maxBudgetUsd: taskSet.maxBudgetUsd,
		timeoutMinutes: taskSet.timeoutMinutes,
		runsPerArm,
		baseline: Boolean(args.baseline),
		arms,
		tasks: tasks.map((t) => t.id),
		counts: { arms: arms.length, tasks: tasks.length, runsPerArm, totalRuns: arms.length * tasks.length * runsPerArm },
		ceilingUsd,
		estimate: { totalUsd, tasks: estimateTasks },
		warnings,
		taskSetCommit,
		taskSetHash: taskSetHash(taskSetFiles(root, suite, taskSetCommit)),
	}
}

// ─── run ──────────────────────────────────────────────────────────────────────

const SHELL_TIMEOUT_MS = 15 * 60 * 1000

function shell(command: string, cwd: string): number | null {
	return spawnSync('sh', ['-c', command], { cwd, stdio: 'ignore', timeout: SHELL_TIMEOUT_MS }).status
}

function zeroMetrics(): Omit<RunResult, 'task' | 'run' | 'pass' | 'error' | 'transcript'> {
	return {
		wallMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheCreationTokens: 0,
		turns: 0,
		toolCalls: 0,
		costUsd: 0,
		capped: false,
	}
}

interface RunContext {
	root: string
	plan: Plan
	taskSet: TaskSet
	adapter: Adapter
	transcriptDir: string
}

/** Applies the arm's subject to the checkout. Returns what the launch needs for a package arm. */
function applySubject(
	ctx: RunContext,
	arm: Arm,
	checkout: string,
	runTemp: string,
): { pluginDir?: string; env?: Record<string, string> } {
	const s = arm.subject
	if (s.kind === 'file') {
		const target = join(checkout, s.path)
		if (s.from === 'absent') {
			rmSync(target, { force: true, recursive: true })
		} else {
			const content = s.from.startsWith('ref:')
				? showAt(ctx.root, s.commit ?? s.from.slice(4), s.path)
				: readFileSync(join(ctx.root, s.from.slice(5)))
			if (content === undefined) throw new BenchError(`could not read ${s.path} at ${s.from}`)
			mkdirSync(dirname(target), { recursive: true })
			writeFileSync(target, content)
		}
		return {}
	}
	if (s.kind === 'package') {
		const packDir = join(runTemp, 'package-pack')
		mkdirSync(packDir, { recursive: true })
		const pack = spawnSync('npm', ['pack', `${s.name}@${s.version}`, '--pack-destination', packDir], {
			cwd: runTemp,
			encoding: 'utf8',
		})
		const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'))
		if (pack.status !== 0 || !tarball)
			throw new BenchError(`npm pack ${s.name}@${s.version} failed: ${(pack.stderr || '').trim()}`)
		const unpacked = join(runTemp, 'package')
		mkdirSync(unpacked, { recursive: true })
		const untar = spawnSync('tar', ['-xzf', join(packDir, tarball), '-C', unpacked], { encoding: 'utf8' })
		if (untar.status !== 0) throw new BenchError(`could not unpack ${tarball}: ${untar.stderr.trim()}`)
		return { pluginDir: join(unpacked, 'package'), env: ctx.adapter.isolatedConfig(runTemp) }
	}
	return {}
}

/**
 * Overlays the task-set commit's suite, stages the subject's change with it, and commits both with
 * a throwaway identity, so the agent starts on a clean tree.
 */
function commitCheckout(ctx: RunContext, checkout: string): void {
	const dir = suiteDir(ctx.plan.suite)
	gitOk(checkout, ['rm', '-r', '-q', '--ignore-unmatch', '--', dir], 'could not clear the suite in the checkout')
	gitOk(checkout, ['checkout', ctx.plan.taskSetCommit, '--', dir], 'could not overlay the task-set commit')
	gitOk(checkout, ['add', '-A'], 'could not stage the checkout')
	if (git(checkout, ['diff', '--cached', '--quiet']).status === 0) return
	gitOk(
		checkout,
		[
			'-c',
			'user.name=aced-bench',
			'-c',
			'user.email=aced-bench@localhost',
			'-c',
			'commit.gpgsign=false',
			'-c',
			'core.hooksPath=/dev/null',
			'commit',
			'--quiet',
			'--no-verify',
			'-m',
			`bench: task set from ${ctx.plan.taskSetCommit}`,
		],
		'could not commit the overlaid task set',
	)
}

function runOne(ctx: RunContext, arm: Arm, task: Task, run: number): RunResult & { model?: string } {
	const runTemp = realpathSync(mkdtempSync(join(tmpdir(), 'aced-bench-')))
	const checkout = join(runTemp, 'repo')
	const base = { task: task.id, run }
	try {
		const at = arm.subject.kind === 'git-ref' ? arm.subject.commit : 'HEAD'
		gitOk(ctx.root, ['worktree', 'add', '--detach', '--quiet', checkout, at], 'git worktree add failed')
		const launch = applySubject(ctx, arm, checkout, runTemp)
		commitCheckout(ctx, checkout)
		for (const [name, command] of [
			['suite setup', ctx.taskSet.setup],
			[`${task.id} setup`, task.setup],
		] as const) {
			if (command && shell(command, checkout) !== 0)
				return { ...base, ...zeroMetrics(), pass: false, error: `${name} failed: ${command}`, transcript: null }
		}
		const start = performance.now()
		const { transcript, model, ...metrics } = ctx.adapter.launch({
			prompt: task.prompt,
			model: ctx.plan.model,
			maxBudgetUsd: ctx.plan.maxBudgetUsd,
			permissionMode: ctx.plan.permissionMode,
			checkout,
			timeoutMs: ctx.plan.timeoutMinutes * 60 * 1000,
			...launch,
		})
		const wallMs = Math.round(performance.now() - start)
		const pass = shell(task.check, checkout) === 0
		let kept: string | null = null
		if (transcript) {
			kept = `${ctx.transcriptDir}/${task.id}-${run}.jsonl.gz`
			mkdirSync(dirname(join(ctx.root, kept)), { recursive: true })
			writeFileSync(join(ctx.root, kept), gzipSync(transcript))
		}
		return { ...base, ...metrics, wallMs, pass, error: null, transcript: kept, ...(model ? { model } : {}) }
	} finally {
		git(ctx.root, ['worktree', 'remove', '--force', checkout])
		rmSync(runTemp, { recursive: true, force: true })
		git(ctx.root, ['worktree', 'prune'])
	}
}

function summarize(runs: RunResult[]): Summary {
	const passes = runs.filter((r) => r.pass).length
	const ok = runs.filter((r) => !r.error)
	const m = (f: (r: RunResult) => number) => median(ok.map(f))
	const totalCostUsd = round(runs.reduce((s, r) => s + r.costUsd, 0))
	return {
		runs: runs.length,
		passes,
		passRate: runs.length === 0 ? 0 : round(passes / runs.length),
		capped: runs.filter((r) => r.capped).length,
		errors: runs.length - ok.length,
		medianInputTokens: m((r) => r.inputTokens),
		medianOutputTokens: m((r) => r.outputTokens),
		medianCacheReadTokens: m((r) => r.cacheReadTokens),
		medianTurns: m((r) => r.turns),
		medianToolCalls: m((r) => r.toolCalls),
		medianWallMs: m((r) => r.wallMs),
		totalCostUsd,
		...(passes > 0 ? { costPerSuccessUsd: round(totalCostUsd / passes) } : {}),
	}
}

/** A createdAt whose record file and transcript folder are both still free. */
function freshCreatedAt(dir: string, suffix: string, last: number): string {
	let t = Math.max(Date.now(), last + 1)
	for (;;) {
		const createdAt = new Date(t).toISOString()
		if (!existsSync(join(dir, `${stamp(createdAt)}${suffix}`)) && !existsSync(join(dir, stamp(createdAt))))
			return createdAt
		t++
	}
}

function readPlan(path: string): Plan {
	let plan: Plan
	try {
		plan = JSON.parse(readFileSync(path, 'utf8'))
	} catch (e) {
		throw new BenchError(`cannot read the plan ${path}: ${(e as Error).message}`)
	}
	if (plan?.planVersion !== 1 || !Array.isArray(plan.arms) || !Array.isArray(plan.tasks))
		throw new BenchError(`${path} is not an aced-bench plan`)
	return plan
}

function runPlan(root: string, args: Args): { records: string[]; baseline?: string } {
	if (!args.plan) throw new UsageError('run needs --plan <file>')
	if (!args.consent)
		throw new BenchError(
			'run spends real money and needs explicit consent: re-run with --consent; nothing was launched',
		)
	const plan = readPlan(resolve(args.plan))
	checkSuiteName(plan.suite)
	const adapter = adapterFor(plan.harness)
	if (!adapter) throw new BenchError(`the harness "${plan.harness}" has no adapter`)
	const head = resolveCommit(root, 'HEAD')
	const current = head ? taskSetHash(taskSetFiles(root, plan.suite, head)) : ''
	if (current !== plan.taskSetHash)
		throw new BenchError(
			`the suite "${plan.suite}" changed since the plan was written (task-set hash differs); the consent was given to a different plan, so plan again`,
		)
	const taskSet = loadCommittedTaskSet(root, plan.suite, plan.taskSetCommit)
	const tasks = plan.tasks.map((id) => {
		const t = taskSet.tasks.find((x) => x.id === id)
		if (!t) throw new BenchError(`the plan's task "${id}" is not in the task-set commit`)
		return t
	})
	const files = taskSetFiles(root, plan.suite, plan.taskSetCommit)
	const outDir = resultsDir(plan.suite)
	mkdirSync(join(root, outDir), { recursive: true })

	const written: string[] = []
	let baselinePath: string | undefined
	let last = 0
	for (const arm of plan.arms) {
		const createdAt = freshCreatedAt(join(root, outDir), `.${arm.label}.json`, last)
		last = Date.parse(createdAt)
		const ctx: RunContext = { root, plan, taskSet, adapter, transcriptDir: `${outDir}/${stamp(createdAt)}` }
		const runs: Array<RunResult & { model?: string }> = []
		for (const task of tasks) for (let run = 1; run <= plan.runsPerArm; run++) runs.push(runOne(ctx, arm, task, run))

		const evaluated: EvaluatedEntry[] = files.map((f) => ({ path: f.path, sha256: sha256(f.content), kind: 'file' }))
		if (arm.subject.kind === 'file' && arm.subject.from.startsWith('path:')) {
			const source = arm.subject.from.slice(5)
			evaluated.push({ path: source, sha256: sha256(readFileSync(join(root, source))), kind: 'file' })
		}
		const reported = runs.find((r) => r.model)?.model
		const clean: RunResult[] = runs.map(({ model: _, ...r }) => r)
		const tags: RunRecord['tags'] = {}
		for (const t of tasks) if (t.tags) tags[t.id] = t.tags
		const record: RunRecord = {
			schemaVersion: SCHEMA_VERSION,
			layer: 'measured',
			suite: plan.suite,
			arm: arm.label,
			subject: arm.subject,
			harness: plan.harness,
			adapter: adapter.name,
			runner: adapter.runner,
			taskSetCommit: plan.taskSetCommit,
			taskSetHash: plan.taskSetHash,
			tasks: tasks.map((t) => t.id),
			tags,
			model: plan.model,
			scoring_model: reported ?? plan.model,
			createdAt,
			evaluated,
			runs: clean,
			summary: {
				overall: summarize(clean),
				tasks: tasks.map((t) => ({ task: t.id, ...summarize(clean.filter((r) => r.task === t.id)) })),
			},
		}
		const path = `${outDir}/${stamp(createdAt)}.${arm.label}.json`
		writeFileSync(join(root, path), `${JSON.stringify(record, null, 2)}\n`)
		written.push(path)
		if (plan.baseline) {
			const baseline = { ...record, runs: clean.map(({ transcript: _, ...r }) => r) }
			baselinePath = `${suiteDir(plan.suite)}/baseline.json`
			writeFileSync(join(root, baselinePath), `${JSON.stringify(baseline, null, '\t')}\n`)
		}
	}
	return { records: written, ...(baselinePath ? { baseline: baselinePath } : {}) }
}

// ─── compare ──────────────────────────────────────────────────────────────────

function loadRecord(path: string): RunRecord {
	let record: Partial<RunRecord> & { schemaVersion?: unknown }
	try {
		record = JSON.parse(readFileSync(path, 'utf8'))
	} catch (e) {
		throw new BenchError(`cannot read the record ${path}: ${(e as Error).message}`)
	}
	if (record?.schemaVersion !== SCHEMA_VERSION)
		throw new BenchError(
			`${path} has schemaVersion ${record?.schemaVersion === undefined ? 'absent' : JSON.stringify(record.schemaVersion)}; this engine reads only schema version ${SCHEMA_VERSION}`,
		)
	if (!Array.isArray(record.runs)) throw new BenchError(`${path} is not a run record: it has no runs`)
	return record as RunRecord
}

function compare(root: string, args: Args): { path: string; record: object } {
	const suite = checkSuiteName(args.suite)
	if (!args.before || !args.after) throw new UsageError('compare needs --before and --after')
	const tags: Record<string, string> = {}
	for (const t of args.tag ?? []) {
		const eq = t.indexOf('=')
		if (eq <= 0) throw new UsageError(`--tag "${t}" needs key=value`)
		tags[t.slice(0, eq)] = t.slice(eq + 1)
	}
	let beforePath = resolve(args.before)
	if (args.before === 'baseline') {
		beforePath = join(root, suiteDir(suite), 'baseline.json')
		if (!existsSync(beforePath))
			throw new BenchError(`suite "${suite}" has no baseline: ${suiteDir(suite)}/baseline.json does not exist`)
	}
	const before = loadRecord(beforePath)
	const after = loadRecord(resolve(args.after))
	const comparison = compareRecords(before, after)
	const outDir = join(root, resultsDir(suite))
	mkdirSync(outDir, { recursive: true })
	const createdAt = freshCreatedAt(outDir, '.json', 0)
	const side = (r: RunRecord, source: string) => ({ source, arm: r.arm, createdAt: r.createdAt, subject: r.subject })
	const record = {
		schemaVersion: SCHEMA_VERSION,
		kind: 'comparison',
		suite,
		createdAt,
		before: side(before, args.before === 'baseline' ? 'baseline' : args.before),
		after: side(after, args.after),
		tags,
		...comparison,
	}
	const path = `${resultsDir(suite)}/compare-${stamp(createdAt)}.json`
	writeFileSync(join(root, path), `${JSON.stringify(record, null, 2)}\n`)
	return { path, record }
}

// ─── init ─────────────────────────────────────────────────────────────────────

function init(cwd: string, args: Args): string {
	const suite = checkSuiteName(args.suite)
	const r = git(cwd, ['rev-parse', '--show-toplevel'])
	const root = r.status === 0 ? r.stdout.trim() : cwd
	const path = `${suiteDir(suite)}/tasks.json`
	if (existsSync(join(root, path))) throw new BenchError(`${path} already exists; init never overwrites a task set`)
	mkdirSync(join(root, suiteDir(suite)), { recursive: true })
	writeFileSync(join(root, path), `${JSON.stringify(TEMPLATE, null, '\t')}\n`)
	return path
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

class UsageError extends Error {}

interface Args {
	suite?: string
	arm?: string[]
	harness?: string
	runs?: string
	task?: string
	baseline?: boolean
	out?: string
	plan?: string
	consent?: boolean
	before?: string
	after?: string
	tag?: string[]
}

const USAGE = `usage:
  aced-bench init    --suite <s>
  aced-bench plan    --suite <s> --arm <label>=<subject> … [--harness claude-code] [--runs N] [--task <id>] [--baseline] --out <file>
  aced-bench run     --plan <file> --consent
  aced-bench compare --suite <s> --before <record|baseline> --after <record> [--tag k=v …]`

function main(argv: string[]): number {
	const cwd = process.cwd()
	const [verb, ...rest] = argv
	if (verb === 'help' || verb === '--help' || verb === '-h') {
		process.stdout.write(`${USAGE}\n`)
		return 0
	}
	try {
		const { values } = parseArgs({
			args: rest,
			strict: true,
			options: {
				suite: { type: 'string' },
				arm: { type: 'string', multiple: true },
				harness: { type: 'string' },
				runs: { type: 'string' },
				task: { type: 'string' },
				baseline: { type: 'boolean' },
				out: { type: 'string' },
				plan: { type: 'string' },
				consent: { type: 'boolean' },
				before: { type: 'string' },
				after: { type: 'string' },
				tag: { type: 'string', multiple: true },
			},
		})
		const args = values as Args
		let output: unknown
		if (verb === 'init') output = { tasksFile: init(cwd, args) }
		else if (verb === 'plan') {
			const root = repoRoot(cwd)
			const p = plan(root, args)
			const out = resolve(cwd, args.out as string)
			mkdirSync(dirname(out), { recursive: true })
			writeFileSync(out, `${JSON.stringify(p, null, 2)}\n`)
			output = p
		} else if (verb === 'run') output = runPlan(repoRoot(cwd), args)
		else if (verb === 'compare') output = compare(repoRoot(cwd), args).record
		else throw new UsageError(verb ? `unknown verb "${verb}"` : 'no verb given')
		process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
		return 0
	} catch (e) {
		if (e instanceof UsageError || (e as NodeJS.ErrnoException).code?.startsWith('ERR_PARSE_ARGS')) {
			process.stderr.write(`aced-bench: ${(e as Error).message}\n${USAGE}\n`)
			return 2
		}
		process.stderr.write(`aced-bench: ${(e as Error).message}\n`)
		return 1
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
