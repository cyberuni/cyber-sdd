---
title: define-governance
description: Create or improve a governance file — a reference-only rule set other skills or agents load on demand.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "create a governance", "write governance rules", "define standards", "add criteria for", "make a reference skill", "create a rule set for agents to follow"

Creates or improves a governance file — a reference-only skill that encodes criteria, standards, or workflow rules other skills or agents load on demand. Governance files never auto-trigger from user input.

## Governance vs. workflow skill

| | Governance | Workflow skill |
|---|---|---|
| Purpose | Criteria, standards, rules the agent enforces | Steps the agent executes |
| Triggered by | Explicit load | User situation matching `description:` |
| Body style | Normative rules, checklists, rubrics | Numbered steps, decision logic |

If the content is *what to enforce*, it's a governance file; if it's *how to do something*, route to [`define-skill`](/aced/define-skill/) instead.

## What it does

1. Determines placement (user-global, project, or inside a plugin).
2. Gathers name, topic, consumers, and content type (rubric, constraint set, checklist, decision table, or mixed).
3. Drafts the file with `description: "Partial Skill: invoke by name only — …"`, `user-invocable: false`, and `metadata: type: governance` — no `## Why`/`## Rationale` section, atomic and independently falsifiable rules.
4. Creates symlinks per targeted runtime.
5. Runs quality checks (description prefix, `user-invocable` flag, no rationale prose, `Apply when:` scope line) and fixes CRITICAL/HIGH failures before presenting the file.

## Next step

Run [`sdd:start-mission`](/sdd/overview/) to spec and eval the governance file; the conductor resolves the ACED roles automatically.
