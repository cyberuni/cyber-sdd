# oracle-governance

The SDD default for the **Oracle** actor governance — the scope and kill-or-ship bar. Loaded by the spec-producer (to self-align on scope) and by the gate's Oracle-backward face (to judge whether the intent is worth committing).

Resolved like a role: a plugin may bind its own Oracle governance via the registry `governances.oracle` value; when that is `null`, this default loads. Reference content only — no rationale prose (ADRs record why).
