---
status: implemented
project-path: plugins/aced
approval:
  spec:
    verdict: approve
    by: agent
    why:
      leash: within — auto-spec; additive new behavioral node contribute/patch-skill backfilled from existing skill-authoring impl; no existing frozen scenario narrowed; new provisional contribute/ placement group finalized at handoff; reversible feature branch, uncommitted
      basis: cold aced-spec-validator graded 3-lens {oracle,builder,architect} — all PASS, no blocking findings; declared fit strong (confusable trigger vs the skill-authoring family + repo-native carve-out); @trigger 4-yes/5-near-miss balanced, @rubric well-formed, Use-Cases<->scenario 1:1 (17 scenarios), Git Data API plumbing declared out of the graded suite; patch-skill.feature frozen
      cr: migrate-patch-skill-to-aced
  impl:
    verdict: approve
    by: agent
    why:
      leash: within — user green-lit full aced adoption + completion (deliver→impl→handoff), raising the run's auto-spec leash to completion; agent-config impl on a feature branch, uncommitted, reversible
      basis: cold aced-impl-judge (ADR-0016, oracle re-derived per frozen scenario) — all 18 frozen scenarios PASS; first pass caught a real gap (scenarios 003/004 — skillify could not defer session-to-agent/session-to-governance requests), fixed on the SKILL.md (added a Defer-when table naming define-agent/define-governance/improve, target-artifact tell), re-grade cleared both (3→5) with trigger accuracy 9/9; eval suite 1:1 with the frozen scenarios (17 goldens + the @trigger outline as the trigger layer); audit validate green
      cr: migrate-skillify-to-aced
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
| [`config-authoring/`](./config-authoring/README.md) | descriptive index | author agent config — `define-skill`, `define-agent`, `define-governance` |
| [`suite-authoring/`](./suite-authoring/README.md) | descriptive index | grow + improve the golden set — `add-scenario`, `improve` |
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
| `benchmarking` | `config-authoring/manage-model-runners/` (behavior) |
| `config-authoring` | `config-authoring/define-agent/` (behavior) · `config-authoring/define-governance/` (behavior) · `config-authoring/define-skill/` (behavior) · `config-authoring/manage-model-runners/` (behavior) · `config-authoring/skillify/` (behavior) |
| `contribution` | `contribute/patch-skill/` (behavior) |
| `routing` | `manage/` (behavior) |

<!-- END generated: by-concept -->
