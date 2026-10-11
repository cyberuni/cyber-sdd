// Fixture script. The variant placeholder is replaced at build time (see build.mjs); one file per variant.
import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const VARIANT = '__VARIANT__' // prose | toon-help | toon-next | toon-none
const SELF = fileURLToPath(import.meta.url)

const TASKS = [
  { id: 't_201', owner: 'ana', title: 'Update billing copy', project: 'billing', status: 'open' },
  { id: 't_204', owner: 'ana', title: 'Invoice export fix', project: 'export', status: 'open' },
  { id: 't_207', owner: 'ana', title: 'Retire old webhook', project: 'legacy', status: 'done' },
  { id: 't_311', owner: 'ben', title: 'Rotate API keys', project: 'infra', status: 'open' },
  { id: 't_312', owner: 'ben', title: 'Invoice export tests', project: 'export', status: 'open' },
]
const THREADS = {
  t_201: [{ by: 'ben', at: '2026-09-30', text: 'Copy approved by legal.' }],
  t_204: [
    { by: 'ana', at: '2026-10-01', text: 'CSV export drops the VAT column.' },
    { by: 'cho', at: '2026-10-02', text: 'Reproduced; caused by the locale formatter.' },
    { by: 'ben', at: '2026-10-04', text: 'Fix merged, shipping Friday.' },
  ],
  t_207: [{ by: 'ana', at: '2026-09-12', text: 'Webhook removed.' }],
  t_311: [],
  t_312: [{ by: 'cho', at: '2026-10-03', text: 'Waiting on the export fix.' }],
}

const cell = (v) => (/[,:"\n]/.test(String(v)) ? JSON.stringify(String(v)) : String(v))
const table = (key, rows, fields) =>
  `${key}[${rows.length}]{${fields.join(',')}}:\n` + rows.map((r) => '  ' + fields.map((f) => cell(r[f])).join(',')).join('\n')

function log(argv, code) {
  if (process.env.TASKS_LOG) appendFileSync(process.env.TASKS_LOG, JSON.stringify({ argv, code }) + '\n')
}
function fail(argv, msg) {
  log(argv, 2)
  console.error(`error: ${msg}`)
  process.exit(2)
}

function parse(argv, allowed) {
  const opts = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) fail(argv, `unexpected argument '${a}'`)
    const name = a.slice(2)
    if (!allowed.includes(name)) fail(argv, `unknown option '${a}'`)
    opts[name] = argv[++i]
    if (opts[name] === undefined) fail(argv, `option '${a}' needs a value`)
  }
  return opts
}

const runLine = (cmd, args) => `node ${SELF} ${cmd} ${Object.entries(args).map(([k, v]) => `--${k} ${v}`).join(' ')}`

function render(body, rows, hint) {
  // hint: { generic: string, perRow: (row) => ({ run, why }) }
  if (VARIANT === 'prose') {
    return body.prose + '\n' + hint.generic
  }
  const out = [body.toon]
  if (VARIANT === 'toon-help') out.push(`help[1]: ${hint.generic}`)
  if (VARIANT === 'toon-next') {
    const refs = rows.map(hint.perRow)
    out.push(`next[${refs.length}]{run,why}:\n` + refs.map((r) => `  ${cell(r.run)},${cell(r.why)}`).join('\n'))
  }
  return out.join('\n')
}
const noHint = (s) => s
const maybe = (text) => (VARIANT === 'toon-none' ? '' : text)

const [cmd, ...rest] = process.argv.slice(2)
const argv = process.argv.slice(2)

if (cmd === '--help' || cmd === 'help' || cmd === undefined) {
  log(argv, 0)
  console.log('usage: tasks.mjs <command> [options]\ncommands:\n  list --owner <name>\n  thread --project <project> --task <id>')
  process.exit(0)
}
if (cmd === 'list') {
  const o = parse(rest, ['owner'])
  if (!o.owner) fail(argv, "required option '--owner' not specified")
  const rows = TASKS.filter((t) => t.owner === o.owner.toLowerCase())
  log(argv, 0)
  const body = {
    prose: `${o.owner.toLowerCase()} has ${rows.length} tasks: ` + rows.map((t) => `${t.id} "${t.title}" [${t.project}] (${t.status})`).join('; ') + '.',
    toon: table('tasks', rows, ['id', 'title', 'project', 'status']),
  }
  if (VARIANT === 'toon-none') console.log(body.toon)
  else
    console.log(
      render(body, rows, {
        generic: 'To read the discussion on a task, run its thread command with the project and id of the task: `tasks.mjs thread --project <project> --task <id>`.',
        perRow: (t) => ({ run: runLine('thread', { project: t.project, task: t.id }), why: `read the discussion on "${t.title}"` }),
      }),
    )
} else if (cmd === 'thread') {
  const o = parse(rest, ['task', 'project'])
  if (!o.project) fail(argv, "required option '--project' not specified")
  if (!o.task) fail(argv, "required option '--task' not specified")
  const th = THREADS[o.task]
  if (!th || TASKS.find((x) => x.id === o.task).project !== o.project) fail(argv, `no such task '${o.task}'`)
  log(argv, 0)
  const t = TASKS.find((x) => x.id === o.task)
  if (VARIANT === 'prose') console.log(`${t.title} (${t.id}): ` + (th.map((c) => `${c.by} on ${c.at}: "${c.text}"`).join(' ') || 'no comments.'))
  else console.log(table('comments', th, ['by', 'at', 'text']))
} else {
  fail(argv, `unknown command '${cmd}'`)
}
