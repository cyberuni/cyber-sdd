---
name: spec-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Spec-Format Governance — the spec.md structure bar

Universal bar for how a **behavioral** node's `spec.md` is structured. The spec-producer self-aligns
to it before writing; the spec-judge grades structure backward at the spec gate. The layout law it
sits inside — spec types, the four folder kinds, screaming architecture — is
`design/spec-structure.md`; this bar owns one node's `spec.md`. A descriptive index or reference
artifact carries none of the sections below.

## The four sections, in order

### `## What`
The overview: what the capability is, the problem it solves, who has it — plus **Non-goals** (what it
deliberately excludes). One or two short paragraphs; add a **Key terms** glossary when it leans on
jargon. Legible to a non-engineer.

### `## Use Cases`
The **entry points** — one row per distinct way the capability is invoked, each **named to its
implementation surface** (a CLI verb, a public function, an endpoint), given as
**trigger / inputs / outcome**. A use case answers *"when, and with what, is this invoked?"* — never
*"given this state, does it do that?"* (that is a scenario). Naming the impl surface keeps the spec,
the suite, and the code on **one screaming structure**: the builder gives each use case its own
module, so each change stays local.

### `## Logic`
The **decision graph** the capability runs once invoked, **drawn** as a fenced Mermaid graph — nodes
are decisions, edges are branches. Use cases **enter** this graph, and several usually share it
(many-to-one). When use cases run genuinely distinct decision logic (common for CLI verbs), section
`## Logic` by sub-graph and have each use case name the one it enters. A single-branch capability may
state its decision in a line.

### `## Scenario map`
The **explicit maintained table** binding each **branch → its covering scenario** in the suite,
**grouped by use case**. 1:1 — every branch has exactly one scenario, every scenario one branch. The
grouping makes coverage **visible per use case**: an uncovered surface is a hole, not a silent gap in
prose. `check-suite` lints it. A `@pinned` behavior the graph did not reach enters as a **seed** the
agent grows the graph around, adding the discovered branches to the map.

## Plain language — a gate requirement, not a nicety

`spec.md` is reviewed at the gate, so plain language is a bar it must clear. Write so a **smart
reader with no domain context follows it on the first read**:

- **Simplify the writing, never the domain.** Domain concepts are essential — define each in plain
  words, never drop one to sound simpler. Jargon, long sentences, and unexplained acronyms are
  accidental — drive them to zero.
- **Lead with the plain word**, keep the specialized term as a parenthetical ("**safe to repeat**
  (idempotent)"); carry a **Key terms** glossary when the spec leans on several.
- **Short sentences, concrete over abstract.** Draw a diagram wherever it beats prose; format with
  headings, tables, and callouts for the load-bearing decisions.

The same bar binds the **suite**'s scenarios — plain `Given/When/Then` the same reader can follow.
Enrichment (diagrams, formatting) is `spec.md` only; the suite stays plain Gherkin.

## Key points (read-check)

1. **Four sections in order** — `## What` (overview + non-goals), `## Use Cases`, `## Logic`,
   `## Scenario map`.
2. **A use case is an entry point named to its impl surface** (CLI verb / function / endpoint) — spec,
   suite, and code share one screaming structure.
3. **The logic graph is shared** — use cases enter it (many-to-one); section by sub-graph only when
   the logic genuinely differs.
4. **The scenario map is 1:1 and grouped by use case** — coverage visible per use case; `check-suite`
   lints it.
5. **A `@pinned` behavior enters as a seed** the agent grows the graph around.
6. **Plain language is a gate bar** — a reader with no domain context follows the spec (and its
   suite) on first read; define every term, simplify the writing not the domain.
