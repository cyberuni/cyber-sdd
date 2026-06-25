// Verification for the sdd-operator agent — one functional check per frozen
// scenario across the six sdd-operator feature children (65 scenarios). The
// artifact under test is the agent prompt at sdd-operator.md; each scenario's
// observable behavior is asserted as a content/structural property the prompt
// must realize. Anchored to the frozen .feature scenario titles, not free-authored.
// Run by the impl-judge (sdd-implementer); plain node strips the types.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..')
const op = readFileSync(join(here, 'sdd-operator.md'), 'utf8')
const registryPath = join(repoRoot, '.agents', 'universal-plugin.json')
const registry = readFileSync(registryPath, 'utf8')

// Case-insensitive substring presence over the agent prompt.
const has = (...needles: string[]) => needles.every((n) => op.toLowerCase().includes(n.toLowerCase()))
// All of a set must appear within the same logical line (one assertion co-located).
const onSameLine = (...needles: string[]) =>
	op.split('\n').some((line) => needles.every((n) => line.toLowerCase().includes(n.toLowerCase())))

// ── sdd-operator-resolution (9) ───────────────────────────────────────────

test('resolution: resolves roles from the registry without scanning', () => {
	assert.ok(has('.agents/universal-plugin.json'))
	assert.ok(has('Do **not** scan') || has('do not scan'))
	assert.ok(has('user-global') && has('project-global') && has('project-local'))
})

test('resolution: init-plugin writes the resolved role map at setup', () => {
	assert.ok(has('init') && has('domain coverage') && has('five-role map') && has('plugin version'))
})

test('resolution: init rewrites a pre-operator registry entry to the role map', () => {
	assert.ok(has('never read a pre-operator entry') || has('pre-operator entry'))
})

test('resolution: init reconciles a stale registry entry against its own version', () => {
	assert.ok(has('reconciles a stale entry') && has('never compare versions at runtime'))
})

test('resolution: an omitted role key falls back to the naming convention', () => {
	assert.ok(has('missing key') && has('<plugin>-<role>'))
})

test('resolution: a null role value degenerates with no agent', () => {
	assert.ok(onSameLine('null', 'degenerates') && has('no agent'))
})

test('resolution: a required role with no resolvable producer hard-fails', () => {
	assert.ok(has('hard-fail') && has('STATUS: blocked') && has('record nothing') && has('no inline sentinel'))
})

test('resolution: an actor governance resolves from the registry with an SDD default', () => {
	// a named governance resolves; a null governance falls back to the SDD default
	assert.ok(has('governances{ director, builder, architect }'))
	assert.ok(has('`null` = SDD default') || has('null = SDD default'))
})

test('resolution: a domain claimed by two plugins is disambiguated without looping', () => {
	assert.ok(has('two or more plugins') && has('STATUS: needs-input') && has('which plugin owns the domain'))
	assert.ok(has('the suspend does not loop') || has('does not loop'))
	assert.ok(
		has('before** counting candidates') ||
			has('before counting candidates') ||
			(has('before') && has('counting candidates')),
	)
})

// ── sdd-operator-dispatch (16) ─────────────────────────────────────────────

test('dispatch: spec-producers load the SDD governance skill for format rules', () => {
	assert.ok(has('sdd:spec-governance') && (has('via the harness') || has('load')))
	assert.ok(has('never a `governance show`') || has('never a governance show') || has('no `governance show`'))
})

test('dispatch: the loop runs without a governance-show call', () => {
	assert.ok(has('no `governances/` directory') || has('no governances/ directory'))
	assert.ok(has('no `governance show` call') || has('makes no governance show'))
})

test('dispatch: operator dispatches to the plugin that covers the domain', () => {
	assert.ok(has('match `DOMAIN_TYPE`') || has('match DOMAIN_TYPE'))
	assert.ok(has('an agent name → invoke it') || has('agent name'))
})

test('dispatch: falls back to the default spec-producer when no plugin covers the domain', () => {
	assert.ok(has('zero matches') && has('SDD default'))
	assert.ok(has('sdd-scenario-writer'))
})

test('dispatch: a participating plugin always provides its own spec-producer', () => {
	assert.ok(has('always** provides its own spec-producer') || has('always provides its own spec-producer'))
	assert.ok(has('never classifies a covered domain as simple or complex') || has('simple or complex'))
})

test('dispatch: the spec-producer writes spec.md body and the impl side cannot', () => {
	assert.ok(has('must not write spec.md control frontmatter') || has('must not write spec.md'))
	assert.ok(has('Never write `spec.md` body narrative or the `.feature`') || has('that is the spec-producer'))
	// impl-producer / impl-judge must not write spec.md or the .feature
	assert.ok(has('must not modify spec.md or the .feature'))
})

test('dispatch: forward producers load the actor governances they embody', () => {
	assert.ok(has('loads the builder + architect governances') || has('builder + architect governances'))
	assert.ok(has('actor governances'))
})

test('dispatch: the impl-producer co-produces the verification with the implementation', () => {
	assert.ok(has('one functional test/eval per frozen scenario') || has('one per frozen scenario'))
	assert.ok(has('anchored to the frozen scenarios') && has('not free-authored'))
})

test('dispatch: the impl-judge runs the verification rather than authoring it', () => {
	assert.ok(has('does **not** author the functional tests') || has('does NOT author the functional tests'))
	assert.ok(has('orthogonal structural/scope reading') || has('orthogonal structural'))
	assert.ok(has('reports pass/fail per scenario'))
})

test('dispatch: dispatches to the plugin impl-judge that covers the domain', () => {
	// impl-judge resolves through the same live-resolve path as every role
	assert.ok(has('impl-judge') && has('Live resolve'))
})

test('dispatch: falls back to the default impl-judge when no plugin covers the domain', () => {
	assert.ok(has('impl-judge → `sdd-implementer`') || has('impl-judge → sdd-implementer'))
})

test('dispatch: product and test separation stays inside the impl-producer', () => {
	assert.ok(has('product/test split is its private detail') || has('product/test split'))
	assert.ok(has('you do not learn whether a split happened') || has('whether a split happened'))
})

test('dispatch: the operator resolves every production-chain role', () => {
	for (const role of ['spec-producer', 'plan-producer', 'spec-judge', 'impl-producer', 'impl-judge']) {
		assert.ok(has(role), `missing role ${role}`)
	}
	assert.ok(has('Role keys (closed set)'))
})

test('dispatch: ACES evals authored by impl-producer and run by impl-judge', () => {
	assert.ok(has('co-produces the implementation **and** its verification') || has('co-produces the implementation'))
	assert.ok(has('impl-judge runs them') || has('the impl-judge runs them') || has('it **runs** the impl-producer'))
})

test('dispatch: degenerate impl roles fall back without a plugin agent', () => {
	assert.ok(has('the generic Builder (no agent)'))
	// the spec-judge role no longer degenerates inline — the default is the PROJECTED sdd:sdd-spec-judge agent
	assert.ok(has('always projected') || has('spec-judge role is **always projected**'))
	assert.ok(has('`sdd:sdd-spec-judge`') || has('sdd:sdd-spec-judge'))
	assert.ok(!has('no judge agent'), 'the inline "no judge agent" spec-judge concept must be removed entirely')
})

test('dispatch: a plugin author reads the interface from operator and default delegates', () => {
	assert.ok(has('this definition plus the SDD default delegate') || has('no separate governance file is needed'))
})

// ── sdd-operator-explore (15) ──────────────────────────────────────────────

test('explore: MODE is derived from whether the .feature is frozen', () => {
	assert.ok(has('draft / unfrozen `.feature` ⇒ `explore`') || (has('unfrozen') && has('explore')))
	assert.ok(has('frozen `.feature` ⇒ `deliver`') || (has('frozen') && has('deliver')))
})

test('explore: the loop shapes the spec and probes it by building', () => {
	assert.ok(has('produce *and* judge the contract') || has('produce and judge'))
	assert.ok(has('probe the draft') || has('probe'))
})

test('explore: an explore-mode producer builds against the draft', () => {
	assert.ok(has('spike against the *draft*') || has('spike against the draft'))
	assert.ok(has('impl-judge does not run during explore') || has('does not run during explore'))
})

test('explore: an explore discovery is judged before it reshapes the contract', () => {
	assert.ok(has('not** absorbed unjudged') || has('not absorbed unjudged'))
	assert.ok(has('proposed `.feature` change') || has('proposed .feature change'))
	assert.ok(has('the human') && has('must accept'))
})

test('explore: explore-mode discoveries feed back as markers', () => {
	assert.ok(has('content-gap') && has('open marker') && has('re-invoke the spec-producer'))
})

test('explore: the planner runs in explore alongside the spec, not after a gate', () => {
	assert.ok(has('co-delivers `plan.md` + `tasks.md`') || has('co-delivers plan.md'))
	assert.ok(has('no plan-judge') && has('no plan gate'))
	assert.ok(has('validated transitively by the implementation test result') || has('validated transitively'))
})

test('explore: scenarios are ordered to trace the workflow', () => {
	assert.ok(has('orders scenarios top-to-bottom by workflow stage') || has('top-to-bottom by workflow stage'))
	assert.ok(has('section comment'))
})

test('explore: the spec-producer enriches spec.md for human consumption', () => {
	assert.ok(has('enriches `spec.md`') || has('enriches spec.md'))
	assert.ok(has('diagrams over walls of prose') || has('diagram'))
	assert.ok(has('the `.feature` stays plain boolean Gherkin') || has('plain boolean Gherkin'))
})

test('explore: a plugin-written .feature must pass validate-spec', () => {
	assert.ok(has('regardless of which delegate wrote') || has('regardless of which delegate'))
})

test('explore: validate-spec runs without NodeJS when npx is unavailable', () => {
	assert.ok(has('`npx` is unavailable') || has('npx is unavailable'))
	assert.ok(has('agent-level check') && has('no hard NodeJS dependency'))
})

test('explore: validate-spec enforces domain criteria against a plugin-written .feature', () => {
	assert.ok(has('the domain criteria') && has('valid boolean Gherkin'))
})

test('explore: a spec-producer that writes frontmatter control fields is rejected', () => {
	assert.ok(has('must not write spec.md control frontmatter (status, aligned, produced-by)'))
})

test('explore: the spec-gate judge is a domain delegate, not SDD', () => {
	assert.ok(has('a plugin domain judge when declared') || has('plugin domain judge') || has('plugin domain delegate'))
})

test('explore: a static-bar domain projects the default spec-judge delegate', () => {
	// the default spec-judge is PROJECTED (sdd:sdd-spec-judge), applying the validate-spec static criteria as its bar
	assert.ok(has('`sdd:sdd-spec-judge` default agent') || has('sdd:sdd-spec-judge'))
	assert.ok(has('static criteria as its bar') || has('applying the `validate-spec` static criteria'))
	assert.ok(has('always projected') || has('never run inline'))
})

test('explore: aligned at the spec gate checks only the contract layer', () => {
	assert.ok(has('considers only `spec.md` and the `.feature`') || has('considers only spec.md and the .feature'))
	assert.ok(
		has('spike code does not block the spec from reaching Approved') ||
			has('does not block the spec from reaching Approved'),
	)
})

// ── sdd-operator-deliver (7) ───────────────────────────────────────────────

test('deliver: the implementation loop plans, builds, and judges against the frozen contract', () => {
	assert.ok(has('build *and* judge against the frozen contract') || has('build and judge against the frozen contract'))
	assert.ok(has('plan-producer') && has('impl-producer') && has('impl-judge'))
})

test('deliver: the impl-judge runs the test result the producer authored', () => {
	assert.ok(
		has('the impl-producer does not declare its own pass verdict') || has('does not declare its own pass verdict'),
	)
})

test('deliver: the .feature carries no rubric', () => {
	assert.ok(has('never appears in the `.feature`') || has('never appears in the .feature'))
	assert.ok(has('rubric'))
})

test('deliver: a graded subject still yields a boolean per scenario', () => {
	assert.ok(has('collapses score-vs-threshold to a boolean per scenario') || has('score-vs-threshold to a boolean'))
})

test('deliver: aligned at the impl gate checks the impl layer', () => {
	assert.ok(
		has('impl layer to conform to the frozen `.feature`') || has('impl layer to conform to the frozen .feature'),
	)
})

test('deliver: aligned is true only when every impl-judge passes', () => {
	assert.ok(
		has('every impl-judge returns `IMPLEMENTATION_PASS: true`') ||
			has('every impl-judge returns IMPLEMENTATION_PASS: true'),
	)
})

test('deliver: aligned stays false when any impl-judge fails', () => {
	assert.ok(
		has('leave `aligned: false` and surface the `BLOCKER`') || has('leave aligned: false and surface the BLOCKER'),
	)
})

// ── sdd-operator-freeze (6) ────────────────────────────────────────────────

test('freeze: a spec can be Approved with no implementation', () => {
	assert.ok(
		has('Approved') &&
			(has('no implementation is required') ||
				has('no implementation required for Approved') ||
				has('not require implementation')),
	)
	// the cursor distinguishes approved (delivering) from implemented (done)
	assert.ok(has('approved') && has('implemented'))
})

test('freeze: approval co-freezes the whole chain at descending strength', () => {
	assert.ok(has('freeze state-transition') && has('sdd:lifecycle-governance'))
	assert.ok(has('no plan gate'))
})

test('freeze: freeze is reversible when a deal-breaker emerges', () => {
	assert.ok(has('freeze state-transition') || has('revert'))
	// BLOCKER path that reverts to Draft is owned by the gate/skill
	assert.ok(has('BLOCKER'))
})

test('freeze: a plan change ripples to the .feature expression but not its essence', () => {
	// tasks.md regenerated as the plan changes; the .feature essence stays
	assert.ok(has('regenerated as the plan changes') || has('regenerated as the plan changes rather than hard-frozen'))
})

test('freeze: tasks.md is a dependency DAG, not a flat todo', () => {
	assert.ok(has('dependency DAG'))
	assert.ok(has('dependency edges'))
	assert.ok(has('traceability to a `.feature` scenario') || has('traceability to a .feature scenario'))
	assert.ok(has('order is emergent from the graph') || has('emergent from the graph'))
})

test('freeze: the .feature pivots from object to bar', () => {
	assert.ok(
		has('the object judged at the spec gate') || has('object at the spec gate') || has('frozen `.feature` is the bar'),
	)
	// impl gate judges implementation against frozen .feature as the bar
	assert.ok(has('the frozen `.feature`') && has('impl gate'))
})

// ── sdd-operator-segment (12) ──────────────────────────────────────────────

test('segment: suspends at a user-input checkpoint instead of asking', () => {
	assert.ok(
		has('return `STATUS: needs-input` with the questions **batched**') ||
			has('STATUS: needs-input with the questions batched'),
	)
	assert.ok(has('you have no user channel'))
})

test('segment: the skill resumes the operator after collecting answers', () => {
	assert.ok(has('re-invoke') || has('re-invokes'))
	assert.ok(has('Reconstruct position by reading the artifacts') || has('reconstruct position by reading'))
})

test('segment: questions are batched within a segment', () => {
	assert.ok(has('Aggregate') && has('one batch each'))
})

test('segment: the workflow cursor is derived from artifact state across sessions', () => {
	assert.ok(has('derived from the files alone') || has('the cursor is derived from'))
	assert.ok(
		has('No separate workflow journal') ||
			has('no separate workflow journal') ||
			has('no separate workflow journal exists'),
	)
})

test('segment: a content gap persists as an inline marker, not a separate file', () => {
	assert.ok(has('content gap persists as an inline marker') || has('persists as an inline marker'))
	assert.ok(has('never a separate `questions.md`') || has('never a separate questions.md'))
})

test('segment: a workflow-procedural question is not persisted', () => {
	assert.ok(has('used for this run only') || has('for this run only'))
	assert.ok(has('never persisted into any artifact') || has('is never persisted'))
})

test('segment: the iteration cap blocks and asks rather than auto-accepting', () => {
	assert.ok(has('ITERATION_CAP'))
	assert.ok(has('never auto-accept the unconverged result') || has('never auto-accept'))
})

test('segment: a structural concern is emitted as a non-blocking observation', () => {
	assert.ok(has('owner `architect`') || has('owner: architect'))
	assert.ok(has('never blocks `STATUS`') || has('never blocks STATUS') || (has('never block') && has('STATUS')))
})

test('segment: observations bubble up and only the skill surfaces them', () => {
	assert.ok(has('Forward every `OBSERVATIONS` entry to the skill') || (has('forward') && has('OBSERVATIONS')))
	assert.ok(has('do not spawn specs or write outside the spec you own') || has('not spawn specs'))
})

test('segment: strategist observations surface only at boundaries and dedupe by recurrence', () => {
	assert.ok(has('Strategist boundary'))
	assert.ok(has('dedupe by recurrence'))
})

test('segment: a strategist lesson spawns a spec that may target another monorepo project', () => {
	assert.ok(has('sibling monorepo project') || has('sibling project') || has('another monorepo project'))
})

test('segment: an accepted structural observation spawns a new spec', () => {
	assert.ok(has('spawns a new spec') || has('spawn a new spec'))
	assert.ok(has('priority'))
	assert.ok(has('blocked-by'))
})

// ── structural: spawnability & coexistence (cross-cutting) ──────────────────

test('structural: the operator agent file exists and is spawnable as sdd:sdd-operator', () => {
	assert.ok(existsSync(join(here, 'sdd-operator.md')))
	assert.ok(/^name:\s*sdd-operator\s*$/m.test(op), 'frontmatter name must be sdd-operator')
})

test('structural: the legacy sdd-orchestrator agent is retired (removed after cutover)', () => {
	assert.ok(!existsSync(join(here, 'sdd-orchestrator.md')), 'sdd-orchestrator.md must be removed after cutover')
})

test('structural: the registry is well-formed and lists sdd-plugins', () => {
	const parsed = JSON.parse(registry)
	assert.ok(Array.isArray(parsed['sdd-plugins']), 'sdd-plugins must be an array')
})
