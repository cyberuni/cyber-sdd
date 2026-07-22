import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	buildLoadPlan,
	collectAnchorGovernances,
	type GovCandidate,
	loadArtifactTypeMap,
	main,
	matchBar,
	matchSquad,
	migrateEntry,
	parseArtifactTypeMap,
	parseGovernanceFrontmatter,
	parseRegistry,
	type Registry,
	resolveAgent,
	resolveArtifactTypeFromMap,
	resolveRole,
	type Squad,
	type SquadMatch,
	validateRegistry,
} from './resolve-governances.mts'

// ─── migrate-on-read ────────────────────────────────────────────────────────────

test('migrateEntry folds a legacy flat entry into one squad', () => {
	const e = migrateEntry({ name: 'x', domains: ['skill', 'command'], roles: {}, governances: {} })
	assert.equal(e.squads.length, 1)
	assert.deepEqual(e.squads[0]['artifact-types'], ['skill', 'command'])
})

test('migrateEntry renames plan-producer to solution-producer', () => {
	const e = migrateEntry({
		name: 'x',
		domains: ['skill'],
		roles: { 'plan-producer': null, 'spec-judge': 'x-judge' },
		governances: {},
	})
	assert.equal('plan-producer' in e.squads[0].roles, false)
	assert.equal('solution-producer' in e.squads[0].roles, true)
	assert.equal(e.squads[0].roles['spec-judge'], 'x-judge')
})

test('migrateEntry keeps an existing solution-producer over a legacy plan-producer', () => {
	const e = migrateEntry({
		name: 'x',
		domains: [],
		roles: { 'plan-producer': 'old', 'solution-producer': 'new' },
		governances: {},
	})
	assert.equal(e.squads[0].roles['solution-producer'], 'new')
})

test('migrateEntry expands flat governances to the Model-B keys', () => {
	const e = migrateEntry({
		name: 'x',
		domains: [],
		roles: {},
		governances: { oracle: 'd', builder: 'b', architect: null },
	})
	assert.deepEqual(e.squads[0].governances, {
		'oracle-spec': 'd',
		'builder-spec': 'b',
		'builder-impl': 'b',
		'architect-spec': null,
		'architect-impl': null,
	})
})

test('migrateEntry leaves an already-squads entry unchanged in shape', () => {
	const g = {
		'oracle-spec': null,
		'builder-spec': 'b',
		'builder-impl': null,
		'architect-spec': null,
		'architect-impl': null,
	}
	const e = migrateEntry({
		name: 'x',
		squads: [{ 'artifact-types': ['skill'], roles: {}, governances: { ...g } }],
	})
	assert.equal(e.squads.length, 1)
	assert.deepEqual(e.squads[0].governances, g)
})

test('migrateEntry migrates per-squad roles and governances on a squads entry', () => {
	const e = migrateEntry({
		name: 'x',
		squads: [{ 'artifact-types': ['skill'], roles: { 'plan-producer': null }, governances: { oracle: 'd' } }],
	})
	assert.equal('solution-producer' in e.squads[0].roles, true)
	assert.equal('oracle-spec' in e.squads[0].governances, true)
})

test('parseRegistry parses and migrates every entry', () => {
	const text = JSON.stringify({
		'sdd-plugins': [
			{ name: 'aced', domains: ['skill'], roles: { 'plan-producer': null }, governances: { oracle: null } },
		],
	})
	const r = parseRegistry(text)
	assert.equal('solution-producer' in r['sdd-plugins'][0].squads[0].roles, true)
	assert.equal('oracle-spec' in r['sdd-plugins'][0].squads[0].governances, true)
})

test('parseRegistry throws on malformed JSON', () => {
	assert.throws(() => parseRegistry('{ not json'), /not valid JSON/)
})

test('parseRegistry throws when sdd-plugins is missing', () => {
	assert.throws(() => parseRegistry('{}'), /no sdd-plugins/)
})

// ─── governance frontmatter ──────────────────────────────────────────────────────

test('parseGovernanceFrontmatter reads actor, gate, compose', () => {
	const text = [
		'---',
		'name: x',
		'metadata:',
		'  actor: oracle',
		'  gate: spec',
		'  compose: replace',
		'---',
		'# x',
	].join('\n')
	assert.deepEqual(parseGovernanceFrontmatter(text), {
		artifactType: null,
		actor: 'oracle',
		gate: 'spec',
		compose: 'replace',
	})
})

test('parseGovernanceFrontmatter defaults compose to union and reads artifact-type', () => {
	const text = ['---', 'metadata:', '  artifact-type: skill', '  actor: builder', '  gate: impl', '---'].join('\n')
	assert.deepEqual(parseGovernanceFrontmatter(text), {
		artifactType: 'skill',
		actor: 'builder',
		gate: 'impl',
		compose: 'union',
	})
})

test('parseGovernanceFrontmatter returns null without an actor/gate', () => {
	const text = ['---', 'name: x', 'metadata:', '  internal: true', '---'].join('\n')
	assert.equal(parseGovernanceFrontmatter(text), null)
})

// ─── squad matching ──────────────────────────────────────────────────────────────

const REG: Registry = {
	'sdd-plugins': [
		{
			name: 'aced',
			squads: [
				{ 'artifact-types': ['skill', 'command'], roles: { 'spec-judge': 'aced-spec-validator' }, governances: {} },
			],
		},
		{ name: 'quill', squads: [{ 'artifact-types': ['guide'], roles: {}, governances: {} }] },
	],
}

test('matchSquad returns the single matching squad', () => {
	const { match, ambiguous } = matchSquad(REG, 'skill')
	assert.equal(match?.plugin, 'aced')
	assert.deepEqual(match?.squad['artifact-types'], ['skill', 'command'])
	assert.equal(ambiguous.length, 0)
})

test('matchSquad returns no match for an unmatched artifact-type', () => {
	const { match, ambiguous } = matchSquad(REG, 'unknown')
	assert.equal(match, null)
	assert.equal(ambiguous.length, 0)
})

test('matchSquad returns no match for a null artifact-type', () => {
	assert.equal(matchSquad(REG, null).match, null)
})

test('matchSquad flags two plugins claiming the same artifact-type', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{ name: 'a', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
			{ name: 'b', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
		],
	}
	const { match, ambiguous } = matchSquad(reg, 'skill')
	assert.equal(match, null)
	assert.deepEqual(ambiguous, ['a', 'b'])
})

// ─── matchBar — tier-bucketed candidates, no compose, no collapse ───────────────

const squadMatch = (plugin: string, governances: Squad['governances'], roles: Squad['roles'] = {}): SquadMatch => ({
	plugin,
	squad: { 'artifact-types': ['skill'], roles, governances },
})

const gov = (over: Partial<GovCandidate>): GovCandidate => ({
	tier: 'project',
	path: '.agents/governances/d.md',
	artifactType: null,
	actor: 'oracle',
	gate: 'spec',
	compose: 'union',
	...over,
})

test('matchBar floors to the sdd default ref with empty project buckets', () => {
	const plan = matchBar(null, 'oracle', 'spec', { match: null, projectGovs: [] })
	assert.equal(plan.key, 'oracle-spec')
	assert.deepEqual(plan.candidates, {
		project: [],
		'project-root': [],
		plugin: null,
		sdd: 'sdd:oracle-spec-governance',
	})
})

test('matchBar buckets project + plugin + sdd without ordering or collapsing', () => {
	const projectGovs = [gov({ path: '.agents/governances/d.md' })]
	const match = squadMatch('aced', { 'oracle-spec': 'aced-oracle' })
	const plan = matchBar('skill', 'oracle', 'spec', { match, projectGovs })
	assert.deepEqual(plan.candidates.project, ['.agents/governances/d.md'])
	assert.equal(plan.candidates.plugin, 'aced:aced-oracle')
	assert.equal(plan.candidates.sdd, 'sdd:oracle-spec-governance')
})

test('matchBar — a project replace is RETURNED, never collapses plugin/sdd', () => {
	const projectGovs = [gov({ path: '.agents/governances/d.md', compose: 'replace' })]
	const match = squadMatch('aced', { 'oracle-spec': 'aced-oracle' })
	const plan = matchBar('skill', 'oracle', 'spec', { match, projectGovs })
	assert.deepEqual(plan.candidates.project, ['.agents/governances/d.md'])
	assert.equal(plan.candidates.plugin, 'aced:aced-oracle') // not truncated
	assert.equal(plan.candidates.sdd, 'sdd:oracle-spec-governance')
})

test('matchBar puts project-root and project matches in their own buckets', () => {
	const projectGovs = [
		gov({ tier: 'project', path: 'packages/foo/.agents/governances/inner.md', actor: 'builder' }),
		gov({ tier: 'project-root', path: '.agents/governances/outer.md', actor: 'builder' }),
	]
	const plan = matchBar('skill', 'builder', 'spec', { match: null, projectGovs })
	assert.deepEqual(plan.candidates.project, ['packages/foo/.agents/governances/inner.md'])
	assert.deepEqual(plan.candidates['project-root'], ['.agents/governances/outer.md'])
})

test('matchBar matches both a type-specific and a typeless project bar (agent composes)', () => {
	const projectGovs = [
		gov({ path: '.agents/governances/typeless.md', artifactType: null, actor: 'builder' }),
		gov({ path: '.agents/governances/typed.md', artifactType: 'skill', actor: 'builder' }),
	]
	const plan = matchBar('skill', 'builder', 'spec', { match: null, projectGovs })
	assert.deepEqual(
		new Set(plan.candidates.project),
		new Set(['.agents/governances/typed.md', '.agents/governances/typeless.md']),
	)
})

test('matchBar ignores a project bar for a different gate', () => {
	const projectGovs = [gov({ actor: 'builder', gate: 'impl' })]
	const plan = matchBar('skill', 'builder', 'spec', { match: null, projectGovs })
	assert.deepEqual(plan.candidates.project, [])
	assert.equal(plan.candidates.sdd, 'sdd:builder-spec-governance')
})

// ─── resolveAgent ────────────────────────────────────────────────────────────────

test('resolveAgent returns the SDD default agent when no squad matches', () => {
	assert.deepEqual(resolveAgent('spec-judge', null), { source: 'sdd', ref: 'sdd-spec-judge' })
	assert.deepEqual(resolveAgent('spec-producer', null), { source: 'sdd', ref: null })
})

test('resolveAgent uses a named plugin delegate', () => {
	const match = squadMatch('aced', {}, { 'spec-judge': 'aced-spec-validator' })
	assert.deepEqual(resolveAgent('spec-judge', match), { source: 'plugin', ref: 'aced-spec-validator' })
})

test('resolveAgent treats an explicit null role as the SDD default', () => {
	const match = squadMatch('aced', {}, { 'impl-judge': null })
	assert.deepEqual(resolveAgent('impl-judge', match), { source: 'sdd', ref: 'sdd-impl-judge' })
})

test('resolveAgent falls back to the <plugin>-<role> convention for a missing role key', () => {
	const match = squadMatch('quill', {}, {})
	assert.deepEqual(resolveAgent('impl-producer', match), { source: 'plugin', ref: 'quill-impl-producer' })
})

// ─── resolveRole — agent + resolved-actor bars only (no fixed-universal) ─────────

test('resolveRole gives the spec-judge its three -spec bars and no fixed key', () => {
	const plan = resolveRole('spec-judge', null, { match: null, projectGovs: [] })
	assert.ok(!('fixed' in plan), 'fixed-universal is no longer emitted by the resolver')
	assert.deepEqual(
		plan.bars.map((b) => b.key),
		['oracle-spec', 'builder-spec', 'architect-spec'],
	)
})

test('resolveRole gives the impl-judge the builder/architect impl bars', () => {
	const plan = resolveRole('impl-judge', null, { match: null, projectGovs: [] })
	assert.deepEqual(
		plan.bars.map((b) => b.key),
		['builder-impl', 'architect-impl'],
	)
})

// ─── buildLoadPlan ───────────────────────────────────────────────────────────────

test('buildLoadPlan resolves all five roles to SDD defaults for a typeless spec', () => {
	const plan = buildLoadPlan(null, REG, [])
	assert.equal(plan.status, 'complete')
	assert.equal(plan.plugin, null)
	assert.deepEqual(
		plan.roles.map((r) => r.role),
		['spec-producer', 'solution-producer', 'spec-judge', 'impl-producer', 'impl-judge'],
	)
})

test('buildLoadPlan binds the matched plugin', () => {
	const plan = buildLoadPlan('skill', REG, [])
	assert.equal(plan.plugin, 'aced')
	const judge = plan.roles.find((r) => r.role === 'spec-judge')
	assert.deepEqual(judge?.agent, { source: 'plugin', ref: 'aced-spec-validator' })
})

test('buildLoadPlan returns needs-input on an ambiguous artifact-type', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{ name: 'a', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
			{ name: 'b', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
		],
	}
	const plan = buildLoadPlan('skill', reg, [])
	assert.equal(plan.status, 'needs-input')
	assert.deepEqual(plan.ambiguous, ['a', 'b'])
	assert.equal(plan.roles.length, 0)
})

test('buildLoadPlan floors a present registry with no squad for the type to SDD defaults, not needs-input', () => {
	// A parsed, present registry whose squads claim none of the artifact-type
	// resolves the same as an absent lockfile — every role to its SDD default —
	// and is NOT the two-plugins ambiguity, so it never returns needs-input.
	const plan = buildLoadPlan('unknown', REG, [])
	assert.equal(plan.status, 'complete')
	assert.equal(plan.plugin, null)
	assert.deepEqual(plan.ambiguous, [])
	assert.ok(plan.roles.length > 0)
	assert.ok(
		plan.roles.every((r) => r.agent.source === 'sdd'),
		'every role floors to its SDD default',
	)
})

// ─── validateRegistry ───────────────────────────────────────────────────────────

test('validateRegistry passes a clean registry', () => {
	assert.deepEqual(validateRegistry(REG), [])
})

test('validateRegistry flags an unknown role key', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{ name: 'x', squads: [{ 'artifact-types': [], roles: { bogus: null } as Squad['roles'], governances: {} }] },
		],
	}
	assert.ok(validateRegistry(reg).some((m) => /unknown role key "bogus"/.test(m)))
})

test('validateRegistry flags an unknown governance key', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{
				name: 'x',
				squads: [{ 'artifact-types': [], roles: {}, governances: { oracle: null } as Squad['governances'] }],
			},
		],
	}
	assert.ok(validateRegistry(reg).some((m) => /unknown governance key "oracle"/.test(m)))
})

test('validateRegistry flags an artifact-type claimed by two plugins', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{ name: 'a', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
			{ name: 'b', squads: [{ 'artifact-types': ['skill'], roles: {}, governances: {} }] },
		],
	}
	assert.ok(validateRegistry(reg).some((m) => /claimed by 2 plugins/.test(m)))
})

test('validateRegistry flags an artifact-type appearing in two squads of one plugin', () => {
	const reg: Registry = {
		'sdd-plugins': [
			{
				name: 'x',
				squads: [
					{ 'artifact-types': ['skill'], roles: {}, governances: {} },
					{ 'artifact-types': ['skill'], roles: {}, governances: {} },
				],
			},
		],
	}
	assert.ok(validateRegistry(reg).some((m) => /appears in more than one squad/.test(m)))
})

// ─── collectAnchorGovernances + main ────────────────────────────────────────────

test('collectAnchorGovernances reads a passed anchor, tags its tier, skips non-bars', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		mkdirSync(join(root, '.agents', 'governances'), { recursive: true })
		writeFileSync(
			join(root, '.agents', 'governances', 'bar.md'),
			['---', 'metadata:', '  actor: oracle', '  gate: spec', '---', '# bar'].join('\n'),
		)
		writeFileSync(join(root, '.agents', 'governances', 'notes.md'), '# just notes, no frontmatter')
		const found = collectAnchorGovernances([{ tier: 'project', root }])
		assert.equal(found.length, 1)
		assert.equal(found[0].actor, 'oracle')
		assert.equal(found[0].tier, 'project')
		assert.equal(found[0].path, join(root, '.agents', 'governances', 'bar.md'))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('collectAnchorGovernances collects from multiple anchors, each tier-tagged', () => {
	const proj = mkdtempSync(join(tmpdir(), 'sdd-proj-'))
	const outer = mkdtempSync(join(tmpdir(), 'sdd-outer-'))
	try {
		const barFile = (actor: string) =>
			['---', 'metadata:', `  actor: ${actor}`, '  gate: spec', '---', '# bar'].join('\n')
		mkdirSync(join(proj, '.agents', 'governances'), { recursive: true })
		mkdirSync(join(outer, '.agents', 'governances'), { recursive: true })
		writeFileSync(join(proj, '.agents', 'governances', 'inner.md'), barFile('builder'))
		writeFileSync(join(outer, '.agents', 'governances', 'outer.md'), barFile('builder'))
		const found = collectAnchorGovernances([
			{ tier: 'project', root: proj },
			{ tier: 'project-root', root: outer },
		])
		assert.deepEqual(found.map((c) => c.tier).sort(), ['project', 'project-root'])
	} finally {
		rmSync(proj, { recursive: true, force: true })
		rmSync(outer, { recursive: true, force: true })
	}
})

test('collectAnchorGovernances skips an anchor with no .agents/governances', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		assert.deepEqual(collectAnchorGovernances([{ tier: 'project', root }]), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main validates the registry and returns 0 (no artifact-type)', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		mkdirSync(join(root, '.agents'), { recursive: true })
		writeFileSync(join(root, '.agents', 'universal-plugin.json'), JSON.stringify(REG))
		assert.equal(main(['--root', root]), 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main returns 1 on a malformed registry', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		mkdirSync(join(root, '.agents'), { recursive: true })
		writeFileSync(join(root, '.agents', 'universal-plugin.json'), '{ not json')
		assert.equal(main(['--root', root]), 1)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main treats a missing registry as zero plugins (legal)', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		assert.equal(main(['--root', root]), 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── artifact-type tiebreaker map ────────────────────────────────────────────────

test('parseArtifactTypeMap reads quoted globs and skips comments, blanks, sections', () => {
	const toml = [
		'# the tiebreaker map',
		'',
		'[meta]',
		'"apps/website/src/content/**" = "docs"',
		"'plugins/*/agents/**' = 'subagent'",
		'plugins/*/skills/** = "skill"  # bare key',
	].join('\n')
	const map = parseArtifactTypeMap(toml)
	assert.deepEqual(map, [
		{ glob: 'apps/website/src/content/**', type: 'docs' },
		{ glob: 'plugins/*/agents/**', type: 'subagent' },
		{ glob: 'plugins/*/skills/**', type: 'skill' },
	])
})

test('resolveArtifactTypeFromMap picks the most-specific matching glob', () => {
	const map = parseArtifactTypeMap(['"apps/**" = "asset"', '"apps/website/src/content/**" = "docs"'].join('\n'))
	assert.equal(resolveArtifactTypeFromMap(map, 'apps/website/src/content/x.md'), 'docs')
	assert.equal(resolveArtifactTypeFromMap(map, 'apps/other/y.png'), 'asset')
})

test('resolveArtifactTypeFromMap: ** spans separators, * does not', () => {
	const map = parseArtifactTypeMap(['"plugins/*/skills/**" = "skill"'].join('\n'))
	assert.equal(resolveArtifactTypeFromMap(map, 'plugins/sdd/skills/foo/SKILL.md'), 'skill')
	assert.equal(resolveArtifactTypeFromMap(map, 'plugins/a/b/skills/foo/SKILL.md'), null)
})

test('resolveArtifactTypeFromMap returns null when nothing matches', () => {
	const map = parseArtifactTypeMap(['"docs/**" = "docs"'].join('\n'))
	assert.equal(resolveArtifactTypeFromMap(map, 'src/index.ts'), null)
})

test('loadArtifactTypeMap returns [] when the file is absent', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		assert.deepEqual(loadArtifactTypeMap(root), [])
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main --path resolves the artifact-type via the tiebreaker and emits the plan', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		mkdirSync(join(root, '.agents', 'sdd'), { recursive: true })
		writeFileSync(join(root, '.agents', 'sdd', 'artifact-types.toml'), '"docs/**" = "documentation"\n')
		writeFileSync(join(root, '.agents', 'universal-plugin.json'), JSON.stringify(REG))
		assert.equal(main(['--root', root, '--path', 'docs/guide.md']), 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('main --path with no tiebreaker match returns 0 (falls back to convention)', () => {
	const root = mkdtempSync(join(tmpdir(), 'sdd-gov-'))
	try {
		assert.equal(main(['--root', root, '--path', 'src/whatever.ts']), 0)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
