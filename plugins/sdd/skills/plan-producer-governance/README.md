# plan-producer-governance

Non-user-invocable SDD skill holding the **default plan-producer procedure**: how to author `plan.md` (the solution) and `tasks.md` (a dependency DAG) for a domain no plugin covers.

Loaded via the harness (`Skill`) by `sdd-operator` when it runs the plan-producer role from the SDD default — the Operator authors **inline** in its own warm context (recorded `produced-by.plan-producer: sdd:sdd-operator`) rather than spawning a producer agent. This is the relocation of the former `sdd-planner` agent into a loadable governance.

References the resolved architect actor bar (structural fit) as its criterion.
