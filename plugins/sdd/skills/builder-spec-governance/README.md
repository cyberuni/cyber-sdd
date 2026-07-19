# builder-spec-governance

This is an internal SDD governance about the Builder's bar at the **spec gate**.

It answers one question: is this **capability** fully and testably specified? In SDD, a capability's
contract is written down twice — as a `spec.md` (the decisions it makes, drawn as a decision graph)
and as a `.feature` suite (one test scenario per branch of that graph). This bar judges whether that
contract is complete and checkable *before* anyone builds against it. It judges the contract itself,
read from the spec plus its suite — not how the document is written, which is a different bar
(`spec-format-governance`).

It is one half of a matched pair: this bar asks "is the contract testable and covered?" at the spec
gate; its sibling **`builder-impl-governance`** asks "does the implementation meet that frozen
contract?" at the impl gate.

## What it requires

| Requirement | What it means |
| --- | --- |
| **Every branch is covered** | Each edge of the capability's decision graph has its scenario, and every guard/negative edge is paired with a positive companion. The scenario map is 1:1 in both directions — no orphan scenario, no uncovered edge. |
| **Every scenario is testable** | Each scenario asserts an observable outcome a check can confirm — a boolean, no "sometimes". A behavior the capability cannot expose cannot be specced. |
| **A graded subject is still a boolean** | A non-deterministic capability (one whose output varies run to run) still reaches a per-scenario boolean, through a rubric plus a threshold over N runs. The rubric form stays out of the boolean `.feature`, carried as a judge-only `@rubric` scenario. |

This is the SDD default for the `builder` spec bar; a plugin may bind its own per artifact-type, and
this one loads when the registry leaves `builder`/`spec` unbound.

## Usage

One merged bar loaded by both faces at the **spec gate**:

- **spec-producer:** self-aligns to it while writing the testable suite
- **cold spec-judge:** grades coverage and testability against it

`producer ≠ judge` holds at the agent level — the same bar, two independent readers.

## Related governances

This bar owns the testability and coverage of the capability's contract. Its neighbors own
everything around that:

- **`builder-impl-governance`** — the other half of the pair: whether the *implementation* meets the
  frozen contract, judged at the impl gate. This bar freezes what must hold; that one verifies it held.
- **`spec-format-governance`** — the document's prose and section layout. That bar reads the
  `spec.md` as a document; this bar reads the spec + suite as a contract.
- **`suite-format-governance`** — how the `.feature` suite itself is written, including the 1:1
  scenario-map rule this bar enforces coverage against.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
