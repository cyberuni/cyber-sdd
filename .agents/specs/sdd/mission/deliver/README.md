# mission/deliver/ — the deliver phase (step 3): build to keep

The **deliver phase** of the Mission Loop — step 3, **build to keep**. It runs against the
**frozen** `.feature` (the spec gate has closed) and ends at the **impl gate** (Approved →
Implemented). The orchestrator that sequences this phase is `../README.md`; this folder
holds the deliver-phase detail, not the loop logic.

**Explore vs deliver** is the *purpose of the build*: explore (step 2, `../../authoring/`)
builds to **learn** against the still-draft contract; deliver builds to **keep** against the
frozen contract. The **freeze is the boundary**. Implementation happens in both — deliver is
the one whose output is kept.

## Build to keep, against the frozen suite

- The solution-producer + impl-producer run (warm or spawned per the orchestrator's resolution).
  The impl-producer co-authors the implementation **and** one verification per frozen
  scenario, anchored to the frozen `.feature`, never free-authored. It **never modifies**
  `spec.md` or the `.feature` (a behavior-changing gap is a `CONTENT_GAP` / `BLOCKER`, not an
  in-place edit), applying the **Builder** (coverage) and **Architect** (structure) lenses.
- The cold **impl-judge** runs the producer's verification and adds an orthogonal
  structural/scope read, collapsing any graded subject to a boolean per scenario.

## Low-risk in-flight suite updates

A frozen scenario is not edited here. But low-risk, in-flight adjustments the operator serves
while building — clarifying a detail, an obvious stale-mistake correction — are captured in
the **detail-adjustment report** (a view of the plan's combat log, `../../design/provenance-model.md`),
not escalated. A change that would **narrow** a frozen scenario is **Clearance** (hard floor,
`../../design/autonomy-rubric.md`); a genuine self-contradiction is **Conflict resolution**.
Both escalate per the orchestrator's hard-floor logic — see `../README.md`.

## The impl-gate verification

The deliver phase is where the **impl gate** is exercised: verify the implementation against
the frozen contract — `../../acceptance/` (the e2e outcome suite) **plus the colocated unit
suites** — and set impl-layer `aligned` true **only when every impl-judge passes**. A frozen
scenario with no verification fails and blocks `aligned`. The gate's verdict mechanics, the
leash, self-assertion vs stop, and positional ratification authority are owned by the
orchestrator (`../README.md`); this phase produces the artifacts the gate judges.

## Scenarios (colocated)

Unit scenarios for the deliver phase colocate here: build-against-the-frozen-suite, the cold
impl-judge running the producer's verification, an uncovered frozen scenario failing the
gate, low-risk in-flight adjustment captured in the report. Cross-capability outcome (e2e)
scenarios live in `../../acceptance/`.
