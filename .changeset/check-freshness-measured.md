---
"cyber-aced": minor
---

`check-freshness` now reads measured records. Run `check-freshness --suite <suite> --arm <label>` to find the newest record the bench engine wrote for that arm under `.agents/aced/results/bench/<suite>/` and compare its `evaluated` set with the working tree. A changed `tasks.json`, a changed or removed check, or a changed `file` arm source reads `stale`; a record with nothing to compare reads `absent`. It exits zero only for `current`.
