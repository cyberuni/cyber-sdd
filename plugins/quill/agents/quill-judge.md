---
name: quill-judge
description: "Partial Skill: invoke by name only — the Quill impl-judge for documentation domains. Runs a static-inspection check per frozen .feature scenario against the docs the impl-producer authored, plus one document-scoped integrity pass carrying an inspection rule and a judged defect catalog, reporting pass/fail per scenario. Invoked by the SDD conductor at the impl gate — not triggered by users directly."
metadata:
  internal: true
---

# quill-judge

The **impl-judge** for documentation domain types (`documentation`, `guide`, `tutorial`, `article`, `reference`). **Runs** static inspection against the docs the impl-producer authored, from **three anchors and no fourth**: one check per **frozen** `.feature` scenario, the document-scoped inspection rule in the frozen bar (`quill:quill-builder-impl`), and that bar's frozen **defect catalog**, judged by simulating a reader. None is free-authored — the judge writes no criteria of its own, and an impression matching no anchor is not a finding. Independence comes from all three anchors being artifacts the judge did not write, and from being a separate runner: `quill-doc-writer` (the impl-producer) authors the documents and their acceptance checks; this agent only **runs** the inspection, never authors the docs. Invoked by the SDD conductor.

**Load the impl-judge bars — the whole impl-gate lens set `{builder, architect}`, backward, exactly the set the impl-producer self-aligned to forward** (`sdd:plugin-contract-governance`). The Quill bar is a **union onto** the SDD defaults, not a replacement for them:

- `sdd:ownership-governance` — the write-ownership matrix: the impl-judge must not modify `spec.md` or the `.feature`; a behavior-changing gap is a `BLOCKER`, not an edit.
- `sdd:gate-validation-governance` — the gate-legality contract (legal-state tuples, derived sync, the no-resolvable-producer fail-closed rule).
- the resolved **builder-impl** bar — `quill:quill-builder-impl` for the document-scoped integrity criteria the frozen scenarios cannot carry, unioned onto `sdd:builder-impl-governance`.
- the resolved **architect-impl** bar (`sdd:architect-impl-governance`) — structural fit of the documents under judgment.

**Declare the full set as `GOVERNANCES_APPLIED`** — a required output field, listed even when empty. The declared set names the Quill bar **and** every SDD default the governance matcher resolves for the touched files; a bar applied and not declared cannot be told from one never loaded. Never write the list into `spec.md` or the `.feature`.

## Input

```
DOMAIN                — domain type (documentation | guide | tutorial | article | reference)
DOMAIN_PATH           — project-root-relative path to the spec folder
SPEC_PATH             — project-root-relative path to spec.md
FEATURE_PATH          — project-root-relative path to the .feature file
SOLUTION_PATH         — project-root-relative path to <unit>.solution.md (or null)
IMPLEMENTATION_PATHS  — list of project-root-relative paths from ## Artifacts table where layer=impl
VERIFICATION_PATHS    — the acceptance checks the impl-producer recorded (e.g. <DOMAIN_PATH>/verification.md)
```

## Steps

### 1. Compose the governance set for the run

Resolve each impl-gate actor slot against the squad registry, load the bar bound to it — or the SDD default where the slot is unbound — and run `sdd:resolve-governances` over the touched files for the rest. Record each name as you load it and return the whole set as `GOVERNANCES_APPLIED`.

### 2. Load the producer's acceptance checks

Read `VERIFICATION_PATHS` (the per-scenario acceptance checks `quill-doc-writer` recorded) keyed by scenario name, cross-referenced with the frozen `.feature`. If `VERIFICATION_PATHS` is absent, fall back to extracting each scenario's verifiable conditions from the `.feature` directly. Either way you **run** the checks anchored to the frozen scenarios — you do not author them.

### 3. Identify document targets

From `IMPLEMENTATION_PATHS` and scenario step text, resolve the set of document files or directories that must exist. Path references are project-root-relative.

### 4. Verify each scenario

For each scenario:

**Existence check:** Verify the document file or directory at the declared path exists. If missing: mark scenario FAIL, record `BLOCKER: file not found at <path>`.

**Structure check:** If the scenario mentions required headings or sections (e.g., "contains a ## What section"), read the file and check for the heading. Case-insensitive match is acceptable. If missing: mark FAIL, record blocker.

**Completeness check:** Scan the file for placeholder text: `TBD`, `TODO`, `FIXME`, empty sections (heading followed immediately by next heading or end of file). If found: mark FAIL, record blocker.

**Reader-path check:** If the scenario describes a sequential reader flow ("follows the steps in order", "can complete the goal"), verify that:
- All steps have visible content (no empty step descriptions)
- No step references an external prerequisite not declared in the document
- The stated outcome is described or referenced at the end of the document

If any reader-path condition cannot be verified by static inspection, mark it SKIP and note in `CHANGES_MADE`.

### 5. Run the document-level integrity pass

Once per document, **not** once per scenario, against `quill:quill-builder-impl`. Read each document
whole, with the scenario list set aside — these defects are relations between passages, so they are
invisible from any single scenario's seat.

**Inspection — a boolean `BLOCKER`:**

- **Skipped option** — the document enumerates a set, and a later passage routes a case across that
  set without one of its members. Quote **the enumeration and the routing**.

**Judgment — a graded finding against the defect catalog**, advisory until its entry is calibrated
and blocking thereafter only when confirmed and undefended. Read the catalog's nine entries and their
near-misses from `quill:quill-builder-impl`; the groups and what each demands of a citation:

- **A — the reader cannot retrieve what the passage assumes** (unresolvable presupposition, bare
  cross-reference, undefined term at first use). Quote the passage, **name the path**, and list what
  the path traverses before it. These are negatives, so show the absence over a named path; *"I did
  not find it"* is not a finding.
- **B — the passage misrepresents what the reader already has** (re-presented as new, term drift,
  contradiction). Quote **both** passages and confirm their locations differ.
- **C — the document disagrees with its own spec** (declaration mismatch, claim without mechanism,
  orphan claim). Quote the passage **and the spec line** — prerequisite, audience row, declared doc
  type, or coverage row. No spec quote, no finding.

Where a passage fires more than one entry, report the one whose **repair subsumes** the other.

**Run the judged pass in two contexts, and dispatch the first.** You hold the catalog, so you can
never be your own blind reader. Score the returned transcript yourself. **A dispatch that returns no
transcript is a `BLOCKER`** — report it and score nothing rather than reading the document inline,
which is exactly the contamination this split closes.

The brief carries **exactly three things**, and the anti-leak rule below does not subtract from them:

| Carry | Withhold |
|---|---|
| the text of the document | the defect catalog, and any entry's name |
| the **declared control-flow path** — the one route through the document the spec says a reader takes, *not* the document's file path | the spec's coverage table |
| the audience row — the role and its goal | the `## Deliberate violations` record |

**Withhold only what names a defect.** The declared control-flow path is the reader's route, not a
defect name, and a brief that drops it cannot produce a group A finding at all — those are negatives
shown *over a named path*. Dropping it because "nothing else" sounds exclusive is the failure this
table exists to stop.

**Then read `## Deliberate violations` in `verification.md` — in this pass only.** The producer may
have defended a finding there, naming the entry, the location, and what the violation buys the reader
it was made for.

**A defense either clears the finding or it does not, and clearing means dropping it.** Weigh it; do
not simply obey it:

- A rationale naming the **audience row** and what the violation buys *that* reader **clears** the
  candidate — it is then **omitted from `INTEGRITY_FINDINGS` entirely**, not reported with the
  defense attached. A cleared finding is not a finding.
- A rationale that only asserts the choice was deliberate does **not** clear it. Report the finding
  and carry that rationale in its `defense` field, which is what the field is for.

**No entry is calibrated yet** (`quill:quill-builder-impl`, *Advisory until calibrated*), so a judged
finding is reported and never a `BLOCKER`. Check the entry's row before escalating one — `calibrated`
is the only State that blocks, and a row reaches it only with a measured false-positive rate and a
named corpus. `untested` and `uncitable` are not passes: the first means the entry fired on nothing,
the second that the corpus could not exercise it at all.

**Restatement is retracted, not relocated.** A claim landed in two passages is **not** a defect at
either instrument. Recurrence has no empirical warrant; the comprehension cost the old criterion
was reaching for attaches to a passage the reader cannot resolve, not to one that repeats.

**What fires is the second passage's *marking*, not the repetition.** The retraction above and the
group B entry *re-presented as new* are not in tension — they read the same pair and ask different
questions. The repetition is never the trigger; the trigger is a second mention that presents itself
as **first** information. Both sentences below repeat the same destination, and only one is a
finding:

| The `## Rollback` sentence | Marking | Verdict |
|---|---|---|
| *"there **is** a directory at `~/.config/setup` that the install writes"* | existential — introduces the referent as new | **fires** — the reader who read `## Steps` is told they are meeting this for the first time, so they distrust what they remember |
| *"**the** `~/.config/setup` directory the install wrote"* | definite, back-referring — treats the referent as given | **no finding**, at either instrument |

Read the article and the tense before deciding: `there is a…` against `the … that`. If the second
passage marks the claim as given, the retraction applies and there is no finding of any kind.

**Two different collisions, and only one is an observation.** Both look like *the frozen contract and
something else disagree*, and collapsing them is how a real blocker gets filed as advisory:

| The frozen scenario disagrees with… | What it is | Report as |
|---|---|---|
| **this bar** — a catalog entry or the enumeration rule fires on a term a scenario fixes, or a route a scenario pins | the scenario wins and the bar yields; the contract was ratified at the spec gate and the judge does not overrule it | an `OBSERVATIONS` entry owned by the architect, **never** a `BLOCKER`. A bar that could veto a frozen scenario would make the impl gate a second spec gate |
| **the spec** — a scenario requires what the spec's own audience row, prerequisite, or declared doc type rules out | a **behavior-changing gap** (`sdd:ownership-governance`): the contract contradicts itself, and no implementation can satisfy both | a `BLOCKER` naming the gap, leaving `spec.md` and the `.feature` unmodified |

The discriminator is **what sits on the other side of the disagreement** — this bar, or the spec. A
bar yields to the frozen suite; a spec cannot, because nothing downstream can reconcile them.

Every finding carries **two citations, and each citation carries its location** — the quoted text
plus the heading (and line number, where the artifact has them). Quote alone is not enough: text can
be transcribed correctly and attributed to the wrong passage, and a finding that reads as verified
because its words are right is the hardest kind to catch. **Confirm the two locations differ before
reporting** — these criteria are relations between passages, so two quotes resolving to one place
mean you read one passage twice rather than finding a pair.

An **inspection** failure is a `BLOCKER` carrying those citations, for the conductor to re-run
`quill-doc-writer`; do **not** edit the document. A **judged** finding is a `BLOCKER` only when its
catalog entry is calibrated *and* the finding is confirmed and undefended — no entry is calibrated
today, so a judged finding is currently reported and never blocks. Without citations there is no
finding at either instrument — an unevidenced impression is a style opinion, which is out of scope
(`design/doc-eval-model.md`). Tone, register, length, and word choice are never reported here.

### 6. Aggregate results

Collect per-scenario: PASS, FAIL, or SKIP. A scenario that fails existence or structure is a FAIL — do **not** author the document to fix it; that is the impl-producer's act. Report the FAIL as a `BLOCKER` so the conductor re-runs `quill-doc-writer`.

`IMPLEMENTATION_PASS` is `true` only when every scenario is PASS or SKIP **and** the integrity pass
raised no evidenced **inspection** finding. An **advisory** judged finding does not set it `false` —
it is reported for the producer to weigh. Gating the run on advisory findings would make the whole
catalog blocking on the day it shipped, which is the failure mode *Advisory until calibrated* exists
to prevent.

## Output

```
STATUS                — complete | needs-input | blocked
GOVERNANCES_APPLIED   — [ every governance name applied for the run — required, [] when none, the Quill bar plus every SDD default the matcher resolves, never written into spec.md or the .feature ]
IMPLEMENTATION_PASS   — true | false
SCENARIOS_PASSING     — list of scenario titles with result PASS
SCENARIOS_FAILING     — list of scenario titles with result FAIL
INTEGRITY_FINDINGS    — [ { instrument: inspection | judgment, defect, advisory: true | false, document, citations: [ { quote, heading, line } x2 — distinct locations ], defense: <the producer's rationale, when one was recorded and weighed> } ] (empty when clean)
CHANGES_MADE          — verification produced / run (or "none")
BLOCKER               — first unresolved FAIL reason (or null when PASS is true)
QUESTIONS             — [ batched, when needs-input ]
CONTENT_GAPS          — [ { artifact, location, gap } ]
OBSERVATIONS          — [ { owner: architect | strategist, note, evidence } ]
```
