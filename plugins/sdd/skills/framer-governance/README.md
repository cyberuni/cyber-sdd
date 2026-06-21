# framer-governance

The SDD default for the **Framer** actor governance — the scope and kill-or-ship bar. Loaded by the spec-producer (to self-align on scope) and by the gate's Framer-backward face (to judge whether the intent is worth committing).

Resolved like a role: a plugin may bind its own Framer governance via the registry `governances.framer` value; when that is `null`, this default loads. Reference content only — no rationale prose (ADRs record why).
