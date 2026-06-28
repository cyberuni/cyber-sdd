# Harness spawning constraints

The depth of agent nesting a harness allows is a **hard portability limit** on SDD's spawn model.
Companion to `specialists-and-squads.md` (producers run inline, judges spawn cold) and `loops.md` (who runs the Mission Loop).

## The constraint

By default SDD's **conductor is the main (user) session** running the operator role — not a spawned agent (`specialists-and-squads.md`).
The conductor **spawns cold judges** (`sdd-spec-judge`, `sdd-implementer`) for grader independence, and **spawns a builder** for the impl-producer — both **at depth 1 from the main session** (main → judge / builder).
Depth 1 is the floor and the ceiling for the default path: every harness here supports a main session spawning subagents, so the default model **ports everywhere** and grader independence is **always** preserved (the judge is a real subagent the author cannot reach).

The depth-2 case (`caller → spawned operator → judge`) arises only in the **headless / fan-out fallback** below, where the operator runs as a spawned subagent and spawns its own judges. That requires a harness that allows a subagent to spawn another.

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

- **One level is the floor (the default).** main session = conductor → cold judge / spawned builder. Every harness supports this, so the default conductor-in-session model ports everywhere **and keeps grader independence** — the judge is spawned from the main session, never folded into the author's context.
- **Headless / fan-out fallback — spawned operator (depth 2).** When there is no live session to host the conductor — an unattended scheduler, or a multi-CR fan-out that spawns one operator per CR — the operator runs as a **spawned subagent** and spawns its own cold judges (`caller → operator → judge`). This needs a harness that allows a subagent to spawn another (Claude Code; Cursor shallowly). On a flat harness (Gemini, Amp, Codex-default) the spawned operator **cannot** spawn a cold judge, so either keep the conductor in the (headless) main session, or fold judging into the operator's context — which **forfeits grader independence** and must be recorded as such.
  - **Alternative — spawn a fresh session from outside.** Instead of nesting, a tool such as tmux can launch a new top-level session (a peer, not a subagent) that runs the conductor with its own depth-1 budget. This needs headless invocation (`-p`) and may require an API key, so it is an out-of-harness escape hatch, not the in-session path.
- **Don't design for depth > 2.** Deep chains (a spawned operator's plugin delegate spawning its own sub-delegates) only port to Claude Code; treat anything past two as Claude-Code-only.

Survey current as of mid-2026; depth/version figures come from changelogs and credible writeups. Copilot CLI nesting is genuinely **unknown**, not confirmed-flat.
