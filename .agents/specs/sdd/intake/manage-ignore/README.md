---
spec-type: behavioral
concept: intake
---

# manage-ignore — curate the `.sddignore` file

The **manage-ignore** procedure: the curation interface for `.agents/sdd/.sddignore`, the
optional gitignore-syntax file `resolve-tracking` consults to decide whether an artifact is
**tracked** or **ignored**. It exists so a user curates the ignore rules through a clean
interface instead of hand-editing the file — the same split `manage-spec-anchors` gives the spec
anchors. It is the **write** side of the ignore file; `resolve-tracking` is the **read** side.
The concrete engine is the [`manage-ignore`](../../../../plugins/sdd/skills/manage-ignore/) skill,
loaded in-session by the `../../gateway/`-fronted **manage** gateway.

## Use Cases

**Subject** — listing, editing, inducing, and previewing `.agents/sdd/.sddignore` rules.
**Non-goals** — it does not *resolve* an artifact's tracking signal (`resolve-tracking`'s job),
does not scaffold or gate anything, and writes **only** `.sddignore` — never a `spec.md`,
`status`, `approval`, or a freeze.

| Trigger | Inputs | Outcome |
|---|---|---|
| **list** the ignore rules | a repo root | every rule in `.sddignore`, in order; a missing file lists nothing without error |
| **add / remove** a rule | a repo root, a gitignore pattern | the rule appended (creating the file if absent) or dropped; a malformed pattern is refused; removing an absent rule is a no-op |
| **induce** a pattern from a sample path | a repo root, a sample path | a literal-path candidate and a `**` generalization, offered not saved |
| **preview** a pattern | a repo root, a candidate pattern | the paths the pattern would ignore (and any a `!` would re-track), without persisting it |

Every scenario in [`manage-ignore.feature`](./manage-ignore.feature) maps to one of these entry
points.

## Curate with preview

The intended flow mirrors `manage-spec-anchors`: take the user's sample path → **induce** it →
**preview** each candidate to show the affected paths → confirm with the user → **add** the
chosen rule. Never write a rule the user has not seen the effect of. Because `.sddignore` is
**last-match-wins**, `manage-ignore` appends in order and preserves it — a later `!rule`
re-tracks a path an earlier rule ignored, so order is meaningful and never re-sorted.

## Boundaries

Writes **only** `.agents/sdd/.sddignore` — operational config, not spec content, so the
`manage` gateway's write-ownership guard holds. It does **not** resolve tracking or read specs.
Validation is on the **write** side (a malformed pattern is never persisted); the read-side
fail-safe (a corrupted file never breaks intake) is `resolve-tracking`'s guarantee. When `node`
is absent, an agent performs the same edits by hand: read the file, apply the CRUD, validate a
line is a well-formed gitignore pattern, and preserve rule order.
