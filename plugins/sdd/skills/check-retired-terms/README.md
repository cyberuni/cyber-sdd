# check-retired-terms

Internal SDD skill — the concrete guard engine for the **retired-terms registry and its
corpus-wide sweep**. Scans every git-tracked file for a literal, case-sensitive occurrence of a
term registered in `.agents/sdd/retired-terms.toml` as retired by a design decision.

```bash
node scripts/check-retired-terms.mts --root .            # the verify-time sweep
node scripts/check-retired-terms.mts --root . --list     # what is registered
```

Reports every survivor as `file:line:term — replace with: <replacement>`, then a count, and exits
non-zero. A malformed registry exits non-zero and names the parse error rather than reporting
clean. Built-in exclusions (the registry, the engine's own source/test, this node's own
README/`.feature`, every `ledger/` directory, `.agents/plans/`) are always applied and never
configurable; per-entry `scope` and `allow` narrow further. Read-only; writes nothing. See
[`SKILL.md`](./SKILL.md) for the full contract; the `corpus/retired-terms` node of the SDD project
spec (repo-only) carries the frozen spec. Not user-invocable.
