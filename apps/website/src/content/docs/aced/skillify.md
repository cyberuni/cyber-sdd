---
title: skillify
description: Extract a repeatable workflow from the current session into a reusable SKILL.md.
---

Part of the [ACED plugin](/aced/overview/) — see that page for install instructions.

**Trigger:** "skillify this", "make this reusable", "turn what we just did into a skill"

Analyzes what actually happened in the session and generalizes it into a `SKILL.md`. Different from [`define-skill`](/aced/define-skill/), which scaffolds from a blank template.

## When to use

- A multi-step workflow was completed manually and is worth encoding for future use
- You want to capture session decisions so an agent can repeat them without re-deriving

## Steps

1. **Identify the workflow** — extract the trigger, the decisions made and why, the ordered steps, the inputs it needed upfront, and the outputs it produced. Decisions are the core of the skill; documentation the model already knows is not.
2. **Determine placement and pattern** — personal/not codebase-specific → user; contributor-only → project private; installable by package users → project public. Pattern is one of Process, Tool-based, or Standard (see [Skills Overview](/skills/overview/)).
3. **Draft name and description** — a verb-noun name; a ≤120-character description containing "Use this skill when", specific enough to discriminate from sibling skills.
4. **Write the `SKILL.md`** — encode the *why* behind each step, not just the *what*; flag deterministic steps as script-extraction candidates.
5. **Validate** — run `audit-skill` on the draft and fix any CRITICAL finding before continuing.
6. **Place and link** — `npx skills add <path-to-skill>`, or symlink manually into the target runtime.

## Install

```bash
npx skills add cyberuni/cyberplace --skill skillify -g
```

## Related

- [audit-skill](/skills/audit-skill/) — validates the drafted skill
- [Skill Design governance](/governances/skill-design/) — the authoring rules this skill applies
