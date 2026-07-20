---
spec-type: behavioral
concept: [config-authoring]
---

# define-governance — author a governance

Scaffold a reference-only governance (rubric / constraint-set / checklist / decision-table).

## Use Cases

**Subject** — authoring or improving a reference-only governance file (rubric, constraint set,
checklist, decision table, or mixed) that other skills and agents load on demand, scaffolding its
canonical file and runtime symlinks while enforcing the non-auto-trigger contract.
**Non-goals** — authoring a workflow agent definition that the user triggers (`define-agent`); scoring
a config against its golden set (`run`); adding or fixing eval cases (`add-scenario` / `improve`); the
governance-quality rubric itself (that is the quality-check governance the skill loads).
**Fit:** strong — the skill carries a genuine activation decision (governance vs. `define-agent` / `run` /
`add-scenario`, all sharing the same config vocabulary) and its drafting behavior is judged, not asserted.

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on a governance request | a request to create/improve a reference-only rule or criteria file, vs. a sibling intent (a workflow agent definition, or an eval-run scoring / case-authoring request) carrying the same config vocabulary | `define-governance` fires for a governance request and defers when the intent belongs to `define-agent` / `run` / `add-scenario` |
| Distinguish governance from a workflow skill | content that describes what to enforce (criteria/rules) vs. how to do something (steps) | the content is treated as a governance when it encodes criteria and is redirected to a workflow skill when it encodes action steps |
| Resolve placement and runtimes | scope (user-global / project / plugin) and target runtimes are unclear from context | an unsettled scope is asked about before any path is derived, then the canonical path is derived and one symlink is created per selected runtime |
| Select the content type | the user names the primary shape: rubric, constraint set, checklist, decision table, or mixed | the drafted body's section structure matches the chosen content type |
| Gather the requirements | a request that leaves some of the five requirements (name, topic, consumers, content type, rules) unstated | the unsupplied requirements are asked for, and no file is drafted until the name, content type, and rules the template depends on are gathered |
| Scaffold the governance file | a gathered name, topic, consumers, and the rules or criteria | a canonical file is written with the required frontmatter and a body opening with the scope line |
| Normalize the governance name | the user names the governance in prose rather than as a slug | the `name` is normalized to a kebab-case slug and the file stem is the same slug |
| Keep each rule falsifiable on its own | a supplied rule carries more than one clause, whether or not the word "and" appears | the rule splits when each clause states its own demand — one still checkable when the other clause fails — and stays one rule when a clause only qualifies another, constraining how that clause is satisfied and leaving nothing to check once it fails |
| Enforce the non-auto-trigger contract | a governance is a partial skill (loaded by name, never auto-triggered) | the file's description carries the `Partial Skill:` prefix and `user-invocable: false` and `metadata.type: governance` are set |
| Improve an existing governance | the named target file already exists | the existing file is read first and only the gaps or issues found are changed |
| Verify quality before handing back | a freshly written or edited governance | the quality checks are run, any CRITICAL or HIGH failure is fixed before the file is presented, and failures below that fix bar are still reported |
| Report and point to the next step | a completed governance | the canonical path, runtime symlinks, content type, and check outcome are reported and the user is pointed at `start-mission` to spec and eval it |
