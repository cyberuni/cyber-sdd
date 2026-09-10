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

3. **The negative-constraint rule, via a mechanism that already exists.** Trial 1's miss
   was a judge passing a negative criterion with no falsifying check. `sdd-impl-judge`
   already carries an **Exercise backstop** — "verify the passing check fails when the named
   behavior breaks" — but keys it to blast radius alone, and a **low**-blast-radius scenario
   **skips** it. `place-node` is low blast radius, so the bar permitted the skip. The fix is
   one more trigger, not a new mechanism: **a negative criterion always gets the backstop,
   whatever the blast radius.** Detecting one is mechanical (a `Then` carrying
   `no`/`not`/`never`/`nothing`), and `check-suite` already scans `Then` clauses.

Also carry forward from Trial 1: **run the criteria judgment N > 1 and fail closed on
disagreement**, never majority vote. 3-of-4 is unreliable at the N=1 a gate runs at, and
ACED already has this discipline.

## Still open

- **Narrowing alone is untested.** Both Arm D runs led with the *deleted* scenario, the
  blatant half. Whether a narrowing with no deletion is caught is the subtler question and
  this trial does not answer it. It is the first thing to test before an ADR.
- **Authority.** D1 observed that the deleted criterion cited a repo-wide rule, and that a
  leaf tool has no standing to retire one. Nothing in SDD 2 as designed distinguishes a
  criterion a node owns from one it inherits.
- **Generalization.** One subject, the easy one, N=2 per arm on the corrected pair.
