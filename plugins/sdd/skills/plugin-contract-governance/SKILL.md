---
name: plugin-contract-governance
description: "Internal skill: the SDD plugin contract — the five delegate roles a plugin implements, which governances each role loads, and the universal-plugin.json registry shape. Loaded by sdd-orchestrator and by plugin authors building an SDD plugin — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Plugin Contract Governance

What an SDD plugin must implement and what each part loads. The orchestrator resolves delegates against this contract; a plugin author builds to it. The universal-plugin format itself is `plugin-design` (`governance show universal-plugin`); this skill is the SDD-role layer on top.

## The five delegate roles (closed set)

A plugin covers a set of domains by providing agents for these role keys. Any role may be `null` (degenerates to the SDD default) or omitted (falls back to the convention name `<plugin>-<role>`).

| Role key | Acts | SDD default |
|---|---|---|
| `spec-producer` | writes the `spec.md` body + the `.feature` | `sdd-scenario-writer` |
| `plan-producer` | writes `plan.md` + `tasks.md` | `sdd-planner` |
| `spec-judge` | judges the `.feature` at the spec gate | the static format gate (`validate-spec`, no agent) |
| `impl-producer` | builds the artifact **and** its verification | the generic Builder (no agent) |
| `impl-judge` | runs the verification against the frozen `.feature` | `sdd-implementer` |

## Which governances each role loads

Every role loads the universal authoring/lifecycle governances below in addition to its own domain criteria:

| Role | Loads |
|---|---|
| spec-producer | `spec-governance` (format bar), `ownership-governance`, the resolved `framer` governance |
| plan-producer | `ownership-governance`, the resolved `architect` governance |
| spec-judge | `spec-governance`, `lifecycle-governance`, `gate-validation-governance` |
| impl-producer | `ownership-governance`, the resolved `builder` + `architect` governances |
| impl-judge | `ownership-governance` |

The `sdd` gateway loads `lifecycle-governance`; the gate skill `validate-spec` loads `lifecycle-`, `ownership-`, and `gate-validation-governance`; `sdd-orchestrator` loads all three. A plugin's agents inherit these loads — e.g. `aces`/`quill` spec-producers load `sdd:spec-governance` + `sdd:ownership-governance`, and their judges load `sdd:gate-validation-governance`.

## Registry shape

The orchestrator reads **only** `.agents/universal-plugin.json` (top-level `sdd-plugins[]`) — it does not scan plugin directories. Each entry:

```json
{
  "name": "<plugin>",
  "version": "<semver>",
  "domains": ["<domain>", "..."],
  "roles": {
    "spec-producer": "<agent | null>",
    "plan-producer": "<agent | null>",
    "spec-judge":    "<agent | null>",
    "impl-producer": "<agent | null>",
    "impl-judge":    "<agent | null>"
  },
  "governances": { "framer": "<name | null>", "builder": "<name | null>", "architect": "<name | null>" }
}
```

Resolution: match `DOMAIN` against each entry's `domains[]`. Zero matches → all roles degenerate to SDD defaults. One match → resolve each role and governance key (name = use it; `null` = SDD default; missing role key = `<plugin>-<role>`). Two or more matches → read the `domain-plugin` map in `spec.md` frontmatter; if it names the owner, use it, else return `STATUS: needs-input` for the skill to ask which plugin owns the domain (written to `domain-plugin`, decisive on resume).
