---
spec-type: behavioral
concept: spec-structure
---

# backfill-project-spec — lay out an existing project's spec

The **project-level layout bootstrap**: when an existing project has **no consolidated spec**, choose an
**organization strategy** (`../../design/spec-layout.md`), scaffold the skeleton, and **declare** the choice,
so the per-unit explore that follows slots work into known homes instead of inventing placement. It is the
structural answer to [#35](https://github.com/cyberuni/cyberplace/issues/35) — lowering the placement
burden on non-owner builders.

It enacts the **structure-doc trio**: `../../design/spec-structure.md` (the node taxonomy — the three
spec-types, the **concept axis**, the **two-level depth cap**, screaming-architecture as the default),
`../../design/spec-layout.md` (the strategy menu + the body-declared organization), and
`../../design/project-unit.md` (the external boundary + the spec location).

It is **not a user-facing entry skill**. The single entry is `../../gateway/` → `start-mission`; this unit is
an **internal step the conductor loads during explore** when it finds an existing project lacking a spec. It
runs **once at bootstrap**, before the normal per-unit explore (`../spec-producer/`), and leaves the tree at
`status: draft`.

## Use Cases

**Subject** — choosing and scaffolding the *organization* of one project's spec (its layout, the
`project-path` frontmatter + the body placement map), then handing back to per-unit explore.
**Non-goals** — it does **not** fill each node's `## Use Cases` + `.feature` (that is `../spec-producer/`
during explore); it renders **no** gate verdict and freezes nothing (`../spec-gate/`); it does **not**
write the control frontmatter `status` / `approval` / `produced-by`; ongoing **re-organization**
of an existing spec is the formation **Warden**'s (`../../formation/`), not this unit; it does not implement
the project it scaffolds.

| Trigger | Inputs | Outcome |
|---|---|---|
| **bootstrap** — an existing project (or one package) with no consolidated spec | the project source + the user's **location** and **strategy** choices | a scaffolded **draft** spec tree: the shared envelope + the strategy skeleton + stub nodes (each declaring a legal `spec-type`) + root `spec.md` carrying the `project-path` frontmatter and the body placement map, at `status: draft` |
| **monorepo** — a repo with multiple package anchors | the repo + the user's per-project selection | one **bootstrap** per chosen package (each hoisted to `<repo>/.agents/specs/<pkg>/`) plus the outer project (`<repo>/.agents/spec/`), several draft trees in one pass |

Every scenario in [`backfill-project-spec.feature`](./backfill-project-spec.feature) maps to one of these two
use cases or to a cross-cutting guarantee (location choice, strategy choice, the declared organization, the
scaffold boundary, the hand-back).

## The workflow

In order; the conductor runs it in-session, surfacing each choice to the user (recommended option first).

1. **Detect** the project shape — signals: an agentic plugin (`.plugin/` + `skills/` + `agents/`), a monorepo
   (`apps/`+`packages/` or multiple package anchors), whether `src/` is feature- or layer-organized,
   framework markers, owners (`CODEOWNERS`), size.
2. **Choose the spec location** (`../../design/project-unit.md`): **colocate** at `<project>/.agents/spec/`
   by default; **hoist** to `<repo>/.agents/specs/<plugin>/` for an agentic plugin (the spec must not ship
   inside the distributable); for a **monorepo**, offer to backfill every package (hoisted) plus the outer
   project. The recommendation is surfaced first and the user may override; it is never silently assumed.
3. **Recommend + choose the strategy** (`../../design/spec-layout.md`): **capability-first** (default) when a
   capability decomposition is discernible; **mirror-source** when the code is already feature-first and
   navigated-by. Present one recommendation + the alternative; the user chooses. Layering / arc42 sections are
   **never** offered as the top level (the nest-inside rule); **ADR is not a strategy** (it is the decisions
   facet).
4. **Scaffold** the **shared envelope** (root `spec.md`, `design/` incl. the `design/decisions/` ADR log,
   `acceptance/`, a tooling/project home, a glossary) + the chosen strategy's **top-level skeleton** of stub
   node READMEs, each declaring a **legal `spec-type`** (testable surface → behavioral; shipped suite-less
   artifact → reference + `## Subject`; index / rule / structural grouping → descriptive). The skeleton
   respects the **two-level depth cap** (`../../design/spec-structure.md`) under **every** strategy: a node is
   `<capability>/<unit>` and never three deep — a sub-grouping inside a capability is a `concept:` tag, not a
   third folder level. Under **mirror-source**, mirror only to the **unit boundary** — no node is created
   below a behavioral leaf. A stub declares its `spec-type` only; its cross-cutting `concept:` tag is assigned
   later, in per-unit explore (`../spec-producer/`, via `../../project-spec/place-node/`), not at scaffold.
5. **Declare** the organization: write the **`project-path` frontmatter** (the governed source dir; the
   spec location mode is derived from it) on root `spec.md`, and the **placement map** — naming the chosen
   strategy — into its body, so the layout is read, never re-derived. Beside it, **reserve the generated
   by-concept index block** (`../../project-spec/concept-index/`, `../../design/spec-structure.md`) — the
   cross-cutting `concept → its nodes` view that `project-spec/concept-index` fills from `concept:` frontmatter;
   the bootstrap leaves the block for that engine to generate, never hand-maintaining it. There is **no
   `spec-layout` block** (`../../design/spec-layout.md`; ADR-0017). Write the **`name` frontmatter** only
   when the project name is **not reliably derivable** — for a hoisted or nested project, **ask the user and
   confirm** before writing it; skip it when the colocated repo-root name is already correct.
6. **Hand back** to `start-mission`'s per-unit explore to fill each behavioral node; **propose** node
   placement for the formation **Warden** to confirm or relocate. Leave the tree at `status: draft`.

## The output boundary

- It writes the **skeleton** (folders + stub node READMEs with declared `spec-type`, capped at two levels),
  the root `spec.md` envelope (the `project-path` frontmatter + the placement map + the reserved by-concept
  index block), and the `design/decisions/` + glossary homes.
- It does **not** author any node's `## Use Cases` or `.feature` (that is the per-unit explore), render a gate
  verdict, freeze, or write `status` / `approval` / `produced-by` — those belong to the conductor
  and `../spec-gate/`.
- The produced root passes `plugins/sdd/skills/spec-gate/scripts/check-spec-state.mts` (a legal root tuple).
