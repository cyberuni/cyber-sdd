// Usage: node build.mjs <outDir>  -> <outDir>/<variant>/.claude/skills/task-lookup/...
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
export const VARIANTS = ['prose', 'toon-help', 'toon-next', 'toon-none']
export function build(outDir, variant) {
  const here = dirname(fileURLToPath(import.meta.url))
  const dest = join(outDir, variant, '.claude/skills/task-lookup')
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(join(dest, 'scripts'), { recursive: true })
  cpSync(join(here, 'fixture/task-lookup/SKILL.md'), join(dest, 'SKILL.md'))
  const tpl = readFileSync(join(here, 'fixture/task-lookup/scripts/tasks.template.mjs'), 'utf8')
  writeFileSync(join(dest, 'scripts/tasks.mjs'), tpl.replaceAll('__VARIANT__', variant))
  return join(outDir, variant)
}
