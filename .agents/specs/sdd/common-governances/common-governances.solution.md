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

SDD ships the generic `oracle` / `builder` / `architect` core (face-merged); discipline squads are
resolution-time, project/plugin-supplied. The default shape: `oracle-spec`, `builder-spec`,
`builder-impl`, `architect-spec`, `architect-impl` (oracle has no impl face) + judge-only rubric
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

## The non-actor governances — placement & structure

Beyond the three actor bars, the gate machinery rests on six **non-actor** governances. Unlike actor
bars, none is face-split: each is an **invariant contract** loaded uniformly by every consumer — a
producer self-aligns to the same legality/ownership rule the judge enforces, with no `do X` / `is X
done?` mirror to merge or split. So each is **one skill**, not an `(actor, gate)` matrix.

### Fixed-universal (cross-cutting → `common-governances/`)

| bar | model home (`design/`) | reference node | skill | verified through |
|---|---|---|---|---|
| lifecycle | `lifecycle-model.md` (schema / status / transitions / freeze) | `common-governances/lifecycle/` | `lifecycle-governance` | `validate-spec.feature` |
| ownership | `provenance-model.md` | `common-governances/ownership/` | `ownership-governance` | validate-spec + producer/judge suites |
| combat-log | `provenance-model.md` | `common-governances/combat-log/` | `combat-log-governance` | conductor + validate-spec + Scanner suites |
| gate-validation | `lifecycle-model.md` (two gates / `aligned` scoping / legal-state tuples / gate accountability) | `common-governances/gate-validation/` | `gate-validation-governance` | `validate-spec.feature` |

- Each `common-governances/<name>/README.md` is a `spec-type: reference` node (`## Subject`, no
  `.feature`), **thin** — it names the bar's surface and points to its `design/` model; the model is
  not restated.
- The skill is `plugins/sdd-new/skills/<name>-governance/` (`SKILL.md` `user-invocable: false` +
  `README.md`), a lean harness-loaded skill — **no `universal-plugin build` embedding** (out of scope).

### Single-owner (usage = ownership → the capability folder)

- **plugin-contract** → node `plugin/plugin-contract/` (under the descriptive `plugin/`), skill
  `plugin-contract-governance`, verified through the conductor-resolution + plugin-author suites. **Not**
  in `common-governances/` — it has one consumer family (the plugin/conductor surface).

### autonomy — the lone exception (no node, no skill)

`autonomy` is **descriptive + baked-in**: the rubric lives in `design/autonomy-rubric.md` and the
self-clear-vs-escalate verdict is the conductor's **baked-in logic**, not a loaded skill. It is
exercised by the `acceptance/` ACES golden suite, not a reference node. (`autonomy-rubric.md` is
canonical; the runtime verdict comes from the conductor's own logic, never from loading the rubric.)

### Reconciles resolved (reasoned to intent, not tallied)

1. **gate-validation model home → FOLD into `lifecycle-model.md` (no new `design/gate-validation.md`).**
   The legality content — the two gates, `aligned` layer-scoping, the legal-state tuples, gate
   accountability — **already lives in `lifecycle-model.md`** (those four sections). A standalone doc
   would fragment the legal-tuple list, not clarify it. The `lifecycle/` and `gate-validation/`
   reference nodes share one design doc, carving distinct Subjects: lifecycle = schema / status /
   transitions / freeze; gate-validation = the legality layer on top.
2. **leash dimensions (4 vs 5) → MOOT; gate-validation carries no leash.** The leash and its gradient
   moved to `autonomy-rubric.md` (a hard floor + a **three**-dimension gradient); `lifecycle-model.md`
   § Gate accountability already defers to it ("the leash … lives in `autonomy-rubric.md`"). The new
   `gate-validation-governance` **drops the baseline's "four-dimension" leash section** entirely — it
   is the gate-**legality** layer only (legal tuples, `aligned` scoping, approval attribution,
   no-resolvable-producer fail-closed). Neither 4 nor 5 — zero.
3. **architect-spec asymmetric inputs** — resolved in the actor model above (one merged `architect-spec`
   bar + a per-face footer).

## Why this is reversible

Both shapes are git-tracked skills; switching A ↔ B is mechanical (split or merge the face sections).
The choice is an **authoring-ergonomics** call, not a behavioral contract — the gates judge the same
bars either way.
