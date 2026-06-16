# Evidence Log

## C1 — Hard limit is 1024 characters

**Claim:** The `description` field has a hard maximum of 1024 characters per the agentskills.io specification.
**Confidence:** HIGH
**Source:** https://agentskills.io/specification — `description` field table, constraint column
**Quote:** "Max 1024 characters. Non-empty. Describes what the skill does and when to use it."

---

## C2 — Optimal range is 150–400 characters

**Claim:** A "few sentences to a short paragraph" is the recommended length — enough for capability + trigger condition + implicit phrases without bloating startup context across many skills.
**Confidence:** MEDIUM (editorial guidance, not a hard spec rule)
**Source:** https://agentskills.io/skill-creation/optimizing-descriptions
**Quote:** "A few sentences to a short paragraph is usually right — long enough to cover the skill's scope, short enough that it doesn't bloat the agent's context across many skills."

---

## C3 — Description is the sole trigger mechanism

**Claim:** At startup, agents load only `name` and `description` for all skills. The description carries the entire burden of triggering.
**Confidence:** HIGH
**Source:** https://agentskills.io/specification — Progressive disclosure section
**Quote:** "Metadata (~100 tokens): The `name` and `description` fields are loaded at startup for all skills"

---

## C4 — Implicit trigger phrases improve activation rate

**Claim:** Including natural-language examples of how users phrase requests — including cases where they don't name the domain — significantly improves activation rate.
**Confidence:** HIGH
**Source:** https://agentskills.io/skill-creation/optimizing-descriptions
**Quote:** "Err on the side of being pushy. Explicitly list contexts where the skill applies, including cases where the user doesn't name the domain directly: 'even if they don't explicitly mention CSV or analysis.'"

Supporting source: https://gist.github.com/mellanon/50816550ecb5f3b239aa77eef7b8ed8d
**Quote:** "Adding examples improves [activation] further from 72% to 90%."

---

## C5 — Recommended description pattern

**Claim:** The canonical pattern is: capabilities + "Use when…" + "even if they don't mention X."
**Confidence:** HIGH
**Source:** https://agentskills.io/skill-creation/optimizing-descriptions — "Before and after" example
**Quote:** "Use imperative phrasing. Frame the description as an instruction to the agent: 'Use this skill when…' rather than 'This skill does…'"

---

## C6 — 120-character limit was wrong

**Claim:** The prior Q5 check (`≤120 characters`) conflicted with the spec and penalized correct descriptions.
**Confidence:** HIGH
**Source:** C1 (spec hard limit is 1024, not 120); C2 (optimal range starts at 150)
**Note:** No published source endorses a 120-character cap. The prior rule was likely cargo-culted from an older convention.
