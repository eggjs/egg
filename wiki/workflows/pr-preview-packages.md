---
title: PR preview packages
type: workflow
summary: Publish public workspace packages through a pull request label and install previews in consumer applications.
source_files:
  - CONTRIBUTING.md
  - CONTRIBUTING.zh-CN.md
  - site/docs/releases/pr-preview-packages.md
  - site/docs/zh-CN/releases/pr-preview-packages.md
  - site/.vitepress/config.mts
  - .github/workflows/pkg-pr-new.yml
  - scripts/publish-preview.js
  - scripts/publish.js
  - scripts/utils.js
  - pnpm-workspace.yaml
  - package.json
  - tsdown.config.ts
  - https://github.com/stackblitz-labs/pkg.pr.new
  - https://blog.stackblitz.com/posts/cloudflare-backing-pkg-pr-new-data-infrastructure/
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

## Consumer instructions

The [English](../../site/docs/releases/pr-preview-packages.md) and [Chinese](../../site/docs/zh-CN/releases/pr-preview-packages.md)
guides cover installation, PR and commit URLs, related dependencies, lockfiles, expiry, and restoring regular dependencies.

Both guides appear in the version navigation menu and the Community landing page.
Their `/releases/` and `/zh-CN/releases/` routes activate the version menu without activating Community navigation or its sidebar.
The contribution guides link to them and describe how maintainers publish previews.

The bot comment uses PR-number URLs by default. The `Publish previews` logs include commit-SHA URLs.
The current script keeps the source package versions, so consumers must use the URL and SHA to identify a preview.

## Retention

[StackBlitz's June 4, 2025 announcement](https://blog.stackblitz.com/posts/cloudflare-backing-pkg-pr-new-data-infrastructure/)
documents automatic removal after more than one month without downloads, or when a package is more than six months old.
The age limit applies regardless of downloads. This is the published upstream policy checked on September 23, 2026;
Egg does not control the retention period. Both site guides show this policy in a warning before the installation instructions.

Inference: a commit-SHA URL or lockfile cannot preserve a deleted server artifact. Consumers need a new preview or an npm release
when the referenced preview expires.

## Package contents

After the Node.js 24 and utoo build, `scripts/publish-preview.js`:

1. Discovers public packages with the regular release helper. Private examples, the documentation site, and other private packages are excluded.
2. Resolves `workspace:` and `catalog:` dependencies and applies `publishConfig`, including compiled exports, with the shared release helpers.
3. Passes package directories to `pkg-pr-new@latest` so internal dependencies use matching preview URLs.

The public packages are under `packages/*`, `plugins/*`, `tools/*`, `tegg/core/*`, `tegg/plugin/*`, and `tegg/standalone/*`.
Original manifests are restored on success or failure.

The CLI uses npm pack. `pnpm pack` needs package-local workspace links absent from utoo's hoisted installation;
prebuilt tarballs would skip preview dependency rewriting.
`--no-compact` provides repository-qualified URLs without relying on npm repository metadata.
`--no-template` omits browser templates. The app updates one PR comment with installation links.
Packages are hosted on `pkg.pr.new`; no versions are published to npm.

## Workflow permissions

The workflow uses `pull_request` events with `contents: read` and no repository secrets.
Checkout does not persist credentials. The GitHub App handles preview publication and PR comments.
Fork PRs remain subject to the repository's normal GitHub Actions approval rules.

The upstream [pkg.pr.new documentation](https://github.com/stackblitz-labs/pkg.pr.new) describes app setup,
monorepo dependency rewriting, pnpm packing, and comment behavior.
