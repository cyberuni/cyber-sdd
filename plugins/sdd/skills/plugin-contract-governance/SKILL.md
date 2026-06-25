---
name: plugin-contract-governance
description: "Internal skill: the SDD plugin contract — the five delegate roles a plugin implements, which governances each role loads, and the universal-plugin.json registry shape. Loaded by sdd-operator and by plugin authors building an SDD plugin — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Plugin Contract Governance

What an SDD plugin must implement and what each part loads. The operator resolves delegates against this contract; a plugin author builds to it. The universal-plugin format itself is `plugin-design` (`governance show universal-plugin`); this skill is the SDD-role layer on top.

## The five delegate roles (closed set)

A plugin covers a set of domains by providing agents for these role keys. Any role may be `null` (degenerates to the SDD default) or omitted (falls back to the convention name `<plugin>-<role>`). A **producer** role may also name a model-tuned agent to run at its own model/effort — the model-tuning escape valve; naming any agent (plugin delegate or model-tuned) means the Operator **spawns** it.

| Role key | Acts | SDD default |
|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | Operator loads `spec-producer-governance`, authors inline (`sdd:sdd-operator`) |
| `plan-producer` | writes `plan.md` + `tasks.md` | Operator loads `plan-producer-governance`, authors inline (`sdd:sdd-operator`) |
| `spec-judge` | judges the `.feature` at the spec gate | `sdd-spec-judge` — spawned cold agent |
| `impl-producer` | builds the artifact **and** its verification | Operator loads `impl-producer-governance`, builds inline (`sdd:sdd-operator`) |
| `impl-judge` | runs the verification against the frozen `.feature` | `sdd-implementer` — spawned cold agent |

**Producers run inline, judges spawn cold** ("conductor writes, cold judges grade"): an SDD-default producer is a governance the Operator loads and runs in its own warm context (recorded `produced-by.<role>: sdd:sdd-operator`); an SDD-default judge is a cold agent the Operator spawns, because a grader must not share the author's context. A plugin delegate — or a model-tuned producer agent named for the slot — is always spawned, producer or judge alike.

## Which governances each role loads

Every role loads the universal authoring/lifecycle governances below in addition to its own domain criteria:

| Role | Loads |
|---|---|
| spec-producer | `spec-governance` (format bar), `ownership-governance`, the resolved `director` governance |
| plan-producer | `ownership-governance`, the resolved `architect` governance |
| spec-judge | `spec-governance`, `lifecycle-governance`, `gate-validation-governance` |
| impl-producer | `ownership-governance`, the resolved `builder` + `architect` governances |
| impl-judge | `ownership-governance` |

For an **SDD-default producer** role, the Operator additionally loads the matching `spec-producer-governance` / `plan-producer-governance` / `impl-producer-governance` — the procedure it runs inline — which itself references the bars above; a plugin delegate carries its own procedure and loads these bars directly.

The `sdd` gateway loads `lifecycle-governance`; the gate skill `validate-spec` loads `lifecycle-`, `ownership-`, and `gate-validation-governance`; `sdd-operator` loads all three. A plugin's agents inherit these loads — e.g. `aces`/`quill` spec-producers load `sdd:spec-governance` + `sdd:ownership-governance`, and their judges load `sdd:gate-validation-governance`.

## Registry shape

The operator reads **only** `.agents/universal-plugin.json` (top-level `sdd-plugins[]`) — it does not scan plugin directories. Each entry:

```json
{
  "name": "<plugin>",
  "version": "<semver>",
  "domains": ["<domain-type>", "..."],
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

Resolution: match the spec's **`domain-type`** frontmatter field (the artifact-type axis, **not** the domain/folder name) against each entry's `domains[]`. `domains[]` enumerates artifact *types* a plugin covers (e.g. ACES covers `skill`, `subagent`, `command`, `agents-section`), never folder names. An absent or unmatched `domain-type` → zero matches → all roles degenerate to SDD defaults. One match → resolve each role and governance key (name = use it; `null` = SDD default; missing role key = `<plugin>-<role>`). Two or more matches → read the `produced-by` map in `spec.md` frontmatter (the resolution cache; the legacy `domain-plugin` map is retired); if it names the owner, use it, else return `STATUS: needs-input` for the skill to ask which plugin owns the domain (written to `produced-by`, decisive on resume).
