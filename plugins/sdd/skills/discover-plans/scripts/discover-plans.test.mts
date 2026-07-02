import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	collectPlans,
	DEFAULT_PLAN_STATUS,
	filterByStatus,
	main,
	nextLead,
	type PlanRecord,
	parsePlanFrontmatter,
	TODO_STATUSES,
	toToon,
} from './discover-plans.mts'

// Write a <cr>.plan.md under <dir>/.agents/plans with the given contents.
function seedPlan(dir: string, cr: string, contents: string): void {
	const plansDir = join(dir, '.agents', 'plans')
	mkdirSync(plansDir, { recursive: true })
	writeFileSync(join(plansDir, `${cr}.plan.md`), contents)
}

// A minimal plan brief: name + an optional top-level status + a todos list with the given
// statuses + a NEXT anchor. Omit `planStatus` to leave the top-level status unset.
function brief(name: string, statuses: string[], next: string, planStatus?: string): string {
	const todos = statuses.map((s, i) => `  - id: t${i}\n    content: "step ${i}"\n    status: ${s}`).join('\n')
	const statusLine = planStatus === undefined ? '' : `status: ${planStatus}\n`
	return `---\nname: "${name}"\n${statusLine}todos:\n${todos}\n---\n\n## NEXT\n\n${next}\n`
}

// ── parsePlanFrontmatter ──

test('parsePlanFrontmatter reads name and tallies todos by status', () => {
	const fm = parsePlanFrontmatter(brief('demo', ['completed', 'completed', 'in_progress', 'pending'], 'do the thing'))
	assert.equal(fm?.name, 'demo')
	assert.equal(fm?.total, 4)
	assert.equal(fm?.completed, 2)
	assert.equal(fm?.inProgress, 1)
	assert.equal(fm?.pending, 1)
})

test('parsePlanFrontmatter returns null when there is no frontmatter block', () => {
	assert.equal(parsePlanFrontmatter('# just a heading\n'), null)
})

test('parsePlanFrontmatter strips quotes from the name', () => {
	const fm = parsePlanFrontmatter('---\nname: "quoted name"\ntodos:\n  - id: a\n    status: pending\n---\n')
	assert.equal(fm?.name, 'quoted name')
	assert.equal(fm?.total, 1)
})

test('parsePlanFrontmatter ignores status-like keys outside the todos block', () => {
	// A non-todos key after the list must not inflate the tally.
	const fm = parsePlanFrontmatter('---\nname: x\ntodos:\n  - id: a\n    status: completed\nisProject: false\n---\n')
	assert.equal(fm?.total, 1)
	assert.equal(fm?.completed, 1)
})

test('parsePlanFrontmatter handles an empty todos list', () => {
	const fm = parsePlanFrontmatter('---\nname: empty\ntodos: []\n---\n')
	assert.equal(fm?.name, 'empty')
	assert.equal(fm?.total, 0)
})

test('parsePlanFrontmatter reads the top-level status flag', () => {
	const fm = parsePlanFrontmatter(brief('demo', ['pending'], 'go', 'approved'))
	assert.equal(fm?.status, 'approved')
})

test('parsePlanFrontmatter defaults status to active when the top-level key is absent', () => {
	const fm = parsePlanFrontmatter(brief('demo', ['pending'], 'go'))
	assert.equal(fm?.status, DEFAULT_PLAN_STATUS)
	assert.equal(fm?.status, 'active')
})

test('parsePlanFrontmatter treats an empty status value as the default', () => {
	const fm = parsePlanFrontmatter('---\nname: x\nstatus:\ntodos:\n  - id: a\n    status: pending\n---\n')
	assert.equal(fm?.status, 'active')
})

test('parsePlanFrontmatter does not confuse a todo status with the plan status', () => {
	// The only `status:` here is a todo's — the plan-level status must stay the default.
	const fm = parsePlanFrontmatter(brief('demo', ['completed'], 'go'))
	assert.equal(fm?.status, 'active')
	assert.equal(fm?.completed, 1)
})

test('the todo status enum is exactly the three states', () => {
	assert.deepEqual([...TODO_STATUSES].sort(), ['completed', 'in_progress', 'pending'])
})

// ── nextLead ──

test('nextLead returns the first content line under ## NEXT', () => {
	assert.equal(nextLead('## NEXT\n\nStart with the script.\n'), 'Start with the script.')
})

test('nextLead matches a decorated NEXT heading and strips bullet/emphasis markers', () => {
	assert.equal(nextLead('## NEXT — resume here\n\n- **Build** the `foo` unit\n'), 'Build the `foo` unit')
})

test('nextLead returns empty when there is no NEXT section', () => {
	assert.equal(nextLead('## Overview\n\nsomething\n'), '')
})

test('nextLead returns empty when the NEXT section has no content before the next heading', () => {
	assert.equal(nextLead('## NEXT\n\n## CR\n\nbody\n'), '')
})

// ── collectPlans ──

test('collectPlans lists every plan brief keyed by cr ref, sorted', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	try {
		seedPlan(dir, 'github-38', brief('eight', ['pending'], 'phase A'))
		seedPlan(dir, 'github-34', brief('four', ['completed', 'pending'], 'sub-corpus'))
		const plans = collectPlans(dir)
		assert.deepEqual(
			plans.map((p) => p.cr),
			['github-34', 'github-38'],
		)
		const four = plans.find((p) => p.cr === 'github-34')
		assert.equal(four?.name, 'four')
		assert.equal(four?.total, 2)
		assert.equal(four?.completed, 1)
		assert.equal(four?.next, 'sub-corpus')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectPlans ignores non-plan files in the plans dir', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	try {
		seedPlan(dir, 'real', brief('real', ['pending'], 'go'))
		const plansDir = join(dir, '.agents', 'plans')
		writeFileSync(join(plansDir, 'real.log.jsonl'), '{"seq":1}\n')
		writeFileSync(join(plansDir, 'notes.md'), '# loose notes\n')
		const plans = collectPlans(dir)
		assert.deepEqual(
			plans.map((p) => p.cr),
			['real'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectPlans skips a *.plan.md with no frontmatter (a stray)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	try {
		seedPlan(dir, 'good', brief('good', ['pending'], 'go'))
		seedPlan(dir, 'stray', '# no frontmatter here\n')
		const plans = collectPlans(dir)
		assert.deepEqual(
			plans.map((p) => p.cr),
			['good'],
		)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectPlans returns empty when there is no plans dir', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	try {
		assert.deepEqual(collectPlans(dir), [])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('collectPlans carries each brief status, defaulting an unset one to active', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	try {
		seedPlan(dir, 'ready', brief('ready', ['pending'], 'go', 'approved'))
		seedPlan(dir, 'wip', brief('wip', ['in_progress'], 'go'))
		const plans = collectPlans(dir)
		assert.equal(plans.find((p) => p.cr === 'ready')?.status, 'approved')
		assert.equal(plans.find((p) => p.cr === 'wip')?.status, 'active')
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

// ── filterByStatus ──

const rec = (cr: string, status: string): PlanRecord => ({
	cr,
	name: cr,
	total: 1,
	completed: 0,
	inProgress: 0,
	status,
	next: '',
})

test('filterByStatus narrows to the requested status', () => {
	const plans = [rec('a', 'approved'), rec('b', 'active'), rec('c', 'approved')]
	assert.deepEqual(
		filterByStatus(plans, 'approved').map((p) => p.cr),
		['a', 'c'],
	)
})

test('filterByStatus to active includes the unset (defaulted) briefs', () => {
	// collectPlans normalizes an unset status to `active`, so an active filter selects them.
	const plans = [rec('a', 'active'), rec('b', 'approved')]
	assert.deepEqual(
		filterByStatus(plans, 'active').map((p) => p.cr),
		['a'],
	)
})

test('filterByStatus yields the empty set when no brief matches', () => {
	const plans = [rec('a', 'active'), rec('b', 'approved')]
	assert.deepEqual(filterByStatus(plans, 'nonesuch'), [])
})

// ── toToon ──

test('toToon emits a TOON table keyed by the plan columns', () => {
	const toon = toToon([
		{ cr: 'github-34', name: 'four', total: 2, completed: 1, inProgress: 0, status: 'approved', next: 'do, it' },
	])
	const lines = toon.split('\n')
	assert.equal(lines[0], 'plans[1]{cr,name,total,completed,inProgress,status,next}:')
	// `next` carries a comma → it must be quoted.
	assert.match(lines[1], /"do, it"$/)
	assert.match(lines[1], /github-34,four,2,1,0,approved,/)
})

// ── main (CLI smoke) ──

test('main returns 0 and prints a TOON header', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	const writes: string[] = []
	const orig = process.stdout.write.bind(process.stdout)
	;(process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
		writes.push(s)
		return true
	}
	try {
		seedPlan(dir, 'one', brief('one', ['pending'], 'go'))
		const code = main(['--root', dir])
		assert.equal(code, 0)
		assert.match(writes.join(''), /^plans\[1\]\{/)
	} finally {
		;(process.stdout as unknown as { write: typeof orig }).write = orig
		rmSync(dir, { recursive: true, force: true })
	}
})

test('main --status approved narrows the printed queue to approved briefs', () => {
	const dir = mkdtempSync(join(tmpdir(), 'plans-'))
	const writes: string[] = []
	const orig = process.stdout.write.bind(process.stdout)
	;(process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
		writes.push(s)
		return true
	}
	try {
		seedPlan(dir, 'ready', brief('ready', ['pending'], 'go', 'approved'))
		seedPlan(dir, 'wip', brief('wip', ['in_progress'], 'go'))
		const code = main(['--root', dir, '--status', 'approved'])
		assert.equal(code, 0)
		const out = writes.join('')
		assert.match(out, /^plans\[1\]\{/) // only the one approved brief
		assert.match(out, /ready,ready,/)
		assert.doesNotMatch(out, /\bwip\b/)
	} finally {
		;(process.stdout as unknown as { write: typeof orig }).write = orig
		rmSync(dir, { recursive: true, force: true })
	}
})
