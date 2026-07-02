# ADR-0020: Shard the durable ledger into per-writer files

## Status

Accepted

Partially supersedes the single-file/`merge=union` ledger storage decision in
[ADR-0015](0015-three-tier-provenance-and-plan-handoff.md). The three-tier model (plan / ledger /
public trail) is unchanged; only the durable ledger's **on-disk shape** changes.

## Context

The durable ledger was one shared append-only file, `.agents/specs/<project>/ledger.jsonl`, holding
the sparse `leash` / `gate` / `strategy` outcome lines. Two writers appending at end-of-file produce
overlapping EOF hunks, so **every concurrent mission raised a git merge conflict** on the ledger.
ADR-0015 anticipated this and prescribed a `merge=union` driver plus a CR-scoped `seq`, but that
`.gitattributes` was never wired, and the live `seq` drifted to a global counter (reaching 53).

Two facts made `merge=union` the wrong target even if wired:

1. **It does not cover the shared-tree case.** The fork-right workflow runs two sessions in **one
   working tree**. There is no git merge there — both processes write the same file and the second
   clobbers the first (a real incident: a lost ledger recovered via a `git fsck` dangling blob).
   `merge=union` only helps a 3-way merge, so it is silent on this failure mode.
2. **It papers over rather than removes the contention.** Union merge keeps both sides' lines but
   needs trailing-newline discipline and produces duplicate/global `seq`; the shared path remains.

Neither `seq` nor a wall-clock `ts` is load-bearing: the only code reader (`check-spec-state.mts`)
checks that a matching `gate`+`verdict:approve` line *exists*; the gateway *counts* `strategy`
lines with `ratified:false`. Nothing indexes `seq`; ordering, where it matters, is git history.

## Decision Drivers

- Kill the merge conflict **and** the shared-tree clobber — not just one.
- Prefer a change that makes the bad state **impossible** over one that auto-resolves it.
- Keep the reader trivial; do not make `seq`/`ts` load-bearing.
- Privacy: the ledger is committed and forever-public; avoid leaking activity timing.

## Considered Options

### Option 1: Wire `merge=union` + CR-scoped `seq` (ADR-0015 as written)

- **Pros**: smallest change; one file; honors the prior decision.
- **Cons**: does nothing for the shared-tree clobber; union merge is a blunt instrument (newline
  discipline, duplicate `seq`, unordered result); the shared path persists.

### Option 2: One file per entry (changesets-style)

- **Pros**: conflicts structurally impossible.
- **Cons**: file explosion (one file per gate/strategy line); more read-side globbing; larger churn.

### Option 3: One file per CR per writer, random-hash suffixed (chosen)

- **Pros**: conflicts **structurally impossible** across branches *and* same-tree sessions — no two
  writers ever touch the same path; no merge driver; far fewer files than per-entry; `seq` becomes a
  free per-shard line count.
- **Cons**: reader globs a directory instead of reading one file; the ledger's on-disk identity
  changes from a file to a directory (migration + doc sweep).

## Decision

Store the durable ledger as a **directory** `ledger/` sibling to the root `spec.md`, holding one
shard file **per CR per writer**:

```
.agents/specs/<project>/ledger/
  <cr-ref>.<hash>.jsonl    # conductor leash+gate lines for one CR
  strategy.<hash>.jsonl    # Scanner strategy lines (often CR-less)
  0000-legacy.jsonl        # the migrated pre-ADR ledger.jsonl (history preserved)
```

- `<hash>` is **6 random hex minted once per writer-session** — random, **not** derived from a
  machine/host/user id (deriving it would leak identity and violate the safe-to-publish floor).
  Same session + same CR → same shard; a different session or tree → a different hash → a different
  file. That is what makes concurrent appends non-colliding.
- Each writer appends **only to its own shard**; no merge driver is used or needed.
- The reader **globs** `ledger/*.jsonl` (plus a legacy `ledger.jsonl` if present) and concatenates.
- `seq` is each shard's own line count (restarts per shard); **no cross-writer coordination**.
- **Ledger lines drop the wall-clock `ts`.** Nothing reads it; ordering within a shard is `seq`, the
  cross-mission timeline is git history, and a timestamp on a forever-public committed artifact leaks
  activity timing/timezone for no gain. Combat-log lines (`report`/`correction`/`halt`, transient,
  feeding the pre-merge efficiency pass) **keep** `ts`. Legacy ledger lines with a `ts` are
  grandfathered.

## Rationale

Sharding removes the shared resource entirely, so the concurrency question dissolves rather than being
merge-resolved — this is the only option that also covers the shared-tree fork, and it needs no git
configuration to work. It is strictly simpler than per-entry files (fewer files, `seq` stays a useful
handle) while giving the same structural guarantee.

## Consequences

### Positive

- Ledger merge conflicts and same-tree clobbers are impossible by construction.
- No `.gitattributes` / merge-driver dependency; portable across every host and workflow.
- Privacy improved: the durable record carries no wall-clock time.

### Negative

- Readers must glob a directory; `check-spec-state.mts` and the gateway strategy count change.
- More (small) files than one ledger — bounded at one per CR per writer.

### Risks

- A stale reader that expects a single `ledger.jsonl` sees only the migrated legacy shard until
  updated. Mitigated: the reader globs `ledger/*.jsonl` **and** a legacy `ledger.jsonl`, so migration
  is a pure `git mv` with no window of loss.
- The shard address is a 6-hex random hash (~16.7M values). "Non-colliding by construction" means no
  two writers ever *intentionally* write the same path, not that a hash collision is impossible — two
  concurrent writer-sessions on the *same* CR would need the same hash to collide (~1 in 16.7M). This
  is well below any real risk at SDD's concurrency; a future high-concurrency need could widen the
  hash or fold in the session pid.

## Implementation Notes

- Migration: `git mv .agents/specs/<project>/ledger.jsonl .agents/specs/<project>/ledger/0000-legacy.jsonl`
  for both the `sdd` and `aced` project specs. No re-numbering; history preserved.
- Update the glob reader (`check-spec-state.mts` + tests) and the writer procedures in
  `start-mission`, `doctrine-loop`, and the `sdd` gateway (mint the session hash once, append to the
  own shard).
- Follow-up (out of scope): a machine-invariant coarse effort metric (engagement count, not
  wall-clock) for the Scanner's efficiency dimension, replacing what `ts`-derived duration implied.

## Related Decisions

- [ADR-0015](0015-three-tier-provenance-and-plan-handoff.md) — establishes the three-tier provenance
  model and the single-file `merge=union` ledger this ADR reshapes.
