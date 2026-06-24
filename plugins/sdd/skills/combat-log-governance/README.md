# combat-log-governance

Non-user-invocable SDD skill holding the **combat-log contract** — the durable, harness-agnostic record of a spec's mission that the doctrine-loop Scanner reads (alone, without transcripts) to draft strategy.

It defines the log's **two faces** — the frontmatter *current-state* face (`produced-by` + `approval`, authoritative, overwritten) and the append-only **`log`** ledger (immutable history) — and the three ledger entry shapes: the per-subagent **report** entry, the **correction-with-cause** entry (with its closed, extensible `cause` enum — the matchable field cross-mission recurrence detection depends on), and the **strategy** entry slot.

It also fixes **write ownership**: the operator appends report and correction entries (same boundary as `produced-by`); the doctrine-loop Scanner appends strategy entries; producers and judges never write the log.

Loaded via the harness (`Skill`) by `sdd-operator` (appends report/correction entries), `validate-spec` (checks log entries are well-formed and corrections are on-enum), and the doctrine-loop Scanner (reads the log; appends strategy). `sdd-provenance` owns the combat-log *contract* and references this skill as the schema owner — the schema is not duplicated in the spec.
