---
spec-type: reference
concept: spec-structure
---

# spec-structure — the project-spec organization bar

A **reference artifact**: the `spec-structure` governance — what kind of node a spec is, and where
that kind lives in the project-spec tree. A cross-cutting SDD governance with no single capability
owner: it is loaded wherever a node is placed, judged, or audited.

## Subject

- **Artifact** — the `spec-structure` governance, shipped as
  `plugins/sdd/skills/spec-structure-governance/` (a cross-cutting SDD governance —
  `../../design/governance-resolution.md`).
- **Contract surface** — the **node taxonomy** (descriptive / reference / behavioral, declared via
  `spec-type`) together with **where each kind lives**: rule-in-design + behavior-in-capability,
  screaming architecture, the non-capability folders (`design/`, `workflows/`, `ledger/`), the
  two-level depth cap, and suite colocation. Taxonomy and placement are **one rule**, not two — the
  placement law is the taxonomy applied to folders and cannot be stated without it
  (`../../design/spec-structure.md`, "the descriptive/behavioral split above, applied across the
  project-spec"). It also carries the **declared-strategy rule**: the layout strategy is read from
  the root `spec.md` placement map, never re-assumed.
- **Conformance** — verified through consumers, never by this artifact itself: the mechanical
  `check-spec-state.mts` (spec-type vs node shape), the `check-spec-structure` engine (untagged and
  oversized nodes), and the `architect` bars' structural verdict. A reference artifact carries this
  `## Subject` in place of `## Use Cases` + a `.feature`.
- **Boundary** — the **model + rationale** live in `../../design/spec-structure.md` (canonical),
  with `../../design/project-unit.md` fixing what maps to one spec and
  `../../design/spec-layout.md` holding the strategy menu and the placement-map format. The
  **strategy decision procedure** is `../../authoring/scaffold-project-spec/` (detection mode for an
  existing project, intent mode for a greenfield one); the **home suggestion** engine is
  `../../project-spec/place-node/`; a node's internal section shape is
  `../../authoring/spec-format/`. This bar owns the taxonomy and the placement law that reads from
  it — it decides nothing per project and stores no homes.

## Strategy is policy, homes are data

The load-bearing distinction this bar encodes, ratified 2026-07-18.

- The **strategy** (`capability-first | mirror-source | …`) is a **choice** — two readers can
  legitimately disagree, so it cannot be observed. It is **declared** in the root `spec.md`
  placement map and **read**. It is not derivable: a greenfield project has no tree yet still has a
  strategy; deriving it from a healthy tree is circular, and from a half-migrated tree it
  perpetuates the layout being migrated away from.
- The **homes** (which folder a concept sits in) are **facts** about the current tree, observable
  from `concept:` tags and changing as the tree changes. A stored home list is a second source that
  rots, so homes stay **derived**.
- They compose: **the declared strategy parameterizes the derivation.** A consumer keeps deriving
  homes but asks the placement map which derivation to run.

This mirrors `../../corpus/discovery/` — the fixed conventions are scanned (derived) while extra
anchors are a declared, curated source. The no-drift rule means "do not store what you can observe",
never "do not declare a choice".
