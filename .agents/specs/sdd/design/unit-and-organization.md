# Unit & organization

## The project is the unit

**One durable spec per project.** A project is a repo harness, an agent configuration, an npm
package, a website, or an individual package inside a monorepo. The spec is a directory tree,
not a single file — but it is **one** spec with **one** behavior suite and **one**
gate/freeze baseline.

Size is solved by **organizing into files and folders**, NOT by splitting into smaller
sibling specs. The old spec-fleet — one frozen spec per feature — was the disease: it caused
cross-cutting ripple (a change touching three features needed three frozen specs re-opened)
and repeated approvals. A project that grows large grows *more folders*, never *more specs*.

## The one-spec invariants (what keep the fleet problem dead)

- **ONE spec, ONE behavior suite, ONE gate/freeze baseline.** The project has a single
  lifecycle (see `lifecycle-model.md`).
- **Folders are views, never lifecycle units.** No folder ever gets its own `status`,
  approval, or freeze. The fleet problem was lifecycle fragmentation, not folder count — so
  the cure is forbidding per-folder lifecycle, not forbidding folders.
- **No structural `project` vs `feature` axis.** One project is one spec; there is no
  composition graph and no parent/child spec relationship. `type` names the artifact /
  squad (see `specialists-and-squads.md`), never a structural position. Cross-project
  execution ordering, when it matters, lives in the source tracker, not in spec frontmatter.

## CR concurrency — one CR per working tree

A CR is an abstraction of a suite delta, and a suite delta lands as code. Code already does
parallel-isolated work one way: **branches and working trees**. So SDD does not build a
CR-concurrency manager — git is it.

- **One mission operates on one working tree, one CR at a time.** A mission runs explore →
  deliver → handoff serially in the tree it was handed; the operator never interleaves two
  CRs in one tree.
- **Parallelism is separate trees.** Two CRs run at once by running two mission instances on
  two trees (e.g. git worktrees). SDD stays **tree-agnostic** — it does not create, track, or
  clean working trees; whoever invokes it supplies the tree. (Owning worktree lifecycle is a
  later `universal-plugin` feature, not an SDD concept.) SDD is branch-aware only at
  **handoff**, where it lands the result in the project-declared delivery shape (commits to
  `main` / branch → PR).
- **Which tree gets which CR is settled at the source, not in git.** Git locks *files*; it
  says nothing about two trees grabbing the same *CR*. That CR-level lock is the **source
  claim**: a mission claims its CR at intake (assigns the issue → `accepted`) before work
  begins, so no second mission picks it up (`../intake/README.md`). Git file-locking and the
  source-claim are the two granularities of the same concurrency story.
- **Cross-CR file collisions are git's job.** "No two producers on the same file" holds
  *within* one CR (operator dispatch discipline; see `specialists-and-squads.md`). Two CRs
  on separate trees touching the same file collide as an ordinary **git merge conflict** at
  handoff — resolved the normal way, not by an SDD lock.
- **Overlapping frozen scenarios → the hard floor.** If a landing CR's frozen `.feature`
  was changed by another CR since its branch point, the landing CR rebases onto the new
  baseline; if its frozen scenarios now contradict, that is **Conflict resolution** (or
  **Clearance** if one clearly supersedes) per `autonomy-rubric.md`. Parallelism's cost is
  paid at merge, where git already makes you pay it.

## Screaming architecture

Organize top-level folders by **SDD capability** — the folder names scream what the project
*does* — with two exceptions:

- **`design/`** — the abstract idea: the rules and model.
- **`acceptance/`** — the outcome contract: the e2e behavior suite.

## Rule-in-design + behavior-in-capability

A rule and the behavior that enacts it live in different places:

- **Rules** — the lifecycle schema, the autonomy rubric, the provenance shape, the abstraction
  stack, the loop, the squad model, the suite style — live in `design/` as the abstract idea.
- **Behaviors** — the scenarios that *enact* those rules — live in the capability folders that
  exercise them.

This keeps `design/` readable as a model while the capabilities stay testable as behavior.

## Behavior-suite organization

The behavior suite is **part of the project spec**, organized as:

- an **e2e suite** in `acceptance/` — the project's outcome-level contract (the important
  cross-capability scenarios), consumed by step 3's verify;
- **unit suites** — for the smaller internal pieces — that **colocate** with their capability
  folder.

This is the old project/feature behavior split surviving as *test organization within one
corpus*, not as separate lifecycles to re-gate. (How scenarios are written and judged:
`suite-style.md`.)

## The folder skeleton maps to the loops

The top-level skeleton:

```
design/ gateway/ intake/ authoring/ mission/{deliver,handoff}
campaign/ formation/ doctrine/ forge/ corpus/ plugin/ acceptance/
```

The **Mission Loop (steps 1–4)** maps to folders — `intake/` (1, the CR subsystem that
**feeds** the loop) → `authoring/` (2, explore; owns the spec verification, **invoked** by
the mission) → `mission/deliver/` (3, build to keep; owns the impl verification; verifies vs
`acceptance/` + unit) → `mission/handoff/` (4, landing). `mission/` is the **autonomous
orchestrator** that sequences the loop. The `gateway/` is the **universal router/door** — not
a loop step. The four outer-loop folders (`campaign/`, `formation/`, `doctrine/`, `forge/`)
fire **post-mission**, not as part of the Mission Loop (see `loops.md`). `design/`, `corpus/`,
`plugin/`, and `acceptance/` are cross-cutting, not loop steps. Three internal outer loops
evolve a standing subject — campaign → capabilities, formation → `corpus/`, doctrine →
`design/`; the external **forge** loop has no folder subject — it improves SDD itself from
opt-in end-user field corrections.
