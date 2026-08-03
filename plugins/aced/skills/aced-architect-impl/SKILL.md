---
name: aced-architect-impl
description: "Partial Skill: invoke by name only — the ACED Architect bar at the impl gate — whether an agent-configuration artifact is well-formed as configuration. Loaded by the ACED impl-producer to self-align and by the impl-judge to grade. Not triggered by users directly."
user-invocable: false
metadata:
  actor: architect
  gate: impl
  compose: union
---

# ACED Architect-Impl Governance — the agent-config shape bar

The **Architect** bar at the **impl gate**, specialized for agent-configuration artifact-types
(`skill`, `subagent`, `command`, `agents-section`). It **unions onto**
`sdd:architect-impl-governance` — the generic structural-fit bar still applies; this adds what makes
an artifact well-formed *as configuration a model loads and executes*.

The sibling `aced:aced-builder-impl` asks whether the artifact passes its frozen `.feature`. This
bar asks a question the eval suite cannot: whether the artifact is shaped so a model can act on it.
An artifact can pass every scenario and still be unusable configuration.

## The bar (per artifact)

- **Agent-first body.** Dense normative rules the agent executes **without opening a linked file
  first**. A body that defers its own content to a repo path is not self-contained: the model has to
  stop and fetch before it can act. Optional depth belongs in a closing `## References` — a
  `governance show` command, an external HTTPS URL, or a sibling file in the same skill folder.
  **Fail:** a mid-workflow link to another repository file.
- **No rationale prose.** No `## Why`, `## Rationale`, `## Background`, or `## Context` section, and
  no causal "because…" explanation in the body. A one-line scope at the top ("Apply when…") is
  allowed. Rationale lives in an ADR, which outlives the artifact and is read by people rather than
  loaded into every invocation. **Fail:** a body that argues for its rules instead of stating them.
- **Decisions over documentation.** The artifact encodes what to decide and how. It does not restate
  generic best practice, API documentation, or anything the model derives without it. **Fail:**
  a section that would be equally true in any repository.
- **One workflow, one artifact.** A single workflow per artifact, with the selection mechanism
  **declared in the `description`** — matched against a situation, named by a caller, or fired by an
  event. A name-only artifact carries the description `"By name only"` and nothing else, because the
  description is the only surface the model matches on and every added word is another handle for a
  spurious match. **Fail:** a second workflow smuggled in under a heading; identity prose in a
  name-only description.
- **Selection is not visibility.** `user-invocable` controls whether the artifact appears in the
  user's command list, never how it is selected. **Fail:** a bar, judge, or body that reads
  `user-invocable: false` as "not situationally triggered".
- **No baked-in opinions.** The artifact detects the user's setup — package manager, monorepo shape,
  editor, OS paths — at runtime rather than assuming one stack. A genuinely stack-specific artifact
  says so in its `description`. **Fail:** a hardcoded assumption presented as universal.
- **An orthogonal axis.** This bar judges a property the eval suite was not optimizing. A finding
  here is not answerable by adding a scenario.

## Scope across the artifact-types

The criteria above hold for all four types. Where a type has its own additional shape rules, they
are **not** restated here:

| Artifact-type | Additional contract |
|---|---|
| `skill` | `cyberplace governance show skill-design` — frontmatter fields, activation, progressive disclosure, `skill.json`, placement and patterns |
| `skill` (repo layout) | `cyberplace governance show skill-repo-structure` |
| `subagent`, `command`, `agents-section` | no separate shipped contract; this bar is the whole agent-config shape bar for them |

## Gaps are `CONTENT_GAP`, never guesses

An artifact whose intended selection mechanism cannot be determined from its `description` returns a
`CONTENT_GAP`. Do not infer the mechanism from `user-invocable`, from the folder it sits in, or from
whether it happens to be reachable — inferring is the exact error the selection-is-not-visibility
criterion exists to catch.

## References

- `cyberplace governance show skill-design` — the full skill authoring contract this bar's criteria
  are drawn from; read stdout as authoritative.
- `cyberplace governance show skill-repo-structure` — repository layout for shipped skills.
