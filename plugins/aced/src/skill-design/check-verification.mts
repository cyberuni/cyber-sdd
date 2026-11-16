#!/usr/bin/env node
// check-verification — the check script of ACED's `skill-design.aspects.verification` reference.
// `/skill check` runs it as `node check-verification.mjs <skill folder>` and reads one JSON object,
// `{ checks: [{ id, status, message?, file? }] }`, from stdout.
//
// ACED verifies a skill through the frozen `.feature` suite that names it, not through
// `evals/evals.yaml`. A suite is `.agents/specs/**/<skill name>.feature`. A skill with no suite yet is
// reported `not-checked`, never `pass`: nothing has been verified. A suite that holds no scenario fails.

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export type Outcome = { id: string; status: 'pass' | 'fail' | 'not-checked'; message?: string; file?: string }

const SKIP = new Set(['node_modules', 'ledger', '.git'])

/** The repository root: the nearest ancestor of the skill folder that holds `.agents/specs`. */
export function findRoot(skillFolder: string): string | undefined {
	let dir = resolve(skillFolder)
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, '.agents', 'specs'))) return dir
		dir = dirname(dir)
	}
	return undefined
}

/** Every `<name>.feature` under `.agents/specs`, repo-relative, ledgers excluded. */
export function findSuites(root: string, name: string): string[] {
	const found: string[] = []
	const walk = (dir: string): void => {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isDirectory()) {
				if (!SKIP.has(e.name)) walk(join(dir, e.name))
			} else if (e.name === `${name}.feature`) found.push(relative(root, join(dir, e.name)))
		}
	}
	walk(join(root, '.agents', 'specs'))
	return found.sort()
}

export function countScenarios(text: string): number {
	return (text.match(/^\s*Scenario(?: Outline)?:/gm) ?? []).length
}

export function check(skillFolder: string): { checks: Outcome[] } {
	const name = basename(resolve(skillFolder))
	const root = findRoot(skillFolder)
	if (!root) {
		return { checks: [{ id: 'VER-1', status: 'not-checked', message: 'no `.agents/specs` folder above the skill' }] }
	}
	const suites = findSuites(root, name)
	if (suites.length === 0) {
		return {
			checks: [
				{ id: 'VER-1', status: 'not-checked', message: `no frozen suite \`${name}.feature\` under .agents/specs yet` },
			],
		}
	}
	const empty = suites.filter((s) => countScenarios(readFileSync(join(root, s), 'utf8')) === 0)
	if (empty.length > 0) {
		return { checks: [{ id: 'VER-1', status: 'fail', message: 'the suite holds no Scenario', file: empty[0] }] }
	}
	return { checks: [{ id: 'VER-1', status: 'pass', file: suites[0] }] }
}

function main(argv: string[]): number {
	const folder = argv[0]
	if (!folder) {
		process.stderr.write('usage: check-verification <skill folder>\n')
		return 2
	}
	process.stdout.write(`${JSON.stringify(check(folder))}\n`)
	return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
