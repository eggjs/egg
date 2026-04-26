# Wiki Log

## [2026-04-21] bootstrap | seed wiki schema and starter pages

- sources touched: `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/log.md`, `wiki/concepts/repository-map.md`, `wiki/workflows/docs-and-api-updates.md`
- note: Replaced handbook-style schema with an LLM wiki schema and added minimal wiki scaffolding.

## [2026-04-22] refactor | make AGENTS canonical shared instructions

- sources touched: `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/log.md`
- note: Moved shared coding-agent and wiki guidance into AGENTS.md, and reduced CLAUDE.md to a thin wrapper that imports it.

## [2026-04-26] package | add shared typings package

- sources touched: `packages/typings`, `packages/utils/src/import.ts`, `packages/core/src/global.d.ts`, `AGENTS.md`, `CLAUDE.md`
- pages updated: `wiki/index.md`, `wiki/packages/typings.md`, `wiki/log.md`
- note: Added `@eggjs/typings` as the shared home for bundle module loader types and the related global augmentation.
