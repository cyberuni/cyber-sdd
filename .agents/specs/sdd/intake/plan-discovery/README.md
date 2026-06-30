---
spec-type: behavioral
concept: intake
---

# plan-discovery — find resumable missions by their plan briefs

The **plan-discovery** procedure: locate the in-progress (resumable) missions in a repo by their
**plan briefs**. Intake scaffolds `.agents/plans/<cr-ref>.plan.md` when a CR is claimed (step 1) and
the doctrine loop's `plan-retirement` deletes it once the CR is **done/merged and distilled** — so
**every plan brief that still exists is, by definition, an unretired mission a session can resume**.
plan-discovery scans the fixed plans location, treats each `*.plan.md` carrying frontmatter as a
brief, and reports its **todo tally** and the lead line of its `## NEXT` resume anchor. The location
is a **fixed convention**, not a hardcoded registry: no array or index of paths is ever consulted —
discovery is a **pure derivation**, so no second place can drift. The concrete engine is the
[`discover-plans`](../../../../plugins/sdd-new/skills/discover-plans/) skill, which parses each
brief's frontmatter and NEXT section only and emits the list as TOON.

This is the **plan** sibling of [`../../corpus/discovery/`](../../corpus/discovery/README.md):
discovery finds **specs** by status shape at the three spec locations; plan-discovery finds
**missions** by their briefs at the one plans location.

## Use Cases

**Subject** — deriving the set of resumable missions in a repo (their plan briefs), and resolving a
CR ref to one of them.
**Non-goals** — it reads no runtime behavior, owns no lifecycle state, **never resumes** a mission
(that is `resume-mission`), **never retires** a brief (that is `plan-retirement`), and never writes.
It reads only the brief's frontmatter and its `## NEXT` section — never the rest of the body.

| Trigger | Inputs | Outcome |
|---|---|---|
| **list the plans** — a tool needs the resumable-mission set (the gateway, on entry) | a repo root | every `*.plan.md` under `.agents/plans` carrying frontmatter, keyed by CR ref, with its name, todo tally (total / completed / in-progress), and `## NEXT` lead, as TOON |
| **resolve a ref** — a request names one mission to resume | the discovered list + a CR ref | the plan whose filename slug matches |

Every scenario in [`plan-discovery.feature`](./plan-discovery.feature) maps to one of these two
entry points.

## How a plan brief is recognized

Recognition is **location-bounded and shape-confirmed** — both must hold:

- **Location** — the file sits directly under the repo's **`.agents/plans/`** directory (the one
  plans location `../README.md` scaffolds into; `intake/` owns the plan files).
- **Shape** — the filename ends `.plan.md` **and** the file carries a frontmatter block (the basic
  plan template intake scaffolds: `name` + a `todos` list + a `## NEXT` anchor). A `*.plan.md` with
  no frontmatter is a stray and is skipped; a sibling that does not end `.plan.md` (a combat-log
  `*.log.jsonl`, a loose `*.md`) is never a brief.

**Present means resumable.** plan-discovery applies **no status filter** of its own — a present
brief is already unretired (retirement is a deletion, not a flag), so the scan lists every brief it
finds, all-completed or not, and leaves ranking to the caller. The todo tally it reports lets the
caller distinguish a barely-started mission from one near handoff.

The ref match is against the **filename slug** (the `<cr-ref>` before `.plan.md`). The plan-brief
schema and the plans-location convention are owned by [`../README.md`](../README.md) and
[`../../design/provenance-model.md`](../../design/); plan-discovery defers to them rather than
restate them.

## Delivery

This unit is implemented by the **`discover-plans`** skill —
`plugins/sdd-new/skills/discover-plans/` — a non-user-invocable skill carrying a self-contained
`.mts` script (the repo's node-≥23.6 / no-deps convention; an agent fallback when `node` is absent).
The script realizes the **list-the-plans** entry point (scan `.agents/plans`, keep each `*.plan.md`
with frontmatter, tally its todos, read its `## NEXT` lead, emit TOON); **resolve-a-ref** is the
caller's step over that list. The node and its engine carry different names (capability vs mechanism)
— this `## Delivery` link is the spec→impl pointer, as `../../gateway/` names the `sdd` skill and
`../../corpus/discovery/` names `discover-specs`.

## Source

- new — no prior `plugins/sdd/` impl. First implemented under `plugins/sdd-new/` in the
  `discover-plans` CR, which also added the gateway's **surface-in-progress-plans** entry point
  (the resumable-mission sibling of the existing surface-pending-strategy behavior).
