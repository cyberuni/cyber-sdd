# aced-architect-impl

The ACED **Architect bar at the impl gate** — whether an agent-configuration artifact is well-formed *as configuration a model loads and executes*. It fills the `architect-impl` governance slot in ACED's squad entry in `.agents/universal-plugin.json`, and **unions onto** `sdd:architect-impl-governance` (the generic structural-fit bar still applies; this adds the agent-config-specific criteria).

Loaded by name, never triggered by users. Two faces read it: the ACED impl-producer reads it forward to self-align while writing, and `aced-impl-judge` reads it backward to grade.

It closes a gap in the production chain. `aced-builder-impl` asks whether the artifact passes its frozen `.feature`; nothing previously asked whether the artifact was usable configuration, so a skill could clear ACED's impl gate while violating every principle in the shipped `skill-design` governance. The criteria here are the gradeable ones: an agent-first body with no mid-workflow links to repository files, no rationale prose, decisions rather than restated best practice, one workflow per artifact with its selection mechanism declared in the `description`, selection kept distinct from the `user-invocable` visibility flag, and no baked-in stack assumptions.

It carries the criteria, not the whole contract. Full depth stays in `cyberplace governance show skill-design` — the repo's sanctioned mechanism for on-demand depth — so there is one source of truth and no 225-line duplicate to drift. That contract is skill-specific; for `subagent`, `command`, and `agents-section` this bar is the entire agent-config shape bar, since no separate shipped contract covers them.
