# ADR-0038: SDD v2 absorbs SDD v1 by porting the loop and the gates, and moving the rest to their owners

## Status

Accepted

**SDD version:** v2 (`packages/cyber-sdd`, `sdd2`).

## Context

SDD v1 (`plugins/sdd`, `cyber-sdd` 0.7.x) has capabilities that SDD v2 (`packages/cyber-sdd`, `sdd2`)
lacks. v2 has one skill, `spec`, and a stub CLI. v1 has the change-request lifecycle, the mission
loop, the spec gate and impl gate, the mission graph, the doctrine and formation outer loops, the
ledger, placement and discovery, and the `check:specs` family.

The Council decided earlier that the mission loop belongs to v2, that truss keeps the bigger picture,
and that cyberfleet manages the fabric (the automaton interactions). v2 splits a spec into a design
spec and a functional spec, and the functional spec's suite sits beside the implementation
([ADR-0037](0037-sdd-v2-keeps-design-spec-and-functional-spec.md)). cyberfleet ADR-0029 keeps
dependencies and the frontier in the tracker, and the process layer must not depend on the fleet.

Five paths were considered: grow v2 in place (O7), make truss the engine (O8), move each engine to
its owner (O9), coexist and bridge (O10), and use agentkit's eval, check and test split for
verification (O11).

## Decision Drivers

- The loop and the gates are the process, so they stay in the process layer.
- Dispatch and the frontier must not return to the process layer.
- Truss is not built, so nothing may wait on it.
- v1 is retired whole, so the transition must not edit v1 code.

## Considered Options

### Option 1: Port the loop and the gates into v2; move the graph and dispatch to cyberfleet; test with evals (chosen)

- **Pros**: fastest route to parity; keeps the process layer free of dispatch; reuses tested v1
  engines.
- **Cons**: v1 and v2 coexist in this repository until the migration finishes.

### Option 2: Make truss the engine

- **Cons**: truss is scaffold-only, so parity waits on it.

### Option 3: Coexist, with v1 keeping the loop and v2 as its spec-producer

- **Cons**: defers absorbing and leaves two owners of the loop. Rejected by the Council.

## Decision

Option 1. SDD v2 absorbs SDD v1 as follows.

| Concern | Home in v2 |
|---|---|
| Change-request lifecycle, mission loop | v2 skills. One conductor replaces v1's conductor and automaton, with a headless realization for unattended runs. |
| Spec gate, impl gate | v2 skills; the judge is spawned cold. |
| Spec validation, discovery, anchors, concept index, plan retirement | v2 CLI. Deterministic scripts, with `.feature` and spec parsing built on gherkin-cli. |
| Mission graph, scheduling, dispatch | cyberfleet. The process layer does not import them. |
| Doctrine loop, formation loop | Two scheduled skills, one each (see below). |
| Ledger | A reduced ledger (see below). |

**The loop.** v2's conductor keeps v1's steps and their names, including *explore*. How explore runs
is a method, kept in a reference loaded through `cyber-agentkit:reference`, so a repository can
override it. The default method is **build-along**: the agent builds while it writes the spec, not as
a throwaway spike. The implementation is kept unless the spec changes direction. A finding lives in
the implementation and the spec, so the reduced ledger needs no place for it.

**The leash.** The name stays. The leash is how far an agent may act without asking, and it decides
who ratifies a gate. It never exempts a run from a gate, so it is not a waiver. v2 derives it from
reach (blast-estimate) at the start of a run, as v1 does, and it may skip the build in explore for a change
that is prose only.

**The gates.** The spec gate and the impl gate are v2 skills, each judged by a cold subagent. The
judge grades with the three lenses (oracle, builder, architect), loaded through the
`cyber-agentkit:reference` skill so a repository can customize them. A gate's verdict is recorded in
the pull request, and what it froze is the diff of the test suite.

**Outer loops.** The doctrine loop and the formation loop become two scheduled skills, in the manner
of self-improvement. A cadence replaces v1's lifecycle triggers.

- The doctrine loop only appends unratified `strategy` entries to the ledger and surfaces them to the
  Council. Nothing enters the corpus without the Council's keep-or-cut. It never redrafts a mission
  already distilled.
- The formation loop reads corpus structure only, never the ledger's mission history, and keeps a
  cursor over the public trail.

**Placement and discovery.** A project's design specs live in `<project>/.agents/spec/`. A functional
spec sits beside the implementation. Discovery is by filename convention (`spec.md` beside the code),
with no index to drift. v1's placement strategies and the oversized-node split do not carry over.

**Ledger.** The ledger shrinks to what a scheduled loop needs: `strategy` entries, a cursor, and a
`cause` recurrence count. It lives at `.agents/cyber-sdd/ledger.jsonl` in the repository, as JSONL.
v1's per-gate entries are not carried over.

**Verification.** A test suite is a concept; its form depends on the subject. For agent
instructions the suite is evals, run with `cyber-agentkit:skill`; for code it is tests under the
project's runner. The existing `.feature` suites convert to evals. The decision does not wait on
[cyber-agentkit#404](https://github.com/cyber-uni/cyber-agentkit/issues/404) or on an analysis of
BDD in ACED.

**Planned before the build.** The Council is considering two kinds of statement in a spec: *intent*,
which the Council directed or agreed, and *induced*, which is summarized from the implementation so
the Council can review its behavior. Intent would carry the weight, and induced statements would be
regenerated from the code. That may shrink the functional spec a great deal. This decision does not
settle it, but it shapes how the gates grade, so it is planned as a feature before the build starts.

**Checks during the transition.** `check:specs` stays the v1 script and keeps guarding the v1 specs.
v2 gets its own script, `check:specs-v2`, and `pnpm verify` runs both. v1 is then retired by deleting
its script whole. `check:skills` extends to `packages/*/skills`.

## Consequences

### Positive

- The process layer keeps no dispatch, in line with cyberfleet ADR-0029.
- v1's check script is deleted whole at the end, with no edits to it in the meantime.
- The outer loops need no trigger plumbing, only a schedule and a small ledger.

### Negative

- `verify` runs two spec checks until the migration finishes
  ([cyberuni/cyber-sdd#220](https://github.com/cyberuni/cyber-sdd/issues/220)).
- Converting the suites to evals loses the `@trigger` and `@rubric` form, and the conversion must
  keep their coverage.
- The v1 ledger's per-mission provenance is not carried over, so the doctrine loop sees less history.

## Related Decisions

- [ADR-0034](0034-colocate-the-node-spec-keep-the-frozen-suite.md): v1's frozen suite, which does not
  carry over to v2.
- [ADR-0037](0037-sdd-v2-keeps-design-spec-and-functional-spec.md): the two rungs this decision relies
  on.
