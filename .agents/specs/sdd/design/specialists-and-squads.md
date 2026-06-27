# Specialists & squads

The selection model behind production: the **squad**, the five delegate roles,
which governances each loads, and the **registry SHAPE** that stores it. This file owns the
squad model and the `.agents/universal-plugin.json` role-map shape. The init-WRITE of an
entry lives in `../plugin/`; READ/resolution from the registry lives in `../mission/`.

## The squad

The producer/judge selection unit is the **squad**, keyed by **artifact-type**:

```
artifact-type → { producer, judge, governances (actor + discipline), model, effort }
```

- **One squad per artifact-type; one producer per file.** No domain arrays, no producer
  composition, no "best match" producer race. The exclusion is **per file**, not per spec: a
  project-spec CR touches many artifact-types and so summons **multiple** specialists at
  once, but **no two producers ever act on the same file**. Each file has exactly one
  artifact-type → exactly one squad → exactly one producer; the operator orchestrates the
  set and merges their outputs.
- **artifact-type** = the squad key. It names the artifact / squad
  (`npm-package`, `agent-plugin`, `agent-skill`, `agent-definition`, `react-component`,
  `docs`, …). Each **file** has exactly one artifact-type; the spec's `artifact-types`
  frontmatter (plural) lists the **set** the project spans. There is no structural
  `project | feature` axis — one project is one spec, and folders are views, not lifecycle
  units (see `unit-and-organization.md`).
- **Disciplines (process/workflow) fold into governances.** "Basic knowledge" (React, TS,
  logic) is never *loaded* — it is just picking the right **model + effort**.
- **Language ≠ squad.** "TS script for a skill" lives inside the *skill* squad
  (skill-script rules: no deps unless packaged), NOT a generic `code` squad. The
  artifact-in-context determines the knowledge, not the file extension.

A **squad** = the producer + judge **specialists** (with their gear — governances, model,
and effort) for one artifact-type. A CR summons the squads for the artifact-types it touches;
the **operator** orchestrates them and delivers.

**`domain-plugin` stays distinct from `produced-by`.** `domain-plugin` = the chosen plugin
for an ambiguous artifact-type (forward input to resolution); `produced-by` = who actually
produced each artifact (after-the-fact record, see `provenance-model.md`). The produced-by
cutover wrongly conflated them — this was the original `sdd-plugin` impl-gate blocker.

## The five delegate roles (closed set)

A plugin covers a set of artifact-types by providing agents for these role keys. Any role
may be `null` (degenerates to the SDD default) or omitted (falls back to the convention
name `<plugin>-<role>`). A **producer** role may also name a model-tuned agent to run at
its own model/effort — the model-tuning escape valve; naming any agent (plugin delegate or
model-tuned) means the operator **spawns** it.

| Role key | Acts | SDD default |
|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | Operator loads `spec-producer-governance`, authors inline (`sdd:sdd-operator`) |
| `plan-producer` | writes `plan.md` + `tasks.md` | Operator loads `plan-producer-governance`, authors inline (`sdd:sdd-operator`) |
| `spec-judge` | judges the `.feature` at the spec gate | `sdd-spec-judge` — spawned cold agent |
| `impl-producer` | builds the artifact **and** its verification | Operator loads `impl-producer-governance`, builds inline (`sdd:sdd-operator`) |
| `impl-judge` | runs the verification against the frozen `.feature` | `sdd-implementer` — spawned cold agent |

**Producers run inline, judges spawn cold** ("conductor writes, cold judges grade"): an
SDD-default producer is a governance the operator loads and runs in its own warm context
(recorded `produced-by.<role>: sdd:sdd-operator`); an SDD-default judge is a cold agent the
operator spawns, because a grader must not share the author's context. A plugin delegate —
or a model-tuned producer agent named for the slot — is always spawned, producer or judge
alike. The judge stays a **distinct actor** (producer/judge separation), the surviving
invariant of the gate fold.

There is **no "generic Builder" fallback**: an unfilled producer is the operator authoring
inline; an unfilled judge is the cold SDD-default agent. The `<plugin>-<role>` naming
convention applies only when a role **key is omitted** and the plugin ships an agent at
that conventional name.

## Which governances each role loads

Every role loads the universal authoring/lifecycle governances below in addition to its
own domain criteria:

| Role | Loads |
|---|---|
| spec-producer | `spec-governance` (format bar), `ownership-governance`, the resolved `director` governance |
| plan-producer | `ownership-governance`, the resolved `architect` governance |
| spec-judge | `spec-governance`, `lifecycle-governance`, `gate-validation-governance` |
| impl-producer | `ownership-governance`, the resolved `builder` + `architect` governances |
| impl-judge | `ownership-governance` |

For an **SDD-default producer** role, the operator additionally loads the matching
`spec-producer-governance` / `plan-producer-governance` / `impl-producer-governance` — the
procedure it runs inline. A plugin delegate carries its own procedure and loads these bars
directly. The `sdd` gateway loads `lifecycle-governance`; the gate skill `validate-spec`
loads `lifecycle-`, `ownership-`, and `gate-validation-governance`; `sdd-operator` loads
all three.

## Registry SHAPE

The registry lives in `.agents/universal-plugin.json` as a top-level `sdd-plugins[]`
array — a project-level map from each installed domain plugin to the SDD production-chain
roles it fills. It is the **single resolution source** the operator reads; there is no
`plan.md` assignment fallback. The operator reads **only** this file — it does not scan
plugin directories. Each entry:

```json
{
  "name": "<plugin>",
  "version": "<semver>",
  "domains": ["<artifact-type>", "..."],
  "roles": {
    "spec-producer": "<agent | null>",
    "plan-producer": "<agent | null>",
    "spec-judge":    "<agent | null>",
    "impl-producer": "<agent | null>",
    "impl-judge":    "<agent | null>"
  },
  "governances": { "director": "<name | null>", "builder": "<name | null>", "architect": "<name | null>" }
}
```

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Plugin name; matches the plugin's `.plugin/plugin.json` `name` |
| `version` | Yes | Installed plugin version |
| `domains` | Yes | Open-string **artifact-type**s this plugin covers (e.g. `skill`, `subagent`, `command`, `agents-section`) — never folder names; new types need no schema bump |
| `roles` | Yes | Map of the five production-chain roles to spawned agents; `null` or omitted = SDD default (a producer role → operator authors inline as `sdd:sdd-operator`; a judge role → operator spawns the cold SDD-default judge agent) |
| `governances` | Yes | Actor-governance bindings (`director`, `builder`, `architect`); the block is required, each binding may be `null` = SDD default |

**Degeneration of `null` / missing keys** (this file guarantees only what is a valid
*stored* shape; the traversal is the operator's):

- **A producer role** (`spec-producer`, `plan-producer`, `impl-producer`) that is `null`
  or absent → the operator **loads the producer governance and authors inline**; the
  recorded `produced-by.<role>` is `sdd:sdd-operator`.
- **A judge role** (`spec-judge`, `impl-judge`) that is `null` or absent → the operator
  **spawns the SDD-default cold judge agent** (`sdd-spec-judge`, `sdd-implementer`). A
  judge default is never loaded inline — grader independence requires a cold context.

**Resolution** (owned by `../mission/`, shown here because the shape is its direct input):
resolution is **per file** — each file's **artifact-type** (the squad key, **not** the
folder name) is matched against each entry's `domains[]`. The spec's `artifact-types`
frontmatter lists the set the project spans; a project touching several types summons
several squads at once, one per file — never one spec-`type` matched against `domains[]`.
For a given artifact-type: absent or unmatched → zero matches → all roles degenerate to
SDD defaults. One match → resolve each role and governance key (name = use it; `null` =
SDD default; missing role key = `<plugin>-<role>`). Two or more matches → read the
**`domain-plugin`** map; if it names the chosen plugin for this artifact-type, use it, else
return `needs-input` for the producing path to ask (the answer is written to
`domain-plugin`, decisive on resume). `domain-plugin` (the chosen plugin for a contested
artifact-type) stays **distinct** from `produced-by` (the after-the-fact record of who
produced each artifact).

The **init-WRITE** of an entry (a plugin registering itself idempotently, version-reconciling,
fail-closed on a corrupt registry) is a *behavior* and lives in `../plugin/`, not here — this
file owns only the stored shape.
