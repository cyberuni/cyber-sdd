---
spec-type: behavioral
---

# define-agent — author an agent definition

Scaffold a delegated / dual-mode / in-context agent definition + companion command.

## Use Cases

**Subject** — authoring or improving an agent definition (a named reusable role) in delegated,
invokable dual-mode, or in-context-only form, scaffolding its canonical file, runtime symlinks, and
companion command.
**Non-goals** — authoring a reference-only governance (`define-governance`); scoring a config against
its golden set (`run`); adding or fixing eval cases (`add-scenario` / `improve`); the agent-definition quality
rubric itself (that is the quality-check governance the skill loads).

| Use case | Trigger / inputs | Outcome |
|---|---|---|
| Trigger on an agent-definition request | a request to create/improve a named reusable role, vs. a sibling intent (a reference-only governance, or an eval-run scoring / case-authoring request) carrying the same config vocabulary | `define-agent` fires for an agent-definition request and defers when the intent belongs to `define-governance` / `run` / `add-scenario` |
| Choose the definition mode | the user wants a new agent; the role suits a delegated worker, an invokable dual-mode role, or an in-context-only persona | the three modes are presented and the chosen mode drives what gets scaffolded |
| Resolve placement and runtimes | scope (user-global / project / plugin) and target runtimes are unclear from context | the canonical path is derived and one symlink is created and verified per selected runtime |
| Scaffold the agent definition | a gathered name, role, responsibilities, output format, human-in-the-loop rules, and out-of-scope | a canonical agent file is written with the required frontmatter and the required body shape |
| Scaffold the companion command | the invokable dual-mode mode was chosen | a companion command that loads the agent in-context is written alongside the canonical file |
| Improve an existing definition | the named target file already exists | the existing file is read first and only the gaps or issues found are changed |
| Verify quality before handing back | a freshly written or edited definition | the quality checks are run and any CRITICAL or HIGH failure is fixed before the file is presented |
| Report and point to the next step | a completed definition | the canonical path, runtime symlinks, companion command, and check outcome are reported and the user is pointed at `start-mission` to spec and eval it |
| Co-produce the eval suite as impl-producer | dispatched by the conductor as the ACED impl-producer against a frozen `.feature` | the agent definition and an eval suite carrying one eval per frozen scenario are produced together |
