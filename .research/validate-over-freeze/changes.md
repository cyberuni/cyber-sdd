# Changes

What this dossier changed, and what it deliberately did not.

## Landed

- This dossier. Nothing else.

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
