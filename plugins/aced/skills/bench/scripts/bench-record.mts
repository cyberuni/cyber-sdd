// bench-record — the shapes and locations the measured layer reads and writes.
//
// A run record is schema version 3 — the first version this engine writes and the ONLY one it
// reads. A record another tool wrote is converted by that tool; there is no reader here for any
// other shape, so a consumer never silently misreads a record of another version.

import { join } from 'node:path'

export const SCHEMA_VERSION = 3

/** `^[a-z0-9]+(?:[-.][a-z0-9]+)*$` — lowercase segments joined by single `-` or `.`. */
export const SUITE_NAME_RULE = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/

export const BENCH_ROOT = join('.agents', 'aced', 'bench')
export const RESULTS_ROOT = join('.agents', 'aced', 'results', 'bench')

export function suiteDir(suite: string): string {
	return join(BENCH_ROOT, suite)
}

export function resultsDir(suite: string): string {
	return join(RESULTS_ROOT, suite)
}

/** An ISO timestamp safe in a file name: `:` and `.` become `-`. */
export function stamp(createdAt: string): string {
	return createdAt.replace(/[:.]/g, '-')
}

/** The compared metrics. `pass` is 0/1 and has no pooled row. */
export const METRICS = [
	'pass',
	'inputTokens',
	'outputTokens',
	'cacheReadTokens',
	'turns',
	'toolCalls',
	'wallMs',
	'costUsd',
] as const
export type Metric = (typeof METRICS)[number]

/** Metrics that can make a verdict `regressed`. Cost and cache reads are compared but never gate. */
export const GATED: ReadonlySet<Metric> = new Set([
	'pass',
	'turns',
	'toolCalls',
	'inputTokens',
	'outputTokens',
	'wallMs',
])

export type Subject =
	| { kind: 'git-ref'; ref: string; commit: string }
	| { kind: 'package'; name: string; version: string }
	| { kind: 'file'; path: string; from: string }

export interface RunResult {
	task: string
	run: number
	pass: boolean
	wallMs: number
	inputTokens: number
	outputTokens: number
	cacheReadTokens: number
	cacheCreationTokens: number
	turns: number
	toolCalls: number
	costUsd: number
	/** Stopped without a success result: budget cap, error result, timeout, or the harness dying. */
	capped: boolean
	/** Set only when setup failed before the agent ran. */
	error: string | null
	/** The gzipped transcript, repo-relative. Absent from `baseline.json`. */
	transcript?: string | null
}

export interface EvaluatedEntry {
	path: string
	sha256: string
	kind: 'file'
}

export interface Summary {
	runs: number
	passes: number
	passRate: number
	capped: number
	errors: number
	medianInputTokens: number
	medianOutputTokens: number
	medianCacheReadTokens: number
	medianTurns: number
	medianToolCalls: number
	medianWallMs: number
	totalCostUsd: number
	/** Total cost over passes; absent when nothing passed. */
	costPerSuccessUsd?: number
}

export interface RunRecord {
	schemaVersion: typeof SCHEMA_VERSION
	layer: 'measured'
	suite: string
	arm: string
	subject: Subject
	harness: string
	adapter: string
	runner: string
	taskSetCommit: string
	taskSetHash: string
	tasks: string[]
	/** Each measured task's `tags` from tasks.json, by task id. */
	tags: Record<string, Record<string, string>>
	model: string
	scoring_model: string
	createdAt: string
	evaluated: EvaluatedEntry[]
	runs: RunResult[]
	summary: { overall: Summary; tasks: Array<Summary & { task: string }> }
}

export function median(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

export function round(n: number, places = 4): number {
	const f = 10 ** places
	return Math.round(n * f) / f
}
