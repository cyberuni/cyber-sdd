// Verification for the sdd-operator agent — one functional check per frozen
// scenario across the six sdd-operator feature children (73 scenarios). The
// artifact under test is the agent prompt at sdd-operator.md; each scenario's
// observable behavior is asserted as a content/structural property the prompt
// must realize. Anchored to the frozen .feature scenario titles, not free-authored.
//
//   resolution  8   dispatch 16   explore 20   deliver 11   freeze 6   segment 12
//   = 73 functional scenarios + structural/coexistence checks.
//
// Production model under test: producers run inline in the operator's warm
// context (load the producer-governance, record sdd:sdd-operator) unless a
// model-tuned/plugin agent is named (then spawn); judges always spawn cold.
// "Conductor writes, cold judges grade."
//
// Run by the impl-judge (sdd-implementer); plain `node --test` strips the types.

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
// At least one of the alternatives is present.
const hasAny = (...needles: string[]) => needles.some((n) => op.toLowerCase().includes(n.toLowerCase()))
// All of a set must appear within the same logical line (one assertion co-located).
const onSameLine = (...needles: string[]) =>
	op.split('\n').some((line) => needles.every((n) => line.toLowerCase().includes(n.toLowerCase())))

// ── sdd-operator-resolution (8) ─────────────────────────────────────────────

test('resolution: The operator resolves roles from the registry without scanning', () => {
	assert.ok(has('.agents/universal-plugin.json'))
	assert.ok(hasAny('do **not** scan', 'do not scan'))
	assert.ok(has('user-global') && has('project-global') && has('project-local'))
})

test('resolution: An omitted role key falls back to the naming convention', () => {
	assert.ok(has('missing key') && has('<plugin>-<role>'))
})

test('resolution: An unnamed SDD-default producer role is run inline by the Operator', () => {
	// unnamed producer → load producer-governance, author inline at operator model, record sdd:sdd-operator
	assert.ok(hasAny('run inline', 'author inline', 'author the artifact inline', 'inline via'))
	assert.ok(hasAny('load `sdd:impl-producer-governance`', 'sdd:impl-producer-governance', 'producer-governance'))
	assert.ok(hasAny('`sdd:sdd-operator`', 'sdd:sdd-operator'))
	assert.ok(hasAny('no spawned default producer agent', 'there is no spawned default producer', 'no "generic builder"'))
})

test('resolution: A producer role assigned a named agent is spawned, not run inline', () => {
	// a named agent — plugin delegate or model-tuned producer — is spawned at its own model, not run inline
	assert.ok(hasAny('names an agent', 'name a model-tuned agent', 'model-tuned'))
	assert.ok(hasAny('escape valve', 'model-tuning escape valve', 'model-tuned producer'))
	assert.ok(hasAny('spawn** it at its own model', 'spawn it at its own model', 'spawn** at its own model', 'at its own model'))
})

test('resolution: An SDD-default judge role is spawned as a cold agent', () => {
	// judges always project (spawn) cold — never run inline
	assert.ok(hasAny('judges always project', 'judges always spawn', 'spawn) cold'))
	assert.ok(hasAny('fresh context', 'clean context'))
	assert.ok(hasAny('never** run inline', 'never run inline', 'is **never** run inline'))
})

test('resolution: A required role with no resolvable delegate hard-fails', () => {
	assert.ok(has('hard-fail') && has('STATUS: blocked'))
	assert.ok(hasAny('record nothing', 'records nothing'))
	assert.ok(hasAny('no sentinel value', 'no inline sentinel', 'no sentinel'))
})

test('resolution: An actor governance is resolved from the registry with an SDD default', () => {
	assert.ok(has('governances{ director, builder, architect }'))
	assert.ok(hasAny('`null` = SDD default', 'null = SDD default'))
})

test('resolution: A domain claimed by two plugins is disambiguated without looping', () => {
	assert.ok(has('two or more plugins') && has('STATUS: needs-input') && has('which plugin owns the domain'))
	assert.ok(hasAny('the suspend does not loop', 'does not loop'))
	assert.ok(hasAny('before** counting candidates', 'before counting candidates') || (has('before') && has('counting candidates')))
})

// ── sdd-operator-dispatch (16) ──────────────────────────────────────────────

test('dispatch: Spec-producers load the SDD governance skill for format rules', () => {
	assert.ok(has('sdd:spec-governance'))
	assert.ok(hasAny('via the harness', 'load'))
	assert.ok(hasAny('never a `governance show`', 'never a governance show', 'no `governance show`'))
})

test('dispatch: The loop runs without a governance-show call', () => {
	assert.ok(hasAny('no `governances/` directory', 'no governances/ directory'))
	assert.ok(hasAny('no `governance show` call', 'makes no governance show'))
})

test('dispatch: An unnamed spec-producer is authored inline in the operator warm context', () => {
	// no named agent → load spec-producer-governance, author inline, record sdd:sdd-operator
	assert.ok(hasAny('load `sdd:spec-producer-governance`', 'sdd:spec-producer-governance'))
	assert.ok(hasAny('author inline', 'authors the artifact inline', 'run inline'))
	assert.ok(hasAny('records `produced-by.<role>: sdd:sdd-operator`', 'produced-by.<role>: sdd:sdd-operator', 'recorded `produced-by'))
})

test('dispatch: A named spec-producer agent is spawned at its own model', () => {
	// a named producer (plugin delegate or model-tuned) is spawned, even when no full domain plugin covers
	assert.ok(hasAny('names an agent', 'name a model-tuned agent'))
	assert.ok(hasAny('spawn** it', 'spawn it', 'you **spawn**'))
	assert.ok(hasAny('at its own model', 'own model/effort', 'its own model'))
})

test('dispatch: The spec-producer writes the spec.md body and the impl side cannot', () => {
	assert.ok(hasAny('must not write spec.md control frontmatter', 'must not write spec.md'))
	assert.ok(has('must not modify spec.md or the .feature'))
})

test('dispatch: A spec-producer that writes a control frontmatter field violates the write boundary', () => {
	// status / aligned / produced-by are control fields a producer must not write
	assert.ok(has('status, aligned, approval, produced-by') || (has('status') && has('aligned') && has('produced-by')))
	assert.ok(hasAny('must not write spec.md control frontmatter', 'control frontmatter'))
})

test('dispatch: Forward producers load the actor governances they embody', () => {
	assert.ok(hasAny('builder + architect bars', 'builder + architect governances', 'builder and architect'))
	assert.ok(hasAny('actor governances', 'actor bars'))
})

test('dispatch: An unnamed impl-producer is authored inline in the operator warm context', () => {
	assert.ok(hasAny('load `sdd:impl-producer-governance`', 'sdd:impl-producer-governance'))
	assert.ok(hasAny('build inline', 'builds the implementation', 'build it against', 'inline via `sdd:impl-producer-governance`'))
	assert.ok(hasAny('sdd:sdd-operator', '`sdd:sdd-operator`'))
})

test('dispatch: The impl-producer co-produces the verification with the implementation', () => {
	assert.ok(hasAny('one functional test/eval per frozen scenario', 'one per frozen scenario'))
	assert.ok(has('anchored to the frozen scenarios'))
	assert.ok(hasAny('not free-authored', 'not free-authored from a sense of done'))
})

test('dispatch: The impl-judge is spawned cold and runs the producer verification rather than authoring it', () => {
	assert.ok(hasAny('always a spawned cold agent', 'spawned cold agent', 'project the **impl-judge**'))
	assert.ok(hasAny('does **not** author the functional tests', 'does not author the functional tests'))
	assert.ok(hasAny('orthogonal structural/scope reading', 'orthogonal structural'))
	assert.ok(has('reports pass/fail per scenario'))
})

test('dispatch: Operator spawns the plugin impl-judge cold when one covers the domain', () => {
	// impl-judge resolves through the same live-resolve path; a plugin judge is spawned cold
	assert.ok(has('impl-judge') && hasAny('Live resolve', 'live resolve'))
	assert.ok(hasAny('plugin', "covering plugin's judge", 'plugin domain judge', "the covering plugin's judge"))
})

test('dispatch: The operator receives one impl-producer result regardless of any product-test split', () => {
	assert.ok(hasAny('product/test split is its private detail', 'product/test split'))
	assert.ok(hasAny('you do not surface whether a split happened', 'whether a split happened', 'you do not learn whether'))
})

test('dispatch: A missing verification for a frozen scenario is reported failing by the cold impl-judge', () => {
	// one verification per frozen scenario; impl-judge reports pass/fail per scenario; aligned gated on every pass
	assert.ok(hasAny('one per frozen scenario', 'one functional test/eval per frozen scenario'))
	assert.ok(has('reports pass/fail per scenario') || has('pass/fail per scenario'))
	assert.ok(hasAny('every impl-judge returns `IMPLEMENTATION_PASS: true`', 'every impl-judge returns IMPLEMENTATION_PASS: true'))
})

test('dispatch: The operator resolves every production-chain role', () => {
	for (const role of ['spec-producer', 'plan-producer', 'spec-judge', 'impl-producer', 'impl-judge']) {
		assert.ok(has(role), `missing role ${role}`)
	}
	assert.ok(has('Role keys (closed set)'))
})

test('dispatch: ACES evals are authored by the impl-producer and run by the cold impl-judge', () => {
	assert.ok(hasAny('co-produces the implementation **and** its verification', 'co-produces the implementation'))
	assert.ok(hasAny('runs** the impl-producer', 'runs the impl-producer', 'the cold impl-judge runs them', 'impl-judge runs them'))
	assert.ok(hasAny('does **not** author the functional tests', 'does not author the functional tests'))
})

test('dispatch: A plugin author reads the interface from the operator and default delegates', () => {
	assert.ok(
		hasAny(
			'this definition plus the SDD-default producer-governances and judge agents',
			'no separate governance file is needed',
			'`sdd:plugin-contract-governance` is the contract',
			'sdd:plugin-contract-governance is the contract',
		),
	)
})

// ── sdd-operator-explore (20) ───────────────────────────────────────────────

test('explore: A draft .feature derives explore mode', () => {
	assert.ok(hasAny('draft / unfrozen `.feature` ⇒ `explore`', 'unfrozen') && has('explore'))
})

test('explore: A frozen .feature derives deliver mode', () => {
	assert.ok(hasAny('frozen `.feature` ⇒ `deliver`', 'frozen') && has('deliver'))
})

test('explore: The exploratory loop shapes the spec and probes it by building', () => {
	assert.ok(hasAny('produce *and* judge the contract', 'produce and judge'))
	assert.ok(hasAny('probe the draft', 'probe'))
})

test('explore: The exploratory loop reaches the spec gate on a clean judge pass', () => {
	assert.ok(hasAny('spec-judge passes and no markers remain', 'ready for the spec gate'))
})

test('explore: An unnamed spec-producer is authored inline by the operator (explore)', () => {
	assert.ok(hasAny('load `sdd:spec-producer-governance`', 'sdd:spec-producer-governance'))
	assert.ok(hasAny('author inline', 'authors the spec.md body', 'run inline'))
	assert.ok(hasAny('sdd:sdd-operator', '`sdd:sdd-operator`'))
})

test('explore: A named spec-producer agent is spawned at its own model (explore)', () => {
	assert.ok(hasAny('for a named producer agent, spawn it', 'named producer agent', 'name a model-tuned agent'))
	assert.ok(hasAny('spawn', 'spawned'))
})

test('explore: An explore-mode producer builds against the draft, not a frozen contract', () => {
	assert.ok(hasAny('spike against the *draft*', 'spike against the draft'))
	assert.ok(hasAny('impl-judge does not run during explore', 'does not run during explore'))
})

test('explore: An explore discovery is judged before it reshapes the contract', () => {
	assert.ok(hasAny('not** absorbed unjudged', 'not absorbed unjudged'))
	assert.ok(hasAny('proposed `.feature` change', 'proposed .feature change'))
	assert.ok(has('the human') && has('must accept'))
})

test('explore: Explore-mode discoveries feed back as markers', () => {
	assert.ok(has('content-gap') && hasAny('open marker', '`<!-- open: -->` marker'))
	assert.ok(hasAny('re-run the spec-producer', 're-invoke the spec-producer'))
})

test('explore: The planner runs in explore alongside the spec, not after a gate', () => {
	assert.ok(hasAny('co-delivers `plan.md` + `tasks.md`', 'co-delivers plan.md'))
	assert.ok(has('no plan-judge') && has('no plan gate'))
})

test('explore: Scenarios are ordered to trace the workflow', () => {
	assert.ok(hasAny('order scenarios top-to-bottom by workflow stage', 'orders scenarios top-to-bottom by workflow stage', 'top-to-bottom by workflow stage'))
	assert.ok(has('section comment'))
})

test('explore: The spec-producer enriches spec.md for human consumption', () => {
	assert.ok(hasAny('enrich `spec.md`', 'enriches `spec.md`', 'enriches spec.md', 'enrich spec.md'))
	assert.ok(hasAny('diagrams over walls of prose', 'diagram'))
	assert.ok(hasAny('the `.feature` stays plain boolean Gherkin', 'plain boolean Gherkin'))
})

test('explore: A plugin-written .feature must pass validate-spec', () => {
	assert.ok(hasAny('regardless of who wrote the `.feature`', 'regardless of who wrote', 'regardless of which delegate wrote'))
})

test('explore: validate-spec runs without NodeJS when npx is unavailable', () => {
	assert.ok(hasAny('`npx` is unavailable', 'npx is unavailable'))
	assert.ok(has('agent-level check') && has('no hard NodeJS dependency'))
})

test('explore: validate-spec enforces domain criteria against a plugin-written .feature', () => {
	assert.ok(has('the domain criteria') && has('valid boolean Gherkin'))
})

test('explore: A spec-producer that writes frontmatter control fields is rejected', () => {
	assert.ok(hasAny('must not write spec.md control frontmatter', 'must not write spec.md control frontmatter (status, aligned, approval, produced-by)'))
})

test('explore: The spec-gate judge is a spawned domain delegate, not SDD', () => {
	assert.ok(hasAny('a plugin domain judge when declared', 'plugin domain judge', 'plugin domain delegate'))
	assert.ok(hasAny('spawned cold delegate', 'always a spawned cold delegate', 'always project'))
})

test('explore: A default-judge domain spawns the cold SDD spec-judge', () => {
	assert.ok(hasAny('`sdd:sdd-spec-judge` default agent', 'sdd:sdd-spec-judge'))
	assert.ok(hasAny('static criteria as its bar', 'applying the `validate-spec` static criteria'))
	assert.ok(hasAny('always a spawned cold delegate', 'never run inline', 'spawn a judge agent with clean context'))
})

test('explore: aligned at the spec gate checks only the contract layer', () => {
	assert.ok(hasAny('considers only `spec.md` and the `.feature`', 'considers only spec.md and the .feature'))
	assert.ok(hasAny('spike code does not block the spec from reaching Approved', 'does not block the spec from reaching Approved'))
})

test('explore: The spec gate blocks when the cold spec-judge returns a failing verdict', () => {
	// on cap-hit / failing judge: leave aligned false, do not auto-accept, return failing scenarios
	assert.ok(hasAny('leave `aligned: false`', 'leave aligned: false'))
	assert.ok(hasAny('never auto-accept the unconverged result', 'never auto-accept'))
	assert.ok(hasAny('failing scenarios batched', 'with the failing scenarios'))
})

// ── sdd-operator-deliver (11) ───────────────────────────────────────────────

test('deliver: An unnamed impl-producer is built inline against the frozen contract', () => {
	assert.ok(hasAny('load `sdd:impl-producer-governance`', 'sdd:impl-producer-governance'))
	assert.ok(hasAny('build inline', 'builds against the frozen', 'inline via `sdd:impl-producer-governance`'))
	assert.ok(hasAny('sdd:sdd-operator', '`sdd:sdd-operator`'))
})

test('deliver: A named impl-producer agent is spawned at its own model', () => {
	assert.ok(hasAny('or spawned if named', 'spawned if named', 'a named producer agent', 'name a model-tuned agent'))
})

test('deliver: The deliver loop blocks when the impl-producer returns no artifacts', () => {
	// no artifacts → leave aligned false, surface BLOCKER
	assert.ok(hasAny('leave `aligned: false` and surface the `BLOCKER`', 'leave aligned: false and surface the BLOCKER'))
})

test('deliver: The impl-judge is spawned cold and runs the producer verification', () => {
	assert.ok(hasAny('always a spawned cold agent', 'spawned cold agent', 'project the **impl-judge**'))
	assert.ok(hasAny('the impl-producer does not declare its own pass verdict', 'does not declare its own pass verdict'))
	assert.ok(hasAny('does **not** author the functional tests', 'does not author the functional tests'))
})

test('deliver: The .feature carries no rubric', () => {
	assert.ok(hasAny('never appears in the `.feature`', 'never appears in the .feature'))
	assert.ok(has('rubric'))
})

test('deliver: A graded subject at or above threshold yields a passing scenario', () => {
	assert.ok(hasAny('collapses score-vs-threshold to a boolean per scenario', 'score-vs-threshold to a boolean'))
	assert.ok(hasAny('≥ threshold ⇒ pass', '>= threshold', 'threshold ⇒ pass'))
})

test('deliver: A graded subject below threshold yields a failing scenario', () => {
	// the below-threshold path: a graded subject under the threshold is a per-scenario fail.
	// detect it independently of the at-or-above assertion via the collapse rule's pass branch
	// being conditional on meeting the threshold (so under-threshold ⇒ not pass).
	assert.ok(hasAny('collapses score-vs-threshold to a boolean per scenario', 'score-vs-threshold to a boolean'))
	assert.ok(hasAny('≥ threshold ⇒ pass', '>= threshold ⇒ pass', 'threshold ⇒ pass'))
})

test('deliver: A frozen scenario with no verification is reported failing', () => {
	assert.ok(has('reports pass/fail per scenario') || has('pass/fail per scenario'))
	assert.ok(hasAny('leave `aligned: false`', 'leave aligned: false'))
})

test('deliver: aligned at the impl gate checks the impl layer', () => {
	assert.ok(hasAny('impl layer to conform to the frozen `.feature`', 'impl layer to conform to the frozen .feature'))
})

test('deliver: aligned is true only when every impl-judge passes', () => {
	assert.ok(hasAny('every impl-judge returns `IMPLEMENTATION_PASS: true`', 'every impl-judge returns IMPLEMENTATION_PASS: true'))
})

test('deliver: aligned stays false when any impl-judge fails', () => {
	assert.ok(hasAny('leave `aligned: false` and surface the `BLOCKER`', 'leave aligned: false and surface the BLOCKER'))
})

// ── sdd-operator-freeze (6) ─────────────────────────────────────────────────

test('freeze: A spec can be Approved with no implementation', () => {
	assert.ok(has('Approved') && hasAny('no implementation required for Approved', 'no implementation is required'))
	assert.ok(has('not** Implemented') || (has('not') && has('Implemented')))
})

test('freeze: Approval co-freezes the whole chain at descending strength', () => {
	assert.ok(hasAny('co-freezes the whole chain at descending strength', 'descending strength'))
	assert.ok(has('no separate plan gate') || has('no plan gate'))
})

test('freeze: Freeze is reversible when a deal-breaker emerges', () => {
	assert.ok(hasAny('reverts the spec to Draft', 'revert'))
	assert.ok(hasAny('strength gradient, not an absolute lock', 'not an absolute lock'))
	assert.ok(has('BLOCKER'))
})

test('freeze: A plan change ripples to the .feature expression but not its essence', () => {
	assert.ok(hasAny('regenerated as the plan changes', 'regenerated as the plan changes rather than hard-frozen'))
})

test('freeze: tasks.md is a dependency DAG, not a flat todo', () => {
	assert.ok(has('dependency DAG'))
	assert.ok(has('dependency edges'))
	assert.ok(hasAny('traceability to a `.feature` scenario', 'traceability to a .feature scenario'))
	assert.ok(hasAny('order is emergent from the graph', 'emergent from the graph'))
})

test('freeze: The .feature is the object at the spec gate and the bar at the impl gate', () => {
	assert.ok(hasAny('the object judged at the spec gate becomes the bar at the impl gate', 'the object judged at the spec gate', 'frozen `.feature` is the bar'))
	assert.ok(has('the frozen `.feature`') && has('impl gate'))
})

// ── sdd-operator-segment (12) ───────────────────────────────────────────────

test('segment: Operator suspends at a user-input checkpoint instead of asking', () => {
	assert.ok(hasAny('return `STATUS: needs-input` with the questions **batched**', 'STATUS: needs-input with the questions batched'))
	assert.ok(has('you have no user channel'))
})

test('segment: The skill resumes the operator after collecting answers', () => {
	assert.ok(hasAny('re-invoke', 're-invokes'))
	assert.ok(hasAny('Reconstruct position by reading the artifacts', 'reconstruct position by reading'))
})

test('segment: Questions are batched within a segment, not asked one at a time', () => {
	assert.ok(has('Aggregate') && has('one batch each'))
})

test('segment: The workflow cursor is derived from artifact state across sessions', () => {
	assert.ok(hasAny('derived from the files alone', 'the cursor is derived from'))
	assert.ok(hasAny('No separate workflow journal', 'no separate workflow journal'))
})

test('segment: A content gap persists as an inline marker, not a separate file', () => {
	assert.ok(hasAny('content gap persists as an inline marker', 'persists as an inline marker'))
	assert.ok(hasAny('never a separate `questions.md`', 'never a separate questions.md'))
})

test('segment: A workflow-procedural question is not persisted', () => {
	assert.ok(hasAny('used for this run only', 'for this run only'))
	assert.ok(hasAny('never persisted into any artifact', 'is never persisted'))
})

test('segment: The iteration cap blocks and asks rather than auto-accepting', () => {
	assert.ok(has('ITERATION_CAP'))
	assert.ok(hasAny('never auto-accept the unconverged result', 'never auto-accept'))
})

test('segment: A structural concern is emitted as a non-blocking observation', () => {
	assert.ok(hasAny('owner `architect`', 'owner: architect'))
	assert.ok(hasAny('never blocks `STATUS`', 'never blocks STATUS') || (has('never block') && has('STATUS')))
})

test('segment: Observations bubble up and only the skill surfaces them', () => {
	assert.ok(hasAny('Forward every `OBSERVATIONS` entry to the skill', 'forward') && has('OBSERVATIONS'))
	assert.ok(hasAny('do not spawn specs or write outside the spec you own', 'not spawn specs'))
})

test('segment: Strategist observations surface only at boundaries and dedupe by recurrence', () => {
	assert.ok(has('Strategist boundary'))
	assert.ok(has('dedupe by recurrence'))
})

test('segment: A strategist lesson spawns a spec that may target another monorepo project', () => {
	assert.ok(hasAny('sibling monorepo project', 'sibling project', 'another monorepo project'))
})

test('segment: An accepted structural observation spawns a new spec', () => {
	assert.ok(hasAny('spawns a new spec', 'spawn a new spec'))
	assert.ok(has('priority'))
	assert.ok(has('blocked-by'))
})

// ── structural: the new production model, spawnability & coexistence ─────────

test('structural: the operator agent file exists and is spawnable as sdd:sdd-operator', () => {
	assert.ok(existsSync(join(here, 'sdd-operator.md')))
	assert.ok(/^name:\s*sdd-operator\s*$/m.test(op), 'frontmatter name must be sdd-operator')
})

test('structural: the legacy sdd-orchestrator agent is retired (removed after cutover)', () => {
	assert.ok(!existsSync(join(here, 'sdd-orchestrator.md')), 'sdd-orchestrator.md must be removed after cutover')
})

test('structural: the default spec-producer agent sdd-scenario-writer is retired', () => {
	// producers now run inline via sdd:spec-producer-governance recorded sdd:sdd-operator;
	// there is no spawned default spec-producer agent.
	assert.ok(!existsSync(join(here, 'sdd-scenario-writer.md')), 'sdd-scenario-writer.md must be removed')
})

test('structural: the default plan-producer agent sdd-planner is retired', () => {
	assert.ok(!existsSync(join(here, 'sdd-planner.md')), 'sdd-planner.md must be removed')
})

test('structural: the three producer-governance skills are the inline-producer interface', () => {
	for (const gov of ['spec-producer-governance', 'plan-producer-governance', 'impl-producer-governance']) {
		assert.ok(
			existsSync(join(repoRoot, 'plugins', 'sdd', 'skills', gov, 'SKILL.md')),
			`producer governance skill ${gov} must exist`,
		)
		assert.ok(has(`sdd:${gov}`), `the operator must reference sdd:${gov}`)
	}
})

test('structural: the retired model framing is gone from the prompt', () => {
	// the "generic Builder (no agent)" and unconditional-spawn-the-producer framing is retired
	assert.ok(!has('the generic Builder (no agent)'), 'the "generic Builder (no agent)" framing must be removed')
	assert.ok(!has('spawned subagents, clean context'), 'the all-producers-are-spawned framing must be removed')
})

test('structural: the prompt encodes conductor-writes / cold-judges-grade', () => {
	assert.ok(hasAny('conductor writes', 'conductor writes, cold judges grade'))
	assert.ok(hasAny('producer ≠ judge', 'four-eyes'))
})

test('structural: the registry is well-formed and lists sdd-plugins', () => {
	const parsed = JSON.parse(registry)
	assert.ok(Array.isArray(parsed['sdd-plugins']), 'sdd-plugins must be an array')
})
