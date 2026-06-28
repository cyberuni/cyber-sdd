# common-governances — solution

> The durable decision record (the unit's "third facet") for **how the cross-cutting governance bars
> are authored and sliced**. Not frozen, not gated. Worked evidence: `examples/acme-ui/` (Model A)
> and `examples/acme-ui-merged/` (Model B).

## Chosen — Model B: per-`(actor, gate)` bars, faces merged

A governance bar is **one skill per `(actor, gate)`**, sectioned by discipline, loaded by **both** the
producer agent (self-align) and the judge agent (grade). Naming: `<actor>-<gate>-governance`.

- **`spec | impl` — kept.** Coverage (does the suite *test* a concern) and conformance (does the code
  *satisfy* it) are genuinely different bars.
- **`producer | judge` — merged.** For objective criteria the two faces mirror (`do X` / `is X
  done?`); one source, edited once. `producer ≠ judge` is preserved at the **agent** level — distinct
  agents loading the shared bar.
- **Subjective slices — split out** as judge-only `@rubric` governances (e.g. designer visual
  coherence), the only place a producer must not self-grade.
- **Disciplines — sections** within a bar (engineer / designer / a11y / …), composed onto SDD's
  generic core via `compose: union`; supplied per artifact-type by project/plugin, **not** SDD
  defaults.

SDD ships the generic `director` / `builder` / `architect` core (face-merged); discipline squads are
resolution-time, project/plugin-supplied. The default shape: `director-spec`, `builder-spec`,
`builder-impl`, `architect-spec`, `architect-impl` (director has no impl face) + judge-only rubric
splits where a discipline is subjective.

## Considered — Model A: per-role bars (`<actor>-<gate>-<face>`)

The full `spec|impl × producer|judge` split = 10 skills. **Still a valid possibility**, and the right
cut **where a bar's two faces genuinely diverge**. Rejected as the *default* because:

- objective criteria are written **twice** (producer `do X` + judge `is X done?`) → two edit sites
  per criterion → AI-drift maintenance hazard (edit one, miss the other);
- the `spec|impl` difference (which *is* real) is independent of the face split; A conflates the two.

**Keep A as the fallback** for bars with **asymmetric inputs** or large **subjective rubrics** — e.g.
the `architect-spec` wrinkle: the solution-producer writes the solution while the cold spec-judge
reads `spec.md` + `.feature` only. Model B absorbs that with a per-face footer; if such asymmetry
recurred widely, A's per-face separation would start to pay off.

## Why this is reversible

Both shapes are git-tracked skills; switching A ↔ B is mechanical (split or merge the face sections).
The choice is an **authoring-ergonomics** call, not a behavioral contract — the gates judge the same
bars either way.
