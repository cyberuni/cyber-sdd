# Contributing

Guide for developing `cyberlegion` locally. AI coding assistants should also read [AGENTS.md](AGENTS.md).

## Setup

```sh
pnpm install
```

Node 22+ and pnpm 11 — both pinned in `mise.toml` and `.node-version`.

## Build and test

```sh
pnpm verify              # lint + build + typecheck + test + knip — what CI runs
pnpm test                # tests only
pnpm cl dev --help       # run the CLI from source, no build (tsx)
pnpm cl test:watch       # watch mode
```

`pnpm cl <script>` is the root shortcut for `pnpm run --filter=./packages/cyberlegion <script>`.

## Docs site

The site is Astro + Starlight in `apps/web`, deployed to GitHub Pages by
`.github/workflows/deploy-docs.yml` on any push to `main` that touches `apps/web/**`.

```sh
pnpm web dev       # local dev server
pnpm web build     # production build
```

Pages live in `apps/web/src/content/docs/`.

## Releasing

Changesets drives versions and the changelog; publishing is secretless (npm trusted
publishing over OIDC).

```sh
pnpm changeset     # describe the change and its bump level
```

Merging to `main` opens a version PR; merging *that* publishes. `pnpm version` runs
`scripts/sync-plugin-version.mjs`, which carries the new version into the plugin
manifests under `plugins/cyberlegion/` — add any new manifest to that script's list.

## Commits

Conventional Commits, enforced by commitlint on `commit-msg`. The `pre-commit` hook runs
`biome check` and the test suite, so a red tree cannot be committed.

## Releasing

`cyber-sdd` and `cyber-aced` publish from this repo and carry their release history
(`cyber-sdd@*` and `cyber-aced@*` tags). `cyber-sdd`'s `sdd-check-specs` bin points at the compiled
`skills/check-project-specs/scripts/check-project-specs.mjs`: `universal-plugin plugin build`
compiles every engine from `plugins/sdd/src/` into one committed, self-contained `.mjs` script
under `skills/<skill>/scripts/` (no runtime dependencies, Node 22.11 or later), so the package has
no `dist/` and no separate bin build. `pnpm check:plugins` runs `universal-plugin plugin build
--check` (the package script `check:scripts`) and fails while a compiled script is stale. A test
packs the package and runs the bin from a `node_modules` install (`check-specs-bin`). `cyber-aced`
still ships `aced-bench` compiled to `dist/` with tsdown (Node does not strip types under
`node_modules`); `pnpm build` produces it, and `bench-bin` runs it the same way.

The plugins install a second way: as their tracked files, with no `node_modules`. A skill script
that imports a package cannot resolve it there, so the build inlines gherkin-cli into every
`cyber-sdd` engine that uses it, from one committed bundle (`plugins/sdd/src/vendor/gherkin-cli.mjs`).
After bumping the gherkin-cli pin, run `pnpm --filter cyber-sdd build:vendor`, rebuild the plugin,
and commit the result; `check-suite-installed` fails until you do.

`cyber-quill` is staged but **not yet published**. Its package metadata is complete — name,
license, `files`, `repository` — and it is held at `"private": true` so a push to `main`
cannot publish it by accident. To cut its first release, drop `"private": true` from its
`package.json`, add a changeset, and merge the release PR.
