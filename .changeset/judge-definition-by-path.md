---
"cyber-sdd": patch
---

The conductor now hands SDD's own judges (`sdd-spec-judge`, `sdd-impl-judge`) to a dispatch capability by their definition file path, `agents/<name>.md` under the SDD plugin root, instead of by name. A capability that looks up definitions only in the project's own agent folder could not find them, so routing a judge through it failed. When the file is not there, the conductor spawns the judge as a portable cold subagent.
