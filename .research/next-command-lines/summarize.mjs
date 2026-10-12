import { readFileSync } from 'node:fs'
const rows = readFileSync(process.argv[2] ?? 'results.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))) }
for (const v of [...new Set(rows.map((r) => r.variant))]) {
  const r = rows.filter((x) => x.variant === v && x.turns != null)
  const t = r.map((x) => x.turns), c = r.map((x) => x.calls)
  console.log(v.padEnd(10), 'n', r.length, 'turns', mean(t).toFixed(2), '±', (sd(t) / Math.sqrt(r.length)).toFixed(2),
    'calls', mean(c).toFixed(2), 'wrong(exit≠0)', r.reduce((s, x) => s + x.wrong, 0), 'runs-with-wrong', r.filter((x) => x.wrong).length,
    'help-calls', r.reduce((s, x) => s + x.help, 0), 'extra-calls(>2)', r.filter((x) => x.calls > 2).length, 'correct', r.filter((x) => x.correct).length, 'cost', mean(r.map((x) => x.cost)).toFixed(3))
}
