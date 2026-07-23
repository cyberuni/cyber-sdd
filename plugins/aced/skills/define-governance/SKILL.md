---
name: define-governance
description: 'Create or revise a governance file — reference-only criteria or rules that other skills and agents load on demand. Use when the target is the criteria file itself, even if the user just says "write standards for" or "improve this governance".'
---

# Define Governance

Create or improve a governance file — a reference-only skill that encodes criteria,
standards, or workflow rules. Governance files are loaded on demand by other skills
or agents; they never auto-trigger from user input.

## Governance vs. skill

| | Governance | Workflow skill |
|---|---|---|
| **Purpose** | Criteria, standards, rules the agent enforces | Steps the agent executes |
| **Triggered by** | Explicit load (`/<name>` or `## References`) | User situation matching `description:` |
| **Auto-trigger** | Never | Yes, when description matches |
| **Body style** | Normative rules, checklists, rubrics | Numbered steps, decision logic |

If the content describes *what to enforce* (a rubric, a quality bar, a constraint set),
it is a governance file. If it describes *how to do something* (a workflow), it is a
workflow skill.

## Determine placement

If the target scope is not clear from context, ask:

> Where should this governance file live?
> 1. **User-global** (`~/.agents/skills/<name>/SKILL.md`) — available across all projects
> 2. **Project** (`.agents/skills/<name>/SKILL.md`) — scoped to this repo
> 3. **Inside a plugin** (`plugins/<plugin-name>/skills/<name>/SKILL.md`) — distributed with the plugin

After the user selects, derive the canonical path.

## Gather requirements

Ask the user:

1. **Name** — kebab-case slug (e.g. `commit-discipline`, `skill-design`, `review-rubric`)
2. **Topic** — one sentence: what domain does this governance cover?
3. **Consumers** — which skills or agents will load this? (informs the structure and depth)
4. **Content type** — select the primary content shape:
   - **Rubric** — scored criteria for evaluation: named dimensions, each with its own `max`, plus one `threshold`
   - **Constraint set** — rules that must not be violated
   - **Checklist** — ordered or unordered items to verify
   - **Decision table** — conditions → outcomes
   - **Mixed** — more than one of the above
5. **Rules or criteria** — the actual content; collect from the user or from an existing document

Draft no file until the name, the content type, and the rules are gathered.

If improving an existing file, read it first. Ask only about gaps or issues found.

## Draft the governance file

Write the file at the canonical path using this structure:

```markdown
---
name: <name>
description: "Partial Skill: invoke by name only — <one sentence: what domain this governs and who loads it>"
user-invocable: false
metadata:
  type: governance
---

# <Title>

Apply when: <one-line scope — the situation or artifact type this governs>

## <Section per content type>

<Normative rules, rubric rows, checklist items, or decision rows>

## References

<on-demand standards, sibling files, external HTTPS URLs — no repo file paths>
```

Rules for the body:
- Set `user-invocable: false` — the classifier for a partial skill (a governance is loaded by name, never user-triggered)
- Lead `description` with the `"Partial Skill:"` prefix (recommended form `"Partial Skill: invoke by name only — …"`) — a self-declaration for the reader; keep it minimal and non-trigger-shaped so the harness (which still sees the description) does not auto-match it
- Do not include `## Why`, `## Rationale`, or causal prose — put that in ADRs
- Encode decisions and criteria, not facts the model already knows
- Keep each rule atomic and independently falsifiable. To decide whether a multi-clause rule splits,
  ask what each clause has left to check when the other clause is false:
  - **Split it** when each clause states its own demand — something still checkable when the other
    clause fails. *"Every skill has a README and its description names a trigger"* splits: a skill can
    have a README whose description names no trigger, and a trigger-naming description with no README.
  - **Keep it as one rule** when a clause *qualifies* another — it constrains how the other clause is
    satisfied rather than adding a demand of its own, so it has nothing left to check once that clause
    fails. *"the description names when to trigger, and does so in the user's own phrasing"* stays one
    rule: if the description names no trigger, there is no naming whose phrasing could be wrong.
  The joining word does not decide this — `and` appears in both examples. Test the clause, not the seam.

## Create symlinks

Governance files follow the same symlink convention as skills. After writing the canonical
file, create symlinks for each runtime the user targets:

| Runtime | Symlink target |
|---------|---------------|
| Claude Code | `.claude/skills/<name>/SKILL.md` → canonical path |
| Cursor | `.cursor/rules/<name>.mdc` → canonical path |

Use relative paths from the symlink location.

## Run quality checks

After writing, evaluate the governance file against these checks:

| # | Check | Severity |
|---|-------|----------|
| G1 | `description` starts with `"Partial Skill:"` | CRITICAL |
| G2 | `user-invocable: false` present | HIGH |
| G3 | `metadata.type: governance` present | HIGH |
| G4 | No `## Why` or `## Rationale` section | HIGH |
| G5 | Body opens with `Apply when:` scope line | MEDIUM |
| G6 | All rules are atomic and independently falsifiable | MEDIUM |
| G7 | No workflow steps (numbered action sequences) | MEDIUM |
| G8 | `name` is kebab-case and matches file stem | HIGH |

Report results. Fix any CRITICAL or HIGH failures before presenting the final file.

## Report

Summarize:

- Canonical file path
- Runtime symlinks created
- Content type(s) encoded
- Quality check outcome — name every check that failed, including failures below the fix bar left unfixed
- Suggested next step: run `sdd:start-mission` (the conductor resolves the ACED roles) to spec and eval for this governance file
