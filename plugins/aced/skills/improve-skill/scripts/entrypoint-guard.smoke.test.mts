// entrypoint-guard — a plugin-wide guard on how every shipped ACED skill script decides it is the
// entrypoint. The SDD plugin carries the twin of this file at
// plugins/sdd/skills/check-project-specs/scripts/entrypoint-guard.smoke.test.mts; the full rationale
// lives there. The short version:
//
// `import.meta.main` arrived in Node 24.2.0, but this repo's engines floor is `>=22`, where it is
// `undefined`. A CLI guarded on it never reaches `main()` — it prints nothing and exits 0, which a
// caller keying on the exit code reads as "checked everything, found no problem". Two of this
// plugin's scripts are wired into the repo's own root checks (`check:skills` runs
// improve-skill/validate.mts, `check:private-skills` runs repair-private-skills.mts), so on the
// supported floor those checks passed VACUOUSLY.
//
// The portable idiom, from plugins/aced/skills/extract-situation/scripts/extract-situation.mts:
//
//   process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
//
// Both wrappers are load-bearing. `pathToFileURL` because `import.meta.url` percent-encodes, so the
// naive `file://${process.argv[1]}` concat mismatches on any install path holding a space (or #, ?,
// %). `realpathSync` because a plugin installed through the marketplace may be reached by a symlink,
// and Node resolves the main module to its realpath — so `import.meta.url` is the real file while
// `process.argv[1]` is the link. Dropping either silently restores the same never-fires bug under a
// different trigger.
//
// This must be a STATIC check: the test runner imports these modules and never invokes them as the
// main module, so the guard line is exactly the line an ordinary unit test cannot reach.
//
// If a script starts failing here, the honest fix is to give it the portable guard — never to relax
// the assertion or add the file to an exclusion list.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const SKILLS_ROOT = new URL('../../../skills/', import.meta.url).pathname.replace(/\/$/, '')

/** Every shipped (non-test) script under the ACED skills tree. */
function shippedScripts(): string[] {
	const found: string[] = []
	for (const skill of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
		if (!skill.isDirectory()) continue
		const dir = join(SKILLS_ROOT, skill.name, 'scripts')
		let entries: import('node:fs').Dirent[]
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			continue
		}
		for (const e of entries) {
			if (e.isFile() && e.name.endsWith('.mts') && !e.name.endsWith('.test.mts')) found.push(join(dir, e.name))
		}
	}
	return found
}

test('every shipped script is discoverable — the scan itself is operative', () => {
	// Guards the guard: a scan that silently resolved to zero files would assert nothing while
	// reporting green — the very failure mode this file exists to prevent.
	assert.ok(shippedScripts().length > 5, 'expected the ACED skills tree to hold several shipped scripts')
})

test('no shipped script guards its entrypoint on import.meta.main', () => {
	const offenders = shippedScripts().filter((f) => /^\s*if \(import\.meta\.main\b/m.test(readFileSync(f, 'utf8')))
	assert.deepEqual(
		offenders,
		[],
		`import.meta.main is Node >=24.2 but the engines floor is >=22; these would silently no-op:\n${offenders.join('\n')}`,
	)
})

test('no shipped script compares import.meta.url to a hand-built file:// string', () => {
	// The other half of the same defect: this form runs on the floor but breaks on a percent-encoded
	// path and under a symlink, reaching the identical silent no-op.
	const offenders = shippedScripts().filter((f) =>
		/import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`/.test(readFileSync(f, 'utf8')),
	)
	assert.deepEqual(offenders, [], `use pathToFileURL(realpathSync(...)) instead:\n${offenders.join('\n')}`)
})

test('every shipped script with a CLI uses the portable entrypoint idiom', () => {
	// `fs.realpathSync` as well as the bare form — validate.mts imports node:fs as a namespace.
	const PORTABLE = /import\.meta\.url === pathToFileURL\((?:fs\.)?realpathSync\(process\.argv\[1\]\)\)\.href/
	const bad: string[] = []
	for (const f of shippedScripts()) {
		const text = readFileSync(f, 'utf8')
		// A script "has a CLI" iff it dispatches to main() at module scope. Scripts that only export
		// pure functions have no entrypoint to guard and are correctly silent here.
		if (!/^\s*(?:if \(.*\)\s*\{?\s*)?(?:await )?(?:process\.exit\()?main\(process\.argv/m.test(text)) continue
		if (!PORTABLE.test(text)) bad.push(f)
	}
	assert.deepEqual(bad, [], `these dispatch to main() without the portable entrypoint guard:\n${bad.join('\n')}`)
})

test('live: a shipped CLI actually runs when invoked as the main module', () => {
	// The static assertions check the SHAPE of the guard; this checks that a real invocation of a real
	// shipped script reaches main() and emits its report. list-skills is read-only and always prints.
	const script = join(SKILLS_ROOT, 'list-skills', 'scripts', 'list-skills.mts')
	const out = execFileSync(process.execPath, [script], { encoding: 'utf8' })
	assert.ok(out.trim().length > 0, 'the CLI must reach main() and emit output, not exit silently')
})
