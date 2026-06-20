---
name: sdd-implementer
description: "Internal skill: SDD dispatcher. Routes the implementer contract invocation to the declared domain plugin for a given sub-domain. Invoked by sdd-author during the implementation phase — not triggered by users directly."
metadata:
  internal: true
---

# sdd-implementer

Dispatcher agent for the SDD implementer contract. Reads the Plugin assignments table, invokes the declared implementer for each sub-domain, and returns aggregated results to `sdd-author`. Keeps `sdd-author` unaware of routing logic.

## Input

```
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
DOMAIN_PATH           — project-root-relative path to the spec folder
PLAN_PATH             — project-root-relative path to plan.md (or null)
TASKS_PATH            — project-root-relative path to tasks.md (or null)
IMPLEMENTATION_PATHS  — list of project-root-relative paths from ## Artifacts table where layer=impl
PLUGIN_ASSIGNMENTS    — text of the ## Plugin assignments section from plan.md (or null)
REGISTRY_PATH         — project-root-relative path to .agents/universal-plugin.json (or null)
```

## Steps

### 1. Identify sub-domains and implementers

If `PLUGIN_ASSIGNMENTS` is non-null: parse the table. For each row, extract `Sub-domain` and `Implementer` columns. Use these as the authoritative assignments.

If `PLUGIN_ASSIGNMENTS` is null and `REGISTRY_PATH` is non-null: read `.agents/universal-plugin.json`. For each entry in `sdd-plugins`, collect the domain types listed under `implementer`. Map sub-domains from the spec to the first matching registry entry.

If neither source provides an implementer for a sub-domain: use fallback (step 3).

### 2. Invoke declared implementers

For each sub-domain with a declared implementer:

Invoke the named implementer agent with:

```
DOMAIN:               <sub-domain name>
DOMAIN_PATH:          <DOMAIN_PATH>
SPEC_PATH:            <SPEC_PATH>
FEATURE_PATH:         <FEATURE_PATH>
PLAN_PATH:            <PLAN_PATH>
TASKS_PATH:           <TASKS_PATH>
IMPLEMENTATION_PATHS: <IMPLEMENTATION_PATHS filtered to this sub-domain, or full list if undifferentiated>
```

Collect the implementer's output: `IMPLEMENTATION_PASS`, `SCENARIOS_PASSING`, `SCENARIOS_FAILING`, `CHANGES_MADE`, `BLOCKER`.

### 3. Fallback for undeclared sub-domains

For sub-domains with no declared implementer: check that every scenario title in the `.feature` file has at least one passing test (grep test file names and results). Report:

```
IMPLEMENTATION_PASS: true   — if all scenarios have passing test coverage
IMPLEMENTATION_PASS: false  — if any scenario has no test coverage or failing tests
```

### 4. Aggregate and return

Collect results from all sub-domains (declared + fallback).

Overall `ALL_PASS` is `true` only when every sub-domain returns `IMPLEMENTATION_PASS: true`.

## Output

```
ALL_PASS              — true | false (true only when all sub-domain implementers pass)
SUB_DOMAIN_RESULTS    — list of per-sub-domain objects:
  - sub_domain:         <name>
  - implementer:        <agent name or "fallback">
  - pass:               true | false
  - scenarios_passing:  [list]
  - scenarios_failing:  [list]
  - changes_made:       <summary or "none">
  - blocker:            <reason or null>
```
