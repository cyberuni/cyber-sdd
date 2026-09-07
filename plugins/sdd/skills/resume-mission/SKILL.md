---
name: resume-mission
description: "Resume an in-progress SDD mission from its plan brief. Use when asked to 'load the plan', 'resume the mission', 'continue github-NN', or otherwise pick up an SDD .plan.md where it left off — re-establish the working method and spec context, find the next todo, and continue without relitigating settled ground."
---

# Resume an SDD mission from its plan

An SDD mission is carried by a single tracked **plan brief** at
`.agents/plans/<cr-ref>.plan.md` (the portable handoff artifact). The plan is the **state**;
this skill is one convenient **procedure** for picking it up — any session that reads the plan
can continue without it. It re-establishes context from the brief and continues the Mission Loop
where it left off.

## Procedure

1. **Open the plan — create it if missing.** Open `.agents/plans/<cr-ref>.plan.md` and read it in
   full: the frontmatter `todos` (the ordered task list; `status: pending | in_progress |
   completed`) and the body (working method, resolved decisions, findings, `## NEXT`). **If no
   plan exists** (the mission was never intook), scaffold a minimal one from a basic template
   (frontmatter `todos` + a `## NEXT` anchor) and start the mission from there.

2. **Find the next action.** Resume the single `in_progress` todo if one exists; otherwise the
   first `pending` todo whose prerequisites are met. The body's `## NEXT` section names the
   live frontier and any blocking decisions — honor it over guessing.

3. **Re-establish the bars — from disk, this segment.** Before the segment runs any production role
   or gate, re-run the governance matcher (`sdd:resolve-governances`) for the role being resumed and
   the artifact-types of the files it will touch, and **load each resolved bar from disk now**.
   Declare the loaded set exactly as a first segment does, so the gate's pre-flight reads a resumed
   segment on the same terms — a resume is not an exemption from it.

   **A summary of a bar in the brief is a decision record, never the bar.** The brief faithfully
   records what was *decided* and says nothing about what was never *read*, so a governance skipped
   in segment one leaves no trace and would otherwise be inherited silently forever. Where a loaded
   bar **contradicts** a resolved decision, the bar wins: reopen that decision and name the bar as
   the evidence. A segment that runs neither a production role nor a gate owes no bar and declares an
   empty set rather than omitting the declaration.

   The mechanism is that the declared set is **re-derived** from this segment's own resolution rather
   than copied forward. Where the two sets coincide the declaration alone cannot distinguish a loader
   from an inheritor; where an earlier segment skipped bars it recorded a **smaller** set, and that is
   the case that matters and the one this surfaces.

4. **Reload the working method — do not relearn or relitigate it.** The plan records *how this
   mission is run* (its phase model, per-step rhythm, suite/impl conventions, which plugin or
   spec dirs are baseline vs fresh). Treat resolved decisions (the `## Resolved decisions`
   block) as settled; reopen one only on new evidence, and say so.

5. **Load only the spec context the next todo needs.** For a capability sub-mission, read that
   capability's `README.md` under `.agents/specs/<project>/<cap>/` plus the SDD design rules and
   governances it references — not the whole tree.

6. **Continue, committing per unit.** Work in the plan's stated rhythm; commit each coherent
   unit (Conventional Commits, one concern, tests green). Update the todo `status` and record
   any new finding or decision **back into the plan** as you go, so the next resume is clean.

7. **Surface blocking decisions; never guess past them.** If `## NEXT` names an open decision
   (a scope call, an unresolved `<!-- open: -->` marker), raise it before proceeding past it.

## Guardrails (carried across sessions)

- **Reason to the correct answer, not a vote.** On a contradiction, reason from the design's
  *intent*; corroboration, implementation, and recency are evidence to weigh, not ballots to
  tally. Fix the side that is wrong.
- **Spec the behavior, then build.** A skill or governance is a testable capability — spec it
  (prose + a per-unit `.feature`) before or alongside building its implementation; never
  hand-edit an implementation as a shortcut around its spec.
- **Respect the baseline.** Build fresh where the plan says fresh; never mutate a directory the
  plan marks as the untouched reference baseline.
- **Commit boundary.** The unit of work is one co-committable change (clear message, green
  tests) — not the whole CR. A CR's mission lands as many commits.
