# builder-spec-governance

Internal SDD governance (`user-invocable: false`). The **Builder** actor bar at the **spec gate** —
is the **capability** fully and testably specified: every edge of its decision graph has a scenario,
every guard/negative edge is paired with a positive companion, and the scenario map is 1:1 (no orphan
scenario, no uncovered edge); every scenario asserts an observable boolean outcome, so behavior the
capability cannot expose cannot be specced; a graded (non-deterministic) capability still reaches a
per-scenario boolean via rubric + threshold over N runs, the rubric form staying out of the boolean
`.feature`.

It judges the **capability's contract**, read from its spec + suite — not the document's prose, which
is `spec-format-governance`.

One merged bar loaded by **both** faces — the **spec-producer** (it writes the testable suite)
and the **cold spec-judge** (it grades coverage); `producer ≠ judge` holds at the agent level.
Conformance of the implementation is the impl gate's `builder-impl` bar. The SDD default for the
`builder` spec bar; a plugin may bind its own per artifact-type. Not triggered by users directly.
