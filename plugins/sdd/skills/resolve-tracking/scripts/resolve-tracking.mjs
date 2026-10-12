// Launcher for the engine of the same name. Run it as `node <skill>/scripts/<engine>.mjs`.
// A checkout runs the .mts source. An npm install keeps the skill under node_modules, where Node
// will not strip types, so it runs the self-contained bundle built for the package.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const self = fileURLToPath(import.meta.url)
const installed = /[\\/]node_modules[\\/]/.test(self)
const target = self.replace(/\.mjs$/, installed ? '.bundle.mjs' : '.mts')
const run = spawnSync(process.execPath, [...process.execArgv, target, ...process.argv.slice(2)], { stdio: 'inherit' })
if (run.error) throw run.error
process.exitCode = run.status ?? 1
