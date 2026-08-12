# Changes — Change Review Set

## 2026-08-12 — Initial research

- **What changed:** New topic created, answering issue #453.
- **Why:** Change request #437 (delivered as PR #444) failed the same gate three rounds running,
  each time on a different document the previous sweep had reported clean, and a fourth round
  declared a regression. All four misses were the same shape — a rule propagated to some members of
  a document set and not others, with the set never enumerated. #453 asks which sets a change
  belongs to and whether they can be derived.
- **Conclusion changed materially:** N/A (first entry).
- **Evidence/source that triggered:** The #453 brief. Unlike most dossiers here, this one surveys
  **this repository** rather than external literature: every evidence item is a measurement or an
  execution against the tree at `a41b0fa9` (2026-08-11), taken 2026-08-12. Sources are
  `gh issue view 453` / `gh pr view 444`, git history over skill-folder commits, corpus-wide counts
  over `git ls-files`, an execution of the shipped `fileToNode` against real paths, and reads of the
  Boundaries sections of `blast-estimate`, `check-retired-terms`, `check-scenario-overlap`,
  `concept-index`, `resolve-governances`, and `formation-loop`.
- **Notes on method:**
  - `fileToNode` was **executed**, not read off its source, with the `gherkin-cli` import stubbed so
    the module loads under node 22 (the stub is on the diffing path only, not on `fileToNode`'s).
    `discoverLayouts` returned `[]` under node 22 — recorded as E19 — so the real `sdd` layout
    (`.agents/specs/sdd` + `plugins/sdd/skills`, exactly the shape `discoverLayouts` constructs) was
    injected for the executed table in E05.
  - The first wrap measurement used a regex that over-counted inline-code spans (18,971). It was
    replaced by backtick tokenization with fenced blocks stripped, giving 105 — E14 carries the
    corrected figure.
  - The first check of whether the `**Artifact**` declaration wraps tested for *any* backticked span
    on the marker line, which the bullet's own inline code satisfies. Corrected to test for the
    artifact path itself (`plugins/` or `packages/`); the corrected answer is 11 of 12 wrapped,
    recorded as E09.
- **Explicitly not reopened:** whether restating a claim is a defect.
  `.research/documentation-craft/` already settled that it is not, and this dossier cites that
  finding (E21) as a constraint on §5 rather than re-deriving it.
