import { existsSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

function inside(root, target) {
	const path = relative(root, target)
	return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function packageEngine(source) {
	const normalized = source.split(sep).join('/').toLowerCase()
	return normalized.split('/').includes('node_modules')
}

async function main() {
	const skillsRoot = dirname(fileURLToPath(import.meta.url))
	const argv = process.argv.slice(2)
	const callExport = argv[0] === '--export'
	const exportName = callExport ? argv[1] : null
	const enginePath = callExport ? argv[2] : argv[0]
	const args = argv.slice(callExport ? 3 : 1)
	if (!enginePath?.endsWith('.mts')) {
		throw new Error('usage: node <sdd-skills>/run-engine.mjs [--export <name>] <skill>/scripts/<engine>.mts [args...]')
	}

	const source = resolve(enginePath)
	const realSkillsRoot = realpathSync(skillsRoot)
	if (!inside(realSkillsRoot, realpathSync(source))) throw new Error(`Engine path must be inside ${realSkillsRoot}`)
	const runtime = packageEngine(source) ? source.slice(0, -4) + '.js' : source
	if (!existsSync(runtime)) {
		throw new Error(
			`Runnable engine not found: ${runtime}. Rebuild and repack cyber-sdd to include compiled skill engines.`,
		)
	}
	const target = realpathSync(runtime)
	if (!inside(realSkillsRoot, target)) throw new Error('Resolved engine path escapes the SDD skills directory')

	if (callExport) {
		const module = await import(pathToFileURL(target).href)
		if (typeof module[exportName] !== 'function') throw new Error(`Engine does not export ${exportName}`)
		const result = await module[exportName](...args)
		if (result != null) {
			const output = typeof result[Symbol.iterator] === 'function' ? [...result].join('\n') : String(result)
			process.stdout.write(`${output}\n`)
		}
		return
	}

	process.argv = [process.argv[0], target, ...args]
	await import(pathToFileURL(target).href)
}

await main()
