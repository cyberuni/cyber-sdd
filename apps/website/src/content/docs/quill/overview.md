---
title: Quill Overview
description: Documentation SDD plugin — spec-driven development applied to guides, tutorials, articles, reference pages, and READMEs.
---

**Quill** is [SDD](/sdd/overview/)'s documentation-domain plugin — the sibling of [ACES](/aces/overview/), which covers the agent-configuration domain. Where ACES applies spec-driven evaluation to skills, `AGENTS.md` sections, subagents, and commands, Quill applies it to guides, tutorials, articles, reference pages, and READMEs.

## The problem

Documentation has the same failure modes as code — missing content, structural drift, reader-path gaps — with none of the safety nets. There is no compiler or test runner for a doc. Quill fills that gap by treating a document as an implementation artifact with **verifiable structure**, checked by static inspection against a frozen `.feature`.

Verification checks:

| Check | What it verifies |
|---|---|
| **Existence** | The target file or directory exists at the declared path |
| **Structure** | Required headings and sections are present |
| **Completeness** | No placeholder text (`TBD`, `TODO`, `FIXME`, empty sections) |
| **Reader path** | Step-by-step flows reach their stated outcome without gaps |

## Domain types

Quill handles five documentation artifact-types: `documentation`, `guide`, `tutorial`, `article`, `reference`.

## Skills

| Skill | What it does |
|---|---|
| [`init-quill`](/quill/init-quill/) | Register Quill as the SDD documentation plugin for a project — writes a `quill` role-map entry to `.agents/universal-plugin.json` |

Quill's spec-producer, impl-producer, and impl-judge (`quill-spec-writer`, `quill-doc-writer`, `quill-judge`) are internal agents the SDD conductor spawns, not skills a user invokes directly.

## How Quill plugs into SDD's production chain

SDD resolves a fixed set of five delegate roles per artifact-type — `spec-producer`, `solution-producer`, `spec-judge`, `impl-producer`, `impl-judge` — from `.agents/universal-plugin.json`. Quill's registry entry declares one squad covering all five documentation artifact-types:

| Role | Quill's binding | Notes |
|---|---|---|
| `spec-producer` | `quill-spec-writer` | Writes the `spec.md` body and a boolean `.feature` of doc scenarios — required path, audience, and observable reader outcome per scenario. |
| `solution-producer` | `null` | Degenerates to the SDD default. |
| `spec-judge` | `null` | Degenerates to static doc criteria run by `spec-gate` itself — no judge agent. |
| `impl-producer` | `quill-doc-writer` | Writes the documents against the **frozen** `.feature`, and co-produces the per-scenario acceptance checks the judge will run. |
| `impl-judge` | `quill-judge` | **Runs** those acceptance checks (static inspection) against the frozen scenarios — it never authors the docs or their checks. |

Producers act (they write); judges run cold — `quill-judge` is a separate context from `quill-doc-writer` so the grader never shares the author's assumptions. All bar governances (`oracle-spec`, `builder-spec`, `builder-impl`, `architect-spec`, `architect-impl`) are `null` in Quill's squad, meaning Quill relies on SDD's default actor-gate bars rather than doc-specific overrides.

## Installation

```bash
npx skills add cyberuni/cyber-skills --plugin quill
```

Then run `init-quill` to register Quill in `.agents/universal-plugin.json` so the SDD conductor resolves its roles for documentation domain types.

## Status

This repo dogfoods its own SDD process: Quill's own project spec (`.agents/specs/quill/spec.md`) is currently `status: draft`, so treat Quill itself as early-stage.

## Related

- [SDD Overview](/sdd/overview/) — the spec-driven development process Quill plugs into
- [ACES Overview](/aces/overview/) — SDD's sibling plugin for the agent-configuration domain
