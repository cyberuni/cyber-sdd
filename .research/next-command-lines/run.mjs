// Usage: node run.mjs <runsPerVariant> [model] [concurrency]
// Runs each variant N times with real `claude -p`, scoring wrong calls (nonzero script exits) and turns.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, VARIANTS } from './build.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const N = Number(process.argv[2] ?? 5)
const model = process.argv[3] ?? 'haiku'
const conc = Number(process.argv[4] ?? 4)
const prompt = readFileSync(join(here, 'prompt.txt'), 'utf8').trim()
const out = join(here, 'results.jsonl')
const root = mkdtempSync(join(tmpdir(), 'nextlines-'))

const jobs = []
for (let i = 0; i < N; i++) for (const v of VARIANTS) jobs.push({ v, i })
// interleave so a drifting model affects variants equally

function one({ v, i }) {
  return new Promise((resolve) => {
    const dir = build(join(root, `${v}-${i}`), v)
    const log = join(dir, 'calls.jsonl')
    const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--allowedTools', 'Bash,Skill,Read',
      '--setting-sources', 'project', '--permission-mode', 'acceptEdits', '--no-session-persistence']
    const p = spawn('claude', args, { cwd: dir, env: { ...process.env, TASKS_LOG: log } })
    let so = ''
    p.stdout.on('data', (d) => (so += d))
    p.on('close', () => {
      let r = {}
      try { r = JSON.parse(so) } catch {}
      const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
      const row = {
        variant: v, run: i, turns: r.num_turns, cost: r.total_cost_usd, calls: calls.length,
        wrong: calls.filter((c) => c.code !== 0).length, help: calls.filter((c) => c.argv[0] === '--help' || c.argv[0] === 'help').length,
        correct: /\bben\b/i.test(r.result ?? '') && /merged|friday/i.test(r.result ?? ''),
        argvs: calls.map((c) => c.argv.join(' ') + (c.code ? ` [exit ${c.code}]` : '')), result: r.result,
      }
      appendFileSync(out, JSON.stringify(row) + '\n')
      console.log(v, i, row.turns, row.wrong, row.correct)
      resolve()
    })
  })
}
const q = [...jobs]
await Promise.all(Array.from({ length: conc }, async () => { while (q.length) await one(q.shift()) }))
