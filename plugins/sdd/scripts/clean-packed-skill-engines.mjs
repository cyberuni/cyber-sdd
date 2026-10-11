import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = join(packageRoot, '.generated-skill-engines.json')
if (existsSync(manifest)) {
	const files = JSON.parse(readFileSync(manifest, 'utf8'))
	if (!Array.isArray(files) || files.some((file) => typeof file !== 'string'))
		throw new Error('Invalid generated-engine manifest')
	for (const file of files) {
		const target = resolve(packageRoot, file)
		const path = relative(packageRoot, target)
		if (!path.startsWith(`skills${sep}`) || !path.endsWith('.js'))
			throw new Error(`Unsafe generated-engine path: ${file}`)
		if (existsSync(target)) rmSync(target)
	}
	rmSync(manifest)
}
