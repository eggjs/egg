---
title: Typings
type: package
summary: Shared type-only contracts for cross-package Egg APIs.
source_files:
  - packages/typings
  - packages/utils/src/import.ts
  - packages/core/src/global.d.ts
updated_at: 2026-04-26
status: active
---

# Typings

`@eggjs/typings` owns shared type-only contracts that need to be consumed by multiple Egg packages without creating package-to-package implementation coupling.

The initial contract is `BundleModuleLoader` plus the `globalThis.__EGG_BUNDLE_MODULE_LOADER__` augmentation used by bundled Egg application startup. `@eggjs/utils` consumes the type for `setBundleModuleLoader()` and global loader access, while `@eggjs/core` can include the shared ambient declaration without depending on `@eggjs/utils`.
