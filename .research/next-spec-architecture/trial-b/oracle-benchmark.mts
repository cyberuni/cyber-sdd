/**
 * Trial artifact for Direction B (issue #4) — measure the second-brain oracle against
 * the three access paths an agent actually has. NOT SHIPPED.
 *
 *   node oracle-benchmark.mts --root <repo> --db <file>
 *
 * Ten questions a real mission asks. `want` is the corpus-relative path that holds the
 * answer, established by hand from the corpus. We score whether each path surfaces it.
 */
import { execFileSync } from 'node:child_process'
import { ask } from './spec-store-next.mts'

const QUESTIONS: { q: string; want: string }[] = [
	{ q: 'what freezes a feature file at the spec gate', want: 'sdd/design/lifecycle-model.md' },
	{ q: 'where does place-node suggest a home for a new node', want: 'sdd/project-spec/place-node/README.md' },
	{ q: 'may the impl producer edit the frozen suite', want: 'sdd/mission/impl-producer/README.md' },
	{ q: 'what is the unit of verdict at the impl gate', want: 'sdd/authoring/spec-gate/spec-gate.feature' },
	{ q: 'how is a node relocated without unfreezing its suite', want: 'sdd/design/lifecycle-model.md' },
	{ q: 'which folders are reserved and not capabilities', want: 'sdd/common-governances/spec-structure/README.md' },
	{ q: 'does place-node write any file', want: 'sdd/project-spec/place-node/place-node.feature' },
	{ q: 'what happens when a scenario is narrowed', want: 'sdd/design/lifecycle-model.md' },
	{ q: 'how does the gateway route without reading bodies', want: 'sdd/corpus/discovery/README.md' },
	{ q: 'what makes a spec approved', want: 'sdd/workflows/cr-lifecycle.feature' },
]

function grepPaths(root: string, q: string): string[] {
	const terms = q.split(/\s+/).filter((t) => t.length > 4)
	const out = new Set<string>()
	for (const t of terms) {
		try {
			const r = execFileSync('grep', ['-rl', '-i', t, `${root}/.agents/specs`], { encoding: 'utf8' })
			for (const line of r.trim().split('\n')) out.add(line.replace(`${root}/.agents/specs/`, ''))
		} catch {
			/* no match */
		}
	}
	return [...out]
}

function main(argv: string[]): number {
	const arg = (n: string) => argv[argv.indexOf(n) + 1]
	const root = arg('--root') ?? '.'
	const db = arg('--db') ?? 'spec.db'
	let oracleHits = 0
	let grepHits = 0
	let grepNoise = 0
	for (const { q, want } of QUESTIONS) {
		const oracle = ask(db, q).map((r) => r.path)
		const grep = grepPaths(root, q)
		const oHit = oracle.includes(want)
		const gHit = grep.includes(want)
		if (oHit) oracleHits++
		if (gHit) grepHits++
		grepNoise += grep.length
		process.stdout.write(
			`${oHit ? 'HIT ' : 'MISS'} oracle | ${gHit ? 'HIT ' : 'MISS'} grep(${String(grep.length).padStart(3)}) | ${q}\n`,
		)
		if (!oHit) process.stdout.write(`${`       oracle returned: ${oracle.join(', ') || '(nothing)'}`}\n`)
	}
	process.stdout.write(
		`\noracle top-5 recall: ${oracleHits}/${QUESTIONS.length}   grep recall: ${grepHits}/${QUESTIONS.length}   grep files to read: ${grepNoise}\n`,
	)
	return 0
}

process.exit(main(process.argv.slice(2)))
