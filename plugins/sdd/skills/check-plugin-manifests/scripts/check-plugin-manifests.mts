#!/usr/bin/env node
// check-plugin-manifests — a plugin manifest must declare only components the package ships.
//
// A manifest pointer naming something the package does not carry is valid JSON, satisfies the
// schema, and is copied into every generated vendor manifest. It fails only on an installer's
// machine, after publish, as a component the host runtime cannot load. Nothing else in the repo
// compares a manifest's pointers against what ships, so this engine does.
//
// Two sub-checks, neither subsuming the other (spec: .agents/specs/sdd/plugin/check-plugin-manifests/):
//   disk    — does the pointer resolve to a path that exists?
//   publish — for a package that publishes, is the pointer inside its `files` allowlist?
// A directory can exist and be excluded from the tarball; a `files` entry can name a directory
// nobody created. The disk check short-circuits: a pointer dead on disk is reported once, as
// unresolved, and is not also asked about `files`.
//
// A pointer is any `./`-prefixed string value, at any depth, under any key — NOT a fixed key list.
// The manifest format grows new component keys, and a guard hardcoding today's set fails open on
// the next one added.
//
// Pure functions are exported for node:test; running the file directly drives the CLI. No
// dependencies (the repo's node-≥23.6 / no-deps convention).

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Directories that hold a manifest one level below the plugin root.
 *
 * This is a path-shape list, not a provenance one: `.plugin/` holds the **canonical** manifest and
 * the other two hold its generated vendor copies, but all three sit one level down, so a pointer
 * inside any of them resolves against the parent. Naming it for vendors would contradict the
 * spec's own vocabulary and has already misled one reader.
 */
const MANIFEST_DIRS = ['.plugin', '.claude-plugin', '.codex-plugin']
const MANIFEST_NAME = 'plugin.json'
const SKIP_DIRS = new Set(['node_modules', '.git'])

export type FindingKind = 'unreadable' | 'unresolved' | 'unpublished'

export interface Finding {
	kind: FindingKind
	/** Repo-relative path of the manifest carrying the defect. */
	manifest: string
	/** The manifest key the pointer sits under. Absent for an unreadable manifest. */
	key?: string
	/** The pointer value. Absent for an unreadable manifest. */
	pointer?: string
	detail: string
}

// ── Discovery ──

/**
 * Every manifest at a conventional location under `root`, repo-relative and path-sorted.
 *
 * A manifest is a `plugin.json` either inside a vendor directory, or sitting beside a
 * `package.json` (a package-root manifest). Sorted so a sweep's report order is deterministic.
 * A symlink is included: it resolves to a real manifest, and a broken one must surface as
 * unreadable rather than vanish from the sweep.
 */
/** Directory entries, or none where the directory cannot be read. */
function safeReaddir(dir: string) {
	try {
		return readdirSync(dir, { withFileTypes: true })
	} catch {
		return []
	}
}

export function discoverManifests(root: string): string[] {
	const found: string[] = []
	const walk = (dir: string): void => {
		for (const e of safeReaddir(dir)) {
			const full = join(dir, e.name)
			if (e.isDirectory()) {
				if (!SKIP_DIRS.has(e.name)) walk(full)
				continue
			}
			if (e.name !== MANIFEST_NAME) continue
			const parent = dirname(full)
			const inVendorDir = MANIFEST_DIRS.includes(parent.split(sep).pop() ?? '')
			if (inVendorDir || existsSync(join(parent, 'package.json'))) found.push(full)
		}
	}
	walk(root)
	return found.map((f) => relative(root, f).split(sep).join('/')).sort()
}

/**
 * The plugin root a manifest's pointers resolve against — NOT the manifest's own directory.
 *
 * A vendor manifest sits one level down, and its `./skills` still names the plugin's skills
 * directory. A guard resolving relative to the file it just read reports every vendor manifest as
 * entirely broken.
 */
export function pluginRootOf(manifestRelPath: string): string {
	const parts = manifestRelPath.split('/')
	const parentName = parts[parts.length - 2]
	const drop = parentName !== undefined && MANIFEST_DIRS.includes(parentName) ? 2 : 1
	return parts.slice(0, parts.length - drop).join('/')
}

// ── Pointer extraction ──

/** Every `./`-prefixed string value in the manifest, paired with the key it sits under. */
export function extractPointers(manifest: unknown): Array<{ key: string; pointer: string }> {
	const out: Array<{ key: string; pointer: string }> = []
	const visit = (value: unknown, key: string): void => {
		if (typeof value === 'string') {
			if (value.startsWith('./')) out.push({ key, pointer: value })
			return
		}
		if (Array.isArray(value)) {
			for (const item of value) visit(item, key)
			return
		}
		if (value !== null && typeof value === 'object') {
			for (const [k, v] of Object.entries(value)) visit(v, k)
		}
	}
	visit(manifest, '')
	return out
}

// ── The publish sub-check ──

export interface OwningPackage {
	path: string
	publishes: boolean
	files: string[]
}

/**
 * The nearest `package.json` at or above the plugin root, and whether it publishes.
 *
 * A package publishes when it is not `private` AND declares a `files` allowlist. A `private`
 * package ships no tarball, so its `files` constrains nothing. A package declaring no `files` at
 * all ships everything, so there is no allowlist to be outside of — npm's own semantic, and
 * inverting it manufactures a finding against every pointer in the package.
 */
export function owningPackage(root: string, pluginRoot: string): OwningPackage | null {
	let dir = pluginRoot
	for (;;) {
		const candidate = dir === '' ? 'package.json' : `${dir}/package.json`
		const abs = join(root, candidate)
		if (existsSync(abs)) {
			try {
				const pkg = JSON.parse(readFileSync(abs, 'utf8')) as { private?: unknown; files?: unknown }
				const files = Array.isArray(pkg.files) ? pkg.files.filter((f): f is string => typeof f === 'string') : null
				return { path: candidate, publishes: pkg.private !== true && files !== null, files: files ?? [] }
			} catch {
				return { path: candidate, publishes: false, files: [] }
			}
		}
		if (dir === '') return null
		const up = dir.split('/').slice(0, -1).join('/')
		dir = up
	}
}

/**
 * Whether a `files` allowlist covers a pointer, compared on the leading path segment.
 *
 * Both sides are normalized past a leading `./`, because an allowlist may legitimately spell an
 * entry either way and a pointer always carries the prefix — comparing them raw reports a shipped
 * component as unpublished.
 *
 * A `!`-prefixed entry is an exclusion and needs no special case: its leading `!` is part of its
 * first segment, so it can never equal a real segment and is never read as an inclusion.
 */
export function filesCovers(files: string[], pointer: string): boolean {
	const head = (path: string): string | undefined => path.replace(/^\.\//, '').split('/')[0]
	const segment = head(pointer)
	if (segment === undefined || segment === '') return true
	return files.some((entry) => {
		const h = head(entry)
		// A wildcard head ships everything below it, so it covers any segment.
		return h === '*' || h === '**' || h === segment
	})
}

// ── The sweep ──

export function sweep(root: string, manifests: string[]): Finding[] {
	const findings: Finding[] = []
	for (const rel of manifests) {
		let parsed: unknown
		try {
			parsed = JSON.parse(readFileSync(join(root, rel), 'utf8'))
		} catch {
			findings.push({ kind: 'unreadable', manifest: rel, detail: 'not readable as JSON' })
			continue
		}
		const pluginRoot = pluginRootOf(rel)
		const pkg = owningPackage(root, pluginRoot)
		for (const { key, pointer } of extractPointers(parsed)) {
			const target = join(root, pluginRoot, pointer)
			if (!existsSync(target)) {
				findings.push({ kind: 'unresolved', manifest: rel, key, pointer, detail: 'names no path on disk' })
				continue
			}
			if (pkg?.publishes && !filesCovers(pkg.files, pointer)) {
				findings.push({
					kind: 'unpublished',
					manifest: rel,
					key,
					pointer,
					detail: `declared but not published — ${pkg.path} files omits it`,
				})
			}
		}
	}
	return findings
}

// ── Report ──

export function formatReport(manifests: string[], findings: Finding[]): string {
	if (manifests.length === 0) return 'check-plugin-manifests: no plugin manifest found\n'
	if (findings.length === 0) {
		return `check-plugin-manifests: ${manifests.length} manifest(s) OK\n`
	}
	const rows = findings
		.map((f) => `  ${f.kind.padEnd(11)} ${f.manifest}${f.key ? ` [${f.key}] ${f.pointer}` : ''} — ${f.detail}`)
		.join('\n')
	return `${rows}\ncheck-plugin-manifests: ${findings.length} finding(s) across ${manifests.length} manifest(s)\n`
}

// ── CLI ──

export function main(argv: string[]): number {
	let root = '.'
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--root') {
			const next = argv[++i]
			if (next === undefined) {
				process.stderr.write('check-plugin-manifests: --root needs a directory\n')
				return 1
			}
			root = next
			continue
		}
		process.stderr.write(`check-plugin-manifests: unrecognized flag ${a}\n`)
		return 1
	}
	const manifests = discoverManifests(root)
	const findings = sweep(root, manifests)
	process.stdout.write(formatReport(manifests, findings))
	return findings.length === 0 ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	process.exit(main(process.argv.slice(2)))
}
