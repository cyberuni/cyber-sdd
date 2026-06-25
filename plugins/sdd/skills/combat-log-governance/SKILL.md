---
name: combat-log-governance
description: "Internal skill: the SDD combat-log contract — the two-face provenance record (frontmatter current-state plus an append-only log ledger), the per-subagent report and correction-with-cause entry shapes, the matchable cause enum, the strategy log-entry slot, and log write-ownership. Loaded by sdd-operator, validate-spec, and the doctrine-loop Scanner — not triggered by users directly."
metadata:
  user-invocable: false
---

# SDD Combat-Log Governance

The combat log is the durable, harness-agnostic record of a spec's mission — what was produced, what was judged, what was corrected, and the strategy drafted from it. It is the **primary input** for the doctrine-loop Scanner, which drafts strategy from the combat log **alone**, without raw session transcripts. This skill defines its shape. `sdd-provenance` owns the contract and references this governance as the schema owner; it does not duplicate the schema.

## Two faces, two homes

The combat log has two complementary faces. They live in **two different files**: current-state in `spec.md` frontmatter (contract), the ledger in a sibling `combat-log.jsonl` (operational provenance).

| Face | Home | Shape | Mutability | Holds |
|---|---|---|---|---|
| **Current-state** | `spec.md` frontmatter | `produced-by` (map by role) + `approval` (map by gate: `verdict` + `why`) | **overwritten** — last write wins | the authoritative *present*: who produced each artifact, and the standing verdict per gate |
| **Ledger** | sibling `combat-log.jsonl` | one JSON object per line, appended in order | **immutable** — lines are appended, never edited or removed | the *history*: what happened across the mission, in order |

The current-state face answers *"who produced this, and what is the verdict now?"* The ledger answers *"what happened to get here?"* They do not duplicate: a gate rejection overwrites nothing in `approval` (the eventual `approve` stands there), but the rejection is preserved forever as a correction line in the ledger. This is the load-bearing reason the ledger exists — current-state alone loses every correction.

**The ledger is operational provenance, not contract.** `combat-log.jsonl` is **never frozen and never gated**: it keeps appending across the whole lifecycle, including while `spec.md` and the `.feature` are frozen at `approved`. The freeze and the gates govern the contract (`spec.md` + the `.feature`) only — never the sibling ledger.

Write flow: the operator dispatch **overwrites** the current-state face in `spec.md` and **appends** lines to `combat-log.jsonl`; the doctrine-loop Scanner reads the ledger post-hoc and **appends** strategy lines.

## The `combat-log.jsonl` ledger

The ledger is a sibling file next to `spec.md` and the `.feature`, holding **one JSON object per line** (JSON Lines). Every line carries a monotonically increasing `seq` (append order within the spec) and a `kind`. Three kinds:

### Per-subagent report entry

One line appended per production-chain dispatch, so a later reader reconstructs what each delegate did without the transcript.

```jsonl
{"seq": 3, "kind": "report", "role": "spec-producer", "agent": "sdd:sdd-scenario-writer", "outcome": "pass", "summary": "wrote 14 scenarios covering the ledger expansion"}
```

`role` is the production role dispatched; `agent` is the plugin-qualified agent name; `outcome` is `pass | fail`.

### Correction-with-cause entry

The hard requirement. One line appended for every correction: a gate rejection, a producer⇄judge iteration, or a Council kick-back. The matchable `cause` is the **load-bearing field** — cross-mission recurrence detection groups and counts corrections by `cause` across N specs' ledgers.

```jsonl
{"seq": 7, "kind": "correction", "correction-kind": "gate-reject", "cause": "coverage-gap", "detail": "spec gate rejected — no negative scenario for the malformed-entry path"}
```

- **`correction-kind`** — the closed set `gate-reject | judge-iteration | council-kickback`. This names the *occasion* of a correction, not its cause; do not conflate the two.
- **`cause`** — a **minimal, discovered enum**. The matchable category of *why* a correction happened, not free text. It **starts minimal** — only values grounded in corrections this project actually observed. Two are grounded so far:

  | Cause | Means | Grounded in |
  |---|---|---|
  | `coverage-gap` | a use case or operation lacked a covering scenario | a gate rejection for a missing scenario was observed |
  | `design-overreach` | the design added a mechanism the architecture did not need (e.g. an unnecessary sentinel / path) | a Council rejection of a design that introduced a superfluous sentinel |

  **Growth principle.** The enum is **closed at any point in time**, but it is **discovered from usage, not designed up front**: a new `cause` value is **added** only when a real, recurring correction has no existing category. Fewer is better — speculative categories are not seeded. The two growers of the enum:

  1. the **doctrine-loop Scanner's** recurring-pattern detection (in-repo, already specced) — it surfaces a recurring `cause` across the corpus and proposes adding it.
  2. the **Forge loop** (`sdd-forge-loop`) — a separate, **opt-in**, lower-priority spec. It collects real corrections from actual plugin usage across installations, privacy/security-gated and optional, and routes them to the maintainers. It imposes no dependency here; it is named only as a prospective second source of grounded causes.

  **Who edits the enum.** A grower *proposes* a value; **adding it is an edit to this governance, ratified by the Council** (the same positional authority that ratifies any contract change — a producer/judge/operator never edits the enum on its own). Until the value is ratified into this governance, an off-enum `cause` still fails closed.

  The mechanics are unchanged regardless of how the enum grows: `cause` is a **closed enum at any point in time**, the matchable field recurrence detection groups by; a `cause` value that is **absent or off-enum** is a **structural error** (it breaks matchability), not valid provenance, and **fails closed**. `validate-spec` fails a correction entry whose `cause` is absent or off-enum.

### Strategy log-entry slot

The Scanner records drafted strategy to the ledger. This governance defines the **shape** of that line; the **write** is owned by the doctrine-loop Scanner, **not** by provenance writers.

```jsonl
{"seq": 12, "kind": "strategy", "recommendation": "codify the coverage-gap pattern as a spec-governance check", "evidence": ["coverage-gap x3 across sdd-foo, sdd-bar, sdd-baz"], "ratified": false}
```

`evidence` lists the corrections that drove the recommendation; `ratified: false` means the Council holds keep-or-cut — unratified strategy never enters the corpus.

## Write ownership

All writers append lines to the sibling `combat-log.jsonl` — no writer touches the ledger through `spec.md` frontmatter.

| Writer | May append | Never writes |
|---|---|---|
| **operator** | `report` and `correction` lines (same boundary as `produced-by` / `aligned` / a self-asserted `approval`) | strategy lines |
| **doctrine-loop Scanner** | `strategy` lines | report / correction lines |
| **producers / judges** | nothing | the entire ledger — they do not know their own registry identity authoritatively |

The ledger is append-only for every writer: lines are added with the next `seq`, never edited or deleted. History is a fact about the past; it is never rewritten on the basis of the present.
