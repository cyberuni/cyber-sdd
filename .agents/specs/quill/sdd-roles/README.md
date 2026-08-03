# sdd-roles/ — the Quill SDD production-chain delegates

Quill as the SDD plugin for documentation domains: the delegate roles it implements (plugin-contract), plus the
two shipped actor bars they are graded against — one per gate. Each role is a behavioral unit judged by its own
suite; the bars are reference artifacts with no suites of their own.

> **This README is a `descriptive` capability index** — no `spec-type` marker, no `.feature`, no `## Use
> Cases`; each behavior lives in a **behavioral** unit below.

## Units

| Unit | Type | Role | Agent |
|---|---|---|---|
| [`spec-writer/`](./spec-writer/README.md) | behavioral | spec-producer | `quill-spec-writer` |
| [`doc-writer/`](./doc-writer/README.md) | behavioral | impl-producer | `quill-doc-writer` |
| [`judge/`](./judge/README.md) | behavioral | impl-judge | `quill-judge` |
| [`doc-spec-bar/`](./doc-spec-bar/README.md) | reference | `builder-spec` governance | `quill-builder-spec` |
| [`doc-impl-bar/`](./doc-impl-bar/README.md) | reference | `builder-impl` governance | `quill-builder-impl` |

The `spec-judge` and `plan-producer`/`solution-producer` roles degenerate to their SDD defaults (the cold
`sdd-spec-judge`; `plan-producer-governance` run inline) — Quill binds no delegate for them.

The two bars are the odd ones out by design: they are **governances**, not roles. They sit here rather than in
`design/` because each is a shipped artifact filling a squad `governances` slot, and they sit beside the roles
because both faces that read them are production-chain concerns — for `doc-spec-bar`, `spec-writer` forward and
`spec-gate` backward; for `doc-impl-bar`, `doc-writer` forward and `judge` backward.

**The two backward faces are not symmetric, and the difference matters.** `doc-impl-bar` is read by `judge`,
which is a behavioral node with its own suite, so that face is exercised. `doc-spec-bar`'s backward face is
`spec-gate` — and because Quill declares `spec-judge` unbound, no node here owns that gate-enforcement
behavior. Every criterion in `doc-spec-bar` is currently covered only as a **producer obligation**, never as a
gate rejection. See the formation finding recorded against this spec.
