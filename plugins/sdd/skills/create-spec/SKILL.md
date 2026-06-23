---
name: create-spec
description: Use this skill when the user wants to create a spec for a new or existing software feature — scaffold spec.md and a .feature file for a domain.
---

# create-spec

Scaffold `specs/<domain>/spec.md` and `specs/<domain>/<domain>.feature` for a new or existing domain. This skill **is** the exploration phase: it owns the user loop, drives the `sdd-orchestrator` through one or more autonomous segments, and leaves the spec at `status: draft` ready for the spec gate (`validate-spec`).

Load `sdd:lifecycle-governance` for the status enum and what `draft` means, and `sdd:ownership-governance` for the write-ownership matrix — which fields the spec-producer may write, which belong to the orchestrator and gate skill.

## Identify the domain

If the user named a domain, use it directly (the name matches the implementation folder — `governance`, `build`, `auth`). Otherwise list domains under `src/` (or the project source root) with no `specs/<domain>/spec.md` yet, and ask the user to pick one.

## Determine mode

- **New feature** — no implementation exists yet.
- **Backfill** — implementation already exists; the spec-producer infers content from source and tests.

If unclear, ask which applies.

## Grill the user (new feature only)

The orchestrator has no user channel, so collect intent here **before** the first invocation. For a new feature with missing What / Why / command surface, ask 3–5 targeted questions:

- The core problem and who experiences it (drives Why)
- Observable behavior from the user's perspective (drives What)
- The public interface: commands, signatures, or events (drives Command surface)
- Known edge cases or explicit non-goals
- Which reviewers must be heard (PM, Designer, Engineer, …)

For backfill, skip the grill — the producer reads source, tests, and history instead.

## Drive the orchestrator (the user loop)

Set an **iteration cap** for this sitting — default **3**, overridable if the user named one in the prompt. Then loop:

1. Invoke `sdd-orchestrator`:
   ```
   DOMAIN:        <domain>
   DOMAIN_PATH:   specs/<domain>/
   USER_INPUT:    <grill answers, or null for backfill>
   USER_ANSWERS:  <answers collected for the previous QUESTIONS, or null>
   ITERATION_CAP: <cap>
   ```
2. On `STATUS: complete` → exit the loop.
3. On `STATUS: needs-input` → ask the user the **batched** `QUESTIONS` (expect waves across segments). If the question is which plugin owns a contested domain, write the choice to the `domain-plugin` map in `spec.md` frontmatter. Re-invoke with the answers as `USER_ANSWERS`. Count the iteration.
4. On `STATUS: blocked`, or when the cap is hit without converging → **do not auto-accept**. Present the failing scenarios and ask the user to **accept as-is**, **keep looping** (reset the count), or **change the spec**. Act on the choice.

## Route observations

The orchestrator bubbles `OBSERVATIONS` (typed `architect` | `strategist`) but never acts on them. Surface them to the user. On **accept**, spawn a **new spec** for the deferred work (with `blocked-by` edges; a strategist lesson may target a sibling project; an optional `route:` flag syncs it externally) — never record the concern in this spec's markers. Decline = drop it.

## Report

- Domain specced; files written (`spec.md`, `.feature`, `## Artifacts`)
- `ALIGNED: true | false` (contract layer); if false, list missing or out-of-sync artifacts
- Open questions remaining (`<!-- open: -->` markers)
- Any observations surfaced and their disposition
- Next step: run `validate-spec` to take Draft → Approved

## Commit

Only commit when `ALIGNED` is `true`. Stage the spec's own artifacts and commit:

```
docs(specs): add <domain> spec
```
