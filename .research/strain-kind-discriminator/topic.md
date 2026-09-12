# What decides a strain's kind?

## Status

**Open. Paused mid-investigation, deliberately — there is no `conclusion.md`.**

Work stopped so the two axes of truss's artifact-sets can be reviewed first. Nothing
here is in force, and `criteria-governance.md` is left as it stands (see
[Pending corrections](#pending-corrections-if-the-axis-reading-holds)).

## The question

A strain is typed `incompleteness`, `obligation`, or `nonconformance` (SDD 2's C22).
What decides which one a given strain is?

Truss gives two answers in two places, and they are not the same answer.

**The delta-relative reading**, from
[`specification.md`](https://github.com/cyberuni/cyber-truss/blob/main/apps/web/src/content/docs/model/specification.md):

| Strain | Shape in this vocabulary |
| --- | --- |
| Incompleteness | a specification and its implementation disagree, and both are **in hand** |
| Obligation | a specification whose implementation is **elsewhere** |
| Nonconformance | criteria evaluated with no counterpart implementation **in the delta at all** |

The discriminator here is the change in hand. The same criterion could type differently
on different occasions, because what is "in hand" changes.

**The axis-relative reading**, from `.truss/lattice.toml`:

> `unit-of-change` … Strain here is incompleteness (within one unit) or obligation
> (across two).
> `governance-target` … Strain here is nonconformance.

and, over the connection block:

> A connection between two unit-of-change sets carries OBLIGATION strain — the two ends
> land in different commits by design… A connection reaching a governance target carries
> NONCONFORMANCE strain, evaluable on a cold repository. Incompleteness strain is
> intra-unit and needs no connection to state.

The discriminator here is structural: the axes of the sets a connection joins. It is
fixed when the lattice is declared and does not vary by occasion.

**These conflict.** On SDD 2's one connection — `{spec}` ↔ `{code, test, story}`, two
unit-of-change sets — the axis reading says every strain on it is an obligation,
always. The delta reading says the kind depends on what the change in hand contains.

Truss marks this area unsettled itself:

> **Status: Settled** that the three are distinct and block differently. **Open:** the
> precise boundary conditions on each.

## Why it matters

C22 states a discriminator, and C23 keys blocking behaviour to the kind: incompleteness
may not be carried across a discharge point, obligation may. If the discriminator is
wrong, the blocking rule fires on the wrong strains.

## What is not in question

- **The names.** `incompleteness` / `obligation` / `nonconformance` was a polarity fix
  (all three now name the defect rather than the satisfied state) and is independent of
  the discriminator. Landed in `cyber-sdd` and in cyberuni/cyber-truss#15.
- **The blocking policy itself** (C23), and that declining is a legal discharge (C24).
- **That aspiration is an obligation.** Both readings agree for the `{spec}` ↔ `{impl}`
  case: the two ends land in different commits by design.
