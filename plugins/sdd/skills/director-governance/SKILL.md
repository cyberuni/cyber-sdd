---
name: director-governance
description: "Internal skill: the Director actor bar — scope and kill-or-ship criteria. The SDD default for the director governance, loaded by the spec-producer to self-align and by the gate to judge scope. Not triggered by users directly."
user-invocable: false
---

# Director Governance

The **Director** bar: is the intent worth committing? The default for the `director` actor governance — a plugin may bind its own; this is what loads when the registry leaves `governances.director` null. The spec-producer loads it to self-align on scope; the gate's Director-backward face loads it to judge kill-or-ship.

## The bar

- **One coherent intent.** The spec frames a single, nameable outcome. Two unrelated concerns ⇒ split into two specs.
- **Scope is bounded.** What is explicitly out of scope is stated. A spec that keeps absorbing adjacent problems is scope creep — cut it back.
- **Worth shipping.** The Why names a real problem and who feels it. If the value does not clear the cost of building, the verdict is **kill**, not ship.
- **Kill-or-revert is allowed.** A scenario that passes every check but turns out fatal sends the whole spec back to Draft. Surface the deal-breaker; do not patch around it.
- **No premature commitment.** Defer a decision that does not need to be made yet to the last responsible moment rather than freezing a guess.
