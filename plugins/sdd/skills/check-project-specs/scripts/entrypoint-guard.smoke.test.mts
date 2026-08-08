// entrypoint-guard — a CORPUS-WIDE guard on how every shipped SDD skill script decides it is the
// entrypoint.
//
// WHY THIS FILE EXISTS (read before weakening anything in it):
//
// All 19 shipped scripts once guarded their CLI with `if (import.meta.main)`. That property was only
// added in Node 24.2.0, while this repo's engines floor is `>=22`. Below 24.2 it is `undefined`, so
// the guard was falsy, `main()` never ran, and the CLI printed nothing and exited 0 — the worst
// possible failure for a caller that keys its verdict on the exit code, because "did nothing" is
// indistinguishable from "checked everything and found no problem". `cyber-sdd` ships one of these
// as a `bin` (`sdd-check-specs`), so this shipped to users as a silently-passing check.
//
// No unit test could catch it: the test runner imports these modules, it never invokes them as the
// main module, so the guard line is exactly the line the suite cannot reach. Hence a static guard —
// it asserts the SHAPE of the line, because the line's behavior is unobservable from in-process.
//
// The portable idiom, mirrored from plugins/aced/skills/extract-situation/scripts/extract-situation.mts:
//
//   process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
//
// Both wrappers are load-bearing, and dropping either silently reintroduces the same never-fires bug
// with a different trigger:
//   - `pathToFileURL`, not `file://${process.argv[1]}` — `import.meta.url` percent-encodes, so a
//     naive concat mismatches on any install path holding a space (or #, ?, %).
//   - `realpathSync` — npm installs a `bin` as a SYMLINK, and Node resolves the main module to its
//     realpath, so `import.meta.url` is the real file while `process.argv[1]` is the symlink. Without
//     it, `sdd-check-specs` invoked the published way would no-op exactly as before.
//
// If a script starts failing here, the honest fix is to give it the portable guard — never to relax
// the assertion or add the file to an exclusion list.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const SKILLS_ROOT = new URL('../../../skills/', import.meta.url).pathname.replace(/\/$/, '')
const REPO_ROOT = new URL('../../../../../', import.meta.url).pathname.replace(/\/$/, '')

/** Every shipped (non-test) script under the SDD skills tree. `cyber-sdd`'s `files` field excludes
 *  every `.test.mts` under `skills`, so "shipped" is exactly "not a test file". */
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
	// Guards the guard: a scan that silently resolves to zero files would assert nothing while
	// reporting green, which is the very failure mode this file exists to prevent.
	assert.ok(shippedScripts().length > 15, 'expected the SDD skills tree to hold many shipped scripts')
})

test('no shipped script guards its entrypoint on import.meta.main', () => {
	const offenders = shippedScripts().filter((f) => /^\s*if \(import\.meta\.main\b/m.test(readFileSync(f, 'utf8')))
	assert.deepEqual(
		offenders,
		[],
		`import.meta.main is Node >=24.2 but the engines floor is >=22; these would silently no-op:\n${offenders.join('\n')}`,
	)
})

test('every shipped script with a CLI uses the portable entrypoint idiom', () => {
	const PORTABLE = /import\.meta\.url === pathToFileURL\(realpathSync\(process\.argv\[1\]\)\)\.href/
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
	// The static assertions above check the SHAPE of the guard; this one checks that a real
	// invocation of a real shipped script reaches main() and emits its report. Under the old
	// `import.meta.main` guard on the supported floor this produced empty output and exit 0.
	// discover-specs is chosen because it is strictly read-only and always prints.
	const script = join(SKILLS_ROOT, 'discover-specs', 'scripts', 'discover-specs.mts')
	const out = execFileSync(process.execPath, [script, '--root', REPO_ROOT], { encoding: 'utf8' })
	assert.match(out, /^specs\[\d+\]/, 'the CLI must reach main() and emit its listing, not exit silently')
})
