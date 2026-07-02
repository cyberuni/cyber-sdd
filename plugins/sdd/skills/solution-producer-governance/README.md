# solution-producer-governance

Non-user-invocable SDD skill holding the **default solution-producer procedure**: how to record a unit's `<unit>.solution.md` (the chosen approach + rejected alternatives) for a domain no plugin covers — **only** when the unit carries durable design rationale.

Loaded via the harness (`Skill`) by the **conductor** (the main session) when it runs the solution-producer role from the SDD default — the conductor authors **inline** in its own warm context (recorded `produced-by.solution-producer: sdd:automaton`) rather than spawning a producer agent. Relocates the *functional-spec* half of the former `plan-producer` role to a per-unit, optional, ungated facet; the task-DAG half is now the conductor's transient execution `.plan.md` `todos`, not this role's output.

The solution is the unit's **third facet** (spec / suite / solution). It is **optional** (most units have none), **boundary-aligned** (maps to the design decision, not one entry per scenario), and **ungated / unfrozen** — no judge grades it and the spec gate does not see it; the implementation's frozen-scenario result validates it transitively.

References the resolved **architect** actor bar (structural fit) as its self-alignment criterion and `sdd:ownership-governance` for the write-ownership matrix (it never edits `spec.md`, the `.feature`, or control frontmatter). Bakes in the warranted-vs-not test (a real design fork vs a shape that follows from the spec) and the never-restate-the-contract rule.
