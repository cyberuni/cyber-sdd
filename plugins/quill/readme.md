# Quill — Documentation SDD Plugin

Quill is an SDD plugin specialized in **documentation** — guides, tutorials, articles, reference pages, and READMEs. It applies spec-driven development to documentation work: define observable behavior in Gherkin, verify documentation exists and meets structural requirements, catch regressions before they ship.

## What it does

Documentation has the same failure modes as code: missing content, structural drift, reader-path gaps. Unlike code, there is no compiler or test runner for it. Quill fills that gap by treating documentation as an implementation artifact with verifiable structure.

Quill verifies a document with **two instruments**, split by how a verdict is reached: inspection
compares two structured artifacts, judgment simulates a reader.

**Inspection — boolean.** Four checks scoped to a scenario, one scoped to the whole document:

| Check | Scope | What it verifies |
|---|---|---|
| **Existence** | scenario | Target file or directory exists at the declared path |
| **Structure** | scenario | Required headings and sections are present |
| **Completeness** | scenario | No placeholder text (TBD, TODO, empty sections) |
| **Reader path** | scenario | Step-by-step flows reach a stated outcome without gaps |
| **Skipped option** | document | The document enumerates a set, and a later passage routes a case across that set without one of its members |

The fifth exists because the first four each read only the passage their scenario names, while some
defects are relations *between* passages. It is the one such defect whose two sides are both
enumerable, so deciding it is set difference rather than reading.

**Judgment — graded, and advisory until calibrated.** The remaining inter-passage defects read as
inspection but are not: a term predicated of a subject class that cannot take it, two passages whose
claims cannot both hold, a passage presupposing what the reader cannot retrieve. Deciding any of them
means reading *as a reader*. They are scored against a **defect catalog** in `quill-builder-impl` —
each entry naming what the judge must quote and a near-miss that must not fire — and the reader
simulation is dispatched to a separate context that never sees the catalog, so the judge is never its
own blind reader.

**Recurrence is not a defect.** An earlier version of this table led with *"no claim landed twice"*.
That is retracted on measured grounds: a reader arriving at a section from the sidebar never read the
earlier statement, so the "redundant" restatement was that reader's only copy of the claim.

## Domain types

Quill handles: `documentation`, `guide`, `tutorial`, `article`, `reference`

## Production-chain roles

Quill fills these SDD production-chain roles for its domain types:

| Role | Agent |
|---|---|
| spec-producer | `quill-spec-writer` |
| impl-producer | `quill-doc-writer` |
| impl-judge | `quill-judge` |
| spec-judge | `null` — degenerates to the SDD default, the cold `sdd-spec-judge`, which `spec-gate` spawns after resolving the slot |
| solution-producer | `null` — uses the SDD default (`solution-producer-governance`, run inline by the conductor) |

Register by running `init-quill` in a project that uses the `sdd` plugin.

## Skills

| Skill | When to use |
|---|---|
| `init-quill` | Register quill as the SDD plugin for documentation domain types in this project |

## Agents

| Agent | Role |
|---|---|
| `quill-spec-writer` | spec-producer — writes the spec.md body and the boolean `.feature` for doc domains |
| `quill-doc-writer` | impl-producer — writes the documentation **and its per-scenario acceptance checks** against the frozen `.feature` |
| `quill-judge` | impl-judge — **runs** the producer's acceptance checks per frozen scenario, plus the document-scoped inspection rule and the judged catalog |

## Governances

Quill ships two bars. Each **unions onto** its SDD default rather than replacing it, so the generic
SDD criteria still apply and these add what is specific to documentation:

| Bar | Gate | What it adds |
|---|---|---|
| `quill-builder-spec` | spec | what a documentation `spec.md` must contain — audience table, declared doc type, north star carrying its failure mode, key points, non-goals, prerequisites — and what it must never freeze (order, wording, examples, tone) |
| `quill-builder-impl` | impl | the document-scoped enumeration rule and the judged defect catalog — the criteria no per-scenario check can reach |

The unbound slots resolve to their SDD defaults; a producer loads its whole lens set, plugin bars and
SDD bars together, and declares what it loaded in its output packet.

## Installation

```bash
npx skills add cyberuni/cyberplace --plugin quill
```

Then run `init-quill` to register quill in `.agents/universal-plugin.json`.
