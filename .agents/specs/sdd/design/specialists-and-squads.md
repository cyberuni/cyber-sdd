---
concept: [governance, resolution]
---

# Specialists & squads

The selection model behind production: the **squad**, the five delegate roles, which governances each loads, and the **registry SHAPE** that stores it.
This file owns the squad model and the `.agents/universal-plugin.json` role-map shape.
The init-WRITE of an entry lives in `../plugin/`; READ/resolution from the registry lives in `../mission/`.

## The squad

The producer/judge selection unit is the **squad**, keyed by **artifact-type**:

```
artifact-type → { producer, judge, governances (actor + discipline), model, effort }
```

- **One squad per artifact-type; one producer per file.**
  No producer composition, no "best match" producer race — each file resolves to exactly one squad.
  The exclusion is **per file**, not per spec: a project-spec CR touches many artifact-types and so summons **multiple** specialists at once, but **no two producers ever act on the same file**.
  Each file has exactly one artifact-type → exactly one squad → exactly one producer; the conductor orchestrates the set and merges their outputs.
- **artifact-type** = the squad key (`artifact-type.md`).
  It names the artifact / squad (`skill`, `subagent`, `command`, `agents-section`, `docs`, `npm-package`, `react-component`, …) — an open string, never a folder name.
  Each **file** has exactly one artifact-type, **resolved not stored** (`artifact-type.md`); a project spans many types and summons one squad per type.
  There is no structural `project | feature` axis — one project is one spec, and folders are views, not lifecycle units (see `project-unit.md`).
- **Disciplines (process/workflow) fold into governances.**
  "Basic knowledge" (React, TS, logic) is never *loaded* — it is just picking the right **model + effort**.
- **Language ≠ squad.**
  "TS script for a skill" lives inside the *skill* squad (skill-script rules: no deps unless packaged), NOT a generic `code` squad.
  The artifact-in-context determines the knowledge, not the file extension.

A **squad** = the producer + judge **specialists** (with their gear — governances, model, and effort) for one artifact-type.
A CR summons the squads for the artifact-types it touches; the **conductor** (the main session) orchestrates them and delivers.

**The contested-type choice stays distinct from `produced-by`.**
The chosen plugin for a contested artifact-type is a forward input to resolution (decisive on resume); `produced-by` = who actually produced each artifact (after-the-fact record, see `provenance-model.md`).
Conflating them was the original `sdd-plugin` impl-gate blocker.

## The five delegate roles (closed set)

A plugin covers a set of artifact-types by providing agents for these role keys.
Any role may be `null` (degenerates to the SDD default) or omitted (falls back to the convention name `<plugin>-<role>`).
A **producer** role may also name a model-tuned agent to run at its own model/effort — the model-tuning escape valve; naming any agent (plugin delegate or model-tuned) means the conductor **spawns** it (subject to the role-dependent surface below).

| Role key | Acts | Surface | SDD default |
|---|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | **in-session** (persona) | the conductor loads `spec-producer-governance` and authors inline (`sdd:automaton`) |
| `solution-producer` | writes the per-unit **solution** (`<unit>.solution.md` — the decision record: chosen approach + rejected alternatives) when a unit has durable rationale | **in-session** (persona) | the conductor loads `solution-producer-governance` and authors inline (`sdd:automaton`) |
| `spec-judge` | judges the `.feature` at the spec gate | **spawned cold** | `sdd-spec-judge` — spawned cold agent |
| `impl-producer` | builds the artifact **and** its verification | **spawned** | the conductor spawns a builder that loads `impl-producer-governance` (`sdd:automaton` marks the SDD-default chain) |
| `impl-judge` | runs the verification against the frozen `.feature` | **spawned cold** | `sdd-implementer` — spawned cold agent |

**The conductor is the main session.** The conductor is the main (user) session; it holds the user channel and is the positional ratifier (`lifecycle-model.md`).
It runs the **spec-producer** and **solution-producer** **inline** (recorded `produced-by.<role>: sdd:automaton`) because spec-producing *is* the live human grill, which must stay where the user channel lives.
The **impl-producer** (mechanical — it builds against a contract) and **every judge** (cold, because a grader must not share the author's context) run as **spawned subagents at depth 1 from the main session** — a spawn tree every harness supports (`harness-spawning.md`).
This is the **role-dependent surface**: a `spec-producer` / `solution-producer` — SDD-default **or** plugin specialist — is **persona-loaded in-session**; an `impl-producer` or any judge is a **spawned subagent**.
The judge stays a **distinct actor** (producer/judge separation), the surviving invariant of the gate fold.

There is **no separate "generic Builder" registry entry**: an unfilled spec/solution-producer is the **conductor authoring inline**, an unfilled impl-producer is the **conductor spawning a builder** that runs `impl-producer-governance`, and an unfilled judge is the **cold SDD-default agent**.
The `<plugin>-<role>` naming convention applies only when a role **key is omitted** and the plugin ships an agent at that conventional name.

## Which governances each role loads

Each role loads two tiers (`governance-resolution.md`): **fixed-universal** bars (invariant per role) plus the **resolved-actor** bars for the gate's lens set, loaded as the role's **face** — producers load the **forward** face, judges the **backward** face:

| Role | Fixed-universal | Resolved-actor (face) |
|---|---|---|
| spec-producer | `spec-format-governance`, `suite-format`, `ownership-governance` | `oracle`, `builder`, `architect` — **forward** |
| solution-producer | `ownership-governance` | `architect` — **forward** (ungated; no judge) |
| spec-judge | `spec-format-governance`, `suite-format`, `lifecycle-governance`, `gate-validation-governance` | `oracle`, `builder`, `architect` — **backward** |
| impl-producer | `ownership-governance` | `builder`, `architect` — **forward** |
| impl-judge | `ownership-governance` | `builder`, `architect` — **backward** |

**Lens set per gate** (the sdd-default squad; a squad may override): **spec gate** `{oracle, builder, architect}`; **impl gate** `{builder, architect}`; **solution** `{architect}` (ungated).
The invariant: **a producer self-aligns to exactly the bars its judge grades** — the same bars forward and backward, loaded as separate faces.
The impl-gate Oracle-revert (`autonomy-rubric.md`) is a conductor escalation the impl-judge surfaces, not a routine impl-judge bar.

For an **SDD-default spec/solution-producer** role, the conductor additionally loads the matching `spec-producer-governance` / `solution-producer-governance` — the procedure it runs inline; for an **SDD-default impl-producer**, the spawned builder loads `impl-producer-governance`.
A plugin delegate carries its own procedure and loads these bars directly.
The gate skill `spec-gate` loads `lifecycle-`, `ownership-`, and `gate-validation-governance`; the conductor loads all three.
The `sdd` gateway loads **no** governance — it is a thin relay that only classifies and routes (`actors-governance.md`, `gateway/README.md`); reading a raw `status` value for routing needs no governance load.
How each resolved-actor bar is discovered, composed, and loaded: `governance-resolution.md`.

## Registry SHAPE

The registry lives in `.agents/universal-plugin.json` as a top-level `sdd-plugins[]` array — a project-level map from each installed plugin to the **squads** it provides.
It is the **single resolution source** the conductor reads; there is no out-of-band assignment fallback.
The conductor reads **only** this file — it does not scan plugin directories.
Each entry declares one or more **squads**, each serving a **set of artifact-types** (the squad-per-artifact-type principle, without duplicating a shared squad):

```json
{
  "name": "<plugin>",
  "version": "<semver>",
  "squads": [
    {
      "artifact-types": ["<artifact-type>", "..."],
      "roles": {
        "spec-producer": "<agent | null>",
        "solution-producer": "<agent | null>",
        "spec-judge":    "<agent | null>",
        "impl-producer": "<agent | null>",
        "impl-judge":    "<agent | null>"
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

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Plugin name; matches the plugin's `.plugin/plugin.json` `name` |
| `version` | Yes | Installed plugin version |
| `squads` | Yes | One or more squads. A squad = `{ artifact-types[], roles{}, governances{} }`. A plugin needing a *different* producer/judge per type lists multiple squads; a shared squad lists many types. The plugin's served set (marketplace discovery) = the union of all `squads[].artifact-types` |
| `squads[].artifact-types` | Yes | Open-string **artifact-type**s this squad serves (e.g. `skill`, `subagent`, `command`, `agents-section`) — never folder names; new types need no schema bump. A type appears in **at most one** squad per plugin |
| `squads[].roles` | Yes | Map of the five production-chain roles to agents; `null` or omitted = SDD default (a spec/solution-producer role → conductor authors inline as `sdd:automaton`; an impl-producer role → conductor spawns a builder; a judge role → conductor spawns the cold SDD-default judge agent) |
| `squads[].governances` | Yes | Model-B actor-gate bars (`oracle-spec`, `builder-spec`, `builder-impl`, `architect-spec`, `architect-impl`); the block is required, each binding may be `null` = SDD default |

**Degeneration of `null` / missing keys** (this file guarantees only what is a valid *stored* shape; the traversal is the conductor's):

- **A spec/solution-producer role** that is `null` or absent → the conductor **loads the producer governance and authors inline** (in the main session); the recorded `produced-by.<role>` is `sdd:automaton`.
- **An impl-producer role** that is `null` or absent → the conductor **spawns a builder** that loads `impl-producer-governance`; the recorded `produced-by.impl-producer` is `sdd:automaton` (the SDD-default-chain marker).
- **A judge role** (`spec-judge`, `impl-judge`) that is `null` or absent → the conductor **spawns the SDD-default cold judge agent** (`sdd-spec-judge`, `sdd-implementer`).
  A judge default is never loaded inline — grader independence requires a cold context.

**Resolution** (owned by `../mission/`, shown here because the shape is its direct input): resolution is **per file** — each file's **artifact-type** (the squad key, **not** the folder name; resolved per `artifact-type.md`) is matched against each plugin's `squads[]`: the squad whose `artifact-types` contains it serves the file.
A project touching several types summons several squads at once, one per file.
For a given artifact-type: absent or unmatched across all plugins → SDD defaults.
One matching squad → resolve each role and governance key (name = use it; `null` = SDD default; missing role key = `<plugin>-<role>`).
Two or more plugins claim the type → **contested**: return `needs-input` for the producing path to ask; the choice is recorded (decisive on resume) — the contested-type disambiguation (`artifact-type.md`), distinct from `produced-by` (the after-the-fact record of who produced each artifact).

The **init-WRITE** of an entry (a plugin registering itself idempotently, version-reconciling, fail-closed on a corrupt registry) is a *behavior* and lives in `../plugin/`, not here — this file owns only the stored shape.
