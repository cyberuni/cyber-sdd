---
name: plugin-contract-governance
description: "Internal skill: the SDD plugin contract — the five delegate roles a plugin implements, which governances each role loads, and the universal-plugin.json registry shape. Loaded by the conductor and by plugin authors building an SDD plugin. Not triggered by users directly."
user-invocable: false
---

# SDD Plugin Contract Governance

What an SDD plugin must implement and what each part loads. The conductor resolves delegates against
this contract; a plugin author builds to it. The universal-plugin format itself is `plugin-design`
(`governance show universal-plugin`); this skill is the SDD-role layer on top.

## The five delegate roles (closed set)

A plugin covers a set of artifact-types by providing agents for these role keys. Any role may be
`null` (degenerates to the SDD default) or omitted (falls back to the convention name
`<plugin>-<role>`). A **producer** role may also name a model-tuned agent to run at its own
model/effort — the model-tuning escape valve; naming any agent (plugin delegate or model-tuned)
means the conductor **spawns** it.

| Role key | Acts | SDD default |
|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | conductor loads `spec-producer-governance`, authors inline (`sdd:automaton`) |
| `solution-producer` | writes `<unit>.solution.md` (the durable, ungated design fork) | conductor loads `solution-producer-governance`, authors inline (`sdd:automaton`) |
| `spec-judge` | judges `spec.md` + the `.feature` at the spec gate | `sdd-spec-judge` — spawned cold agent |
| `impl-producer` | builds the artifact **and** its verification | conductor loads `impl-producer-governance`, dispatches a generic builder (`sdd:automaton`) |
| `impl-judge` | runs the verification against the frozen `.feature` | `sdd-impl-judge` — spawned cold agent |

**Producers run inline (or via a mechanical builder), judges spawn cold** ("conductor writes, cold
judges grade"): an SDD-default spec/solution-producer is a governance the conductor loads and runs in
its own warm main-session context (recorded `produced-by.<role>: sdd:automaton`); the SDD-default
impl-producer is mechanical and spawned via a generic builder; an SDD-default judge is a cold agent
the conductor spawns, because a grader must not share the author's context. A plugin delegate — or a
model-tuned producer agent named for the slot — is always spawned.

Any of the spawns above may instead be realized through a general-purpose dispatch capability's
`subagent | channel` seam (ADR-0023, referenced by intent only) — an alternative realization of the
same spawn, not a change to which roles spawn or how they are graded.

> The legacy role key was `plan-producer` (writing `plan.md` + `tasks.md`); it is renamed
> **`solution-producer`** writing `<unit>.solution.md` (`sdd:combat-log-governance`). A live registry
> still carrying `plan-producer` is migrated on encounter.

## Which governances each role loads

Bars are the Model-B `(actor, gate)` governances (matched by the `resolve-governances` skill; the
actor bars are the shipped `sdd:{oracle,builder,architect}-{spec,impl}-governance` skills); a producer
self-aligns to exactly the bars its judge grades. The lens sets are spec gate `{oracle, builder,
architect}`, impl gate `{builder, architect}`, solution `{architect}` (ungated).

| Role | Loads |
|---|---|
| spec-producer | `spec-format`, `suite-format`, `ownership`, the resolved `oracle-spec` + `builder-spec` bars |
| solution-producer | `ownership`, the resolved `architect-spec` bar |
| spec-judge | `spec-format`, `suite-format`, `lifecycle`, `gate-validation`, the resolved `oracle-spec` + `builder-spec` + `architect-spec` bars |
| impl-producer | `ownership`, the resolved `builder-impl` + `architect-impl` bars |
| impl-judge | `ownership`, `gate-validation`, the resolved `builder-impl` + `architect-impl` bars |

For an **SDD-default producer** role, the conductor additionally loads the matching
`spec-producer-governance` / `solution-producer-governance` / `impl-producer-governance` — the
procedure it runs — which itself references the bars above; a plugin delegate carries its own
procedure and loads these bars directly.

The `sdd` gateway loads **no** governance (it only classifies and routes). The gate skill
`spec-gate` loads `lifecycle`, `ownership`, `gate-validation`, `combat-log` (+ `spec-format` /
`suite-format` at the spec gate). A plugin's agents inherit the universal loads — e.g. `aced`/`quill`
spec-producers load `sdd:spec-format-governance` + `sdd:ownership-governance`, and their judges load
`sdd:gate-validation-governance`.

## Registry shape

The conductor reads **only** `.agents/universal-plugin.json` (top-level `sdd-plugins[]`) — it does
not scan plugin directories. Each entry:

```json
{
  "name": "<plugin>",
  "version": "<semver>",
  "squads": [
    {
      "artifact-types": ["<artifact-type>", "..."],
      "roles": {
        "spec-producer":     "<agent | null>",
        "solution-producer": "<agent | null>",
        "spec-judge":        "<agent | null>",
        "impl-producer":     "<agent | null>",
        "impl-judge":        "<agent | null>"
      },
      "governances": {
        "oracle-spec":  "<name | null>",
        "builder-spec":   "<name | null>",
        "builder-impl":   "<name | null>",
        "architect-spec": "<name | null>",
        "architect-impl": "<name | null>"
      }
    }
  ]
}
```

A plugin declares one or more **squads**, each serving a **set of artifact-types** with one
production chain; a type appears in at most one squad per plugin (the plugin's served set = the union
of its squads' `artifact-types`).

Resolution: match each file's **`artifact-type`** (the squad key, **not** the folder name) against
each plugin's `squads[]` — the squad whose `artifact-types` contains it serves the file (e.g. ACED's
one squad covers `skill`, `subagent`, `command`, `agents-section`). An absent or unmatched
`artifact-type` → all roles degenerate to SDD defaults. One matching squad → resolve each role and
governance key (name = use it; `null` = SDD default; missing role key = `<plugin>-<role>`). Two or
more plugins claiming the type → return `STATUS: needs-input` for the skill to ask which plugin owns
it; the choice is recorded as `.agents/sdd/` resolution state (**distinct from `produced-by`**),
decisive on resume.
