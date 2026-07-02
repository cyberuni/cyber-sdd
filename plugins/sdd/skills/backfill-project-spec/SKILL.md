---
name: backfill-project-spec
description: "Internal skill: backfill SDD project-spec"
user-invocable: false
---

# backfill-project-spec — lay out an existing project's spec

The procedure the **conductor** follows, **once at bootstrap**, when `start-mission` explore finds an existing
project with **no consolidated spec**. It chooses *how the spec is organized*, scaffolds that skeleton, and
**declares the choice**, so the per-unit explore that follows (`spec-producer-governance`) slots work into known
homes. It is **internal** — reached through `start-mission`, never a user entry — and leaves the tree at
`status: draft`; it authors no node's `## Use Cases`/`.feature`, renders no gate verdict, and freezes nothing.

This skill is **self-contained**: it bakes in the node taxonomy (three spec-types, the **concept axis**, the
**two-level depth cap**, screaming-architecture as the default), the strategy menu + the shared envelope, and
the spec-location rules — all below. Run the six steps in order, surfacing each choice to the user
(recommended-first), never assuming silently.

## 1 — Detect the project shape

Read signals, do not guess: an **agentic plugin** (`.plugin/` + `skills/` + `agents/`); a **monorepo**
(`apps/`+`packages/`, or multiple package anchors each with their own manifest); whether `src/` is
**feature-** or **layer-organized**; framework markers; owners (`CODEOWNERS`); size.

## 2 — Choose the spec location

Recommend, let the user override, never assume:

- **colocated** — `<project>/.agents/spec/` (singular). Default for a repo-level / non-shippable project.
- **hoisted** — `<repo>/.agents/specs/<plugin>/` (plural, named by the package). Recommend for an **agentic
  plugin** (and any shippable package): the spec must not live inside the distributable.
- **monorepo-member** — for a **monorepo**, offer to backfill **every package** (each hoisted) plus the outer
  project (`<repo>/.agents/spec/`). Run steps 1–6 **per selected project**, producing several draft trees.

## 3 — Recommend + choose the strategy

Present **one recommendation + its rationale + the alternative**; the user chooses. Shipped menu:

- **capability-first** *(default)* — top-level folders by what the project *does*. Recommend when a capability
  decomposition is discernible. For a fixed-layout plugin this is a spec-side abstraction over fixed source —
  accepted for legibility; name the spec↔source divergence as a known cost.
- **mirror-source** — spec nodes track the source tree. Offer when `src/` is already **feature-first** and
  navigated-by-code. Mirror is **boundary-aligned** (step 4).

Never offer **layering** or **arc42 sections** as the *top* level — they nest *inside* a capability. **ADR is
not a strategy** — it is the decisions facet (step 4). The deferred strategies (bounded-context, layered,
doc-envelope) are off the shipped menu; surface them only on an explicit "show more options".

## 4 — Scaffold the envelope + skeleton

Write the **shared envelope** every strategy ships:

- root **`spec.md`** (the index + the `project-path` frontmatter + the placement map + the reserved by-concept
  index block — step 5);
- **`design/`** — the rules/model home, **including `design/decisions/`** (the ADR log: append-only,
  descriptive, ungated — the project-scope sibling of a unit's `<unit>.solution.md`; *organize no node as an
  ADR body*);
- **`acceptance/`** — the e2e behavior suite home;
- a **tooling/project** home (build, CI, packaging, deps);
- a **glossary** (reference node).

Then the chosen strategy's **top-level skeleton** of **stub node READMEs**, each declaring a legal
**`spec-type`** via the classifier:

- a **testable surface** → `behavioral` (`## Use Cases`; its `.feature` is authored later, in explore);
- a **shipped suite-less artifact** (a governance, a config, the glossary) → `reference` (`## Subject`, no
  `.feature`);
- an **index / rule / structural grouping** → **descriptive** (no marker).

The skeleton obeys the **two-level depth cap** under **every** strategy: a node is
`<capability>/<unit>` and **never three deep** — a sub-grouping inside a capability is a `concept:` tag
recovered by the by-concept index, not a third folder level. Under **mirror-source**, mirror **only to the
unit boundary**: a folder with a testable surface becomes one behavioral leaf that owns its subtree; create
**no node below a behavioral leaf** (nested `src/` there is impl detail). A capability node README carries
**only** its `spec-type` marker — never a lifecycle field; its cross-cutting **`concept:`** tag is assigned
later in per-unit explore (via the `place-node` skill), not at scaffold.

## 5 — Declare the organization (do not leave it to be re-derived)

In the same act that writes root `spec.md`, record both so a later edit reads, never re-scans:

- **`project-path` frontmatter** — the repo-relative source dir this spec governs (the package for a
  hoisted spec; the project root for a colocated one). It is the router's source→spec map; the spec
  **location mode** (`colocated | hoisted | monorepo-member`) is *derived* from it, not stored. There is
  **no `spec-layout` block** (ADR-0017: frontmatter is the router index — the strategy is not something the
  router needs).
- **`name` frontmatter (the project name)** — write it when the project's name is **not reliably
  derivable** from the location (`discover-specs` derives `repo` for a repo-root single-project and the
  folder for a `.agents/specs/<project>`, but only **guesses** a nested project's folder basename). For a
  **hoisted / nested** project, **ask the user for the name and store it** (infer a default from the
  invocation when the user named the project — e.g. `backfill <this-project>`); confirm before writing.
  Skip it when the derived name is already right (a plain colocated repo-root project).
- the **placement map** in the body — the maintained "a concept of kind K lives in home H" taxonomy + the
  nesting rule, **naming the chosen strategy** in its heading/intro, so a newcomer routes a new concept
  without holding the tree in their head and `start-mission` / the Warden read the strategy on demand.
- the **reserved by-concept index block** beside it (generated by the `concept-index` skill) — the
  cross-cutting `concept → its nodes` view. Reserve the block; **leave it for `concept-index` to
  generate** from `concept:` frontmatter — pure derivation, never hand-maintained.

Validate the result with the `spec-gate` skill's `check-spec-state` script (`check-spec-state.mts --root
<specs-dir>`): the root lifecycle tuple must be legal.

## 6 — Hand back

Backfill ends with **stub** behavioral nodes (`## Use Cases` present, no `.feature`), not filled ones —
filling them is the **per-unit explore grill** (`spec-producer-governance`), the interactive live loop. **Do
not auto-continue into it.** Present the count of stub nodes and **ask the user**:

- **Continue now** — proceed into per-unit explore in this session, node by node, to the spec gate.
- **Defer to a mission** — stop at `status: draft`; the stubs stay a worklist any later `start-mission` /
  `resume-mission` picks up (the explore grill may want a different model or session).

Either way, **propose** the node placement for the formation **Warden** to confirm or relocate, and leave
`status: draft`.

## Output boundary

Write the skeleton, the root envelope (`project-path` frontmatter + placement map + the reserved by-concept
index block), and the `design/decisions/` + glossary homes — nothing else. Do **not** author any node's `## Use Cases`/`.feature`, render a gate verdict,
freeze, or write `status` / `approval` / `produced-by` (the conductor's and `spec-gate`'s; see
`ownership-governance`).
