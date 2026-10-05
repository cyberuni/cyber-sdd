// The published `aced-bench` bin, as a consumer gets it: pack the package, unpack it into a
// node_modules outside the repo, and run the bin from there. Node will not strip types under
// node_modules, so this is the check that the tarball carries a runnable engine.
//
// Needs the built dist; `pnpm test` builds first.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
const root = mkdtempSync(join(tmpdir(), 'aced-bench-bin-'))
after(() => rmSync(root, { recursive: true, force: true }))

test('the packed aced-bench bin runs from a node_modules install', () => {
	assert.ok(existsSync(join(PKG, pkg.bin['aced-bench'])), 'dist is missing: run `pnpm build` first')

	execFileSync('npm', ['pack', '--pack-destination', root], { cwd: PKG, stdio: 'ignore' })
	const tarball = readdirSync(root).find((f) => f.endsWith('.tgz'))
	assert.ok(tarball, 'npm pack wrote no tarball')
	const installed = join(root, 'node_modules', pkg.name)
	mkdirSync(installed, { recursive: true })
	execFileSync('tar', ['-xzf', join(root, tarball), '-C', installed, '--strip-components=1'])

	// Runtime dependencies come from the workspace install, not the registry, so the check runs offline.
	for (const dep of Object.keys(pkg.dependencies ?? {})) {
		const link = join(root, 'node_modules', dep)
		mkdirSync(dirname(link), { recursive: true })
		symlinkSync(join(PKG, 'node_modules', dep), link, 'dir')
	}

	const r = spawnSync(process.execPath, [join(installed, pkg.bin['aced-bench']), '--help'], {
		cwd: root,
		encoding: 'utf8',
	})
	assert.equal(r.status, 0, r.stderr)
	assert.match(r.stdout, /aced-bench plan/)
})
