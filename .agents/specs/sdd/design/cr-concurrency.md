---
concept: orchestration
---

# CR concurrency — one CR per working tree

A CR is an abstraction of a suite delta, and a suite delta lands as code.
Code already does parallel-isolated work one way: **branches and working trees**.
So SDD does not build a CR-concurrency manager — git is it.

- **One mission operates on one working tree, one CR at a time.**
  A mission runs explore → deliver → handoff serially in the tree it was handed; the conductor never interleaves two CRs in one tree.
- **Parallelism is separate trees.**
  Two CRs run at once by running two mission instances on two trees (e.g. git worktrees).
  SDD stays **tree-agnostic** — it does not create, track, or clean working trees; whoever invokes it supplies the tree.
  (Owning worktree lifecycle — creating and tearing down ships — is the `cyberfleet` CLI's concern
  (`spawn` / `decommission`), not an SDD concept.)
  SDD is branch-aware only at **handoff**, where it lands the result in the project-declared delivery shape (commits to `main` / branch → PR).
- **Which tree gets which CR is settled at the source, not in git.**
  Git locks *files*; it says nothing about two trees grabbing the same *CR*.
  That CR-level lock is the **source claim**: a mission claims its CR at intake (assigns the issue → `accepted`) before work begins, so no second mission picks it up (`../intake/README.md`).
  Git file-locking and the source-claim are the two granularities of the same concurrency story.
- **Cross-CR file collisions are git's job.**
  "No two producers on the same file" holds *within* one CR (conductor orchestration discipline; see `specialists-and-squads.md`).
  Two CRs on separate trees touching the same file collide as an ordinary **git merge conflict** at handoff — resolved the normal way, not by an SDD lock.
  The **durable ledger is exempt**: it is a `ledger/` directory of per-CR-per-writer shard files, so two concurrent missions append to different files and never collide (ADR-0020, `provenance-model.md`) — the one high-frequency shared-file case is designed out, not merge-resolved.
- **Overlapping frozen scenarios → the hard floor.**
  If a landing CR's frozen `.feature` was changed by another CR since its branch point, the landing CR rebases onto the new baseline; if its frozen scenarios now contradict, that is **Conflict resolution** (or **Clearance** if one clearly supersedes) per `autonomy-rubric.md`.
  Parallelism's cost is paid at merge, where git already makes you pay it.
