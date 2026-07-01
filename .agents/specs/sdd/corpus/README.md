# corpus/ — corpus-level tooling

The **tooling** that operates over the **corpus** — the *collection* of project-specs in a repo
(`.agents/specs/`: `sdd`, `aces`, `universal-plugin`, …). This is the **corpus** level of
`corpus ⊃ project-spec ⊃ node` (`../design/spec-structure.md`): a corpus-level action ranges
**across** project-specs. The intra-spec tier — everything that acts on **one** project-spec's
internal structure — lives under [`../project-spec/`](../project-spec/README.md).

> **This README is a `descriptive` capability overview — an index, not a testable spec**
> (see the spec types in `../design/spec-structure.md`). It carries no `spec-type` marker, no
> `.feature`, and no `## Use Cases`; each tool's behavior lives in a **behavioral** unit spec below.

## What "the corpus" is now

Under the one-project-spec model a single project is **one spec, one behavior suite, one
gate/freeze baseline**, organized into files and folders (folders are *views*, never lifecycle
units). The **corpus** is the set of sibling project-specs in a repo, each a root `spec.md` plus its
tree. At this level the tooling **lists** — it does not restructure across projects: because one
project is one spec, the old **cross-spec** structural acts (deduping sibling specs, splitting one
spec out of another) are **retired** (see *History* below). Structural **maintenance** now happens
one project-spec at a time, under [`../project-spec/`](../project-spec/README.md).

## Units

| Unit | Type | Spec | Role |
|---|---|---|---|
| **discovery** | behavioral | [`discovery/`](./discovery/README.md) | find specs at the **three fixed SDD spec locations** (`.agents/spec`, `.agents/specs/<project>`, `<project-path>/.agents/spec`) **plus any extra anchors declared in `spec-anchors`**, confirmed by lifecycle `status` shape; read frontmatter only and emit a TOON list; match a name to a folder slug, disambiguate with the user |
| **spec-anchors** | behavioral | [`spec-anchors/`](./spec-anchors/README.md) | declare & curate the **opt-in extra anchors** discovery scans (`.agents/sdd/spec-anchors.toml`): list fixed + custom, CRUD the custom ones, induce a pattern from a sample path, preview its match — a manage-level engine that writes only the config, never spec content (ADR-0019) |

## Boundaries

- **Lists, does not restructure.** `discovery` reads frontmatter across the corpus and emits a view;
  `spec-anchors` curates the discovery config. Nothing at this level writes spec bodies, `status`,
  `approval`, or a freeze — `spec-anchors` writes **only** its own config file
  (`.agents/sdd/spec-anchors.toml`), which is operational config, not spec content.
- **Intra-spec maintenance is elsewhere.** digest, concept-index, place-node, check-spec-structure,
  and align-spec operate on one project-spec — they live under
  [`../project-spec/`](../project-spec/README.md).

## History

The corpus once carried two cross-spec tools — **`dedupe-specs`** (find overlap across sibling specs
and propose a survivor + folds) and **`split-spec`** (split an oversized spec into a project spec +
feature children). Both were **retired** when the model collapsed to **one project = one spec**:
deduping and splitting *across* specs no longer applies. Their living concepts moved intra-spec —
oversized-node detection into `../project-spec/check-spec-structure/`, contradiction reconcile into
`../project-spec/align-spec/` and the Warden's judgment.
