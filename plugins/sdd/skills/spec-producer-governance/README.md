# spec-producer-governance

Non-user-invocable SDD skill holding the **default spec-producer procedure**: how to author the `spec.md` body and a boolean Gherkin `.feature` for a domain no plugin covers.

Loaded via the harness (`Skill`) by `sdd-operator` when it runs the spec-producer role from the SDD default — the Operator authors **inline** in its own warm context (recorded `produced-by.spec-producer: sdd:sdd-operator`) rather than spawning a producer agent. This is the relocation of the former `sdd-scenario-writer` agent into a loadable governance (the governance-skill producer model). The grader stays separate: a cold `sdd-spec-judge` reviews the output.

References `sdd:spec-governance` (the universal format bar) plus the resolved oracle + builder actor bars as its criteria.
