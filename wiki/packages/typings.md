---
title: Typings Package
type: package
summary: Shared TypeScript type surface for cross-package Egg typings.
source_files:
  - packages/typings/package.json
  - packages/typings/src/index.ts
  - packages/typings/src/global.ts
updated_at: 2026-04-26
status: seed
---

# Typings Package

`@eggjs/typings` is the shared package for type contracts that must be consumed
by more than one Egg package without creating a dependency on a specific runtime
package.

Current shared types:

- `BundleModuleLoader` in `packages/typings/src/index.ts`
- `globalThis.__EGG_BUNDLE_MODULE_LOADER__` augmentation in `packages/typings/src/global.ts`

Import `@eggjs/typings/global` from a package entrypoint when that package needs
the shared global augmentation in its type surface.
