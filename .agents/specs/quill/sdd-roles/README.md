# sdd-roles/ — the Quill SDD production-chain delegates

Quill as the SDD plugin for documentation domains: the delegate roles it implements (plugin-contract), plus the
shipped actor bar they are graded against. Each role is a behavioral unit judged by its own suite; the bar is a
reference artifact with no suite of its own.

> **This README is a `descriptive` capability index** — no `spec-type` marker, no `.feature`, no `## Use
> Cases`; each behavior lives in a **behavioral** unit below.

## Units

| Unit | Type | Role | Agent |
|---|---|---|---|
| [`spec-writer/`](./spec-writer/README.md) | behavioral | spec-producer | `quill-spec-writer` |
| [`doc-writer/`](./doc-writer/README.md) | behavioral | impl-producer | `quill-doc-writer` |
| [`judge/`](./judge/README.md) | behavioral | impl-judge | `quill-judge` |
| [`doc-spec-bar/`](./doc-spec-bar/README.md) | reference | `builder-spec` governance | `quill-builder-spec` |

The `spec-judge` and `plan-producer`/`solution-producer` roles degenerate to their SDD defaults (the cold
`sdd-spec-judge`; `plan-producer-governance` run inline) — Quill binds no delegate for them.

`doc-spec-bar/` is the odd one out by design: it is a **governance**, not a role. It sits here rather than in
`design/` because it is a shipped artifact filling a squad `governances` slot, and it sits beside the roles
because both faces that read it — `spec-writer` forward, `spec-gate` backward — are production-chain concerns.
