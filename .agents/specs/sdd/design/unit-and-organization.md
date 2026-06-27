# Unit & organization

## The project is the unit

**One durable spec per project.**
A project is a repo harness, an agent configuration, an npm package, a website, or an individual package inside a monorepo.
The spec is a directory tree, not a single file — but it is **one** spec with **one** behavior suite and **one** gate/freeze baseline.

Size is solved by **organizing into files and folders**, NOT by splitting into smaller sibling specs.
The old spec-fleet — one frozen spec per feature — was the disease: it caused cross-cutting ripple (a change touching three features needed three frozen specs re-opened) and repeated approvals.
A project that grows large grows *more folders*, never *more specs*.

**Projects nest.**
A package inside a monorepo is a **nested project**; the monorepo root is the **outer project**.
SDD names only two config scopes — **user** (`~/.agents/`) and **project** (`<project>/.agents/`) — and avoids "workspace"/"repo-root" (both collide with VS Code / npm / git).
Resolution unions across nested project anchors plus user (`governance-resolution.md`).

## Packaging — the spec stays out of the distributable

A project may itself be a **distributable plugin**.
Plugin install **copies the whole plugin directory** with no include/exclude mechanism, so the spec **never lives inside a distributable plugin dir** — it would ship to every consumer (inert but bloat, and leaking design internals).
Place the spec at `<repo>/.agents/specs/<project>/` (or `.agents/spec/` for a single-project repo); the plugin dir ships only its shippable artifacts (`skills/`, `agents/`, the manifest).
The plugin's exported governances ship **as skills** in `skills/` (`governance-resolution.md`), never as a non-scanned `governances/` dir.
The registry and the per-CR plans are consumer/runtime-side under `<repo>/.agents/`, never inside a plugin.

## The one-spec invariants (what keep the fleet problem dead)

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.**
  The project has a single lifecycle (see `lifecycle-model.md`).
- **Folders are views, never lifecycle units.**
  No folder ever gets its own `status`, approval, or freeze.
  The fleet problem was lifecycle fragmentation, not folder count — so the cure is forbidding per-folder lifecycle, not forbidding folders.
- **No structural `project` vs `feature` axis.**
  One project is one spec; there is no composition graph and no parent/child spec relationship.
  `artifact-type` names the artifact / squad (see `specialists-and-squads.md`), never a structural position.
  Cross-project execution ordering, when it matters, lives in the source tracker, not in spec frontmatter.

## CR concurrency — one CR per working tree

A CR is an abstraction of a suite delta, and a suite delta lands as code.
Code already does parallel-isolated work one way: **branches and working trees**.
So SDD does not build a CR-concurrency manager — git is it.

- **One mission operates on one working tree, one CR at a time.**
  A mission runs explore → deliver → handoff serially in the tree it was handed; the operator never interleaves two CRs in one tree.
- **Parallelism is separate trees.**
  Two CRs run at once by running two mission instances on two trees (e.g. git worktrees).
  SDD stays **tree-agnostic** — it does not create, track, or clean working trees; whoever invokes it supplies the tree.
  (Owning worktree lifecycle is a later `universal-plugin` feature, not an SDD concept.)
  SDD is branch-aware only at **handoff**, where it lands the result in the project-declared delivery shape (commits to `main` / branch → PR).
- **Which tree gets which CR is settled at the source, not in git.**
  Git locks *files*; it says nothing about two trees grabbing the same *CR*.
  That CR-level lock is the **source claim**: a mission claims its CR at intake (assigns the issue → `accepted`) before work begins, so no second mission picks it up (`../intake/README.md`).
  Git file-locking and the source-claim are the two granularities of the same concurrency story.
- **Cross-CR file collisions are git's job.**
  "No two producers on the same file" holds *within* one CR (operator dispatch discipline; see `specialists-and-squads.md`).
  Two CRs on separate trees touching the same file collide as an ordinary **git merge conflict** at handoff — resolved the normal way, not by an SDD lock.
- **Overlapping frozen scenarios → the hard floor.**
  If a landing CR's frozen `.feature` was changed by another CR since its branch point, the landing CR rebases onto the new baseline; if its frozen scenarios now contradict, that is **Conflict resolution** (or **Clearance** if one clearly supersedes) per `autonomy-rubric.md`.
  Parallelism's cost is paid at merge, where git already makes you pay it.

## Screaming architecture

Organize top-level folders by **SDD capability** — the folder names scream what the project *does* — with two exceptions:

- **`design/`** — the abstract idea: the rules and model.
- **`acceptance/`** — the outcome contract: the e2e behavior suite.

## Spec types

Every node in the spec tree is one of **three types**, told apart on two axes — *does it have a subject?* and, if so, *does it own a `.feature`?*

| Type | Subject | `.feature` | Carries | Marker | Examples |
|---|---|---|---|---|---|
| **Descriptive** | none | no | — | none (default) | `design/` rule docs; indexes — the root `spec.md`, a capability overview README |
| **Reference artifact** | a non-testable thing | no (by design) | a `## Subject` descriptor | `spec-type: reference` | a shipped governance (e.g. the spec-format bar) |
| **Behavioral artifact** | a testable unit | **yes** | `## Use Cases` (per node) | `spec-type: behavioral` | a **unit spec** (`authoring/spec-producer/`); the `acceptance/` e2e suite is the project-outcome flavor |

- **Descriptive** describes the system or a rule and attaches to **no subject**. Two roles — a terminal model doc (in `design/`) and an index / table-of-contents (the root `spec.md`, a capability overview README) — but identical on every axis the taxonomy uses, so **one type, two roles**.
- **Reference artifact** specifies a real shipped thing with **no testable surface of its own**; its conformance is checked through a *consumer's* suite, not its own. It opens with a `## Subject` section (the artifact, its contract surface, and where conformance is verified) in place of `## Use Cases`.
- **Behavioral artifact** specifies a testable subject and owns a `.feature`. "**unit spec**" is the everyday word for one; the `acceptance/` e2e suite is the same type at project-outcome scope. **Only this type carries `## Use Cases`** (each use case → ≥1 scenario; `suite-style.md`).

**Declared, not inferred.** A node's type lives in its frontmatter, never guessed:

- descriptive → **no marker** (the default).
- reference → `spec-type: reference`.
- behavioral → `spec-type: behavioral`.

Inference would break both ways: a behavioral node has no `.feature` *yet* mid-explore (the suite is still being authored), and descriptive indexes live *outside* `design/` — so neither file-presence nor location classifies reliably. The marker declares intent up front, so a behavioral node with a subject but no scenarios yet reads as **incomplete**, not as an index.

**Classification, not lifecycle.** `spec-type` is the **only** frontmatter a node README carries. Every lifecycle field — `status`, `aligned`, `strategy`, `approval`, `produced-by`, freeze — stays on the **root `spec.md`** (`lifecycle-model.md`); folders remain views, never lifecycle units. It is also orthogonal to `artifact-types` (the squad key, e.g. `governance`): one says *what kind of spec node this is*, the other says *who produces and judges it*. A deterministic check (`validate-spec`'s `check-spec-state`) fail-closes on a contradiction — a `reference` node that has a `.feature` or lacks its `## Subject`; a `behavioral` node missing `## Use Cases`.

## Rule-in-design + behavior-in-capability

A rule and the behavior that enacts it live in different places — the **descriptive**/**behavioral** split above, applied to the corpus:

- **Rules** — the lifecycle schema, the autonomy rubric, the provenance shape, the abstraction stack, the loop, the squad model, the suite style — live in `design/` as **descriptive** model docs.
- **Behaviors** — the scenarios that *enact* those rules — live in the capability folders as **behavioral** specs.

This keeps `design/` readable as a model while the capabilities stay testable as behavior. (Reference artifacts are the third case — a shipped thing, suite-less, homed in the capability that owns it.)

## Behavior-suite organization

The behavior suite is **part of the project spec**, carried by the **behavioral** specs, organized as:

- an **e2e suite** in `acceptance/` — the project's outcome-level contract (the important cross-capability scenarios), consumed by step 3's verify;
- **unit suites** — for the smaller internal pieces — that **colocate** with their capability folder, one `.feature` per unit.

This is the old project/feature behavior split surviving as *test organization within one corpus*, not as separate lifecycles to re-gate.
(How scenarios are written and judged: `suite-style.md`.)

## The folder skeleton maps to the loops

The top-level skeleton:

```
design/ gateway/ intake/ authoring/ mission/{deliver,handoff}
campaign/ formation/ doctrine/ forge/ corpus/ plugin/ acceptance/
```

The **Mission Loop (steps 1–4)** maps to folders — `intake/` (1, the CR subsystem that **feeds** the loop) → `authoring/` (2, explore; owns the spec verification, **invoked** by the mission) → `mission/deliver/` (3, build to keep; owns the impl verification; verifies vs `acceptance/` + unit) → `mission/handoff/` (4, landing).
`mission/` is the **autonomous orchestrator** that sequences the loop.
The `gateway/` is the **universal router/door** — not a loop step.
The four outer-loop folders (`campaign/`, `formation/`, `doctrine/`, `forge/`) fire **post-mission**, not as part of the Mission Loop (see `loops.md`).
`design/`, `corpus/`, `plugin/`, and `acceptance/` are cross-cutting, not loop steps.
Three internal outer loops evolve a standing subject — campaign → capabilities, formation → `corpus/`, doctrine → `design/`; the external **forge** loop has no folder subject — it improves SDD itself from opt-in end-user field corrections.
