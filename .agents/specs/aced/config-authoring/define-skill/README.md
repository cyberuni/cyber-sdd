---
spec-type: behavioral
concept: [config-authoring]
---

# define-skill — author a workflow skill

Scaffold and ship a process / tool-based / standard SKILL.md through the full creation lifecycle,
then hand it to the ACED eval loop to spec and score.

## Use Cases

**Fit:** strong — `define-skill` makes a genuine activation decision (a "create a skill" request vs.
the same config vocabulary carried by `define-agent`, `define-governance`, `skillify`, or
`improve-skill`) and has non-deterministic judgment (placement, pattern, and description authoring),
so all four eval layers carry signal.

**Subject** — authoring or improving a **workflow skill** (a process, tool-based, or standard
SKILL.md) from scratch or by formalizing an existing one: gather scope + trigger + output contract,
resolve placement and runtimes, scaffold the SKILL.md (plus a README for a public skill), audit it,
and point the user at the ACED eval loop to spec and score it.
**Non-goals** — authoring an agent definition or an in-context persona (`define-agent`); authoring a
reference-only governance / rule set (`define-governance`); generalizing the *current session's* work
into a skill (`skillify`); diagnosing why an existing skill's golden-set evals fail (`improve`);
scoring a config or adding eval cases (`run` / `add-scenario`); the skill-quality rubric itself (the
`skill-design` governance the skill loads). define-skill's own **improve mode** fills gaps in a
skill's *definition* at author time — it does not diagnose eval failures (that is `improve`).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a workflow-skill request | a request to create/formalize a workflow skill, vs. a sibling intent (an agent definition or persona, a reference-only governance, a from-this-session extraction, or a score/add request) carrying the same config vocabulary | `define-skill` fires for a workflow-skill request and defers when the intent belongs to `define-agent` / `define-governance` / `skillify` / `run` / `add-scenario` |
| Settle scope before writing | the skill's scope, trigger phrasing, output contract, quality bar, and out-of-scope are not all known | the five design questions are answered and any unanswerable one is resolved with the user before scaffolding |
| Choose the skill pattern | the workflow is an ordered process, a tool/connector usage, or a tone/format standard | the process / tool-based / standard pattern is chosen and drives the body shape; a persona request is deferred to `define-agent` |
| Resolve placement and runtimes | scope (user-global / project-private / project-public) and target runtimes are unclear from context | the placement path is derived, the SKILL.md is created there, and one runtime symlink is created and verified per selected agent |
| Scaffold the skill | a gathered name, scope, trigger phrasing, and body steps | a SKILL.md is written with a kebab-case name matching the directory and a description carrying capability + "Use when" trigger + implicit phrasing, plus a step-by-step body under the size bar; a public skill also gets a README |
| Improve an existing skill | the named target SKILL.md already exists | the existing file is read first and only the gaps or issues found are changed |
| Audit quality before handing back | a freshly written or edited skill | the structural audit is run and any CRITICAL or HIGH finding is fixed before the skill is presented |
| Hand off to the ACED eval loop | a completed skill that carries triggering or graded behavior | the report names the SKILL.md path, README, runtime symlinks, and audit outcome, and points the user at `start-mission` (or `add-scenario` / `run`) to spec and eval the skill rather than embedding a legacy trigger-query test |
| Co-produce the eval suite as impl-producer | dispatched by the conductor as the ACED impl-producer against a frozen `.feature` | the SKILL.md and an eval suite carrying one eval per frozen scenario are produced together |
