# check-plan-safety

Internal SDD skill — the concrete guard engine for the **plan brief's safe-to-publish floor**. Scans
the tracked, portable handoff artifacts under `.agents/plans` (the `*.plan.md` brief + sibling design
docs) for machine-local references that must never enter git history.

```bash
node scripts/check-plan-safety.mts --root .                 # audit (TOON finding set)
node scripts/check-plan-safety.mts --root . --check         # CI guard (fails on any leak)
node scripts/check-plan-safety.mts --path <file> --check    # check one explicit file
```

Flags a **home-directory absolute path** (`/home/<user>/…`, `/Users/<user>/…`, `C:\Users\<user>\…`)
or a **`$HOME`/`$USER` expansion** — each leaks an OS username and breaks portability. A bare `~/` is
deliberately not flagged (no username; legitimate in design prose). The plan-brief analog of the
combat log's floor. Read-only; writes nothing. See [`SKILL.md`](./SKILL.md) for the full contract.
Not user-invocable.
