---
status: implemented
project-path: plugins/aced
approval:
  spec:
    verdict: approve
    by: unional
    cause: clearance
    why:
      floor: clearance — RATIFIED LIVE by the owner, scoped to TWO frozen judge.feature scenarios ("invoked for one case it emits the four-field result", "the output is exactly the four fields"); both assert the scalar four-field output the per-dimension contract contradicts, so no additive path exists. Structural gherkin-cli diff vs base: 2 removed / 0 modified / 9 unchanged — no untouched frozen scenario narrowed. extract-situation.feature is a new node, frozen additively.
      blast: medium — the shared measurement instrument for every @rubric scenario in every ACED suite; fixed once in the protocol so no individual suite can fix it locally. Callers keep a one-invoke contract, so caller wiring is unchanged.
      novelty: high — a NEW deterministic engine (extract-situation) now composes the simulator's brief, moving redaction out of the judge's own judgment; owner blessed the scope growth beyond the aced/case-judge touch-set.
      confidence: high — cold aced-spec-validator ALIGNED on judge at round 3 (a scalar impl fails 3 independent scenarios, a one-context impl fails 5); three rounds closed the transcript-provenance hole, a dropped trigger-output shape, and a PASS-vs-must-not-do contradiction. extract-situation is recused from ACED grading (deterministic, node:test-assertable — no Fit line, per the sdd authoring/spec-gate precedent) and verified by mutation instead: 13 of 24 mutations initially survived, all 13 now caught, control mutation still survives. pnpm verify 21/21 green.
  impl:
    verdict: approve
    by: unional
    cause: dimension
    why:
      floor: none — impl built against the frozen suites; every later scenario was ADDITIVE (gherkin-cli addOnly, 0 modified), so the ratified Clearance was never re-entered. One out-of-touch-set break was found and reconciled WITHOUT a re-open: report.feature:78's "mean" is unqualified, so report renders a normalized mean (%max) instead of the raw cross-suite mean the CR's own thesis forbids.
      blast: medium — the shared measurement instrument for every @rubric scenario in every ACED suite, plus a new deterministic engine composing the simulator's brief. Callers keep a one-invoke contract, so no suite can bypass the blindness locally.
      novelty: high — a blind two-pass protocol with the redaction moved out of the judge's own judgment into tested code; the asymmetry is explicit (the simulating context is blind; the scoring context reads the whole scenario, because the guards it gates on live only in the Then).
      confidence: medium-high — cold impl-judge round 4: judge.feature 30/30, extract-situation 27/27 on behavior, scope clean; its sole blocker (three fail-closed Thens bound only by a proxy) closed and proven by the judge's own ablations. Convergence measured before stopping: rounds 1-2 plus an independent reader found 6 engine/body defects; rounds 3-4 and a 97-mutation sweep found ZERO — only harness gaps, whose seam migrated each round. 88 tests, verify 21/21. NOT high, and deliberately so: the impl-judge invokes aced-case-judge, so with case-judge as the subject its method is circular. It refused and read by hand, so all 30 judge.feature verdicts are a static contract-binding read, NOT a measurement — the protocol has never been executed. Filed as a blocking follow-up.
produced-by:
  spec-producer: aced-scenario-writer
  impl-producer: aced-impl-producer
---

# ACED — Agent Config Evaluation & Development

> Root project spec — the **descriptive** top index for ACED. Rules live in [`design/`](./design/README.md);
> behaviors live in the capability folders. Scaffolded by `backfill-project-spec` at `status: draft`; each
> behavioral node's `## Use Cases` + `.feature` are authored in per-unit explore.

## What ACED is

ACED brings LLM-eval discipline to **agent configuration** — skills, AGENTS.md sections, subagent definitions,
and commands. The same failure modes as LLM prompts (silent regression, trigger mismatch, ambiguous rules,
coverage gaps) with no built-in test runner; ACED is that runner. It is also the **SDD plugin for agent-config
domains** (`sdd-roles/`): it implements the production-chain delegates the conductor resolves for those
artifact-types.

This spec describes the **target** ACED (the agent-config plugin of SDD), not the current implementation —
the impl overhaul is a follow-up.

## Layout

This spec is organized **capability-first**, hoisted to
`<repo>/.agents/specs/aced/` (derivable from `project-path: plugins/aced`) because the plugin's own folders
(`plugins/aced/skills/`, `agents/`) are fixed by the plugin format and the spec must not ship inside the
distributable. A capability therefore spans several
fixed source folders — the accepted spec↔source divergence (`../sdd/design/spec-layout.md`).

## Capability map

| Folder | Type | What |
|---|---|---|
| [`eval-run/`](./eval-run/README.md) | descriptive index | score a config against its golden set — `run`, `compare`, `report` |
| [`config-authoring/`](./config-authoring/README.md) | descriptive index | author + maintain agent config — `define-skill`, `define-agent`, `define-governance`, `skillify`, `improve-skill`, `manage-model-runners`, `list-skills`, `repair-private-skills` |
| [`suite-authoring/`](./suite-authoring/README.md) | descriptive index | grow + improve the golden set — `add-scenario`, `improve` |
| [`contribute/`](./contribute/README.md) | descriptive index | propagate an authored config upstream — `contribute-skill` |
| [`sdd-roles/`](./sdd-roles/README.md) | descriptive index | the SDD production-chain delegates — `scenario-writer`, `spec-validator`, `impl-judge`, `judge` |
| [`registry/`](./registry/README.md) | behavioral | register ACED as the agent-config SDD plugin — `init-aced` |
| [`manage/`](./manage/README.md) | behavioral | manage-level dispatcher — routes non-mission ACED work to its engine (`manage`) |
| [`design/`](./design/README.md) | descriptive | the eval model + the `decisions/` ADR log |
| [`acceptance/`](./acceptance/README.md) | descriptive | the e2e behavior suite (author → run → improve → compare) |
| [`glossary/`](./glossary/README.md) | reference | the agent-config eval vocabulary |

## Placement map

Where a new concept lives — slot here, do not invent placement (`../sdd/design/spec-layout.md`):

- **a new way to *run or report* on evals** → `eval-run/` (a new behavioral unit beside `run`/`compare`/`report`).
- **a new agent-config artifact to *author*** → `config-authoring/`.
- **a new way to *propagate* an authored config back to its source** (contribute upstream, not author or score) → `contribute/`.
- **a new way to *grow or fix* the golden set** → `suite-authoring/`.
- **a new SDD delegate role** → `sdd-roles/` (matched to the plugin-contract roles).
- **plugin registration / discovery** → `registry/`.
- **a manage-level (non-mission) operation** (inspect / maintain the tooling corpus, not author or
  score) → routed through `manage/`; a new such engine that authors config lives under its capability
  folder (e.g. `config-authoring/manage-model-runners/`) and is added to the `manage/` routing table.
- **a rule or model** (an eval layer, the mapping, a scoring convention) → `design/` (descriptive); a
  **decision + its rationale** → `design/decisions/` (ADR); a **unit's design fork** → that unit's
  `<unit>.solution.md`.
- **a cross-capability outcome** (spans ≥2 folders) → `acceptance/`, never a capability folder.
- **a term** → `glossary/`.

The nesting rule: capabilities at the top; any layering or doc-section structure nests *inside* a capability,
never as a top-level folder.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `audit` | `config-authoring/improve-skill/` (behavior) |
| `benchmarking` | `config-authoring/manage-model-runners/` (behavior) |
| `config-authoring` | `config-authoring/define-agent/` (behavior) · `config-authoring/define-governance/` (behavior) · `config-authoring/define-skill/` (behavior) · `config-authoring/improve-skill/` (behavior) · `config-authoring/list-skills/` (behavior) · `config-authoring/manage-model-runners/` (behavior) · `config-authoring/manage-skill-dirs/` (behavior) · `config-authoring/repair-private-skills/` (behavior) · `config-authoring/skillify/` (behavior) |
| `contribution` | `contribute/contribute-skill/` (behavior) |
| `discovery` | `config-authoring/manage-skill-dirs/` (behavior) |
| `eval-run` | `eval-run/compare/` (behavior) · `eval-run/report/` (behavior) · `eval-run/run/` (behavior) |
| `glossary` | `glossary/` (reference) |
| `registry` | `registry/` (behavior) |
| `routing` | `manage/` (behavior) |
| `sdd-roles` | `sdd-roles/extract-situation/` (behavior) · `sdd-roles/impl-judge/` (behavior) · `sdd-roles/judge/` (behavior) · `sdd-roles/scenario-writer/` (behavior) · `sdd-roles/spec-validator/` (behavior) |
| `suite-authoring` | `suite-authoring/add-scenario/` (behavior) · `suite-authoring/improve/` (behavior) |

<!-- END generated: by-concept -->
