---
concept: spec-structure
model: true
---

# Spec structure — node types and layout

The **internal** structure of one project-spec, in two parts: **what kinds of nodes it is made of** (the
taxonomy — a validated contract) and **how those nodes are arranged into a tree** (the layout — a
recommended convention). The counterpart to `project-unit.md`, which fixes the *external* boundary
(what maps to one project-spec); here is the *internal* structure of that one project-spec.

## Three levels — corpus, project-spec, node

The spec vocabulary has **three nested levels**, and every operation is named by the level it acts upon:

- **corpus** — the *collection* of project-specs in a repo (`.agents/specs/`: `sdd`, `aced`, …). A
  **noun**, kept scarce and precise — never a verb or an operation prefix. A **corpus-level** action
  ranges across projects (e.g. `corpus/discovery` lists them; nothing restructures across them).
- **project-spec** — one project's whole durable spec (`.agents/specs/<project>/`): one `spec.md`,
  one behavior suite, one gate/freeze baseline. A **project-spec-level** action operates within a
  single project's tree — audit its node-shape, index its concepts, place a node, reconcile its drift.
- **node** — one unit inside a project-spec: a `spec.md` (+ optional `.feature` / `.solution.md`).
  The taxonomy below classifies nodes.

`corpus ⊃ project-spec ⊃ node`. This doc is the **project-spec** level — the internal structure of
one project-spec. "corpus" appears below only where a concern genuinely spans the collection.

## Spec types

Every node in the spec tree is one of **three types**, told apart on two axes — *does it have a subject?* and, if so, *does it own a `.feature`?*

| Type | Subject | `.feature` | Carries | Marker | Examples |
|---|---|---|---|---|---|
| **Descriptive** | none | no | — | none (default) | `design/` rule docs; indexes — the root `spec.md`, a capability overview README |
| **Reference artifact** | a non-testable thing | no (by design) | a `## Subject` descriptor | `spec-type: reference` | a shipped governance (e.g. the spec-format bar) |
| **Behavioral artifact** | a testable unit | **yes** | `## Use Cases` (per node) | `spec-type: behavioral` | a **unit spec** (`../authoring/spec-producer/`); the `../acceptance/` e2e suite is the project-outcome flavor |

- **Descriptive** describes the system or a rule and attaches to **no subject**. Two roles — a terminal model doc (in `design/`) and an index / table-of-contents (the root `spec.md`, a capability overview README) — but identical on every axis the taxonomy uses, so **one type, two roles**.
- **Reference artifact** specifies a real shipped thing with **no testable surface of its own**; its conformance is checked through a *consumer's* suite, not its own. It opens with a `## Subject` section (the artifact, its contract surface, and where conformance is verified) in place of `## Use Cases`.
- **Behavioral artifact** specifies a testable subject and owns a `.feature`. "**unit spec**" is the everyday word for one; the `../acceptance/` e2e suite is the same type at project-outcome scope. **Only this type carries `## Use Cases`** (each use case → ≥1 scenario; `../authoring/suite-format/README.md`).

**Declared, not inferred.** A node's type lives in its frontmatter, never guessed:

- descriptive → **no marker** (the default).
- reference → `spec-type: reference`.
- behavioral → `spec-type: behavioral`.

Inference would break both ways: a behavioral node has no `.feature` *yet* mid-explore (the suite is still being authored), and descriptive indexes live *outside* `design/` — so neither file-presence nor location classifies reliably. The marker declares intent up front, so a behavioral node with a subject but no scenarios yet reads as **incomplete**, not as an index.

**Classification, not lifecycle.** A node README carries only **classification** frontmatter — `spec-type`, `artifact-types`, and `concept` (below) — never **lifecycle** frontmatter. Every lifecycle field — `status`, `approval`, `produced-by`, freeze — stays on the **root `spec.md`** (`lifecycle-model.md`); folders remain views, never lifecycle units. The three classification axes are mutually orthogonal: `spec-type` says *what kind of spec node this is*, `artifact-types` (the squad key, e.g. `governance`) says *who produces and judges it*, and `concept` says *which cross-cutting concern it serves*. A deterministic check (`spec-gate`'s `check-spec-state`) fail-closes on a `spec-type` contradiction — a `reference` node that has a `.feature` or lacks its `## Subject`; a `behavioral` node missing `## Use Cases`.

## The concept axis — cross-cutting navigation

The folder tree organizes by **capability** (the loop-step a node serves — `gateway`, `intake`, `mission`, …). But a single concern — `lifecycle`, `provenance`, `governance`, `resolution`, `autonomy`, `artifact-type` — is **enacted across several capabilities**, so its facets scatter: `resolution` is a rule in `design/`, behavior in `mission/`, an e2e in `acceptance/`, and bars in `common-governances/`. Capability and concept are **two cross-cutting axes**; a folder tree can only privilege one, so the other must be carried as metadata.

- **`concept:` frontmatter** (string or list) declares the cross-cutting concern(s) a node serves. It is **declared, not inferred** — the same principle `spec-type` follows. The **capability** axis needs no field: it *is* the node's folder.
- **The by-concept index** (root `spec.md`, generated) re-unifies a concept's scattered facets for lookup — `concept → {its nodes across every folder}`. It is **pure derivation** from `concept:` tags (the `corpus/discovery` no-drift rule), regenerated on demand, never hand-maintained. This is how a reader or the agent finds every facet of a concern without holding the tree in their head — healing scatter by **indexing, not moving**.

## The unit's third facet — the solution

A behavioral unit may carry a third durable artifact beside its spec (`README.md` / `## Use Cases`) and its suite (`<unit>.feature`): the **solution**, `<unit>.solution.md`. A unit is then a triple — **what** (spec), **how** (solution), **verified-by** (suite) — all keyed to the same unit boundary.

- **What it holds.** A **decision record**: the chosen approach, key structural decisions, and the **rejected alternatives** and *why*. Only what the implementation and its test results **cannot** say — the roads not taken leave zero trace in code. It does **not** restate how each scenario is satisfied; the code shows that and the suite proves it.
- **Optional.** Written only when a unit has a real design fork worth preserving. A unit whose design is obvious from its impl has **no** solution file — "let the implementation do the talking."
- **Boundary-aligned, not coverage-aligned.** It shares the unit's folder and scope but never mirrors the scenario set — coverage is the suite's job.
- **Not frozen, not judged.** The suite freezes at the spec gate; the solution stays live, refined as the impl is built. It is **ungated** — no solution-judge, and it **stays out of the spec-judge's view** (the cold spec-judge reads `spec.md` + the `.feature` only); the impl gate validates it transitively (`specialists-and-squads.md`).
- **Who writes it.** The `solution-producer` role (`specialists-and-squads.md`) — run **inline in the main-session conductor** — in explore, refined in deliver.

The solution is **per-unit and durable** — distinct from the per-CR execution `.plan.md`, which is **transient** mission state (todos + working method, deleted at retro; `provenance-model.md`). The split keys on scope and lifetime — see `../TERMINOLOGY.md` for the old `plan.md`/`tasks.md` → solution / execution-plan mapping.

---

> The sections below are the **layout** — *recommended convention* for arranging the nodes above,
> not the validated contract.

## Screaming architecture — the default layout

**Screaming architecture** organizes top-level folders by **capability** — the folder names scream what the
project *does* — with two exceptions:

- **`design/`** — the abstract idea: the rules and model.
- **`acceptance/`** — the outcome contract: the e2e behavior suite.

It is the **default**, not the only, layout. The full menu of organization strategies (capability-first,
mirror-source, bounded-context, layered, doc-envelope), the selection rule, and how each reconciles with the
node taxonomy above live in [`spec-layout.md`](./spec-layout.md). Whichever is chosen is **declared**, not
inferred — named in the root `spec.md` body placement map (`spec-layout.md`), so it is read,
never re-derived by scanning.

## Rule-in-design + behavior-in-capability

A rule and the behavior that enacts it live in different places — the **descriptive**/**behavioral** split above, applied across the project-spec:

- **Rules** — the lifecycle schema, the autonomy rubric, the provenance shape, the SDD stack, the loop, the squad model, the suite style — live in `design/` as **descriptive** model docs.
- **Behaviors** — the scenarios that *enact* those rules — live in the capability folders as **behavioral** specs.

This keeps `design/` readable as a model while the capabilities stay testable as behavior. (Reference artifacts are the third case — a shipped thing, suite-less, homed in the capability that owns it.)

## Behavior-suite organization

The behavior suite is **part of the project-spec**, carried by the **behavioral** specs, organized as:

- an **e2e suite** in `../acceptance/` — the project's outcome-level contract (the important cross-capability scenarios), consumed by step 3's verify;
- **unit suites** — for the smaller internal pieces — that **colocate** with their capability folder, one `.feature` per unit.

The e2e/unit split is **test organization within the one project-spec**, not separate lifecycles to re-gate.
(How scenarios are written and judged: `../authoring/suite-format/README.md`.)

## The folder skeleton maps to the loops

The top-level skeleton:

```
design/ gateway/ intake/ authoring/ mission/{conductor,solution-producer,impl-producer,impl-judge,handoff}
campaign/ formation/ doctrine/ forge/ corpus/ project-spec/ plugin/ acceptance/
```

The **Mission Loop (steps 1–4)** maps to folders — `intake/` (1, the CR subsystem that **feeds** the loop) → `authoring/` (2, explore; owns the spec verification, **invoked** by the mission) → the `mission/` deliver units (3, build to keep; `impl-producer/` + `impl-judge/`, overview in `mission/delivery.md`; verifies vs `acceptance/` + unit) → `mission/handoff/` (4, landing).
`mission/` is the **orchestrator** — the conductor — that sequences the loop.
The `gateway/` is the **universal router/door** — not a loop step.
The four outer-loop folders (`campaign/`, `formation/`, `doctrine/`, `forge/`) fire **post-mission**, not as part of the Mission Loop (see `loops.md`).
`design/`, `corpus/`, `project-spec/`, `plugin/`, and `acceptance/` are cross-cutting, not loop steps.
Three internal outer loops evolve a standing subject — campaign → capabilities, formation → structure (`corpus/` + `project-spec/`), doctrine → `design/`; the external **forge** loop has no folder subject — it improves SDD itself from opt-in end-user field corrections.

## Depth cap — two levels (`<capability>/<unit>`)

The capability tree is **capped at two levels**: a top-level capability folder and its leaf units (`README` + `.feature` + optional `.solution.md`). A node never sits three deep. A sub-grouping *within* a capability — a phase, a producer/judge pair, a cluster — is a **cross-cutting concern**, so it is expressed by a `concept:` tag and recovered by the by-concept index (the concept axis), **never by a third folder level**. (Example: the deliver phase's `impl-producer` + `impl-judge` are flat `mission/` units sharing `concept: delivery`, not a `mission/deliver/` sub-tree.) Since SDD's sub-groupings are all concepts, two levels suffice — and the phase overview that would have been a folder `README` becomes a sibling **descriptive** doc (e.g. `mission/delivery.md`).
