---
title: Scenario
description: A scenario is a boolean acceptance assertion — Given/When/Then, pass or fail. Scenarios live in the .feature and verify a use case.
---

A **scenario** is a *boolean assertion*. `Given` / `When` / `Then` — pass or fail. It answers one question: **given this exact situation, does it do that — yes or no?**

It is fine-grained and testable. Where a [use case](/sdd/use-case/) describes an actor, their goal, the way in, and everything else that can happen, a scenario proves one observable behavior — and it is drawn from the capability's control-flow graph, not from the use-case prose.

## What a scenario looks like

Scenarios live in the **`.feature`** file as pure boolean Gherkin:

```gherkin
Scenario: the Scanner fires when a spec ships
  Given a spec transitions to implemented
  When the Scanner observes the terminal transition
  Then it drafts strategy from the finished mission
```

The rules that keep a scenario boolean:

- **Every `Then` is a boolean assertion** of observable behavior — the subject *does* X, not *does X sometimes*. No probabilities, no "usually."
- **Observable behavior only** — assert outputs, exit codes, side effects, emitted events. Never internal state, function names, or implementation steps.
- **No rubric in the scenario** — threshold and score are the judge's private detail. A non-deterministic subject still collapses to one boolean (`score ≥ threshold` → pass/fail).

## Where scenarios live

Scenarios live in the **`.feature`**, never in `spec.md`. They trace the workflow top-to-bottom, grouped by stage, so a reader can audit that every stage is covered.

## Scenario vs use case

A scenario is *fine* and lives in the `.feature`; a [use case](/sdd/use-case/) is *coarse* and lives in `spec.md`. The relationship is **one-to-many**: one use case is verified by one or more scenarios, and it is never one-to-one — one of a use case's extensions may need several scenarios where several paths reach it, and several extensions may converge on one.

Scenarios come from the **control-flow graph**, never from the use-case prose. That direction is load-bearing: a suite derived from a written list is complete against that list by construction, so it can no longer surface a gap. A scenario with no use case is an orphan test — it asserts a behavior nobody entered through.
