# Topic — does the direction of CFG derivation change what a suite finds?

## The question

`sdd:spec-format-governance` and `sdd:suite-format-governance` both mandate one direction when a
spec is backfilled onto existing behavior:

> draw the `## Control Flow` CFG from the code, then its 1:1 `## Scenario map` — the suite is
> **re-derived from that CFG**, not patched from the standing one. Any pre-existing `.feature` is
> **reference only**: each entry is a claim to verify, never the baseline to patch.

The rule is stated as doctrine. It had never been **measured** in this corpus. So: if you build the
map the forbidden way (scenarios → rows → CFG) and the mandated way (contract → CFG → rows), do the
two disagree enough to matter — and if so, *how*?

This dossier answers that with a controlled comparison on one node.

## Scope

**In**

- One case study: `.agents/specs/sdd/mission/handoff/`, a 44-scenario behavioral node (55 with the
  in-flight CR-6 scenarios) whose `spec.md` had no `## Control Flow` and no `## Scenario map`.
- Three artifacts compared: a backfilled map, and two independent contract-first derivations.
- What each direction can and cannot surface, structurally — not merely what it happened to find.

**Out**

- Whether the resulting holes should be filled. That is a spec decision, recorded in `changes.md`
  if and when it is taken.
- The CR-6 design question (how the at-risk sibling set `D` is determined). Unrelated; it blocked at
  its own spec gate for other reasons.
- Any other node. 37 of 40 behavioral nodes in this corpus have no `## Control Flow`, so the
  population is large, but only handoff was measured.

## Method

1. **The backfilled map** was authored first, in-session, by an agent that had already read the
   suite: 55 rows, one manufactured edge per existing scenario.
2. **Two contract-first derivations** were then run as cold subagents, each in its own throwaway git
   worktree, each instructed to delete `handoff.feature` from its worktree **before reading anything
   else** — blindness enforced structurally rather than by instruction. Both were forbidden to read
   `.agents/plans/` or to recover the suite from git history. Both confirmed compliance, and both
   independently reported that the worktree README carried no `## Control Flow` / `## Scenario map`
   section — so both read the *original* prose contract, uncontaminated by the backfilled work.
3. Each derivation read the same inputs: the handoff `README.md`, `start-mission` Step 4 (the shipped
   realization — handoff is enacted by a conductor agent, not a program), the `followup` schema in
   `combat-log-governance`, and `suite-format-governance` as method.
4. The comparison itself was done by the session agent, **not** delegated: every claim was
   re-verified against the corpus by grep before being recorded here.

## Source angles

| Angle | Why it was needed |
|---|---|
| Two derivations, not one | Agreement between two blind readers is evidence; a single reader is an opinion. Divergence localizes what the *contract* underspecifies |
| Structural blinding | An honor-system prohibition against reading a file that is sitting in the worktree is not a control |
| Verification by the parent | Both derivations produced findings that were confidently stated and wrong (see E07); an unverified agent report would have produced bogus spec work |
| A node with no existing map | Nothing to anchor either direction to, so the comparison measures the method rather than an author's memory |
