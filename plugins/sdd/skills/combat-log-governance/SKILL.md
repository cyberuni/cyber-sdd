---
name: combat-log-governance
description: "Internal skill: the SDD combat-log contract — the two-face provenance record (current-state frontmatter plus the tracked combat log and the durable sharded ledger directory), the report / correction / halt / leash / gate / strategy entry shapes, per-entry handle + combat-log write-time ts under a safe-to-publish floor, the matchable cause enum, and write-ownership. Loaded by the conductor, spec-gate, and the doctrine-loop Scanner. Not triggered by users directly."
user-invocable: false
---

# SDD Combat-Log Governance

The durable, harness-agnostic record of a spec's missions — what was produced, what was judged, what
was corrected, and the strategy distilled from it. This skill defines the **shape**; the tracked
deletion of a retired plan is the `plan-retirement` skill.

## Two faces, two homes

The record has two complementary faces: current-state in `spec.md` frontmatter
(contract), the durable history in a sibling `ledger/` **directory** of per-writer shard files, sibling to the **root** `spec.md`.

| Face | Home | Shape | Mutability | Holds |
|---|---|---|---|---|
| **Current-state** | `spec.md` frontmatter | `produced-by` (map by role) + `approval` (map by gate) | **overwritten** — last write wins | the **standing** present: who produced each artifact, the latest CR's verdict per gate |
| **Ledger** | `ledger/` dir (root sibling), one `<cr-ref>.<hash>.jsonl` shard per CR per writer | one JSON object per line, appended to the writer's **own** shard | **immutable** — appended, never edited | the durable **history**: every CR's run-start `leash` block + `gate` verdict + `strategy` |

`approval` is **standing, not historical** — the one durable spec is flowed through by many CRs, and
`spec.md` `approval` holds only the **latest** CR's verdict (overwritten each time). The durable
per-CR record (*"CR #34's diff was approved by X"*) is a `gate` ledger line, keyed by `cr`. There is
no per-CR `approval` block and no sidecar file.

**The ledger is operational provenance, not contract** — the `ledger/` shards are **never frozen and never
gated**: writers keep appending across the whole lifecycle, including while `spec.md` + the `.feature`
are frozen at `approved`.

## Two logs: the combat log (plan) vs the ledger (sibling dir)

Provenance splits by lifetime. Mid-flight detail is **per-mission and tracked with the work, then
removed at retro** (durable in git history); the durable record is sparse and outlives the CR.

- **Combat log** — `.agents/plans/<cr-ref>.log.jsonl`, beside the plan brief. Holds the chatty
  mid-flight `report` / `correction` / `halt` lines. Tracked (committed, kept in the PR), deleted at retro
  once distilled and the source is done/merged. Already one file per CR, so it never had the shared-file
  merge problem.
- **Ledger** — the `ledger/` **directory**, sibling to the root `spec.md`. Holds only the sparse durable
  `leash` / `gate` / `strategy` lines, as one `<cr-ref>.<hash>.jsonl` shard **per CR per writer**. Never
  deleted.

**Sharded storage (ADR-0020).** Each writer appends only to its **own** shard, so no two writers ever
touch the same file — concurrent appends (two branches, or two sessions sharing one working tree) are
**non-colliding by construction**. A single shared `ledger.jsonl` conflicted on every concurrent mission
(EOF-append merge conflict) or was silently clobbered by a same-tree fork; sharding removes the shared
path, so **no merge driver is used or needed**. The reader **globs** `ledger/*.jsonl` (plus a legacy
`ledger.jsonl` if present) and concatenates. `<hash>` is **6 random hex minted once per writer-session**
(random, **not** a machine/host/user id — that would leak identity); same session + same CR → same shard.

"Combat log" always means the live per-mission log in the plan; "ledger" always means the durable
sibling `ledger/` directory. They are never the same store.

## Entry shapes

One JSON object per line (JSON Lines). Every line carries a **`seq`** (append order *within its shard* —
its shard's own line count, restarting per shard, never a global counter), an optional pseudonymous
**`handle`**, and a `kind`. **Combat-log** lines additionally carry a **write-time UTC `ts`**; **ledger**
lines carry **no wall-clock time** (below). Six kinds, split by tier: `report` / `correction` / `halt`
→ the combat log; `leash` / `gate` / `strategy` → the ledger. Every line carries an optional `cr` (the one
project ledger spans many CRs against the one durable spec; outer-loop `strategy` lines may omit it).

**Safe-to-publish floor (committed-record rule).** The combat log is committed → every line is
**published to git history permanently** ("deleted at retro" is tree-only) and a distilled line may
go **upstream via Forge**. The floor binds **all** fields:

- **Categorical only** — structured fields are enums; the free-text `summary` / `detail` give the
  decision or its class, commit-message-grade.
- **Never committed:** email, OS usernames, hostnames, absolute paths, session/machine ids, secrets,
  code, prompts, literal values, **raw numbers** (token/cost) — those stay in the uncommitted transcripts.
- **Identity is a pseudonym** (`handle`, below), never `user.email`.

**Write-time `ts` — combat-log lines only.** `report` / `correction` / `halt` carry a UTC `ts` (ISO-8601)
stamped at write-time — the doctrine loop reads the committed combat log post-merge (possibly another
machine), when the session clock is gone; within a mission `ts` orders those lines and feeds the pre-merge
coarse-duration signal the efficiency dimension reads from the raw transcripts. **Ledger lines (`leash` /
`gate` / `strategy`) carry no `ts`** — they are the forever-public durable record, and a wall-clock stamp
on a committed cross-machine artifact leaks activity timing/timezone for no load-bearing gain (nothing
reads ledger `ts`; ordering within a shard is `seq`; the cross-mission timeline is git history). Legacy
ledger lines written before ADR-0020 carry a `ts` and are grandfathered (append-only, never rewritten).

**Identity — the per-entry `handle`.** `report` / `correction` / `strategy` carry a `handle` (the
writer's pseudonym); a `gate` line keeps `by` (the ratifier). Resolution at write-time: `SDD_HANDLE`
(env) if set, else omit `handle` and fall back to the git commit author; **never** `user.email`,
never a `git config` read. The in-file `handle` / `by` is **advisory, not proof** — a self-asserter
can write any string, so the git commit signature plus positional authority are the control, not the
field.

### `report` — per-subagent dispatch (combat log)

```jsonl
{"seq": 3, "ts": "2026-06-28T18:30:11Z", "handle": "unional", "kind": "report", "role": "spec-producer", "agent": "sdd:automaton", "outcome": "pass", "summary": "wrote 14 scenarios covering the ledger expansion"}
```

`role` is the production role dispatched; `agent` is the plugin-qualified agent name; `outcome` is
`pass | fail`.

### `correction` — correction-with-cause (combat log)

One line per correction: a gate rejection, a producer⇄judge iteration, or a Council kick-back. The
matchable `cause` is the load-bearing field; at retro the doctrine loop folds recurring `cause`s into
the ledger's `strategy` count.

```jsonl
{"seq": 7, "ts": "2026-06-28T18:41:02Z", "handle": "unional", "kind": "correction", "correction-kind": "gate-reject", "cause": "coverage-gap", "detail": "spec gate rejected — no negative scenario for the malformed-entry path"}
```

- **`correction-kind`** — the closed set `gate-reject | judge-iteration | council-kickback` (the
  *occasion*, not the cause).
- **`cause`** — a minimal, **discovered** enum (the matchable category of *why*). Grounded so far:

  | Cause | Means |
  |---|---|
  | `coverage-gap` | a use case or operation lacked a covering scenario |
  | `design-overreach` | the design added a mechanism the architecture did not need |
  | `spec-feature-contradiction` | the `spec.md` body and the `.feature` asserted contradictory behavior |

  **Growth:** closed at any moment, discovered from usage — a new value is added only when a real
  recurring correction has no category. Adding one is an **edit to this governance, ratified by the
  Council** (a producer/judge/conductor never edits the enum). An **absent or off-enum `cause` fails
  closed** (it breaks cross-mission matchability).

  **Efficiency** is a categorical correction class the committed log is designed to carry — the
  conductor flagging notable token-waste (a class, **never raw counts**), so the post-merge doctrine
  loop keeps the dimension. Its concrete `correction-kind` / `cause` are **not seeded**; they enter by
  the same Council-ratified growth, and the numeric depth stays transcript-only (the floor admits no
  raw token number).

### `halt` — a mid-flight stop, not at a gate (combat log)

The agent halts mid-phase (a hard floor, an input it cannot supply, a blast radius it will not cross).
A gate-time stop is a `gate` line (`verdict: pause`); this `halt` line is its mid-flight twin, so *"why I
halted"* is as durable as *"why I went"*. **Flush it to the committed log during the mission** — the
doctrine loop reads only the committed log post-merge.

```jsonl
{"seq": 5, "ts": "2026-06-28T18:50:33Z", "handle": "unional", "kind": "halt", "phase": "explore", "why": {"floor": "clearance", "blast": "high — would drop scenarios from a frozen suite", "novelty": "low", "confidence": "high"}}
```

- **`phase`** — `intake | explore | deliver | handoff`, where the mission stopped.
- **`why`** — the same categorical block the `approval` map carries (`floor` / `blast` / `novelty` /
  `confidence`), **classes only** — never the raw blocker content.

### `gate` — the durable per-CR gate verdict (ledger)

```jsonl
{"seq": 2, "kind": "gate", "cr": 34, "gate": "spec", "verdict": "approve", "by": "unional", "cause": "dimension", "frozen": ["intake/intake.feature", "mission/mission.feature"]}
```

- **`gate`** — `spec | impl`. **`verdict`** — `approve | pause | reject`. **`by`** — a human name
  (ratified) or `agent` (self-asserted, provisional; carries the `why` derivation).
- **`cause`** — `dimension | ceiling` (the **stop cause**, distinct from a `correction`'s matchable
  `cause`).
- **`frozen`** — the suite files this verdict froze (spec-gate `approve` only), so the ledger answers
  *"what was frozen as of CR #34"* standalone — no git walk.

### `leash` — the conductor's run-start autonomy block (ledger)

The conductor's **initial strategy evaluation**, written once at run start: the run-level `leash`
reach + the `approach[]` containment methods. It is the conductor's autonomy bar for the mission —
**not** the Scanner's `strategy`, carries **no** `ratified` field, and is **never** counted as
pending strategy. The write is owned by the **conductor** (`start-mission`).

```jsonl
{"seq": 1, "kind": "leash", "cr": "disambiguate-strategy-kind", "leash": "auto-spec", "by": "user", "blast": "medium", "approach": ["no-spike", "worktree"]}
```

`leash` — `auto-none | auto-spec | auto-all`; `by` — `derived | user`; `blast` — the assessed
radius; `approach[]` — containment methods. The ceiling is not recorded (session-local). Pre-rename
historical run-start blocks appear as `kind: strategy` and are grandfathered (append-only ledger).

### `strategy` — drafted strategy (ledger)

The Scanner records drafted strategy; this contract defines the **shape**, the **write is owned by
the doctrine-loop Scanner**. It carries the distilled recurrence count for a `cause` (in `evidence`).

```jsonl
{"seq": 1, "handle": "sdd-scanner", "kind": "strategy", "recommendation": "codify the coverage-gap pattern as a spec-format-governance check", "evidence": ["coverage-gap x3 across sdd-foo, sdd-bar, sdd-baz"], "ratified": false}
```

`ratified: false` means the Council holds keep-or-cut — unratified strategy never enters the corpus.

## Write ownership

Append-only; each writer adds lines to its **own shard** with the next `seq` within that shard, never
editing another writer's shard, and never editing or deleting a prior line. Full matrix in
`sdd:ownership-governance`:

| Writer | May append | To |
|---|---|---|
| **conductor** | `report`, `correction`, `halt` | the **combat log** (plan `*.log.jsonl`) |
| **conductor** | run-start `leash` block (leash reach + `approach[]`) | the **ledger** |
| **conductor** | self-asserted `gate` (`by: agent`) | the **ledger** |
| **gate skill (`spec-gate`), in-session** | human-ratified `gate` (`by: <name>`) | the **ledger** |
| **doctrine-loop Scanner** | `strategy` | the **ledger** |
| producers / judges | nothing | — |

A human-ratified `gate` line follows the **positional authority** rule (`sdd:lifecycle-governance`):
only the in-session position holding the user channel writes `by: <name>`.
