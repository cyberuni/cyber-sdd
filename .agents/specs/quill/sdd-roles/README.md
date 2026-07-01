# sdd-roles/ — the Quill SDD production-chain delegates

Quill as the SDD plugin for documentation domains: the delegate roles it implements (plugin-contract). Each is
a behavioral unit judged by its own suite.

> **This README is a `descriptive` capability index** — no `spec-type` marker, no `.feature`, no `## Use
> Cases`; each behavior lives in a **behavioral** unit below.

## Units

| Unit | Type | Role | Agent |
|---|---|---|---|
| [`spec-writer/`](./spec-writer/README.md) | behavioral | spec-producer | `quill-spec-writer` |
| [`doc-writer/`](./doc-writer/README.md) | behavioral | impl-producer | `quill-doc-writer` |
| [`judge/`](./judge/README.md) | behavioral | impl-judge | `quill-judge` |

The `spec-judge` and `plan-producer`/`solution-producer` roles degenerate to their SDD defaults (the cold
`sdd-spec-judge`; `plan-producer-governance` run inline) — Quill binds no delegate for them.
