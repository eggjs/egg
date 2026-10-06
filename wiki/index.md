# Wiki Index

This index is the entry point for the Egg.js wiki.

Read this file before exploring raw sources.

## Concepts

- [Controller Advice](./concepts/controller-advice.md) - Runs dependency-injected Advice at the bound controller invocation while preserving the existing AbstractControllerAdvice contract.
- [Repository Map](./concepts/repository-map.md) - High-level map of the main repository areas and where to look first.
- [Tegg Module Plugin](./concepts/tegg-module-plugin.md) - Declarative framework hooks (@InnerObjectProto/@EggLifecycleProto), the InnerObjectLoadUnit two-phase boot ordering, and host feeding rules.
- [Vitest isolate:false state leaks](./concepts/vitest-isolate-false-state-leaks.md) - Why pool:threads + isolate:false exposes cross-file/cross-project state leaks, the concrete leaks (import.ts snapshot loader, mock mockContext, teardown close/load race), and how to triage them.

## Workflows

- [GitHub Actions performance plan](./workflows/ci-performance-plan.md) - PR/full matrix, sharding, test-runtime improvements, and acceptance criteria based on measured CI bottlenecks.
- [CI parallel test metrics](./workflows/ci-parallel-test-metrics.md) - Test concurrency, resolved worker settings, retries, and shard inventories in CI artifacts.
- [Docs and API Updates](./workflows/docs-and-api-updates.md) - How to handle changes that affect user-facing docs or durable project understanding.
- [Local CI](./workflows/local-ci.md) - Local validation should run tests from clean sources and avoid stale artifacts (`dist/` duplicate-proto; fixture `.egg` scan-manifest caches) before tegg tests.
- [PR preview packages](./workflows/pr-preview-packages.md) - Publish workspace previews through a pull request label and install them in consumer applications, including from stacked PRs.
- [Egg-bin Windows shell probe hotspot](./workflows/egg-bin-windows-shell-probe.md) - How PR #6014 diagnosed hosted-Windows egg-bin startup slowness and why the final fix only presets SHELL.

## Decisions

- No decision pages yet.

## Packages

- [Core Package](./packages/core.md) - Loader, lifecycle, and application core primitives used by Egg runtime packages.
- [Egg Bundler](./packages/egg-bundler.md) - Bundles Egg applications for Node startup snapshots and tegg standalone service workers.
- [Loader FS Package](./packages/loader-fs.md) - Shared loader-facing filesystem boundary for Egg loaders and future bundled runtimes.
- [Onerror Plugin](./packages/onerror.md) - Default Egg error-handling plugin and configurable response negotiation layer.
- [Standalone Service Worker](./packages/service-worker.md) - Fetch-semantics standalone runtime serving HTTP controllers and MCP tools from a tegg module without an egg application.
- [Tegg Vitest Adapter](./packages/tegg-vitest.md) - Vitest 5 requirements, request context injection, and module scope cleanup across retries.
- [Typings Package](./packages/typings.md) - Shared TypeScript type surface for cross-package Egg typings.
- [Utils Package](./packages/utils.md) - Shared utility package for module loading and bundled module-loader integration.

## Sources

- [CI performance baseline, September 2026](./sources/ci-performance-baseline.md) - Job and step timings from ten CI runs and three E2E runs, including runner delays and an inspector-port failure.
