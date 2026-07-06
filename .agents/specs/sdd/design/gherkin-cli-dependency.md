# The gherkin-cli dependency

SDD's mission loop delegates mechanical `.feature` **parse** and **diff** work to the published
[`gherkin-cli`](https://www.npmjs.com/package/gherkin-cli) (own cyberuni repo), invoked via
**pinned npx** — never imported.

## What consumes it

- **The gate digest + the conductor's freeze re-open guard** classify scenario changes with
  `npx gherkin-cli@<pin> diff --base <baseref> <file> --format json`: `addOnly` confirms a purely
  additive change self-clears with no judge round; `modified`/`removed` are flagged for **semantic**
  narrowing review (narrowing-vs-widening within a modified scenario stays a judgment).
- The digest lists a **brand-new** suite (no baseline) with `npx gherkin-cli@<pin> parse <file>`
  (compact names / tags / counts) instead of hand-tokenizing the raw file.

## Why an external npx CLI, not an in-SDD engine

Bundling a real Gherkin parser (`@cucumber/gherkin`) into a loose SDD `.mts` engine is impossible
(the `.mts` engines carry no deps / no build). A **published, npx-pinned CLI** is the conformant
alternative: an `npx <pkg>@<version>` reference is an **external** ref the agentskills standard
blesses (the strict cyberplace S4 self-containment check only flags repo-local paths), so it needs
no plugin-root shared lib and no `internal:true` hack. `build-resolve-pins` resolves and maintains
the `@<version>` pin at plugin build.

## Boundary

SDD owns the **doctrine** lints (adverb / rubric-noun bans, `@frozen` / `@rubric` semantics) and
applies them over the CLI's manifest. `gherkin-cli` owns only the general parse/validate/diff — it
is a reusable agent-first tool, not SDD-specific.
