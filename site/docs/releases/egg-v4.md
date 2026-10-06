---
title: 'Egg 4 Release Notes'
description: 'Developer experience and ecosystem maintenance in Egg 4'
---

# Egg 4 Release Notes

Egg 4 focuses on the work developers do every day. We continue to adopt community tools to make TypeScript configuration and module loading smoother, bring testing to Vitest, and offer bundles and V8 startup snapshots for applications that need faster cold starts. You can adopt these changes gradually, starting with the problems you encounter most often.

## A smoother TypeScript and ESM experience

Every Egg application needs configuration, plugin declarations, and module organization. Egg 4 builds on the TypeScript rewrite with better type exports and support for loading both ESM and CommonJS. Editors can catch configuration mistakes earlier, and applications can use modules from the modern Node.js ecosystem more easily.

For example, [defineConfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts) provides type checking without a separate type annotation for every configuration file:

```typescript
import { defineConfig } from 'egg';

export default defineConfig({
  middleware: [],
});
```

When configuration depends on application information, use a configuration factory. Plugins have a corresponding typed declaration API. These improvements fit the existing development workflow; module extensions, compiled output directories, and third-party dependencies still need to be checked during an upgrade.

## Testing with modern tools

With Vitest, TypeScript tests, watch mode, and coverage share a single toolchain. Applications can continue using the test and cov commands in [egg-bin](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md). Run egg-bin test --watch for quick feedback while editing. Applications with @eggjs/mock installed also receive automatic test lifecycle integration.

The updated toolchain makes further optimization easier. [PR #5541](https://github.com/eggjs/egg/pull/5541) switched to rolldown-vite after Vitest was already in use. Its recorded total duration fell from 38.98 seconds to 28.56 seconds, a reduction of approximately 26.7%. This measures a build-layer optimization within the existing Vitest toolchain.

The framework repository also uses utoo for workspace installation and command execution, alongside updated build and checking tools. Applications can keep their own package manager. When migrating tests, focus on hooks, obsolete parallelism options, and scripts that depend on report formats.

## Reaching readiness sooner

For services that start frequently, module loading and initialization directly affect waiting time. Egg 4 offers optional bundles and V8 startup snapshots: organize modules and resources at build time, save part of the application's initialized state, and complete runtime initialization after restoring it.

[PR #6042](https://github.com/eggjs/egg/pull/6042) reports measurements from cnpmcore. For the same JavaScript bundle in single-process mode, enabling a snapshot reduced median startup time from 947 ms to 379 ms, approximately 60%. This is a useful reference for cold-start experiments; measure the benefit again in your own application.

Snapshots require explicit adoption, and restoration requires Node.js 24 or later. Runtime resources such as connections and timers must also follow the snapshot lifecycle. See the [startup snapshot guide](../advanced/snapshot.md) for dynamic loading, native modules, and external resources.

## An upgrade in cnpmcore

cnpmcore provides an application-level example. [PR #747](https://github.com/cnpm/cnpmcore/pull/747) upgraded Egg from ^3.29.0 to ^4.0.8 and updated the package entry points for Redis, Mock, and development tools. Later, [PR #855](https://github.com/cnpm/cnpmcore/pull/855) adopted the integrated Egg 4 APIs: Controller and Inject came from egg, and ORM APIs came from egg/orm. Several direct Tegg dependencies and plugin declarations were removed, reducing application setup work.

The test migration also required changes specific to the application. When [PR #979](https://github.com/cnpm/cnpmcore/pull/979) introduced Vitest, it isolated databases, Redis, and data directories by worker to avoid shared state in parallel tests. Together with the snapshot experiment, this illustrates an incremental path: migrate dependencies and imports, establish test isolation, then evaluate startup optimization for the intended deployment.

## Making the ecosystem easier to maintain

Previously, a core interface change could require coordinated dependency updates across repositories, intermediate releases, and separate plugin checks. Monorepo consolidation, which followed the initial January 2025 release of Egg 4.0 and began in August 2025, lets core packages, plugins, and Tegg use workspace dependencies for direct integration. Related changes can be implemented, tested, and reviewed in one PR, reducing Egg's own maintenance costs.

Tegg's modules, dependency injection, and lifecycle facilities are maintained alongside the framework, providing clearer business boundaries for larger applications. Packages retain their own responsibilities. Business applications can adopt these capabilities as needed without reorganizing into a monorepo.

## Start with one project

The runtime requires Node.js 22.18.0 or later. To try the development workflow, follow the [quick start](../intro/quickstart.md) and create an example with the beta scaffolder:

```bash
npx create-egg@beta --template tegg hackernews-tegg
cd hackernews-tegg
npm install
npm run dev
```

For an existing application, first check the versions of Egg, plugins, and test tools. Get ordinary startup and testing working before trying bundles or snapshots. During the first pass, review legacy generator code, plugin entry points, mixed ESM and CommonJS, and Mocha hooks and options. See the [egg-bin migration notes](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#breaking-changes-v8) for test-tool changes.

## Explore further

Choose a topic based on the questions facing your project:

- [Monorepo Collaboration](./egg-v4-monorepo.md): integrate core, plugins, and Tegg, and use workspaces and catalogs to reduce maintenance across packages.
- [Developer Toolchain](./egg-v4-toolchain.md): migrate to Vitest, understand test lifecycle and parallelism, and use utoo workspace commands.
- [Plugin Upgrades](./egg-v4-plugins.md): configure built-in and optional plugins, and check typed factories, security behavior, and snapshot compatibility.
- [TypeScript and ESM](./egg-v4-typescript-esm.md): coordinate typed configuration, module formats, development transpilation, and production output directories.
- [Tegg Modules](./egg-v4-tegg.md): use module boundaries, dependency injection, and lifecycle rules, and understand HTTP, MCP, and Worker requirements.
- [Bundles and Startup Snapshots](./egg-v4-bundle-snapshot.md): build and restore snapshots, deploy clusters, measure cold starts, and validate fallback behavior.

Thank you to everyone contributing code, documentation, plugin maintenance, and test feedback. Bring your real project questions and results to help shape Egg's next improvements.
