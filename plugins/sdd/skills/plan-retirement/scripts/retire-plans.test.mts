import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { decideRetirements, discoverPlans, main, parseCleared, planFiles } from './retire-plans.mts'

// A throwaway plans dir seeded with the given cr-refs, each getting plan.md (+ log.jsonl
// unless noLog lists it). Returns the dir; the caller rms it.
function plansDir(refs: string[], noLog: string[] = []): string {
	const dir = mkdtempSync(join(tmpdir(), 'retire-plans-'))
	for (const ref of refs) {
		writeFileSync(join(dir, `${ref}.plan.md`), `# plan ${ref}\n`)
		if (!noLog.includes(ref)) writeFileSync(join(dir, `${ref}.log.jsonl`), `{"seq":1}\n`)
	}
	return dir
}

test('planFiles returns the plan brief and the combat log', () => {
	assert.deepEqual(planFiles('github-34'), ['github-34.plan.md', 'github-34.log.jsonl'])
})

test('parseCleared handles absent, empty, whitespace, and duplicate values', () => {
	assert.deepEqual(parseCleared(undefined), [])
	assert.deepEqual(parseCleared(''), [])
	assert.deepEqual(parseCleared(' github-34 , , asana-7 '), ['github-34', 'asana-7'])
	assert.deepEqual(parseCleared('a,a,b'), ['a', 'b'])
})

test('discoverPlans lists cr-refs with a plan.md and ignores other files', () => {
	const dir = plansDir(['github-34', 'local-foo'])
	writeFileSync(join(dir, 'stray.txt'), 'x')
	writeFileSync(join(dir, 'orphan.log.jsonl'), 'x') // a log with no plan is not a plan
	try {
		assert.deepEqual(discoverPlans(dir).sort(), ['github-34', 'local-foo'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('discoverPlans returns [] for a missing root', () => {
	assert.deepEqual(discoverPlans(join(tmpdir(), 'does-not-exist-retire')), [])
})

test('decideRetirements retires only the cleared-and-present cr-refs, fail-closed', () => {
	// uncleared-but-present is left out; cleared-but-absent is left out; order follows cleared
	assert.deepEqual(decideRetirements(['b', 'a', 'missing'], ['a', 'b', 'uncleared']), ['b', 'a'])
	assert.deepEqual(decideRetirements([], ['a']), [])
	assert.deepEqual(decideRetirements(['a', 'a'], ['a']), ['a'])
})

test('the sweep deletes both files for a cleared cr-ref (tracked deletion of the tree)', () => {
	const dir = plansDir(['github-34', 'local-bar'])
	try {
		const code = main(['--root', dir, '--retire', 'github-34'])
		assert.equal(code, 0)
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(!existsSync(join(dir, 'github-34.log.jsonl')))
		// the uncleared plan is untouched
		assert.ok(existsSync(join(dir, 'local-bar.plan.md')))
		assert.ok(existsSync(join(dir, 'local-bar.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an uncleared plan is never deleted (fail-closed)', () => {
	const dir = plansDir(['github-34'])
	try {
		main(['--root', dir, '--retire', 'asana-7']) // clears a different, absent ref
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('clearing a cr-ref does not collateral-delete a different cr-ref it is a prefix of', () => {
	const dir = plansDir(['github-3', 'github-34'])
	try {
		main(['--root', dir, '--retire', 'github-3']) // exact stem only
		assert.ok(!existsSync(join(dir, 'github-3.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the sweep only deletes — it creates no new file (writes nothing to the ledger)', () => {
	const dir = plansDir(['github-34', 'local-bar'])
	try {
		const before = new Set(readdirSync(dir))
		main(['--root', dir, '--retire', 'github-34'])
		// every surviving entry was present before; the sweep added nothing.
		for (const f of readdirSync(dir)) assert.ok(before.has(f), `unexpected new file ${f}`)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('a cleared cr-ref with no plan on disk is a no-op', () => {
	const dir = plansDir(['github-34'])
	try {
		const before = readdirSync(dir).sort()
		main(['--root', dir, '--retire', 'github-99']) // cleared but not present
		assert.deepEqual(readdirSync(dir).sort(), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('re-running the sweep over the same inputs makes no further change (idempotent)', () => {
	const dir = plansDir(['github-34'])
	try {
		main(['--root', dir, '--retire', 'github-34'])
		const after = readdirSync(dir).sort()
		const code = main(['--root', dir, '--retire', 'github-34']) // re-run
		assert.equal(code, 0)
		assert.deepEqual(readdirSync(dir).sort(), after)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('--dry-run deletes nothing', () => {
	const dir = plansDir(['github-34'])
	try {
		const before = readdirSync(dir).sort()
		main(['--root', dir, '--retire', 'github-34', '--dry-run'])
		assert.deepEqual(readdirSync(dir).sort(), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the plan.md is deleted even when the log.jsonl is absent', () => {
	const dir = plansDir(['github-34'], ['github-34']) // no log.jsonl
	try {
		main(['--root', dir, '--retire', 'github-34'])
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})
