---
'cyber-sdd': minor
---

`check-project-specs` gains a total **corpus scope** and refuses flags it does not define.

`--corpus` runs the coverage guard **and** the engine set over every project-spec in the corpus,
so a repo's commit floor checks the whole tree rather than one project. The two sub-checks compose
deliberately: the sweep only visits the specs discovery recognizes, so a spec whose lifecycle
`status` is a typo is invisible to it, while the coverage guard sees that file on disk but says
nothing about whether the engines pass.

**Breaking for callers of `--check-coverage`:** that flag is removed, and an unrecognized flag is
now an error instead of falling through to project scope. The fall-through was silent — project
scope at a repo root resolves no governing spec and exits `0` — so a coverage-only flag could guard
every commit and every CI run while running no engine at all. Replace `--check-coverage` with
`--corpus`.
