# Evidence

## How the conflict surfaced

A worked example was built to test the taxonomy and it produced an incoherent state.
Recorded because the failure is the finding.

**The malformed layout.** Three nodes — `cli`, `config`, `output` — each with a
`{spec}` ↔ `{code, test, story}` connection. Two criteria owned by `governance`
(`g₁`: every command supports `--json`; `g₂`: adds `--toon`, introduced later) were
**inherited into each node's spec** and therefore evaluated on each node's spec↔impl
connection. `output` had never implemented `--json`.

The resulting claim was that at one instant, `output`'s single connection carried a
`nonconformance` on `g₁` and an `obligation` on `g₂`.

**Why that is wrong.** Evaluated as state, "`g₁` is unmet" and "`g₂` is unmet" are the
same fact about the same connection. The only thing separating them was *when the
criterion arrived*. Two consequences:

1. It smuggled history into a discriminator that neither truss reading mentions.
2. Under the axis reading it is structurally impossible: a connection joins two sets,
   their axes are fixed, so a connection carries **one** kind.

**The proposed repair, and why it was withdrawn.** *Provenance* — "did this change raise
it?" — was proposed as the missing discriminator, giving a two-by-two over (raised by
this change) × (counterpart inside this unit). It was withdrawn: it appears nowhere in
truss, it requires history where both truss readings use present structure or the
present delta, and it was reverse-engineered from the broken example rather than from
the model.

**The corrected layout.** Placing the governance criteria on their own connection —
a governance spec to a governance-target set of every command module — removes the
contradiction. `g₁` and `g₂` are then both nonconformance at every instant, on that
connection; a node's own criterion is an obligation on its spec↔impl connection. No
history needed.

That correction is consistent, but it does **not** resolve the topic question. It
resolves this example by applying the axis reading. Whether the axis reading is the
model's actual discriminator is what remains open.

## Second-order observations

**Incompleteness may never be a connection strain at all.** `lattice.toml` says it "is
intra-unit and needs no connection to state." SDD 2's C6 independently assigns
consistency inside a set to the **controller**, not a connection. If both hold, then in
SDD 2 incompleteness is never raised on the `{spec}` ↔ `{impl}` connection, and C23's
"incompleteness may not be carried across a discharge point" governs something the
connection never carries.

**Nonconformance is currently unreachable in SDD 2.** C4 declares `{spec}` and
`{code, test, story}`, both unit-of-change. No governance-target set is declared
anywhere. Under the axis reading, every strain SDD 2 can raise is an obligation, and the
third kind cannot occur until such a set exists. C20's cross-cutting governances are the
natural candidates — a governance is precisely "one criterion over a homogeneous set" —
but they have no declared set to attach to.

**Parallelism is unaddressed, and lands on truss's own top open question.** Two
workflows straining *different* criteria on one connection is fine (several strains, one
connection). Two workflows straining the *same* criterion is not covered. Truss's
open-questions #1 asks at what level a workflow is unique, answers "plainly fails per
connection-pair… It may hold at the level of the *set of artifact-sets*. That is a
conjecture, not a result," and states that if it resolves badly "the whole confluence
construction" breaks.

In SDD 2 this is mostly avoided rather than solved: the mission graph carries a
`claimed` status with a touch-set, so two missions do not concurrently own one node's
connection; and C18 routes an upward repair on a `governance`-owned criterion to
stop-and-ask by counting the owner in the change's reach.

**Discharge attribution is missing.** If two workflows do strain one criterion, one
discharging it makes the strain vanish for the other, and nothing records *who*
discharged it. A discharge and a disappearance are indistinguishable. Small, and the
first thing parallel workflows need.

## Pending corrections, if the axis reading holds

Not applied. `criteria-governance.md` stands as written.

1. **C22's discriminator.** "Decided by where whatever would meet it sits relative to the
   change in hand" becomes the axes of the sets the connection joins.
2. **C22's rationale: "the kind therefore belongs to an evaluation and not to the
   criterion."** Under the axis reading the kind belongs to the **connection** and is
   stable. This also dissolves a worry raised and then dropped in the same discussion —
   that a cold sweep would re-read a standing obligation as a nonconformance — since the
   two cannot share a connection.
3. **C22's rationale: "a connection can still carry several strains at once."** True of
   the count, not of the kind. Several criteria, one kind.
4. **Declare governance-target sets**, or record that nonconformance does not arise in
   SDD 2 until one exists.

Independent of the axis question, and still standing:

5. **C24 widens.** Declining should discharge a nonconformance as well as an obligation,
   and never an incompleteness — declining an incompleteness is shipping a knowingly
   broken change. C24's own rationale ("without it any report nags forever") applies with
   more force to cold-swept defects than to obligations.

## Questions for the axis review

- Is the discriminator structural (the axes of the sets joined) or occasional (the delta
  in hand)? `lattice.toml` and `specification.md` currently give different answers.
- Can one connection carry two kinds?
- Is incompleteness ever a connection strain, or always intra-unit and therefore the
  controller's?
- Do SDD 2's cross-cutting governances imply governance-target sets, and if so, what are
  their members?
