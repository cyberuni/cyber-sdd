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

## The measured axis — is a real run worth paying for?

The tier above answers which **simulated** layers carry signal. A second, **orthogonal** axis answers
whether the **measured** layer (`eval-run/bench/`) — real headless runs graded by a shell check —
answers a question simulation cannot: **`measured: worth | not-worth`**. The two never derive from
each other: a `strong` skill can be `not-worth` (its change only rewords a trigger), and a `partial`
procedure can be `worth` (it drives multi-step work whose pass rate a change can move).

A subject is **worth** measuring only when **all four** hold:

1. **The effect is in the work, not the words.** The change moves how real work turns out — pass
   rate, turns, tokens. Repo-wide setup, a skill that drives multi-step work, and a package upgrade
   qualify. A trigger-only or wording-only change does not: simulation already answers it.
2. **The outcome is deterministically checkable.** A shell `check` decides pass/fail without an LLM
   judge. If only a rubric can grade it, the subject stays simulated (a judged real run is #64's
   territory).
3. **A decision hinges on the delta** — merge or revert a lever, calibrate a weight, gate a release.
4. **The effect is detectable at a run count someone will approve.** Below 4 runs per arm no
   single task's permutation test can reach p < 0.05, and real effects usually need about 10 per arm on tasks
   hard enough that some runs fail. If the question needs more runs than anyone will approve, it is
   `not-worth`. The engine's plan checks the floor at the requested count and says "too few to call"
   before money is spent. That warning reports on this criterion; it does not satisfy it.

**Dollars never decide a result.** Cost is recorded and compared, but a price change alone never
makes a measured result `regressed` — prices move with the model, not the subject. What a person is
willing to pay bounds only criterion 4, whether a run is worth taking at all.

**Where it is declared.** In the subject node's `eval.md`, under a `bench:` key that sits beside
`eval:` — never in `spec.md` frontmatter, and never holding the task set (that lives in the suite,
`.agents/aced/bench/<suite>/`):

```yaml
bench:
  measured: worth            # worth | not-worth
  suite: harbor.nightly      # required when worth
  why: <one line per criterion above>
```

**Absence means not-worth.** The axis is opt-in: an `eval.md` with no `bench:` key is a subject
nobody has chosen to measure, not a content gap. (Contrast the tier, whose absence **is** a gap.)
So adding the axis reclassifies no existing node.

**Re-asked per comparison.** A declared `worth` is the subject's standing answer; the `bench` skill
still re-asks criteria 1–2 of the change in hand before planning a spend, and the engine's plan
checks criterion 4's floor at the requested run count. Criterion 3 is not re-asked by a tool: the
person asking for the run is the one with the decision. A `worth` subject can still meet a change that is not.

**Enforced at the gate** by `sdd-roles/spec-validator`: a `bench:` key declaring `worth` with no
`suite`, or with no `why`, is a `CONTENT_GAP`. The judge does not re-decide `worth`; it reads it.

The decision and its rejected alternatives are ADR 0003 (`decisions/0003-measured-fit-axis.md`).
