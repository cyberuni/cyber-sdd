#!/usr/bin/env node
// wire-statusline — gateway/init's concrete wiring engine for the mission statusline. It reads/writes
// ONLY project `.claude/settings.json` (never the global `~/.claude/settings.json`) and, only when the
// root is a git repo, `.gitignore`. It never touches spec/contract state (status, approval, spec.md).
// It also READS the global `~/.claude/settings.json` (or an override path) to detect and, on a fresh
// wire, compose its statusLine command as the wrapped base — read-only, never written.
//
// Operation:
//   --wire --mode own-line|same-line   compose the SDD statusLine segment into project settings and
//                                       (in a git repo) add the status file to .gitignore; idempotent
//                                       [--global-settings <file>] [--no-global-base]
//   --detect [--global-settings <file>]  read-only: report project/global statusLine state and shadow risk
//
// The wired command reads the single-line status file `.agents/sdd/statusline` the conductor writes
// (`../../mission/conductor/`) and renders it — own-line (a new row) or same-line (an appended
// segment) — falling through to nothing (or the composed base, unchanged) when the file is absent.
// Compose, never stomp: an existing `statusLine` command is preserved as the wrapped "base"; the SDD
// segment is added around it. Re-wiring (same or a different mode) rewrites the one managed block —
// it never stacks a second SDD segment.
//
// Global shadow (issue #164): Claude Code's project statusLine REPLACES (never merges with) the
// global one. When the project has no statusLine of its own, a fresh wire composes the global
// command as the base by default so the global line keeps rendering instead of going blank. A
// re-run of an already-wired (or foreign) project command never re-consults the global — only a
// fresh wire ever adopts it.
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const STATUS_FILE = '.agents/sdd/statusline'
export const SETTINGS_FILE = '.claude/settings.json'
export const GITIGNORE_FILE = '.gitignore'
export const GLOBAL_SETTINGS_FILE = join(homedir(), '.claude', 'settings.json')

export type StatusLineMode = 'own-line' | 'same-line'

const MARKER_BEGIN = '# sdd-statusline:begin'
const MARKER_END = '# sdd-statusline:end'
const MODE_PREFIX = '# sdd-statusline:mode:'
const ORIG_OPEN = '__sdd_orig() {'
const ORIG_CLOSE = '}'
const NO_BASE = ':'

// ── the managed command block ──

// Build the self-contained POSIX sh command that reads the status file and renders it in `mode`,
// wrapping `base` (the pre-existing statusLine command, if any) so its output is preserved.
export function buildCommand(base: string | undefined, mode: StatusLineMode): string {
	const origBody = base && base.trim() !== '' ? base : NO_BASE
	const render =
		mode === 'own-line'
			? `if [ -s "$__sdd_file" ]; then\n  __sdd_val="$(cat "$__sdd_file")"\n  printf '%s\\n%s\\n' "$__sdd_base" "$__sdd_val"\nelse\n  printf '%s\\n' "$__sdd_base"\nfi`
			: `if [ -s "$__sdd_file" ]; then\n  __sdd_val="$(cat "$__sdd_file")"\n  printf '%s | %s\\n' "$__sdd_base" "$__sdd_val"\nelse\n  printf '%s\\n' "$__sdd_base"\nfi`
	return [
		MARKER_BEGIN,
		`${MODE_PREFIX}${mode}`,
		ORIG_OPEN,
		origBody,
		ORIG_CLOSE,
		'__sdd_base="$(__sdd_orig 2>/dev/null)"',
		`__sdd_file="${STATUS_FILE}"`,
		render,
		MARKER_END,
	].join('\n')
}

export interface ParsedCommand {
	wired: boolean
	base?: string
	mode?: StatusLineMode
}

// Recognize a previously wired command and recover its wrapped base + mode, so re-wiring rebuilds the
// same managed block instead of stacking a second one. A command with no marker is not wired — the
// whole string becomes the base to wrap.
export function parseCommand(command: string | undefined): ParsedCommand {
	if (!command?.includes(MARKER_BEGIN)) return { wired: false }
	const modeMatch = new RegExp(`${MODE_PREFIX}(own-line|same-line)`).exec(command)
	const origMatch = /__sdd_orig\(\) \{\n([\s\S]*?)\n\}/.exec(command)
	const mode = (modeMatch?.[1] as StatusLineMode | undefined) ?? 'own-line'
	const origBody = origMatch?.[1] ?? NO_BASE
	return { wired: true, base: origBody === NO_BASE ? undefined : origBody, mode }
}

// The command to wrap as `base` when composing: an already-wired command hands back its recovered
// original base (never nests); any other command is the base verbatim.
function baseToWrap(existingCommand: string | undefined): string | undefined {
	const parsed = parseCommand(existingCommand)
	return parsed.wired ? parsed.base : existingCommand
}

// ── project settings.json ──

interface StatusLineConfig {
	type: string
	command: string
	[key: string]: unknown
}

interface Settings {
	statusLine?: StatusLineConfig
	[key: string]: unknown
}

function readSettingsFile(file: string): Settings {
	if (!existsSync(file)) return {}
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as Settings
	} catch {
		return {}
	}
}

function readSettings(root: string): Settings {
	return readSettingsFile(join(root, SETTINGS_FILE))
}

// Read a settings JSON file's statusLine.command, read-only. Absent file, unparseable JSON, or a
// missing/non-string/blank command all collapse to undefined — a malformed global settings file is
// treated the same as no global statusLine (frozen scenario).
export function readStatusLineCommand(file: string): string | undefined {
	const settings = readSettingsFile(file)
	const command = settings.statusLine?.command
	if (typeof command !== 'string' || command.trim() === '') return undefined
	return command
}

function writeSettings(root: string, settings: Settings): void {
	const file = join(root, SETTINGS_FILE)
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`)
}

export interface ComposeResult {
	changed: boolean
	command: string
	globalBaseComposed: boolean
}

// Compose the SDD statusLine segment into project settings.json. Preserves any existing statusLine
// command's output as the wrapped base (never overwrites it); creates the key when absent. Rewiring
// the same mode over an already-wired command is a no-op (byte-identical command).
//
// Base selection: when the project settings define no usable `statusLine` command (the same
// predicate detectStatusLines reports as `absent`), this is a fresh wire — the base is
// `globalCommand` (possibly undefined). When a usable project `statusLine` already exists (foreign
// or already wired), today's behavior is unchanged — the existing command's recovered base is used
// and `globalCommand` is ignored entirely, so a re-run never re-consults or adopts the global.
export function composeStatusLine(root: string, mode: StatusLineMode, globalCommand?: string): ComposeResult {
	const settings = readSettings(root)
	const existing = settings.statusLine?.command
	const hasProjectStatusLine = typeof existing === 'string' && existing.trim() !== ''
	const globalBaseComposed = !hasProjectStatusLine && globalCommand !== undefined
	const base = hasProjectStatusLine ? baseToWrap(existing) : globalCommand
	const command = buildCommand(base, mode)
	if (existing === command) return { changed: false, command, globalBaseComposed: false }
	settings.statusLine = { ...settings.statusLine, type: 'command', command }
	writeSettings(root, settings)
	return { changed: true, command, globalBaseComposed }
}

// ── .gitignore ──

export function isGitRepo(root: string): boolean {
	return existsSync(join(root, '.git'))
}

function splitLines(text: string): string[] {
	const lines = text.split('\n')
	if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
	return lines
}

// Idempotently add the status file to .gitignore (creating it if absent). Only called when the root
// is a git repo; a no-op when the entry is already present.
export function addGitignoreEntry(root: string): { changed: boolean } {
	const file = join(root, GITIGNORE_FILE)
	const lines = existsSync(file) ? splitLines(readFileSync(file, 'utf8')) : []
	if (lines.some((l) => l.trim() === STATUS_FILE)) return { changed: false }
	const next = [...lines, STATUS_FILE]
	writeFileSync(file, `${next.join('\n')}\n`)
	return { changed: true }
}

// ── global statusline detection ──

export interface DetectResult {
	project: 'absent' | 'wired' | 'foreign'
	global: 'absent' | 'present'
	shadow: boolean
}

// Read-only: report the project statusLine state, the global statusLine state, and whether wiring
// would shadow a global statusLine that is currently rendering (project has none, global has one).
// Never writes anything — used to surface the shadow risk before wiring and by `--detect`.
export function detectStatusLines(root: string, globalSettingsFile?: string): DetectResult {
	const projectCommand = readStatusLineCommand(join(root, SETTINGS_FILE))
	const project = projectCommand === undefined ? 'absent' : parseCommand(projectCommand).wired ? 'wired' : 'foreign'
	const global = readStatusLineCommand(globalSettingsFile ?? GLOBAL_SETTINGS_FILE) !== undefined ? 'present' : 'absent'
	const shadow = project === 'absent' && global === 'present'
	return { project, global, shadow }
}

// ── top-level wire ──

export interface WireResult {
	settings: ComposeResult
	gitignore: { changed: boolean; skipped: boolean }
}

export interface WireOptions {
	globalSettingsFile?: string
	globalBase?: boolean
}

// Wire the reader into project settings and (only in a git repo) gitignore the status file. The
// single entry point init's SKILL.md calls on consent. `globalBase` (default true) controls whether
// a fresh wire composes the global statusLine command as the base; `globalSettingsFile` overrides
// the default global settings path (for tests, or a non-default HOME).
export function wireStatusline(root: string, mode: StatusLineMode, opts?: WireOptions): WireResult {
	const globalBase = opts?.globalBase ?? true
	const globalCommand = globalBase ? readStatusLineCommand(opts?.globalSettingsFile ?? GLOBAL_SETTINGS_FILE) : undefined
	const settings = composeStatusLine(root, mode, globalCommand)
	const gitignore = isGitRepo(root) ? { ...addGitignoreEntry(root), skipped: false } : { changed: false, skipped: true }
	return { settings, gitignore }
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

export function main(argv: string[]): number {
	const root = flag(argv, '--root') ?? '.'
	const globalSettingsFile = flag(argv, '--global-settings')
	const w = (s: string) => process.stdout.write(`${s}\n`)

	if (argv.includes('--detect')) {
		const result = detectStatusLines(root, globalSettingsFile)
		w(`project statusLine: ${result.project}`)
		w(`global statusLine: ${result.global}`)
		w(
			result.shadow
				? 'shadow risk: yes — wiring would shadow the global statusline; compose it as the base (default) or pass --no-global-base to shadow deliberately'
				: 'shadow risk: no',
		)
		return 0
	}

	if (argv.includes('--wire')) {
		const mode = flag(argv, '--mode')
		if (mode !== 'own-line' && mode !== 'same-line') {
			w('refused: --mode must be own-line or same-line')
			return 1
		}
		const globalBase = !argv.includes('--no-global-base')
		const result = wireStatusline(root, mode, { globalSettingsFile, globalBase })
		w(result.settings.changed ? `wired statusLine (${mode})` : 'statusLine already wired (unchanged)')
		if (result.settings.globalBaseComposed) w('composed the global statusLine command as the wrapped base')
		if (result.gitignore.skipped) w('not a git repo — gitignore skipped')
		else w(result.gitignore.changed ? `added ${STATUS_FILE} to .gitignore` : '.gitignore already up to date')
		return 0
	}

	w(
		'usage: wire-statusline --root <dir> --wire --mode own-line|same-line [--global-settings <file>] [--no-global-base]\n' +
			'       wire-statusline --root <dir> --detect [--global-settings <file>]',
	)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
