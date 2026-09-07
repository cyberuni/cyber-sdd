/**
 * Trial artifact for Direction B (issue #4) — externalize the spec corpus out of the
 * agent's default read path into a queryable store.
 *
 * NOT SHIPPED. This is `*-next`-shaped evidence: it runs alongside the corpus and
 * never mutates it. Built with `node:sqlite` to honour the repo's no-deps convention.
 *
 *   node spec-store-next.mts ingest  --root <repo> --db <file>
 *   node spec-store-next.mts ask     --db <file> "<question>"
 *   node spec-store-next.mts stats   --db <file>
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

type Row = { path: string; kind: string; node: string; body: string; bytes: number }

function walk(dir: string, out: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, e.name)
		if (e.isDirectory()) walk(full, out)
		else if (e.name.endsWith('.md') || e.name.endsWith('.feature')) out.push(full)
	}
	return out
}

function nodeOf(rel: string): string {
	const parts = rel.split(sep)
	return parts.slice(0, -1).join('/') || '(root)'
}

export function ingest(root: string, dbFile: string): { files: number; bytes: number } {
	const db = new DatabaseSync(dbFile)
	db.exec(`DROP TABLE IF EXISTS spec;
		CREATE TABLE spec (path TEXT PRIMARY KEY, kind TEXT, node TEXT, body TEXT, bytes INT);
		DROP TABLE IF EXISTS spec_fts;
		CREATE VIRTUAL TABLE spec_fts USING fts5(path, body);`)
	const specRoot = join(root, '.agents', 'specs')
	const insert = db.prepare('INSERT INTO spec VALUES (?, ?, ?, ?, ?)')
	const insertFts = db.prepare('INSERT INTO spec_fts VALUES (?, ?)')
	let bytes = 0
	let files = 0
	for (const f of walk(specRoot)) {
		const rel = relative(specRoot, f)
		const body = readFileSync(f, 'utf8')
		const row: Row = {
			path: rel,
			kind: f.endsWith('.feature') ? 'suite' : 'spec',
			node: nodeOf(rel),
			body,
			bytes: statSync(f).size,
		}
		insert.run(row.path, row.kind, row.node, row.body, row.bytes)
		insertFts.run(row.path, row.body)
		bytes += row.bytes
		files++
	}
	db.close()
	return { files, bytes }
}

/** The "second brain" without an LLM: a deterministic keyword oracle over the store. */
export function ask(dbFile: string, question: string): { path: string; snippet: string }[] {
	const db = new DatabaseSync(dbFile)
	const terms = question
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length > 3)
	if (terms.length === 0) return []
	const q = terms.map((t) => `"${t}"`).join(' OR ')
	const rows = db
		.prepare(`SELECT path, snippet(spec_fts, 1, '[', ']', '…', 24) AS snippet
			FROM spec_fts WHERE spec_fts MATCH ? ORDER BY rank LIMIT 5`)
		.all(q) as { path: string; snippet: string }[]
	db.close()
	return rows
}

export function stats(dbFile: string): Record<string, number> {
	const db = new DatabaseSync(dbFile)
	const r = db
		.prepare(`SELECT COUNT(*) n, SUM(bytes) b,
			SUM(CASE WHEN kind='suite' THEN 1 ELSE 0 END) suites FROM spec`)
		.get() as { n: number; b: number; suites: number }
	db.close()
	return { files: r.n, bytes: r.b, suites: r.suites }
}

function main(argv: string[]): number {
	const cmd = argv[0]
	const arg = (n: string) => argv[argv.indexOf(n) + 1]
	if (cmd === 'ingest') {
		const r = ingest(arg('--root') ?? '.', arg('--db') ?? 'spec.db')
		process.stdout.write(`${JSON.stringify(r)}\n`)
		return 0
	}
	if (cmd === 'ask') {
		for (const r of ask(arg('--db') ?? 'spec.db', argv[argv.length - 1])) {
			process.stdout.write(`${`${r.path}\n  ${r.snippet.replace(/\s+/g, ' ')}`}\n`)
		}
		return 0
	}
	if (cmd === 'stats') {
		process.stdout.write(`${JSON.stringify(stats(arg('--db') ?? 'spec.db'))}\n`)
		return 0
	}
	console.error('usage: spec-store-next.mts ingest|ask|stats')
	return 1
}

if (process.argv[1]?.endsWith('spec-store-next.mts')) process.exit(main(process.argv.slice(2)))
