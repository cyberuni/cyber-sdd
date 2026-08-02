---
spec-type: reference
concept: production-chain
---

# doc-spec-bar — the documentation contract bar

## Subject

The shipped governance `quill-builder-spec` (`plugins/quill/skills/quill-builder-spec/`) — Quill's
**Builder bar at the spec gate**, filling the `builder-spec` slot in the squad's registry entry and
unioning onto `sdd:builder-spec-governance`.

It specifies **what a documentation `spec.md` must contain**: an audience table (a role plus a goal),
a declared doc type (tutorial / how-to / reference / explanation), a north star carrying a falsifiable
failure mode, why the document exists, the key points it is incomplete without, non-goals with
forwarding addresses, and prerequisites. It also fixes what a doc spec must **never** freeze —
section order, wording, specific examples, tone.

A **reference artifact**: it is a real shipped thing with no testable surface of its own, so it
carries no `.feature`. Its criteria are exercised through the specs it grades, not through scenarios
of its own.

**Two faces read it.** `spec-writer` (`quill-spec-writer`) reads it forward while authoring;
`spec-gate` reads it backward while grading, since Quill declares `spec-judge: null` and the gate
enforces these criteria statically rather than dispatching a judge agent.

**Non-goals** — the four static checks a scenario must be verifiable by (that is
[`../../design/doc-eval-model.md`](../../design/doc-eval-model.md)); the `.feature` form
(`sdd:suite-format-governance`); the generic testability bar it unions onto
(`sdd:builder-spec-governance`); authoring any document (`doc-writer`).
