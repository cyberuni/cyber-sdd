# resume-mission

Project-private workflow skill for **resuming an in-progress SDD mission from its plan brief**
(`.agents/plans/<cr-ref>.plan.md`). Invoke it at the start of a new session ("load the plan",
"resume the mission", "continue github-NN") to re-establish the working method and spec context,
find the next todo, and continue without relitigating settled decisions.

The plan is the **state** (mission-specific todos, decisions, findings); this skill is one
convenient **procedure** for picking any plan up — any session that reads the plan can continue
without it. If no plan exists yet, it scaffolds one from a basic template. `internal: true` —
contributor tooling for this repo, not a shipped SDD capability. If "mission resume" should become an SDD-delivered
capability, spec it in `mission/` first and build the impl in the SDD plugin.
