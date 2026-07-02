---
spec-type: behavioral
concept: routing
---

# gateway/dispatch/ — the approved-plan dispatch loop (the fan-out coordinator)

The gateway's **multi-CR fan-out**, made concrete. Where the gateway proper is the front door that
classifies one request and loads one handling skill, `dispatch` is the path it takes when the work
is a **queue of already-reviewed missions to run headless, one after another**: it selects the plan
briefs a human has cleared (`status: approved`), and runs them **sequentially**, each in a **freshly
spawned automaton**, moving to the next only when the current one finishes. It is the long-promised
**fan-out coordinator** (`../../design/harness-spawning.md`) — the thing that "spawns one automaton
per CR."

Like the rest of the gateway it is **thin**: it spawns and relays, holding no production logic and
writing **no contract state**. Each mission's automaton self-asserts at the autonomy bar and writes
its own `gate` / `strategy` lines; `dispatch` only picks the next brief, spawns, and relays what
comes back. It is entered two ways — an **attended** request ("run the approved missions") or an
**unattended** trigger (a scheduler / cron firing the gateway) — both driving the same loop.

> **This is a single behavioral unit, not an overview.** This spec owns the behavior + suite
> ([`dispatch.feature`](./dispatch.feature)); the impl is the `sdd` gateway skill's fan-out path in
> `plugins/sdd/skills/sdd/`, which spawns the `sdd-automaton` per approved brief.

## Use Cases

**Subject** — the gateway's dispatch loop: select the approved-plan queue and run each mission
headless in a fresh automaton, one at a time, relaying anything that needs a human.

**Non-goals** — it holds **no** production logic and writes **no** contract state (no `status`, no
`approval` — the automaton and the gates own those); it **never** sets a plan's `status` (that is
`../../mission/checkpoint/`), never resumes or retires a mission, and never runs missions in
**parallel** on the shared working tree (parallel fan-out would need worktree isolation — out of
scope). Selection is by the plan `status` flag only — it interprets none of the mission's content.

Every scenario in [`dispatch.feature`](./dispatch.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **select the approved queue** | the queue is the briefs whose `status` is `approved`, via `discover-plans --status approved` (`../../intake/plan-discovery/`) |
| **only approved is dispatched** | a brief left `active` (unset) is never dispatched — approval is the explicit go-signal |
| **skip a no-work brief** | an approved brief whose todos are all completed is skipped — there is nothing to run |
| **run sequentially** | missions run one at a time; the next starts only after the current finishes |
| **a fresh automaton per mission** | each mission is a **newly spawned** `sdd-automaton` with a cold context, not a reused session — nothing carries across missions |
| **relay, never guess** | an automaton that returns `needs-input` or `halt` is relayed (attended) or batched up the relay (unattended); dispatch never auto-accepts past it |
| **writes no contract state** | dispatch spawns + relays only; the automaton self-asserts and writes its own ledger lines |
| **empty queue is a no-op** | no approved briefs → dispatch does nothing and writes nothing |

## Why a fresh automaton per mission — the token floor

The load-bearing choice. The `sdd-automaton` is already **stateless across segments**: it derives
its position from the plan brief and the on-disk artifacts and assumes no in-memory state survives
(`../../mission/conductor/README.md`, `../../design/harness-spawning.md`). Dispatch leans on exactly
that. Each mission runs in a **fresh** automaton born cold, reads only **its** brief + scoped spec
context, does the mission, returns a compact verdict packet, and **dies**. So the dispatch session
itself carries only the queue and the small verdict packets — **not** the accumulated context of
every mission it has run.

This is deliberately **not** compaction or an in-session clear between missions. Compacting would
carry the prior mission's context forward as a lossy summary and risk bleeding mission A's settled
decisions into mission B's grill; a clean spawn carries **nothing**. For a large queue, an
**unattended trigger that fires the gateway once per mission** (cron) bounds even the dispatch
session's growth — it composes with the fresh spawn, it does not replace it.

## The loop

```
dispatch (attended "run the approved missions", or an unattended trigger):
  queue = discover-plans --status approved      # select: every approved brief, in list order
  for brief in queue:
    if brief has no remaining todos: skip        # skip at run time — nothing to run
    spawn sdd-automaton(brief)                    # fresh, cold context per mission
    collect its verdict packet                    # done | needs-input | halt
    on needs-input / halt: relay (attended) or batch (unattended), then continue or stop
    next
```

`discover-plans --status approved` **selects by the flag only** — it returns every `approved` brief
with its todo tally; the **no-work skip is dispatch's, at run time** (it reads the tally and spawns no
automaton for an all-completed brief). So "build the queue" = select by status; "run the queue" =
skip no-work then spawn.

- **Sequential, not parallel.** Missions run one at a time. Parallel automatons on one working tree
  clobber each other (`../../design/cr-concurrency.md`); a parallel fan-out would need per-mission
  worktree isolation and is **out of scope** here.
- **Ordering** is the queue's declaration order (the `discover-plans` list order). A `blocked-by`
  dependency ordering is a possible refinement, out of scope for this node — noted, not silently
  assumed.
- **Selection defers to the flag.** The queue is exactly the `approved` briefs with work left;
  `dispatch` never reads a mission's content to decide whether to run it — a human already did that
  when they set `status: approved` (`../../mission/checkpoint/`).

## Write-ownership is preserved

`dispatch` writes **no** contract state — same rule as the gateway proper. The `status: approved`
flag is written by `../../mission/checkpoint/` (a human clearing the mission); each mission's `gate`
and `strategy` lines are written by its automaton; the `status` advance and human ratification stay
with the gates. `dispatch` only spawns and relays.

## Delivery

Realized by the **`sdd`** gateway skill — `plugins/sdd/skills/sdd/` — as its headless / multi-CR
fan-out path: it runs `discover-plans --status approved` to build the queue and spawns the
`sdd-automaton` once per approved brief, collecting each verdict packet before the next. No new
user-facing skill is introduced; dispatch is the gateway's fan-out behavior, specced as its own node
because it is a distinct, self-contained loop (as `../manage/` is a distinct route).

## Scenarios (colocated)

The behavior suite is [`dispatch.feature`](./dispatch.feature). Cross-capability outcomes that run an
approved mission end-to-end through dispatch live in `../../acceptance/`.
