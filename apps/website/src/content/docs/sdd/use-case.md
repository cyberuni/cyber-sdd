---
title: Use Case
description: A use case is an actor with a goal, the entry point they invoke, and the extensions — everything else that can happen. Use cases live in the spec.
---

A **use case** answers one question: **who is trying to do what, how do they invoke it, and what else can happen?**

It is coarse-grained by design — one use case per distinct way the capability is invoked. It is not a test; it is the *situation* a test later verifies. The last part of that question is the one that does the most work: a use case that stops at the invocation describes a doorway, but says nothing about the doors that are locked, the ones that open onto an error, or the ones you are not allowed to open at the same time.

## The four parts

| Part | Question it answers |
|---|---|
| **Actor** | Who or what invokes this? |
| **Goal** | What outcome do *they* want? |
| **Entry point** | What triggers it, with what inputs, producing what? |
| **Extensions** | What else can happen — every path that does not reach the success outcome? |

Each use case is named to the surface that implements it — a CLI verb, a public function, an endpoint — so the spec, the suite, and the code share one structure and a change to one of them stays local.

## Finding them: start from actors, not from the interface

The order matters more than the format. If you walk the interface and ask who calls each entry point, you can only get back the use cases the interface already implies — you reproduce the surface and call it a requirement, and you stay blind to the use case nobody has built yet.

So go the other way round:

1. **List the actors.** Everyone who reaches the capability — people in a role, sibling capabilities, schedulers — **and** everyone affected by its outcome without invoking it: the reviewer, the person on call, the next step in a chain. That second group are stakeholders rather than actors, and they are where a missed use case usually hides.
2. **Per actor, name the goals** they arrive with.
3. **Then map goals to entry points.** Two mismatches are worth more than the matches: a goal no entry point serves is either a way in the capability is missing or a goal that belongs somewhere else, and an entry point no goal reaches is surface nobody asked for.

The result is checkable in both directions: an actor carrying no use case is a hole, and so is a use case whose actor is not on the list.

If the capability already exists and you are writing the spec after the fact, remember that the code can only tell you the use cases it **already serves**. The ones it does not serve have to come from somewhere else — what people asked for, what they worked around.

## Actor and goal

Write both as **one line each**. This is not a persona: no name, no backstory, no motivation paragraph.

The actor is whoever invokes the capability. That may be a person in a role, but it may equally be another capability calling in, or a scheduler firing on a timer. Non-human actors are normal, not a degenerate case worth apologizing for.

The goal is the actor's **result**, not the mechanism they use to get it. "Recover the work after a crash" is a goal; "calls `resume()`" is the mechanism wearing the goal's clothes. The test is simple: if the goal restates the operation, you have renamed the function rather than found the use case, and the section will teach a reviewer nothing they could not have read off the signature.

## The entry point

The entry point is the trigger, the inputs it arrives with, and the success outcome. A small table is the usual form, but prose or a diagram is fine wherever it reads better.

**EARS** (Easy Approach to Requirements Syntax) fits this part well. Its event-driven template maps almost one-to-one onto an entry point:

> **When** `<trigger>`, the `<system>` **shall** `<response>`.

and its unwanted-behavior form is a natural fit for extensions, since an extension is exactly a condition and the response it forces:

> **If** `<condition>`, **then** the `<system>` **shall** `<response>`.

EARS has no dedicated slot for *inputs* — carry those in the precondition or a separate column. Reach for it when it sharpens a use case; it covers the entry point and the extensions, not the actor and goal, so it never replaces the section on its own.

## Extensions

An **extension** is any path from the trigger that does not reach the success outcome, written with both its **cause** and its **outcome**. That definition is what decides whether something belongs — the kinds below are a prompt to search with, not a list to fill in. A divergence matching none of them still counts, and a kind that cannot arise in your capability is not owed a row.

- the **refusal** — the capability declines, on purpose
- the **error** — something failed, and the actor has to be told
- the **boundary** — the largest, smallest, first, or last case
- the **partial result** — some of the work succeeded
- the **contended or absent input** — two writers, or no input at all

If you believe a use case genuinely has none of these, say so in the spec: write `extensions: none — <why>`. That is a real claim about the capability, and writing it down lets a reviewer disagree with it at the gate. Leaving the field off makes the same claim silently, where nobody can argue with it.

Extensions are a **discovery instrument, not a second specification**. Their job is to make the control-flow graph complete. A graph drawn from an implementation can only reproduce what the code already does — it can never tell you a branch is *missing*. Asking what can go wrong for this actor is what finds it.

So an extension you find belongs in the graph as a path, and the [scenarios still come from the graph](/sdd/scenario/), never from the list you just wrote. That direction matters: a suite derived from a written list is complete against that list by construction, so it can no longer surface a gap — which is the whole reason the graph exists.

This also means a use case is **not** one-to-one with a scenario. One extension may need several scenarios when several paths reach it, and several extensions may converge on one.

The cost is a longer `## Use Cases` section and a longer `.feature`. That is the trade: you pay in spec length for the error and boundary behavior being designed before it is discovered in production.

## A worked example

Take a small capability — an `export` command that writes stored records to a file.

**Use case: `export` — an operator hands last month's records to the finance team.**

- **Actor** — an operator running the tool from a terminal.
- **Goal** — have a file they can send on, containing exactly last month's records.

| Trigger | Inputs | Outcome |
|---|---|---|
| The operator runs `export` | A date range, a destination path | A file at the destination holding every record in the range |

**Extensions**

| Cause | Outcome |
|---|---|
| The destination file already exists | Refuses, writes nothing, exits non-zero |
| The range matches no records | Reports that no records matched and writes no file |
| The record store is unreachable | Reports the failure and exits non-zero; no partial file is left behind |
| The range reaches past the retention window | Exports what survives and names the portion that is missing |

The second use case on the same verb has a different actor entirely:

**Use case: `export` — a nightly scheduler keeps the off-site copy current.** The actor is the scheduler; the goal is that a machine-readable copy of yesterday's records exists off-site by morning; the trigger is the timer, and the extension that matters is the one where last night's run already produced the file.

## Every element of the surface traces to a use case

Once the use cases are written, walk the capability's public surface — every flag, option, parameter, prop, and event — and name the use case that needs each one. Where two elements must not be used together, say so here too.

| Element | Needed by | May not be combined with |
|---|---|---|
| `--since` / `--until` | The operator hand-off use case | — |
| `--dry-run` | The operator checking the range before committing to it | `--force` |
| `--force` | The re-run after a failed export | `--dry-run` |

An element that no use case needs is an **orphan**: cut it, or name the use case that justifies it. A pair whose combination is contradictory and unstated is a gap rather than a detail — that is how `--dry-run --force` ships as undefined behavior. This is the same orphan-detection discipline the [scenario map](/sdd/scenario/) applies to scenarios, moved one level up: there, a scenario nothing points at is an orphan; here, an element no use case needs is.

Degenerate cases stay cheap. A capability with **one** entry point and **no** optional elements records the trace in a line — "the surface is the single `status` verb, needed by the only use case" — and stops there. The obligation is that nothing on the surface is unaccounted for, never that a table exists.

## Where use cases live

Use cases live in **`spec.md`**, in a dedicated `## Use Cases` section. It is part of the design a human reviews at the gate — the high-altitude account of who invokes the capability, how, and what happens when the ordinary path does not hold.

A use case with no [scenarios](/sdd/scenario/) is unverified intent: a doorway with no proof anything happens once you walk through it. The relationship is **one-to-many** — one use case is verified by one or more scenarios. Those scenarios are drawn from the control-flow graph rather than from this section, which is why the extensions you find have to reach the graph first.

## Use case vs scenario

A use case is *coarse* and lives in `spec.md`; a [scenario](/sdd/scenario/) is *fine* and lives in the `.feature`. The use case describes the actor, the goal, the way in, and everything else that can happen; the scenario is the boolean proof that one of those things does happen.
