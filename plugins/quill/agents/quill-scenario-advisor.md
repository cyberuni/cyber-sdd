---
name: quill-scenario-advisor
description: "Internal skill: SDD scenario-advisor contract implementation for documentation domain types. Provides Gherkin writing constraints for guides, tutorials, articles, and reference docs. Invoked by sdd-author before sdd-spec-designer writes the .feature file — not triggered by users directly."
metadata:
  internal: true
---

# quill-scenario-advisor

Implements the SDD scenario-advisor contract for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). Returns Gherkin writing constraints to `sdd-author` for forwarding to `sdd-spec-designer`.

## Input

```
DOMAIN            — domain type (documentation | guide | tutorial | article | reference)
COMMAND_SURFACE   — text of the "Command surface / API" section from spec.md
DESIGN_DECISIONS  — text of the "Design decisions" section from spec.md (or null)
```

## Steps

### 1. Read the command surface

Identify: the document's target path or path pattern, its audience, and its declared purpose (install guide, conceptual overview, how-to, API reference, etc.).

### 2. Determine required fields

Every scenario must carry:
- The document path or path pattern (project-root-relative)
- The intended audience or reader persona
- The observable outcome (what the reader can do after completing the document)

### 3. Identify forbidden patterns

Do not write scenarios that:
- Assert internal implementation details (function names, variable values, code logic)
- Describe runtime behavior of software (exit codes, stdout) unless the doc itself is about CLI usage
- Reference prose content word-for-word (paraphrase-sensitive — wording may change without breaking the spec)
- Assert style or tone choices (sentence structure, active/passive voice) as pass/fail conditions

### 4. Write example scenarios

Produce 1–3 well-formed Gherkin scenarios appropriate for the domain type:

**guide / tutorial:**
```gherkin
Given the guide exists at docs/getting-started.md
When a reader follows the steps in order
Then they can complete the stated goal without referencing any other document
```

**article / documentation:**
```gherkin
Given the article exists at docs/concepts/caching.md
And it contains a "## What" section and a "## Why" section
When a reader arrives with no prior knowledge of the topic
Then the article is self-contained and requires no prerequisite reading
```

**reference:**
```gherkin
Given the reference page exists at docs/api/commands.md
And it lists every command in the command surface
When a reader looks up a specific command
Then the page shows its syntax, options, and at least one example
```

Adapt examples to the domain identified in step 1.

## Output

```
REQUIRED_FIELDS:
  - Document path (project-root-relative)
  - Intended audience or reader persona
  - Observable outcome (what reader can do after completing the document)

FORBIDDEN_PATTERNS:
  - Scenarios asserting internal implementation details
  - Scenarios asserting runtime software behavior unrelated to the document
  - Scenarios asserting specific prose wording (paraphrase-sensitive)
  - Scenarios asserting style/tone choices as pass/fail

EXAMPLE_SCENARIOS:
  <1–3 Gherkin scenarios appropriate for the domain type>

NOTES:
  Quill verifies existence, required headings, completeness (no TBD/TODO), and
  reader-path continuity. Avoid scenarios that cannot be verified by static
  inspection of the document file.
```
