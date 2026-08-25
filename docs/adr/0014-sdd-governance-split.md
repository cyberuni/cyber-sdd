# ADR-0014: Split SDD lifecycle/frontmatter knowledge into named governance skills

## Status

Accepted

> **Update note (2026-06-28):** The split landed and expanded. Renames since:
> `spec-governance` → `spec-format-governance` + `suite-format-governance`; the actors are now
> oracle/builder/architect (`framer` → `oracle`); `sdd-operator` → `conductor`;
> `sdd-planner` → `solution-producer`; `domain-plugin` and `approved-by` were dropped. The
> consumer/loader table below is historical. Current governance set and wiring:
> `.agents/specs/sdd/design/specialists-and-squads.md` + `design/governance-resolution.md`.

## Context

ADR-0013 established the **governance skill** pattern: reference/criteria content lives in a `user-invocable: false` skill, loaded by the plugin's own agents and dependent plugins' agents through the harness. The first such skill, `sdd:spec-governance`, holds the universal `.feature` format bar, scenario ordering, and `spec.md` enrichment rule.

But a second body of reference content — the **spec lifecycle and frontmatter contract** — had no governance-skill home. It was duplicated as prose across at least six consumers, all of which had to agree with the one piece of enforcement code, `validate-spec/scripts/check-spec-state.mts`:

- `sdd/SKILL.md` — full Lifecycle Routing table, Freeze Handling, Core Rules
- `validate-spec/SKILL.md` — gate transition table, `approved-by` write rules
- `sdd-operator.md` — phase-derivation table, write boundary, `aligned` layer semantics
- `sdd-spec-judge.md` — legal-tuple legality checks
- `sdd-scenario-writer.md` and plugin producers — "write no control frontmatter"
- `create-spec.md` — leaves `status: draft`, writes `domain-plugin`

A change to the contract (e.g. adding `approved-by` attribution) meant editing every copy by hand, with no mechanism to keep them in sync. This also contradicted `sdd-skill/spec.md`'s own design decision that the gateway must **not** "interpret lifecycle transitions" — yet `sdd/SKILL.md` owned the whole lifecycle table.

## Decision Drivers

- DRY: one home per fact, loaded where needed (the ADR-0013 governance-skill mechanism).
- Reuse-driven grouping: bundles must be cohesive enough to **name**, and independently reusable by different consumer subsets. "Governance" is a category, not a name.
- Light consumers stay light: a spec-producer that only needs "write no control frontmatter" must not be forced to load the whole state machine.
- Don't add a third hand-maintained copy of logic that already has a code authority (`check-spec-state.mts`).

## Considered Options

The scope is a spectrum. We evaluated which consumer needs which atomic fact:

| Fact | sdd | validate-spec | operator | spec-judge | producers | planner/impl |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| A schema | recognize | r/w | r/w | read | field names | — |
| B status enum | ✓ | ✓ | ✓ | ✓ | — | — |
| C transitions | route | ✓ | phase | — | — | — |
| D legal-tuple | recognize | →script | phase | checks | — | — |
| E write-ownership | — | writes | writes | — | ✓ | ✓ |
| F freeze | ✓ | — | ✓ | — | ✓ | ✓ |
| G aligned-layer | commit-rule | reports | **authority** | — | — | — |
| H approved-by | — | writes | — | checks | — | — |
| I markers | concept | reports | writes | checks=0 | emit gaps | — |

- **One monolithic skill (coarse).** Rejected: overloads light consumers (producers/planner would load the whole state machine for one write rule).
- **One skill per fact (fine).** Rejected: facts like A (schema) have no independent reuse — A is never needed without B/C around it, so it is a section, not a skill.
- **Three reuse-cohesive bundles (chosen).** Each bundle is independently reused by a distinct consumer subset and nameable in one word.

## Decision

Split the contract into three named `-governance` skills, plus a fourth that documents the plugin-level role/load contract:

| Skill | Holds | Authority |
|---|---|---|
| `lifecycle-governance` | A schema (preamble), B status enum, C transitions, I marker gating, F freeze **transition** | prose home |
| `ownership-governance` | E write-ownership matrix, F freeze **write-constraint** | prose home |
| `gate-validation-governance` | D legal-tuple rules, G `aligned` layer-scoping, H `approved-by` attribution | D + H **reference** `check-spec-state.mts`; G is prose-only |
| `plugin-contract-governance` | the five delegate roles a plugin implements + which governances each role loads + the `.agents/universal-plugin.json` roles/governances map | ties role → governance wiring together |

**Freeze (F) splits across two skills by face:** the *state transition* ("`approved` freezes the `.feature`; revert to `draft` to change it") lives in `lifecycle-governance`; the *write constraint* ("never write a frozen `.feature`; producers write no control frontmatter") lives in `ownership-governance`. This lets the light consumers (producers, planner, impl-judge) load **only** `ownership-governance`.

**"Responsibility" is not a new skill.** The production-chain role duties already live in the `framer/architect/builder` governances and the operator's write boundary; `ownership-governance` is the frontmatter-field slice of that, and `plugin-contract-governance` is the role-registry slice.

Loader wiring:

| Consumer | loads |
|---|---|
| `sdd` gateway | lifecycle-governance |
| `validate-spec` | lifecycle, ownership, gate-validation |
| `create-spec` | lifecycle, ownership |
| `sdd-operator` | lifecycle, ownership, gate-validation |
| `sdd-spec-judge` | lifecycle, gate-validation |
| spec-producers (`sdd-scenario-writer`, `aced-scenario-writer`, `quill-writer`) | ownership |
| `sdd-planner`, impl-judges (`sdd-implementer`, `aced-implementer`, `quill-implementer`), `quill-doc-writer` | ownership |

## Rationale

The three-way cut is the point on the spectrum where every bundle is **both** independently reused **and** one-word nameable — the two tests that decide grouping by Reuse. `check-spec-state.mts` stays the single mechanical authority for legal tuples and `approved-by`; `gate-validation-governance` references it rather than re-prosing the logic, so there is no third copy to drift. The gateway loading `lifecycle-governance` (instead of owning the table) realigns the skill with its own spec's design decision.

## Consequences

### Positive

- One home per fact; a contract change edits one skill, and consumers that load it pick it up.
- Light consumers load only `ownership-governance`.
- `check-spec-state.mts` remains the legality authority; prose references it.
- The gateway no longer owns lifecycle interpretation.

### Negative

- Freeze (F) is described in two skills (transition vs constraint) — acceptable because each face is named within its skill and they cross-link.
- More governance skills to keep marked `user-invocable: false` + `Internal skill:` (ADR-0013 dual marker).

### Risks

- If a consumer's prose is trimmed but its loader line is forgotten, the rule is lost rather than duplicated. Mitigated by the gherkin scenarios asserting which governances each consumer loads.

## Related Decisions

- [ADR-0013](0013-governance-skills.md) — governance skills as the loading mechanism; this ADR adds four under it
- [ADR-0012](0012-spec-frontmatter-schema.md) — the `status`/`priority`/`blocked-by` schema that `lifecycle-governance` documents (extended here with `aligned`, `approved-by`, `domain-plugin`, open markers)
- [ADR-0003](0003-agent-first-authoring.md) — agent-first bodies; rationale stays in this ADR, not the skill bodies
- `artifacts/specs/sdd-orchestrator/spec.md` — the redesign that introduced `aligned` and the operator write boundary
