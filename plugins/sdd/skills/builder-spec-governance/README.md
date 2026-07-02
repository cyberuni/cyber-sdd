# builder-spec-governance

Internal SDD governance (`user-invocable: false`). The **Builder** actor bar at the **spec gate** —
testability and coverage of the `.feature`: every behavior testable (boolean), complete happy-path +
error coverage, graded subjects reduced to a boolean via rubric + threshold.

One merged bar loaded by **both** faces — the **spec-producer** (it writes the testable `.feature`)
and the **cold spec-judge** (it grades coverage); `producer ≠ judge` holds at the agent level.
Conformance of the implementation is the impl gate's `builder-impl` bar. The SDD default for the
`builder` spec bar; a plugin may bind its own per artifact-type. Not triggered by users directly.
