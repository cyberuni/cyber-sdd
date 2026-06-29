# corpus/ — spec-corpus tooling

The **tooling** that operates over the spec corpus: discovery, digest, dedupe, split, and
**align**. Most are deterministic and read-only; **`align-specs`** is the exception —
**user-invocable** (and CI-usable) and able to **reconcile**, not just report. This folder is the
*machinery*; the [`../formation/`](../formation/README.md) outer loop is the **process** that wields
it (dedupe overlap, split monoliths, reconcile contradictions). The tools compute and propose;
formation — run by the Warden — decides and acts on the proposals, making its own
self-clear-vs-escalate verdict per act.

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker, no
> `.feature`, and no `## Use Cases`; each tool's behavior lives in a **behavioral** unit spec below.

## What "the corpus" is now

Under the one-project-spec model a single project is **one spec, one behavior suite, one
gate/freeze baseline**, organized into files and folders (folders are *views*, never lifecycle
units). So the corpus the tooling ranges over is two-tiered:

- the **cross-project set** — the sibling project specs in a repo (`sdd`, `aces`,
  `universal-plugin`, …), each a root `spec.md` plus its tree; and
- the **internal structure** of one project spec — its capability folders, its `design/` rules,
  its `acceptance/` e2e suite, and its colocated unit suites.

Discovery derives these tiers from frontmatter; digest, dedupe, and split read individual specs and
**propose** a structural change for formation to ratify. None of the tooling reads runtime behavior
or owns a lifecycle state.

**The two tiers gate differently (ruling E).** Structural acts at the **cross-project** tier —
splitting one project spec out of another, deduping sibling project specs, deprecating a spec — are
real **gated** lifecycle acts, which is why dedupe/split only *propose* and require approval.
Reorganizing the **internal structure** of *one* project spec (moving a capability folder,
regrouping files — folders are views) is **plain editing**: no new gate, no formation ratification,
since no scenario's truth changes and folders carry no lifecycle state. The dedupe/split tools
target the cross-project tier; intra-project reorg needs no corpus tool at all. (`deprecate`/retire
is a lifecycle act owned by `../design/lifecycle-model.md`, not a corpus tool.)

## Units

This capability hosts several **units of code** (skills). The unit of test is the skill — **one
`.feature` per unit**, named for the unit and colocated with the unit's spec in its own folder.
The freeze grain is per `.feature` file, so units freeze independently. Cross-capability outcome
(e2e) scenarios live in `../acceptance/`, never here.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **discovery** | behavioral | [`discovery/`](./discovery/README.md) | find specs at the **three SDD spec locations** (`.agents/spec`, `.agents/specs/<project>`, `<project-path>/.agents/spec`), confirmed by lifecycle `status` shape; read frontmatter only and emit a TOON list; match a name to a folder slug, disambiguate with the user |
| **digest** | behavioral | [`digest/`](./digest/README.md) | a read-only, fixed-section summary of one spec (What / Status / Scenarios / Key decisions / Open items) |
| **dedupe-specs** | behavioral | [`dedupe-specs/`](./dedupe-specs/README.md) | find substantial overlap across a candidate set and **propose** a dedupe plan (survivor + folds); approval-gated, write-free |
| **split-spec** | behavioral | [`split-spec/`](./split-spec/README.md) | group an oversized spec's decisions + scenarios into cohesive concerns and **propose** a split plan; approval-gated, write-free |
| **align-specs** | behavioral | [`align-specs/`](./align-specs/README.md) | the one **user-invocable** / CI tool — detect prose↔suite drift over one-or-all specs, and **reconcile** it (never writing `status`/`approval`/freeze) |

## Boundaries

- **Tooling, not process.** These tools compute and propose. The act — applying a dedupe,
  performing a split, reconciling a contradiction corpus-wide — belongs to
  [`../formation/`](../formation/README.md), which runs continuously and owns the ratification
  verdict. The per-spec structural verdict at a gate is a separate thing.
- **No lifecycle ownership.** Nothing here writes `status`, `approval`, or a freeze. Digest, dedupe,
  and split are read-only and emit proposals. `align-specs` may write **prose / scenarios** in
  reconcile mode, but still never `status`/`approval`/freeze — a fix that would narrow a frozen
  scenario escalates as a **Clearance** CR instead.
- **Authoring and retirement stay elsewhere.** Scaffolding a node is `../authoring/` (explore);
  `deprecate`/retire is a lifecycle act (`../design/lifecycle-model.md`). No corpus tool writes
  spec bodies except `align-specs` in reconcile mode.
