---
spec-type: behavioral
concept: plugin
---

# check-field-mandates — a definition's declared fields and its prose agree

## What

Skill and agent definitions ship **structured blocks** — an `Input`, an `Output`, a dispatch
payload — whose fields the surrounding prose also mandates: *"return `STATUS: blocked` with a
`BLOCKER` naming the missing behavior"*. The block is what a dispatcher constructs and a collector
reads; the prose is what tells the agent to fill it. Nothing the repo runs compares the two, so a
field can be **mandated and never carried** (the prose asks for a `BLOCKER` the `Output` block has no
line for) or **carried and never explained** (a block declares a field nothing says how to fill), and
both read as complete to a reviewer reading for meaning.

The first direction is the dangerous one. A mechanism that depends on a field arriving across a
multi-participant dispatch channel does not fail loudly when the field is missing from the block —
the stage that reads it silently never fires. Prose sweeps keep missing instances because a reviewer
reading for meaning does not diff token sets. This engine diffs them.

**check-field-mandates** reads every shipped skill and agent definition and reports, per file, both
directions of disagreement with the file, the line, and the token:

| Direction | Finding | Answers |
|---|---|---|
| **block → prose** | **unexplained** | does every field a block declares have an explanation — a gloss on its own declaration, or a mention in the prose? |
| **prose → block** | **undeclared** | does every field the prose mandates appear among this file's declarations? |

**A field is explained by a gloss or by the prose, not by the prose alone.** A declaration such as
`QUESTIONS: [ batched, when needs-input ]` already says what the field carries; requiring the prose
to repeat it would demand filler in every definition and train authors to write it. What the rule
catches is the **bare** declaration — a comma list with no gloss, or a key with nothing after it before
the next declaration or the block's end — that nothing anywhere in the file explains. Measured over this repository before the rule was proposed,
the literal reading ("named in the prose") reported 97 fields, almost all glossed conventional ones;
this reading reports only the bare ones.

**A mandate is a code span naming a known field.** Prose names fields in backticks — `` `BLOCKER` ``,
`` `STATUS: blocked` ``, `` `PREFLIGHT.result` `` — and uppercase words outside a code span are
ordinary emphasis (*PASS*, *NOT*). A code-span token counts as a mandate only when it is a **known
field**: the same field as one declared by *some* scanned definition. That vocabulary is what separates a field
from an uppercase literal such as `` `TODO` ``, without a hand-kept list.

**Non-goals.** It does not check that a field is *consumed* by whoever receives the block (a
cross-file contract between a dispatcher and its agent); it does not read a prose sentence for
meaning — "report it in your `Output`" names no token and is out of its reach; it does not validate
persisted ledger records against their contract (a separate check, over written data rather than
authored documents); it does not judge what a gloss says — `FIELD: TBD` counts as explained; it
writes nothing and fixes nothing; and it is not a gate — it is a mechanical
check on the tree as it stands.

**Key terms.**

| Term | Plain meaning |
|---|---|
| **definition** | a shipped skill or agent file: `plugins/<plugin>/skills/**/SKILL.md` or `plugins/<plugin>/agents/*.md` |
| **field token** | an uppercase identifier of two or more characters, optionally underscore-joined: `STATUS`, `CONTENT_GAPS` |
| **structured block** | a fenced code block with no info string, or the info string `text` |
| **declaration** | a line in a structured block that opens with one or more comma-separated field tokens (each optionally suffixed `(s)`) followed by a colon, or a comma list of two or more tokens alone on the line; or a list item whose text opens with one or more bold field tokens (`- **SUBJECT** — …`, `- **FEATURE_PATH** + **SCENARIO** — …`) |
| **gloss** | text after a declaration's colon — a trailing `#` comment included — or, for a list item, after its bold lead — plus any non-declaration line that follows a block declaration, up to the next declaration or the end of the block; a comma-list declaration with no colon is glossed only by those following lines. A lone field token on a block line is never a declaration: it glosses the open declaration, and with none open it declares and glosses nothing |
| **prose** | every line of the file outside a fenced code block and outside the YAML frontmatter, excluding a list-item declaration's bold lead — the text after the lead is both that declaration's gloss and prose |
| **explained** | a declared field that carries a gloss, or that the prose names as a whole word |
| **declared field** | a token some declaration in the file declares — a block line or a list item alike |
| **mandate** | a code span in the prose whose content opens with a known field token — a field named later inside the span (`see BLOCKER`) is not a mandate |
| **known field** | a token that is the same field as a declared field of some scanned definition |
| **same field** | two tokens that are equal, or that differ only by one trailing `S` (`CONTENT_GAP` and `CONTENT_GAPS`) |
| **ignore marker** | `<!-- field-mandate-ignore: <reason> -->` on a prose line — that line, and only that line, names another agent's field on purpose |

## Use Cases

**Actors, and the goals they arrive with.**

| Actor | Goal (their result, not their call) |
|---|---|
| the author about to commit (person or agent) | know that every definition they touched carries the fields its prose asks for, and explains the fields it carries |
| the pull-request check | reject a branch that introduced a mismatch, with the guarantee the author had locally |
| the definition author naming another agent's field on purpose | say so once, beside the line, and not be reported for it |
| **the conductor constructing a payload** — *affected, never invokes* | build a dispatch block that carries every field the receiving definition's prose tells it to fill |
| **the producer declaring into it** — *affected, never invokes* | find a line in its `Output` block for every field its own prose tells it to return |
| **the judge reading it** — *affected, never invokes* | find in the report every field the prose promised, so the stage that depends on it fires |

The three affected actors are the issue's own account of who a dropped field hurts — *"a conductor
constructing a payload, a producer declaring into it, a judge reading it"*. They are why the check
runs over the **whole tree** rather than the definition an author is editing: a field dropped from a
canonical block is paid for by every participant on that channel, none of whom edited the file.

### UC1 — check every shipped definition in the tree

| | |
|---|---|
| **Actor** | the committing author; the pull-request check |
| **Goal** | be told, before the change lands, of every field a definition declares without explaining, or mandates without declaring |
| **Trigger** | the repo's own check chain invokes the engine |
| **Inputs** | a root directory (defaults to the working directory) |
| **Outcome** | every definition under the root has had both directions checked; each mismatch is named with its file, line and token; the exit code is 0 only if nothing was found |

**Extensions**

| Cause | Outcome |
|---|---|
| a declared field carries no gloss and the prose never names it | reported **unexplained** at its declaration line; the run fails |
| a declared field carries a gloss, on its own line or the lines that follow | explained; nothing reported |
| a declared field is bare but the prose names it | explained; nothing reported |
| a prose code span mandates a known field that none of this file's declarations declare | reported **undeclared** at the prose line; the run fails |
| a colon-terminated declaration is followed directly by the next declaration | it has no gloss; unless the prose names it, it is reported **unexplained** |
| a declared token carries the `(s)` suffix | it declares the bare token |
| a lone field token sits on a block line after a declaration | not a declaration — it glosses the declaration before it |
| a block closes while a declaration's gloss is still open | the gloss ends at the fence; prose after the block is not gloss |
| a list-item declaration has nothing after its bold lead | it has no gloss — its bold lead is not prose — so unless named elsewhere it is reported **unexplained** |
| a list-item declaration's gloss names a known field in a code span that this file does not declare | the gloss is prose, so it is reported **undeclared** like the same span in a paragraph |
| a declaration's colon is followed only by a `#` comment | the comment is its gloss; explained |
| a field is named in the prose only inside a longer field name (`MODE` inside `WORK_MODE`) | not a mention — names are matched whole; unless otherwise explained it is reported **unexplained** |
| a field is named only in the YAML frontmatter | frontmatter is not prose; unless otherwise explained it is reported **unexplained** |
| a single capital letter appears where a field could (`A: first option`, `` `A` ``) | not a field token — neither declared nor a mandate |
| a code span names a known field after other text (`` `see BLOCKER` ``) | not a mandate; nothing reported |
| an ignore marker sits on one prose line and a mandate on another | the marker excuses only its own line; the mandate is checked as usual |
| a fenced block carries the info string `text` | a structured block, the same as a bare fence |
| the prose names a field as the same field of one this file declares (`CONTENT_GAP` for `CONTENT_GAPS`) | resolves; nothing reported |
| a code span names an uppercase token that no definition declares (`TODO`) | not a mandate; nothing reported |
| a known field is named in the prose outside a code span | not a mandate; nothing reported |
| the file declares no field at all | its prose names other definitions' fields as a consumer; nothing reported |
| a prose line carries an ignore marker with a reason | mandates on that line are not reported |
| a prose line carries an ignore marker with no reason | the marker suppresses nothing; the line is checked as usual |
| a fenced block carries an info string other than `text` (`yaml`, `bash`) | its lines are not declarations |
| a markdown file sits outside the two definition locations — beside a `SKILL.md`, nested below `agents/`, or a `SKILL.md` outside a plugin's `skills/` | not read |
| several definitions each carry a mismatch | the run **reports every one** before exiting non-zero |
| the tree holds no definition | reports that plainly and exits 0 — a repo with no plugin definition is not a defect |
| no root is named | the working directory is the tree — the same check, over a different root |
| the named root is not a readable directory | names it and exits non-zero — an unusable root is never reported as a clean tree |
| an unrecognized flag is passed | names it and exits non-zero, rather than falling through to a default |

### Surface trace — every element against the use case that needs it

| Element | Needed by | May not combine with |
|---|---|---|
| `--root <dir>` | UC1 — a caller checking a tree that is not the working directory | — |
| the ignore marker | UC1 — the author naming another agent's field on purpose | — |

**There is deliberately no report-only mode and no allow-list file.** A findings-exit-zero default
is the shape [`../../corpus/spec-floor/`](../../corpus/spec-floor/README.md) was built to close. A
committed allow-list of known mismatches is the shape
[`../../corpus/retired-terms/`](../../corpus/retired-terms/README.md) rules out for a genuine
survivor: a real mismatch is **fixed**, not listed. The one sanctioned exception — a prose line
naming another agent's field — is marked beside the line it excuses, with its reason, so it cannot
drift away from what it sanctions. A **declaration** has no exception at all: any field can be
glossed.

**There is deliberately no output-format element.** No actor above needs machine output.

The shipped definitions' own shape is the plugin face of [`../`](../README.md); this node owns only
whether a definition's blocks and prose agree.

## Control Flow

One entry point, one graph. The known-field vocabulary is built over **every** definition before any
file is judged, because the prose → block direction asks whether a token is a field *anywhere*.

```mermaid
graph TD
  A[invoked with argv] --> B{every flag recognized?}
  B -- no --> E1[name the unrecognized flag, exit 1]
  B -- yes --> RF{is a root flag given?}
  RF -- yes --> R[the root is the flag's argument]
  RF -- no --> RW[the root is the working directory]
  RW --> RD
  R --> RD{is the root a readable directory?}
  RD -- no --> E2[name the unusable root, exit 1]
  RD -- yes --> S[take the next markdown file under the root's plugins directory]
  S --> L{is it a SKILL.md under a plugin's skills, or an .md directly under its agents?}
  L -- yes --> D[collect it as a definition]
  L -- no --> SN
  D --> SN{another markdown file?}
  SN -- yes --> S
  SN -- no --> Q{any definition collected?}
  Q -- no --> N[report no definition found]
  Q -- yes --> P[take the next definition to parse, past its frontmatter]

  P --> LN{another line?}
  LN -- no --> PD{another definition to parse?}
  PD -- yes --> P
  PD -- no --> V[build the known-field vocabulary from every definition's declarations]
  LN -- yes --> FL{is the line a fence?}
  FL -- yes --> OC[open a block, or close it and end any open gloss]
  OC --> LN
  FL -- no --> IN{inside a fenced block?}
  IN -- yes --> FB{is the block's info string empty or text?}
  FB -- no --> LN
  FB -- yes --> DL{does the line open a declaration?}
  DL -- yes --> DR[declare its tokens of two or more characters, each with any '(s)' dropped; glossed if any text, a comment included, follows the colon]
  DR --> LN
  DL -- no --> GC[a non-blank line glosses the open block declaration, if any]
  GC --> LN
  IN -- no --> LI{does a list item open with bold field tokens?}
  LI -- yes --> DI[declare its tokens of two or more characters; the text after the bold lead is their gloss, and is prose]
  DI --> PR
  LI -- no --> PR[prose: record its words and its code spans]
  PR --> LN

  V --> M[take the next definition]

  M --> HD{does it declare any field?}
  HD -- no --> M2
  HD -- yes --> DF{another declared field?}
  DF -- yes --> GL{glossed, or named in the prose as a whole word?}
  GL -- no --> F1[report unexplained at the declaration line, mark failed]
  GL -- yes --> DF
  F1 --> DF
  DF -- no --> MD{another prose code span?}
  MD -- yes --> IG{its line carries an ignore marker with a reason?}
  IG -- yes --> MD
  IG -- no --> KF{does its content open with a known field token?}
  KF -- no --> MD
  KF -- yes --> DC{is the same field declared in this file?}
  DC -- yes --> MD
  DC -- no --> F2[report undeclared at the prose line, mark failed]
  F2 --> MD
  MD -- no --> M2{another definition?}
  M2 -- yes --> M
  M2 -- no --> X{anything marked failed?}
  N --> X
  X -- yes --> XF[exit 1]
  X -- no --> X0[exit 0]
```

**Continuing past a finding is a decision, not a detail.** The sweep reports every mismatch in every
definition, so one run tells an author the whole truth rather than one defect at a time.

**A definition that declares nothing is skipped as a whole.** Its prose names fields as a consumer —
a conductor describing what a judge returns — and holding it to a block it never claimed to carry
would report every consumer reference in the repository.

## Scenario map

### UC1 — check every shipped definition in the tree

| Edge | Path (Given) | Scenario |
|---|---|---|
| declared field neither glossed nor named → report unexplained, mark failed | a comma list of bare fields in a structured block, one of which the prose never names | `a declared field nothing explains is reported unexplained` |
| declared field glossed → explained | a field whose declaration carries text after its colon, never named in the prose | `a field glossed on its own declaration is explained` |
| declared field glossed → explained | a field whose colon ends its line and whose gloss sits on the line after — **binds the continuation against a same-line-only gloss reader** | `a gloss on the line after a declaration explains it` |
| line opens a declaration → the previous declaration's gloss ends | a colon-terminated field followed directly by a glossed declaration — **the negative companion: binds the gloss boundary against a reader that treats every later line as gloss** | `the next declaration ends a gloss` |
| declared field glossed → explained | a comma list of three fields sharing one colon and one gloss, the middle one mandated in the prose — **binds recognition of the form (a non-reader reports the mandate undeclared) and the shared gloss (a first- or last-token-only gloss leaves an end field unexplained)** | `a gloss after a comma list explains every field in it` |
| non-declaration line → glosses the open declaration | a lone field token on the line after a colon-terminated declaration — **binds that a single bare token is not itself a declaration** | `a lone token on a block line glosses the declaration before it` |
| non-declaration line with no declaration open → declares and glosses nothing | a lone field token as a block's first line, followed by a glossed declaration — **binds that a lone token is never a declaration, even with nothing to gloss** | `a lone token opening a block declares nothing` |
| closing fence → the open gloss ends | a colon-terminated declaration on a block's last line, with prose following the fence that never names it | `a gloss stops at the end of its block` |
| declared field bare, named only inside a longer name → not a mention, report unexplained | a bare field whose name appears in the prose only inside a longer field name — **binds whole-word matching against a substring reader** | `a field is named in the prose only as a whole word` |
| declared field bare, named only in frontmatter → report unexplained | a bare field named only in the YAML frontmatter's description — **binds that frontmatter is not prose** | `a field named only in the frontmatter is unexplained` |
| declared field glossed → explained | a declaration whose colon is followed only by a `#` comment — **binds that a comment is gloss** | `a comment after a declaration's colon explains it` |
| declared field bare but named → explained | a bare field from a comma list that the prose names as a whole word | `a bare field the prose names is explained` |
| declared field → declaration read | a list item opening with two bold field tokens joined by `+` — **binds the list-item declaration form** | `a list-item declaration declares every bold field it opens with` |
| list item declared → glossed only by its lead | a list item whose bold field has no text after it, never named elsewhere — **binds that a list item's bold lead is not prose** | `a list-item declaration with nothing after its bold lead is unexplained` |
| list item declared → its gloss is prose | a list item whose gloss names, in a code span, a field declared only by another definition — **binds that the gloss is scanned for mandates** | `a code span in a list item's gloss is a mandate like any other` |
| fence info string is text → structured | a `text` fenced block declaring a bare comma list that nothing explains | `a fenced block tagged text is a structured block` |
| declaration read → the `(s)` suffix is dropped | a declaration of `NODE_PATH(s)` with a gloss, and a prose code span naming the bare token | `a declared token's plural suffix declares the bare token` |
| fence carries a foreign info string → not a declaration | a `yaml` fenced block whose line opens with an uppercase key, that key also named in a code span in the prose | `a line in a fenced block tagged with a language declares nothing` |
| known field mandated, not declared here → report undeclared, mark failed | a definition that declares fields, whose prose code span names a field declared only by another definition | `a field the prose mandates and no block declares is reported undeclared` |
| known field mandated, declared here → ok | a definition whose prose code span names a field its own block declares with a value after the colon | `a field the prose mandates and a block declares passes` |
| same field, differing by a trailing S → ok | a prose code span naming the singular of a plural field this file declares, the singular itself declared by another definition — **so the mandate is known and only same-field resolution can clear it** | `a field named in the singular resolves to its plural declaration` |
| same field, differing by a trailing S → ok | a prose code span naming the plural of a singular field this file declares, the plural itself declared by another definition — **the symmetric direction** | `a field named in the plural resolves to its singular declaration` |
| code span opens with other text → not a mandate | a code span naming a known field after a leading word — **binds "opens with" against a reader that matches anywhere in the span** | `a code span that does not open with a field is not a mandate` |
| token of one character → not a field | a single capital letter declared with a gloss in one definition and named in a code span in another — **binds the two-character floor** | `a single capital letter is not a field` |
| code span opens with no known field → not a mandate | a code span naming an uppercase token that no definition declares | `an uppercase code span that is no field is not a mandate` |
| known field outside a code span → not a mandate | a prose line naming another definition's field as a bare word | `a field named outside a code span is not a mandate` |
| definition declares nothing → skipped | a definition whose body is prose paragraphs only, whose prose code span names another definition's field | `a definition that declares no field is not held to one` |
| line carries a reasoned ignore marker → skip | a prose line naming another definition's field in a code span, with an ignore marker giving a reason | `an ignore marker with a reason excuses its line` |
| marker on another line → this line checked as usual | a mandate on one prose line and a reasoned ignore marker on a different line — **the companion that binds the marker to its own line** | `an ignore marker excuses only its own line` |
| line carries a bare ignore marker → checked as usual | the same line, with an ignore marker giving no reason | `an ignore marker without a reason excuses nothing` |
| another definition → take the next | an agent definition with an unexplained field and a skill definition with an undeclared mandate — **convergence: both definition locations are read, both directions report in one run** | `every mismatch in every definition is reported in one run` |
| file outside the definition locations → not read | three mismatching markdown files, one beside a skill's `SKILL.md`, one nested below a plugin's `agents/`, one a `SKILL.md` outside a plugin's `skills/` — **convergence: none of the three non-definition locations is read** | `a markdown file that is not a definition is not read` |
| no definition found → report plainly | a tree whose only file is a plugin's package manifest | `a tree with no definition passes` |
| no root flag → the working directory is the tree | the working directory holds a definition with an unexplained field | `with no root flag the check reads the working directory` |
| root resolved from the flag → check that tree | the flag names a tree other than the working directory | `the check reads the tree it is pointed at, not the working directory` |
| root not a readable directory → name it, exit 1 | the flag names a path that is a regular file | `a root that is not a directory fails instead of passing clean` |
| flag not recognized → name it, exit 1 | an invocation carrying a flag the engine does not define | `an unrecognized flag fails loudly instead of being ignored` |

### The repo's own chain

The promise to the collector is that **the chain guarding commits runs the check** — a binding this
node owns and states, in the shape its sibling guards use.

| Edge | Path (Given) | Scenario |
|---|---|---|
| the check chain invokes the engine | the repo's root package manifest | `the root check chain runs the field-mandate check` |

## Delivery

Implemented by the **`check-field-mandates`** skill —
[`plugins/sdd/skills/check-field-mandates/`](../../../../../plugins/sdd/skills/check-field-mandates/)
— carrying a self-contained `.mts` script (the repo's node ≥23.6 / no-deps convention), in the same
shape as its sibling guards. It joins the root check chain as `check:fields`, so it runs on every
`pnpm verify` and in CI.

The CR that introduces it also **fixes every mismatch it reports in this repository**, so the check
ships live rather than inert. Three of those are the exact class this node exists for — a definition
whose prose mandates returning a `BLOCKER` that its `Output` block has no line for.

## References

- [Issue #24](https://github.com/cyberuni/cyber-sdd/issues/24) — backs the claim that prose sweeps
  miss this class (three consecutive impl-gate rounds on one change request failed on it, one after a
  canonical block was added to fix it), and names the three affected actors in the Use Cases.
