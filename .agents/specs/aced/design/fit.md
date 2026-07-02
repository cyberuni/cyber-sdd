# fit — which agent configs benefit from ACED

Not every agent configuration benefits from ACED. **Fit** is ACED's self-assessment of a subject
before it authors an eval suite, and it is decided **early** — in explore, by the `scenario-writer`
— not at the gate. The `spec-validator` at the gate only **reads** the declared tier and applies the
criteria that carry signal; it never re-decides fit.

## The diagnostic

**FIT = which of ACED's four eval layers carry real signal for this subject.**

The four layers (`design/README.md`): **Structural** (fields/format — already covered by
`cyberplace audit`), **Trigger** (does it fire at the right times), **Behavior** (does it follow
the steps/rules when invoked), **Quality** (is the output good). A subject that only has signal at
the **Structural** layer is not an ACED subject — ACED adds nothing an existing linter does not.

## The three tiers

| Tier | The subject… | Layers with signal | What ACED does |
|---|---|---|---|
| **strong** | makes a genuine **activation decision** (a fuzzy/confusable trigger) **and** has non-deterministic judgment branches | all four | the **full bar** — trigger-context **and** trigger-balance (near-misses) are **required** |
| **partial** | is a real config but **mechanically executes** a predetermined path — no activation choice, no branch it decides (a spawned/mechanical procedure) | Structural + Behavior (+ Quality) | rule-coverage + edge-coverage + boolean-form apply; **trigger-balance / near-miss is N/A** (its absence is **not** a failure); trigger-context applies **only** to scenarios that assert firing |
| **wrong-squad** | is a **deterministic** script / engine whose output is **assertable, not graded** | Structural only | ACED **recuses** — the producer authors **no `.feature`**; the conductor falls back to the SDD-default builder + a script / `node:test` harness (the recuse→fallback seam, `sdd:design/lifecycle-model.md`) |

## Where the decision lives, and how it is recorded

- **Decided in explore** by `sdd-roles/scenario-writer` **before** authoring any scenario: classify
  the subject, then author to the tier (strong → author near-misses; partial → no fabricated
  near-miss; wrong-squad → recuse, produce nothing).
- **Recorded** as a `**Fit:** strong | partial` line in the subject's `spec.md` `## Use Cases`
  (a body field — the producer writes no control frontmatter). A **wrong-squad** subject has no
  ACED spec node at all (it was recused), so it carries no `**Fit:**` line.
- **Enforced at the gate** by `sdd-roles/spec-validator`: read the declared tier; apply
  trigger-balance/context **only where the tier says they carry signal**; a **missing** declaration
  is a `CONTENT_GAP` (kick back — never silently default to `strong`).

Fit is a **judgment**, not a deterministic derivation — which is why it is encoded as the
`aced:aced-fit` governance (loaded by the producer and the judge), not a `.mts` engine.
