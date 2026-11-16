# Preview a spec

Loaded by the `spec` skill's Preview mode.

A preview has two parts. The **view** shows the whole spec at once. The **walkthrough** builds the artifact the spec
specifies from the spec alone. The build is the test: each place the builder has to guess is a blind spot in the spec.

## Input

- **A spec folder:** preview it as it stands.
- **A source document with no spec yet** (a design record, a brief): first draft the whole spec from it by
  [Write](../SKILL.md#write) as a headless run, into a scratch folder, every child included. Link the source under
  References. When the source records its own research (an API check, prior art), link it as the research artifact;
  otherwise record `Research: skipped, preview`. Report what the spec drops from the source and what it adds: actors,
  paths that miss a goal, and decisions the source never made.

Write nothing at the spec's real location except the fixes of step 4, made through Write. Present no spec as ready:
a drafted spec is a draft, and a blind spot left open keeps the spec from being ready.

## 1. Check

Run [Validate](../SKILL.md#validate) on the spec folder and its children. Do not stop on a failure: each failing check
is a finding for the report.

## 2. View

Generate one self-contained HTML page from the spec folder and its children. It shows:

- the outcome, What, and Non-goals, and the table of children with their outcomes;
- each actor and goal, linked to the use cases that serve it;
- each use case with its entry node and extensions, linked to the criteria that cite it;
- the decision graph, rendered, with each edge linked to the criteria that cite it and each `open` node marked;
- each criterion with its ID and its trace (use case and edge), linked both ways, with `UC*` expanded;
- the open questions, the Validate result, and, after step 3, each finding linked to the item it concerns.

A spec is read as a web of IDs spread over files: a goal, its use case, the criteria that cite it, the edges they
bind. A page links each ID both ways and draws the graph, where Markdown files leave both to the reader. A static page
with anchors and a filter by actor or use case is enough: an interactive app adds build cost and state, but no
understanding. When the user asks for Markdown, or no browser is at hand, write one Markdown file with the same parts
and links instead.

The view is derived. Keep it in the scratch folder, never beside the spec, and regenerate it after each fix. Publish
it where the harness offers a page host; otherwise give its path.

## 3. Walkthrough

Build the artifact the spec specifies, in a scratch workspace, from the spec alone: no source document, no code the
spec describes, no memory of the session that wrote it. When the harness can start a fresh agent, give it only the
spec folder, because the author's knowledge fills gaps without anyone noticing.

Go use case by use case, in the order of the children's table. Build the smallest thing that reaches each Success and
each extension's outcome. Where an external system is not at hand, stub it and record the stub. Then decide every
criterion true or false against the build. The user may narrow the walk to named use cases; the report lists the use
cases not walked.

Record a finding, `B1`, `B2`, ..., each time the build hits one of these:

- **Unbuildable:** no behavior can meet a criterion, often because an external system does not allow it (spec C10).
- **Uncheckable:** the build cannot decide a criterion true or false (spec C5).
- **Undecided:** the builder chose between outcomes the spec does not settle, such as a tie-break, a default, or a
  scope.
- **Missing:** an actor the outcome affects, or a path from a trigger, that no use case covers (spec C3, C6).
- **Encoding:** the builder needed a name, value, or format the spec leaves open. This is not a blind spot: by the
  placement test it belongs to a lower rung. List it apart.

Each finding names the spec item's ID, what the builder did, and the outcome it guessed.

## 4. Resolve

Turn each finding except an encoding into a fix that the spec and its sources settle, or an Open question with the
options and a recommendation. Make both through Write, then [Review](../SKILL.md#review) the changed parts, so the
spec's own rules apply. With the user, settle them one at a time, as Write does. In a headless run, put every one under
Open questions. Then regenerate the view.

## Report

In one message: the view's link or path; the build's path and what it stubbed; each finding with its kind, the ID it
concerns, and how it was resolved; the Validate result; and the use cases not walked. The build is evidence for the
spec, not a delivery: it stays in the scratch workspace unless the user decides to keep it.
