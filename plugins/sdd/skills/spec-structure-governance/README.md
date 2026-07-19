# spec-structure-governance

This is an internal SDD governance about how a project specification is organized.

It answers two questions that are really one: **what kind of node is this spec**, and **where does
that kind live in the tree**. They cannot be separated — a rules document in `design/` is correctly
placed where a behavioral node in the same folder is a defect, and the folder alone does not tell you
which you are looking at.

## Usage

- **scaffold-project-spec:** lay out a new tree to it
- **place-node:** decide where a node belongs
- **formation Warden:** audit whether the corpus still matches it
- **architect bars:** judge placement at the spec and impl gates

Read `SKILL.md` beside this file for the law itself — that is what those four load.

## What it covers

- **The node taxonomy** — descriptive, reference artifact, behavioral artifact; declared in
  frontmatter, never guessed from which files happen to exist.
- **Placement** — screaming architecture (folders named for capabilities), the three deliberate
  non-capability folders, rules-in-design vs behavior-in-capability, the two-level depth cap, and
  the concept axis for anything that cuts across.
- **One spec per project** — and when a spec is hoisted out of its project directory rather than
  colocated in it.
- **Strategy is policy, homes are data** — the layout strategy is a choice, so it is declared once
  and read; which folder a concept lives in is a fact, so it is derived and never stored.

## What this bar does not own

| Concern | Owner |
| --- | --- |
| The sections inside one node's `spec.md` | `spec-format-governance` |
| How the `.feature` suite is written and judged | `suite-format-governance` |
| The states a spec moves through, and freezing | `lifecycle-governance` |
| Who may write which field | `ownership-governance` |

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
