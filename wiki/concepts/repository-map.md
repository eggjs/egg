---
title: Repository Map
type: concept
summary: High-level map of the main Egg.js repository areas and their roles.
source_files:
  - CLAUDE.md
  - packages/
  - plugins/
  - tools/
  - tegg/
  - site/docs/
updated_at: 2026-04-21
status: active
---

# Repository Map

This repo is a pnpm monorepo centered on the Egg.js framework and related packages.

## Main Areas

- `packages/` contains core framework packages and shared libraries.
- `plugins/` contains Egg plugins that extend runtime capabilities.
- `tools/` contains developer tools such as CLI packages.
- `tegg/` contains the tegg ecosystem and related packages.
- `site/docs/` contains the English and Chinese documentation site.
- root markdown files capture project-wide contributor guidance and release-facing information.

## Where To Look First

- For framework behavior, start with `packages/egg/` and `packages/core/`.
- For plugin behavior, inspect the relevant directory under `plugins/`.
- For contributor-facing docs changes, inspect `site/docs/` and root markdown files together.
- For workflow changes, check package scripts, config files, and CI workflow files.

Inference: this page is intentionally broad; package-specific pages should hold the durable details as they are discovered.
