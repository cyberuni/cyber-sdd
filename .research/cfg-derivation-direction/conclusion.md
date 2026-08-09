# Conclusion — CFG derivation direction is load-bearing, and measurably so

## Verdict

The governances' backfill rule — **draw the CFG from the contract, then the map, then verify the
standing scenarios against it** — is not stylistic. Building the map the other way round produces an
artifact that is **structurally incapable of finding what the map exists to find**, and that looks
identical to a correct one from the outside: same 1:1 binding, same green check.

Measured on one node (`mission/handoff/`, 44 scenarios):

| Direction | Result |
|---|---|
| scenarios → rows → CFG (backfilled) | 55 rows, 0 holes surfaced, 1 real drift **masked** |
| contract → CFG → rows (two blind readers) | 58–63 edges, **6 consensus holes**, 4 contract defects |

The backfilled map could not have surfaced a single one of the six (E20, E21). Not "did not" —
**could not**: every edge in it was manufactured from a scenario, so an edge with no scenario has no
representation. The map's coverage claim is circular; only its *binding* is real (E22).

## Why the failure is invisible

Three mechanisms stack, and each one alone reads as success:

1. A node with no `## Scenario map` has map-binding **skipped**, so a green `check:spec` says nothing
   about coverage (E23).
2. `incomplete-node` — the finding that would flag the missing sections — is **advisory by design**,
   pending a corpus-wide uplift (E26). 37 of 40 behavioral nodes carry it (E25).
3. Coverage of the CFG is **judged, never linted** (E24). So even a present, correct-looking map is
   cleared by no machine.

A backfilled map therefore satisfies every mechanical check in the chain while proving nothing. This
is the "fail-open that looks green" class the corpus already recognizes elsewhere.

## What contract-first actually bought

Six uncovered edges, each named independently by **both** blind readers and verified uncovered
corpus-wide (E09–E14). The two most valuable are structural, not incidental:

- **A lone-negative group.** The decompose behavior carries only negatives (`multi-unit`,
  `two unrelated concerns`); a subject that never splits anything passes both. `suite-format-governance`
  names this exact defect — "a lone negative is passed by a do-nothing subject" — and the suite had it
  anyway (E09).
- **A floor read as a replacement.** Both outward-publish-floor scenarios test what the stricter floor
  *adds*; nothing tests that the inherited bans still hold. An implementer that swapped the floors
  rather than extending them passes (E14).

Plus four defects in the **contract** rather than the suite (E16–E19) — including a README that
answers "is a `backlog` follow-up proposed?" two different ways, and an exhaustiveness claim
("every scenario maps to one of these behaviors") that is simply false.

## Three findings that generalize beyond this node

**1. Two blind readers beat one, and disagreement is the signal.** Where A and B *agree*, the edge is
evidence. Where they *split* — the deploy/chapter shapes, ruled dead by one and live by the other —
the defect is in the **contract**, not in either reading (E17). A single derivation cannot make that
distinction, and would have reported its own judgment as fact.

**2. Structural blinding, not instructed blinding.** Each reader deleted the suite from its own
worktree before reading anything (E05). An instruction not to read a file sitting in the working tree
is not a control; deleting it is.

**3. The parent must verify, and the failure mode is confident and specific.** Both readers reported
three behaviors as missing from handoff that are in fact specified on a **sibling node** (E07). The
cause was scope — they were handed `start-mission` Step 4, which narrates those duties inline, and
not the sibling (E08). Accepted at face value this would have produced ~12 scenarios against the
wrong node. Delegate the derivation; never delegate the comparison.

## Cost

~128k subagent tokens, ~13 minutes wall-clock for two derivations run in parallel (E28) — against a
node whose suite had bound to nothing for its entire life (E23). The uplift is cheap relative to what
it finds; the expensive part is the human decision about what to do with the findings.

## What this does **not** settle

- **Whether to fill the six holes.** They are additive and self-clearing (no Clearance owed), but the
  node is already oversized — 44 against a 40 threshold, 61 if filled (E27). That strengthens the
  case for splitting the follow-up machinery into its own node rather than weakening it.
- **The four contract defects** (E16–E19) are decisions, not edits: the `backlog`-proposal
  contradiction and the deploy/chapter shapes must be *ruled* before either can get a scenario.
- **The other 36 nodes** (E25). This dossier measured one. The result argues the uplift is worth
  doing, and argues just as strongly that doing it by backfill would be worse than not doing it —
  a backfilled map converts a visible gap (`incomplete-node`, advisory) into an invisible one
  (a green map that proves nothing).

## Consequence for the rule

`spec-format-governance`'s backfill paragraph currently states the direction and its rationale
("a spec that stops at `## Use Cases` never draws its CFG or scenario map"). The measurement here
supplies the part it lacks: **what a map built the wrong way still passes**. If that paragraph is ever
revisited, the sharpest available formulation is that a scenario-derived map is 1:1 by construction
and therefore self-certifying — and that this is indistinguishable, mechanically, from a correct one.
