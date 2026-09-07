# backfill-workflow

The SDD **backfill workflow** — the ordered procedure the spec-producer runs when the behavior it is
specifying already exists in code.

- **Loaded by name**, by `sdd:spec-producer-governance` when the conductor invokes the producer in
  `backfill` mode. Never triggered by a user.
- **Returns** a `BACKFILL_STEPS` record — one entry per ordered step — carried through the dispatch
  channel as provenance, never written into `spec.md` or the `.feature`.
- **Also owns** the unit of repair for a derived node: on a `change` verdict, re-enter at the earliest
  implicated step and re-run every step after it. `sdd:remediation-governance` hands it this one
  question and keeps the rest.

Specified by [`.agents/specs/sdd/authoring/backfill/`](../../../../.agents/specs/sdd/authoring/backfill/README.md).
