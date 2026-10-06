---
title: 'Monorepo Collaboration'
description: 'How the Egg 4 workspace reduces maintenance across packages'
---

# Monorepo Collaboration

A framework fix in Egg often crosses package boundaries. A loader change needs plugins to verify directory conventions, Mock to reproduce startup, and development tools to expose the same rules to applications. With separate repositories, contributors also have to coordinate dependency versions, temporary links, and release order. Egg 4's monorepo brings this interdependent work into one [workspace](https://github.com/eggjs/egg/blob/f390cc011ce1c70d7460227459ec3825ca3d09f1/package.json#L95-L104), so a change across packages can be checked as a whole.

This consolidation began in August 2025, after Egg 4.0's initial release in January 2025. Its purpose is to reduce the cost of maintaining Egg itself. Application developers, plugin authors, and framework contributors can use the workspace to test source changes together and try fixes in real applications.

## A shared place to verify changes

Consider a loading issue that appears only after a particular plugin starts. In separate repositories, a passing core regression test covers the scenarios known to core. Confirming the real impact still requires the plugin to use an unpublished core version, then an application or test tool to consume that combination. Local links can hide problems: the dependency resolved on one contributor's machine may differ from the one used by another contributor or CI.

The monorepo keeps related implementations, fixtures, and documentation in one commit. Reviewers can see an interface change together with updates to its callers, and failures have a shared source tree to investigate. Core, plugins, tools, and Tegg use workspace dependencies, allowing maintainers to change related packages and verify their interactions directly.

This reduces version assembly and intermediate releases. Tests still protect package interfaces and compatibility. A change across packages is ready to merge when interfaces are clear, callers are updated, and regression tests cover the actual behavior.

## Shared directories, distinct packages

The workspace has recognizable boundaries. packages contains egg, core, koa, and foundational libraries; plugins contains integrations and test helpers; tools contains CLIs, scaffolding, and application bundling; tegg retains its core, plugin, and standalone layers. examples demonstrates usage, and site holds the documentation. Identify the layer responsible for an issue, then follow dependencies to affected callers.

The shared repository retains npm package boundaries. The root @eggjs/monorepo package is private. Users still install egg or the @eggjs packages they need, and each package has its own package.json, entry points, and release artifacts. Packages keep their version lines, with repository scripts coordinating version updates and publishing.

When upgrading an application, select package names from its actual dependencies. For example, packages/logger provides @eggjs/logger, while egg and core still depend on egg-logger. Maintainers can develop a new package and retain transitional dependencies in the same repository. Applications should follow dependency manifests and release notes before renaming packages. The workspace declares these directories:

```json
{
  "workspaces": [
    "packages/*",
    "plugins/*",
    "examples/*",
    "tools/*",
    "site",
    "tegg/core/*",
    "tegg/plugin/*",
    "tegg/standalone/*"
  ]
}
```

## Expressing dependencies with workspaces and catalogs

Internal dependencies and shared external dependencies solve different problems. workspace:* explicitly selects another package in the same repository. catalog: centralizes external dependency versions in [.utoo.toml](https://github.com/eggjs/egg/blob/f390cc011ce1c70d7460227459ec3825ca3d09f1/.utoo.toml). Maintainers can change a shared version range once and run consumer tests to check compatibility, without synchronizing the same declaration across many manifests.

[@eggjs/core](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/core/package.json) is an example: @eggjs/router and @eggjs/utils use workspace:*, while egg-logger and globby use catalog:. These declarations preserve dependency direction and allow integration without publishing intermediate versions to npm. A shared catalog centralizes declarations; tests still establish compatibility. Broad dependency upgrades require a correspondingly broad review and regression scope.

These protocols are development conventions inside the repository. Publishing scripts resolve workspace: and catalog: to ordinary version ranges, apply the published entry points from publishConfig, and invoke npm publish. They then restore source manifests. Consumers of published packages can install them normally. This excerpt comes from core's package.json:

```json
"dependencies": {
  "@eggjs/router": "workspace:*",
  "@eggjs/utils": "workspace:*",
  "egg-logger": "catalog:",
  "globby": "catalog:"
}
```

## Checking source integration and published artifacts

In core's package.json, development exports point to src/index.ts, while publishConfig.exports points to dist/index.js. Workspace tests therefore use source directly, and published packages deliver compiled JavaScript. After changing a foundational package, consumers in the workspace can verify the latest implementation without repeatedly rebuilding and replacing local installations.

The root [tsdown workspace configuration](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tsdown.config.ts) coordinates library builds. Default entries cover `src/**/*.ts`, use unbundle, and externalize @eggjs/* and egg. Configuration and Markdown-only packages are excluded, and some tools override the defaults. This preserves package entry points and dependencies while sharing build conventions.

Contributors need both source tests and artifact checks. Source tests establish behavior; build and publication checks establish whether the delivered entry points, types, and dependencies are complete. Publishing scripts process packages individually, skip versions already published, retry failures, and verify the outcome again. This helps recover from partial publishing failures, but source integration alone does not validate a published package.

## Work around the affected packages

Prepare Node.js 22.18.0 or later. Use utoo's ut command to install dependencies and run tasks; package.json defines workspace patterns and overrides, and .utoo.toml defines the shared dependency catalog. The old pnpm configuration is retained as a migration reference.

Start with the smallest reproduction, add a test near the affected package, then expand to consumers that actually depend on the change. The Redis plugin README, for example, shows how to run its test files directly; fixtures using real Redis also need a local service. The repository has [development service scripts](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/README.md) for MySQL 8 and Redis 7. Start them when required by the test scope. A shared repository makes dependencies accessible, but a full test run can also involve more services than expected.

Run source tests before building the whole repository. Stale dist directories can cause Tegg file discovery to load both source and compiled files, producing duplicate metadata; the root pretest cleans build artifacts. Check source behavior and types first, then verify published output:

```bash
# Install workspace dependencies
npm install --global utoo@latest
ut install

# Check source behavior and types first
ut run test
ut run typecheck
ut run lint

# Then verify the release build
ut run build
```

## Applications can help verify fixes

Application developers usually do not need to clone the workspace. When a fix needs validation in your business environment, use [PR preview packages](./pr-preview-packages.md). A maintainer adds the pkg.pr.new label; after the workflow succeeds, a bot comment provides installation URLs. Keep your package manager, package names, and imports, and temporarily point the relevant dependencies to the preview build.

For changes across packages, confirm the build identity. Use related package URLs from the same publication and include the commit SHA in feedback. Preview builds point runtime dependencies between published workspace packages to the same commit, but do not automatically update other direct dependencies in your application. When testing a newer commit, check whether the lockfile still resolves an older PR URL. Preview packages have a retention period and suit short-term verification; restore release versions and the lockfile afterward.

This extends collaboration into real applications: maintainers fix related packages in one commit, users verify that build in context, and reproducible results return to the original PR. The practical value of the shared workspace is that implementation, usage, and verification can all refer to the same code.
