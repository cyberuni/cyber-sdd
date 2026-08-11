---
spec-type: reference
concept: spec-authoring
---

# spec-format — the spec.md structure bar

A **reference artifact**: the `spec-format` governance — the universal bar for how a `spec.md` is
*structured*. It is loaded by the spec-producer (self-align) and the spec-judge (verify), and owns
no `.feature`: its conformance is checked through the spec-judge's verdict on real specs, not
through a suite of its own.

## Subject

- **Artifact** — the `spec-format` governance, shipped as the `spec-format-governance` skill (a
  fixed-universal SDD governance; `../../design/governance-resolution.md`).
- **Contract surface** — every `spec.md` in any SDD project: the sections it must carry and how it
  is laid out for human review.
- **Conformance** — verified by the **spec-judge** at the spec gate (it applies this bar backward),
  never by this artifact itself. A reference artifact carries this `## Subject` in place of a
  `## Use Cases` section and a `.feature`. When a **behavioral** `spec.md` is missing a required
  section — **especially `## Use Cases`, `## Control Flow` (the CFG), or `## Scenario map`** — the
  judge emits a **conformance warning** naming the missing sections, surfaced in the gate report
  (non-blocking; `../spec-gate/README.md`). A `reference` or `descriptive` node carries none of the
  four behavioral sections and so raises no such warning.
- **Boundary** — the `.feature` Gherkin/rubric form and scenario ordering belong to `suite-format`;
  spec *granularity* (when a spec grows too big → carve it into more folders/units) belongs to
  `../../design/spec-structure.md`. This bar owns only `spec.md` structure.

## The required `## Use Cases` section

Every **behavioral** `spec.md` carries a dedicated `## Use Cases` section; a descriptive index or
a reference artifact carries none (`../../design/spec-structure.md`). Open it with the frame
a table cannot hold, then list the use cases:

- **Subject** — one line naming the territory these use cases all exercise.
- **Non-goals** — one line on what the spec deliberately excludes, wherever the boundary isn't
  self-evident.

**Enumerate by actor, never by entry point.** Walking the interface and asking who calls each entry
point returns only the use cases that interface already implies — it reproduces the surface and is
blind to the use case nobody built. So the section is derived the other way round: **list the
actors** (everyone who reaches the capability, plus whoever is affected by its outcome without
invoking it), **name each actor's goals**, then **map goals to entry points** and report both
mismatches — a goal no entry point serves, and an entry point no listed goal reaches. The
enumeration **closes both ways**: an actor carrying no use case, and a use case whose actor is
absent from the list, are each a hole. On a backfill, source yields only the *served* use cases by
construction; the unserved ones come from the request history and recurring workarounds, and an
inferred set is never reported as complete.

A **use case** is coarse-grained — one per distinct way the subject is invoked — and carries four
parts: **actor / goal**, its **entry point** (trigger / inputs / outcome, as a table, prose, or EARS
templates; whichever reads best), and its **extensions**. A use case is **not** a scenario: a use
case answers *"who is trying to do what, how do they invoke it, and what else can happen?"* and
lives in `spec.md`; a scenario answers *"given this exact situation, does it do that — yes/no?"*
and lives in the `.feature`.

- **Actor and goal** — one line each. Who invokes it (a person in a role, another capability, a
  scheduler) and the outcome **they** want, stated as their result rather than the mechanism. A goal
  that restates the operation has renamed the function, not found the use case.
- **Extensions** — **any path from the use case's trigger that does not reach its success
  outcome**, each with its cause and its outcome. That criterion decides membership; the recurring
  kinds (the refusal, the error, the boundary, the partial result, the contended or absent input)
  are a prompt to search, **not a closed set**. A use case with **no** extensions asserts nothing
  can go wrong — write `extensions: none — <why>`, so a reviewer can disagree with the claim
  instead of overlooking its absence.

**Every element of the public surface traces to a use case that needs it.** Each flag, option,
parameter, prop, or event names the use case requiring it and the elements it **may not** be
combined with. An element no use case needs is an **orphan** — cut it or name the use case; the
Oracle bar's verdict on unbought surface is cut-or-justify, and the Architect bar requires the CFG
to carry the guard that refuses a stated forbidden combination. This is `## Scenario map`'s
orphan-detection one level up. A capability with **one** entry point and **no** optional elements
records the trace in a line: the obligation is that nothing on the surface is unaccounted for,
never that a table exists.

The relationship is **one-to-many**: each use case is covered by one-or-more scenarios. Those
scenarios are derived from the **CFG**, never from this section — a stated extension earns its
scenario by being a path in the graph (`../../common-governances/builder/README.md`), so the happy
path, the negative mirror and the boundary all arrive as edges. A scenario with no use case is an orphan test; a use case with no
scenarios is unverified intent. The spec-producer writes the section and covers each use case; the
spec-judge checks the section exists and the mapping holds.

**The row→scenario link (mechanically checked).** When the section is written as a **table**, each
row names its covering scenario in a `Scenario` cell — the backtick-wrapped `Scenario:` title (or a
shared `@tag`) that verifies it. The gate runs a deterministic pre-filter over each touched behavioral
`spec.md`: every table row's named scenario must resolve to a real `Scenario:` in the sibling
`.feature`, and an unresolved link **fails the gate closed before the cold judge is spawned**. This
mechanizes the recurring coverage gap (prose asserting behavior no scenario covers, caught only at the
cold judge). It is **non-mandating**: a use case written as prose or EARS carries no row to link, so
the mechanical check stays silent and the spec-judge remains its coverage backstop — table form is the
form that buys the mechanical assist, never a requirement.

## Layout & enrichment

`spec.md` is a document a person reviews at the gate — including a **non-engineer** (a PM, a
stakeholder) — so legibility is part of the bar. The producer **actively enriches** it — never a
wall of prose:

- **Draw the picture** where a diagram carries the idea better than words (architecture, sequence,
  state, data flow, control-flow) — a fenced Mermaid (or equivalent) diagram.
- **Format for humans** — clear heading hierarchy, tables for structured comparisons, short
  paragraphs, callouts for the load-bearing decisions.
- **Readable vocabulary — assume the reader does not know the jargon.** Never leave a specialized
  term undefined — an acronym, a domain or computer-science term, a framework noun, an internal
  codename. Lead with the **plain word** and keep the specialized term as a **parenthetical** for the
  reader who already knows it — e.g. "the step is **safe to repeat** (idempotent)". When a spec leans
  on more than a couple of such terms, carry a short **Key terms** glossary near the top, defining —
  one plain sentence each — every term the `spec.md` *and its `.feature`* rely on. A spec a
  non-engineer cannot follow fails legibility.

Enrichment applies to `spec.md` only; the `.feature` stays plain boolean Gherkin (`suite-format`).
