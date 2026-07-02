# aced-builder-spec

Internal ACED governance (`user-invocable: false`). The **Builder** actor bar at the **spec gate**,
specialized for agent-configuration artifact-types — it **unions onto** `sdd:builder-spec-governance`
and adds the criteria that make an agent-config `.feature` a complete, simulable contract: concrete
trigger context per scenario, every rule covered, balanced should-trigger / near-miss cases, ≥3 edge
guards, and pure boolean `Then` steps (no rubric/threshold/score in the suite).

One merged bar loaded by **both** faces — the ACED spec-producer (`aced-scenario-writer`, forward)
and the cold spec-judge (`aced-spec-validator`, backward); `producer ≠ judge` holds at the agent
level. Bound in `.agents/universal-plugin.json` as the ACED squad's `builder-spec` governance; the
conformance side is the impl gate's `aced-builder-impl`. Not triggered by users directly.
