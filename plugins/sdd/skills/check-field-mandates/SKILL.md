---
name: check-field-mandates
description: "Partial Skill: invoke by name only"
user-invocable: false
metadata:
  internal: true
---

# Check Field Mandates

The concrete engine for the rule that **a definition's declared fields and its prose agree**. Skill
and agent definitions ship structured blocks — an `Input`, an `Output`, a dispatch payload — whose
fields the surrounding prose also mandates. A field the prose mandates and the block omits does not
fail loudly: the stage that depends on it silently never fires. Nothing else in the repo diffs the
two token sets.

## What it checks

Every `plugins/<plugin>/skills/**/SKILL.md` and `plugins/<plugin>/agents/*.md`, both directions:

- **unexplained** — a block declares a field that carries no gloss and that the prose never names.
- **undeclared** — the prose names a known field in a code span, and none of the file's blocks
  declare it.
- **miscased** — the prose names, in a code span, a field this file's block declares, but spelled
  in the other case (`governances_loaded` against `GOVERNANCES_LOADED`).

**A field token** is `UPPER_CASE` or `snake_case`; the two spellings name the same field. A lowercase
word needs an underscore to be a token, so ordinary prose (`owner`) is never a field.

**A structured block** is a fenced code block with no info string (or `text`). A **declaration** is a
block line opening with field tokens then a colon (`STATUS: complete | blocked`), a comma list of two
or more tokens (`SPEC_PATH, FEATURE_PATH`), or a list item opening with bold tokens
(`- **SUBJECT** — …`). A **gloss** is the text after the colon or the bold lead, through to the next
declaration.

**A field is explained by a gloss or by the prose.** A glossed declaration already says what it
carries; the rule catches the **bare** one nothing explains.

**A mandate is a code span naming a known field** — a token some definition in the tree declares.
That vocabulary separates a field from an uppercase literal such as `TODO`. A definition that
declares no field at all is a consumer, and its prose is not held to a block.

**Naming another agent's field on purpose** — a conductor describing what it passes a judge — is
marked beside the line, with its reason:

```markdown
Pass the zero-based `ROW` to the case judge. <!-- field-mandate-ignore: the case judge's input, not ours -->
```

A marker with no reason excuses nothing. There is no allow-list file: a real mismatch is fixed.

## Run it

```bash
node "<skill>/scripts/check-field-mandates.mts" [--root <dir>]
```

`--root` defaults to the working directory. A finding always exits non-zero, as does a root that is
not a readable directory and an unrecognized flag — there is deliberately no report-only mode.

It joins the root check chain as **`check:fields`**, so it runs on every `pnpm verify` and in CI.
