# manage

The user-facing entry for **manage-level (non-mission) work** on an SDD project — the handler for the gateway's **"Manage the corpus"** route, sibling to `start-mission`. Where `start-mission` **changes what the project specifies**, `manage` does non-mission work on the corpus: **setup & discovery**, **inspect**, **audit & align**, **housekeeping**.

User-invocable. A **thin dispatcher** (the in-session realization of the manage unit): it classifies a manage request and **loads the matching engine in the current session**, holding no production logic, loading no governance, and writing no contract state.

Bakes in: two-level intake (fast path when the operation is named; a four-group menu when bare, within the four-option rule); the group→engine routing table (Setup & discovery → `backfill-project-spec` / `manage-spec-anchors`; Inspect → `discover-specs` / `concept-index` / `place-node` / `discover-plans`; Audit & align → `check-spec-structure` / `formation-loop` / `align-spec` (planned); Housekeeping → `plan-retirement`); loading the engine in-session (read-only engines run in place, write-capable ones stay owned by their engine); and the non-mission boundary — opens no CR, invokes no gate, writes no `status`/`approval`, and **hands a behavior change off to `start-mission`**. Reviewing pending strategy stays gateway-owned, not a manage operation.

Pairs with the `sdd` gateway (which routes its option-2 here) and `start-mission` (which manage hands off to when an operation needs a real behavior change).
