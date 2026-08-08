---
name: skillify
description: 'Use this skill when generalizing what the current session actually did into a reusable SKILL.md — "skillify this", "turn what we just did into a skill", "make this reusable". Not for scaffolding a skill from scratch (define-skill), extracting the session into an agent or persona (define-agent), a reference-only rule set (define-governance), or diagnosing failing evals (improve).'
---

# Skillify

Extracts a repeatable workflow from what was done in the current session and creates a reusable agent skill from it. Different from `aced:define-skill`, which scaffolds from a blank template — this skill analyzes what actually happened and generalizes it.

## When to use

- The user says "skillify this", "make this reusable", "turn what we just did into a skill", or similar
- A multi-step workflow was completed manually and is worth encoding for future use
- You want to capture decisions made in a session so an agent can repeat them without re-deriving

## Defer when…

`skillify` owns generalizing **the current session's** work. Defer when the intent belongs to a sibling that shares the same "skill" / "reusable" vocabulary:

| Intent | Sibling |
|---|---|
| scaffolding a skill **from scratch** — not from this session's work | `define-skill` |
| extracting the session into a named reusable **agent** / delegated worker / an in-context **persona** | `define-agent` |
| capturing the session as a **reference-only rule set** other skills load but never execute as steps | `define-governance` |
| **diagnosing** why an existing skill's golden-set evals fail | `improve` |

The tell is the *target artifact*, not the "reuse this" framing: an agent/persona, a reference rule set, or an eval diagnosis is a sibling's job even when the request points at what the session just did.

## Steps

Load the **skill-design** governance before drafting:

```bash
npx cyberplace@0.2.0 governance show skill-design
```

Read stdout as the authoritative rules for principles, progressive disclosure, and description structure.

### 1. Identify the workflow to generalize

From the session history, extract:
- **Trigger:** What situation prompted this work? What would cause someone to want to do this again?
- **Decisions:** What choices were made and why? (These are the core of the skill)
- **Steps:** What was done, in what order?
- **Inputs:** What did the workflow need to know upfront?
- **Outputs:** What did it produce or change?

Separate decisions from documentation. The skill should encode what to decide and how — not reference material the model already knows.

### 2. Determine skill placement and pattern

Placement:

| Signal | Placement |
|---|---|
| Workflow is personal, not tied to a specific codebase | User (`~/.agents/skills/<name>/`) |
| Workflow only makes sense for contributors to this repo | Project private (`.agents/skills/<name>/`) |
| Workflow is meant to be installed by users of this package | Project public (`skills/<name>/`) |

Pattern:

| Signal | Pattern |
|---|---|
| Ordered workflow with multiple decisions or phases | Process |
| Workflow centered on calling tools or external systems | Tool-based |
| Workflow mainly enforcing tone, structure, or quality | Standard |

Ask the user if the context is ambiguous.

### 3. Draft the skill name and description

- **Name:** A short verb-noun or noun phrase that identifies the workflow (e.g., `patch-skill`, `deploy-preview`, `sync-tokens`)
- **Description:** ≤120 characters; must contain "Use this skill when"; specific enough to discriminate from other skills

Test the description: would an agent activate this skill in the right situation and NOT activate it otherwise?

### 4. Write SKILL.md

Use this structure:

```markdown
---
name: <name>
description: Use this skill when <trigger>. <One-line summary.>
---

# <Title>

## When to use

<Precise trigger conditions>

## Steps

### 1. <Step title>
<Decision logic, not documentation>

### 2. <Step title>
...

## What NOT to do

- <Common mistake or anti-pattern>
```

Rules:
- Encode the WHY behind each step (the constraint or decision), not just the WHAT
- Flag deterministic steps as candidates for script extraction (see **skill-design** § Extract deterministic logic)
- Keep each step focused on one decision or action

### 5. Flag script-extraction candidates

Per **skill-design** § Extract deterministic logic, mark any step that:
- Produces the same output given the same input (no judgment needed)
- Involves text manipulation, file I/O, or structured data processing

Add a TODO comment in the skill body:
```
<!-- TODO: extract to src/<domain>/... -->
```

### 6. Validate

Invoke `improve-skill` on the draft. Fix any CRITICAL findings before continuing.

Key checks to watch for:
- **Q1:** Does the description contain "Use this skill when"?
- **Q5:** Is the description ≤1024 characters?
- **Q6:** Are there baked-in stack assumptions that should be detected at runtime?

### 7. Place and link

Use `aced:define-skill` conventions:

```bash
# If npx skills is available:
npx skills add <path-to-skill>

# Manual fallback:
ln -sf <path-to-skill> ~/.claude/skills/<name>
```
