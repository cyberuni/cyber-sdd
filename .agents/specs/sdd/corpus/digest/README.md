---
spec-type: behavioral
concept: corpus-structure
---

# digest — a read-only, fixed-section summary of one spec

The **digest** procedure: given one spec folder, read its `spec.md` and the sibling `.feature` and
return a fixed-section summary so a small/fast routing model never has to read and summarize the
artifacts itself. It is **read-only and decision-free** — it writes nothing, advances no status, and
renders no verdict. The summary is **structural and domain-agnostic**: derived mechanically from the
artifacts every spec shares, so its shape stays consistent across every domain.

## Use Cases

**Subject** — summarizing one spec folder into the five fixed sections.
**Non-goals** — it never writes, never ranks specs against each other (that is `dedupe-specs`), and
never judges quality (that is the spec gate). It reads exactly one spec.

| Trigger | Inputs | Outcome |
|---|---|---|
| **digest a spec** — a router or human needs a one-spec overview | a spec folder path | the five fixed sections: **What**, **Status**, **Scenarios** (count + names), **Key decisions**, **Open items** |
| **digest a spec with no suite** — the folder has no `.feature` | a spec folder with no sibling `.feature` | the same sections, with **Scenarios** reported as zero — not an error |

Every scenario in [`digest.feature`](./digest.feature) maps to one of these two entry points or to
the read-only boundary that closes this spec.

## The five sections

- **What** — the one-line subject from the spec body.
- **Status** — the lifecycle `status` read from the root `spec.md` frontmatter.
- **Scenarios** — the count and the names of every `Scenario:` in the sibling `.feature`.
- **Key decisions** — the `###` headings under the spec's design-decision section.
- **Open items** — every `<!-- open: ... -->` marker found in the spec.

## The read-only boundary

The digest **writes nothing** — no `status`, no `approval`, no freeze, no edit to any artifact. It
emits the summary and stops. A missing `.feature` is a normal input, reported as zero scenarios,
never a failure.
