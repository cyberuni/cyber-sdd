---
title: The Fleet Metaphor
description: SDD framed as a strike fleet — the command roles, delegates, loops, and artifacts, and what each maps to. The vocabulary that appears in the prompts.
---

SDD carries a running metaphor: **the work is a strike fleet.** It isn't decoration — the vocabulary appears in the prompts and gives every player one coherent mental model of its job. This page is the translation table: each metaphor term and the real concept it names. For the underlying theory see [The Four Actors](/motive-model/four-actors/); for the loops in plain terms see the [Overview](/sdd/overview/).

## The conceit

A spec is an **engagement** — a defined objective the fleet commits to. The human is **fleet command** (the Conductor / Council): they hold motive and accountability, and theirs are the only hands on ratification and the kill switch. Everyone else is a delegate carrying out command's intent. The fleet learns from every engagement, refits between them, and — across many fleets — improves the ships themselves.

The point of the metaphor is **altitude discipline**: it keeps "win this engagement" separate from "is this the right campaign," "is the fleet well-ordered," "what did we learn," and "should the ships themselves change." Those are the five loops.

## Command roles — the four actors

Each [actor](/motive-model/four-actors/) wears a command hat. The actor names the *concern*; the fleet name the *posture*.

| Fleet role | Actor | Commands | Bar |
|---|---|---|---|
| **Commander** | Director | the **campaign** — which objectives to pursue, what to abandon; the go/no-go to commit or stand down | scope, kill-or-ship |
| **Battler** | Builder | the **engagement** — taking one objective | testability, coverage |
| **Warden** | Architect | the **formation** — keeping the fleet's order of battle coherent | structural fit |
| **Scanner** | Strategist | the **watch** — reading combat reports for patterns and drafting doctrine | scope of doctrine, kill-or-keep a lesson |

Every role has two faces: **forward** (produce — press the attack) and **backward** (judge — hold the line at the gate). `producer ≠ judge`: the hand that strikes is never the hand that signs off.

## Delegates — who is actually invoked

Command sets intent; **delegates** carry it out. The two named delegates:

- **Operator** (`sdd-orchestrator`) — the line officer of an engagement. Runs one autonomous **segment**, resolves which units to commit, dispatches the production chain, and reports back. Has **no channel to fleet command** — it escalates through the relay only at a gate or a scrub.
- **Scanner in the Bunker** (the doctrine delegate) — watches every engagement reach a terminal state, drafts strategy from the combat logs, and surfaces it to command. It watches and drafts; it never fires (never writes lifecycle state).

The **relay** (the `sdd` gateway) is the signal line: it is the *only* place a delegate reaches fleet command. The Operator runs dark between checkpoints and transmits up the relay when it needs a decision.

## The loops

The five altitudes, each owned by a command role (the [Overview](/sdd/overview/) has the same table in plain terms):

| Loop | Plain name | Role | Question |
|---|---|---|---|
| **Mission** | Build | Battler | win *this* engagement |
| **Campaign** | Product | Commander | are we fighting the *right* engagements? |
| **Formation** | Structure | Warden | is the fleet *well-ordered*? |
| **Doctrine** | Process | Scanner | what did we *learn* about how to fight? |
| **Forge** | Harness | (the shipyard) | should the *ships themselves* change? |

**Mission** is the inner loop — one engagement. **Campaign / Formation / Doctrine** are the outer loops, run across engagements: choosing objectives, keeping the formation sound, distilling doctrine. **Forge** sits above a single fleet entirely — the shipyard that refits the vessels from the combat reports of *every* fleet (every installation), so the ships get better for all. That last one is the recursion: SDD improving SDD.

## Artifacts and acts

| Fleet term | Real concept |
|---|---|
| **Engagement** | a spec — one committed objective |
| **Combat log** | the spec's provenance record: who produced and judged each artifact, every correction with its cause, the strategy drafted from it (see `combat-log-governance`) |
| **Sealed orders** | the **frozen** `.feature` of an `approved`/`implemented` spec — the contract cannot be altered mid-engagement; changing it requires command to break the seal (a ratified re-open) |
| **The gate** | the go/no-go: a backward-face verdict to advance an engagement's status. Command ratifies; a delegate may only self-assert within its **leash** |
| **Scrub** | a kill decision — stand the engagement down (`deprecated`) |
| **The leash** | how far a delegate may act on its own before it must signal command — derived per gate from reversibility, blast radius, novelty, and confidence |

## Project vs inject

Two ways a delegate is committed, and the distinction matters:

- **Project** — spawn a *fresh* unit (a subagent) with sealed orders and no memory of the bridge. Clean context, isolated.
- **Inject** — run a skill *in the current officer's own context*. The instructions become part of who is already on the bridge.

The Operator **projects** the production-chain roles (they are spawned subagents) and **injects** its stations (`create-spec`, `validate-spec`, … are skills it runs in-session). Confusing the two — trying to *project* a station as a subagent — is the classic misfire and it fails outright.

## Why keep the metaphor

It earns its place three ways: it gives each prompt a posture (a Battler presses, a Warden guards, a Scanner watches), it makes altitude confusion audible ("that's a Campaign question, not a Mission one"), and it travels — fleet command, sealed orders, and the forge are immediately legible to a newcomer in a way that "the outer cross-installation harness-improvement loop" is not.
