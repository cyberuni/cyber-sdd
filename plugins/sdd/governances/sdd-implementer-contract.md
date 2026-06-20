# SDD Implementer Contract

Contract for domain plugins that own implementation verification for a given domain type. Invoked by `sdd-author` (via `sdd-implementer` dispatcher) during the implementation phase.

## Who implements this contract

A domain plugin implements this contract by providing an agent (e.g., `aces-implementer`) named in the `## Plugin assignments` table of a spec's `plan.md` under the **Implementer** column, or registered in `.agents/universal-plugin.json` `sdd-plugins[*].implementer`.

## Input

```
DOMAIN                — domain name (matches the sub-domain row in Plugin assignments)
DOMAIN_PATH           — project-root-relative path to the spec folder (e.g., artifacts/specs/banner/)
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
PLAN_PATH             — project-root-relative path to plan.md (or null if absent)
TASKS_PATH            — project-root-relative path to tasks.md (or null if absent)
IMPLEMENTATION_PATHS  — list of project-root-relative paths from ## Artifacts table rows where layer=impl
```

## Output

```
IMPLEMENTATION_PASS   — true | false
SCENARIOS_PASSING     — list of scenario titles that pass
SCENARIOS_FAILING     — list of scenario titles that fail or are not yet covered
CHANGES_MADE          — summary of implementation changes made during this run (or "none")
BLOCKER               — human-readable reason why PASS is false (or null when PASS is true)
```

## How sdd-author uses the output

`sdd-author` sets `aligned: true` in `spec.md` frontmatter only when every declared implementer returns `IMPLEMENTATION_PASS: true`. If any implementer returns `false`, `aligned` stays `false` and `sdd-author` surfaces `BLOCKER` to the user.

## Fallback behavior (no implementer declared)

When `sdd-implementer` (the dispatcher) finds no implementer registered for a sub-domain, it falls back to checking that passing tests exist for every scenario in the `.feature` file. It reports `IMPLEMENTATION_PASS: true` only when all scenarios have passing test coverage.

## Constraints

- The implementer owns the mapping from `.feature` scenarios to its evaluation suite — SDD never dictates this mapping.
- The implementer must not modify `spec.md` or the `.feature` file.
- The implementer must report actual pass/fail per scenario — not an aggregate opinion.
