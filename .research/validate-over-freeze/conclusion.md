# Conclusion

Two trials on `place-node`, twelve cold runs. **The SDD 2 arrangement holds, and
criteria do not need to be frozen — but the criteria *diff* has to be gate-bound.**

## Trial 1 — can a criteria judge replace a frozen suite?

ADR-0034 rejected moving the suite down because an implementation-native suite covered
5 of 7 frozen scenarios, missed both negative constraints, and shipped a **false green**
nothing in `pnpm verify` detected.

Under the SDD 2 arrangement — criteria in the spec set, the executable suite
producer-authored in `{code, test, story}`, a judge reading criteria it did not write —
the false green was caught **4 of 4**, in both arms, unprompted. The uncovered negative
constraint was caught **3 of 4**.

ADR-0034's evidence is not overturned; its **premise** is. It reasoned that A2 left
ADR-0016 with nothing to re-derive from, because the only anchor it considered was the
`.feature`. **A2 deleted the criteria** — under A2 nobody would ever have made the 5-of-7
comparison. SDD 2 keeps them and moves only the executable half.

Two findings the proposal did not anticipate:

- **The arrangement does the work, not the instruction.** The naive arm went 2 for 2 on
  both defects; the arm carrying the standing `sdd-impl-judge` bar went 1 for 2 on the
  negative constraint. Holding criteria produces the catch.
- **The one miss was a threshold failure, not a perception failure.** The failing run saw
  the gap and recorded it "missing (not fatal)". It set its own bar and set it low —
  which is the cost of ADR-0016's re-derivation latitude.

## Trial 2 — does validation ratchet?

A coherent change weakened one criterion and deleted another, motivated by a real scan
cache, shipping a **genuinely stronger test** for the criterion it kept. No freeze marker
on either side.

| Arm | Sees | Result |
|---|---|---|
| **C** — state only | the current state | passed the gate, 2 of 2. **The weakening is invisible.** |
| **D** — the change | before and after | **rejected, 2 of 2.** |

Repeated with the **narrowing alone** — criterion 6 kept verbatim and still true, one
scope edit, nothing deleted — Arm D rejected **3 of 3**. Across both corrected pairs Arm D
is **5 of 5**, so the result does not depend on the blatant half.

Clean separation. Pure validate-over-approval — evaluate whether the relation holds *now* —
has **no ratchet**. Both ends can move together and the relation holds perfectly. Give a
judge the diff and the weakening is named immediately, in the change's own terms:

> Removing a scenario that the diff's implementation would fail is the defining shape of a
> spec-to-fit change.

## What this settles for SDD 2

**Criteria need not be frozen.** Freezing prevents; review detects, and detection was
reliable here. That buys the agility the proposal is after: tests iterate with no
ceremony, and a criteria amendment is argued rather than requiring a whole-suite unfreeze
and a revert to `draft`.

**But three things become load-bearing, and none is optional.**

1. **The criteria diff must be gate-bound.** Arm C is what a pipeline does when a criteria
   edit lands without a judge seeing before-and-after — it passes, every time. The entire
   result rests on the diff reaching a judge. A criteria change that can land unreviewed
   removes the only ratchet there is.

2. **The mechanical backstop, which needs no judgment.** *A change that adds behavior while
   its suite stays invariant to that behavior has specified nothing.* Both corrected Arm D
   runs stated it — "deleting `readCache`/`writeCache` would leave all 6 tests green" — and
   it is computable from a diff plus a coverage run. Build this before the agentic check;
   it is cheaper and it does not vary.

3. **The unforced-relaxation check, also mechanical.** Run the **before**-suite against the
   **after**-implementation. If it still passes, nothing in verification compelled the
   criteria edit, and the relaxation must be argued rather than presented as necessity. It
   does not prove bad faith — it proves the edit was invisible to verification, which is the
   class of change that needs an argument attached.

4. **Criteria must carry an owner.** Freezing was doing **two** jobs, and the ratchet trial
   only tested one. A frozen scenario could not be deleted without an Oracle-lens revert — a
   conductor decision, and therefore an authority escalation by construction. The diff
   replaces the freeze's **ratchet**; it does not replace its **authority gate**, because a
   judge reading a diff cannot know a criterion is inherited unless something records that.

   A judge found this unaided: the deleted criterion cited a repo-wide rule, and *"a
   cross-cutting rule is being dropped by a leaf tool without any authority to do so."*

   v1 already has the shape, at scenario granularity, in `ownership-governance`: a
   **`@pinned`** scenario is user-owned, and every agent role *"may propose, never executes a
   change/removal without in-session user authorization."* It has exactly one owner. Generalize
   it to three: **node**-owned (default — the producer may amend, subject to diff review),
   **user**-owned (`@pinned` today), and **governance**-owned (inherited from a cross-cutting
   rule; propose only, and the amendment routes to the governance's level, not the node's gate).

   Without this, dropping the freeze silently makes every inherited rule locally deletable.
   `@pinned` is proof the pattern is already wanted — it was just never generalized past the user.

   **Grade it, do not floor it, and build no second bar.** A blanket "an inherited criterion
   is never self-assertable" recreates v1's whole-suite rigidity in miniature. Instead: **an
   upward repair on an inherited criterion puts the owner in the mission's touch-set.**
   `blast-estimate` already measures **centrality — dependency fan-in** across an area's full
   root set, and the leash already grades on blast. Scoping the repair to the owner rather
   than the node makes the existing engine grade it unchanged: a corpus-wide governance reads
   high fan-in, high blast, narrow leash, stop-and-ask; a low-fan-in owner reads low and the
   agent self-asserts with a ledger record for async review.

   This also closes a live under-call. A leaf tool retiring a corpus-wide rule is today a
   tiny touch-set with corpus-wide consequence — exactly the shape `blast-estimate` has an
   `under-called` verdict for and no input to detect. Owner provenance is that input, so the
   check becomes **computed rather than judged**.

5. **The negative-constraint rule, via a mechanism that already exists.** Trial 1's miss
   was a judge passing a negative criterion with no falsifying check. `sdd-impl-judge`
   already carries an **Exercise backstop** — "verify the passing check fails when the named
   behavior breaks" — but keys it to blast radius alone, and a **low**-blast-radius scenario
   **skips** it. `place-node` is low blast radius, so the bar permitted the skip. The fix is
   one more trigger, not a new mechanism: **a negative criterion always gets the backstop,
   whatever the blast radius.** Detecting one is mechanical (a `Then` carrying
   `no`/`not`/`never`/`nothing`), and `check-suite` already scans `Then` clauses.

6. **An intended edit that yields zero delta is an error.** A zero-delta change raising
   nothing is already SDD's rule — ADR-0034 makes a zero-content-delta rename non-gate-able.
   The inverse is missing, and it produced this dossier's own worst defect: a string
   replacement whose anchor never matched returned the input unchanged, with no signal, and
   the edit was then reported as made. That is the false green on the **authoring** side —
   report and reality disagree and nothing detects it. Claude Code's `Edit` tool already
   enforces this by erroring when its anchor is absent; a producer scripting an edit bypasses
   the guard.

Also carry forward from Trial 1: **run the criteria judgment N > 1 and fail closed on
disagreement**, never majority vote. 3-of-4 is unreliable at the N=1 a gate runs at, and
ACED already has this discipline.

## Still open

- **The attentive posture is assumed.** Every Arm D run was *asked* to review a change and
  produce findings. That says nothing about a pipeline where a criteria edit can land without
  a judge in it at all — which is precisely what Arm C models, and Arm C passes every time.
  Requirement 1 is therefore the whole result; the rest is refinement.
- **Owner provenance is designed, not tested.** Requirement 4 is reasoned from a judge's
  observation and from `@pinned`'s existence. No trial has yet put an inherited criterion in
  front of a judge and watched what happens.
- **Generalization.** One subject, the easy one; N=2 and N=3 per corrected pair.
