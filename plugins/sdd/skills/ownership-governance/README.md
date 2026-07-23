# ownership-governance

This is an internal SDD governance about write ownership.

It answers one question for every artifact in the SDD workflow: **who may write it — and who never
may.** Every act in the workflow has a write leash, and this skill is the canonical matrix. One
writer per field or artifact; no role writes outside the spec it owns or spawns specs on its own.

## Who writes what

The full matrix lives in the skill body; condensed, the ownership falls into a few hands:

| Artifact | Written by | Notable exclusions |
| --- | --- | --- |
| `spec.md` body + the `.feature` | the **spec-producer** | the conductor, judges, other producers |
| A `@pinned` scenario | the **user** (in-session) | every agent role — it proposes, never executes |
| `<unit>.solution.md` | the **solution-producer** | the spec-producer, judges |
| Implementation + its verification | the **impl-producer** | the impl-judge (it *runs*, never authors) |
| `status` + human ratification of `approval` | the **gate skill** (`spec-gate`), in-session position only | the conductor, any producer |
| Coordination state — `<!-- open: -->` markers, `produced-by`, run-level leash, self-asserted approvals, plan brief, combat-log and ledger lines | the **conductor** | producers, judges, the gate skill |
| Ledger `strategy` lines | the doctrine-loop **Scanner** | everyone else |

Appended log and ledger lines carry a pseudonymous `handle`; the in-file attribution is advisory —
the git commit signature is the attestation.

## The three standing rules

- **Producer write boundary.** A spec-producer writes the `spec.md` body and the `.feature` only —
  never the control frontmatter or the resolution state. A required input it cannot supply comes
  back as a `CONTENT_GAP`; the conductor turns it into an `<!-- open: -->` marker. Producers never
  write markers directly.
- **Ratification authority is positional.** A human-attributed gate write belongs to the in-session
  position holding the real user channel. A headless conductor — a spawned subagent with no user
  channel — writes only self-assertions and pauses; it never writes a human ratification, even when
  a coordinator relays "the user approved". A relayed claim is not user confirmation.
- **Never write a frozen `.feature`.** Once a suite carries `@frozen`, no role may add, remove, or
  rewrite its scenarios. A gap that requires changing specified behavior is a `BLOCKER` returned
  upward, never an in-place edit. The freeze binds the contract only — the combat log and ledger
  shards stay writable. Judges never patch: they report.

`@pinned` scenarios sit outside freeze entirely: they are grounded in **ownership**, so the user's
authority over them holds at `draft` and survives a re-open.

## Usage

- **Every producer:** knows the boundary of what it owns and returns `CONTENT_GAP` for what it
  cannot supply.
- **Every judge:** reports findings, never patches `spec.md` or the suite.
- **The conductor:** writes the coordination state — markers, `produced-by`, the run-level leash,
  self-asserted gate entries, and its append-only log and ledger lines.
- **`start-mission` / `spec-gate`:** the gate skill is the sole writer of `status` and human
  ratifications, from the in-session position only.

## Related governances

This contract owns *who writes*. Its neighbors own the surrounding definitions:

- **`lifecycle-governance`** — the field definitions, and what freezing *means* as a state; this
  bar carries only the write constraint.
- **`gate-validation-governance`** — the legality of the resulting state after a write.
- **`combat-log-governance`** — the plan/ledger write split and the record shapes.
- **`suite-format-governance`** — the `@pinned` marker itself and its seed-growth role; this bar
  carries only its ownership.

Internal SDD governance (`user-invocable: false`). Not triggered by users directly.
