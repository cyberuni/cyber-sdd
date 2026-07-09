#!/usr/bin/env node
// Static state check for an SDD project spec (the project-spec model). Two
// fail-closed responsibilities, both the safety net that makes an illegal state
// uncommittable:
//   1. the root spec.md lifecycle tuple — status / open-markers / approval
//      attribution. The frontmatter is the router's upfront index (ADR-0017):
//      minimal status + project-path. `aligned` was dropped — impl-sync is the
//      impl gate's runtime suite run, contract-sync is judged, per-node settled
//      state is the @frozen scan. The root is a descriptive index that owns no
//      .feature of its own, so there is no per-spec .feature requirement — the
//      behavior suite lives in the behavioral nodes.
//   2. the per-node spec-type reconcile — a node README's `spec-type` marker must
//      agree with its shape: reference => ## Subject and NO sibling .feature;
//      behavioral => ## Use Cases; descriptive (no marker) => no requirement.
//      A node README also carries `spec-type` as its ONLY frontmatter: lifecycle
//      (status / project-path / approval / produced-by / freeze) is root-spec.md-
//      only (lifecycle-governance), so a stray lifecycle field on a node fails closed.
//   3. referenced-artifact-exists (--files only) — diff-scoped + surface-for-
//      judgment: a backtick path a CR *introduces* (vs its committed baseline)
//      that does not resolve on disk is a judgment finding, not a fail-closed
//      block; a pre-existing ref the CR left untouched is never gated. The
//      use-case-coverage check in the same pass stays fail-closed.
//   4. the gate-line floor — a root spec.md at `approved`/`implemented` must have the
//      DURABLE proof of the gate in its sibling `ledger/` shards: a `gate` line with the
//      matching `verdict: approve`. The spec.md `approval` map is the overwritten
//      current-state twin (checked in 1); the ledger line is the immutable durable twin,
//      and a status advance with no ledger gate line is an unenforced gate. `draft`
//      requires no ledger (no gate ran). Provenance write is the conductor/gate's job
//      (combat-log-governance); this is the static floor that makes the missing-line
//      state uncommittable.
// `project-path` (the source dir a spec governs) is parsed for the router; its
// presence is the producer's job, not a lifecycle-legality concern, so it is not
// enforced here. See sdd:lifecycle-governance (legal-state tuples + per-node
// spec-type checks; spec types). Pure functions are
// exported for node:test; running the file directly drives the CLI. No dependencies.

import { execFileSync } from 'node:child_process'
import { type Dirent, existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

export interface GateVerdict {
	verdict?: string
	by?: string
	hasWhy: boolean
}

export interface SpecState {
	status: string
	projectPath: string | null
	markerCount: number
	approval: Record<string, GateVerdict> | null
}

export interface NodeSpec {
	type: string | null
	hasSubject: boolean
	hasUseCases: boolean
	lifecycleFields: string[]
}

export interface LedgerGate {
	gate: string
	verdict: string
}

const GATES = ['spec', 'impl']
const VERDICTS = ['approve', 'pause', 'reject']
const SPEC_TYPES = ['reference', 'behavioral']
// Lifecycle frontmatter is root-spec.md-only (lifecycle-governance). A node README
// carries `spec-type` and nothing else; any of these on a node fails closed —
// including the retired schema fields, which must never reappear on a node.
const NODE_FORBIDDEN_FIELDS = ['status', 'project-path', 'approval', 'produced-by', 'aligned', 'spec-layout', 'leash']

function frontmatter(text: string): string[] {
	const m = /^---\n([\s\S]*?)\n---/.exec(text)
	return m ? m[1].split('\n') : []
}

// Strip fenced + inline code so a doc that *documents* a marker or a heading
// (e.g. "wraps `## Subject` in backticks") does not trip its own checks.
function prose(text: string): string {
	return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

export function parseSpecState(text: string): SpecState {
	const lines = frontmatter(text)
	let status = ''
	let projectPath: string | null = null
	let approval: Record<string, GateVerdict> | null = null

	for (let i = 0; i < lines.length; i++) {
		const s = /^status:\s*(.+)$/.exec(lines[i])
		if (s) {
			status = s[1].trim().replace(/^["']|["']$/g, '')
			continue
		}
		const p = /^project-path:\s*(.+)$/.exec(lines[i])
		if (p) {
			projectPath = p[1].trim().replace(/^["']|["']$/g, '')
			continue
		}
		const ap = /^approval:\s*(.*)$/.exec(lines[i])
		if (ap) {
			approval = {}
			if (ap[1].trim() && ap[1].trim() !== '{}') continue // inline non-empty unsupported; treat as empty map
			let gate: string | null = null
			for (let j = i + 1; j < lines.length; j++) {
				if (!/^\s/.test(lines[j])) break // dedent to top level ends the block
				const g = /^ {2}(\w+):\s*$/.exec(lines[j])
				if (g) {
					gate = g[1]
					approval[gate] = { hasWhy: false }
					continue
				}
				if (!gate) continue
				const verdict = /^ {4}verdict:\s*(.+)$/.exec(lines[j])
				if (verdict) approval[gate].verdict = verdict[1].trim().replace(/^["']|["']$/g, '')
				const by = /^ {4}by:\s*(.+)$/.exec(lines[j])
				if (by) approval[gate].by = by[1].trim().replace(/^["']|["']$/g, '')
				if (/^ {4}why:/.test(lines[j])) approval[gate].hasWhy = true
			}
		}
	}

	const markerCount = (prose(text).match(/<!--\s*open:/g) ?? []).length
	return { status, projectPath, markerCount, approval }
}

// The root project spec.md lifecycle tuple.
export function checkSpec(slug: string, state: SpecState): string[] {
	const { status, markerCount, approval } = state
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)

	// `implemented` is backed by the impl gate's runtime suite run (ADR-0017), not a
	// stored flag — the static guard here is the recorded approval.impl ratification
	// (below). No `aligned` cross-check.
	if ((status === 'approved' || status === 'implemented') && markerCount > 0)
		tag(`illegal state — ${markerCount} open marker(s) but status is ${status} (markers block the gate)`)

	if (approval) {
		for (const [gate, entry] of Object.entries(approval)) {
			if (!GATES.includes(gate)) tag(`approval has unknown gate "${gate}" (expected spec | impl)`)
			if (entry.verdict && !VERDICTS.includes(entry.verdict))
				tag(`approval.${gate} has unknown verdict "${entry.verdict}" (expected approve | pause | reject)`)
			if (entry.verdict === 'pause' && entry.by)
				tag(`approval.${gate} is a pause but carries by — a pause is always the agent's act and omits by`)
			if (entry.verdict === 'approve' && !entry.by)
				tag(`approval.${gate} is an approve with no by — an approve must record its approver`)
			if (entry.by === 'agent' && !entry.hasWhy)
				tag(`approval.${gate} is by:agent but has no why block (a self-assertion must record its derivation)`)
			const passed =
				(gate === 'spec' && (status === 'approved' || status === 'implemented')) ||
				(gate === 'impl' && status === 'implemented')
			if (entry.verdict === 'pause' && passed)
				tag(`approval.${gate} is a pause but the ${gate} gate is already passed (status ${status})`)
		}
	}
	if (
		(status === 'approved' || status === 'implemented') &&
		!(approval?.spec?.verdict === 'approve' && approval?.spec?.by)
	)
		tag(
			`status is ${status} but approval.spec has no approve verdict with an approver — the spec gate has no recorded ratification`,
		)
	if (status === 'implemented' && !(approval?.impl?.verdict === 'approve' && approval?.impl?.by))
		tag(
			'status is implemented but approval.impl has no approve verdict with an approver — the impl gate has no recorded ratification',
		)

	return v
}

// Referenced-artifact-exists: a backtick-wrapped token shaped like a path (a
// relative `./`/`../` reference, or repo-root-relative under a known top-level
// dir) must resolve to a real file/dir. Bounded to these prefixes deliberately —
// unprefixed slash-containing tokens ("Given / When / Then", "oracle/builder")
// are prose, not paths, and must never false-positive. Diff-scoped + surface-
// for-judgment: only paths a CR *introduces* vs the committed baseline are
// checked — a pre-existing reference the CR left untouched is never gated, and
// an unresolved introduced ref is a judgment finding, not a hard fail-closed
// block (referenced ≠ must-exist).
const PATH_PREFIXES = ['.agents/', 'plugins/', 'packages/', 'apps/', 'docs/', '.claude/']

export function extractPathRefs(text: string): string[] {
	const out: string[] = []
	const re = /`([^`\n]+)`/g
	let m: RegExpExecArray | null
	while ((m = re.exec(text))) {
		const token = m[1].trim()
		// A template placeholder (`<project>`) or glob (`*.plan.md`) names a pattern,
		// not a real file — never a violation regardless of prefix.
		if (/[<*]/.test(token)) continue
		const isRelative = token.startsWith('./') || token.startsWith('../')
		const isRooted = PATH_PREFIXES.some((p) => token.startsWith(p))
		if (isRelative || isRooted) out.push(token)
	}
	return out
}

// Diff at the ref-token level: which of `currentText`'s path refs are absent from
// `baselineText`'s. Empty baselineText (a brand-new file, or none supplied) means
// every ref in currentText is introduced.
export function introducedPathRefs(baselineText: string, currentText: string): string[] {
	const baseRefs = new Set(extractPathRefs(baselineText))
	return extractPathRefs(currentText).filter((ref) => !baseRefs.has(ref))
}

// `dir` is the checked file's own directory (root-relative, matching this
// script's CWD-is-repo-root convention) — the base a `./`/`../` token resolves
// against. A repo-root-relative token resolves against the CWD directly.
// `baselineText` (default '', i.e. every ref is introduced) scopes the check to
// the CR's own delta — a pre-existing unresolved ref the CR left untouched is
// never gated. An unresolved introduced ref is returned as a *finding* for
// judgment, not a hard violation.
export function checkReferencedArtifacts(slug: string, dir: string, text: string, baselineText = ''): string[] {
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: introduces unresolved reference \`${msg}\` — surfaced for judgment`)
	for (const ref of introducedPathRefs(baselineText, text)) {
		const clean = ref.replace(/#.*$/, '')
		const isRelative = clean.startsWith('./') || clean.startsWith('../')
		const resolved = isRelative ? join(dir, clean) : clean
		if (!existsSync(resolved)) tag(clean)
	}
	return v
}

export function parseNode(text: string): NodeSpec {
	let type: string | null = null
	const lifecycleFields: string[] = []
	for (const l of frontmatter(text)) {
		const key = /^([\w-]+):/.exec(l) // top-level key (no leading whitespace)
		if (!key) continue
		if (key[1] === 'spec-type') {
			const m = /^spec-type:\s*(.+)$/.exec(l)
			if (m) type = m[1].trim().replace(/^["']|["']$/g, '')
		} else if (NODE_FORBIDDEN_FIELDS.includes(key[1])) {
			lifecycleFields.push(key[1])
		}
	}
	const body = prose(text)
	return {
		type,
		hasSubject: /^##\s+Subject\b/m.test(body),
		hasUseCases: /^##\s+Use Cases\b/m.test(body),
		lifecycleFields,
	}
}

// The per-node spec-type reconcile. A node README's marker must agree with its
// shape; descriptive (no marker) carries no requirement.
export function checkNode(slug: string, node: NodeSpec, hasFeature: boolean): string[] {
	const { type, hasSubject, hasUseCases, lifecycleFields } = node
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)

	// Lifecycle is root-spec.md-only — flagged for every node, descriptive included.
	for (const f of lifecycleFields)
		tag(
			`carries lifecycle field "${f}" — lifecycle frontmatter is root-spec.md-only (a node README carries only spec-type)`,
		)

	if (type === null) return v
	if (!SPEC_TYPES.includes(type)) {
		tag(`unknown spec-type "${type}" (expected reference | behavioral)`)
		return v
	}
	if (type === 'reference') {
		if (hasFeature)
			tag('spec-type: reference but a sibling .feature exists — a reference artifact is suite-less by design')
		if (!hasSubject) tag('spec-type: reference but no ## Subject section')
	}
	if (type === 'behavioral' && !hasUseCases) tag('spec-type: behavioral but no ## Use Cases section')

	return v
}

// The durable gate-line floor. Parse the sibling ledger (see readLedgerText) for its `gate` lines — the
// immutable durable verdicts (one JSON object per line; a malformed or non-gate line is skipped,
// integrity being a separate concern).
export function parseLedgerGates(text: string): LedgerGate[] {
	const gates: LedgerGate[] = []
	for (const line of text.split('\n')) {
		const s = line.trim()
		if (!s) continue
		let obj: { kind?: string; gate?: string; verdict?: string }
		try {
			obj = JSON.parse(s)
		} catch {
			continue
		}
		if (obj.kind === 'gate' && typeof obj.gate === 'string' && typeof obj.verdict === 'string')
			gates.push({ gate: obj.gate, verdict: obj.verdict })
	}
	return gates
}

// The durable ledger is a `ledger/` directory of per-CR-per-writer shard files (ADR-0020),
// with a legacy single-file `ledger.jsonl` tolerated for pre-shard corpora. Concatenate every
// `*.jsonl` shard plus the legacy file so the gate floor sees the whole durable history across
// shards, regardless of storage generation. Returns "" when neither exists.
export function readLedgerText(root: string, slug: string): string {
	const parts: string[] = []
	const legacy = join(root, slug, 'ledger.jsonl')
	if (existsSync(legacy)) parts.push(readFileSync(legacy, 'utf8'))
	const dir = join(root, slug, 'ledger')
	if (existsSync(dir)) {
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isFile() && e.name.endsWith('.jsonl')) parts.push(readFileSync(join(dir, e.name), 'utf8'))
		}
	}
	return parts.join('\n')
}

// A root spec.md at `approved`/`implemented` must carry the matching durable `gate` approve line
// in its sibling ledger — the `approval` map (checked in checkSpec) is the overwritten current-state
// twin; this is the immutable durable twin. A status advance with no ledger gate line is an
// unenforced gate. `draft` requires no ledger (no gate ran).
export function checkGateFloor(slug: string, status: string, gates: LedgerGate[]): string[] {
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)
	const approved = (gate: string) => gates.some((g) => g.gate === gate && g.verdict === 'approve')

	if ((status === 'approved' || status === 'implemented') && !approved('spec'))
		tag(`status is ${status} but the ledger has no spec gate approve line — the durable gate floor is missing`)
	if (status === 'implemented' && !approved('impl'))
		tag('status is implemented but the ledger has no impl gate approve line — the durable gate floor is missing')

	return v
}

function hasFeatureFile(dir: string): boolean {
	try {
		return readdirSync(dir).some((f) => f.endsWith('.feature'))
	} catch {
		return false
	}
}

// Walk the tree for every dir holding a file named `name`; the slug is the
// root-relative dir path. Nested projects are real and must be enforced too.
function discoverDirsWith(root: string, name: string): string[] {
	const out: string[] = []
	const walk = (dir: string, rel: string) => {
		let entries: Dirent[]
		try {
			entries = readdirSync(dir, { withFileTypes: true })
		} catch {
			return
		}
		if (entries.some((e) => e.isFile() && e.name === name)) out.push(rel)
		for (const e of entries) {
			if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue
			walk(join(dir, e.name), rel ? join(rel, e.name) : e.name)
		}
	}
	walk(root, '')
	return out
}

export const discoverSpecDirs = (root: string): string[] => discoverDirsWith(root, 'spec.md')
export const discoverNodeDirs = (root: string): string[] => discoverDirsWith(root, 'README.md')

// referenced-artifact-exists is deliberately CR-scoped only (--files), never part of
// the --root tree sweep: the existing corpus's accumulated prose legitimately names
// example/convention paths (an opt-in config not yet created, a hypothetical nested
// project) that a blind tree-wide scan cannot distinguish from a real broken
// reference. Scoped to a CR's own touched files, same shape as check-suite.mts.
export function parseFilesArg(argv: string[]): string[] {
	const idx = argv.indexOf('--files')
	if (idx === -1) return []
	const paths: string[] = []
	for (let i = idx + 1; i < argv.length; i++) {
		if (argv[i].startsWith('--')) break
		paths.push(argv[i])
	}
	return paths
}

// Reads a path's content at a given git ref (the committed baseline the CR diffs
// against). Any failure (new file at base, path not tracked at base, git absent)
// returns '' — the safe default that treats every ref in the file as introduced.
function readBaselineFromGit(base: string, path: string): string {
	try {
		return execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
	} catch {
		return ''
	}
}

export function checkReferencedArtifactsInFiles(
	paths: string[],
	baseline: (path: string) => string = () => '',
): { findings: string[]; violations: string[] } {
	const findings: string[] = []
	const violations: string[] = []
	for (const p of paths) {
		let text: string
		try {
			text = readFileSync(p, 'utf8')
		} catch {
			violations.push(`${p}: cannot read file`)
			continue
		}
		findings.push(...checkReferencedArtifacts(p, dirname(p), text, baseline(p)))
	}
	return { findings, violations }
}

// The referenced-artifact-exists sweep is widened from the two hardcoded names
// (spec.md/README.md) to every touched prose `.md` under the spec tree — a
// `design/*.md` or nested node doc gets the same diff-scoped, surface-for-
// judgment treatment. This is the boundary: a `.md` the CR touched but that lies
// outside the three fixed spec-tree roots (`.agents/spec/`, `.agents/specs/`, a
// nested `<project-path>/.agents/spec/` — mirroring discover-specs.mts) is never
// swept. Deliberately filters the caller-supplied `--files` list only; it is
// never a tree-wide `--root` sweep, same rationale as
// checkReferencedArtifactsInFiles above.
export function isUnderSpecTree(path: string): boolean {
	return /(^|\/)\.agents\/specs?(\/|$)/.test(path)
}

export function filterProseMdInSpecTree(paths: string[]): string[] {
	return paths.filter((p) => p.endsWith('.md') && isUnderSpecTree(p))
}

// ---- Use-case-coverage pre-filter ----
// The row->scenario link (spec-format-governance): when a behavioral node's
// "## Use Cases" section is written as a table with a `Scenario` column, each
// row names its covering scenario in a backtick-wrapped `Scenario: <title>` (or
// a shared `@tag`). This is non-mandating — a reference/descriptive doc with no
// Use Cases section, or a behavioral doc whose Use Cases are prose/EARS (or a
// table with no Scenario column) carries no row to link, so it raises nothing
// and stays the spec-judge's coverage backstop.

export interface UseCaseScenarioRefs {
	hasSection: boolean
	refs: string[]
}

// A markdown table row: strip the leading/trailing `|` then split on `|`, trimming each cell.
function splitTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((c) => c.trim())
}

// Slices out the body between a `## <heading>` line and the next top-level `## `
// heading (or end of text). Manual index-based slicing avoids the multiline-`$`
// pitfall a lookahead-based regex would hit (`$` in `/m` mode matches every line end).
function extractSection(body: string, heading: string): string | null {
	const start = new RegExp(`(^|\\n)##\\s+${heading}\\b`).exec(body)
	if (!start) return null
	const rest = body.slice(start.index + start[0].length)
	const end = /\n##\s/.exec(rest)
	return end ? rest.slice(0, end.index) : rest
}

export function extractUseCaseScenarioRefs(text: string): UseCaseScenarioRefs {
	// Strip fenced code blocks only (not inline `code` spans — the row->scenario
	// link itself lives inside a backtick span, so `prose()`'s inline-span strip
	// would erase the very refs this function extracts).
	const body = text.replace(/```[\s\S]*?```/g, '')
	const section = extractSection(body, 'Use Cases')
	if (section === null) return { hasSection: false, refs: [] }
	const lines = section.split('\n')
	const headerIdx = lines.findIndex((l) => l.trim().startsWith('|'))
	if (headerIdx === -1) return { hasSection: true, refs: [] } // prose or EARS — no table
	const header = splitTableRow(lines[headerIdx])
	const scenarioIdx = header.findIndex((c) => /^scenario$/i.test(c))
	if (scenarioIdx === -1) return { hasSection: true, refs: [] } // table with no Scenario column

	const refs: string[] = []
	// data rows start after the header separator (`|---|---|`); stop at the first
	// non-`|` line, which ends the contiguous table block.
	for (let i = headerIdx + 2; i < lines.length; i++) {
		if (!lines[i].trim().startsWith('|')) break
		const cells = splitTableRow(lines[i])
		const cell = cells[scenarioIdx]
		if (!cell) continue
		const ref = /`([^`\n]+)`/.exec(cell)
		if (ref) refs.push(ref[1].trim())
	}
	return { hasSection: true, refs }
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A ref is either a shared `@tag` (present anywhere as a whole token in the
// feature text) or a `Scenario: <title>` (an exact sibling `Scenario:` line).
export function resolveScenarioRef(ref: string, featureText: string): boolean {
	if (ref.startsWith('@')) return new RegExp(`(^|\\s)${escapeRegExp(ref)}(\\s|$)`, 'm').test(featureText)
	const m = /^Scenario:\s*(.+)$/.exec(ref)
	if (!m) return false
	const title = m[1].trim()
	return new RegExp(`^\\s*Scenario:\\s*${escapeRegExp(title)}\\s*$`, 'm').test(featureText)
}

// `dir` is the checked spec.md/README's own directory — the sibling `.feature` is
// `<node>.feature` (named after the containing dir) or, failing that, the single
// `.feature` file in the dir (mirrors hasFeatureFile's discovery, disambiguated by name).
export function findSiblingFeature(dir: string): string | null {
	let entries: string[]
	try {
		entries = readdirSync(dir).filter((f) => f.endsWith('.feature'))
	} catch {
		return null
	}
	if (entries.length === 0) return null
	const named = `${basename(dir)}.feature`
	if (entries.includes(named)) return join(dir, named)
	return join(dir, entries[0])
}

export function checkUseCaseCoverage(slug: string, dir: string, text: string): string[] {
	const v: string[] = []
	const tag = (msg: string) => v.push(`${slug}: ${msg}`)
	const { hasSection, refs } = extractUseCaseScenarioRefs(text)
	if (!hasSection || refs.length === 0) return v

	const featurePath = findSiblingFeature(dir)
	const featureText = featurePath ? readFileSync(featurePath, 'utf8') : ''
	for (const ref of refs) {
		if (!resolveScenarioRef(ref, featureText))
			tag(`Use Cases table names scenario \`${ref}\` that does not resolve in the sibling .feature`)
	}
	return v
}

export function checkUseCaseCoverageInFiles(paths: string[]): string[] {
	const violations: string[] = []
	for (const p of paths) {
		let text: string
		try {
			text = readFileSync(p, 'utf8')
		} catch {
			continue // an unreadable file is already reported by the referenced-artifact check
		}
		violations.push(...checkUseCaseCoverage(p, dirname(p), text))
	}
	return violations
}

export function main(argv: string[]): number {
	if (argv.includes('--files')) {
		const paths = parseFilesArg(argv)
		if (paths.length === 0) {
			console.error('✗ --files requires at least one .md path under the spec tree')
			return 1
		}
		const proseFiles = filterProseMdInSpecTree(paths)
		const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : undefined
		const baseline = base ? (p: string) => readBaselineFromGit(base, p) : () => ''
		const { findings, violations: refReadErrors } = checkReferencedArtifactsInFiles(proseFiles, baseline)
		const ucViolations = checkUseCaseCoverageInFiles(proseFiles)
		const violations = [...refReadErrors, ...ucViolations]
		for (const f of findings) process.stdout.write(`⚠ ${f}\n`)
		if (violations.length) {
			for (const line of violations) console.error(`✗ ${line}`)
			return 1
		}
		process.stdout.write(
			findings.length
				? `referenced-artifact findings surfaced for judgment (${findings.length}); use-case-coverage OK\n`
				: 'referenced-artifact and use-case-coverage checks OK\n',
		)
		return 0
	}

	const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : '.agents/specs'
	let violations: string[] = []

	for (const slug of discoverSpecDirs(root)) {
		const specPath = join(root, slug, 'spec.md')
		if (!existsSync(specPath)) continue
		const state = parseSpecState(readFileSync(specPath, 'utf8'))
		violations = violations.concat(checkSpec(slug, state))
		const gates = parseLedgerGates(readLedgerText(root, slug))
		violations = violations.concat(checkGateFloor(slug, state.status, gates))
	}
	for (const slug of discoverNodeDirs(root)) {
		const dir = join(root, slug)
		const readme = join(dir, 'README.md')
		if (!existsSync(readme)) continue
		violations = violations.concat(checkNode(slug, parseNode(readFileSync(readme, 'utf8')), hasFeatureFile(dir)))
	}

	if (violations.length) {
		for (const line of violations) console.error(`✗ ${line}`)
		return 1
	}
	process.stdout.write('spec states OK\n')
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
