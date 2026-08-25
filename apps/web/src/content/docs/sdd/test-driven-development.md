---
title: Test-Driven Development
description: What TDD is, how it relates to spec-driven development, and why naive TDD prompting makes AI agents perform worse.
---

Write a failing test. Watch it fail. Write the minimum code to make it pass. Refactor. Repeat.

That loop — red, green, refactor — is Test-Driven Development. It's been one of the most influential practices in software engineering since Kent Beck formalized it in the early 2000s[^1], and its core insight still holds: **a test written before code is a micro-specification**, forcing you to define expected behavior before you decide how to produce it.

## What TDD is

TDD is a discipline, not a testing strategy. The tests are a byproduct. The practice is about design: writing a test first forces you to think about the interface before the implementation, the contract before the code.

The red-green-refactor cycle:

1. **Red** — write a test that fails because the code doesn't exist yet
2. **Green** — write the minimum code to make the test pass
3. **Refactor** — clean up the implementation without breaking the test

The constraint "minimum code to pass" is deliberate. It prevents over-engineering and forces each feature to be driven by an actual verified need. If you can't write a failing test for it, you might not need it.

### What TDD enforces

- **Testability by design** — code that can't be tested in isolation usually has hidden coupling; TDD surfaces that early
- **Small, verifiable steps** — each cycle is short; you're never far from green
- **Regression safety** — the growing test suite catches unintended breakage
- **Design feedback** — a test that's painful to write signals a design problem, not a testing problem

### What TDD doesn't carry

TDD operates at the unit and integration level. A test suite tells you what the code does; it doesn't tell you *why* the feature exists, what the command surface looks like from a user's perspective, or what the system should do in scenarios that nobody thought to test. That context lives in a spec.

## TDD and spec-driven development

TDD and SDD are not competing methodologies. They operate at different levels of abstraction and compose naturally.

**SDD** defines intent at the feature level: why the feature exists, what behavior it exposes to users, the command surface, acceptance scenarios. It answers "what are we building and why."

**TDD** drives implementation at the unit level: each task from the spec becomes a red-green-refactor cycle. It answers "how does this piece work, and is it correct."

The stack:

```
Spec (SDD)          ← feature intent, behavioral contract
  └─ Plan           ← architecture derived from spec
       └─ Tasks     ← atomic implementation units
            └─ TDD  ← red-green-refactor per task
```

This means TDD doesn't replace specs; it fills in beneath them. The spec establishes what must be true; TDD verifies that each implementation unit makes it true.

## TDD with AI agents: the problem

TDD was designed for human developers. The discipline works because of something humans bring that models don't: **cognitive commitment to the test's meaning**.

When a developer writes a failing test, they hold the intent in their head. They know what the test is *for*. They write code to satisfy that intent, not just to satisfy the assertion. The test and the understanding travel together.

An AI agent doesn't carry that commitment. Research published in 2025 (TDAD: Test-Driven Agentic Development)[^2] found that naive TDD prompting — instructing an agent to "write a failing test first, then implement" — produced worse results than vanilla prompting:

- On one benchmark task, TDD prompting caused 352 out of 352 test failures; vanilla prompting caused 4
- Agents given TDD instructions touched more files, attempting more ambitious fixes, but caused more regressions in code they weren't supposed to change
- Naive TDD increased regression rates to 9.94%, worse than the baseline

### Why this happens

**Context crowding.** TDD procedural instructions ("write a failing test, then implement, then refactor") consume tokens in the context window. Those tokens displace repository context — the existing code structure, interfaces, and conventions — that the model actually needs to make correct changes. The model makes decisions with less of the picture.

**Test gaming.** Agents don't derive intent from a failing test the way a developer does. Given "write code to make this test pass," a model finds the path of least resistance to green — often minimal or incorrect code that satisfies the assertion without solving the underlying problem. The test becomes a puzzle to solve, not a specification to honor.

**Loop mismatch.** The red-green-refactor loop is tuned for a human's working memory — short cycles where the developer holds intent across each step. A stateless model re-derives context at every step. The loop's value degrades when the agent can't maintain the intent that makes the loop meaningful.

### Tests as verification gates, not specification interfaces

The fix isn't to abandon tests with agents — it's to use them correctly.

**Tests work well for agents as verification gates:** run the suite after the agent generates code and check what broke. The agent gets a binary signal — pass or fail — and can correct course. This is how most effective AI coding workflows use tests.

**Tests work poorly for agents as the specification interface:** "here's a failing test, figure out what to build" gives the agent an ambiguous, underspecified input. The agent guesses at intent rather than receiving it.

Specs (SDD) are a better specification interface for agents than failing tests. A structured spec tells the agent what behavior is expected, why it exists, what the command surface looks like, and what scenarios must pass. It's unambiguous context rather than a puzzle.

The effective pattern:

```
Spec → agent generates implementation → tests verify correctness
```

Not:

```
Failing test → agent guesses intent → agent makes test pass
```

### What the TDAD paper recommends

The TDAD paper's fix: instead of generic TDD procedural prompts, provide **targeted test context** — tell the agent specifically which tests are relevant to a given change, using a dependency graph of the codebase. This preserved TDD's regression safety without the context crowding that generic instructions caused.

The broader lesson: the value of tests in agent workflows comes from *running* them as verification, not from *writing* them as specification. Structure the agent's input as a spec; structure its feedback loop as a test suite.

## How we use TDD

In our [co-delivery model](./spec-driven-development), specs and implementation arrive together. TDD fits naturally beneath that:

- Scenarios in the `.feature` file define the behavioral contract (the spec level)
- Unit tests written TDD-style verify each implementation component (the task level)
- The spec's scenarios map to integration tests that run in CI

Agents generating implementation use the spec as input and the test suite as a verification gate. When an agent breaks a test, that's a clear signal — not a guessing game about what "failing test" means.

TDD's discipline — design through testability, small verifiable steps, regression safety — remains valuable. What changes in an AI-assisted workflow is *who* drives the red-green-refactor cycle (humans for complex logic, agents for mechanical tasks) and *what* the agent receives as its specification interface (a structured spec, not a raw failing test).

## References

[^1]: Kent Beck, *Test-Driven Development: By Example* (Addison-Wesley, 2002).
[^2]: Abdelfattah et al., ["TDAD: Test-Driven Agentic Development — Reducing Code Regressions in AI Coding Agents via Graph-Based Impact Analysis"](https://arxiv.org/abs/2603.17973), arXiv:2603.17973 (2025).
