# SDD Scenario Advisor Contract

Contract for domain plugins that provide `.feature`-writing constraints to `sdd-spec-designer`. Invoked by `sdd-author` before the `.feature` file is written or revised.

## Who implements this contract

A domain plugin implements this contract by providing an agent (e.g., `aces-scenario-advisor`) named in the `## Plugin assignments` table of a spec's `plan.md` under the **Scenario advisor** column, or registered in `.agents/universal-plugin.json` `sdd-plugins[*].scenario-advisor`.

## Input

```
DOMAIN            — domain name (matches the sub-domain row in Plugin assignments)
COMMAND_SURFACE   — text of the "Command surface / API" section from spec.md
DESIGN_DECISIONS  — text of the "Design decisions" section from spec.md (or null if absent)
```

## Output

```
REQUIRED_FIELDS      — context fields every scenario must carry (e.g., "Given the agent has a name field")
FORBIDDEN_PATTERNS   — Gherkin patterns that cannot be scored or evaluated by this domain's implementer
EXAMPLE_SCENARIOS    — 1–3 well-formed Gherkin scenarios the designer should treat as structural templates
NOTES                — additional domain constraints not captured by the fields above (or null)
```

## How sdd-author uses the output

`sdd-author` passes the advisor output to `sdd-spec-designer` verbatim as `ADVISOR_CONSTRAINTS`. `sdd-spec-designer` applies `REQUIRED_FIELDS` to every scenario, avoids `FORBIDDEN_PATTERNS`, and uses `EXAMPLE_SCENARIOS` as structural templates. If no advisor is declared for a sub-domain, `ADVISOR_CONSTRAINTS` is `null` and `sdd-spec-designer` proceeds without constraints.

## Constraints

- The advisor must not write or modify any file — output only.
- The advisor must not reference internal implementation details of the domain plugin; constraints must be expressed in observable Gherkin terms.
- `EXAMPLE_SCENARIOS` must be valid Gherkin (Given/When/Then), not pseudocode.
