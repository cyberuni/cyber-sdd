# AGENTS.md

- **scripts:** repository scripts are in `package.json` such as `test` and `verify`

## Commit Discipline

- **Unit of work:** one complete, reviewed, coherent, independently revertable change
- **Auto-commit rule:** commit a unit of work automatically

## Architecture

This repo holds the SDD process plugin and the two domain plugins that implement its
production-chain roles.

**Key directories:**

- `plugins/sdd/` — the SDD process: project specs, change requests, the mission loop, both gates. Published as `cyber-sdd`
- `plugins/aced/` — ACED, the agent-configuration domain plugin. Published as `cyber-aced`
- `plugins/quill/` — Quill, the documentation domain plugin. Published as `cyber-quill`
- `.agents/specs/{sdd,aced,quill}/` — each plugin's own project spec, `.feature` suites, and durable ledger
- `docs/adr/` — architecture decision records
- `.research/<topic>/` — background research dossiers (`topic` / `evidence` / `conclusion` / `changes`) linked from ADRs and governances; `conclusion.md` is the file other documents cite
- `apps/web/` — the Astro docs site published to GitHub Pages

**How the three relate:** SDD defines the loop and the gates. ACED and Quill each register
a role-map entry so the conductor resolves their domain's spec-producer, spec-judge,
impl-producer, and impl-judge. A plugin never re-implements the loop.

## Validation After Changes

**Always run before committing or pushing:**

```bash
pnpm verify
```

CI runs `pnpm verify` on every PR.

## Adding a New Skill

Separate the two axes:

- **Placement** — which plugin the skill belongs to, decided by domain
- **Pattern** — process, tool-based, or standard

Create `plugins/<plugin>/skills/<skill-name>/SKILL.md`:

```markdown
---
name: skill-name
description: "One sentence trigger description — WHAT it does, WHEN to invoke it, key situations it handles."
---

# Skill Title

...content...
```

For **name-only skills** (loaded **by name** by another skill, never matched to a user
situation), set the description to exactly `"By name only"` and nothing else. The minimal
description is the mechanism, not a label: the description is the only surface the model
matches against, so anything added to it is another handle for a spurious match. Identity —
what the skill is, who calls it, what it returns — goes in the body and README.

`user-invocable` is a **visibility** flag only: it controls whether a skill appears in the
user's command list and never determines how a skill is selected. A skill may legitimately
be `user-invocable: false` and still situationally triggered. See
[ADR-0031](docs/adr/0031-selection-is-not-visibility.md).

## Language

Write all content in en-US (American English spelling: "color", "organize", "behavior", etc.).
