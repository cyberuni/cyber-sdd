---
title: init-quill
description: Register Quill as the SDD documentation plugin for a project — run the registration, confirm the entry landed, and read what it binds.
---

Installing Quill does not switch it on. The [SDD](/sdd/overview/) conductor decides which plugin serves a piece of work by reading one file — the project's plugin registry at `.agents/universal-plugin.json` — and nothing else. Until Quill has an entry in that file, an installed Quill is invisible at run time: your documentation mission runs, SDD's default chain produces something, and nothing reports that Quill never appeared.

`init-quill` is the skill that writes that entry. This page takes you through running it, confirming it landed in your own project, and reading what the entry binds.

## Before you start

| You need | Where it comes from |
|---|---|
| Quill installed in the project | [Quill overview](/quill/overview/) — it owns the install command |
| A project that uses SDD, at the level of knowing what a mission is | [SDD overview](/sdd/overview/) |

Beyond those two, everything the steps below need is introduced on this page.

## Register Quill

1. **Work from the project root** — the directory the registry file lives at or will be created in. The registration is scoped to one project, and this is the project it will act on.

2. **Set the `init-quill` skill off.** Ask your agent for it in words — *"register Quill as the SDD plugin for this project"* or *"set up Quill for this project"* — or invoke the skill by name, `quill:init-quill`, if your agent takes slash commands. Either way the skill runs the same registration.

3. **Read the report it returns.** It confirms that `.agents/universal-plugin.json` was written, that a `quill` entry is present under `sdd-plugins` stamped with Quill's version, and which artifact-types the entry registers. If it reports an error instead, [the run stopped](#when-the-run-stops) and nothing was written.

Run it once per project. Run it again after a Quill upgrade — [re-running is safe](#re-running-over-an-entry-that-already-exists).

## What the registration changes on disk

The whole effect is on one file:

1. **It finds `.agents/universal-plugin.json` at the project root, or creates it** when the file is not there.
2. **It stamps the entry with Quill's own version**, read from Quill's plugin manifest.
3. **It writes the Quill entry into the `sdd-plugins` array**, creating the array if the file did not already have one.
4. **It writes the file back** with the updated contents.

Nothing outside that file changes.

## When the run stops

The registration stops in two ways, and they are told apart by **what caused the stop**, not by how the message reads. In both cases the registry file on disk is left as it was.

### The registry file does not parse

**Cause:** `.agents/universal-plugin.json` already exists, but its contents are not valid JSON.

The registration **stops with an error**, and the **existing file is left unmodified**. This is deliberate: a registry that cannot be parsed cannot be safely rewritten, and overwriting it could destroy an entry belonging to another plugin that was sitting in the file.

**What you do:** repair the JSON by hand — the usual culprits are a trailing comma, an unclosed brace, or a merge conflict marker left in the file — then run the registration again.

### A squad carries no `governances` block

**Cause:** the entry being written carries a squad with no `governances` block at all.

The payload is **rejected** and the registry file **is not written** — the rejection happens before anything reaches disk, so a half-written entry is not a state you can end up in.

The rule this enforces is worth stating plainly, because it is easy to misread: **a binding inside the block may be `null`, but the block itself must be present.** An empty-valued binding is a legitimate delegation; a missing block is a malformed squad.

**What you do:** add the `governances` block to the squad, then run the registration again.

## Confirm it landed

A report is a claim; the file is the evidence. To check your own project:

1. Open `.agents/universal-plugin.json` and find the **`sdd-plugins`** array. This is where the registration writes, and where the conductor reads.
2. Find the entry in that array named `quill`, and check it **carries a version stamp** — the `version` field, recording the Quill version that wrote it.
3. Check the entry's **squad** — the block inside the entry describing what Quill serves and what it binds — carries a populated **`artifact-types`** field. That field is the list of documentation types Quill claims for itself; the [Quill overview](/quill/overview/) is where that list is kept, so compare against it there rather than against a copy here.

### The entry, block by block

A complete entry holds **one squad**, and that squad carries **three parts**: its `artifact-types`, its `roles` block, and its `governances` block. In place inside the array, the shape is:

```json
{
	"sdd-plugins": [
		{
			"name": "quill",
			"version": "<the Quill version that wrote this entry>",
			"squads": [
				{
					"artifact-types": ["<the documentation types Quill claims>"],
					"roles": {
						"<role key>": "<the agent bound to it, or null>"
					},
					"governances": {
						"<bar slot>": "<the bar bound to it, or null>"
					}
				}
			]
		}
	]
}
```

That is the shape, not the contents — the real entry your run wrote has each key spelled out with its actual value. If your file has one squad carrying all three parts, the entry is complete. [What the entry binds](#what-the-entry-binds) explains what goes in the two blocks.

## Re-running over an entry that already exists

Re-running is the supported way to bring an entry up to date. Running `init-quill` on a project that already carries a Quill entry:

- **Rewrites the existing entry in place.** The entry is found by name and replaced.
- **Adds no second Quill entry** alongside the first. You end with exactly one.
- **Migrates an entry written in an older shape** — the rewrite is the migration, so an entry from a previous Quill layout is brought to the current one by the same run.
- **Rewrites an entry whose recorded `version` differs from Quill's own**, which is what reconciles a stale stamp after an upgrade.

Entries in the array belonging to **other plugins are not modified**, and they are **not reordered**. The run touches Quill's entry and leaves the rest of the array as it found it.

Not sure what the blocks in your entry mean? That is the next section.

## What the entry binds

The squad's two blocks are what the conductor reads at mission time.

### The `roles` block

The block carries the **SDD production-chain role keys**. Each key holds either a **bound agent** — an agent Quill supplies for that role — or **`null`**.

A `null` binding is not an empty slot. It means the **SDD default is used for that role**: SDD's own actor does the work Quill declined to bind an agent for.

### The `governances` block

The block is **required on every squad**, even when every binding inside it is `null` — that is the rule the [rejection above](#a-squad-carries-no-governances-block) enforces.

Each key holds either a bound **bar** — the standard a gate grades work against — or `null`, and a **`null` binding falls back to the SDD default bar for that slot**, the same way a `null` role does.

What that rule does *not* mean is that Quill leans on the SDD defaults throughout: **Quill does not leave every governance binding `null`.** Some slots carry a Quill bar. Which ones is a table this page does not keep — see [the production chain](/quill/production-chain/), which reads it off the registry.

### Questions this page hands off

This page owns the entry's **shape** and how it gets written. Each of these is developed elsewhere:

| Question | Where it is answered |
|---|---|
| What a bound agent actually does, and which agent or bar fills each slot | [Production chain](/quill/production-chain/) |
| What the checks on a document verify, and how a document is judged | [The doc eval model](/quill/doc-eval-model/) |
| What any given bar requires — each bar has its own page, reached from the table that names it | [Production chain](/quill/production-chain/) |
| Which artifact-types Quill claims, and how to install it | [Quill overview](/quill/overview/) |

## Next step

With the entry in place, the next thing to do is **start a documentation mission**. There is no further setup: the conductor resolves the Quill roles straight from the registry entry you just wrote, on any work whose artifact-type the entry claims.

Starting a mission is SDD's job rather than Quill's — [SDD overview](/sdd/overview/) is the page that owns it.
