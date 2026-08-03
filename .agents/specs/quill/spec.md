---
status: draft
project-path: plugins/quill
---

# Quill — Documentation SDD Plugin

> Root project spec — the **descriptive** top index for Quill. Rules live in [`design/`](./design/README.md);
> behaviors live in the capability folders. Scaffolded by `scaffold-project-spec` at `status: draft`; each
> behavioral node's `## Use Cases` + `.feature` are authored in per-unit explore.

## What Quill is

Quill brings SDD discipline to **documentation** — guides, tutorials, articles, reference pages, and READMEs.
Documentation has the same failure modes as code (missing content, structural drift, reader-path gaps) with
no compiler or test runner; Quill is that runner. It treats a document as an implementation artifact with
**verifiable structure**, checked by two instruments: static inspection against a frozen `.feature`, and a
judged pass against a catalog of named prose defects.

Quill is also the **SDD plugin for documentation domains** (`sdd-roles/`): it implements the production-chain
delegates the conductor resolves for the artifact-types `documentation`, `guide`, `tutorial`, `article`, and
`reference`.

## Layout

This spec is organized **capability-first**, hoisted to `<repo>/.agents/specs/quill/` (derivable from
`project-path: plugins/quill`) because the plugin's own folders (`plugins/quill/skills/`, `agents/`) are fixed
by the plugin format and the spec must not ship inside the distributable. A capability therefore spans several
fixed source folders — the accepted spec↔source divergence (`../sdd/design/spec-layout.md`).

## Capability map

| Folder | Type | What |
|---|---|---|
| [`sdd-roles/`](./sdd-roles/README.md) | descriptive index | the SDD production-chain delegates — `spec-writer`, `doc-writer`, `judge` — plus the `doc-spec-bar` and `doc-impl-bar` governances they are graded against |
| [`registry/`](./registry/README.md) | behavioral | register Quill as the documentation SDD plugin — `init-quill` |
| [`design/`](./design/README.md) | descriptive | the doc-eval model (two instruments — four scenario-scoped inspection checks, one document-scoped inspection rule, and the judged defect catalog) + the `decisions/` ADR log |
| [`workflows/`](./workflows/README.md) | descriptive | the workflows suite (cross-capability usage flows: spec → write → verify) |
| [`glossary.md`](./glossary.md) | reference | the documentation-eval vocabulary |

## Placement map

Where a new concept lives — slot here, do not invent placement (`../sdd/design/spec-layout.md`):

- **a new SDD delegate role** → `sdd-roles/` (matched to the plugin-contract roles).
- **a shipped actor bar** (a governance filling one of the squad's `governances` slots) → `sdd-roles/`
  as a **reference** node beside the roles that load it — it is a shipped artifact, not a model, so
  it does not go to `design/`. The current ones are
  [`sdd-roles/doc-spec-bar/`](./sdd-roles/doc-spec-bar/README.md) (`builder-spec`) and
  [`sdd-roles/doc-impl-bar/`](./sdd-roles/doc-impl-bar/README.md) (`builder-impl`).
- **plugin registration / discovery** → `registry/`.
- **a rule or model** (a verification check, the LLM-eval → doc mapping, a scoring convention) → `design/`
  (descriptive); a **decision + its rationale** → `design/decisions/` (ADR); a **unit's design fork** → that
  unit's `<unit>.solution.md`.
- **a cross-capability outcome** (spans ≥2 folders) → `workflows/`, never a capability folder.
- **a term** → `glossary.md`.

The nesting rule: capabilities at the top; any layering or doc-section structure nests *inside* a capability,
never as a top-level folder.

<!-- BEGIN generated: by-concept (project-spec/concept-index) -->

## By concept

> Generated from `concept:` frontmatter by `project-spec/concept-index` — do not edit by hand.

| Concept | Facets |
|---|---|
| `doc-eval` | `design/doc-eval-model.md` (rule) |
| `plugin-registry` | `registry/` (behavior) |
| `production-chain` | `sdd-roles/doc-impl-bar/` (reference) · `sdd-roles/doc-spec-bar/` (reference) · `sdd-roles/doc-writer/` (behavior) · `sdd-roles/judge/` (behavior) · `sdd-roles/spec-writer/` (behavior) |

<!-- END generated: by-concept -->
