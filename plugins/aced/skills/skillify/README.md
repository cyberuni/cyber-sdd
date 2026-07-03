# skillify

Generalize a workflow from the current session into a reusable `SKILL.md`.

## When to use

Use this skill when a multi-step workflow was just completed and should be encoded for reuse.

Good triggers include:

- "Skillify this"
- "Make this reusable"
- "Turn what we just did into a skill"

Different from `aced:define-skill`, which scaffolds from a blank template — this skill analyzes what actually happened in the session.

## What it does

The skill extracts trigger, decisions, steps, inputs, and outputs from session history, then drafts a focused skill following skill-design governance. It validates with `audit validate` before linking or committing.

## Install

```bash
npx skills add cyberuni/cyberplace --skill skillify
```
