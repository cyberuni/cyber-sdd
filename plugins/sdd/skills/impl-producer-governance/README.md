# impl-producer-governance

Non-user-invocable SDD skill holding the **default impl-producer procedure**: how to build the implementation **and** its verification (one functional test/eval per frozen scenario) against the frozen `.feature` for a domain no plugin covers.

Loaded via the harness (`Skill`) by `sdd-operator` when it runs the impl-producer role from the SDD default — the Operator builds **inline** in its own warm context (recorded `produced-by.impl-producer: sdd:sdd-operator`) rather than spawning a producer agent. This is the SDD-default builder made explicit as a loadable procedure — what the retired "generic Builder (no agent)" / fabricated `sdd:builder` was always groping for.

References the resolved builder + architect actor bars as its criteria. The grader stays separate: a cold `sdd-implementer` runs the verification this role authored.
