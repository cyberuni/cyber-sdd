# Skill Description Guidelines — Investigation Record

## Question

What is the optimal length and structure for the `description` field in a SKILL.md, and what checks should enforce it?

## Trigger

The `improve-skill` skill had Q5: `description ≤120 characters (MEDIUM)`. When researching optimal description length, this rule appeared to conflict with the agentskills.io spec and with practical guidance on trigger coverage. Investigation was opened to find the authoritative answer.

## Sources consulted

| Source | URL | Type |
|---|---|---|
| agentskills.io specification | https://agentskills.io/specification | Authoritative spec |
| Optimizing skill descriptions | https://agentskills.io/skill-creation/optimizing-descriptions | Official guidance |
| SKILL.md Pattern — Bibek Poudel | https://bibek-poudel.medium.com/the-skill-md-pattern-how-to-write-ai-agent-skills-that-actually-work-72a3169dd7ee | Community article |
| Claude Code skills best practices | https://gist.github.com/mellanon/50816550ecb5f3b239aa77eef7b8ed8d | Community article |

## Findings

**Hard limit:** The spec is unambiguous — 1024 characters max. No source endorses 120 as a limit.

**Trigger mechanism:** Progressive disclosure means only `name` + `description` are loaded at startup. The description is the sole trigger. This makes length secondary to trigger phrase coverage.

**Optimal structure:** The optimization guide recommends:
1. Capabilities (what it does, in concrete verb terms)
2. "Use when…" trigger condition
3. Implicit phrasing clause ("even if they don't mention X")

**Length:** "A few sentences to a short paragraph" = roughly 150–400 characters in practice. The 1024-char budget should be spent on trigger phrase coverage, not prose quality.

**Activation data:** Community sources report activation rate improvement from ~20% (vague description) → ~72% (specific description) → ~90% (description with trigger phrase examples).

## Conclusion

Update Q5 to enforce ≤1024 (spec hard limit, HIGH) and add Q5a to check for implicit trigger phrase coverage (MEDIUM). Apply the same fix to `improve-agent-definition` F4/F5/F9.

See `evidence.md` for sourced claims.
