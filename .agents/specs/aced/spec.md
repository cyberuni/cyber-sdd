---
status: approved
project-path: plugins/aced
approval:
  spec:
    verdict: approve
    by: unional
    cause: clearance
    why:
      floor: clearance — GRANTED LIVE by the owner, scoped to ONE frozen scenario in run.feature ("the run is persisted as a timestamped record"), whose Then named the suite-local results directory while its own sibling and the new check-freshness node name the shared aced results directory. A pair with no intended winner — the destinations are mutually exclusive — so no additive repair existed. Structural gherkin-cli diff vs merge-base: 6 added / 1 modified / 0 removed; no other frozen scenario touched. A later re-section of the suite to match the map's use-case groups was ruled self-clearing by measurement (the per-scenario structural diff is order-insensitive and added no modified scenario), so the grant was not re-entered. check-freshness.feature is a new node, frozen additively.
      blast: medium — changes the result-record shape, a producer contract every downstream consumer reads, and adds one behavioral node beside run/compare/report. Bounded by additivity: a legacy record carrying no evaluated set reads `absent`, never `current`, so nothing pre-existing is silently reinterpreted.
      novelty: medium — recording provenance is ordinary. The non-obvious move is the closed-world treatment: a consumed directory listing is recorded as a hashed entry, so growth is caught without re-resolving the subject, and the residual is pinned by a positive scenario that fails an implementation which re-resolves instead.
      confidence: high — three cold judges across two nodes over three gate rounds; final round is all three lenses PASS on both nodes, ALIGNED true, CONFORMANCE ok, BLOCKER null, zero open markers, and every scenario in both suites carries a named implementation class that fails it. Round 3 caught a directory-only recorder that passed the suite while silently defeating check-freshness's stale verdict for content edits inside a recorded directory — the CR's own central safety property. Two known limits are stated rather than hidden: under-reporting cannot be bound by any scenario (the only witness is the self-report under test; closing it needs harness tool-call telemetry no ACED node has), and check-freshness ships consulted by nobody until the run/improve wiring lands as a follow-up.
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
| [`eval-run/`](./eval-run/README.md) | descriptive index | score a config against its golden set — `run`, `compare`, `report`, `check-freshness` |
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
| `benchmarking` | `config-authoring/manage-model-runners/` (behavior) |
| `config-authoring` | `config-authoring/define-agent/` (behavior) · `config-authoring/define-governance/` (behavior) · `config-authoring/define-skill/` (behavior) · `config-authoring/improve-skill/` (behavior) · `config-authoring/list-skills/` (behavior) · `config-authoring/manage-model-runners/` (behavior) · `config-authoring/manage-skill-dirs/` (behavior) · `config-authoring/repair-private-skills/` (behavior) · `config-authoring/skillify/` (behavior) |
| `contribution` | `contribute/contribute-skill/` (behavior) |
| `discovery` | `config-authoring/manage-skill-dirs/` (behavior) |
| `eval-run` | `eval-run/check-freshness/` (behavior) · `eval-run/compare/` (behavior) · `eval-run/report/` (behavior) · `eval-run/run/` (behavior) |
| `production-chain` | `sdd-roles/actor-bars/` (reference) |
| `registry` | `registry/` (behavior) |
| `routing` | `manage/` (behavior) |
| `sdd-roles` | `sdd-roles/extract-situation/` (behavior) · `sdd-roles/impl-judge/` (behavior) · `sdd-roles/judge/` (behavior) · `sdd-roles/scenario-writer/` (behavior) · `sdd-roles/spec-validator/` (behavior) |
| `setup` | `setup/ignore-run-output/` (behavior) |
| `suite-authoring` | `suite-authoring/add-scenario/` (behavior) · `suite-authoring/improve/` (behavior) |

<!-- END generated: by-concept -->
