# oracle-spec-governance

Internal SDD governance (`user-invocable: false`). The **Oracle** actor bar at the **spec gate** —
scope and kill-or-ship for the **capability**: one coherent intent (two concerns are two
capabilities — split them); bounded and stated scope; every scenario tests a decision the node
**owns**, so a co-owned seam property (activation/routing, a sibling's behavior, harness wiring) is
out of scope; strict — an invariant that always holds is not acceptance and does not enter the
suite, the one exception being a user `@pinned` scenario; worth shipping, or kill; kill-or-revert;
no premature commitment.

It judges the **capability**, read from its spec + suite — not the document's prose, which is
`spec-format-governance`.

One merged bar loaded by **both** faces — the **spec-producer** (self-align on scope) and the **cold
spec-judge** (grade kill-or-ship); `producer ≠ judge` holds at the agent level. Oracle has no impl
face, so it ships as the single `oracle-spec` bar. The SDD default for the `oracle` bar; a
plugin may bind its own per artifact-type. Not triggered by users directly.
