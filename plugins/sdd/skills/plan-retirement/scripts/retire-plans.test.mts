import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	decideRetirements,
	discoverLogs,
	discoverPlans,
	distilledCrRefs,
	main,
	parseCleared,
	planFiles,
} from './retire-plans.mts'

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

// A throwaway ledger dir seeded with one shard containing the given raw JSONL lines (each
// already a JSON string, one per line, real-shaped as the Scanner writes them).
function ledgerDir(lines: string[]): string {
	const dir = mkdtempSync(join(tmpdir(), 'retire-ledger-'))
	writeFileSync(join(dir, 'shard.jsonl'), lines.map((l) => `${l}\n`).join(''))
	return dir
}

function distillsLine(crRef: string, opts: { ratified?: boolean; evidence?: string[] } = {}): string {
	return JSON.stringify({
		kind: 'strategy',
		distills: crRef,
		ratified: opts.ratified ?? false,
		evidence: opts.evidence ?? [],
	})
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

test('discoverLogs lists cr-refs with a log.jsonl and ignores other files', () => {
	const dir = plansDir(['github-34', 'local-foo'], ['local-foo']) // local-foo has no log.jsonl
	writeFileSync(join(dir, 'stray.txt'), 'x')
	try {
		assert.deepEqual(discoverLogs(dir), ['github-34'])
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('discoverLogs returns [] for a missing root', () => {
	assert.deepEqual(discoverLogs(join(tmpdir(), 'does-not-exist-retire')), [])
})

test('distilledCrRefs picks up the distills field from a strategy line', () => {
	const dir = ledgerDir([distillsLine('github-34')])
	try {
		assert.deepEqual(distilledCrRefs(dir), new Set(['github-34']))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('distilledCrRefs ignores a cr-ref mentioned only in evidence, not distills', () => {
	const dir = ledgerDir([
		JSON.stringify({ kind: 'strategy', distills: 'other-cr', ratified: true, evidence: ['github-34'] }),
	])
	try {
		assert.equal(distilledCrRefs(dir).has('github-34'), false)
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('distilledCrRefs ignores non-strategy kinds even if they carry a distills-shaped field', () => {
	const dir = ledgerDir([
		JSON.stringify({ kind: 'gate', distills: 'github-34' }),
		JSON.stringify({ kind: 'leash', cr: 'github-34' }),
	])
	try {
		assert.deepEqual(distilledCrRefs(dir), new Set())
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('distilledCrRefs tolerates malformed lines and blank lines', () => {
	const dir = mkdtempSync(join(tmpdir(), 'retire-ledger-'))
	writeFileSync(join(dir, 'shard.jsonl'), `${distillsLine('github-34')}\n\nnot json at all\n{"truncated":\n`)
	try {
		assert.deepEqual(distilledCrRefs(dir), new Set(['github-34']))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('distilledCrRefs returns an empty set for a missing ledger dir', () => {
	assert.deepEqual(distilledCrRefs(join(tmpdir(), 'does-not-exist-ledger')), new Set())
})

test('distilledCrRefs counts an unratified distilling entry (ratified is not required)', () => {
	const dir = ledgerDir([distillsLine('github-34', { ratified: false })])
	try {
		assert.deepEqual(distilledCrRefs(dir), new Set(['github-34']))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('decideRetirements retires only cleared-and-present-and-distilled cr-refs, fail-closed', () => {
	const distilled = new Set(['a', 'b'])
	const logPresent = new Set(['a', 'b', 'uncleared', 'missing'])
	// uncleared-but-present is left out; cleared-but-absent is left out; order follows cleared
	assert.deepEqual(decideRetirements(['b', 'a', 'missing'], ['a', 'b', 'uncleared'], distilled, logPresent), ['b', 'a'])
	assert.deepEqual(decideRetirements([], ['a'], distilled, logPresent), [])
	assert.deepEqual(decideRetirements(['a', 'a'], ['a'], distilled, logPresent), ['a'])
})

test('decideRetirements excludes a cleared-and-present cr-ref that is not distilled but has a log (data-loss guard)', () => {
	const logPresent = new Set(['github-34'])
	assert.deepEqual(decideRetirements(['github-34'], ['github-34'], new Set(), logPresent), [])
	assert.deepEqual(decideRetirements(['github-34'], ['github-34'], new Set(['other-cr']), logPresent), [])
})

test('decideRetirements retires a cleared-and-present cr-ref with no log to distill from, even if undistilled', () => {
	// the frozen scenario: "a cleared cr-ref whose combat log was never written is retired
	// without a distillation" — logPresent does not contain the ref, so the no-log branch fires.
	assert.deepEqual(decideRetirements(['github-34'], ['github-34'], new Set(), new Set()), ['github-34'])
})

test('the sweep deletes both files for a cleared, present, distilled cr-ref (tracked deletion of the tree)', () => {
	const dir = plansDir(['github-34', 'local-bar'])
	const ledger = ledgerDir([distillsLine('github-34')])
	try {
		const code = main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.equal(code, 0)
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(!existsSync(join(dir, 'github-34.log.jsonl')))
		// the uncleared plan is untouched
		assert.ok(existsSync(join(dir, 'local-bar.plan.md')))
		assert.ok(existsSync(join(dir, 'local-bar.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('a cleared, present cr-ref with no distillation in the ledger is not deleted (fail-closed)', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([]) // ledger exists but has no distilling entry
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('a strategy that cites the cr-ref only in evidence, not distills, does not clear it', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([
		JSON.stringify({ kind: 'strategy', distills: 'other-cr', ratified: true, evidence: ['github-34'] }),
	])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('an unratified distilling strategy entry still clears the gate', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([distillsLine('github-34', { ratified: false })])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(!existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('no --ledger given skips retirement entirely (fail-closed on missing signal)', () => {
	const dir = plansDir(['github-34'])
	try {
		main(['--root', dir, '--retire', 'github-34'])
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an unreadable --ledger dir skips retirement entirely (fail-closed on missing signal)', () => {
	const dir = plansDir(['github-34'])
	try {
		main(['--root', dir, '--ledger', join(tmpdir(), 'does-not-exist-ledger-x'), '--retire', 'github-34'])
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('an uncleared plan is never deleted (fail-closed)', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([distillsLine('github-34'), distillsLine('asana-7')])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'asana-7']) // clears a different, absent ref
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('clearing a cr-ref does not collateral-delete a different cr-ref it is a prefix of', () => {
	const dir = plansDir(['github-3', 'github-34'])
	const ledger = ledgerDir([distillsLine('github-3'), distillsLine('github-34')])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-3']) // exact stem only
		assert.ok(!existsSync(join(dir, 'github-3.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(existsSync(join(dir, 'github-34.log.jsonl')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('the sweep only deletes — it creates no new file (writes nothing to the ledger)', () => {
	const dir = plansDir(['github-34', 'local-bar'])
	const ledger = ledgerDir([distillsLine('github-34')])
	try {
		const beforePlans = new Set(readdirSync(dir))
		const beforeLedger = new Set(readdirSync(ledger))
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		// every surviving plans-dir entry was present before; the sweep added nothing.
		for (const f of readdirSync(dir)) assert.ok(beforePlans.has(f), `unexpected new file ${f}`)
		// the ledger dir itself is untouched — the sweep never writes to it.
		assert.deepEqual(readdirSync(ledger).sort(), [...beforeLedger].sort())
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('a cleared, distilled cr-ref with no plan on disk is a no-op', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([distillsLine('github-99')])
	try {
		const before = readdirSync(dir).sort()
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-99']) // cleared but not present
		assert.deepEqual(readdirSync(dir).sort(), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('re-running the sweep over the same inputs makes no further change (idempotent)', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([distillsLine('github-34')])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		const after = readdirSync(dir).sort()
		const code = main(['--root', dir, '--ledger', ledger, '--retire', 'github-34']) // re-run
		assert.equal(code, 0)
		assert.deepEqual(readdirSync(dir).sort(), after)
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('--dry-run deletes nothing', () => {
	const dir = plansDir(['github-34'])
	const ledger = ledgerDir([distillsLine('github-34')])
	try {
		const before = readdirSync(dir).sort()
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34', '--dry-run'])
		assert.deepEqual(readdirSync(dir).sort(), before)
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

test('a cleared cr-ref whose combat log was never written is retired without a distillation', () => {
	const dir = plansDir(['github-34'], ['github-34']) // no log.jsonl on disk
	const ledger = ledgerDir([]) // ledger present but no strategy distills github-34
	try {
		const code = main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.equal(code, 0)
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
		assert.ok(!existsSync(join(dir, 'github-34.log.jsonl'))) // already absent, no-op, no error
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})

// The data-loss guard invariant (log.jsonl present + undistilled => NOT retired) is already
// covered above by 'a cleared, present cr-ref with no distillation in the ledger is not
// deleted (fail-closed)' — plansDir seeds both plan.md and log.jsonl by default, so that test
// already exercises the log-present branch of decideRetirements unchanged.

test('no --ledger given still skips the no-log branch (missing ledger, not just missing log)', () => {
	const dir = plansDir(['github-34'], ['github-34']) // no log.jsonl, but no ledger given either
	try {
		main(['--root', dir, '--retire', 'github-34'])
		assert.ok(existsSync(join(dir, 'github-34.plan.md')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
})

test('the plan.md is deleted even when the log.jsonl is absent (partial pair, distilled)', () => {
	const dir = plansDir(['github-34'], ['github-34']) // no log.jsonl
	const ledger = ledgerDir([distillsLine('github-34')])
	try {
		main(['--root', dir, '--ledger', ledger, '--retire', 'github-34'])
		assert.ok(!existsSync(join(dir, 'github-34.plan.md')))
	} finally {
		rmSync(dir, { recursive: true, force: true })
		rmSync(ledger, { recursive: true, force: true })
	}
})
