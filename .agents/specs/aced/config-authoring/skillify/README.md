---
spec-type: behavioral
concept: [config-authoring]
---

# skillify — generalize the current session into a reusable skill

Extract the repeatable workflow from what actually happened in the **current session** and author a
reusable SKILL.md from it — generalize the trigger, decisions, steps, inputs, and outputs the session
already exercised, then place, validate, and link the skill.

## Use Cases

**Fit:** strong — `skillify` makes a genuine activation decision (generalize *this session's* work vs.
the same config vocabulary carried by `define-skill`, `improve`, `define-agent`, or `define-governance`)
and has non-deterministic judgment (what to extract from the session, decisions vs. documentation,
placement, pattern, name, description), so all four eval layers carry signal.

**Subject** — turning the workflow just performed in the **current session** into a reusable skill:
mine the session history for the workflow (trigger, decisions, steps, inputs, outputs), separate
decisions from documentation, resolve placement and pattern, draft a name and a "Use this skill when"
description, write a SKILL.md that encodes the *why* behind each step, flag deterministic steps as
script-extraction candidates, validate the draft, and place and link it.

**Non-goals** — scaffolding a skill **from scratch** (from a topic the session did not perform) is
`define-skill`; diagnosing why an existing skill's golden-set evals fail is `improve`; authoring an
agent definition or persona is `define-agent`; authoring a reference-only rule set is
`define-governance`; scoring a config or adding eval cases is `run` / `add-scenario`; contributing an
already-authored installed skill back to its source repo upstream is `contribute-skill`. skillify is the
session-extraction side of the boundary `define-skill` names from the other side — the two are two
faces of the same routing decision and their Non-goals are mirrors.

Every scenario in [`skillify.feature`](./skillify.feature) maps to one of these behaviors:

| Behavior | What it covers |
|---|---|
| **trigger on a session-extraction request** | skillify fires on "skillify this" / "turn what we just did into a skill" / "make this reusable", and defers a from-scratch, eval-diagnosis, agent, or governance request to its sibling |
| **mine the workflow from the session** | it extracts the trigger, decisions, steps, inputs, and outputs from what the session actually did |
| **separate decisions from documentation** | it encodes the choices made and why, not reference material the model already knows |
| **resolve placement and pattern** | it derives the placement (user / project-private / project-public) and the pattern (process / tool-based / standard), asking the user when the signal is ambiguous rather than guessing |
| **draft name and description** | the SKILL.md gets a kebab-case name and a ≤120-char description containing "Use this skill when" |
| **encode the why, not just the what** | each step in the body records the constraint or decision behind it, not only the action |
| **flag script-extraction candidates** | a deterministic fixed-output step is marked as a script-extraction candidate rather than left as prose |
| **validate before handoff** | the draft is run through the skill audit and any CRITICAL finding is fixed before the skill is presented |
| **place and link** | the SKILL.md is written at its resolved path and linked into the target runtime |
| **generalize, do not transcribe** | session-specific values are generalized and no step the session never performed is invented |
| **quality of the generalized skill** | the produced skill encodes decisions-not-documentation, a discriminating trigger, and flagged script candidates (graded) |

## Scenarios (colocated)

The behavior suite is [`skillify.feature`](./skillify.feature) — the activation decision and its
sibling deferrals, mining the workflow from the session, the placement/pattern/name/description
choices, encoding the why, flagging script candidates, validating, placing and linking, the
generalize-don't-transcribe guard, and the graded quality of the produced skill. Cross-capability e2e
scenarios live in `../../acceptance/`.
