---
status: active
todos:
  - content: "explore: scope the depth cap to capability nodes, give design/ a versioned shape (design doc, governance node, formation)"
    status: completed
  - content: "spec gate: cold sdd-spec-judge to convergence; formation.feature stays @frozen (additive)"
    status: completed
  - content: "deliver: spec-structure-governance, formation-loop, sdd-warden, architect bars; confirm check-spec-structure unchanged"
    status: completed
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green"
    status: completed
  - content: "handoff: commits, PR against main closing #127"
    status: completed
---

# CR github-127 — scope the two-level rule to capability nodes; give design/ a versioned shape

Source: https://github.com/cyberuni/cyber-sdd/issues/127

## Intent

The two-level rule applies to every folder, so a project carrying the shipped design and the next
design at once has no legal home for the second. Scope the rule to capability nodes. `design/`
gets its own shape: current design at the top, one file per perspective, an optional
project-named version folder holding a full copy of the next design, a one-commit cut, and a
checkable cut trigger recorded in the placement map. A fourth exempt top-level folder is rejected.

## NEXT

Landed: design/ shape and capability-scoped depth cap (spec gate), governance, Warden, formation loop and architect bars (impl gate), PR closing #127. Two backlog follow-ups in the ledger shard. No resume action.
