---
name: scaffold-project-spec
description: "Partial Skill: invoke by name only — lay out an SDD project-spec"
user-invocable: false
---

# scaffold-project-spec — lay out a project's spec

The procedure the **conductor** follows, **once at bootstrap**, when `start-mission` explore finds a project
with **no spec yet**. It chooses *how the spec is organized*, scaffolds that skeleton, and
**declares the choice**, so the per-unit explore that follows (`spec-producer-governance`) slots work into known
homes. It is **internal** — reached through `start-mission`, never a user entry — and leaves the tree at
`status: draft`; it authors no node's `## Use Cases`/`.feature`, renders no gate verdict, and freezes nothing.

This skill is **self-contained**: it bakes in the node taxonomy (three spec-types, the **concept axis**, the
**two-level depth cap**, screaming-architecture as the default), the strategy menu + the shared envelope, and
the spec-location rules — all below. Run the seven steps in order, surfacing each choice to the user
(recommended-first), never assuming silently.

## 0 — Pick the evidence mode

**Detected, not chosen.** Ask one question of the tree, not of the user: **does this project have source to
read?** Scope it to the **project**, never the repo — a new package inside an existing monorepo is a
greenfield *project* in a populated *repo*.

- **detection mode** — the project's source exists. Steps 1-3 read it.
- **intent mode** — the project's source does not exist yet. Steps 1-3 have nothing to read for it, so they
  run off what the user states the project *will* be.

**The repo around an intent-mode project is still readable**, and reading it is not a mode switch: an
existing monorepo's shape, conventions, and sibling packages inform the recommendation even when the
project itself is empty. Intent mode means *this project* has no source — not that the disk is blank.

Steps 4-6 are identical under both modes. Never run detection's signal-reading against an empty project and
never let intent mode fall through to a silent default.

## 1 — Establish the project shape

**Detection mode** — read signals, do not guess: an **agentic plugin** (`.plugin/` + `skills/` + `agents/`);
a **monorepo** (`apps/`+`packages/`, or multiple package anchors each with their own manifest); whether
`src/` is **feature-** or **layer-organized**; framework markers; owners (`CODEOWNERS`); size.

**Intent mode** — the project has no signals of its own. Establish by asking (reading the surrounding repo
where it helps) the three things detection would otherwise have read:

1. **What kind of project** — a repo harness, an agent plugin, an npm package, a website, an app
   (`project-unit.md`). This is what the plugin/monorepo/plain classification stood for.
2. **Where it will live** — the repo-relative dir its source will occupy. This is the **`project-path`** step
   5 must write, and in a greenfield project that directory does not exist yet, so it can only be asked.
   Confirm it rather than inventing a path.
3. **What it will do** — the intended capabilities, which step 3 recommends a strategy from.

**Nested or outer** falls out of (2): a path inside an existing repo's package area is a **nested** project;
a path that *is* the repo root is the **outer** one.

## 2 — Choose the spec location

Recommend, let the user override, never assume:

- **colocated** — `<project>/.agents/spec/` (singular). Default for a repo-level / non-shippable project.
- **hoisted** — `<repo>/.agents/specs/<plugin>/` (plural, named by the package). Recommend for an **agentic
  plugin** (and any shippable package): the spec must not live inside the distributable.
- **monorepo-member** — for a **monorepo**, offer to lay out **every package** (each hoisted) plus the outer
  project (`<repo>/.agents/spec/`). Run steps 1–6 **per selected project**, producing several draft trees
  (the evidence mode is picked once, in step 0, for the whole run).

In **intent mode** the location is **derived from the `project-path` established in step 1**, exactly as it
is for an existing project — hoisted iff `project-path` is not the spec's own dir (`project-unit.md`: a
nested project's spec is lifted out of its possibly-shippable package dir; the outer project's is not).
Shippability is the *reason* the hoist exists, never the test — a nested package that ships nothing is still
hoisted. Confirm the derived location with the user; never re-ask it as an independent choice.

## 3 — Recommend + choose the strategy

Present **one recommendation + its rationale + the alternative**; the user chooses. Shipped menu:

- **capability-first** *(default)* — top-level folders by what the project *does*. Recommend when a capability
  decomposition is discernible. For a fixed-layout plugin this is a spec-side abstraction over fixed source —
  accepted for legibility; name the spec↔source divergence as a known cost.
- **mirror-source** — spec nodes track the source tree. Offer when `src/` is already **feature-first** and
  navigated-by-code. Mirror is **boundary-aligned** (step 4). **Detection mode only** — there is no source
  tree to mirror in intent mode.

In **intent mode**, recommend from the capabilities the user stated in step 1. If they have not stated any,
**ask for them** — never apply the capability-first default silently. (Detection mode's no-signal fallback
*is* the capability-first default; intent mode has no equivalent, because a greenfield project always has an
intent to state.)

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
- **`workflows/`** — the workflows suite home (cross-capability usage flows);
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
