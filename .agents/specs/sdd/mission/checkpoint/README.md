---
spec-type: behavioral
concept: provenance
---

# mission/checkpoint/ — checkpoint a mission into its plan brief

The **checkpoint** behavior: write this session's live state back into the mission's **plan brief**
(`.agents/plans/<cr-ref>.plan.md`) so **any** later session can pick the mission up by reading it —
update each touched todo's `status`, rewrite the `## NEXT` resume anchor, and commit. It captures
*enough to continue, nothing to relitigate*. `checkpoint` is a verb like the other mission phases;
the plan brief is the noun it produces. It is enacted by the **`pause-mission`** skill (the plan
stands on its own — `resume-mission` is one convenient reader).

This node also owns the **approve-on-checkpoint** act: clearing a mission for headless dispatch by
setting the brief's top-level **`status: approved`**. Approval is a **human review act** — a person
reviews the brief (todos, `## NEXT`, the run-level leash) and clears it — recorded onto the brief as
it is checkpointed (`pause-mission --approve`). The flag it writes is the go-signal the gateway's
`../../gateway/dispatch/` loop selects on; the enum + the three-way `status` distinction are owned by
`../../design/provenance-model.md`.

> **This is a single behavioral unit, not an overview** — checkpoint has no sub-skills; the behavior
> is enacted by the `pause-mission` skill (`plugins/sdd-new/skills/pause-mission/`). This spec owns
> the **behavior + suite** ([`checkpoint.feature`](./checkpoint.feature)). (`resume-mission`, the
> read-back sibling, is not yet noded — a standing formation observation, not this unit.)

## Use Cases

**Subject** — checkpointing a mission into its plan brief so a later session resumes it, and clearing
a reviewed mission for headless dispatch by setting `status: approved`.

**Non-goals** — it **never** dispatches, resumes, or retires a mission (those are
`../../gateway/dispatch/`, `resume-mission`, and `plan-retirement`); it writes **only** the plan
brief — never `spec.md`'s `status` / `approval` (the gates own those). A **headless** automaton
checkpoint **never self-approves** — `approved` is a human clearing act (the positional-authority
rule, `../../common-governances/lifecycle/`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **checkpoint the mission** — pause / wrap up mid-mission | the live session state + the brief (scaffolded if absent) | each touched todo's `status` updated, the `## NEXT` anchor rewritten, the brief committed — the mission is resumable |
| **approve on checkpoint** — a human clears a reviewed mission for headless dispatch (`--approve`) | the checkpoint + a human approve intent | the brief's top-level `status` is set to `approved`; a plain checkpoint leaves `status` unchanged |

Every scenario in [`checkpoint.feature`](./checkpoint.feature) maps to one of these two entry points.

## Checkpoint writes only the brief

The checkpoint writes the plan brief and nothing else in the contract: it updates the `todos` block
(true statuses; the one in-flight todo left `in_progress` with a note, never marked `completed`
unless truly done), rewrites `## NEXT` (action first), and commits (`docs:`) so the pause is durable.
It touches **no** `spec.md` frontmatter — the mission's `status` / `approval` lifecycle is the gates',
not the checkpoint's.

## Approve on checkpoint

`--approve` sets the brief's **top-level `status: approved`** as part of the checkpoint — the human
has reviewed the mission and cleared it for the gateway's headless dispatch queue. Rules:

- **Human act only.** Only an in-session human clearing sets `approved`; a headless automaton
  checkpoint records progress but **never self-approves** (it holds no user channel — the same
  positional-authority rule that reserves a human-ratified gate verdict to the in-session position).
- **Idempotent.** Approving an already-`approved` brief leaves it `approved`.
- **Plain checkpoint does not approve.** A checkpoint without the approve intent leaves `status`
  untouched (an unset `status` stays unset, i.e. `active`).
- **Brief-only, flag-only.** It writes the one frontmatter field; it does not dispatch the mission
  (that is `../../gateway/dispatch/`) and does not touch the run-level leash (approval says *run it*;
  the leash says *how far* — `../../design/provenance-model.md`).

## Delivery

Enacted by the **`pause-mission`** skill — `plugins/sdd-new/skills/pause-mission/` — which locates
(or scaffolds) the brief, updates the todos + `## NEXT`, and commits; the `--approve` argument adds
the single `status: approved` write. `resume-mission` reads the brief back; the gateway's `dispatch`
loop selects on the `approved` flag this node sets.

## Scenarios (colocated)

The behavior suite is [`checkpoint.feature`](./checkpoint.feature). Cross-capability outcomes that run
a mission through checkpoint → dispatch end-to-end live in `../../acceptance/`.
