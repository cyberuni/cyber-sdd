# common-governances — cross-cutting governance bar specs

> Descriptive index (starting stub). Home for the SDD-default **cross-cutting** governance bar specs
> — the bars with no single capability owner (the actor bars + fixed-universal). Single-owner bars
> live in their capability (`../authoring/spec-format/`, `../plugin/plugin-contract/`); the
> rules/models live in `../design/`.

Two decisions are recorded in [`common-governances.solution.md`](./common-governances.solution.md):

- **Actor bars** — authoring granularity is per-`(actor, gate)`, faces merged (Model B), with worked
  evidence in `examples/acme-ui/` (Model A, per-role) and `examples/acme-ui-merged/` (Model B).
- **Non-actor governances** — the fixed-universal set (`lifecycle` / `ownership` / `combat-log` /
  `gate-validation`) is **one invariant skill each** (not face-split); single-owner `plugin-contract`
  lives in `../plugin/`; `autonomy` is descriptive + baked-in (no node, no skill).

Bars to be built here by the `sub-governances` sub-mission: the generic `oracle` / `builder` /
`architect` core, plus `lifecycle` / `ownership` / `combat-log` / `gate-validation`.
