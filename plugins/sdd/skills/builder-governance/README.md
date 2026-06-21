# builder-governance

The SDD default for the **Builder** actor governance — the testability and coverage bar. Loaded by the spec-producer and impl-producer (to self-align) and by the impl-judge (to verify the artifact against the frozen `.feature`).

Resolved like a role: a plugin may bind its own Builder governance via the registry `governances.builder` value (e.g. ACES binds its eval bar); when that is `null`, this default loads. Reference content only — no rationale prose.
