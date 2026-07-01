---
spec-type: behavioral
concept: corpus-structure
---

# place-node — suggest a provisional home for a new node

The **place-node** procedure: given a new node's `concept` (and optional name), suggest a **provisional
capability home** and surface possible **duplicates**, so explore places the node in one lookup instead
of holding the tree in its head ([`../../design/spec-layout.md`](../../design/spec-layout.md)). It is
**read-only and advisory** — it writes nothing and decides nothing; the placement is provisional and
finalized at handoff ([`../../mission/handoff/`](../../mission/handoff/README.md)).

## Use Cases

**Subject** — suggesting a provisional home + duplicate-catch for a node about to be scaffolded.
**Non-goals** — it never writes, never relocates (that is handoff), never audits node-shape (that
is `../check-spec-structure/`), and never reads a node body (frontmatter only, like `../../corpus/discovery/`).

| Trigger | Inputs | Outcome |
|---|---|---|
| **suggest a home** — explore is placing a new node | a corpus dir + the node's `concept` | the capability folders where that concept already lives, ranked by how many of its facets sit there — the provisional home |
| **a concept with no prior home** | a corpus dir + a `concept` no node yet carries | an empty home suggestion — a new concept; explore picks any plausible capability, finalized at handoff |
| **catch a duplicate** — guard against re-creating an existing node | a corpus dir + the node's name | the existing nodes whose name overlaps — "belongs near X" |

Every scenario in [`place-node.feature`](./place-node.feature) maps to one of these entry points or to
the read-only boundary that closes this spec.

## How a home is suggested — derivation, not a registry

The suggestion is **derived from the corpus's own `concept:` tags**, never a stored routing list (the
`../../corpus/discovery/` no-drift rule): the home for a concept is **where that concept's facets already sit**.
A concept enacted across `design/` + `mission/` suggests those capabilities; the human tie-break rules
for genuinely contested overlaps live in the placement-map routing table
([`../../design/spec-layout.md`](../../design/spec-layout.md)), which `place-node` points to rather than
re-deriving.

## The read-only boundary

`place-node` **writes nothing** — no scaffold, no relocation, no frontmatter. It emits the suggestion
and stops; a concept with no prior home is a normal input (empty suggestion), never an error. Placement
is provisional and cheaply finalized at handoff, so a suggestion never has to be correct — only useful.
