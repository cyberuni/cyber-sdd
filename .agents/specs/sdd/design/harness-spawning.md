# Harness spawning constraints

The depth of agent nesting a harness allows is a **hard portability limit** on SDD's spawn model.
Companion to `specialists-and-squads.md` (producers run inline, judges spawn cold) and `loops.md` (who runs the Mission Loop).

## The constraint

SDD's operator (`sdd:sdd-operator`) is **itself a spawned agent** — `create-spec` / `validate-spec` spawn it by name.
The operator then **spawns cold judges** (`sdd-spec-judge`, `sdd-implementer`) for grader independence (`specialists-and-squads.md`).
That is a subagent spawning a subagent: the spawn tree is already **≥ 2 levels** deep (caller → operator → judge) before any plugin delegate or model-tuned producer agent — each also spawned — adds a level.

So SDD cannot assume a flat one-level harness. On a harness that forbids nesting, a spawned operator **cannot spawn its judges**, and the cold-grader rule breaks.

## What each harness allows

**Depth** counts levels of subagents below the main session. Every harness here supports **at least depth 1** — the main session can spawn subagents. The question is whether a *subagent* can spawn another (depth ≥ 2); "depth 1" means it cannot, **not** that subagents are unavailable.

| Harness | Subagent → subagent? | Depth | Default |
|---|---|---|---|
| **Claude Code** | yes | up to 5 | on (named subagents, since ~v2.1.172) |
| **Cursor** | shallow | ~2 (main + direct subagents spawn; grandchild can't) | on (since 2.5) |
| **Codex CLI** | opt-in | `agents.max_depth`, default `1` | flat unless raised |
| **GitHub Copilot CLI** | undocumented | unknown | has `/delegate`, `/fleet`; recursion is an open feature request |
| **Gemini CLI** | no — explicitly banned | 1 (main spawns workers; workers can't) | flat by design (loop/token guard) |
| **Amp (Sourcegraph)** | no — flat by design | 1 (main spawns workers; workers can't) | flat by design |

Notes: Claude Code's separate **fork** (Agent tool with `subagent_type` omitted) inherits the full parent conversation, runs in the background to a single result, and is held to **one level** by a Recursive Fork Guard — it cannot spawn further. Named subagents are the path to depth.

## Consequence for SDD

- **Two levels is the floor.** caller → operator → cold judge. Any SDD plugin or multi-harness target must support at least this, or the spawn model degrades.
- **Flat-harness fallback (Gemini, Amp, Codex-default):** the operator cannot spawn a cold judge. Either the *caller* runs the operator role inline (collapsing caller→operator) and spawns judges itself, or judging folds into the operator's own context — which **forfeits grader independence** and must be recorded as such.
- **Don't design for depth > 2 by default.** Deep chains (plugin delegate spawning its own sub-delegates) only port to Claude Code; treat anything past two as Claude-Code-only.

Survey current as of mid-2026; depth/version figures come from changelogs and credible writeups. Copilot CLI nesting is genuinely **unknown**, not confirmed-flat.
