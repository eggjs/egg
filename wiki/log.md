# Wiki Log

## [2026-05-06] package | sync bundled runtime support changes

- sources touched: `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/utils/src/import.ts`, `plugins/onerror/src/lib/onerror.ts`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`, `wiki/packages/utils.md`, `wiki/packages/onerror.md`
- note: Recorded native optional platform package externalization, the opaque native dynamic import fallback used by bundled `importModule()`, and the local `@eggjs/onerror` implementation that avoids `koa-onerror` template reads.

## [2026-05-03] package | record egg bundler runtime path mapping

- sources touched: `tools/egg-bundler/src/lib/EntryGenerator.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented that generated workers keep runtime outputDir separate from original app paths and key bundle module lookup by relKey, output absolute path, precomputed original app absolute path, and manifest resolveCache aliases.

## [2026-05-03] package | refine egg bundler docs

- sources touched: `tools/egg-bundler/src/lib/ManifestLoader.ts`, `tools/egg-bundler/src/lib/ExternalsResolver.ts`, `packages/core/src/lifecycle.ts`, `packages/egg/src/lib/start.ts`
- pages updated: `tools/egg-bundler/README.md`, `tools/egg-bundler/docs/output-structure.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Documented manifest auto-generation in metadataOnly mode and clarified root dependency external detection plus the `externals.inline` override.

## [2026-05-02] package | document egg bundler tooling

- sources touched: `tools/egg-bundler/src/index.ts`, `tools/egg-bundler/src/lib/Bundler.ts`, `tools/egg-bin/src/commands/bundle.ts`, `tools/egg-bundler/docs/output-structure.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/egg-bundler.md`
- note: Recorded the new `@eggjs/egg-bundler` package and its `egg-bin bundle` CLI surface after the bundler stack reached `next`.

## [2026-04-21] bootstrap | seed wiki schema and starter pages

- sources touched: `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/repository-map.md`, `wiki/workflows/docs-and-api-updates.md`
- note: Replaced handbook-style schema with an LLM wiki schema and added minimal wiki scaffolding.

## [2026-04-22] refactor | make AGENTS canonical shared instructions

- sources touched: `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/log.md`
- note: Moved shared coding-agent and wiki guidance into AGENTS.md, and reduced CLAUDE.md to a thin wrapper that imports it.

## [2026-04-26] package | add shared typings package notes

- sources touched: `packages/typings/package.json`, `packages/typings/src/index.ts`, `packages/typings/src/global.ts`, `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/packages/typings.md`
- note: Recorded `@eggjs/typings` as the shared home for cross-package global typing contracts.
