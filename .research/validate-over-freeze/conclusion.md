# Conclusion

**The SDD 2 arrangement holds on the claim that sank Direction A2, and fails on a
different one that is cheaper to fix.**

## The verdict

ADR-0034 rejected moving the suite down because an implementation-native suite covered
5 of 7 frozen scenarios, missed both negative constraints, and shipped a **false green**
that nothing in `pnpm verify` detected. The false green was the decisive finding: a test
whose name asserts a property while its assertions do not establish it.

Under the SDD 2 arrangement — criteria held in the spec set, the executable suite
producer-authored in `{code, test, story}`, and a judge that reads criteria it did not
write — that false green was caught **4 times out of 4**, in both arms, unprompted.

The uncovered negative constraint was caught **3 times out of 4**.

## What this changes about ADR-0034

ADR-0034's evidence is not overturned; its **premise** is. It reasoned that A2 left
ADR-0016 with nothing to re-derive from, because the only candidate anchor it considered
was the `.feature`. The criteria are a sufficient anchor, and the trial shows a judge
holding them makes the comparison reliably.

The distinction is exact: **A2 deleted the criteria.** Under A2 nobody would ever have
performed the 5-of-7 comparison, because there would have been nothing to compare
against. SDD 2 keeps them and moves only the executable half.

## What the trial found that the proposal did not anticipate

**The instruction is not doing the work — the arrangement is.** The naive arm, asked only
"does the suite cover this?", went 2 for 2 on both defects. The arm carrying the standing
`sdd-impl-judge` bar went 2 for 2 on the false green and **1 for 2** on the negative
constraint. Holding criteria is what produces the catch; the elaborate bar did not add to
it, and cost variance.

**ADR-0016's re-derivation duty is double-edged.** Deriving the required verification from
the scenario rather than from the existing tests is the mechanism's point. It is also
where the miss entered: the failing run derived a weaker requirement and then found it
satisfied. Latitude to re-derive is latitude to set the bar low.

**The miss was a threshold failure, not a perception failure.** The failing run saw the
gap and recorded it as "missing (not fatal)". That is fixable by stating the threshold,
where a perception failure would not have been.

## Required before this ships

1. **State the negative-constraint rule.** A criterion asserting that something does *not*
   happen requires a check that **would fail if the constraint were violated**. Absence of
   the forbidden thing from a fixture is not evidence that it would be ignored if present.
   The passing run articulated this unprompted; the failing run did not apply it. Written
   into the judge bar, it converts the one miss into a catch.

2. **Run the criteria judgment N > 1 and fail closed on disagreement.** A 3-of-4 result is
   unreliable at the N=1 a gate actually runs at. ACED already runs judges N times and
   collapses to a boolean; the same discipline applies here, with disagreement across runs
   treated as a failure rather than a majority vote.

## Still open

- **The ratchet.** Nothing here tests whether validate-over-approval prevents co-drift —
  criteria and tests weakened together, relation still holding. Truss names the hazard:
  *"restore the relation is satisfied by amending the requirement just as legitimately as
  by bending the code."* This is the remaining argument for freezing **criteria** while
  letting tests iterate, and it needs its own trial.
- **Generalization.** One subject, the easy one, N=2 per arm.
