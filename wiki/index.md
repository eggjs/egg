# Wiki Index

This index is the entry point for the Egg.js wiki.

Read this file before exploring raw sources.

## Concepts

- [Repository Map](./concepts/repository-map.md) - High-level map of the main repository areas and where to look first.
- [Tegg Module Plugin](./concepts/tegg-module-plugin.md) - Declarative framework hooks (@InnerObjectProto/@EggLifecycleProto), the InnerObjectLoadUnit two-phase boot ordering, and host feeding rules.
- [Vitest isolate:false state leaks](./concepts/vitest-isolate-false-state-leaks.md) - Why pool:threads + isolate:false exposes cross-file/cross-project state leaks, the concrete leaks (import.ts snapshot loader, mock mockContext, teardown close/load race), and how to triage them.

## Workflows

- [CI parallel test metrics](./workflows/ci-parallel-test-metrics.md) - How the CI test gate surfaces avg/peak concurrency + parallel-efficiency metrics for the isolate:false suite, and how to read or reproduce them.
- [Docs and API Updates](./workflows/docs-and-api-updates.md) - How to handle changes that affect user-facing docs or durable project understanding.
- [Local CI](./workflows/local-ci.md) - Local validation should run tests from clean sources and avoid stale build artifacts before tegg tests.
- [Egg-bin Windows shell probe hotspot](./workflows/egg-bin-windows-shell-probe.md) - How PR #6014 diagnosed hosted-Windows egg-bin startup slowness and why the final fix only presets SHELL.

## Decisions

- No decision pages yet.

## Packages

- [Core Package](./packages/core.md) - Loader, lifecycle, and application core primitives used by Egg runtime packages.
- [Egg Bundler](./packages/egg-bundler.md) - Tooling package that bundles Egg applications and backs `egg-bin bundle`.
- [Loader FS Package](./packages/loader-fs.md) - Shared loader-facing filesystem boundary for Egg loaders and future bundled runtimes.
- [Onerror Plugin](./packages/onerror.md) - Default Egg error-handling plugin and configurable response negotiation layer.
- [Typings Package](./packages/typings.md) - Shared TypeScript type surface for cross-package Egg typings.
- [Utils Package](./packages/utils.md) - Shared utility package for module loading and bundled module-loader integration.

## Sources

- No standalone source summary pages seeded yet.
