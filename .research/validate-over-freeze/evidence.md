# Evidence

Four cold runs against `place-node`, two per arm, each blind to the answer key and
restricted to three files. Ground truth pre-registered in
[`../next-spec-architecture/evidence.md`](../next-spec-architecture/evidence.md) § E2.

## E1 — the subject is green

```
$ node --test place-node.test.mts
# tests 6
# pass 6
# fail 0
```

Every verdict below is against a **passing** suite. Nothing in `pnpm verify` fails on
this subject in any state the trial produced.

## E2 — results

Ground truth: criteria 1–5 are genuinely covered; **6** has no verification at all; **7**
is a false green — `main runs read-only and emits a suggestion` asserts only
`main(...) === 0`.

| Run | Arm | #6 *consults no stored routing list* | #7 *place-node writes nothing* | Rollup |
|---|---|---|---|---|
| A1 | naive coverage | NOT COVERED ✓ | NOT COVERED ✓ | 5 of 7 |
| A2 | naive coverage | NOT COVERED ✓ | NOT COVERED ✓ | 5 of 7 |
| B1 | impl-judge bar | FAIL ✓ | FAIL ✓ | `IMPLEMENTATION_PASS: false` |
| B2 | impl-judge bar | **PASS ✗** | FAIL ✓ | `IMPLEMENTATION_PASS: false` |

- **H2 — the false green — caught 4 of 4.** Unanimous, across both arms.
- **H1 — the uncovered negative constraint — caught 3 of 4.** The miss is B2.

## E3 — what the runs said about the false green

All four located the same defect without being told to look for it. A1, unprompted, in
the *naive* arm:

> `main runs read-only and emits a suggestion` asserts only `main(...) === 0`; it never
> captures stdout (so "emits a suggestion" is unverified) and never snapshots/compares the
> temp corpus before and after (so "creates, relocates, and edits no file" is unverified).
> **The test name claims the behavior the assertions do not check.**

B1 and B2 both stated the falsification directly — B2, which got #6 wrong, was still
exact here:

> a write, relocation, or edit by the tool would leave this test green. The read-only
> boundary — the scenario's whole point — has zero coverage.

## E4 — the miss, and why it matters more than the hit

B2 passed criterion 6 on this reasoning:

> Each runs in a freshly created `mkdtemp` corpus whose only content is `.md` files
> carrying `concept:` frontmatter — no registry file exists anywhere in it — yet
> non-empty, correct homes come back. That behaviorally establishes derivation-from-tags
> and that no stored routing list is required.

That confuses **no registry was present** with **no registry would be consulted**. B1
named the exact hole:

> A hybrid implementation that consulted a stored routing list *in addition to* tags — or
> one keyed off a hardcoded map outside the corpus — would pass all six existing tests
> unchanged. The negative claim is unfalsified.

Two things make this the most useful result in the trial.

**It is not a perception failure.** B2 saw the gap and declined to fail on it —
"Missing (not fatal): no negative control seeding a decoy routing file." It set its own
bar and set it too low. A judge that cannot see the defect needs better inputs; a judge
that sees it and forgives it needs a stated threshold.

**The stricter arm did worse.** Arm B carries ADR-0016's re-derivation duty — derive the
required verification from the scenario's own Given/When/Then. That latitude is the
mechanism's point, and it is also where the variance entered: B2 derived a weaker
requirement for #6 and then found it satisfied. The naive question, which left less room
to set a bar, went 2 for 2.

## E5 — findings neither trial had recorded

Both arms independently surfaced weaknesses ADR-0034's trial did not:

- **Criterion 4 asserts cardinality, not identity.** `assert.equal(near.length, 1)` pins
  the right node only because the fixture holds exactly one. Three of four runs flagged it.
- **Criterion 2's fixture is alphabetically confounded** — `common-governances` sorts
  before `design`, so the ordering assertion cannot distinguish rank-by-count from
  rank-by-name; only `count === 3` ties it to facet volume. B2 alone caught this, which is
  the same run that missed #6.
- **`render()` is never asserted anywhere in the suite** — the entire output surface,
  including the "new concept" and "no name overlap" branches, is unobserved.

## Limits

- **N = 2 per arm.** Four runs total. Enough to show a split exists; not enough to rate it.
- **One subject, and the easy one.** Small, deterministic, already colocated. A result that
  failed here would generalize; a result that passes here may not.
- **The criteria were the existing `.feature`.** The trial does not distinguish "criteria
  held in the spec set" from "frozen `.feature`", because the text is identical. What it
  does test is whether a **producer-authored suite living in the implementation set**
  survives judging against criteria the producer did not write.
- **The ratchet is untested.** This trial says nothing about whether validate-over-approval
  prevents co-drift — criteria and tests weakened together. That needs its own trial.
