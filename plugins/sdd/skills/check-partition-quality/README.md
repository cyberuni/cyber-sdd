# check-partition-quality

Internal SDD engine (`user-invocable: false`). Measures from a project's **git history** how much
parallel work its layout permits, and compares candidate layouts on the same evidence.

**Why it exists.** SDD's scheduler cuts one mission per spec-node, so a layout that scatters a
capability makes ordinary changes collide and the schedule serializes. That was long asserted rather
than measured; this produces the number, per project, so a layout decision rests on the project's own
history instead of doctrine.

**The headline is the parallelizable share** — how often two changes from history could run in
parallel. Every run also reports a shuffled control, because a partition that cannot beat chance
explains nothing.

**One design note worth keeping.** Two more obvious metrics — within-node co-change ratio, and mean
nodes touched per change — were tried first and **both preferred a layered layout**, because both
reward a coarser partition for being coarse. They are still printed, labelled as confounded, so the
mistake is visible rather than repeatable.

Runnable standalone; opt-in from `scaffold-project-spec` (detection mode, to inform the strategy
choice) and the formation loop (the layout-quality signal). Never a gate. Not triggered by users
directly.
