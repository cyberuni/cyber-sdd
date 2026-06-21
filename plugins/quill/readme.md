# Quill — Documentation SDD Plugin

Quill is an SDD plugin specialized in **documentation** — guides, tutorials, articles, reference pages, and READMEs. It applies spec-driven development to documentation work: define observable behavior in Gherkin, verify documentation exists and meets structural requirements, catch regressions before they ship.

## What it does

Documentation has the same failure modes as code: missing content, structural drift, reader-path gaps. Unlike code, there is no compiler or test runner for it. Quill fills that gap by treating documentation as an implementation artifact with verifiable structure.

Verification checks:

| Check | What it verifies |
|---|---|
| **Existence** | Target file or directory exists at the declared path |
| **Structure** | Required headings and sections are present |
| **Completeness** | No placeholder text (TBD, TODO, empty sections) |
| **Reader path** | Step-by-step flows reach a stated outcome without gaps |

## Domain types

Quill handles: `documentation`, `guide`, `tutorial`, `article`, `reference`

## SDD contracts

Quill implements both SDD contracts for its domain types:

| Contract | Agent |
|---|---|
| Scenario advisor | `quill-scenario-advisor` |
| Implementer | `quill-implementer` |

Register by running `init-quill` in a project that uses `sdd-orchestrator`.

## Skills

| Skill | When to use |
|---|---|
| `init-quill` | Register quill as the SDD plugin for documentation domain types in this project |

## Agents

| Agent | Role |
|---|---|
| `quill-scenario-advisor` | Provides documentation-specific Gherkin constraints to `sdd-spec-designer` |
| `quill-implementer` | Verifies documentation exists and meets structural requirements per `.feature` scenarios |

## Installation

```bash
npx skills add cyberuni/cyber-skills --plugin quill
```

Then run `init-quill` to register quill in `.agents/universal-plugin.json`.
