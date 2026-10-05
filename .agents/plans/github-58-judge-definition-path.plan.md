---
status: active
todos:
  - content: "explore: specify how the conductor locates SDD's own judge definitions (mission/conductor)"
    status: completed
  - content: "spec gate: cold sdd-spec-judge to convergence, keep conductor.feature @frozen (additive)"
    status: completed
  - content: "deliver: state the definition-path rule in start-mission and the sdd-automaton agent"
    status: completed
  - content: "impl gate: cold sdd-impl-judge, pnpm verify green"
    status: completed
  - content: "handoff: commits, PR against main closing #58"
    status: completed
---

# CR github-58 — the conductor locates SDD's own judge definitions by path

Source: https://github.com/cyberuni/cyber-sdd/issues/58

## Intent

The dispatch capability's agent lookup searches only the project's own agent folder, so asking
it for `sdd-spec-judge` / `sdd-impl-judge` by name fails. Owner chose option 2 from the issue:
`start-mission` states how the conductor locates SDD's own judge definitions — relative to the SDD
plugin's own root (`agents/<name>.md`) — and hands the dispatch capability that file path. No change
to the dispatch capability itself. A scenario binds it.

## NEXT

Landed: conductor spec + scenarios (spec gate), start-mission and sdd-automaton prose (impl gate), PR closing #58. No resume action.
