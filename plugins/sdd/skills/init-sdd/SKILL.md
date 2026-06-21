---
name: init-sdd
description: Use this skill when initializing Spec-Driven Development in a repo — inject SDD agent governance into AGENTS.md and register a SessionStart hook.
---

# Init SDD

Inject always-on SDD governance into the repo: an AGENTS.md section for every agent, plus a SessionStart hook on agents that support it.

This skill **requires** the cyber-skills CLI — see **Ensure cyber-skills CLI** below.

## Prerequisites

- `AGENTS.md` should exist (run the `init` skill first if missing).

## Ensure cyber-skills CLI

Before any subcommand:

1. Resolve exact semver: `npm view cyber-skills version` (never `@latest`, never a literal `<version>` placeholder).
2. Run `npx cyber-skills@<exact> <subcommand>`.

If step 2 fails (npx install prompt, `command not found`, or other non-zero exit), the `init` skill (a prerequisite) handles the install consent flow. Tell the user to run `init` first, then return here. Stop this skill until then.

## Workflow

### 1. Write AGENTS.md section

Write (or replace) an `## Spec-Driven Development` section in `AGENTS.md`. Idempotence rules:
- If the heading already exists: replace the body only, preserve surrounding sections.
- If not present: insert before `## Skill Augmentations` if that heading exists, otherwise append at end of file.

Section content to write:

```markdown
## Spec-Driven Development

**Spec owns behavior.** If the implementation disagrees with `spec.md`, the implementation is wrong — fix the implementation, not the spec. To change behavior, revert the spec to Draft and complete a new review cycle.

**`.feature` freeze.** Once `spec.md` reaches `Approved`, do not modify the `.feature` file. Adding or removing scenarios requires reverting the spec to `Draft` and completing a new review cycle. Run `validate-spec` when in doubt about spec status.

**Two modes, one gate.** Before `spec.md → Approved` (exploration mode): code, plan, tasks, and scenarios may all evolve freely. After Approved (implementation mode): `.feature` is frozen; all scenarios must pass before marking the spec `Implemented`.

**Artifact alignment.** Every spec has an `aligned` field in its frontmatter (`false` while any artifact is being updated; `true` only when all artifacts in `## Artifacts` reflect the same state). Never commit while `aligned: false`. `sdd-orchestrator` sets alignment — never set it manually.

**Open questions.** When a contributor's input is still missing, mark the gap:
`<!-- open: needs designer input on empty-state behavior -->`. Resolve all open
questions before advancing to Approved. Do not write TBD or leave sections empty.

**Author responsibility.** The spec author drives the spec forward — initiating
conversations, incorporating inputs, resolving contradictions. They are not
required to supply all answers alone.

### References

- **`validate-spec` skill** — check spec completeness and readiness for status transition
- **`create-spec` skill** — scaffold spec.md and .feature for a new or existing domain
- The universal `.feature` format bar and spec-authoring rules live in the harness-loaded `sdd:spec-governance` skill (loaded by the spec-producers), not here.
```

### 2. Register SessionStart hook

```bash
npx cyber-skills@<exact> hook register \
  --name sdd \
  --event SessionStart \
  --extract AGENTS.md \
  --heading "Spec-Driven Development"
```

If the user consented to npm install during the `init` skill (earlier in this session), edit the registered SessionStart command to use `npx --yes cyber-skills@<exact>` instead of `npx cyber-skills@<exact>` so the hook runs non-interactively.

Pass `--verbose` for a human-readable summary. Pass `--dry-run` to preview without writing.

> **Hook semver upgrade:** Re-running `hook register` replaces an existing hook when `--name` and flags match but the pinned version differs. Run this skill again after upgrading cyber-skills.

### 3. Report

Confirm:
- AGENTS.md section written (created or replaced)
- SessionStart hook registered

Next step: run `create-spec` to scaffold a spec for a domain.

## What gets applied

**AGENTS.md** (all agents): `## Spec-Driven Development` with the three core governance rules (spec-owns-behavior, `.feature` freeze, two-mode model) and `### References` pointing to `validate-spec`, `create-spec`, and the harness-loaded `sdd:spec-governance` skill. No `governance show` (NodeJS) call.

**Runtime hook** (Claude Code, Cursor, Codex): SessionStart injection of the Spec-Driven Development section so agents are reminded of the rules at the start of every session.

For agents without hook support, AGENTS.md alone applies the rules.

## Related skills

- **`init`** — create AGENTS.md and symlink CLAUDE.md
- **`create-spec`** — scaffold spec.md and .feature for a new or existing domain
- **`validate-spec`** — check spec completeness and readiness for status transition
