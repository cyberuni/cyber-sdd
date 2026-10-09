// governance-copies — a plugin-wide guard that every governance copy a shipped ACED skill carries at
// `<skill>/references/governances/<name>.md` matches its owner at `plugins/aced/governances/<name>.md`.
// The skill reads its own copy (skill-design § Governance lookup order, step 3), so a copy left behind
// when the owner changes silently serves stale rules. Fix a failure by re-copying the owner file.

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const PLUGIN_ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const SKILLS_ROOT = join(PLUGIN_ROOT, 'skills')
const OWNER_ROOT = join(PLUGIN_ROOT, 'governances')

/** Every `<skill>/references/governances/<name>.md` copy under the ACED skills tree. */
function governanceCopies(): { skill: string; name: string; path: string }[] {
	const found: { skill: string; name: string; path: string }[] = []
	for (const skill of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
		if (!skill.isDirectory()) continue
		const dir = join(SKILLS_ROOT, skill.name, 'references', 'governances')
		if (!existsSync(dir)) continue
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isFile() && e.name.endsWith('.md')) found.push({ skill: skill.name, name: e.name, path: join(dir, e.name) })
		}
	}
	return found
}

test('the scan finds the copies define-skill and improve-skill carry', () => {
	const skills = new Set(governanceCopies().map((c) => c.skill))
	assert.ok(skills.has('define-skill'), 'expected define-skill to carry governance copies')
	assert.ok(skills.has('improve-skill'), 'expected improve-skill to carry governance copies')
})

for (const copy of governanceCopies()) {
	test(`${copy.skill}/references/governances/${copy.name} matches its owner`, () => {
		const owner = join(OWNER_ROOT, copy.name)
		assert.ok(existsSync(owner), `no owner governance at governances/${copy.name}`)
		assert.equal(readFileSync(copy.path, 'utf8'), readFileSync(owner, 'utf8'), `re-copy governances/${copy.name}`)
	})
}
