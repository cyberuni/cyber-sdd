---
spec-type: behavioral
concept: [config-authoring]
---

# skillify — generalize the current session into a reusable skill

## What

Extract the repeatable workflow from what actually happened in the **current session** and author a
reusable SKILL.md from it — mine the trigger, decisions, steps, inputs, and outputs the session
already exercised, generalize them, then draft, write, validate, place, and link the skill.

The problem it solves is that a workflow performed manually in a session has no path to reuse: the
next session re-derives every decision from scratch. `skillify` captures what was decided and why so an
agent can repeat it. The hard part is the boundary — the same "reuse this / make a skill" vocabulary is
carried by capabilities that scaffold a skill *from scratch* (`define-skill`), extract the session into
an *agent/persona* (`define-agent`), capture it as a *reference-only rule set* (`define-governance`),
or *diagnose* failing evals (`improve`). The tell is the **target artifact**, not the "reuse this"
framing. `skillify` owns exactly one thing: generalizing *this session's* work into a skill.

**Non-goals.** Scaffolding a skill **from scratch** (from a topic the session did not perform) is
`define-skill`; diagnosing why an existing skill's golden-set evals fail is `improve`; authoring an
agent definition or persona is `define-agent`; authoring a reference-only rule set is
`define-governance`; scoring a config or adding eval cases is `run` / `add-scenario`; contributing an
already-authored installed skill back to its source repo is `contribute-skill`. skillify is the
session-extraction side of the boundary `define-skill` names from the other side — two faces of one
routing decision, their Non-goals mirrors.

**Fit:** strong — `skillify` makes a genuine activation decision (generalize *this session's* work vs.
the same config vocabulary carried by `define-skill`, `improve`, `define-agent`, or `define-governance`)
and has non-deterministic judgment (what to extract from the session, decisions vs. documentation,
placement, pattern, name, description), so all four eval layers carry signal.

## Use Cases

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Route a session-extraction request | "skillify this" / "turn what we did into a skill" / "make this reusable" vs. a from-scratch, eval-diagnosis, agent, or rule-set request | it fires on session extraction and defers each sibling by its target artifact |
| Mine the workflow | the current session's history | it extracts the trigger, decisions, ordered steps, inputs, and outputs, keeping decisions-and-why and dropping documentation, inventing no unperformed step |
| Resolve placement + pattern | the session's scope and shape | it selects the placement (user / project-private / project-public) and pattern (process / tool-based / standard), asking the user when the scope is ambiguous rather than guessing |
| Draft + write the SKILL.md | a mined workflow with settled scope | a kebab-case name, a ≤120-char "Use this skill when" description, and a body that encodes the why per step, flags deterministic steps as script-extraction candidates, and generalizes session-specific values |
| Validate, place, link | a freshly drafted SKILL.md | it audits the draft, fixes any CRITICAL finding before handoff, then writes the file at its resolved path and links it into the runtime |
| Grade the produced skill | the emitted SKILL.md | it scores for decisions-not-documentation, a discriminating trigger, flagged script candidates, and generalized-not-transcribed content |

## Control Flow

Two invariants frame the produce path: **generalize, never transcribe** — session-specific paths and
names become workflow parameters — and **never hand off unvalidated** — the draft cannot reach
placement without passing the audit. Everything below runs inside those.

```mermaid
flowchart TD
  ROUTE{what is being asked for?}
  ROUTE -->|generalize THIS session's work into a skill| MINE
  ROUTE -->|scaffold a skill from scratch, no session behind it| DS([defer to define-skill])
  ROUTE -->|diagnose why a skill's golden-set evals fail| IMP([defer to improve])
  ROUTE -->|extract the session into a delegated agent / persona| DA([defer to define-agent])
  ROUTE -->|capture the session as a reference-only rule set| DG([defer to define-governance])

  MINE[mine the session — trigger, decisions, steps, inputs, outputs;<br/>keep decisions + why, drop documentation the model knows;<br/>encode only steps the session actually performed] --> PLACE

  PLACE{resolve placement}
  PLACE -->|personal, tied to no codebase| USER[user]
  PLACE -->|contributors of this repo| PRIV[project-private]
  PLACE -->|installed by package users| PUB[project-public]
  PLACE -->|scope ambiguous| ASK([ask the user; never guess])
  USER --> PAT
  PRIV --> PAT
  PUB --> PAT
  ASK --> PAT

  PAT{resolve pattern}
  PAT -->|ordered multi-step| PROC[process]
  PAT -->|tool / external-system centered| TOOL[tool-based]
  PAT -->|tone / structure / quality| STD[standard]
  PROC --> DRAFT
  TOOL --> DRAFT
  STD --> DRAFT

  DRAFT[draft a kebab-case name + a &le;120-char<br/>discriminating "Use this skill when" description] --> WRITE

  WRITE[write the SKILL.md — encode the why per step;<br/>flag deterministic fixed-output steps as script-extraction candidates;<br/>generalize session-specific values, hard-code nothing] --> VALIDATE

  VALIDATE{audit the draft via improve-skill}
  VALIDATE -->|CRITICAL finding| FIX[fix it before handoff]
  VALIDATE -->|clean| PLACEIT
  FIX --> PLACEIT
  PLACEIT([write the SKILL.md at the resolved path + link it into the runtime])
```

## Scenario map

One row per edge in the graph above, one scenario per row. The `ROUTE` fork is covered by the
`@trigger` activation outline (positive + sibling near-miss examples) plus one boolean defer scenario
per sibling; each classifier binds at least two arms so no constant-mapping mutant survives. Rows
follow the suite's section order.

| Edge | Path (Given) | Scenario |
|---|---|---|
| `ROUTE` → `MINE` (@trigger fires + siblings) | session-extraction queries vs. from-scratch / eval-diagnosis / agent / rule-set near-misses | `skillify activates on a session-extraction request and defers its siblings` |
| `ROUTE` → `DS` | scaffold a skill from scratch with no session work behind it | `a request to scaffold a skill from scratch defers to define-skill` |
| `ROUTE` → `IMP` | diagnose why a skill's golden-set cases are failing | `a request to diagnose why a skill's evals fail defers to improve` |
| `ROUTE` → `DA` | turn the session into a delegated code-reviewer agent | `a request to extract the session into a delegated agent defers to define-agent` |
| `ROUTE` → `DG` | capture the session as criteria other skills load but never execute | `a request to extract the session into a reference-only rule set defers to define-governance` |
| `MINE` (extract) | a session that manually migrated a config across three files and verified it | `the workflow is mined from what the session actually did` |
| `MINE` (separate) | a session mixing a load-bearing choice with steps the model already knows | `decisions are separated from documentation` |
| `MINE` (no-invent guard) | a session that performed four of a workflow's five conceivable steps | `no step the session never performed is invented` |
| `PLACE` → `PRIV` + `PAT` → `PROC` | an ordered multi-step process scoped to contributors of this repo | `placement and pattern are resolved from the session signal` |
| `PLACE` → `USER` | a personal workflow tied to no specific codebase | `a personal session workflow resolves to the user placement` |
| `PLACE` → `ASK` | a workflow whose scope is unclear between personal and project | `an ambiguous placement is resolved with the user, not guessed` |
| `PAT` → `TOOL` | a workflow centered on calling tools or external systems | `a tool-centered session workflow resolves to the tool-based pattern` |
| `DRAFT` | a mined workflow with a settled scope and steps | `the SKILL.md carries a matching name and a trigger-bearing description` |
| `WRITE` (why) | a mined workflow whose steps each carried a constraint or decision | `each body step encodes the why behind it` |
| `WRITE` (script flag) | a mined step that produces the same output for the same input with no judgment | `a deterministic fixed-output step is flagged as a script-extraction candidate` |
| `WRITE` (generalize guard) | a session that operated on a specific file path and a specific project name | `session-specific values are generalized, not transcribed` |
| `VALIDATE` → `FIX` | a freshly drafted SKILL.md whose audit reports a CRITICAL finding | `the draft is validated and CRITICAL findings are fixed before handoff` |
| `VALIDATE` (no-skip guard) | a drafted SKILL.md that has not yet been audited | `validation is not skipped before handoff` |
| `PLACEIT` | a validated SKILL.md and a resolved project-public placement | `the SKILL.md is placed at its resolved path and linked into the runtime` |
| `QUALITY` (graded) | a session with a settled workflow and its decisions | `the generalized skill encodes decisions, a discriminating trigger, and flagged script candidates` |

Cross-capability e2e scenarios live in `../../workflows/`.
