# autonomy-governance

Non-user-invocable SDD skill holding the **autonomy-risk rubric**: the per-decision `self-clear`-vs-`escalate` bar over five gradient dimensions (reversibility, blast radius, contract impact, decision novelty, confidence) plus a non-score **hard floor** (data egress / redaction, irreversible external publication).

The **risk-assessment** side of every escalation point. It **generalizes** the `sdd-gate-autonomy` leash (four binary dimensions, two gates) into a gradient rubric applicable to all escalation points, and **cooperates with** `gate-validation-governance` (legality) without duplicating it — legality answers "is this state well-formed?", this rubric answers "may the agent take this step without a human?".

Two consumers only — it is **not** loaded by every runtime actor:

- the **most capable conductor agent** (in SDD, the opus operator; the formation-loop Warden for structural acts) makes the per-decision verdict at runtime;
- the **eval tool / ACES** sets and verifies each agent config's escalation posture against the rubric at design time.

The contract is phrased portably — the conductor role is abstract, and **ACES (the agent-configuration domain) is the intended future home**. Ships as an SDD fallback governance, sibling to `architect-governance`, `director-governance`, and `gate-validation-governance`. Reference content only — no rationale prose; the spec at `artifacts/specs/autonomy-governance/` records why.
