---
name: sdd
description: Use this skill when the user explicitly invokes SDD or wants to work on a creation artifact with Spec-Driven Development.
---

# SDD

Gateway skill for Spec-Driven Development — the front door to the project. It **activates** SDD, gathers missing intent, classifies what the user wants to do to the project, and **loads the handling skill in the current session**, where the session works the task directly. It is a **thin classifier**: it holds **no production logic**, loads **no governance**, and writes no contract state. It does not edit project files, register hooks, install packages, or require a CLI command.

For an attended session the gateway **spawns nothing** — it loads the matched skill (for a change to the project, `start-mission`) in the **main session** and the work proceeds there. The session itself is the **conductor** (the user in the driver's seat). The only thing the gateway spawns is the **automaton** — the headless driver — when there is **no user channel** (an unattended scheduler or a multi-CR fan-out).

> **Model is set by the skill you load, not here.** The gateway does not pin a model: classification is light, but the skill it loads declares the model + effort its work needs (`start-mission` advises a capable model for the live grill). The routed skill advises; the user switches manually. (Harness gap: the gateway cannot switch the session model itself.)

## Gateway intake

Treat `$sdd`, "use SDD", and "use Spec-Driven Development" as explicit activation. **Most** activating requests are CRs; classification decides which source carried it and which skill handles it. A task with **no suite-relevant behavior**, or one confined to an **ignored** surface, is **not a CR** and escapes (below); recognition is the grill, so ambiguity routes *into* the lifecycle and is decided during explore.

### Surface pending strategy

When the Council re-enters, **surface the count of pending (unratified) strategy** — count the `strategy` lines with `"ratified": false` globbed from the project's **root `ledger/` shards** (the durable sibling directory of the root `spec.md`; a legacy `ledger.jsonl` still counts) and state "N pending strategy" alongside the intake; if the Council picks it, route them to review those entries. Count only `kind: strategy` — the conductor's `kind: leash` run-start blocks are **not** strategy and never counted. The gateway only *surfaces* the count — it never **drafts** strategy (the Scanner's job) nor **ratifies** it (the Council's positional act). A zero count is not surfaced. (`strategy` lives in the durable `ledger/` shards, **never** in the per-mission `*.log.jsonl` combat log.)

### Surface in-progress missions

On re-entry, **surface the resumable missions** — run the **`discover-plans`** skill (the engine for `intake/plan-discovery`), which scans `.agents/plans/` for `*.plan.md` briefs and returns each one's CR ref, todo tally, and `## NEXT` lead as TOON. A present brief is an **unretired** mission (the doctrine loop's `plan-retirement` deletes a brief once its CR is done/merged and distilled), so each one listed is **resumable**; state them alongside the intake (e.g. "3 in-progress: `github-34` 21/34, …") and, if the user picks one, **load `resume-mission`** on it. The gateway only *surfaces* — it never **resumes** (that's `resume-mission`) nor **retires** (that's `plan-retirement`). An empty set is not surfaced. This is a **read** (the same category as counting strategy lines), so the thin-classifier rule holds.

This is the **resumable-mission** sibling of surface-pending-strategy — two distinct concerns, both surfaced: pending strategy is the doctrine loop's unratified ledger lines for the **Council** to keep-or-cut; in-progress missions are **paused work** any user can continue.

### Fast path — skip the menu

When the invocation already names **both** a change and a target — "add a start-mission skill to sdd", "implement the auth capability", "work on <issue url>" — skip the menu and load the handling skill directly. A partially-specified request resolves what it can and asks only for the missing piece, within the four-option rule.

### Two-level menu — bare invocation

When `$sdd` is invoked with no work item, artifact, or action, do not guess. Conduct intake as a **two-level menu**, never a flat list. **Never ask more than four options** in a single `AskUserQuestion` (the tool rejects more than four). The top-level question presents **exactly four** options:

| # | Top-level option | Covers |
|---|---|---|
| 1 | **Make a change to the project** | open a CR against the project spec (add a capability, revise behavior, implement, land) → `start-mission` |
| 2 | **Manage the corpus** | setup & discovery, inspect, audit, or housekeeping (non-mission) → `manage` |
| 3 | **Review pending strategy** | the doctrine loop's unratified `strategy` lines, when any are pending |
| 4 | **Help me choose** | scan the spec + statuses, suggest the most-actionable few (≤ 4), let the user pick |

When a derived list would exceed four, present only the most-actionable few (≤ 4) or ask the user to name the target directly; never enumerate into an over-four question and never truncate silently.

### Scan statuses with discover-specs

For **Help me choose** — and whenever it needs to locate the project spec or rank the most-actionable few — the gateway runs the **`discover-specs`** skill, the frontmatter-only engine for `corpus/discovery`. It returns the TOON list of every project spec at the SDD spec locations — the three fixed conventions plus any opt-in extra anchors a project declared (ADR-0019) — with its `status`, `project-path`, and gate `approvals`; the gateway ranks from that and never opens a spec body. This is a read, not production logic — the same category as counting `ledger/` shard lines for pending strategy — so the thin-classifier rule still holds.

**No spec found offers spec anchors.** When `discover-specs` finds no spec for a target project, do not assume it was simply never scaffolded — its spec may sit off the three fixed conventions and need a declared extra anchor. Offer `manage-spec-anchors` (via `manage`) alongside `backfill-project-spec` as entry points, rather than routing straight to backfill.

## The routing table is the user-skill→capability index

Classification routes a request to the **skill** that handles it; the routing table doubles as the index of what a user can invoke (there is no separate `skills.md`).

| User intent | Skill (handler) |
|---|---|
| Make any change to the project / spec (add, revise, implement, land) | **`start-mission`** — opens a CR against the project spec and runs the mission loop |
| Manage the corpus — setup & discovery, inspect, audit, or housekeeping (non-mission) | **`manage`** — the manage dispatcher; loads the matching corpus engine in-session |
| A task with no suite-relevant behavior, or confined to an ignored surface (not a CR) | **escape** — proceeds outside the lifecycle, leaves no SDD record |
| Product / structure / process retrospective, or field corrections | the **campaign / formation / doctrine / forge** loop — emits a new CR (→ `start-mission`) |

One project is one spec — routing classifies *what a user wants to do to the project*, never *which spec in a fleet*. Almost every change is one entry — `start-mission` — which runs the mission loop; whether the CR adds a capability, revises behavior, or reconciles overlap is decided during its **explore** phase, not by a separate entry skill.

## Load the handling skill in-session

When the route resolves, **load the matched skill in the current session** and work the task directly — spawn nothing.

- **Default (a user session hosts the conductor): load in-session.** For a change to the project, load `start-mission`; it runs the mission loop over the project spec. The session **is** the conductor (the user in the driver's seat); it holds the user channel directly and spawns only the **cold judges** and the **impl-producer builder** at depth 1, where grader independence requires it.
- **Headless (no user channel — an unattended scheduler or a multi-CR fan-out): spawn the automaton.** The **automaton** is the headless driver (the orchestrator delegate). It runs the same mission loop with no human in the seat: it self-asserts at the autonomy bar and batches `needs-input` rather than asking live, and whatever spawned it relays those questions. The automaton is **not** a separate orchestrator role — it is the driver run headless.

### Dispatch the approved queue — the multi-CR fan-out

When the work is a **queue of already-reviewed missions** (each brief cleared with `status: approved`), run the **dispatch loop** — entered by an attended "run the approved missions" request or an unattended trigger (cron):

1. **Select the queue.** Run `discover-plans --status approved` — the approved briefs, in list order. An empty queue is a no-op.
2. **Run sequentially, one fresh automaton per mission.** For each brief: if it has no remaining todos, **skip** it (nothing to run); otherwise **spawn a fresh `sdd-automaton` on that brief** — a cold context that reads only its own brief + on-disk artifacts. Collect its verdict packet, then move to the next. **Never run two missions in parallel on the shared working tree.**
3. **Relay, never guess.** On a `needs-input` verdict, relay it live (attended) or batch it up the relay (unattended); never auto-accept past it. On a `halt` verdict, **stop that mission** and relay the halt (do not continue it), then move to the next brief.

The **fresh spawn per mission is deliberate** — each automaton's context dies with it, so nothing carries from one mission to the next and the dispatch session holds only the queue + small verdict packets (not compaction, which would bleed a prior mission's settled decisions into the next grill). Dispatch **spawns and relays only** — it writes no contract state; each mission's automaton self-asserts and writes its own ledger lines, and the `approved` flag is the human's (set via `pause-mission --approve`), never dispatch's.

**Write-ownership.** The gateway writes **no** contract state. The internal spec / impl gates own the `status` write and the human ratification of `approval`; the conductor (the in-session user, or the automaton when headless) owns any provisional self-assertion. The gateway writes neither.

## Recognize the escape and the freeze

- **Escape.** A task that is **not a CR** escapes: create no draft, invoke no gate, and **write no record** (a non-CR is not SDD's to track; a spec-prose-only change is already in git). Two independent triggers: **no suite-relevant behavior**, or an **ignored** touched artifact. Escaping does not mean stopping — if the artifact-type has a producer with an escaped-request entry point (e.g. `define-skill` for `skill`), invoke it directly to do the actual work; only state "leaving the lifecycle" and stop when no such producer exists. For tracking, run the `resolve-tracking` skill (`intake/resolve-tracking`'s concrete engine) per touched artifact:

  ```bash
  node "<resolve-tracking skill>/scripts/resolve-tracking.mts" --root . --path <repo-relative-path> [--artifact-type <type>] [--explicit tracked|ignored]
  ```

  `--explicit` carries a tracking statement the requester made directly in the prompt/CR, when present. Pass `--artifact-type` when convention already makes it obvious (`skill` under `skills/`, `subagent` under `agents/`, …) — a full `resolve-governances` classification is not needed just to gate the escape check. An `ignored` result escapes the same as no-suite-relevant-behavior; a `tracked` result (including the fail-closed default) proceeds toward CR classification. This is a **read**, the same category as counting strategy lines or scanning specs — the thin-classifier rule still holds. Recognition is the **grill + impact analysis**, not a gateway classifier — the grill may carve a CR out of the tracked parts of a mixed request and escape the ignored ones. Ambiguity defaults *into* the lifecycle and is decided during explore.
- **Freeze.** SDD freezes the `.feature` at approval. A request to change a frozen scenario is **not** edited in place; it loads **`start-mission`**, which grills the spec back open through the explore phase before scenarios may be revised.
