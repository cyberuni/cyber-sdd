---
spec-type: behavioral
concept: corpus-structure
---

# split-spec — propose decomposing an oversized spec

The **split-spec** procedure: read one oversized target spec, group its design decisions and
`.feature` scenarios into cohesive **independent concerns**, and **propose a split plan** with scope
for each child. Like `dedupe-specs`, it owns the **analysis only** — it never scaffolds children,
rewrites, or retires the parent (authoring and retirement stay elsewhere), never writes
`status`/`approval`/freeze, and requires **explicit approval** before any structural change. The act
of executing a confirmed split belongs to [`../../formation/`](../../formation/README.md).

## Use Cases

**Subject** — grouping one spec's decisions + scenarios into independent concerns and proposing a
split.
**Non-goals** — it executes no split, authors no child node, and never handles "just delete the
parts about X" — that is a **revise** or **deprecate**, not a split. It targets the cross-project
tier; moving folders inside one project spec is plain editing.

| Trigger | Inputs | Outcome |
|---|---|---|
| **split an oversized spec** — one spec has grown to hold several concerns | one target spec folder | a **split plan**: the cohesive child concerns, the scope each child owns, where every decision and scenario lands, and any shared vocabulary lifted to a governance |

Every scenario in [`split-spec.feature`](./split-spec.feature) maps to this entry point or to the
write-free / freeze boundary that closes this spec.

## How the split is proposed

- Each design decision and each `.feature` scenario belongs to **exactly one child** — no
  duplication across children.
- **Shared vocabulary becomes a governance**, referenced by the children, never copied into each.
- The plan states each child's **scope** so the boundaries are reviewable.

## The write-free boundary

- The tool **writes nothing** and creates no child; it emits a plan and stops.
- A structural change requires **explicit approval** first.
- A **frozen** target (`approved`/`implemented`) routes through the **draft re-open** path before
  any scenario is moved into a child.
