# split-spec

Internal SDD skill: the **Manage specs & graph** split station. Decomposes one oversized `spec.md` into a **project spec plus feature children** when it trips the `spec-governance` granularity heuristic (a `.feature` past ~15–20 scenarios, use cases spanning more than one behavior, or parts changing on independent cadences).

A split is not mechanical sharding — a spec is read by humans to understand the project. So the station pairs actor-owned structural correctness (**Architect** leads the seams, **Director** checks each child is a coherent scope, **Builder** checks coverage survives) with **two Council confirmation checkpoints**: confirm the plan before sharding, and confirm the result before committing. The human owns how the project reads.

Run by `sdd-operator` as a station; routed to by the `sdd` gateway's *Manage specs & graph* path. Not triggered by users directly.
