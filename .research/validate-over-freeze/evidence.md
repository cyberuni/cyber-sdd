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

---

# Evidence — the ratchet trial

Eight further runs on the same subject. Four on a defective pair (`before/` → `after/`),
discarded; four on the corrected pair (`before2/` → `after2/`), which everything below
rests on. Design and the three construction defects are in
[`trial-ratchet/README.md`](trial-ratchet/README.md).

## E6 — results, corrected pair

Both states green, 6 of 6, in every run.

| Run | Arm | Sees | Verdict |
|---|---|---|---|
| C1 | state only | `after2/` | `IMPLEMENTATION_PASS: true` — weakening not visible |
| C2 | state only | `after2/` | `IMPLEMENTATION_PASS: true` — weakening not visible |
| D1 | the change | `before2/` + `after2/` | **reject** |
| D2 | the change | `before2/` + `after2/` | **reject** |

Clean separation, 2 for 2 on each side. **The diff is what makes a ratchet-down visible.**

## E7 — Arm C: state-only cannot see it, but is not blind

Both runs passed the gate, correctly — the weakened criteria genuinely are satisfied, and
with no history there is nothing to compare against. Neither mentioned a weakening,
because neither could.

Both nonetheless flagged the cache, unprompted, and on merits rather than on any
contradiction. C2 tied it to intent:

> Since the tool's whole premise is "read live from the project-spec's `concept:` tags",
> this silently violates the stated derivation property.

So state-only review retains exactly one signal: **implementation surface that no
criterion covers**. It cannot tell you a criterion was removed. It can tell you behavior
exists that nothing specifies — and in a ratchet-down those are usually the same event,
because the point of weakening a criterion is to legalize new behavior.

## E8 — Arm D: both runs named the shape

D2:

> Removing a scenario that the diff's implementation would fail is the **defining shape of
> a spec-to-fit change**.

D1:

> Nothing in the change argues the doctrine is wrong; the cache simply cannot pass it.

Both rejected on two independent grounds — the spec was edited to fit the code, and the
new behavior is unspecified and untested — so neither verdict rests on a single
observation.

D1 also raised an authority point neither trial anticipated:

> the impl comment even deletes the citation "(the corpus/discovery no-drift rule)" — a
> cross-cutting rule is being dropped by a **leaf tool without any authority to do so**.

## E9 — the mechanical tell

The most valuable finding is not a verdict, because it needs no judgment. Both corrected
Arm D runs, and one defective one, stated the same structural fact:

> **Deleting `readCache`/`writeCache` from the implementation would leave all 6 tests
> green.** (D1)

> the cache read path is never executed at all in the after suite… **Coverage of the
> change went down while lines went up.** (D2)

Stated generally: **a change that adds behavior while its suite remains invariant to that
behavior has specified nothing.** That is computable from a diff plus a coverage run — no
agent required — and it fired on 3 of 4 Arm D runs across both pairs.

## Limits

- **N = 2 per arm on the corrected pair.** Clean separation, but four runs.
- **The deletion is blatant.** Both Arm D runs led with the removed scenario. Whether the
  *narrowing alone* — no deletion — is caught is **untested**, and it is the subtler half.
- **The judge was asked to review a change.** That is an attentive posture, deliberately
  adopted. It says nothing about a pipeline where a criteria edit can land without any
  judge seeing the diff.
- **One subject, and the easy one**, as in the first trial.

---

# Evidence — narrowing alone

Three cold runs on `before3/` → `after3/`, where the only spec edit is the narrowing.
Arm C is not repeated: its result is structural — with no history there is nothing to
compare against — and it does not change with the size of the weakening.

## E10 — results

| Run | Arm | Verdict |
|---|---|---|
| 1 | the change | **reject** |
| 2 | the change | **reject** |
| 3 | the change | **reject** |

**3 of 3.** With the two-edit pair, Arm D is **5 of 5** across the corrected pairs.
A narrowing on its own is caught; the deletion was not carrying the result.

## E11 — a second computable tell

Run 1 found a check neither trial anticipated:

> **The relaxation was not forced.** `before3`'s test 6 asserts only `main(...) === 0`;
> it passes unchanged against `after3/place-node.mts`. No red test, no discovered
> impossibility, motivated the spec edit.

Stated generally: **run the before-suite against the after-implementation. If it still
passes, nothing in verification compelled the criteria change.**

The phrasing overshoots slightly and the distinction matters. The criterion *as written in
prose* genuinely is violated by the new code — the tool really does create a file. What was
not forced is the edit **as far as any test could tell**: the producer could have kept the
original wording, shipped identical code, and stayed green. So the check does not prove bad
faith. It proves the spec edit was invisible to verification, which is exactly the class of
change that must carry an argument.

## E12 — what the three runs converged on

**The test narrows with the criterion.** Run 3: *"Test scope narrowed in lockstep with the
criterion. The suite would pass identically if `logRun` wrote a gigabyte, wrote to `$HOME`,
or wrote every run twice."* The strengthening is real, but it is a stronger check of a
smaller claim.

**Coverage is lost, not relocated.** Run 2: *"The old scenario protected a global 'writes
nothing' property. The new one protects a strictly smaller property. Nothing in the
after-state spec constrains out-of-spec-dir writes at all — that is a hole any later change
can walk through."*

**The vocabulary disappears with the criterion.** Run 1: the word "read-only" leaves the
document entirely, so *"nothing in the spec any longer signals that write behavior is even
a concern to review."* That is the erosion mechanism stated in one line — the next producer
cannot miss a guarantee that is no longer written down anywhere.

**The fixture held.** Run 2 confirmed criterion 6 was not violated in fact, and saw the
design intent exactly: *"It is never read back, so the scenario is not violated in fact, but
the diff moves the tool toward exactly the shape that scenario exists to forbid."*
