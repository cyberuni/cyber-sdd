# SDD — Spec-Driven Development

Keep your project's **spec and behavior suite** alive next to the code, and let an agent
carry each change through one autonomous loop — from intent, to a frozen contract, to a
verified result — while you decide *what to build* and the agent decides *how far it may go
on its own*.

SDD ships as a plugin for your AI coding agent (Claude Code, Cursor, Codex). Install it,
say `use SDD`, and describe a change. The plugin grills your request into spec + suite
deltas, builds against them, and lands the result in your delivery shape.

## Why SDD

Most "spec-driven" setups treat the spec as a throwaway design doc that rots after the
first commit. SDD treats the spec and its behavior suite as **durable, maintained layers**
of your project — abstractions of the code that humans actually read to know what the
project *is* and does.

- **One project, one spec.** No fleet of per-feature specs to re-approve on every
  cross-cutting change. Size is handled by organizing into folders, never by splitting into
  sibling specs.
- **The agent stays on a leash you set.** Every change passes an autonomy rubric that
  self-clears the safe, routine work and escalates only what genuinely needs you. You aren't
  a checkpoint on every transition.
- **Nothing slips past the contract.** Behavior is pinned to checkable `.feature`
  scenarios. At the spec gate they **freeze**; the implementation is verified against the
  frozen suite before it can ship.

## The mental model

SDD maintains four layers, each an abstraction of the one below. Every layer stays real and
maintained — a drifted spec is a defect, the same as a bug in code.

```
change-request (CR)   ← the intent you grill into spec + suite deltas
  spec + behavior suite  ← what the project is and does; what humans read
    code                   ← what engineers, security, and agents analyze
      outcome                ← what actually happens
```

Change enters at the **top** as a change-request and flows **down**: a CR names a delta to
the spec + suite, authoring realizes it there, the mission drives it into code, and the
outcome follows. You never edit the outcome directly — you edit the abstraction that
produces it.

## How a change moves through SDD — the Mission Loop

One cycle carries one change-request to completion, on one working tree:

1. **intake** — a change enters from a prompt, GitHub, Asana, Jira, Linear, or a local
   store. Nothing enters the system except as a CR.
2. **explore** — *build to learn.* The agent grills your CR into a concrete spec + suite
   diff, spikes to discover what the contract needs, and shows you intermediate results to
   steer it. This phase ends at the **spec gate**, where the touched `.feature` files
   **freeze**.
3. **deliver** — *build to keep.* The agent builds against the frozen suite, then a cold
   judge verifies the implementation against it at the **impl gate**.
4. **handoff** — land the verified result in the shape your project declares: commits to
   `main`, a branch + PR, or written prose.

After a cycle completes, four **outer loops** may fire and emit *new* change-requests —
nothing re-enters in place:

- **campaign** — what the project should *be*: grow and prune capabilities.
- **formation** — is the corpus organized right: audit node-shape, align, reconcile.
- **doctrine** — how we work: distill strategy from the trail, retire stale plans.
- **forge** — improve SDD itself from opt-in field corrections.

## Autonomy you control — gates and the leash

There is **no mandatory approval station**. Every write to the spec or suite passes one
arbiter: a self-clear-vs-escalate rubric. Routine, additive, low-blast work self-clears
(provisionally, recorded for you to ratify later); the rest escalates to you.

You set how far the agent may run with a **leash**:

| Leash | The agent self-asserts | It stops at |
|---|---|---|
| `auto-none` | nothing | the spec gate |
| `auto-spec` | the spec gate | the impl gate |
| `auto-all`  | both gates | nothing |

A self-cleared verdict is always **provisional** — it lands in a review queue for you to
ratify, never stealing accountability. Leaning autonomous is safe because everything SDD
writes is git-reversible.

The only hard stops that always require you are the **four C's**: **Clearance** (a change
that narrows or deletes an existing guarantee), **Conflict resolution** (the suite
contradicts itself), **Compatibility** (a change-class above your authorized ceiling), and
**Consent** (opt-in data egress in the forge loop). The first, third, and fourth can be
pre-authorized up front so they never halt you mid-flight.

## Freeze — the contract baseline

When a `.feature` is approved at the spec gate, it **freezes** — it becomes the settled
contract the implementation must satisfy. Freezing is per file, not per project.

- **Adding** a scenario widens the contract and self-clears — it folds in without
  unfreezing.
- **Narrowing or rewriting** a scenario unfreezes its file and goes back through the spec
  gate (and trips the Clearance floor).
- `spec.md` prose stays aligned but is **never frozen** — you're free to reword and
  restructure it as long as it doesn't contradict a frozen scenario.

A request to change a frozen scenario is never edited in place; it re-enters as a new CR.

## Harness requirement — two-level spawning

SDD's automaton runs as a spawned agent that **itself spawns cold judges**, so the loop needs
a harness that supports subagent nesting **at least two levels deep** (session → automaton →
judge). SDD targets only harnesses that clear this bar: **Claude Code** (up to 5 levels) and
**Cursor** (two). **Codex** ships flat (one level) and must have `agents.max_depth` raised to
at least `2`; harnesses that forbid nesting outright (e.g. Gemini CLI, Amp) cannot run the
cold-judge model and are not supported. Deeper chains than two levels are not assumed — SDD is
designed to fit within a two-level budget.

## Getting started

1. **Install the plugin** through your agent's marketplace.
2. **Initialize the workspace** so mission plans have a home (`.agents/plans/`, tracked with
   your code; on Cursor it's symlinked to `.cursor/plans`).
3. **Invoke it.** Say `use SDD`, `use Spec-Driven Development`, or `$sdd`, then describe the
   change you want. The gateway classifies your request, routes it into a mission, and runs
   the loop — pausing only when the rubric escalates to you.

Your spec lives at `<repo>/.agents/specs/<project>/` (or `.agents/spec/` for a
single-project repo) — **outside** any distributable plugin directory, so it never ships to
your consumers.

## Your identity in the committed trail

SDD keeps a per-mission **combat log** (committed with your work) so the doctrine loop can
learn from a mission after it merges — even on another machine. Each entry is attributed by a
pseudonymous **handle**, never your email, and the committed log is **safe-to-publish by
construction** (no emails, paths, secrets, or raw token counts).

By default the handle falls back to your git commit author. If you'd rather not have your git
name in the committed trail (or shared upstream via the forge loop), set **`SDD_HANDLE`** to a
pseudonym:

```bash
export SDD_HANDLE=scanner-7
```

Leave it unset and SDD reads nothing from your git config — attribution simply comes from the
commit you already author.

## Extending SDD to new artifact types

SDD knows how to produce and judge specs for many kinds of artifacts — npm packages, agent
skills, agent definitions, React components, docs, and more. A **domain plugin** teaches it
a new one by filling five production-chain roles (spec-producer, solution-producer,
spec-judge, impl-producer, impl-judge) and registering itself into your project's
`.agents/universal-plugin.json`. Any role it leaves open falls back to a sensible SDD
default. Producers run inline with the conductor; judges always spawn cold, so a grader
never shares the author's context.

This repo ships example domain plugins — **ACES** (agent-configuration domains) and
**Quill** (documentation domains) — that plug into SDD this way.
