---
status: active
todos:
  - content: "bootstrap the mission graph over the open board (done: orphan ref, synced to origin)"
    status: completed
  - content: "partition #14 into carves and wire its real blockers (done: 4 carves, 3 external)"
    status: completed
  - content: "drain #3's outstanding follow-ups into issues (done: 6 filed, #24-#29)"
    status: completed
  - content: "decide #3's fork: land #24 first, or run a fifth patching round on #3"
    status: in_progress
  - content: "start #12 — the only AFK-ready mission on the frontier"
    status: pending
  - content: "re-derive the frontier after #3's fork is settled; #9 and #10 unblock behind it"
    status: pending
---

# Board sequencing — the open work on cyber-sdd

Not a CR. Manage-level scheduling over the open issues, requested after the #5 mission landed.
No spec changes, no gate, no CR record.

## NEXT — resume here

**First action: run `mission-graph ready` and work the frontier it returns.**

```bash
node plugins/sdd/skills/mission-graph/scripts/mission-graph.mts ready
node plugins/sdd/skills/mission-graph/scripts/mission-graph.mts sync --remote origin
```

The graph is the scheduling authority, not this brief — read state from it, never from here.
Store is the orphan ref `refs/sdd/mission-graph`, published to origin. `cycles` is empty.

**Only one mission is AFK-ready: `github-12-scoring-model-selection`** (aced, touch-set disjoint
from every sdd mission). It can start immediately with no human input. Everything else on the
frontier is `hitl`.

### Blocking decision — #3's fork, awaiting the owner

#3 is halted at its impl gate on a *regressing* loop, not an unfinished one: four rounds scored
61, 61, 62, **57**, and the canonical dispatch block added in round 3 to fix the defect class *at
the rule* itself shipped missing a field, so remediation rule 4 stopped it. One class, three rounds:
a field mandated in prose that no `Input` / `Output` / payload block carries, or the reverse.

Two options, and the agent correctly refused to self-assert between them:

- **Split out the engine** the judge named — a mechanical check reconciling every `UPPER_SNAKE`
  token in a shipped block against the prose mandating it. New spec node, frozen suite, own CR.
  Now filed as **#24**, and admitted to the graph with a `discovered-from` edge from #3.
- **A fifth patching round** — likely reaches 62/62, but is the patching-past-the-stop-signal that
  CR was written to prevent, and two rounds show the class survives prose sweeps.

**#24 is the only #3-discovered mission ready now**, and #3 and #24 can run concurrently. #3 holds
`sdd/authoring`, `sdd/mission`, `sdd/workflows`; #24 holds `sdd/corpus`. Disjoint. #25 and #26 both
hold `sdd/authoring` and are WAW-held by claimed #3, as are #9 and #10.

**Recommendation: the engine, sequenced first**, because #3, #9, #10 and the #5 mission's own
process failure share one root — SDD mandates behavior in prose with no mechanical check that the
prose was honored. `op-sdd-gate-integrity` already contains all four.

Until this is settled, **#9 and #10 stay WAW-held** by claimed #3 (overlap on
`.agents/specs/sdd/spec.md` and `plugins/sdd/skills/spec-gate/`). Lane A is serial by construction.

### #3's follow-ups are drained — they were stranded

#3 halted before handoff, so its drain step never ran and its seven recorded follow-ups existed
only in its ledger. All outstanding ones are now filed; the drain is class-agnostic by contract, so
the backlog ones were filed too, and only the `blocking` ones were admitted to the graph.

| filed | class | was | in graph |
|---|---|---|---|
| **#24** prose-vs-block field reconciliation | blocking | the engine named above | yes, **ready now** |
| **#25** a plugin spec-judge bypasses the gate's pre-flight | blocking | | yes, WAW-held by #3 |
| **#26** no scenario covers the gate's own cold-judge spawn | blocking | | yes, WAW-held by #3 |
| **#27** 36 of 42 behavioral nodes carry no Scenario map | backlog | | no |
| **#28** nothing owns the spec-producer's mode selection | backlog | | no |
| **#29** the producer's output block misspells a field name | backlog | | no |

One earlier blocking follow-up from #3 was issue #5, already fixed and merged.

**#25 deserves attention out of proportion to its size.** The gate's governance pre-flight exists
only in the SDD default spec-judge, so a domain resolving a plugin judge gets no pre-flight at all.
That is the check that caught the #5 mission's own incomplete governance declaration at round 1 — in
a plugin-judged domain it would have passed straight through.

### Findings the commits will not show

- **#14 is fully blocked, which the partition revealed rather than assumed.** All three declared
  external blockers are open — `cyber-truss#6` (the extension contract it must implement is not
  yet defined), `cyberplace#507`, `cyberplace#227`. `checkOperation --id op-cc-integration` reports
  `dependencyClosed: false`. The one near-term carve is `github-14-standalone-guard`, and it is
  itself WAW-held by #3. A full `ssa-lowering` pass was deliberately not run: with every carve
  blocked it has nothing to schedule. Run it when the first blocker clears.
- **ADR-0034 (#4) merged mid-session**, so the spec-architecture question that gated
  `github-14-cc-adapter` is settled; `truss#6` still gates it.
- **RAW edge direction is `--from A --to B` meaning A must finish before B.** Both edges were
  first appended reversed and had to be tombstoned; `ready` reporting "no RAW predecessors" for a
  node you believe is blocked is the tell.
- **A touch-set's atom is a work area — `<project>/<capability>` — not a file path.** Every node
  here was first declared in file paths, which is the wrong grain in both directions: it let
  unrelated missions look disjoint, and then, once `.agents/specs/sdd/spec.md` was added to one, it
  made every sdd mission collide with every other. The root `spec.md` is **not** a work area: every
  mission writes its frontmatter at its own gates, so including it encodes a constant rather than a
  distinguishing fact, and `approval` is last-write-wins by contract anyway. All touch-sets are now
  re-declared in work areas. `collision-ladder` cannot rescue a wrong-grain declaration — asked
  about the `spec.md` overlap it returned `hard / rung: node / confidence: low / reason: no-anchor`,
  which is it correctly declining to guess.
- **Issue #11 was filed in error and is closed** — see the `github-5` brief.

## Resolved decisions — do not relitigate

- Track the board in the mission graph rather than informally (owner's call).
- Partition #14 now; build nothing surface-bound (owner's call).
- Merge #8 first, then brief on #3 (owner's call) — both done.
- External blockers are modeled as `ext-*` nodes so `ready` holds the carves they gate. They are
  other repos' work; this graph only records that they gate.
