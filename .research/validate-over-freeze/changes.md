# Changes

What this dossier changed, and what it deliberately did not.

## Landed

- This dossier.
- [`packages/cyber-sdd/GLOSSARY.md`](../../packages/cyber-sdd/GLOSSARY.md) — SDD 2's
  ubiquitous language, kept apart from v1's. Records the connection lifecycle
  (**unsettle → evaluate → hold / raise → discharge → settle**), **repair direction**, and
  **owner**, plus the terms deliberately not used. `repair direction` is a general model
  term and should be upstreamed to truss's model glossary.

## Not landed, deliberately

- **No ADR.** ADR-0034 stands unamended. The conclusion names six requirements and three
  open questions. Requirement 4 (owner provenance) is reasoned from `@pinned` and from a
  judge's observation, not measured — it is the one worth a trial before an ADR rests on it.
- **No governance edits.** The negative-constraint trigger, the invariant-suite backstop,
  and the N>1 discipline are requirements on a future change, not applied here.
- **No files were modified on the subject.** `place-node`, its suite, and its `.feature`
  are untouched. Every run was read-only; the trial pairs are copies.

## Kept deliberately

`trial-ratchet/before3/` and `after3/` isolate the narrowing with nothing deleted.

`trial-ratchet/before/` and `after/` are the **defective** first pair. They are retained
as a record of what was run and why it was discarded, not as evidence. Their three
construction defects are documented in `trial-ratchet/README.md`.

## Placement, once it binds

The criteria set this dossier produced is a **cross-cutting governance** — not a node and not
a project spec. It constrains how every node in SDD 2 is specced, diffed and gated, so it has
no single capability owner, and v1 already draws that line: the cross-cutting home is for
*"the bars with no single capability owner"*, while *"single-owner bars live in their
capability"*. ADR-0034's colocation therefore does not reach it. Screaming architecture
organizes capabilities, and a bar is not one.

That also settles its lifecycle vocabulary. A governance runs **proposed → in force →
retired**; `implemented` is meaningless for a bar, because a bar is applied rather than built.
Its current `draft` means *not yet in force*.

Two criteria follow, and both are recorded in the published set rather than here:

- **A project spec carries no `status`.** Three of v1's four values are change-request-shaped
  — a living project is permanently `draft`, a whole contract does not `approve`, and
  `implemented` is momentarily true at best, which is the value that went false. Only
  `deprecated` is genuinely project-level and deserves its own field. Under per-criterion
  evaluation the aggregate is derivable, so storing it is the stored-derived-fact ADR-0017
  removed `aligned` for.
- **A cross-cutting contract is a governance and is never colocated** — it has no single
  subject.
