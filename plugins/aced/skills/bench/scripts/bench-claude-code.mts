// bench-claude-code — the Claude Code adapter: launch headless, parse the transcript into counts.
//
// The launch facts (the command, the one-shot flag, how the model, permission mode, and output
// format are passed, and which flag stops session persistence) come from @cyberuni/agent-harness's
// headless fact. The spec adds what a measured run must carry beyond those facts: the budget cap,
// project-only settings and a strict MCP config (the checkout's own, never the operator's), and,
// for a package arm, the plugin directory. Those are added here.
//
// `print` is the only runner: headless `-p` with stream-json output. A run is `capped` whenever it
// stops without a success result — the budget cap, an error result, the timeout, or the process
// dying on a signal. A spawn failure (the command is gone) is not a run outcome: it throws.

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { headlessCommand, headlessInvocation } from '@cyberuni/agent-harness'

export interface LaunchOptions {
	prompt: string
	model: string
	maxBudgetUsd: number
	permissionMode: string
	checkout: string
	timeoutMs: number
	/** A package arm's unpacked plugin. */
	pluginDir?: string
	/** Extra environment, such as a package arm's isolated CLAUDE_CONFIG_DIR. */
	env?: Record<string, string>
}

export interface AgentOutcome {
	inputTokens: number
	outputTokens: number
	cacheReadTokens: number
	cacheCreationTokens: number
	turns: number
	toolCalls: number
	costUsd: number
	capped: boolean
	/** The model the transcript reports, when it reports one. */
	model?: string
	transcript: string
}

export interface Adapter {
	harness: string
	name: string
	runner: string
	executable: string
	launch(options: LaunchOptions): AgentOutcome
	/**
	 * A fresh harness config directory inside `runTemp`: the operator's credentials, none of their
	 * plugins or settings. Returns the environment that points the harness at it.
	 */
	isolatedConfig(runTemp: string): Record<string, string>
}

/** Reads `--output-format stream-json`: tool calls from assistant messages, the rest from `result`. */
export function parseStreamJson(text: string): Omit<AgentOutcome, 'transcript'> {
	const out: Omit<AgentOutcome, 'transcript'> = {
		inputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheCreationTokens: 0,
		turns: 0,
		toolCalls: 0,
		costUsd: 0,
		capped: true,
	}
	for (const line of text.split('\n')) {
		if (!line.startsWith('{')) continue
		let event: {
			type?: string
			subtype?: string
			model?: string
			is_error?: boolean
			num_turns?: number
			total_cost_usd?: number
			usage?: {
				input_tokens?: number
				output_tokens?: number
				cache_read_input_tokens?: number
				cache_creation_input_tokens?: number
			}
			message?: { model?: string; content?: Array<{ type?: string }> }
		}
		try {
			event = JSON.parse(line)
		} catch {
			continue
		}
		if (event.type === 'system' && typeof event.model === 'string' && event.model && out.model === undefined) {
			out.model = event.model
		} else if (event.type === 'assistant') {
			const content = Array.isArray(event.message?.content) ? event.message.content : []
			out.toolCalls += content.filter((c) => c?.type === 'tool_use').length
			if (out.model === undefined && typeof event.message?.model === 'string' && event.message.model)
				out.model = event.message.model
		} else if (event.type === 'result') {
			const u = event.usage ?? {}
			out.inputTokens = u.input_tokens ?? 0
			out.outputTokens = u.output_tokens ?? 0
			out.cacheReadTokens = u.cache_read_input_tokens ?? 0
			out.cacheCreationTokens = u.cache_creation_input_tokens ?? 0
			out.turns = event.num_turns ?? 0
			out.costUsd = event.total_cost_usd ?? 0
			out.capped = event.subtype !== 'success' || event.is_error === true
		}
	}
	return out
}

const HARNESS = 'claude-code'

function launchArgs(o: LaunchOptions): string[] {
	const facts = headlessInvocation(HARNESS)
	const cmd = headlessCommand(HARNESS, {
		prompt: o.prompt,
		model: o.model,
		permission: o.permissionMode,
		outputFormat: 'stream-json',
	})
	if (!cmd || facts.supported !== true)
		throw new Error('@cyberuni/agent-harness reports no headless mode for claude-code')
	const args = [...cmd.args]
	// The prompt is placed right after the facts' own (boolean-terminated) flags, so a variadic flag
	// added below can never swallow it.
	const disable = facts.transcript?.disable ?? []
	const extra = [
		'--max-budget-usd',
		String(o.maxBudgetUsd),
		...disable,
		...(disable.includes('--no-session-persistence') ? [] : ['--no-session-persistence']),
		'--setting-sources',
		'project',
		'--strict-mcp-config',
	]
	if (o.pluginDir) extra.push('--plugin-dir', o.pluginDir)
	if (existsSync(join(o.checkout, '.mcp.json'))) extra.push('--mcp-config', '.mcp.json')
	return [...args, ...extra]
}

export const claudeCode: Adapter = {
	harness: HARNESS,
	name: 'aced.claude-code',
	runner: 'print',
	executable: (() => {
		const facts = headlessInvocation(HARNESS)
		return facts.supported === true ? facts.executable : 'claude'
	})(),
	launch(o) {
		const r = spawnSync(this.executable, launchArgs(o), {
			cwd: o.checkout,
			encoding: 'utf8',
			timeout: o.timeoutMs,
			killSignal: 'SIGKILL',
			maxBuffer: 512 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, ...o.env },
		})
		const code = (r.error as NodeJS.ErrnoException | undefined)?.code
		if (r.error && code !== 'ETIMEDOUT' && code !== 'ENOBUFS')
			throw new Error(`could not launch ${this.executable}: ${r.error.message}`)
		const transcript = r.stdout ?? ''
		const parsed = parseStreamJson(transcript)
		// Killed — by the timeout or any other signal — is a stop without a success result.
		if (r.error || r.signal) parsed.capped = true
		return { ...parsed, transcript }
	},
	isolatedConfig(runTemp) {
		const dir = join(runTemp, 'claude-config')
		mkdirSync(dir, { recursive: true })
		const operator = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
		const credentials = join(operator, '.credentials.json')
		if (existsSync(credentials)) copyFileSync(credentials, join(dir, '.credentials.json'))
		return { CLAUDE_CONFIG_DIR: dir }
	},
}

const ADAPTERS: Record<string, Adapter> = { [HARNESS]: claudeCode }

export function adapterFor(harness: string): Adapter | undefined {
	return Object.hasOwn(ADAPTERS, harness) ? ADAPTERS[harness] : undefined
}

export const ADAPTER_HARNESSES = Object.keys(ADAPTERS)
