#!/usr/bin/env node
// manage-scenario-bridge — the concrete curation engine for `<project-path>/.agents/sdd/scenario-bridge.toml`,
// the one-time per-project wiring the verify-scenarios bridge and the impl-judge step-0 consumption
// both read. It reads/writes ONLY that one project's scenario-bridge.toml — never a spec.md, status,
// approval, or a freeze; it never runs the bridge or a test.
//
// Operations:
//   --list                                        print every configured [[source]] block in order
//   --scaffold --adapter <a> [--command <c>] --report-path <p>
//                                                  create the config with one source block; refused
//                                                  when the file already exists
//   --add --adapter <a> [--command <c>] --report-path <p>
//                                                  append a source block to an existing config;
//                                                  refused when the file does not exist
//
// Every read/write is resolved beneath --project-path (a colocated project's project-path is its own
// repo root, so the config lands at the familiar .agents/sdd/scenario-bridge.toml there).
//
// Reuses the verify-scenarios bridge's own SourceConfig/parseSourcesToml shape — never diverge the
// format the reader (verify-scenarios) and the writer (this engine) agree on.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No deps (the
// repo's node-≥23.6 convention).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseSourcesToml, type SourceConfig } from '../../verify-scenarios/scripts/verify-scenarios.mts'

export type { SourceConfig }

const CONFIG_REL_PATH = '.agents/sdd/scenario-bridge.toml'

export function configPath(projectPath: string): string {
	return join(projectPath, CONFIG_REL_PATH)
}

// ── list ──

// Every configured source in file order; a missing config lists nothing without error.
export function listSources(projectPath: string): SourceConfig[] {
	const file = configPath(projectPath)
	if (!existsSync(file)) return []
	try {
		return parseSourcesToml(readFileSync(file, 'utf8'))
	} catch {
		return []
	}
}

// ── render one [[source]] block ──

function renderBlock(source: { adapter: string; command?: string; reportPath: string }): string {
	const lines = [
		'[[source]]',
		`adapter    = "${source.adapter}"`,
		...(source.command !== undefined ? [`command    = "${source.command}"`] : []),
		`reportPath = "${source.reportPath}"`,
	]
	return lines.join('\n')
}

// ── scaffold / add ──

export interface NewSourceInput {
	adapter?: string
	command?: string
	reportPath?: string
}

export type MutateResult = { ok: true; message: string; sources: SourceConfig[] } | { ok: false; reason: string }

function validateInput(
	input: NewSourceInput,
): { ok: true; adapter: string; command?: string; reportPath: string } | { ok: false; reason: string } {
	if (!input.adapter || !input.reportPath) {
		return { ok: false, reason: 'a source needs both adapter and reportPath' }
	}
	return { ok: true, adapter: input.adapter, command: input.command, reportPath: input.reportPath }
}

// Creates <project-path>/.agents/sdd/scenario-bridge.toml with one [[source]] block. Refuses when the
// file already exists (use `add` instead) or when adapter/reportPath is missing — no source block is
// written in the refused case.
export function scaffoldSource(projectPath: string, input: NewSourceInput): MutateResult {
	const valid = validateInput(input)
	if (!valid.ok) return valid
	const file = configPath(projectPath)
	if (existsSync(file)) {
		return { ok: false, reason: 'scenario-bridge.toml already exists; use add to append a source' }
	}
	mkdirSync(dirname(file), { recursive: true })
	writeFileSync(file, `${renderBlock(valid)}\n`)
	const sources = listSources(projectPath)
	return { ok: true, message: `scaffolded ${file}`, sources }
}

// Appends a [[source]] block to an existing config, leaving the existing sources untouched. Refuses
// when the config does not exist yet (names scaffold as the entry point) or when adapter/reportPath
// is missing.
export function addSource(projectPath: string, input: NewSourceInput): MutateResult {
	const valid = validateInput(input)
	if (!valid.ok) return valid
	const file = configPath(projectPath)
	if (!existsSync(file)) {
		return { ok: false, reason: 'scenario-bridge.toml does not exist yet; use scaffold to create it first' }
	}
	const existing = readFileSync(file, 'utf8')
	const sep = existing.endsWith('\n') ? '' : '\n'
	writeFileSync(file, `${existing}${sep}\n${renderBlock(valid)}\n`)
	const sources = listSources(projectPath)
	return { ok: true, message: `added a source to ${file}`, sources }
}

// ── CLI ──

function flag(argv: string[], name: string): string | undefined {
	const i = argv.indexOf(name)
	return i === -1 ? undefined : argv[i + 1]
}

function inputFromArgv(argv: string[]): NewSourceInput {
	return {
		adapter: flag(argv, '--adapter'),
		command: flag(argv, '--command'),
		reportPath: flag(argv, '--report-path'),
	}
}

export function main(argv: string[]): number {
	const projectPath = flag(argv, '--project-path') ?? '.'
	const w = (s: string) => process.stdout.write(`${s}\n`)

	if (argv.includes('--list')) {
		for (const s of listSources(projectPath)) {
			w(`${s.adapter}${s.command ? ` (${s.command})` : ''} -> ${s.reportPath}`)
		}
		return 0
	}
	if (argv.includes('--scaffold')) {
		const r = scaffoldSource(projectPath, inputFromArgv(argv))
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}
	if (argv.includes('--add')) {
		const r = addSource(projectPath, inputFromArgv(argv))
		w(r.ok ? r.message : `refused: ${r.reason}`)
		return r.ok ? 0 : 1
	}

	w(
		'usage: manage-scenario-bridge --project-path <dir> --list | --scaffold --adapter <a> [--command <c>] --report-path <p> | --add --adapter <a> [--command <c>] --report-path <p>',
	)
	return 0
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
