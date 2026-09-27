---
"cyber-sdd": minor
---

New `check-field-mandates` check: a skill or agent definition's structured blocks and its prose must
agree on their fields.

A definition ships blocks — an `Input`, an `Output`, a dispatch payload — whose fields the prose also
mandates. The check reads every `plugins/<plugin>/skills/**/SKILL.md` and `plugins/<plugin>/agents/*.md`
and reports both directions with file, line and token:

- **unexplained** — a block declares a field that carries no gloss and the prose never names.
- **undeclared** — the prose names a known field in a code span that none of the file's blocks declare.

A field is explained by a gloss on its declaration or a mention in the prose. A prose line that names
another agent's field on purpose is excused by a reasoned marker beside it:
`<!-- field-mandate-ignore: <reason> -->`. There is no allow-list and no report-only mode — a finding
always exits non-zero.

Three shipped definitions (`impl-producer-governance` among them) mandated returning a `BLOCKER` their
`Output` block had no line for; each now carries it. The bare path fields in the producer and judge
`Input` blocks now carry a gloss.
