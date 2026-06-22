# spec-digest

Non-user-invocable SDD skill that produces a read-only digest of a single spec for gate review.

Given a spec folder, it reads `spec.md` and the sibling `.feature` and returns a fixed-section summary — What, Status, Scenarios (count + names), Key decisions, Open items. It writes nothing, advances no status, and renders no verdict.

## Use

Invoked by `validate-spec` at the spec gate (step 4) so the human ratifying the Draft → Approved transition sees what they are approving before deciding. Not triggered by users directly.

## Spec

`artifacts/specs/sdd/spec-digest/` — full spec, scenarios, plan, and tasks.
