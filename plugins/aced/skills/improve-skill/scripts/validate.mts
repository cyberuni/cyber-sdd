#!/usr/bin/env node
// validate — the deterministic mechanical-check engine for the ACED improve-skill node. Ported
// from the cyberplace CLI's `audit validate` (packages/cyberplace/src/audit/{validate,cli}.ts +
// skill/manifest.ts, inlined here for self-containment).
//
// Runs ONLY the mechanical check subset: S1-S6, Q1-Q5, Q10-Q11, Q17, Q18, E1-E2, E6, E9. Everything
// else (Q6-Q9, Q12-Q16, E3-E5, E7-E8, P1-P3) is agent-only quality review and is NOT run here —
// that is judged separately by the improve-skill agent skill / the ACED impl-judge.
//
// CLI:
//   --path <path>    validate a single skill directory or SKILL.md file (default: whole-project scan)
//   --dir <glob>     add a one-off scan location for this run (repeatable; ignored when --path is set)
//   --root <path>    repo root to scan from (default: cwd)
//   --format <fmt>   text (default, human-readable) or json (machine-readable findings)
//
// Whole-project scans (no --path) union the built-in defaults (skills/, .agents/skills/) with any
// extra locations declared in .agents/aced/skill-dirs.toml's `anchors` array (ADR-0019-style, opt-in)
// plus --dir globs. * globs one path segment; ** globs zero or more segments at any depth.
//
// Exit codes: 0 = no CRITICAL findings (including "no SKILL.md files found"); 1 = at least one
// CRITICAL finding, OR --path named a target with no SKILL.md.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps
// (the repo's node-≥23.6 convention) — imports ONLY node:* builtins.

import * as fs from 'node:fs'
import * as path from 'node:path'

// ── types ──

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface Finding {
	severity: Severity
	checkId: string
	name: string
	evidence: string
	fix: string
}

export interface CheckResult {
	criticals: Finding[]
	warnings: Finding[]
}

// ── skill.json manifest (inlined from cyberplace src/skill/manifest.ts) ──

interface SkillManifest {
	distribution?: {
		install_via: string
		package?: { name: string; bin?: string }
	}
}

function readSkillManifest(skillDir: string): SkillManifest | null {
	const filePath = path.join(skillDir, 'skill.json')
	if (!fs.existsSync(filePath)) return null
	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SkillManifest
	} catch {
		return null
	}
}

// ── scan scope ──

export const SKILL_DIRS = ['skills', '.agents/skills']

const SKILL_DIRS_CONFIG = '.agents/aced/skill-dirs.toml'
const SCAN_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.turbo', '.next', 'coverage'])

// Minimal `anchors = [ … ]` TOML string-array parser (mirrors manage-spec-anchors.mts'
// parseAnchorsToml — no toml dependency). Malformed/absent config => no extra locations.
export function parseSkillDirsToml(text: string): string[] {
	const m = /(^|\n)\s*anchors\s*=\s*\[([\s\S]*?)\]/.exec(text)
	if (!m) return []
	const out: string[] = []
	for (const q of m[2]!.matchAll(/"([^"]*)"|'([^']*)'/g)) out.push((q[1] ?? q[2] ?? '').trim())
	return out.filter((s) => s !== '')
}

// Read .agents/aced/skill-dirs.toml's `anchors` array. Absent/unreadable/malformed => [] so the
// scan falls back to the built-in defaults unchanged; never throws.
export function readSkillDirsConfig(cwd: string): string[] {
	const file = path.join(cwd, SKILL_DIRS_CONFIG)
	if (!fs.existsSync(file)) return []
	try {
		return parseSkillDirsToml(fs.readFileSync(file, 'utf8'))
	} catch {
		return []
	}
}

// Every dir reachable from `startDir` by descending zero or more levels (startDir itself
// included), skipping SCAN_SKIP_DIRS. Backs the `**` segment (any-depth glob) below.
function collectDescendants(cwd: string, startDir: string): string[] {
	const out = [startDir]
	let entries: fs.Dirent[]
	try {
		entries = fs.readdirSync(path.join(cwd, startDir), { withFileTypes: true })
	} catch {
		return out
	}
	for (const entry of entries) {
		if (!entry.isDirectory() || SCAN_SKIP_DIRS.has(entry.name)) continue
		out.push(...collectDescendants(cwd, startDir ? `${startDir}/${entry.name}` : entry.name))
	}
	return out
}

// Expand one skill-dir pattern against the filesystem under cwd. `*` globs exactly one path
// segment; `**` globs zero or more segments at any depth; every other segment is literal. Returns
// concrete repo-relative directories (no <project> capture token here — only * and **).
export function expandSkillDirPattern(cwd: string, pattern: string): string[] {
	const segs = pattern
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.split('/')
		.filter(Boolean)

	let frontier: string[] = ['']
	for (const seg of segs) {
		const next: string[] = []
		if (seg === '**') {
			for (const dir of frontier) next.push(...collectDescendants(cwd, dir))
		} else if (seg === '*') {
			for (const dir of frontier) {
				let entries: fs.Dirent[]
				try {
					entries = fs.readdirSync(path.join(cwd, dir), { withFileTypes: true })
				} catch {
					continue
				}
				for (const entry of entries) {
					if (!entry.isDirectory() || SCAN_SKIP_DIRS.has(entry.name)) continue
					next.push(dir ? `${dir}/${entry.name}` : entry.name)
				}
			}
		} else {
			for (const dir of frontier) next.push(dir ? `${dir}/${seg}` : seg)
		}
		frontier = next
	}
	return frontier
}

// The scan locations for a whole-project run: the two built-in defaults, unioned with the
// configured .agents/aced/skill-dirs.toml anchors and any --dir globs, each expanded against the
// filesystem. A glob matching nothing contributes no locations and never errors.
export function resolveScanDirs(cwd: string, dirGlobs: string[] = []): string[] {
	const dirs = new Set<string>(SKILL_DIRS)
	for (const pattern of [...readSkillDirsConfig(cwd), ...dirGlobs]) {
		for (const dir of expandSkillDirPattern(cwd, pattern)) dirs.add(dir)
	}
	return [...dirs]
}

// The recognized scan roots as absolute realpaths — a directory a correctly-nested skill sits one
// named level below. S1 keys on membership here (in addition to the universal `skills` convention),
// so a skill under a configured non-`skills` scan location is still recognized as correctly placed.
export function recognizedScanRoots(cwd: string, dirGlobs: string[] = []): Set<string> {
	const roots = new Set<string>()
	for (const dir of resolveScanDirs(cwd, dirGlobs)) {
		try {
			roots.add(fs.realpathSync(path.join(cwd, dir)))
		} catch {
			// a configured location that does not exist on disk contributes no root
		}
	}
	return roots
}

export function findSkillFiles(dirs: string[], cwd: string): string[] {
	const seen = new Set<string>()
	const results: string[] = []

	for (const dir of dirs) {
		const base = path.join(cwd, dir)
		if (!fs.existsSync(base)) continue

		for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
			const skillFile = path.join(base, entry.name, 'SKILL.md')
			if (!fs.existsSync(skillFile)) continue
			try {
				const real = fs.realpathSync(skillFile)
				if (!seen.has(real)) {
					seen.add(real)
					results.push(real)
				}
			} catch {
				// skip unresolvable symlinks
			}
		}
	}

	return results.sort()
}

// ── check constants ──

const GENERIC_PHRASES = [
	'helps with',
	'general purpose',
	'handles tasks',
	'use this skill when the user asks anything',
	'does things',
]

// Catastrophic command shapes: always CRITICAL regardless of an `rm` flag/target analysis. `rm`
// itself is graded separately below by recursion flag and target shape (classifyRmSeverity).
const E1_CRITICAL_PATTERNS: RegExp[] = [
	/\bsudo\s+rm\b/,
	/(curl|wget)[^|\n]*\|\s*(ba|z)?sh\b/,
	/\bdd\s+if=/,
	/\b(mkfs|fdisk|parted)\b/,
	/kill\s+-9\s+1\b/,
	/:\(\)\{\s*:\|:&\s*\}/,
	/chmod\s+-R\s+777\s+/,
]

// Grade an `rm` invocation by blast radius. Not flagged at all (no -r/-R, no -f) => null (E1
// doesn't fire). Any recursion flag => CRITICAL. A forced (-f), non-recursive remove is CRITICAL
// when any target token escapes a single named relative file (glob, absolute, or home/var path),
// else HIGH (scoped forced delete of named relative file(s) — surfaced, not blocking).
export function classifyRmSeverity(line: string): 'CRITICAL' | 'HIGH' | null {
	const m = /\brm\s+(.+)/.exec(line)
	if (!m) return null
	const tokens = m[1]!.trim().split(/\s+/)
	const flagTokens = tokens.filter((t) => /^-\w+$/.test(t))
	const targetTokens = tokens.filter((t) => !t.startsWith('-'))
	const flags = flagTokens.join('')
	const hasRecursion = /[rR]/.test(flags)
	const hasForce = /f/.test(flags)

	if (!hasRecursion && !hasForce) return null
	if (hasRecursion) return 'CRITICAL'

	const escapesScope =
		targetTokens.length === 0 ||
		targetTokens.some((t) => /[*?[]/.test(t) || t.startsWith('/') || t.startsWith('~') || t.includes('$'))
	return escapesScope ? 'CRITICAL' : 'HIGH'
}

// Classify one line for E1. Checks the unconditional-CRITICAL patterns first, then falls back to
// the rm-specific flag/target grading.
function classifyE1Line(line: string): 'CRITICAL' | 'HIGH' | null {
	for (const pat of E1_CRITICAL_PATTERNS) {
		if (pat.test(line)) return 'CRITICAL'
	}
	return classifyRmSeverity(line)
}

const E2_PATTERNS: RegExp[] = [
	/[Ii]gnore (previous|all|prior) instructions/,
	/[Yy]ou are now [A-Z][a-zA-Z]/,
	/[Ff]rom now on you are /,
	/[Dd]isregard your (guidelines|rules)/,
	/[Ff]orget your (guidelines|training)/,
	/[Yy]our new instructions are/,
]

const INVISIBLE_UNICODE = new Map<number, string>([
	[0x00ad, 'SOFT HYPHEN'],
	[0x034f, 'COMBINING GRAPHEME JOINER'],
	[0x061c, 'ARABIC LETTER MARK'],
	[0x180e, 'MONGOLIAN VOWEL SEPARATOR'],
	[0x200b, 'ZERO WIDTH SPACE'],
	[0x200c, 'ZERO WIDTH NON-JOINER'],
	[0x200d, 'ZERO WIDTH JOINER'],
	[0x200e, 'LEFT-TO-RIGHT MARK'],
	[0x200f, 'RIGHT-TO-LEFT MARK'],
	[0x202a, 'LEFT-TO-RIGHT EMBEDDING'],
	[0x202b, 'RIGHT-TO-LEFT EMBEDDING'],
	[0x202c, 'POP DIRECTIONAL FORMATTING'],
	[0x202d, 'LEFT-TO-RIGHT OVERRIDE'],
	[0x202e, 'RIGHT-TO-LEFT OVERRIDE'],
	[0x2060, 'WORD JOINER'],
	[0x2061, 'FUNCTION APPLICATION'],
	[0x2062, 'INVISIBLE TIMES'],
	[0x2063, 'INVISIBLE SEPARATOR'],
	[0x2064, 'INVISIBLE PLUS'],
	[0x2066, 'LEFT-TO-RIGHT ISOLATE'],
	[0x2067, 'RIGHT-TO-LEFT ISOLATE'],
	[0x2068, 'FIRST STRONG ISOLATE'],
	[0x2069, 'POP DIRECTIONAL ISOLATE'],
	[0xfeff, 'ZERO WIDTH NO-BREAK SPACE / BOM'],
])

// Q17 — objective operational-detail markers in a partial-skill description.
// A named/pathed artifact file (stem required so bare domain-noun ".feature" is not flagged):
const OP_DETAIL_FILEREF = /[\w-]+\.(?:mts|mjs|feature|jsonl|toml|sddignore)\b|[\w.-]+\/[\w./-]+\.(?:md|js|ts|json|sh)\b/
// A known operational directory reference:
const OP_DETAIL_DIR = /\.agents\/|\.github\/|(?<![\w.])scripts\//
// A validate-engine check-ID (S1, Q5, E9, P1-P3, S1-S6):
const OP_DETAIL_CHECKID = /\b[SQEP]\d{1,2}(?:[-–]\d{1,2})?\b/

const STDOUT_AS_DATA_PATTERNS: RegExp[] = [
	/\bparse (?:the )?(?:script )?output\b/i,
	/\bread (?:the )?(?:summary )?table\b/i,
	/\bshow (?:the )?(?:script )?output\b/i,
	/\bfrom (?:the )?script output\b/i,
]

function hasStdoutAsDataMitigation(content: string): boolean {
	return (
		/(--json|--format json|--format agent)/.test(content) ||
		/parse stdout json/i.test(content) ||
		/read `<[^`]+>`/i.test(content) ||
		/read the (?:artifact|file|report)/i.test(content)
	)
}

// ── frontmatter / body parsing ──

function parseFrontmatter(content: string): { name: string; description: string; internal: boolean } {
	const lines = content.split('\n')
	let fmCount = 0
	let name = ''
	let description = ''
	let internal = false

	for (const line of lines) {
		if (line.trim() === '---') {
			fmCount++
			if (fmCount === 2) break
			continue
		}
		if (fmCount !== 1) continue

		const nameMatch = line.match(/^name:\s*(.+)/)
		if (nameMatch) name = nameMatch[1]!.trim().replace(/^["']|["']$/g, '')

		const descMatch = line.match(/^description:\s*(.+)/)
		if (descMatch) description = descMatch[1]!.trim().replace(/^["']|["']$/g, '')

		if (/^user-invocable:\s*false\s*$/i.test(line)) {
			internal = true
		}
	}

	return { name, description, internal }
}

function extractBody(content: string): string {
	const lines = content.split('\n')
	let fmCount = 0
	const bodyLines: string[] = []

	for (const line of lines) {
		if (line.trim() === '---') {
			fmCount++
			continue
		}
		if (fmCount >= 2) bodyLines.push(line)
	}

	return bodyLines.join('\n')
}

function extractCodeBlocks(content: string): string {
	const lines = content.split('\n')
	let inBlock = false
	const out: string[] = []

	for (let i = 0; i < lines.length; i++) {
		if (lines[i]!.startsWith('```')) {
			inBlock = !inBlock
			continue
		}
		if (inBlock) out.push(`${i + 1}: ${lines[i]}`)
	}

	return out.join('\n')
}

function stripExamples(content: string): string {
	return content.replace(/`[^`]*`/g, '').replace(/"[^"]*"/g, '')
}

function isShellExpandedReference(source: string, matchIndex: number): boolean {
	const previousChar = source[matchIndex - 1]
	const previousTwoChars = source.slice(Math.max(0, matchIndex - 2), matchIndex)
	return previousChar === '$' || previousTwoChars === ')/' || previousTwoChars === '}/'
}

function findInvisibleUnicode(
	source: string,
): { line: number; column: number; codePoint: number; name: string } | null {
	let line = 1
	let column = 1

	for (const char of source) {
		if (char === '\n') {
			line++
			column = 1
			continue
		}

		const codePoint = char.codePointAt(0)
		if (codePoint !== undefined) {
			const name = INVISIBLE_UNICODE.get(codePoint)
			if (name) return { line, column, codePoint, name }
		}

		column++
	}

	return null
}

const ROOT_LOCAL_PATH_PREFIXES = ['docs/', 'governances/', 'skills/', 'src/', 'apps/', 'packages/']

function normalizeLinkTarget(target: string): string {
	const trimmed = target.trim().replace(/^<|>$/g, '')
	const withoutTitle = trimmed.split(/\s+"/)[0] ?? trimmed
	return withoutTitle
}

function findPublicSkillExternalRefs(
	content: string,
	skillDir: string,
	repoRoot: string,
): Array<{ ref: string; reason: string }> {
	const findings = new Map<string, string>()
	const add = (ref: string, reason: string) => {
		if (!findings.has(ref)) findings.set(ref, reason)
	}

	const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g
	let match: RegExpExecArray | null
	while ((match = markdownLinkPattern.exec(content)) !== null) {
		const target = normalizeLinkTarget(match[1] ?? '')
		if (!target || /^(https?:|mailto:|#)/i.test(target)) continue
		if (target.startsWith('../')) {
			add(target, 'parent-directory traversal escapes the skill folder')
			continue
		}
		if (ROOT_LOCAL_PATH_PREFIXES.some((prefix) => target.startsWith(prefix) && target.length > prefix.length)) {
			add(target, 'repo-local link points outside the skill folder')
			continue
		}
		if (path.isAbsolute(target) && target.startsWith(repoRoot)) {
			add(target, 'absolute path points to a repo file outside the skill folder')
		}
	}

	const prosePathPattern =
		/(^|[\s(<'"`])(\.\.\/[^\s)"'`<>]+|(?:docs|governances|skills|src|apps|packages)\/[^\s)"'`<>]+)(?![A-Za-z0-9_-])/gm

	while ((match = prosePathPattern.exec(content)) !== null) {
		const ref = match[2] ?? ''
		if (!ref) continue
		if (ref.startsWith('../')) {
			add(ref, 'parent-directory traversal escapes the skill folder')
		} else {
			const resolved = path.resolve(repoRoot, ref)
			if (resolved.startsWith(skillDir)) continue
			if (fs.existsSync(resolved)) add(ref, 'repo-local path points outside the skill folder')
		}
	}

	return Array.from(findings, ([ref, reason]) => ({ ref, reason }))
}

// ── the mechanical check engine: S1-S6, Q1-Q5, Q10-Q11, Q17, Q18, E1-E2, E6, E9 ──

export function runChecks(filePath: string, scanRoots?: Set<string>): CheckResult {
	const criticals: Finding[] = []
	const warnings: Finding[] = []

	const crit = (checkId: string, name: string, evidence: string, fix: string) =>
		criticals.push({ severity: 'CRITICAL', checkId, name, evidence, fix })

	const warn = (severity: Severity, checkId: string, name: string, evidence: string, fix: string) =>
		warnings.push({ severity, checkId, name, evidence, fix })

	const content = fs.readFileSync(filePath, 'utf8')
	const skillDir = path.dirname(filePath)
	const skillBaseDir = path.dirname(skillDir)
	const skillBaseParent = path.basename(path.dirname(skillBaseDir))
	const repoRoot = skillBaseParent === '.agents' ? path.dirname(path.dirname(skillBaseDir)) : path.dirname(skillBaseDir)
	const dirName = path.basename(skillDir)
	const parent = path.basename(skillBaseDir)

	const { name: fmName, description: fmDesc, internal: fmInternal } = parseFrontmatter(content)
	const body = extractBody(content)
	const codeBlocks = extractCodeBlocks(content)
	const stripped = stripExamples(content)
	const invisibleInSkill = findInvisibleUnicode(content)
	const isPartialSkill = fmInternal
	const isPublicShippedSkill = parent === 'skills' && skillBaseParent !== '.agents' && !fmInternal

	// S1: the SKILL.md must sit in its own named subdirectory directly under a recognized scan root.
	// "Recognized" is the universal `skills` convention (holds anywhere, incl. an external/temp skill
	// audited via --path) OR any configured scan root passed in — never a literal-`skills`-dirname
	// requirement, which would false-positive a skill under a configured non-`skills` location (#149).
	let containerReal = skillBaseDir
	try {
		containerReal = fs.realpathSync(skillBaseDir)
	} catch {
		// unresolvable container (e.g. broken symlink) — fall back to the raw path
	}
	const nestedUnderScanRoot = parent === 'skills' || (scanRoots?.has(containerReal) ?? false)
	if (!nestedUnderScanRoot) {
		crit(
			'S1',
			'SKILL.md in own directory',
			`path: ${filePath}`,
			'Move SKILL.md into its own named subdirectory directly under a recognized skill-scan root',
		)
	}

	if (!fmName) {
		crit(
			'S2',
			'Required frontmatter: name',
			'name: field missing or empty',
			`Add 'name: ${dirName}' to the YAML frontmatter block`,
		)
	}
	if (!fmDesc) {
		crit(
			'S2',
			'Required frontmatter: description',
			'description: field missing or empty',
			'Add a description: field to the YAML frontmatter block',
		)
	}

	if (fmName && fmName !== dirName) {
		warn(
			'HIGH',
			'S3',
			'name matches directory',
			`name: '${fmName}' but directory is '${dirName}'`,
			`Set name: to '${dirName}'`,
		)
	}

	const s4RefPattern = /([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+\.[a-zA-Z]+)/g
	const s4Skip = /[<>*]|^(https?:\/\/|~|\/|skills\/|\.agents\/|\.github\/|\.cursor\/|\.vscode\/)/
	const s4Ext = /\.(md|sh|mts|mjs|js|ts|py|json|yaml|yml)$/
	const s4Refs = new Set<string>()
	let m: RegExpExecArray | null
	while ((m = s4RefPattern.exec(codeBlocks)) !== null) {
		const ref = m[1]!
		if (isShellExpandedReference(codeBlocks, m.index)) continue
		if (m.index > 0 && codeBlocks[m.index - 1] === '/') continue
		if (!s4Skip.test(ref) && s4Ext.test(ref)) s4Refs.add(ref)
	}
	for (const ref of s4Refs) {
		if (!fs.existsSync(path.join(skillDir, ref))) {
			warn(
				'HIGH',
				'S4',
				'Referenced file does not exist in skill directory',
				`${ref} (looked for ${path.join(skillDir, ref)})`,
				'Create the file inside the skill directory or remove the reference',
			)
		}
	}

	if (isPublicShippedSkill) {
		for (const finding of findPublicSkillExternalRefs(content, skillDir, repoRoot)) {
			warn(
				'HIGH',
				'S4',
				'Public skill references files outside its skill directory',
				`${finding.ref} (${finding.reason})`,
				'Keep shipped skill references inside the skill folder or replace with external URLs / generic prose',
			)
		}
	}

	const anchorPattern = /\[([^\]]+)\]\(#([^)]+)\)/g
	while ((m = anchorPattern.exec(stripped)) !== null) {
		const anchor = m[2]!
		const headingPat = anchor.replace(/-/g, '[- ]')
		if (!new RegExp(`^#{1,6}.*${headingPat}`, 'im').test(content)) {
			warn(
				'MEDIUM',
				'S5',
				'Internal anchor link does not resolve',
				`#${anchor}`,
				`Add a heading matching '${anchor.replace(/-/g, ' ')}' or fix the link target`,
			)
		}
	}

	if (!isPartialSkill && fmDesc && !/use this skill when|when to use/i.test(fmDesc)) {
		warn(
			'HIGH',
			'Q1',
			'Trigger language in description',
			`description: ${fmDesc}`,
			"Add 'Use this skill when ...' to the description field",
		)
	}

	if (fmDesc) {
		if (!isPartialSkill) {
			const wordCount = fmDesc.split(/\s+/).filter(Boolean).length
			if (wordCount < 12) {
				warn(
					'HIGH',
					'Q2',
					'Description too short (specificity)',
					`${wordCount} words: ${fmDesc}`,
					'Expand the description to at least 12 words with specific trigger conditions',
				)
			}
		}
		const genericHit = GENERIC_PHRASES.find((p) => new RegExp(p, 'i').test(fmDesc))
		if (genericHit) {
			warn(
				'HIGH',
				'Q2',
				'Description uses vague generic phrase',
				`matched '${genericHit}' in: ${fmDesc}`,
				'Replace with specific trigger conditions and outcomes',
			)
		}
	}

	if (
		isPartialSkill &&
		fmDesc &&
		(OP_DETAIL_FILEREF.test(fmDesc) || OP_DETAIL_DIR.test(fmDesc) || OP_DETAIL_CHECKID.test(fmDesc))
	) {
		warn(
			'MEDIUM',
			'Q17',
			'Partial skill description carries operational detail',
			`description: ${fmDesc}`,
			'Trim to identity + named caller only; move paths, directories, check-IDs, and artifact filenames to the body or README',
		)
	}

	if (isPartialSkill && fmDesc && !/^Partial Skill:/i.test(fmDesc)) {
		warn(
			'MEDIUM',
			'Q3',
			'Partial skill description missing the "Partial Skill:" prefix',
			`description: ${fmDesc}`,
			'Lead the description with "Partial Skill: invoke by name only — <identity>. <caller>."',
		)
	}

	if (isPartialSkill && fmDesc && /use this skill when|when to use/i.test(fmDesc)) {
		warn(
			'MEDIUM',
			'Q18',
			'Trigger language on a partial (by-name) skill',
			`description: ${fmDesc}`,
			'Remove "Use this skill when"/"when to use" phrasing — a partial skill is invoked by name, and trigger-shaped text invites spurious harness auto-matching',
		)
	}

	if (!body.trim()) {
		warn(
			'MEDIUM',
			'Q4',
			'No actionable instruction body',
			'body is empty after frontmatter',
			'Add numbered steps, decision logic, or ## section headers',
		)
	} else if (!/^\d+\.|^#{1,4} /m.test(body)) {
		warn(
			'MEDIUM',
			'Q4',
			'No actionable instruction body',
			'body has no numbered steps or section headers',
			'Add numbered steps, decision logic, or ## section headers',
		)
	}

	if (fmDesc && fmDesc.length > 1024) {
		warn(
			'HIGH',
			'Q5',
			'Description exceeds 1024 characters (spec hard limit)',
			`description: ${fmDesc.slice(0, 80)}… (${fmDesc.length} chars)`,
			'Trim to ≤1024 chars; move example phrases to the skill body',
		)
	}

	const scriptsDir = path.join(skillDir, 'scripts')
	const hasScripts = fs.existsSync(scriptsDir)

	for (const pat of STDOUT_AS_DATA_PATTERNS) {
		if (pat.test(body) && !hasStdoutAsDataMitigation(content)) {
			warn(
				'HIGH',
				'Q10',
				'SKILL.md instructs parsing stdout prose as data',
				body.match(pat)?.[0] ?? 'stdout-as-data pattern',
				'Prefer artifact file paths, read stdout with --format agent, or parse with --format json for non-LLM consumers',
			)
			break
		}
	}

	if (hasScripts) {
		const scriptFiles = fs.readdirSync(scriptsDir).filter((f) => !f.startsWith('.'))
		const hasInteractive = scriptFiles.some((f) => {
			const src = fs.readFileSync(path.join(scriptsDir, f), 'utf8')
			return /readline|createInterface|\.question\(/.test(src)
		})
		if (hasInteractive && !/--yes|-y/.test(content)) {
			warn(
				'HIGH',
				'Q11',
				'Interactive script missing non-interactive agent path',
				'scripts/ uses readline/prompt but SKILL.md does not document --yes or -y',
				'Document --yes (or equivalent) in SKILL.md for autonomous agent runs',
			)
		}
	}

	for (const line of codeBlocks.split('\n')) {
		const severity = classifyE1Line(line)
		if (!severity) continue
		if (severity === 'CRITICAL') {
			crit(
				'E1',
				'Dangerous shell command (in code block)',
				line.trim(),
				'Remove or rewrite; never embed destructive commands in a skill',
			)
		} else {
			warn(
				'HIGH',
				'E1',
				'Dangerous shell command (in code block)',
				line.trim(),
				'Remove or rewrite; never embed destructive commands in a skill',
			)
		}
		break
	}

	for (const pat of E2_PATTERNS) {
		const hit = stripped.split('\n').find((l) => pat.test(l))
		if (hit) {
			crit(
				'E2',
				'Prompt injection pattern',
				hit.trim(),
				'Remove prompt-injection content; treat skill body as untrusted data',
			)
			break
		}
	}

	if (invisibleInSkill) {
		crit(
			'E9',
			'Invisible Unicode control character',
			`SKILL.md:${invisibleInSkill.line}:${invisibleInSkill.column} U+${invisibleInSkill.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${invisibleInSkill.name}`,
			'Remove the hidden character or replace it with visible ASCII text',
		)
	}

	const e6Hit = stripped.split('\n').find((l) => /git push.*(--force|-f )/.test(l) && /(main|master)/.test(l))
	if (e6Hit) {
		warn(
			'HIGH',
			'E6',
			'Silent permission escalation: force-push to main/master',
			e6Hit.trim(),
			'Add an explicit user-confirmation step before the force-push',
		)
	}

	if (hasScripts) {
		for (const f of fs.readdirSync(scriptsDir).filter((name) => !name.startsWith('.'))) {
			const src = fs.readFileSync(path.join(scriptsDir, f), 'utf8')
			const invisibleInScript = findInvisibleUnicode(src)
			if (invisibleInScript) {
				crit(
					'E9',
					'Invisible Unicode control character',
					`scripts/${f}:${invisibleInScript.line}:${invisibleInScript.column} U+${invisibleInScript.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${invisibleInScript.name}`,
					'Remove the hidden character or replace it with visible ASCII text',
				)
			}
		}
	}

	const manifest = readSkillManifest(skillDir)
	if (manifest !== null) {
		const dist = manifest.distribution
		if (dist !== undefined) {
			const knownInstallVia = ['package_manager']
			if (!dist.install_via || !knownInstallVia.includes(dist.install_via)) {
				crit(
					'S6',
					'skill.json: invalid distribution.install_via',
					`install_via: ${dist.install_via ?? '(missing)'}`,
					`Set distribution.install_via to one of: ${knownInstallVia.join(', ')}`,
				)
			} else if (dist.install_via === 'package_manager' && !dist.package?.name) {
				crit(
					'S6',
					'skill.json: distribution.package.name required when install_via is package_manager',
					'distribution.package.name is missing or empty',
					'Add distribution.package.name with the npm package name that provides the skill binary',
				)
			}
		}
	}

	return { criticals, warnings }
}

// ── CLI: scan resolution, report, exit code ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

// Every value passed for a repeatable flag (e.g. --dir <glob> --dir <glob>).
function flagAll(argv: string[], name: string): string[] {
	const out: string[] = []
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === name && argv[i + 1] !== undefined) out.push(argv[i + 1]!)
	}
	return out
}

export interface ScanOutcome {
	ok: boolean
	exitCode: number
	message?: string
	results: Array<{ filePath: string; dirName: string; criticals: Finding[]; warnings: Finding[] }>
}

// Resolve --path (single skill dir or SKILL.md file) or the whole-project scan (SKILL_DIRS),
// run the mechanical check subset over each resolved SKILL.md, and roll up the exit code:
// a --path target with no SKILL.md errors non-zero; a project scan with zero SKILL.md files
// exits zero; any CRITICAL finding anywhere exits non-zero; otherwise exits zero.
export function scan(cwd: string, pathArg?: string, dirGlobs: string[] = []): ScanOutcome {
	let skillFiles: string[]

	if (pathArg) {
		const resolved = path.resolve(cwd, pathArg)
		const skillMd = resolved.endsWith('SKILL.md') ? resolved : path.join(resolved, 'SKILL.md')
		if (!fs.existsSync(skillMd)) {
			return { ok: false, exitCode: 1, message: `No SKILL.md found at ${skillMd}`, results: [] }
		}
		skillFiles = [skillMd]
	} else {
		skillFiles = findSkillFiles(resolveScanDirs(cwd, dirGlobs), cwd)
	}

	if (skillFiles.length === 0) {
		return { ok: true, exitCode: 0, message: 'No SKILL.md files found.', results: [] }
	}

	const scanRoots = recognizedScanRoots(cwd, dirGlobs)
	const results = skillFiles.map((filePath) => ({
		filePath,
		dirName: path.basename(path.dirname(filePath)),
		...runChecks(filePath, scanRoots),
	}))

	const totalCriticals = results.reduce((n, r) => n + r.criticals.length, 0)
	return { ok: totalCriticals === 0, exitCode: totalCriticals === 0 ? 0 : 1, results }
}

function printFinding(w: (s: string) => void, f: Finding): void {
	const icon = f.severity === 'CRITICAL' ? '❌' : '⚠️ '
	w(`  ${icon} [${f.severity}] ${f.checkId} — ${f.name}`)
	w(`     Evidence: ${f.evidence}`)
	w(`     Fix:      ${f.fix}`)
}

function printReport(w: (s: string) => void, outcome: ScanOutcome): void {
	if (outcome.results.length === 0) {
		w(outcome.message ?? '')
		return
	}

	w(`Validating ${outcome.results.length} skill(s)…`)

	let totalCriticals = 0
	let totalWarnings = 0

	for (const { dirName, criticals, warnings } of outcome.results) {
		w(`\n── ${dirName} ─────────────────────────`)
		totalCriticals += criticals.length
		totalWarnings += warnings.length

		for (const f of criticals) printFinding(w, f)
		for (const f of warnings) printFinding(w, f)

		if (criticals.length === 0) {
			w('  ✅ no CRITICAL findings')
		} else {
			w('  🚨 DO NOT commit or install until all CRITICAL findings are resolved.')
		}
	}

	w('\n══════════════════════════════════════')
	w(`Results: ${totalCriticals} critical failure(s), ${totalWarnings} warning(s)`)

	if (totalCriticals > 0) {
		w('❌ Fix all CRITICAL findings before merging.')
	} else {
		w('✅ All checks passed (S1–S6, Q1–Q5, Q10–Q11, Q17, Q18, E1–E2, E6, E9).')
		w('   Run the improve-skill agent skill for full quality review (Q6–Q16, E3–E5, E7–E8, P1–P3).')
	}
}

const HELP = `usage: validate.mts [--path <path>] [--dir <glob>]... [--root <path>] [--format text|json]

Validate skills against the mechanical check subset (S1-S6, Q1-Q5, Q10-Q11, Q17, Q18, E1-E2, E6, E9).

  --path <path>    validate a single skill directory or SKILL.md file (default: whole-project scan)
  --dir <glob>     add a one-off scan location for this run (repeatable; ignored when --path is set)
  --root <path>    repo root to scan from (default: cwd)
  --format <fmt>   text (default) or json
  --help           show this message
`

export function main(argv: string[]): number {
	if (argv.includes('--help') || argv.includes('-h')) {
		process.stdout.write(HELP)
		return 0
	}

	const cwd = path.resolve(flag(argv, '--root') ?? '.')
	const pathArg = flag(argv, '--path')
	const dirGlobs = flagAll(argv, '--dir')
	const format = flag(argv, '--format') ?? (argv.includes('--json') ? 'json' : 'text')

	const outcome = scan(cwd, pathArg, dirGlobs)

	if (format === 'json') {
		process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`)
		return outcome.exitCode
	}

	if (!outcome.ok && outcome.results.length === 0) {
		process.stderr.write(`${outcome.message}\n`)
		return outcome.exitCode
	}

	printReport((s) => process.stdout.write(`${s}\n`), outcome)
	return outcome.exitCode
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
