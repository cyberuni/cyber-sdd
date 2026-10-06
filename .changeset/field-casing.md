---
"cyber-sdd": minor
"cyber-quill": patch
---

`check-field-mandates` now catches a field spelled in two cases. A field token is `UPPER_CASE` or
`snake_case`, and both spell the same field. When a definition's prose names a field in one case and
its own block declares it in the other, the check reports it as **miscased**. A lowercase word counts
as a field token only if it contains an underscore, so ordinary words in code spans are never fields.

Fixed the mismatch this was widened to catch (#29). The spec-producer's `Output` block now spells its
field `governances_loaded`, the spelling its prose, the conductor, the spec-judge and the producer
suite already use. Quill's spec-writer implements the same producer contract, and its block and prose
now use the same spelling.
