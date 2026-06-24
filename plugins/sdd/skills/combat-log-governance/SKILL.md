---
name: combat-log-governance
description: "Internal skill: the SDD combat-log contract — the two-face provenance record (frontmatter current-state plus an append-only log ledger), the per-subagent report and correction-with-cause entry shapes, the matchable cause enum, the strategy log-entry slot, and log write-ownership. Loaded by sdd-orchestrator, validate-spec, and the doctrine-loop Scanner — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Combat-Log Governance

The combat log is the durable, harness-agnostic record of a spec's mission — what was produced, what was judged, what was corrected, and the strategy drafted from it. It is the **primary input** for the doctrine-loop Scanner, which drafts strategy from the combat log **alone**, without raw session transcripts. This skill defines its shape. `sdd-provenance` owns the contract and references this governance as the schema owner; it does not duplicate the schema.

## Two faces

The combat log has two complementary faces, both in `spec.md` frontmatter.

| Face | Shape | Mutability | Holds |
|---|---|---|---|
| **Current-state** | `produced-by` (map by role) + `approval` (map by gate: `verdict` + `why`) | **overwritten** — last write wins | the authoritative *present*: who produced each artifact, and the standing verdict per gate |
| **Ledger** | `log` — an append-only list of entries | **immutable** — entries are appended, never edited or removed | the *history*: what happened across the mission, in order |

The current-state face answers *"who produced this, and what is the verdict now?"* The ledger answers *"what happened to get here?"* They do not duplicate: a gate rejection overwrites nothing in `approval` (the eventual `approve` stands there), but the rejection is preserved forever as a correction entry in `log`. This is the load-bearing reason the log exists — current-state alone loses every correction.

Write flow: the orchestrator dispatch **overwrites** the current-state face and **appends** to the ledger; the doctrine-loop Scanner reads the ledger post-hoc and **appends** strategy entries.

## The `log` ledger

`log` is a frontmatter list. Every entry carries a monotonically increasing `seq` (append order within the spec) and a `kind`. Three kinds:

### Per-subagent report entry

One appended per production-chain dispatch, so a later reader reconstructs what each delegate did without the transcript.

```yaml
- seq: 3
  kind: report
  role: spec-producer            # the production role dispatched
  agent: sdd:sdd-scenario-writer # plugin-qualified agent name
  outcome: pass                  # pass | fail
  summary: wrote 14 scenarios covering the ledger expansion
```

### Correction-with-cause entry

The hard requirement. One appended for every correction: a gate rejection, a producer⇄judge iteration, or a Council kick-back. The matchable `cause` is the **load-bearing field** — cross-mission recurrence detection groups and counts corrections by `cause` across N specs' logs.

```yaml
- seq: 7
  kind: correction
  correction-kind: gate-reject   # gate-reject | judge-iteration | council-kickback
  cause: coverage-gap            # from the cause enum below
  detail: spec gate rejected — no negative scenario for the malformed-entry path
```

- **`correction-kind`** — the closed set `gate-reject | judge-iteration | council-kickback`. This names the *occasion* of a correction, not its cause; do not conflate the two.
- **`cause`** — a **minimal, discovered enum**. The matchable category of *why* a correction happened, not free text. It **starts minimal** — only values grounded in corrections this project actually observed. Two are grounded so far:

  | Cause | Means | Grounded in |
  |---|---|---|
  | `coverage-gap` | a use case or operation lacked a covering scenario | a gate rejection for a missing scenario was observed |
  | `design-overreach` | the design added a mechanism the architecture did not need (e.g. an unnecessary sentinel / path) | a Council rejection of a design that introduced a superfluous sentinel |

  **Growth principle.** The enum is **closed at any point in time**, but it is **discovered from usage, not designed up front**: a new `cause` value is **added** only when a real, recurring correction has no existing category. Fewer is better — speculative categories are not seeded. The two growers of the enum:

  1. the **doctrine-loop Scanner's** recurring-pattern detection (in-repo, already specced) — it surfaces a recurring `cause` across the corpus and proposes adding it.
  2. a **usage-feedback loop** — a separate, **opt-in**, lower-priority spec being drafted independently. It would collect real corrections from actual plugin usage between the plugin's users and the SDD system, privacy/security-gated and optional. It does not exist yet and imposes no dependency here; it is named only as a prospective second source of grounded causes.

  **Who edits the enum.** A grower *proposes* a value; **adding it is an edit to this governance, ratified by the Council** (the same positional authority that ratifies any contract change — a producer/judge/orchestrator never edits the enum on its own). Until the value is ratified into this governance, an off-enum `cause` still fails closed.

  The mechanics are unchanged regardless of how the enum grows: `cause` is a **closed enum at any point in time**, the matchable field recurrence detection groups by; a `cause` value that is **absent or off-enum** is a **structural error** (it breaks matchability), not valid provenance, and **fails closed**. `validate-spec` fails a correction entry whose `cause` is absent or off-enum.

### Strategy log-entry slot

The Scanner records drafted strategy to the combat log. This governance defines the **shape** of that entry; the **write** is owned by the doctrine-loop Scanner, **not** by provenance writers.

```yaml
- seq: 12
  kind: strategy
  recommendation: codify the coverage-gap pattern as a spec-governance check
  evidence: [coverage-gap x3 across sdd-foo, sdd-bar, sdd-baz]  # the corrections that drove it
  ratified: false   # the Council holds keep-or-cut; unratified strategy never enters the corpus
```

## Write ownership

| Writer | May append | Never writes |
|---|---|---|
| **orchestrator** | `report` and `correction` entries (same boundary as `produced-by` / `aligned` / a self-asserted `approval`) | strategy entries |
| **doctrine-loop Scanner** | `strategy` entries | report / correction entries |
| **producers / judges** | nothing | the entire `log` — they do not know their own registry identity authoritatively |

The ledger is append-only for every writer: entries are added with the next `seq`, never edited or deleted. History is a fact about the past; it is never rewritten on the basis of the present.
