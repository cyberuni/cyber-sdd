# pause-mission

Project-private workflow skill for **checkpointing an in-progress SDD mission into its plan
brief** (`.agents/plans/<cr-ref>.plan.md`). Invoke it when stopping mid-mission ("pause",
"checkpoint", "save state to the plan", "stop here") to update the todo statuses and rewrite
the `## NEXT — resume here` anchor, then commit — so the working tree is clean and the next
session resumes without rediscovery.

Pass **`--approve`** to also clear the mission for **headless dispatch** — it sets the brief's
top-level `status: approved` (a human review act; a headless automaton never self-approves), the
go-signal the gateway's dispatch loop selects on.

The checkpoint is **self-sufficient**: any later session that opens the plan can continue from
it — [`resume-mission`](../resume-mission/README.md) is one convenient reader, not a required
pair. Modeled after the handoff-skill pattern (reference artifacts instead of restating, keep it
commit-message-grade, lead the `## NEXT` anchor with the next action *and the skill to invoke for
it*) but targeted at the durable tracked plan rather than a temp file. `internal: true` —
contributor tooling.
