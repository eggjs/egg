---
title: PR preview packages
type: workflow
summary: Publish public workspace packages to pkg.pr.new when a maintainer labels a pull request.
source_files:
  - .github/workflows/pkg-pr-new.yml
  - scripts/publish-preview.js
  - scripts/publish.js
  - scripts/utils.js
  - pnpm-workspace.yaml
  - package.json
  - tsdown.config.ts
  - https://github.com/stackblitz-labs/pkg.pr.new
updated_at: 2026-09-23
status: active
---

# PR preview packages

## Setup and use

1. Enable the [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) for `eggjs/egg`.
2. Create the repository label `pkg.pr.new` if it does not exist.
3. Add the label to an open pull request.
4. Wait for `Publish PR Preview`, then use the installation links in the bot comment.

Each new commit publishes again while the label remains attached. Reopening a labeled PR also publishes it.
Other label changes do not publish packages. Remove the label to stop future releases; an active run can still finish.
To retry the same commit, rerun the failed job or remove and add the label again.

The workflow has no base branch filter, so it also supports stacked PRs.
Each run checks out the PR head commit. A newer publishing job cancels an older job for the same PR.

## Package contents

The workflow builds with Node.js 24 and utoo. It discovers public packages through the same helper as regular releases.
These packages are under `packages/*`, `plugins/*`, `tools/*`, `tegg/core/*`, `tegg/plugin/*`, and `tegg/standalone/*`.
Private packages, including the examples and documentation site, are excluded.

`pkg-pr-new` receives package directories, so it replaces internal dependency references with preview URLs.
`scripts/publish-preview.js` resolves `workspace:` and `catalog:` protocols and applies `publishConfig`, including compiled exports,
with the existing release helpers. It restores the original manifests after the CLI exits, including on failure.
Prebuilt tarballs are unsuitable here: the CLI uploads them without replacing internal dependency references.

The script pins the CLI version and uses its default npm packer.
`pnpm pack` requires package-local workspace links that utoo's hoisted installation does not provide.
`--no-compact` uses repository-qualified URLs, including for packages without matching npm repository metadata.
`--no-template` omits browser templates for these server packages. The app updates one PR comment with installation links.
Preview packages are hosted on `pkg.pr.new`; this workflow does not publish versions to the npm registry.

## Workflow permissions

The workflow uses `pull_request` events with `contents: read` and no repository secrets.
Checkout does not persist credentials. The GitHub App handles preview publication and PR comments.
Fork PRs remain subject to the repository's normal GitHub Actions approval rules.

The upstream [pkg.pr.new documentation](https://github.com/stackblitz-labs/pkg.pr.new) describes app setup,
monorepo dependency rewriting, pnpm packing, and comment behavior.
