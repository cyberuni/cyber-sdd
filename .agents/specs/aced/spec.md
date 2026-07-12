---
status: implemented
project-path: plugins/aced
approval:
  spec:
    verdict: approve
    by: agent
    cause: dimension
    why:
      floor: none — CR s1-scan-root is additive (2 new scenarios on the already-frozen improve-skill.feature, self-clearing; no scenario narrowed); re-open implemented→approved for a widening, no Clearance floor
      blast: low — one deterministic engine check (S1) hardened to key on the recognized scan root instead of a literal 'skills' dirname; follow-up to #149's configurable scan locations; strictly fewer false positives
      novelty: low — additive refinement threading resolved scan roots into runChecks; legacy 'skills' convention preserved as fallback
      confidence: high — cold SDD judge additive-only confirmed, both new scenarios PASS, no open markers; gherkin + check-suite clean
  impl:
    verdict: approve
    by: agent
    cause: dimension
    why:
      floor: none — implementation built against the frozen suite; the frozen improve-skill.feature is the contract, code changed to meet it
      blast: low — S1 firing condition widened to accept a recognized configured scan root; isPublicShippedSkill (public/private classification) left byte-for-byte untouched; whole-repo scan still 0 CRITICAL
      novelty: low — new recognizedScanRoots helper + optional scanRoots param on runChecks (backward-compatible; omitted param keeps legacy behavior)
      confidence: high — cold SDD judge re-derived both scenarios independently + 4 adversarial no-regression fixtures (normal skill, external --path skills/ audit, direct-at-root fires, configured non-skills passes) → all PASS; 71/71 engine tests, pnpm verify 20/20 green
produced-by:
  spec-producer: sdd:sdd-automaton
  impl-producer: sdd:sdd-automaton
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
| `config-authoring` | `config-authoring/define-agent/` (behavior) · `config-authoring/define-governance/` (behavior) · `config-authoring/define-skill/` (behavior) · `config-authoring/improve-skill/` (behavior) · `config-authoring/list-skills/` (behavior) · `config-authoring/manage-model-runners/` (behavior) · `config-authoring/repair-private-skills/` (behavior) · `config-authoring/skillify/` (behavior) |
| `contribution` | `contribute/contribute-skill/` (behavior) |
| `eval-run` | `eval-run/compare/` (behavior) · `eval-run/report/` (behavior) · `eval-run/run/` (behavior) |
| `glossary` | `glossary/` (reference) |
| `registry` | `registry/` (behavior) |
| `routing` | `manage/` (behavior) |
| `sdd-roles` | `sdd-roles/impl-judge/` (behavior) · `sdd-roles/judge/` (behavior) · `sdd-roles/scenario-writer/` (behavior) · `sdd-roles/spec-validator/` (behavior) |
| `suite-authoring` | `suite-authoring/add-scenario/` (behavior) · `suite-authoring/improve/` (behavior) |

<!-- END generated: by-concept -->
