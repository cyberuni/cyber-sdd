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
One entry per distinct way the capability is invoked, each **named to its implementation surface**
(a CLI verb, a public function, an endpoint) and carrying four parts: **actor / goal**, the
**entry point** (trigger / inputs / outcome), and its **extensions**. Naming the impl surface keeps
the spec, the suite, and the code on **one screaming structure**: the builder gives each use case
its own module, so each change stays local.

A use case answers *"who is trying to do what, how do they invoke it, and what else can happen?"* —
never *"given this state, does it do that?"* (that is a scenario).

**Enumerate by actor, never by entry point.** Walking the interface and asking who calls each entry
point can only return use cases the interface already implies — it reproduces the surface and calls
it a requirement, and it is structurally blind to the use case nobody has built yet. So the section
is derived the other way round:

1. **List the actors** — every person in a role, sibling capability, scheduler, or operator that
   reaches this capability, **plus** whoever is affected by its outcome without invoking it (the
   reviewer, the on-call, the next agent in a chain). The second group are stakeholders rather than
   actors and are where a missed use case usually hides.
2. **Per actor, name the goals** they come to this capability with — their result, not the call they
   make.
3. **Then map goals to entry points.** A goal with **no** entry point is the finding this ordering
   exists to surface: either the capability is missing a way in, or the goal belongs to another
   node. An entry point serving **no** listed actor's goal is the mirror finding — it is surface
   nobody asked for.

The enumeration is checkable both ways: an actor carrying no use case, and a use case whose actor
is absent from the list, are each a hole. On **backfill** the source yields only the *served* use
cases by construction — recover the unserved ones from the request history, the issue tracker, and
recurring workarounds, and record where each came from.

- **Actor and goal — one line each, not a persona.** Name who invokes it (a person in a role,
  another capability, a scheduler) and the outcome **they** want, stated as their result rather
  than the mechanism ("recover the work after a crash", not "calls `resume()`"). An actor may be
  an agent or a sibling capability; that is normal, not a degenerate case. Where the goal restates
  the function name, the use case has not been found yet — it has been renamed.
- **Entry point** — the trigger, its inputs, and the success outcome. A table is the usual form.
- **Extensions — what else can happen, and the instrument that finds it.** An extension is **any
  path from this use case's trigger that does not reach its success outcome**; state each with its
  cause and its outcome. That criterion decides membership — the recurring kinds (an error, a
  refusal, a boundary, a partial result, a contended or absent input) are a **prompt to search, not
  a closed set**, so a divergence matching none of them still belongs and a kind that cannot arise
  here is not owed a row. **A use case with no extensions is a claim that nothing can go wrong** —
  state that claim explicitly (`extensions: none — <why>`) rather than leaving the field off, so a
  reviewer can disagree with it.

  Extensions are a **discovery instrument, not a second specification.** They exist to make the
  **CFG complete**: a graph drawn from an implementation reproduces what the code already does and
  can never tell you a branch is *missing*, whereas asking what can go wrong **for this actor**
  finds it. So every extension you find belongs in `## Control Flow` as a path, and the scenarios
  still derive from **the CFG alone** (`## Scenario map`, 1:1 on the **(path class, edge)** pair).
  Never draw a scenario from the stated list directly: a suite derived from prose is 1:1 with that
  prose by construction and can no longer surface a hole. A use case is therefore **not** 1:1 with
  a scenario — one extension may need several scenarios where several path classes reach it, and
  several extensions may reconverge onto one.

**Every element of the public surface traces to a use case that needs it.** List each element the
capability exposes — a flag, an option, a parameter, a prop, an event — against the use case
requiring it, and name the elements it **may not** be combined with. An element **no use case needs
is unjustified**: cut it, or name the use case. A pair whose combination is contradictory and
unstated is a gap, not a detail. This is the same orphan-detection discipline as `## Scenario map`,
applied one level up: there, a scenario with no edge is an orphan; here, an element with no use case
is an orphan.

Degenerate cases stay cheap. A capability exposing **one** entry point and **no** optional elements
carries the surface trace in a line, not a table — the obligation is that nothing on the surface is
unaccounted for, never that a table exists. A single-actor capability lists one actor; the
enumeration is the discipline, not the length.

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
- **Name the scenario in backticks.** The `Scenario` cell holds the scenario's title **backtick-wrapped**
  (`` `send text types literal text and presses no Enter` ``). This is how `check-suite` tells a data
  row from the header and separator: a data row whose `Scenario` cell is **not** backtick-wrapped is
  reported as an **unparseable row**, not silently skipped — a map that reads complete but binds nothing
  is the exact gap the map exists to prevent.
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
2. **A use case is actor + goal + entry point + extensions**, named to its impl surface (CLI verb /
   function / endpoint) — spec, suite, and code share one screaming structure. No extensions is a
   claim, stated explicitly. **Every surface element traces to a use case that needs it**, with its
   forbidden combinations named; an element no use case needs is an orphan — cut it or justify it.
3. **The CFG is shared** — use cases enter it (many-to-one); section by sub-graph only when the
   decision logic genuinely differs.
4. **The scenario map is 1:1 and grouped by use case** — coverage visible per use case; `check-suite`
   lints it.
5. **A `@pinned` behavior enters as a seed** the agent grows the CFG around.
6. **Plain language is a gate bar** — a reader with no domain context follows the spec (and its
   suite) on first read; define every term, simplify the writing not the domain.
