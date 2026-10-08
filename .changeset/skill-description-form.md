---
"cyber-aced": patch
---

`define-skill` and `improve-skill` now agree on how a skill description is written: say what the skill does, then when it applies, with no fixed lead-in such as "Use this skill when", and stay within 1024 characters.

- The `skill-design` governance drops the rule that a description must contain "Use this skill when" or "When to use" and the 120-character cap.
- Both skills read `skill-design` and `agent-tool-output` from a copy committed in the skill (after a `.agents/governances/` override) instead of the stale `cyberplace@0.2.4` CLI.
- `define-skill`'s audit step runs `improve-skill`'s bundled validator in place of `cyberplace audit validate`, a command that never existed.
- `improve-skill`'s Q1 accepts a capability-first description with a "Use when" clause, warns on a fixed lead-in, and exempts "By name only".
