---
name: spec-format-governance
description: "Partial Skill: invoke by name only"
user-invocable: false
---

# Spec-Format Governance — the spec.md structure bar

Universal bar for how a **behavioral** node's `spec.md` is structured. The spec-producer self-aligns
to it before writing; the spec-judge grades structure backward at the spec gate. The layout law it
sits inside — spec types, the four folder kinds, screaming architecture — is
`sdd:spec-structure-governance`; this bar owns one node's `spec.md`. A descriptive index or reference
artifact carries none of the sections below.

## The four sections, in order (plus one optional)

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

### `## Control Flow`
The **control-flow graph (CFG)** the capability runs once invoked, **drawn** as a fenced Mermaid
graph — nodes are decisions, edges are branches. Use cases **enter** the CFG, and several usually
share one (many-to-one). When use cases run genuinely distinct decision logic (common for CLI verbs),
section `## Control Flow` by sub-graph and have each use case name the one it enters. A single-branch
capability may state its decision in a line.

### `## Scenario map`
The **explicit maintained table** binding the CFG to the suite, **grouped by use case**, with three
columns — **`| Edge | Path (Given) | Scenario |`**. The unit is the **(path class, edge)** pair, not
the edge alone: a scenario's `Given` is the path reaching the edge, its `When` is the edge under test
(`sdd:suite-format-governance`).

- **1:1 scenario↔row** — every scenario has exactly one row, every row one scenario.
- **An edge may carry several rows.** That is **permutation coverage**, not duplication — legitimate
  when each row's path class yields a *different* outcome. Same edge *and* same path class twice is a
  duplicate.
- **Collapse reconverged paths.** Where the outcome does not depend on which upstream branch was
  taken, one row covers them all; write the path as the reconvergence point (or `any`), never the
  route. Naming state the outcome does not depend on manufactures a false permutation.
- An edge with **no** row is a coverage hole; a scenario with **no nameable edge** is not acceptance
  and does not belong in the suite.

Three columns make the shape legible at a glance: a `Path` column reading `any` is a **convergence**
claim (the outcome does not vary), and an edge repeated with different paths shows exactly which
distinctions the contract cares about. The grouping keeps coverage **visible per use case** — an
uncovered surface is a hole, not a silent gap in prose. `check-suite` lints it. A `@pinned` behavior
the CFG did not reach enters as a **seed** the agent grows the CFG around, adding the discovered
edges to the map.

### On backfill — draw the CFG and the scenario map, don't stop at Use Cases
When the implementation already exists (a **backfill**), the four sections are **still mandatory**.
Read the source, then **draw the `## Control Flow` CFG from the code** and its 1:1 `## Scenario map` —
a spec that stops at `## Use Cases` has named its entry points but neither the decisions the
capability takes nor their coverage. The suite is **re-derived from that CFG**, not patched from the
standing one (`sdd:suite-format-governance`). `check-spec-structure`'s `incomplete-node` flags a
behavioral leaf that skips a required section.

### `## References` *(optional — any spec-type)*
Where a decision in this node rests on **research or an external standard**, cite it here: the source
and **what it backs**. Not a bibliography — a line earns its place only by carrying a decision that
would otherwise read as taste.

- **Cite the claim, not the topic.** "Vague steps produce defensive step definitions carrying flags,
  so a `Given` must be buildable — [source]" beats "see [source] on BDD".
- **External sources only.** A sibling spec, a `design/` model doc, or a governance is a normal
  in-body reference, not a research citation.
- **Optional and rare.** Most nodes decide from the domain and cite nothing. An empty section is
  omitted, never stubbed.
- **Not the design record.** A chosen-vs-rejected design fork belongs in the unit's
  `<unit>.solution.md`; `## References` records the *evidence consulted*, which outlives the fork.

It is the last section, after `## Scenario map` (or after `## Subject` on a reference artifact).
Reason: a reader wants the contract first and the provenance only when they question it.

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

1. **Four sections in order** — `## What` (overview + non-goals), `## Use Cases`, `## Control Flow`,
   `## Scenario map` — plus an optional `## References` last, citing research that backs a decision
   (the claim it supports, not the topic).
2. **A use case is an entry point named to its impl surface** (CLI verb / function / endpoint) — spec,
   suite, and code share one screaming structure.
3. **The CFG is shared** — use cases enter it (many-to-one); section by sub-graph only when the
   decision logic genuinely differs.
4. **The scenario map is 1:1 and grouped by use case** — coverage visible per use case; `check-suite`
   lints it.
5. **A `@pinned` behavior enters as a seed** the agent grows the CFG around.
6. **Plain language is a gate bar** — a reader with no domain context follows the spec (and its
   suite) on first read; define every term, simplify the writing not the domain.
