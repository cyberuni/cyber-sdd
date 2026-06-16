# Skill Description Guidelines — Conclusion

**Status:** Confirmed. Based on agentskills.io specification and optimization guide.

## Decision

| Rule | Value | Rationale |
|---|---|---|
| Hard limit | ≤1024 characters | Spec requirement; exceeding it is invalid |
| Optimal range | 150–400 characters | Enough for capability + trigger condition + implicit phrases without bloating startup context |
| Too short | <50 characters | Almost always lacks trigger coverage |
| Pattern | capabilities + "Use when…" + "even if they don't mention X" | Covers explicit and implicit invocations |

## Check mappings

- `improve-skill` Q5: enforces ≤1024 hard limit (HIGH)
- `improve-skill` Q5a: warns when implicit trigger phrases are absent (MEDIUM)
- `improve-agent-definition` F4: same as Q5 for agent definitions
- `improve-agent-definition` F9: same as Q5a for agent definitions

## Key insight

The description is the only part of a skill loaded at startup. It carries the entire burden of triggering. An under-specified description means the skill won't trigger when it should; an over-broad one triggers when it shouldn't. Adding natural-language trigger phrases (including implicit ones) improves activation rate significantly — the optimization guide reports improvement from ~20% to ~90% when done well.

## Prior false rule

The previous check (`Q5: ≤120 characters`) was wrong. It conflicted with the 1024-char spec limit and penalized well-formed descriptions with trigger phrase coverage.
