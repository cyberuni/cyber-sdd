# spec-format-governance

This is an internal SDD governance about the project specification.

It describes how one capability's `spec.md` is structured and what it should contain.

Every behavioral spec in the project is written to the same shape, so a reader who has read one
knows where to look in any other. This governance is that shape.

## Where a spec lives — the folder structure

A `spec.md` never sits on its own. The project spec is a folder tree organized by **capability** —
the top-level folder names say what the project *does* (`gateway/`, `intake/`, `mission/`) — with
three folders that are deliberately not capabilities:

| Folder | Holds | Why it is not a capability |
| --- | --- | --- |
| `design/` | The **rules** — the model, and the *why*. | Describes the system rather than doing something in it. |
| `workflows/` | The **usage** — how the capabilities compose into whole flows. | Cuts across every capability instead of being one. |
| `ledger/` | The **provenance** — durable audit records. | Data, not a spec at all. |

Two rules shape the tree:

- **Two levels, never three.** A capability folder holds leaf units (`<capability>/<unit>/`), and
  that is as deep as it goes. When something inside a capability wants its own sub-grouping — a
  phase, a producer/judge pair — that grouping is a *cross-cutting concern*, so it is tagged with
  `concept:` frontmatter and recovered through the by-concept index rather than given a third
  folder level.
- **Rules in `design/`, behavior in the capability folder.** The rule a thing follows and the
  scenarios that enact that rule live apart, which keeps `design/` readable as a model while the
  capabilities stay testable as behavior.

Each leaf unit folder holds the `spec.md` this governance describes, its `.feature` suite alongside
it, and optionally a `.solution.md`.

The folder law itself — spec types, the folder kinds, screaming architecture, the depth cap — is
owned by **`design/spec-structure.md`**, not by this bar. It is summarized here so the file
structure below has somewhere to sit.

## What it requires — the file structure

A `spec.md` has **four sections, in this order**:

| Section | What goes in it |
| --- | --- |
| `## What` | What the capability is, the problem it solves, who has that problem, and what it deliberately does not do (non-goals). |
| `## Use Cases` | Every distinct way the capability is invoked — one row each, as trigger / inputs / outcome. Each is named after the thing you actually call: a CLI verb, a function, an endpoint. |
| `## Logic` | The decisions the capability makes once invoked, **drawn** as a diagram rather than described in prose. Use cases feed into this one graph; several usually share it. |
| `## Scenario map` | A table pairing each branch in that diagram with the one test scenario covering it, grouped by use case. One-to-one, both directions — so a gap in coverage is visible instead of buried in prose. |

It also sets a **plain-language bar**: a smart reader with no background in the domain should follow
the spec on the first read. Simplify the writing, never the domain — define the domain terms in
plain words instead of dropping them. This is a gate requirement, not a style preference, because
`spec.md` is what gets reviewed.

Descriptive indexes and reference documents are exempt — they carry none of these sections.

## Usage

- **spec-producer:** how to write the spec
- **spec-judge:** grade the spec structure and content at the **spec-gate**

## Related governances

This bar owns the layout of a **single** `spec.md`. Its neighbors own everything around that:

- **`design/spec-structure.md`** — the layout law this sits inside, and the owner of the folder
  structure summarized above: spec types, the folder kinds, screaming architecture, the depth cap.
- **`suite-format-governance`** — how the `.feature` suite itself is written (Gherkin form, rubrics,
  scenario ordering).
- The **corpus-organization** bar — how big a spec should be in the first place.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
