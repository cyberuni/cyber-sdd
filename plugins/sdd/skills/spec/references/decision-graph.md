# Decision graph

Use it when the capability's behavior branches. It is the instrument for C6 to C8, and it lives in `graph.md` beside
`README.md` so an agent reading the spec loads it only when it needs the derivation.

## Shape

- A node is a decision the capability makes, or an outcome. An edge is a branch. Draw it as a Mermaid `flowchart`.
- Give each edge a stable ID (`E1`, `E2`, ...) and never reuse a retired one. Criteria cite edge IDs.
- It describes decisions the consumer can observe, not the code's control flow. Name no function or module.
- Each use case names the entry node it starts from. Several use cases may share a graph.

## Checks it makes possible

- **C6.** Every leaf is an outcome. Every outcome has a criterion. Every extension of a use case is a path in the
  graph. An extension with no path is a hole in the graph: fix it there.
- **C7.** A combination that must not occur is a guard node. If it is only in prose, the constraint is
  unenforceable.
- **C8.** An undecided question is a node marked `open`. A search for `open` finds every unresolved point.
- **C5.** Derive criteria from the graph's edges, not from the prose, so the list can reveal a missing branch.

## Other instruments

Use these in `graph.md` instead of a graph when they fit the behavior better:

- **Decision table**, when the behavior is a combination of conditions. Completeness is a grid you can count, and a
  forbidden combination is a marked row.
- **State list**, when the capability is stateful. The checks are unreachable states and missing transitions.

A capability with a single decision states it in a line and needs no file.
