// reference-defaults — a plugin-wide guard that every default copy a shipped ACED skill carries at
// `<skill>/references/<name>.default.md` matches the reference ACED ships at
// `plugins/aced/references/<name>.md`. The `reference` skill reads a skill's default when its command
// cannot run, so a copy left behind when the owner changes silently serves stale rules. The owner adds
// only `extends: [default]` to its frontmatter; everything else must be equal. Fix a failure by
// re-copying the owner file without that line.

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const PLUGIN_ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const SKILLS_ROOT = join(PLUGIN_ROOT, 'skills')
const OWNER_ROOT = join(PLUGIN_ROOT, 'references')
const EXTENDS_DEFAULT = 'extends: [default]\n'

/** Every `<skill>/references/<name>.default.md` copy under the ACED skills tree. */
function defaultCopies(): { skill: string; name: string; path: string }[] {
	const found: { skill: string; name: string; path: string }[] = []
	for (const skill of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
		if (!skill.isDirectory()) continue
		const dir = join(SKILLS_ROOT, skill.name, 'references')
		if (!existsSync(dir)) continue
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			if (e.isFile() && e.name.endsWith('.default.md')) {
				found.push({ skill: skill.name, name: e.name.slice(0, -'.default.md'.length), path: join(dir, e.name) })
			}
		}
	}
	return found
}

test('the scan finds the copies define-skill and improve-skill carry', () => {
	const skills = new Set(defaultCopies().map((c) => c.skill))
	assert.ok(skills.has('define-skill'), 'expected define-skill to carry default copies')
	assert.ok(skills.has('improve-skill'), 'expected improve-skill to carry default copies')
})

test('no ACED skill or the plugin ships a governances/ folder', () => {
	assert.ok(!existsSync(join(PLUGIN_ROOT, 'governances')), 'plugins/aced/governances/ must not exist')
	for (const skill of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
		if (!skill.isDirectory()) continue
		const dir = join(SKILLS_ROOT, skill.name, 'references', 'governances')
		assert.ok(!existsSync(dir), `${skill.name}/references/governances/ must not exist`)
	}
})

for (const copy of defaultCopies()) {
	test(`${copy.skill}/references/${copy.name}.default.md matches its owner`, () => {
		const owner = join(OWNER_ROOT, `${copy.name}.md`)
		assert.ok(existsSync(owner), `no owner reference at references/${copy.name}.md`)
		const ownerText = readFileSync(owner, 'utf8')
		assert.ok(ownerText.includes(EXTENDS_DEFAULT), `references/${copy.name}.md must declare extends: [default]`)
		assert.equal(
			readFileSync(copy.path, 'utf8'),
			ownerText.replace(EXTENDS_DEFAULT, ''),
			`re-copy references/${copy.name}.md`,
		)
	})
}
