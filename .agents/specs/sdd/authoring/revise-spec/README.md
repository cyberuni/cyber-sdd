---
spec-type: behavioral
---

# revise-spec — re-open a draft and dispatch the producer

The user-facing **entry skill** for an **existing** spec node: dispatch the explore producer chain
(`../../mission/`, the operator) to grill and tighten what is already written — **no scaffolding**.
It is the smaller twin of `../create-spec/`: the node exists, so there is nothing to lay down; the
work is to pressure-test the prose, bring the suite back into line, and leave the node at
`status: draft`, ready for the spec gate (`../validate-spec/`). It owns the **user channel** the
producer lacks and carries the **re-open precondition** — an approved/implemented node's `.feature`
is frozen and may not be revised without a ratified re-open.

`.feature` is **part of the behavior suite, never part of the CR** — revise-spec dispatches the
producer to rewrite scenarios; it does not receive them from the CR.

## Use Cases

**Subject** — the revise-spec entry skill: dispatching the producer over one **existing** node and
guarding the freeze re-open precondition.
**Non-goals** — it scaffolds nothing (that is `../create-spec/`); it does not grill the CR into
prose or scenarios itself (that is `../spec-producer/`); it renders no gate verdict and freezes or
unfreezes nothing (`../validate-spec/`); it writes no control frontmatter.

| Trigger | Inputs | Outcome |
|---|---|---|
| **guard the precondition** — a CR touches an existing node | the node's `status` + the re-open record | `draft` → proceed; `approved` / `implemented` → the `.feature` is **frozen**, proceed only under a **ratified re-open**, never editing a frozen file without it |
| **grill + dispatch (revise)** — the node is writable | the CR + the existing spec + suite | the user's revise intent is collected up front; the operator runs explore in **revise** mode (tighten, do not scaffold) under an iteration cap; `needs-input` waves batched; the cap is **never** silently auto-accepted |
| **route observations** — the producer bubbles a typed observation | an `architect` / `strategist` observation (e.g. the node now bundles several behaviors) | surfaced to the user; a split becomes a **new node** or a `../../corpus/` operation — **never** a marker grown into this node |
| **leave at draft** — explore converges | the producer's diff | the node sits at `status: draft`; revise-spec advances no status — the spec gate does |

Every scenario in [`revise-spec.feature`](./revise-spec.feature) maps to one of these four use
cases. The status enum, the freeze, and the re-open transition live in
`../../design/lifecycle-model.md`; write-ownership in `../../design/provenance-model.md`. This unit
is the *behavior* that enacts them.

## The re-open precondition

A node must be **writable** before revise-spec dispatches the producer:

- `status: draft` → proceed; the suite is not frozen.
- `status: approved` or `implemented` → the `.feature` is **frozen**. Re-opening is a freeze
  transition and a `status` write revise-spec does **not** own — confirm the re-open was ratified
  (the lightweight async re-open flag, `../../design/lifecycle-model.md`) before proceeding. Never
  edit a frozen `.feature` without the ratified re-open.

## Grill the user, then dispatch the operator

The operator has **no user channel**, so collect the revise intent here **before** the first
dispatch — what the change is and why, the parts of the spec it touches. Then drive the operator
under an **iteration cap** (default **3**; override if the user named one): dispatch with the node
path, the revise intent (signal **revise**, not scaffold), and any `USER_ANSWERS` from the previous
wave; on `complete` exit; on `needs-input` ask the **batched** questions and re-dispatch, counting
the iteration; on `blocked` or cap-hit-without-converging **do not auto-accept** — present the
failing scenarios / open items and let the user **accept as-is**, **keep grilling** (reset the
count), or **change direction**. The skill leaves the node at `status: draft`.
