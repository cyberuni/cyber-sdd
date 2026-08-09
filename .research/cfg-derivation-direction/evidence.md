# Evidence — CFG derivation direction

All claims verified against the repo at commit `b54a4f5e` (branch
`cyberlegion/unit-c1932c3b4794a682`), 2026-08-09, unless noted. Confidence is the parent agent's
after re-verification, not the reporting subagent's.

## The three artifacts

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E01** | The backfilled map produced **55 rows** for 55 scenarios — one manufactured edge per scenario, grouped by the suite's own banner comments | authored in-session; committed in `b54a4f5e` | confirmed | high |
| **E02** | Contract-first derivation **A** produced **63 distinct edges → 77 scenario rows** | cold subagent, isolated worktree | confirmed | high |
| **E03** | Contract-first derivation **B** produced **58 distinct edges → 86 scenario rows** | cold subagent, isolated worktree | confirmed | high |
| **E04** | The standing suite holds **44** scenarios (55 including the in-flight CR-6 block) | `handoff.feature`, `grep -c "Scenario:"` | confirmed | high |
| **E05** | Both derivations were structurally blind: each deleted `handoff.feature` before reading anything, neither read `.agents/plans/`, and both independently reported the worktree README had no `## Control Flow` / `## Scenario map` — i.e. both read the pre-restructure prose contract | both agents' self-reports, mutually corroborating | confirmed | high |
| **E06** | The two derivations differ by 5 edges and 9 rows, and disagree on which edges are *dead* — so they are genuinely independent rather than two runs of one template | comparison of A and B tables | confirmed | high |

## The correction — why the parent must verify

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E07** | **Both** derivations reported the statusline lifecycle, the correction-line finalize backstop, and the plan-brief reconcile as behaviors handoff owes and its suite lacks. All three are in fact specified on a **sibling node** | `mission/conductor/conductor.feature:630+` (plan-brief backstop, CR-3); `grep -rIl statusline` → `conductor`, `gateway/manage`, `gateway/init`; `grep -rIl correction` → `conductor` and five others | **refuted** | high |
| **E08** | The cause of E07 is scope, not incompetence: both agents were pointed at `start-mission` Step 4, which narrates those duties inline as part of handoff, and neither was given the sibling node. Taken at face value, E07 would have produced ~12 bogus scenarios against the wrong node | derivation briefs; corpus placement | confirmed | high |

## Consensus holes — named by both readers, verified uncovered corpus-wide

| ID | Uncovered edge | A / B row | Verification | Confidence |
|---|---|---|---|---|
| **E09** | **A single-unit cycle lands as one commit** — the positive companion. The decompose group holds only `multi-unit` and `two unrelated concerns`, both negatives, so a subject that never splits anything passes both | A#14 / B#21 | `grep -rIl --include='*.feature' "single unit\|one commit"` → no match | high |
| **E10** | **The delivery shape is a project property, never a per-CR choice** — a convergence claim the prose states flatly | A#13 / B#19 | `grep -rIl "project property\|per-CR"` → no match | high |
| **E11** | **Each writer appends to its own shard; two pods reconcile by reading, not by racing the forge** | A#32 / B#38 | `grep -rIl "own shard"` → only `doctrine/scanner/scanner.feature` (a different node and behavior); `"two pods"` → no match | high |
| **E12** | **A mission that identified no follow-ups records none and files none** — the companion that stops an over-firer manufacturing follow-ups | A#26 / B#33 | `grep -c "no follow-ups\|identified no follow-up\|held nothing"` in `handoff.feature` → **0** | high |
| **E13** | **A relocation touches the spec/suite node only, never the impl** — the freeze scenario covers content, not the impl tree | A#8 / B#10 | `grep -c "impl"` in `handoff.feature` → **0** | high |
| **E14** | **The outward-publish floor *extends* the committed-record floor rather than replacing it** — both existing floor scenarios test only what the stricter floor *adds* | A#57 / B#66 | `grep -niE "absolute path\|username\|\$HOME\|secret"` in `handoff.feature` → **0** | high |

## The reverse direction

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E15** | The standing scenario `an unmerged pull request leaves the source open` / `writes no status transition` was derived by **neither** cold reader from the contract. Either the prose fails to state a real behavior, or the scenario is an orphan | both derivation tables carry no `unmerged` row | confirmed | medium — which of the two it is has not been settled |

## Contract defects surfaced (not coverage gaps)

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E16** | The README answers *"is a `backlog` follow-up proposed?"* **twice, differently**: the use-case row and Step 4 say the classified proposal is emitted, unqualified; the body says a `blocking` follow-up is "*additionally* proposed for admission", implying `backlog` is not | A, contradiction #1 | confirmed | high |
| **E17** | The **deploy** and **chapter** delivery shapes are declared in the spec's shape table but have no scenario. The two readers **split**: A ruled them dead edges (no outcome concrete enough for a wrong implementer to take wrongly); B kept them as live positives. A split between two blind readers localizes the defect in the *contract*, not the suite | A "Underspecified" #2; B#16/#17 | confirmed | high |
| **E18** | The dedupe method (*"at least two keyword combinations: the full title, then the core noun/verb"*) exists **only** in `start-mission` Step 4; the README states no method, so a suite derived from the spec cannot bind a rule the shipped skill mandates | both; B#60 flagged as having no derivable positive companion | confirmed | high |
| **E19** | The README's behavior table is prefaced *"Every scenario in `handoff.feature` maps to one of these behaviors"* and that claim is **false**: the table has 15 rows and no warm-unit-reset row, while the suite carries that scenario | `sed -n '/^| Behavior/,/^$/p'` → 15 rows, none for warm units; `handoff.feature:70-73` has the scenario | confirmed | high |

## Structural properties of the two directions

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E20** | The backfilled map is **1:1 by construction** and therefore **cannot** exhibit a coverage hole: every edge was manufactured from a scenario, so an edge with no scenario has no way to appear | inspection of the method | confirmed | high |
| **E21** | Consequently the backfilled map could not have surfaced **any** of E09–E14, and additionally **masked** E19 by inventing a map group for the unmapped warm-unit scenario | E20 + E09–E14 + E19 | confirmed | high |
| **E22** | The backfilled map's *binding* is nonetheless real: mutating a scenario title, deleting a row, and un-backticking a cell each fire a distinct `check-suite` violation, and the restored file is green | ablation run, three mutations | confirmed | high |
| **E23** | `check-suite` skips map-binding entirely for a spec with no `## Scenario map`, so before the backfill all 55 scenarios bound to nothing and a green `check:spec` was not coverage evidence | `check-suite.mts:399` — "A spec carrying no `## Scenario map` section is SKIPPED, not failed" | confirmed | high |
| **E24** | Coverage of the CFG is **judged, never linted** — a green `check-suite` clears no coverage question even with a map present | `suite-format-governance`, "The executable form" | confirmed | high |

## Population and cost

| ID | Claim | Source | Status | Confidence |
|---|---|---|---|---|
| **E25** | **37 of 40** behavioral nodes in the sdd project spec have no `## Control Flow`; `check-spec-structure` reports **36** `incomplete-node` advisories after handoff was brought to shape (was 37) | `check-spec-structure --spec-dir .agents/specs/sdd` | confirmed | high |
| **E26** | `incomplete-node` is **advisory by deliberate design** — "advisory until a corpus is brought up to the four-section shape, then flipped to blocking by a follow-up" — which is why the gap read as green for the node's whole life | `check-spec-structure.mts:271-273` | confirmed | high |
| **E27** | handoff is **already oversized**: 44 scenarios against a 40 threshold before CR-6, 55 with it, and 61 if E09–E14 are filled | `check-spec-structure` oversized-node finding, measured before and after | confirmed | high |
| **E28** | Two cold derivations cost ~128k subagent tokens and ~13 minutes wall-clock, run in parallel | task telemetry | confirmed | high |
