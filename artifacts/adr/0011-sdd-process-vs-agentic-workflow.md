# ADR-0011: SDD is a Governed Process; Its Runtime Is an Agentic Workflow

## Status

Accepted

## Context

The root SDD spec (`.agents/specs/sdd/spec.md`) opened with "SDD is a workflow." Separately, the
per-project "how we work this project" slice (conventions, gate tuning, CI, commit discipline,
layout strategy) needed a name, and "process" vs "workflow" felt interchangeable.

They are not interchangeable. A terminology survey
([`docs/research/sdd-vs-agentic-workflow.md`](../../packages/cyber-skills/docs/research/sdd-vs-agentic-workflow.md))
found the two words diverge by **altitude** and by **domain-claim**:

- **Academia / standards** (BPM, van der Aalst; CMMI, ISO/IEC 90003): **process** is the umbrella
  for *how work is done*; **workflow** (Workflow Management) is the narrower *automation* subset of
  a process.
- **Agentic industry** (Anthropic, *Building Effective Agents*): **workflow** is a claimed term of
  art — LLMs/tools on *predefined code paths* (deterministic) — set against **agent** (the LLM
  *dynamically directs its own process*). In an agents/skills repo, "workflow" carries that specific
  meaning.

SDD's runtime maps directly onto Anthropic's named **workflow** patterns: **orchestrator-workers**
(the conductor spawns cold judges + the impl-producer builder) and **evaluator-optimizer** (the
producer ↔ cold-judge grill), with **routing** at the gateway — and agentic workers at the leaves.
So SDD *is* in the agentic-workflow domain. But SDD adds a durable spec corpus, a lifecycle
(draft → approved → implemented + freeze), human gates, and governance — a methodology layer above
the runtime that Anthropic's ephemeral agentic workflows do not have.

## Decision Drivers

- Naming a per-project methodology file `workflow.md` would be an altitude mismatch (workflow = the
  automation subset / the runtime engine, not the governing methodology) in the exact repo where the
  agentic workflow-vs-agent distinction is load-bearing.
- "Process" is the academic umbrella for *how work is done* and is unclaimed in the agentic domain.
- The spec should situate SDD in the agentic-workflow literature rather than ignore it, and should
  state what makes SDD more than a workflow.
- The repo already uses "Process" for the doctrine loop and "workflow" informally for the engine —
  the decision should ratify the existing house usage, not invert it.

## Considered Options

### Option 1: Name the methodology slice `workflow`

- **Pros**: "workflow" is the hot industry word; familiar.
- **Cons**: collides with Anthropic's claimed workflow-vs-agent meaning *in an agents repo*; demotes
  a runtime/automation word onto a governing-methodology artifact; under-names the methodology
  (workflow is the subset, not the umbrella).

### Option 2: Name the methodology slice `process`; reserve `workflow` for the runtime engine (chosen)

- **Pros**: matches the academic umbrella; unclaimed in agentic usage; ratifies existing house usage
  (the doctrine "Process" loop); keeps a clean two-altitude vocabulary.
- **Cons**: lexical clash with OS `process` (Node `process.env`, Bash `ps`) — but cosmetic only; a
  `.md` spec artifact is never an env global, and context dissolves it.

## Decision

1. **Positioning.** SDD is a **spec-governed process (methodology)** whose **runtime is an agentic
   workflow** (orchestrator-workers + evaluator-optimizer). It is distinct from Anthropic's ephemeral
   agentic workflow by its durable spec corpus, lifecycle + freeze, human gates, and governance. The
   spec's `## What SDD is` states this; the opening sentence "SDD is a workflow" is corrected.

2. **Two-altitude vocabulary.**
   - **process** = the governing methodology layer — *what SDD is*. Names the doctrine ("Process")
     loop and the per-project "how we work this project" slice.
   - **workflow** = the runtime orchestration layer — *how SDD runs*. Names the Mission Loop engine.

3. **The per-project methodology slice is named `process`** — authored as a `## Process` section in
   the root `spec.md`, extracted to a sibling `process.md` only when it grows (the optionality rule
   used for `<unit>.solution.md`). It is **not** a substructure folder (folders vary by layout
   strategy) and **not** `workflow.md`.

Background survey:
[`docs/research/sdd-vs-agentic-workflow.md`](../../packages/cyber-skills/docs/research/sdd-vs-agentic-workflow.md).
