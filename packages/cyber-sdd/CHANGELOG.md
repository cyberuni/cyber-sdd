# cyber-sdd-2

## 0.3.0

### Minor Changes

- 2a98edd: The `spec` skill gains a Preview route. It renders the whole spec as one page linked by ID, then builds the artifact the spec specifies from the spec alone; each place the build has to guess is a blind spot, fixed in the spec or put under Open questions. A source document with no spec yet is drafted to a scratch folder first. The steps live in `references/preview.md`. A parent criterion that holds for every use case under it can cite `UC*`, which V5 expands to every use case of the parent and its children. A bare ID always means the spec's own, and a linked source's IDs are cited with the source's name. C10 now requires evidence that a criterion depending on an external system can be met; a linked source that verified it counts. A source that already uses IDs from an earlier draft keeps them, and the split steps put the table of children under the parent's Use cases and give the parent an outcome of its own, not the sum of its children's. A run that makes several independent decisions draws one flowchart per decision.
- dcede55: The `spec` skill researches the idea, its feasibility, and prior art once What and Actors and goals are agreed, through the overridable `research.method` reference (default: `research-workbench:deep-research`). The artifact is linked under References, or a small change records the skip and its reason; criterion C10 and Validate check V14 hold a ready spec to that.
- 1ee99f4: The `spec` skill now tells the two relationships between specs apart. A rung relation runs from the design spec to the functional spec beneath it. It is not parent and child, and it is not one to one, and the skill shows what each rung is named for, where it lives, and what its use cases are. A split stays on one rung, so a child is a design spec, never the functional spec. "Lower rung" now reads "a lower rung", since the functional spec and code and test are two rungs. The glossary gains rung (from truss), functional spec, and split.

### Patch Changes

- b395c9b: The `spec` skill declares an `argument-hint`: the mode and the capability, spec folder, or source document it works on.
- cf6b457: The `spec` skill's Derive tests steps move, unchanged, to `references/derive-tests.md`, which the skill loads only in that mode.
- 8d778cc: The `spec` skill's description opens with what it does in one short sentence and drops its lead-in, and its README records the research behind it.
- 4c57847: The `spec` skill's steps for splitting a spec move, unchanged, to `references/split.md`, which Write loads only when it splits a spec.

## 0.2.0

### Minor Changes

- b7ccdc9: `spec`: Write brackets each criterion with its strictest and most lenient reasonable reading and checks both against the use case's paths, applying the placement test before tightening. Review sends a criterion revised in two or more rounds through the placement test before revising it again.
- 34bca09: `spec`: a criterion's identity is its self-contained text. Its ID is a label; after the spec is first ready, changing the text (or a key term it names) retires the ID. Each criterion carries any context it depends on.
- 3b97743: `spec`: Derive tests may add a test that pins an encoding the spec leaves open, but changing what an existing test asserts goes to the owner. A new route sends a criterion whose verdict flipped on an unchanged state back to Write, to split its graph path after the placement test.
- 68ebed8: `spec`: the design spec holds the outcome and moves the encoding (names, codes, exit numbers, fields, flag syntax, wording) to the lower rung, unless the actor needs that particular encoding. It decides in prose only what building cannot settle. The `Adapters` group states what each adapter's actor needs, and tests pin the mapping to exit codes and streams.

## 0.1.0

### Minor Changes

- 55484fe: feat(sdd2): first release of SDD 2, with the `spec` skill
  
  `cyber-sdd-2@0.1.0` is a git tag, not an npm release: the package stays private, and the cyber-uni marketplace installs `sdd2` from this tag.
