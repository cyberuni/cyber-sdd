# Changes — work decomposition & CR/task dependency tracking

## 2026-07-11 — initial research
- what: created the topic. Started as a two-tool comparison (beads vs Wayfinder) then broadened, on request, to the full landscape aimed at improving SDD's issue source + CR system and its parallelizability analyzer.
- why: research pairs with the blast-radius / CR-parallelizability spec-out ([[project_cr_parallelizability_analyzer]]).
- coverage: four streams — (1) beads + Wayfinder freshness refresh (both hit v1.1.0 this month); (2) agent task-decomposition tools (Task Master, Backlog.md, spec-kit, Kiro, OpenSpec, native TODO tools); (3) build-graph "affected" tooling (Nx, Turborepo, Bazel/Buck2, Pants, Rush); (4) PR/merge-queue batching + conflict-prediction research (Graphite, merge queues, Uber SubmitQueue, Crystal/Palantír/structured-merge/Accioly/Brun).
- conclusion material: yes — three-layer landscape, the proven disjointness primitive, the novel-but-hint-only soft/hard tier, and six concrete recommendations for SDD's CR system.
- confidence: high on taxonomy + primitives + research grounding; medium on some vendor internals (flagged).
