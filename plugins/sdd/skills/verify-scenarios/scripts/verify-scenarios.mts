#!/usr/bin/env node
// verify-scenarios — the Gherkin-scenario -> test-report bridge verifier. For a frozen `.feature`
// and a spec-node path, reports per-scenario PASS / FAIL / UNBOUND by reading the reports of one or
// more configured test-result SOURCES, so an impl-judge reasons by hand only over the UNBOUND set
// instead of every scenario.
//
// Binding convention: KEY = a scenario's `@id:<slug>` tag if present, else its verbatim name. A test
// declares its node via a `describe('spec:<node>', …)` wrapper (or equivalent) — the bridge reads
// that segment out of the test-report's `" > "`-joined test name. A test's leaf title is either the
// exact scenario name or `@id:<slug>`; a Scenario Outline is ONE key (its outline name), not one per
// Examples row.
//
// Operations:
//   --feature <path>    frozen .feature to verify (required)
//   --node <path>       the spec node to bind against, e.g. cyberlegion/identity (required)
//   --config <toml>     .agents/sdd/scenario-bridge.toml (default, resolved under --root)
//   --root <dir>        project root sources/paths resolve against (default cwd)
//   --report <xml>      bypass --config: a single ad-hoc junit report (resolved under --root)
//   --run               execute each source's `command` before reading its report
//   --format toon|json  machine output (default: a readable text map)
//
// Config `.agents/sdd/scenario-bridge.toml` is an array-of-tables of sources:
//   [[source]]
//   adapter    = "junit"
//   command    = "pnpm build && vitest run src --reporter=junit --outputFile=.agents/.scenario-report.xml"
//   reportPath = ".agents/.scenario-report.xml"
//
// Adapter interface: (source, root, run) => Array<{node, key, outcome: 'pass'|'fail'|'skip'}>. Only
// `junit` is implemented; `tap`/`aced` slot into the same `switch(adapter)` seam later.
//
// Fold: union every source's results, keep only those whose `node` equals --node, group by KEY. Per
// feature scenario KEY: UNBOUND if no result; PASS if ≥1 result and none fail; FAIL if any fails.
// EXTRA = bound result keys matching no feature scenario key (diagnostic, not a failure).
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps.

import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── Config (a minimal TOML: `[[source]]` array-of-tables) ──

export interface SourceConfig {
	adapter: string
	command?: string
	reportPath: string
}

// Parses `[[source]]` blocks; each block's `key = "value"` lines become fields on one source. Blocks
// are delimited by the next `[[source]]` or `[...]` header (or EOF). Malformed/incomplete blocks
// (no reportPath) are dropped rather than throwing — mirrors spec-anchors' lenient-read posture.
export function parseSourcesToml(text: string): SourceConfig[] {
	const out: SourceConfig[] = []
	const blocks = text.split(/(?=^\s*\[\[source\]\]\s*$)/m).filter((b) => /^\s*\[\[source\]\]\s*$/m.test(b))
	for (const block of blocks) {
		const body = block.replace(/^\s*\[\[source\]\]\s*$/m, '')
		const fields: Record<string, string> = {}
		for (const m of body.matchAll(/^\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*$/gm)) {
			fields[m[1]] = m[2] ?? m[3] ?? ''
		}
		if (!fields.adapter || !fields.reportPath) continue
		out.push({ adapter: fields.adapter, command: fields.command, reportPath: fields.reportPath })
	}
	return out
}

export function readSourcesConfig(configPath: string): SourceConfig[] {
	if (!existsSync(configPath)) return []
	try {
		return parseSourcesToml(readFileSync(configPath, 'utf8'))
	} catch {
		return []
	}
}

// ── Scenario keys from the frozen .feature (via gherkin-cli) ──

export interface GherkinScenario {
	name: string
	keyword: string
	tags: string[]
}

interface GherkinParseOutput {
	files: { scenarios: GherkinScenario[] }[]
}

export interface ScenarioKey {
	name: string
	key: string
}

const ID_TAG_RE = /^@id:(.+)$/

// A scenario's KEY is its `@id:<slug>` tag if one is present, else its verbatim name. A Scenario
// Outline is one key (its outline name) — gherkin-cli already emits one entry per outline, not per
// Examples row, so no special-casing is needed here.
export function scenarioKeysFromParse(parsed: GherkinParseOutput): ScenarioKey[] {
	const out: ScenarioKey[] = []
	for (const file of parsed.files) {
		for (const s of file.scenarios) {
			const idTag = s.tags.map((t) => ID_TAG_RE.exec(t)).find((m): m is RegExpExecArray => m !== null)
			out.push({ name: s.name, key: idTag ? idTag[1] : s.name })
		}
	}
	return out
}

export function getScenarioKeys(root: string, featurePath: string): ScenarioKey[] {
	const abs = join(root, featurePath)
	const stdout = execFileSync('npx', ['gherkin-cli@0.0.1', 'parse', abs, '--format', 'json'], {
		encoding: 'utf8',
		cwd: root,
	})
	const parsed = JSON.parse(stdout) as GherkinParseOutput
	return scenarioKeysFromParse(parsed)
}

// ── JUnit parsing (hand-rolled, no xml dep) ──

export type Outcome = 'pass' | 'fail' | 'skip'

export interface JUnitTestcase {
	classname: string
	name: string
	outcome: Outcome
}

const XML_ENTITIES: [RegExp, string][] = [
	[/&lt;/g, '<'],
	[/&gt;/g, '>'],
	[/&quot;/g, '"'],
	[/&apos;/g, "'"],
	[/&amp;/g, '&'], // last, so a literal "&amp;lt;" does not get double-unescaped
]

export function unescapeXml(s: string): string {
	let out = s
	for (const [re, rep] of XML_ENTITIES) out = out.replace(re, rep)
	return out
}

function attr(attrs: string, name: string): string {
	const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)
	return m ? unescapeXml(m[1]) : ''
}

// Finds every `<testcase …>…</testcase>` (or self-closed `<testcase … />`), extracting `classname`
// and `name` BY ATTRIBUTE NAME (not position), unescaping both. Outcome: a child `<failure` -> fail;
// a child `<skipped` -> skip; else pass.
//
// The opening-tag regex walks attribute-by-attribute (quoted strings or a non-quote/non-`>` run) so
// an attribute VALUE containing a literal `>` — e.g. a scenario name built from `" > "`-joined
// segments — never truncates the match, which a naive `[^>]*` class would do.
const OPEN_TAG_RE = /<testcase\b((?:"[^"]*"|'[^']*'|[^"'>/])*)(\/)?>/g

export function parseJUnitTestcases(xml: string): JUnitTestcase[] {
	const out: JUnitTestcase[] = []
	for (const m of xml.matchAll(OPEN_TAG_RE)) {
		const attrs = m[1]
		const selfClosed = m[2] === '/'
		let body = ''
		if (!selfClosed) {
			const closeIdx = xml.indexOf('</testcase>', m.index + m[0].length)
			if (closeIdx !== -1) body = xml.slice(m.index + m[0].length, closeIdx)
		}
		const outcome: Outcome = /<failure\b/.test(body) ? 'fail' : /<skipped\b/.test(body) ? 'skip' : 'pass'
		out.push({ classname: attr(attrs, 'classname'), name: attr(attrs, 'name'), outcome })
	}
	return out
}

// ── junit adapter: testcase -> {node, key, outcome} ──

export interface BoundResult {
	node: string
	key: string
	outcome: Outcome
}

const NODE_SEGMENT_RE = /^spec:(.+)$/

// Splits an (already-unescaped) testcase `name` on `" > "`. NODE = the capture of whichever segment
// matches `/^spec:(.+)$/` (found at any depth); testcases with no such segment are not bound to a
// spec node and are dropped. LEAF = the last segment; KEY = its `@id:<slug>` capture if it matches,
// else the leaf verbatim.
export function junitTestcaseToResult(tc: JUnitTestcase): BoundResult | undefined {
	const segments = tc.name.split(' > ')
	let node: string | undefined
	for (const seg of segments) {
		const m = NODE_SEGMENT_RE.exec(seg)
		if (m) {
			node = m[1]
			break
		}
	}
	if (node === undefined) return undefined
	const leaf = segments[segments.length - 1]
	const idMatch = ID_TAG_RE.exec(leaf)
	const key = idMatch ? idMatch[1] : leaf
	return { node, key, outcome: tc.outcome }
}

export function junitResultsFromXml(xml: string): BoundResult[] {
	const out: BoundResult[] = []
	for (const tc of parseJUnitTestcases(xml)) {
		const r = junitTestcaseToResult(tc)
		if (r) out.push(r)
	}
	return out
}

function runJunitSource(source: SourceConfig, root: string, run: boolean): BoundResult[] {
	if (run && source.command) {
		execSync(source.command, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] })
	}
	const reportPath = join(root, source.reportPath)
	if (!existsSync(reportPath)) return []
	return junitResultsFromXml(readFileSync(reportPath, 'utf8'))
}

// Adapter dispatch seam — `tap` / `aced` / others implement the same signature and slot in here.
export function runSource(source: SourceConfig, root: string, run: boolean): BoundResult[] {
	switch (source.adapter) {
		case 'junit':
			return runJunitSource(source, root, run)
		default:
			return []
	}
}

// ── Fold: union all sources, group by key, compare against the feature's scenario set ──

export type ScenarioState = 'pass' | 'fail' | 'unbound'

export interface ScenarioReport {
	name: string
	key: string
	state: ScenarioState
	resultCount: number
}

export interface FoldReport {
	node: string
	total: number
	bound: number
	pass: number
	fail: number
	unbound: number
	scenarios: ScenarioReport[]
	extras: string[]
}

export function foldResults(scenarioKeys: ScenarioKey[], results: BoundResult[], node: string): FoldReport {
	const nodeResults = results.filter((r) => r.node === node)
	const byKey = new Map<string, BoundResult[]>()
	for (const r of nodeResults) {
		const list = byKey.get(r.key)
		if (list) list.push(r)
		else byKey.set(r.key, [r])
	}

	const scenarios: ScenarioReport[] = scenarioKeys.map(({ name, key }) => {
		const group = byKey.get(key) ?? []
		const state: ScenarioState =
			group.length === 0 ? 'unbound' : group.some((r) => r.outcome === 'fail') ? 'fail' : 'pass'
		return { name, key, state, resultCount: group.length }
	})

	const featureKeys = new Set(scenarioKeys.map((s) => s.key))
	const extras = [...byKey.keys()].filter((k) => !featureKeys.has(k)).sort()

	const pass = scenarios.filter((s) => s.state === 'pass').length
	const fail = scenarios.filter((s) => s.state === 'fail').length
	const unbound = scenarios.filter((s) => s.state === 'unbound').length

	return { node, total: scenarios.length, bound: pass + fail, pass, fail, unbound, scenarios, extras }
}

// ── Output ──

function toonField(v: string): string {
	if (v === '' || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, '""')}"`
	return v
}

export function formatToon(report: FoldReport): string {
	const header = `scenarios[${report.scenarios.length}]{name,key,state,resultCount}:`
	const rows = report.scenarios.map(
		(s) => `  ${[toonField(s.name), toonField(s.key), s.state, String(s.resultCount)].join(',')}`,
	)
	const extras = [`extras[${report.extras.length}]{key}:`, ...report.extras.map((e) => `  ${toonField(e)}`)]
	const summary = `summary{node,total,bound,pass,fail,unbound}:\n  ${[
		toonField(report.node),
		report.total,
		report.bound,
		report.pass,
		report.fail,
		report.unbound,
	].join(',')}`
	return [header, ...rows, ...extras, summary].join('\n')
}

export function formatText(report: FoldReport): string {
	const lines: string[] = []
	for (const s of report.scenarios) lines.push(`${s.state.toUpperCase().padEnd(8)} ${s.name}`)
	lines.push('')
	lines.push(
		`${report.bound}/${report.total} BOUND, ${report.pass} pass, ${report.fail} fail, ${report.unbound} unbound`,
	)
	if (report.extras.length > 0) {
		lines.push('')
		lines.push(`EXTRA (bound results matching no scenario): ${report.extras.join(', ')}`)
	}
	return lines.join('\n')
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

// Resolves the source set for a run: `--report` bypasses the configured sources entirely with a
// single ad-hoc junit source; otherwise the sources come from the (resolved) config file.
export function resolveSources(argv: string[], root: string): SourceConfig[] {
	const reportFlag = flag(argv, '--report')
	if (reportFlag) {
		return [{ adapter: 'junit', reportPath: reportFlag }]
	}
	const configPath = join(root, flag(argv, '--config') ?? '.agents/sdd/scenario-bridge.toml')
	return readSourcesConfig(configPath)
}

// Renders a fold report in the requested format, defaulting to text.
export function renderReport(report: FoldReport, format: string): string {
	if (format === 'json') return JSON.stringify(report, null, 2)
	if (format === 'toon') return formatToon(report)
	return formatText(report)
}

// Non-zero exactly when any scenario is UNBOUND or FAIL; zero only when every scenario is bound
// and passing.
export function exitCode(report: FoldReport): number {
	return report.unbound > 0 || report.fail > 0 ? 1 : 0
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const feature = flag(argv, '--feature')
	const node = flag(argv, '--node')
	const format = flag(argv, '--format') ?? 'text'
	const run = argv.includes('--run')
	const w = (s: string) => process.stdout.write(`${s}\n`)

	if (!feature || !node) {
		w(
			'usage: verify-scenarios --feature <path> --node <path> [--config <toml>] [--root <dir>] [--report <xml>] [--run] [--format toon|json]',
		)
		return 1
	}

	const sources = resolveSources(argv, root)

	const results = sources.flatMap((s) => runSource(s, root, run))
	const scenarioKeys = getScenarioKeys(root, feature)
	const report = foldResults(scenarioKeys, results, node)

	w(renderReport(report, format))

	return exitCode(report)
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
