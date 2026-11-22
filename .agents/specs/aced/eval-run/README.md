# eval-run/ — score a config against its golden set

Running the eval suite and reporting results: a single run, a before/after comparison, a project-wide health report, and the freshness check that says whether the inputs a recorded result named still hash as recorded.

The **measured** layer lives in [`bench/`](./bench/README.md): real headless runs of a task set, graded by shell checks and compared with permutation statistics, beside the simulated `run`/`compare`.
