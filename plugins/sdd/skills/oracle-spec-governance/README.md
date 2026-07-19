# oracle-spec-governance

This is an internal SDD governance about scope and the kill-or-ship call at the spec gate.

Before a capability's spec is approved, someone has to ask the uncomfortable questions: is this one
thing or two things glued together? Is it worth building at all? Does every scenario in its suite
actually belong to it? This governance is that question list — the **Oracle** bar. It judges the
**capability itself**, read from its spec and suite together — not how the document is written,
which is a different bar (`spec-format-governance`).

## What it requires — the bar

| Check | What it demands |
| --- | --- |
| **One coherent intent** | The capability delivers a single nameable outcome. Two concerns are two capabilities — split them, each into its own node. Test: can you name the outcome without "and"? |
| **Bounded, stated scope** | What is out of scope is named. A capability that keeps absorbing adjacent problems is scope creep — cut it back. |
| **The node owns its decisions** | Every scenario tests a decision the node owns. A property co-owned across a seam — activation/routing, a sibling's behavior, harness wiring — is out of scope: relocate it to the node that owns it, or kill it. |
| **Strict — non-decisions are killed** | An invariant that always holds is not acceptance and does not enter the suite. The one exception is a user `@pinned` scenario, kept whatever strict prunes. |
| **Worth shipping, or kill** | The Why names a real problem and who feels it. If the value does not clear the cost of building, the verdict is kill. |
| **Kill-or-revert** | A capability that passes every check but proves fatal goes back to Draft — surface the deal-breaker. |
| **No premature commitment** | A decision that need not be made yet is deferred to the last responsible moment. |

## Usage

- **spec-producer:** self-aligns on scope against this bar before writing the spec
- **spec-judge:** grades kill-or-ship cold at the **spec-gate**

The same bar is loaded by both faces, but producer and judge stay separate agents. Oracle has no
impl-gate face, so this is the only Oracle bar. It is SDD's default for the `oracle` bar — a plugin
may bind its own per artifact-type, and this one loads only when the registry leaves `oracle`
unbound.

## Related governances

This bar owns whether the capability is the right thing to commit to. Its neighbors own everything
around that:

- **`spec-format-governance`** — how the `spec.md` document itself is structured and written; this
  bar deliberately does not read the prose.
- **`builder-spec-governance`** — the Builder bar at the same gate: testability and coverage of the
  `.feature`, not scope.
- **`architect-spec-governance`** — the Architect bar at the same gate: structural fit of the spec
  and solution, not whether it should exist.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
