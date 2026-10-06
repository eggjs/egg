---
title: Egg 4 release article series
type: source
summary: English and Chinese release overview and six topic articles, their routes and validation boundaries.
source_files:
  - site/docs/releases/egg-v4.md
  - site/docs/releases/egg-v4-monorepo.md
  - site/docs/releases/egg-v4-toolchain.md
  - site/docs/releases/egg-v4-plugins.md
  - site/docs/releases/egg-v4-typescript-esm.md
  - site/docs/releases/egg-v4-tegg.md
  - site/docs/releases/egg-v4-bundle-snapshot.md
  - site/docs/zh-CN/releases/
  - site/.vitepress/config.mts
  - site/docs/community/index.md
  - site/docs/zh-CN/community/index.md
updated_at: 2026-10-07
status: active
---

# Egg 4 release article series

The series consists of an overview and six topics: monorepo collaboration, developer tooling, plugin upgrades, TypeScript/ESM, Tegg modules, and bundles/startup snapshots. English routes use `/releases/egg-v4*`; Chinese counterparts use `/zh-CN/releases/egg-v4*`. Matching filenames support VitePress language switching. Each locale has a release sidebar, a version-menu overview entry, and an overview link in the community page's article list. The Community dropdown does not duplicate the release entry.

The overview links to all six topics. Topic articles retain technical examples and source links from the Chinese series. This describes ongoing Egg 4 development: the August 2025 monorepo consolidation followed the January 2025 initial 4.0 release. The workspace reduces maintenance costs for Egg; applications can keep their own repository structure and package manager.

Performance claims have distinct scopes. The 38.98 s to 28.56 s result compares the existing Vitest toolchain before and after rolldown-vite. The cnpmcore 947 ms to 379 ms single-process and 1356 ms to 591 ms cluster medians compare the same generated bundle with and without snapshot restoration. The cluster and single-process timing boundaries differ; these figures do not measure Egg 3-to-4 gains or request throughput.

For maintenance, build the documentation with VitePress's dead-link checks enabled, check all seven routes per locale, inspect release sidebars and version menus, and exercise both directions of language switching. The source Markdown and VitePress configuration remain authoritative.
