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

## Production-chain roles

Quill fills these `sdd-operator` production-chain roles for its domain types:

| Role | Agent |
|---|---|
| spec-producer | `quill-spec-writer` |
| impl-producer | `quill-doc-writer` |
| impl-judge | `quill-judge` |
| spec-judge | SDD default `sdd-spec-judge` (spawned cold) |
| plan-producer | SDD default (`plan-producer-governance`, run inline) |

Register by running `init-quill` in a project that uses `sdd-operator`.

## Skills

| Skill | When to use |
|---|---|
| `init-quill` | Register quill as the SDD plugin for documentation domain types in this project |

## Agents

| Agent | Role |
|---|---|
| `quill-spec-writer` | spec-producer — writes the spec.md body and the boolean `.feature` for doc domains |
| `quill-doc-writer` | impl-producer — writes the documentation **and its per-scenario acceptance checks** against the frozen `.feature` |
| `quill-judge` | impl-judge — **runs** the producer's acceptance checks (static inspection) per frozen scenario |

## Installation

```bash
npx skills add cyberuni/cyber-skills --plugin quill
```

Then run `init-quill` to register quill in `.agents/universal-plugin.json`.
