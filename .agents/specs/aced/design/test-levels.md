# test-levels — where agent-config behavior is surfaced

The companion to the SDD suite-design doctrine (`../../sdd/authoring/suite-format/README.md`,
ADR-0028). That doctrine splits deterministic code into two levels: the `.feature` carries
**acceptance / boundary** scenarios, and inner-rule **combinatorics move down to unit tests** owned
by the impl-producer. Agent config **breaks that move**, and needs its own answer.

## The asymmetry — no deterministic inner layer

Agent config has **no deterministic inner layer to push combinatorics down to.** There is no
reference-form parser module to unit-test — the behavior *is* an LLM following instructions. So an
ACED suite cannot offload the way deterministic code can. Its two options:

- **(a) surface more concrete scenarios** at the suite level, or
- **(b) keep scenarios at the boundary level** and let **`@rubric`** absorb the graded /
  non-deterministic space — non-determinism is exactly what `@rubric` exists for.

The standing lean is **(b)**, recorded as an open hypothesis in `decisions/0002-boundary-vs-surface-more.md`
— to be settled by a future ACED mission against real corpus evidence, not decided here.

## The boolean-smuggling tell

Option (b) has a failure mode, and it is **measurable**: if ACED rubrics begin **restating
booleans** — dimensions that re-grade a property a boolean scenario in the same suite already decides
— the boundary was set **too high**, and some of what was pushed into the rubric wanted a concrete
scenario after all. A rubric that smuggles booleans has stopped being a genuine gradient.

This is both a **tell** for the hypothesis and a **Selection defect** in its own right: an untradeable
boolean (a rule) admitted into a compensatory sum. The `scenario-writer` must keep such a criterion
**out** of the rubric (author it as the boolean only), and the `spec-validator` **flags** it — by the
**same-object** test (a boolean scenario in the same suite already decides this property), never a
same-criterion twin-scan between two dimensions (`decisions/0002-boundary-vs-surface-more.md` records
the reconciliation with SDD issue #280).

## The `@trigger` activation Outline is the uniform exception

ADR-0028 demotes `Scenario Outline` to a **rare exception** — default to specific scenarios (DAMP
over DRY), reserve the Outline for a genuinely **uniform** enumerated set. ACED's `@trigger`
activation corpus **earns** that exception: it is one varying token (`<query>`) and the **same
`Then`** for every row (`invocation is "<should_trigger>"`). A trigger case that wants a different
`Then` — an extra `Given`, a distinct assertion — is not uniform and is split back out into its own
scenario, per the ADR-0028 tell.
