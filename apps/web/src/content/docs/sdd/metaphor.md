---
title: The Fleet Metaphor
description: SDD framed as a strike fleet — the command roles, delegates, loops, and artifacts, and what each maps to. The vocabulary that appears in the prompts.
---

SDD carries a running metaphor: **the work is a strike fleet.** It isn't decoration — the vocabulary appears in the prompts and gives every player one coherent mental model of its job. This page is the translation table: each metaphor term and the real concept it names. For the underlying theory see [The Four Actors](/motive-model/four-actors/); for the loops in plain terms see the [Overview](/sdd/overview/).

## The conceit

A spec is a **territory** — owned ground the fleet takes and holds. It persists: once taken, it stays on the map and is re-engaged only when it must change. A **mission** is the operation to take one territory; the **frontier** is the leading edge of all the ground held so far. The human is **fleet command** (the Council): they hold motive and accountability, and theirs are the only hands on ratification. Everyone else is a delegate carrying out command's intent. The fleet learns from every mission, refits between them, and — across many fleets — improves the ships themselves.

The point of the metaphor is **altitude discipline**: it keeps "win this mission" separate from "is this the right campaign," "is the fleet well-ordered," "what did we learn," and "should the ships themselves change." Those are the five loops.

## Command roles — the four actors

Each [actor](/motive-model/four-actors/) wears a command hat. The actor names the *concern*; the fleet name the *posture*.

| Fleet role | Actor | Commands | Bar |
|---|---|---|---|
| **Commander** | Oracle | the **campaign** — which territories to pursue, what to abandon; the go/no-go to commit or stand down | scope, kill-or-ship |
| **Battler** | Builder | the **mission** — taking one territory | testability, coverage |
| **Warden** | Architect | the **formation** — keeping the fleet's order of battle coherent | structural fit |
| **Scanner** | Strategist | the **watch** — reading combat reports for patterns and drafting doctrine | scope of doctrine, kill-or-keep a lesson |

Every role has two faces: **forward** (produce — press the attack) and **backward** (judge — hold the line at the gate). `producer ≠ judge`: the hand that strikes is never the hand that signs off.

## The conductor holds the bridge — no separate line officer

Earlier fleet vocabulary had a spawned "Operator" running each mission with no channel to command. That's gone: **fleet command's own officer runs the mission from the bridge.** The attended mission (`start-mission`) runs *in the session that holds the user channel* — there is no relay round-trip because command is already on the bridge. The one delegate that still runs a mission with no one aboard is the **automaton** (`sdd-automaton`): the same conductor, crewed for an unmanned sortie (an unattended scheduler, or fanning a queue of pre-cleared missions), which self-asserts within its leash and radios batched questions back rather than asking live.

- **Bridge (conductor)** — the officer at the helm, running the mission loop directly: resolves delegates, dispatches the production chain, grills command live, self-asserts within leash.
- **Unmanned sortie (automaton)** — the identical mission loop run with no one aboard; it never self-approves a mission for launch.
- **Scanner in the Bunker** (the doctrine delegate) — watches every mission reach a terminal state, drafts strategy from the combat logs, and surfaces it to command. It watches and drafts; it never fires (never writes lifecycle state).
- **Warden on watch** (the formation delegate) — audits the fleet's order of battle post-mission, corpus-wide; self-clears the routine repositioning, escalates the rest as a new mission order.

The **gateway** is the signal station: it is where a request first reaches the fleet, and it is the *only* place a headless automaton's questions surface to command (it holds no channel of its own — it relays).

## The loops

The five altitudes, each owned by a command role (the [Overview](/sdd/overview/) has the same table in plain terms, with which loops are shipped today):

| Loop | Plain name | Role | Question |
|---|---|---|---|
| **Mission** | Build | Battler | win *this* mission |
| **Campaign** | Product | Commander | are we taking the *right* territories? |
| **Formation** | Structure | Warden | is the fleet *well-ordered*? |
| **Doctrine** | Process | Scanner | what did we *learn* about how to fight? |
| **Forge** | Harness | (the shipyard) | should the *ships themselves* change? |

**Mission** is the inner loop — one CR's full lifecycle, across the explore and deliver phases. **Campaign / Formation / Doctrine** are the outer loops, run across missions: choosing which territories to take, keeping the formation sound, distilling doctrine. **Forge** sits above a single fleet entirely — the shipyard that refits the vessels from field corrections across *every* fleet (every installation), opt-in and privacy-gated. That last one is the recursion: SDD improving SDD.

## Artifacts and acts

| Fleet term | Real concept |
|---|---|
| **Territory** | a spec — owned ground, taken and held; it persists (a noun, not an act) |
| **Frontier** | the leading edge of all held territory — the project spec as a whole |
| **Mission** | the operation to take one territory — one CR's full lifecycle, across the explore and deliver phases (a verb) |
| **Engagement** | one iteration *within* a phase — a single producer⇄judge exchange |
| **Segment** | one autonomous conductor sitting between checkpoints (`pause-mission` / `resume-mission`); holds one or more engagements |
| **Combat log** | the mission's mid-flight provenance: `report` / `correction` / `halt` entries beside the plan brief, deleted at retro once distilled |
| **Ledger** | the durable, sharded record beside the root spec: the run-start leash, every gate verdict, and Scanner-drafted strategy — never frozen, never deleted |
| **Sealed orders** | the **frozen** `.feature` of an `approved`/`implemented` node — the contract cannot be altered mid-mission; changing it requires command to break the seal (a ratified re-open) |
| **The gate** | the go/no-go: a backward-face verdict to advance the mission to its next phase (the spec's lifecycle status). Command ratifies; the conductor may only self-assert within its **leash** |
| **Scrub** | a kill decision — stand the mission down and abandon the territory (`deprecated`) |
| **The leash** | how far the conductor may act on its own before it must signal command — derived per gate from reversibility, blast radius, novelty, and confidence |

## Project vs inject

Two ways a delegate is committed, and the distinction matters:

- **Project** — spawn a *fresh* unit (a subagent) with sealed orders and no memory of the bridge. Clean context, isolated — the cold judges, the impl-producer builder, the automaton (when headless), the Scanner, the Warden.
- **Inject** — run a skill *in the current officer's own context*. The instructions become part of who is already on the bridge — the conductor running `start-mission`, the SDD-default producers it authors inline.

The conductor **injects** the producer governances it runs inline and **projects** the judges it spawns. Confusing the two — trying to *inject* a role that requires an independent grader, or *project* a producer that should stay inline with the live grill — breaks the "producer ≠ judge" independence the gate depends on.

## Why keep the metaphor

It earns its place three ways: it gives each prompt a posture (a Battler presses, a Warden guards, a Scanner watches), it makes altitude confusion audible ("that's a Campaign question, not a Mission one"), and it travels — fleet command, sealed orders, and the shipyard are immediately legible to a newcomer in a way that "the outer cross-installation harness-improvement loop" is not.
