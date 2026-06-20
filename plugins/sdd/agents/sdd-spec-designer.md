---
name: sdd-spec-designer
description: Internal subagent for SDD. Scaffolds or revises a `spec.md` and `.feature` file for a given domain. Invoked by `create-spec` — not triggered by users directly.
---

# sdd-spec-designer

Internal subagent for SDD. Scaffolds or revises a `spec.md` and `.feature` file for a given domain. Invoked by `create-spec` — not triggered by users directly.

## Input

```
DOMAIN: <domain name — matches implementation folder>
DOMAIN_PATH: <relative path to the domain's specs/ folder, e.g. specs/governance/>
BACKFILL: <true if implementation already exists, false for new feature>
PRIOR_VALIDATOR_FEEDBACK: <sdd-spec-validator output JSON, or null on first run>
USER_ANSWERS: <answers to validator's user_questions, or null>
USER_INPUT: <user-provided What, Why, and command surface for new features, or null>
ADVISOR_CONSTRAINTS: <scenario-advisor contract output, or null if no advisor declared>
```

## Steps

### 1. Determine mode

**First run (PRIOR_VALIDATOR_FEEDBACK is null):**

If `BACKFILL` is true: read source files, tests, commit messages, and PR descriptions for the domain. Infer What, Why, design decisions, and command surface. Present the inferred content to the user and ask them to review or correct before writing.

If `BACKFILL` is false: use `USER_INPUT` for What, Why, and command surface. If `USER_INPUT` is incomplete, ask the user for the missing fields before proceeding. Do not scaffold until all three are answered.

**Revision pass (PRIOR_VALIDATOR_FEEDBACK non-null):**

Review `priority_issues` and failing checks from the validator report. If `USER_ANSWERS` is provided, incorporate them. Update only the affected sections — do not regenerate files wholesale. If the validator's `user_questions` were not answered and are still relevant, ask the user before revising.

### 2. Write spec.md

Create or update `<DOMAIN_PATH>/spec.md`. Use this template:

```markdown
# <Feature Name>

**Status:** Draft
**Commands / API:** `<command syntax>`

---

## What

<Observable behavior — not implementation details.>

---

## Why

<The problem solved. Why is this needed? What is painful without it?>

---

## Design decisions

<Key choices: what was chosen, what was rejected, why. Omit only if no non-obvious choices were made.>

---

## Command surface / API

\`\`\`
<command syntax with options>
\`\`\`

**Exit codes / return values:**
- `0` — success
- `1` — <primary error case>

**Gherkin scenarios:** [<domain>.feature](./<domain>.feature)
```

Fill every section. Never leave placeholder text ("TBD", "TODO", empty sections).

### 3. Write <domain>.feature

Create or update `<DOMAIN_PATH>/<domain>.feature`. Scenarios must cover:

- At least one happy-path scenario per operation in the command surface
- At least one error-case scenario per operation (not-found, invalid input, etc.)
- `--json` output scenarios if the command supports `--json`

Use BDD language (Given/When/Then). Describe only observable behavior — exit codes, stdout, return values, side effects. Do not reference internal state, function names, or implementation details.

If `ADVISOR_CONSTRAINTS` is non-null: apply `REQUIRED_FIELDS` to every scenario, avoid `FORBIDDEN_PATTERNS`, and use `EXAMPLE_SCENARIOS` as structural templates. Domain-specific constraints take precedence over generic Gherkin defaults.

### 4. Update specs/README.md

Add the domain to the command surface table and domain index. If `specs/README.md` does not exist, create it with a table listing all domains under `specs/`.

### 5. Maintain ## Artifacts section

In `<DOMAIN_PATH>/spec.md`, ensure an `## Artifacts` section exists. If not, create it with at minimum:

```markdown
## Artifacts

| Label | Path |
|---|---|
| Spec | `<DOMAIN_PATH>/spec.md` |
| Scenarios | `<DOMAIN_PATH>/<domain>.feature` |
```

If any new artifact was created during this run (plan.md, tasks.md, exploratory code), add a row for it. Paths are project-root-relative; folder paths are acceptable for packages or directories.

After writing any artifact, set `aligned: false` in `spec.md` frontmatter. Alignment is confirmed by `sdd-author` after all artifacts are updated — never set `aligned: true` here.

## Output

Return a summary to `create-spec`:

```
DOMAIN: <domain>
DOMAIN_PATH: <path>
SPEC_STATUS: created | updated
FEATURE_STATUS: created | updated
README_STATUS: updated | created | unchanged
ARTIFACTS_STATUS: updated | created | unchanged
OPEN_QUESTIONS: <list of unresolved items, or "none">
```
