---
status: implemented
project-path: plugins/aced
approval:
  spec:
    verdict: approve
    by: unional
    cause: clearance
    why:
      floor: clearance — RATIFIED LIVE by the owner, who authorized re-opening both bench suites. skill.feature had one scenario rewritten (the with-and-without file request now becomes two file arms, absent and sourced from HEAD, and no git-ref arm); engine.feature gained one additive scenario (two file arms that differ only in their source compare), so its freeze held.
      blast: low — one rewritten and one added scenario resolving a cross-suite contradiction; the engine's strict subject-kind rule is unchanged and every other frozen scenario is untouched.
      novelty: low — the rule already held in the engine; the re-open states it on both sides and pins the comparable file/file pair.
      confidence: high — cold sdd-spec-judge and aced-spec-validator ALIGNED on both nodes over two rounds; the second round confirmed two owner-requested tightenings.
  impl:
    verdict: approve
    by: unional
produced-by:
  spec-producer: aced-scenario-writer
  impl-producer: aced-impl-producer
---

# ACED — Agent Config Evaluation & Development

> Root project spec — the **descriptive** top index for ACED. Rules live in [`design/`](./design/README.md);
> behaviors live in the capability folders. Scaffolded by `scaffold-project-spec` at `status: draft`; each
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
| [`eval-run/`](./eval-run/README.md) | descriptive index | score a config against its golden set — `run`, `compare`, `report`, `check-freshness`, and the measured layer `bench/` (`engine`, `skill`) |
| [`config-authoring/`](./config-authoring/README.md) | descriptive index | author + maintain agent config — `define-skill`, `define-agent`, `define-governance`, `skillify`, `improve-skill`, `manage-model-runners`, `list-skills`, `repair-private-skills` |
| [`suite-authoring/`](./suite-authoring/README.md) | descriptive index | grow + improve the golden set — `add-scenario`, `improve` |
| [`contribute/`](./contribute/README.md) | descriptive index | propagate an authored config upstream — `contribute-skill` |
| [`sdd-roles/`](./sdd-roles/README.md) | descriptive index | the SDD production-chain delegates — `scenario-writer`, `spec-validator`, `impl-judge`, `judge` — plus `actor-bars`, the governances they are graded against |
| [`registry/`](./registry/README.md) | behavioral | register ACED as the agent-config SDD plugin — `init-aced` |
| [`setup/`](./setup/README.md) | descriptive index | prepare the local ACED environment — `init-aced` (ignore run output) |
| [`manage/`](./manage/README.md) | behavioral | manage-level dispatcher — routes non-mission ACED work to its engine (`manage`) |
| [`design/`](./design/README.md) | descriptive | the eval model + the `decisions/` ADR log |
| [`workflows/`](./workflows/README.md) | descriptive | the workflows suite (cross-capability usage flows: author → run → improve → compare) |
| [`glossary.md`](./glossary.md) | reference | the agent-config eval vocabulary |

## Placement map

Where a new concept lives — slot here, do not invent placement (`../sdd/design/spec-layout.md`):

- **a new way to *run or report* on evals** → `eval-run/` (a new behavioral unit beside `run`/`compare`/`report`).
- **a new agent-config artifact to *author*** → `config-authoring/`.
- **a new way to *propagate* an authored config back to its source** (contribute upstream, not author or score) → `contribute/`.
- **a new way to *grow or fix* the golden set** → `suite-authoring/`.
- **a new SDD delegate role** → `sdd-roles/` (matched to the plugin-contract roles).
- **a shipped actor bar** (a governance filling one of the squad's `governances` slots) →
  [`sdd-roles/actor-bars/`](./sdd-roles/actor-bars/README.md), the **reference** node beside the
  roles that read it — a shipped artifact, not a model, so not `design/`. A bar carries the
  *gradeable criteria* and cites `cyberplace governance show <name>` for full depth rather than
  duplicating a shipped contract.
- **an authored governance** (a standard ACED owns for *other* repositories' skills to consume,
  copied into them at build time — not an actor bar this plugin's own agents load) →
  `plugins/aced/governances/<name>.md`, a shipped package file, not a spec node and not a skill.
  Indexed in [`plugins/aced/governances/README.md`](../../../plugins/aced/governances/README.md);
  the two governance homes are separated by
  [ADR-0035](../../../docs/adr/0035-authored-governances-ship-as-package-files.md).
- **plugin registration / discovery** → `registry/`.
- **local-environment onboarding** (ready a repo to run ACED — e.g. ignore run output) → `setup/`.
- **a manage-level (non-mission) operation** (inspect / maintain the tooling corpus, not author or
  score) → routed through `manage/`; a new such engine that authors config lives under its capability
  folder (e.g. `config-authoring/manage-model-runners/`) and is added to the `manage/` routing table.
- **a rule or model** (an eval layer, the mapping, a scoring convention) → `design/` (descriptive); a
  **decision + its rationale** → `design/decisions/` (ADR); a **unit's design fork** → that unit's
  `<unit>.solution.md`.
- **a cross-capability outcome** (spans ≥2 folders) → `workflows/`, never a capability folder.
- **a term** → `glossary.md`.

The nesting rule: capabilities at the top; any layering or doc-section structure nests *inside* a capability,
never as a top-level folder.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `audit` | `config-authoring/improve-skill/` (behavior) |
| `benchmarking` | `config-authoring/manage-model-runners/` (behavior) · `eval-run/bench/engine/` (behavior) · `eval-run/bench/skill/` (behavior) |
| `config-authoring` | `config-authoring/define-agent/` (behavior) · `config-authoring/define-governance/` (behavior) · `config-authoring/define-skill/` (behavior) · `config-authoring/improve-skill/` (behavior) · `config-authoring/list-skills/` (behavior) · `config-authoring/manage-model-runners/` (behavior) · `config-authoring/manage-skill-dirs/` (behavior) · `config-authoring/repair-private-skills/` (behavior) · `config-authoring/skillify/` (behavior) |
| `contribution` | `contribute/contribute-skill/` (behavior) |
| `discovery` | `config-authoring/manage-skill-dirs/` (behavior) |
| `eval-run` | `eval-run/bench/engine/` (behavior) · `eval-run/bench/skill/` (behavior) · `eval-run/check-freshness/` (behavior) · `eval-run/compare/` (behavior) · `eval-run/report/` (behavior) · `eval-run/run/` (behavior) |
| `production-chain` | `sdd-roles/actor-bars/` (reference) |
| `registry` | `registry/` (behavior) |
| `routing` | `manage/` (behavior) |
| `sdd-roles` | `sdd-roles/extract-situation/` (behavior) · `sdd-roles/impl-judge/` (behavior) · `sdd-roles/judge/` (behavior) · `sdd-roles/scenario-writer/` (behavior) · `sdd-roles/spec-validator/` (behavior) |
| `setup` | `setup/ignore-run-output/` (behavior) |
| `suite-authoring` | `suite-authoring/add-scenario/` (behavior) · `suite-authoring/improve/` (behavior) |

<!-- END generated: by-concept -->
