---
"cyber-sdd": minor
---

Make the backfill workflow enforceable, and correlate the governance pre-flight with behavior.

The backfill procedure was already correctly specified across `spec-format-governance` and
`suite-format-governance`, but nothing in the workflow made the specified steps happen: declaring a
governance is free, reading it is not, and no check connected the two.

- **New `backfill-workflow` skill** — the five ordered steps that derive a spec and suite from
  shipped behavior, each owing a named entry in one `BACKFILL_STEPS` record, so a skipped step is
  visible instead of looking like a step that found nothing. It also owns the remediation unit for a
  derived node: re-enter at the earliest implicated step and re-run everything downstream, never a
  patch of the cited lines and never a re-run from the top.
- **`sdd-spec-judge` gains a corroboration stage.** The pre-flight now has two stages: the existing
  declaration check, then a stage that reads the artifact instead of the claim. Four tells, scoped to
  what the change request *added*, with the step-record tell gated on the mode the conductor relays
  rather than on what the producer declares — so it cannot be opted out of by the party it polices. A
  miss returns `governance-preflight-uncorroborated` and advances nothing.
- **`resume-mission` re-establishes the bars.** A resumed session now re-resolves and loads its
  governances from disk each segment and declares them. A summary of a bar in the plan brief is a
  decision record, never the bar; where a loaded bar contradicts a resolved decision, the bar wins.
- **`start-mission` relays `producer_mode` and `producer_backfill_steps`** on the existing dispatch
  channel, forwarding an incomplete record verbatim rather than judging it.
- `spec-format-governance`, `suite-format-governance` and `remediation-governance` now reference the
  workflow rather than carrying the procedure.

The limits are stated in the docs rather than assumed away: tell coverage is two bars of the expected
set, a producer that writes no surface trace at all is exempt from that tell, and nothing yet owns how
the conductor decides which mode to invoke.
