# Changes

What this dossier changed, and what it deliberately did not.

## Landed

- This dossier. Nothing else.

## Not landed, deliberately

- **No ADR.** ADR-0034 stands unamended until the ratchet question is answered. Amending
  it on this dossier alone would adopt validate-over-approval without having tested the
  property freezing actually bought.
- **No governance edits.** The negative-constraint rule and the N>1 discipline in
  `conclusion.md` are requirements on a future change, not applied here.
- **No files were modified on the subject.** `place-node`, its suite, and its `.feature`
  are untouched; every run was read-only.

## Next

The ratchet trial: can a criteria judge detect a criterion and its test being weakened
together in one change? That is the question that decides whether criteria are frozen or
merely validated, and it is the last one standing between here and an ADR.
