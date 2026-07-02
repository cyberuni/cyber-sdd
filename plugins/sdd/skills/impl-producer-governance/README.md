# impl-producer-governance

Non-user-invocable SDD skill holding the **default impl-producer procedure**: how to build the implementation **and** one verification per frozen scenario against the frozen `.feature` for a domain no plugin covers.

Loaded via the harness (`Skill`) by the **spawned generic builder** the conductor dispatches for the impl-producer role (recorded `produced-by.impl-producer: sdd:automaton`). The impl-producer is **mechanical and spawned** on every surface — unlike the spec / solution-producer, which the conductor runs inline (the live grill). The grader stays separate: a cold `sdd-impl-judge` runs the verification this role authored.

References the resolved **builder** + **architect** actor bars (the impl-gate lens set, forward face — used both to self-align and to author the verification) and `sdd:ownership-governance` for the write-ownership matrix. Bakes in the explore-vs-implement mode split (spike against a draft `.feature` vs build-to-keep against a frozen one), the one-verification-per-frozen-scenario rule (anchored, never free-authored), the rubric-stays-out-of-the-feature rule, and the never-edit-the-contract constraint (a behavior gap is a `CONTENT_GAP` / `BLOCKER`).
