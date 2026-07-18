---
name: spec-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Spec-Format Governance — the spec.md structure bar

Universal bar for how a `spec.md` is **structured**. The spec-producer self-aligns to it before
writing; the spec-judge grades structure backward at the spec gate. Owns no `.feature` (that form is
`sdd:suite-format-governance`); owns no spec *granularity* (a corpus-organization concern). A
behavioral node is organized as **use-case groups**; a descriptive index or reference artifact
carries none of the below.

## Section by use-case group

Section the spec by **use-case group** — a nameable cluster of related entry points, named by intent
(screaming architecture; never by layer or output format). Open with the frame a table cannot hold:

- **Subject** — one line naming the territory the groups exercise.
- **Non-goals** — one line on what the spec deliberately excludes.

Each group carries three views of one capability — **use cases**, a **logic graph**, and a
**scenario map** — and the `.feature` mirrors the groups as `# ── <group> ── ` sections.

## Each group: use cases → logic graph → scenario map

- **Use cases** — the group's **entry points**, one per distinct way the subject is invoked, as
  **trigger / inputs / outcome** (table, prose, or EARS — whichever reads best). A use case answers
  *"when, and with what, is this invoked?"* — never *"given this state, does it do that?"* (that is a
  scenario).
- **Logic graph** — the **decisions** the capability makes once invoked, **drawn** as a fenced
  Mermaid decision graph: nodes are decisions, edges are branches. This is the coverage map a
  reviewer reads at the gate. Draw it whenever the group has real decision structure; a single-branch
  group may state the decision in a line.
- **Scenario map** — an **explicit maintained table** binding each **graph edge → its covering
  scenario(s)** in the `.feature`. Every edge has at least one scenario; every scenario binds to one
  edge. This table is what `check-suite` lints (edge with no scenario = coverage hole; scenario off
  the map = orphan) and what the Builder bar judges coverage against.

A `@pinned` (user-owned) behavior the graph did not reach enters as a **seed**: the agent grows the
graph around it and adds the discovered edges to the map (`sdd:suite-format-governance`).

## Layout & enrichment — legible to a non-engineer

`spec.md` is reviewed at the gate, including by a non-engineer (a PM, a stakeholder):

- **Draw the picture** — beyond the required logic graph, add a diagram wherever it carries an idea
  better than prose (architecture, sequence, state, data flow).
- **Format for humans** — heading hierarchy, tables for comparisons, short paragraphs, callouts for
  the load-bearing decisions; never a wall of prose.
- **Readable vocabulary** — lead with the plain word, keep the specialized term as a parenthetical
  ("**safe to repeat** (idempotent)"); carry a short **Key terms** glossary when the spec leans on
  several. A spec a non-engineer cannot follow fails legibility.

Enrichment applies to `spec.md` only; the `.feature` stays plain Gherkin.

## Key points (read-check)

1. **Section by use-case group** — named by intent (screaming), never by layer or output format.
2. **Each group is three views** — use cases (entry points), a **drawn logic graph** (decisions), and
   a **scenario-map** table.
3. **The scenario map is an explicit 1:1 table** — graph-edge → covering scenario — the coverage
   contract `check-suite` lints.
4. **A `@pinned` behavior enters as a seed** the agent grows the graph around.
5. **Legible to a non-engineer** — plain word + parenthetical, a Key terms glossary when needed.
