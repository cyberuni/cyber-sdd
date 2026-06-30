# corpus/ — spec-corpus tooling

The **tooling** that operates over the spec corpus: discovery, digest, the by-concept index,
node placement, **node-shape audit**, and **align**. Most are deterministic and read-only;
**`align-spec`** is the exception — **user-invocable** (and CI-usable) and able to **reconcile**,
not just report. This folder is the *machinery*; the [`../formation/`](../formation/README.md) outer
loop is the **process** that wields it (audit node-shape, split an oversized node, reconcile drift or
contradiction). The tools compute and propose; formation — run by the Warden — decides and acts on
the proposals, making its own self-clear-vs-escalate verdict per act.

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker, no
> `.feature`, and no `## Use Cases`; each tool's behavior lives in a **behavioral** unit spec below.

## What "the corpus" is now

Under the one-project-spec model a single project is **one spec, one behavior suite, one
gate/freeze baseline**, organized into files and folders (folders are *views*, never lifecycle
units). So the tooling ranges over two tiers, but they are no longer **symmetric**:

- the **cross-project set** — the sibling project specs in a repo (`sdd`, `aces`,
  `universal-plugin`, …), each a root `spec.md` plus its tree. **`discovery`** lists them; nothing
  *restructures* across them; and
- the **internal structure** of one project spec — its capability folders, its `design/` rules,
  its `acceptance/` e2e suite, and its colocated unit suites. This is where structural
  **maintenance** now lives.

Because one project is one spec, the old **cross-spec** structural acts — deduping sibling specs,
splitting one spec out of another — are **retired** (see *History* below). What remains is
**intra-spec** maintenance: `concept-index` re-unifies a scattered concept, `place-node` advises a
new node's home, `check-spec-structure` audits node-shape (untagged orphans, oversized nodes), and
`align-spec` reconciles prose↔suite drift. None of these reads runtime behavior or owns a lifecycle
state; none **gates** — they advise the Warden or reconcile prose/scenarios.

**Intra-spec reorg is plain editing (ruling E).** Reorganizing the internal structure of one
project spec — moving a capability folder, regrouping files (folders are views) — is **plain
editing**: no new gate, no formation ratification, since no scenario's truth changes and folders
carry no lifecycle state. (`deprecate`/retire is a lifecycle act owned by
`../design/lifecycle-model.md`, not a corpus tool.)

## Units

This capability hosts several **units of code** (skills). The unit of test is the skill — **one
`.feature` per unit**, named for the unit and colocated with the unit's spec in its own folder.
The freeze grain is per `.feature` file, so units freeze independently. Cross-capability outcome
(e2e) scenarios live in `../acceptance/`, never here.

| Unit | Type | Spec | Role |
|---|---|---|---|
| **discovery** | behavioral | [`discovery/`](./discovery/README.md) | find specs at the **three SDD spec locations** (`.agents/spec`, `.agents/specs/<project>`, `<project-path>/.agents/spec`), confirmed by lifecycle `status` shape; read frontmatter only and emit a TOON list; match a name to a folder slug, disambiguate with the user |
| **digest** | behavioral | [`digest/`](./digest/README.md) | a read-only, fixed-section summary of one spec (What / Status / Scenarios / Key decisions / Open items) |
| **concept-index** | behavioral | [`concept-index/`](./concept-index/README.md) | scan every node's `concept:` frontmatter and render the **by-concept view** in the root `spec.md` — re-unify a concern the folder tree scatters; `--write`/`--check`, pure derivation |
| **place-node** | behavioral | [`place-node/`](./place-node/README.md) | advise a **new** node's provisional capability home (where the concept's facets already sit) and catch name duplicates; read-only, finalized at handoff |
| **check-spec-structure** | behavioral | [`check-spec-structure/`](./check-spec-structure/README.md) | audit one spec's **node-shape** — untagged orphans (blocking) + oversized nodes (advisory) — and emit a finding set for the Warden; read-only |
| **align-spec** | behavioral | [`align-spec/`](./align-spec/README.md) | the one **user-invocable** / CI tool — detect prose↔suite drift across the project spec's nodes, and **reconcile** it (never writing `status`/`approval`/freeze) |

## Boundaries

- **Tooling, not process.** These tools compute and propose. The act — splitting an oversized node,
  reconciling a contradiction corpus-wide — belongs to
  [`../formation/`](../formation/README.md), which runs continuously and owns the ratification
  verdict. The per-spec structural verdict at a gate is a separate thing.
- **No lifecycle ownership.** Nothing here writes `status`, `approval`, or a freeze. Discovery,
  digest, concept-index, place-node, and check-spec-structure are read-only and emit views or
  proposals. `align-spec` may write **prose / scenarios** in reconcile mode, but still never
  `status`/`approval`/freeze — a fix that would narrow a frozen scenario escalates as a **Clearance**
  CR instead.
- **Authoring and retirement stay elsewhere.** Scaffolding a node is `../authoring/` (explore);
  `deprecate`/retire is a lifecycle act (`../design/lifecycle-model.md`). No corpus tool writes
  spec bodies except `align-spec` in reconcile mode.

## History

The corpus once carried two cross-spec tools — **`dedupe-specs`** (find overlap across sibling specs
and propose a survivor + folds) and **`split-spec`** (split an oversized spec into a project spec +
feature children). Both were **retired** when the model collapsed to **one project = one spec**:
deduping and splitting *across* specs no longer applies. Their living concepts moved intra-spec —
oversized-node detection into `check-spec-structure`, contradiction reconcile into `align-spec` and
the Warden's judgment.
