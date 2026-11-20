# ADR-0037: SDD v2 keeps the terms "design spec" and "functional spec"

## Status

Accepted

**SDD version:** v2 (`packages/cyber-sdd`, `sdd2`).

## Context

SDD v2 splits a capability's specification into two rungs: a high-level **design spec** and a
lower-level **functional spec**. The executable suite goes with the functional spec, colocated with
the implementation, the way a test sits beside its code. The `spec` skill writes the design spec
only.

Both names are already in use. The v2 glossary defines them
([`packages/cyber-sdd/GLOSSARY.md`](../../packages/cyber-sdd/GLOSSARY.md), entries **rung**,
**functional spec**, and **split**). The design-spec research uses them throughout, and its D11
keeps the design spec notation-free
([`.research/design-spec-criteria/conclusion.md`](../../.research/design-spec-criteria/conclusion.md)).

SDD v2 is the two-set instance of the [truss](https://github.com/cyberuni/cyber-truss) model, and
truss does not commit to these names. Its 2026-11-04 P10 ruling folds in the split between a design
spec, a functional spec, and code and test, with "engineering names used as examples"
(cyber-truss `.research/monotone-co-design/changes.md`). Its Specification page says the rungs are
"usually three: a design spec, a functional spec, and code and test. Those names are an example"
([Specification](https://cyberuni.github.io/cyber-truss/model/specification/)).

So the question is whether v2 keeps the two names or waits for truss to name its rungs.

## Decision Drivers

- The skill, the glossary, and the research already speak these names. A rename buys nothing a
  reader can use.
- Engineering readers already know both terms.
- The truss glossary must not drift from truss, and truss names no rungs.

## Considered Options

### Option 1: Keep "design spec" and "functional spec" in SDD v2 (chosen)

- **Pros**: matches the existing v2 text; familiar to the readers v2 serves.
- **Cons**: if truss later names its rungs, v2 holds a local name beside the upstream one.

### Option 2: Use neutral rung names, such as "upper rung" and "lower rung"

- **Pros**: cannot conflict with any future truss naming.
- **Cons**: says nothing about what each rung holds, and every existing v2 document needs a rewrite.

## Decision

Option 1. SDD v2 uses the names **design spec** and **functional spec** for its two specification
rungs, as `packages/cyber-sdd/GLOSSARY.md` defines them.

The relationship to truss is one-way:

- **SDD v2 uses the names.** They are SDD 2 vocabulary.
- **Truss keeps them as examples only.** Truss commits to no names for its rungs, and this decision
  asks it to commit to none.

D11's "do not write a feature file" means no `.feature` suite beside the **design spec**. It does
not forbid an executable suite: that suite belongs to the functional spec, beside the
implementation.

## Consequences

### Positive

- The v2 glossary, the `spec` skill, and the research stay as written.
- A reader of v2 knows which rung a document is from its name.

### Negative

- If truss adopts other names for its rungs, the v2 glossary must state the mapping.

## Related Decisions

- [ADR-0033](0033-name-the-three-spec-levels.md): SDD v1's spec levels (corpus, project spec,
  node). Those levels name where a spec sits in a project tree, not a rung, and do not apply to v2.
- [ADR-0034](0034-colocate-the-node-spec-keep-the-frozen-suite.md): SDD v1's frozen `.feature`
  suite. In v2 the executable suite belongs to the functional spec.
