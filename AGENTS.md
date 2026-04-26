# AGENTS.md

This is the canonical shared instruction file for coding agents working in this repository.

If another agent-specific file exists, it should import or defer to this file for shared repository guidance.

## Project Map

Egg is maintained as a pnpm monorepo.

- `packages/` contains core framework packages and shared internals.
- `plugins/` contains optional Egg integrations.
- `tools/` contains developer tooling such as CLI packages.
- `tegg/` contains the tegg ecosystem.
- `examples/` contains sample applications.
- `site/docs/` contains the English and Chinese documentation site.
- tests usually live beside packages under `test/`, often with fixtures under `test/fixtures/`.

## Core Commands

- `pnpm install` hydrates the workspace.
- `pnpm run build` builds all packages.
- `pnpm run test` runs the main test suite.
- `pnpm run lint` runs linting.
- `pnpm run typecheck` runs TypeScript checking.
- use filtered commands for focused work, for example `pnpm --filter=egg run test` or `pnpm --filter=site run dev`.

## Coding Conventions

- prefer existing repo patterns over inventing new ones
- prefer ESM and TypeScript-first changes where applicable
- keep file names lowercase with hyphens
- keep public API changes deliberate and documented
- use `oxfmt` and `oxlint --type-aware` conventions already present in the repo

## TypeScript Global Types

- put package-wide global augmentations in a dedicated `src/global.ts` or `src/global.d.ts`
- shared cross-package global types belong in `@eggjs/typings`, not in one consumer package
- import shared global augmentations from the package entry that needs the type surface, for example `import '@eggjs/typings/global'`
- keep `declare global` files as modules by using an `import type` or `export {}`

## Testing And PR Expectations

- run the most targeted tests that validate the touched area
- include regression coverage when changing loader, cluster, agent, HTTP, or process behavior
- use Angular-style commit messages such as `fix(loader): ensure middleware order`
- keep PR descriptions clear about motivation, scope, and test evidence

## Security And Config

- review `SECURITY.md` before handling vulnerability-related work
- do not commit secrets, credentials, or local-only URLs
- keep local Node.js and pnpm versions aligned with the repository configuration

## Shared Knowledge Workflow

This repository also maintains an LLM-owned wiki for durable project knowledge.

Use this three-layer model:

### Raw Sources

Raw sources are the source of truth.

They include:

- repository code under `packages/`, `plugins/`, `tools/`, `tegg/`, `examples/`, and `scripts/`
- user-facing docs under `site/docs/`
- root markdown files such as `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md`
- explicit external artifacts referenced by the user or task
- imported materials stored under `raw/`

Rules:

- do not treat wiki summaries as authoritative when raw sources disagree
- do not rewrite raw sources unless the task requires it
- if you rely on an external source repeatedly, capture it in the wiki

### Wiki

The wiki lives under `wiki/` and stores durable synthesized knowledge.

### Schema

Shared workflow rules live here in `AGENTS.md`.

Agent-specific files should stay thin and point back to this file instead of duplicating the schema.

## Wiki Layout

- `wiki/index.md` is the first wiki file to read
- `wiki/log.md` is the append-only chronological log
- `wiki/packages/` holds package, plugin, tool, and subsystem pages
- `wiki/concepts/` holds architectural and cross-cutting pages
- `wiki/workflows/` holds repeatable procedures
- `wiki/decisions/` holds notable tradeoffs and decisions
- `wiki/sources/` holds summaries of major source documents or external materials

## Wiki Page Rules

Use these page types:

- `package`
- `concept`
- `workflow`
- `decision`
- `source`

Every substantive page should begin with frontmatter:

```yaml
---
title: Short human-readable title
type: package|concept|workflow|decision|source
summary: One-line summary
source_files:
  - path/or/url
updated_at: YYYY-MM-DD
status: seed|active|stale
---
```

Use lowercase kebab-case filenames and keep one topic per page.

## Citation And Freshness Rules

- every nontrivial wiki claim should be traceable to raw sources
- list major source paths in `source_files`
- label non-obvious synthesis as `Inference:`
- record conflicts explicitly instead of flattening them
- mark stale or unresolved claims when freshness is uncertain

## Index And Log Rules

`wiki/index.md` should:

- list durable pages by category
- give each page a one-line summary
- stay concise enough to scan quickly

`wiki/log.md` should record:

- ingestion of substantial new sources
- durable findings produced during a query
- material wiki refactors or lint passes
- code or docs changes that alter previously recorded understanding

Do not log trivial typo-only edits.

## Standard Workflows

### Ingest

1. Read `wiki/index.md`.
2. Find existing pages that should absorb the new information.
3. Create or update a `source` page if the source is substantial.
4. Update impacted wiki pages.
5. Update `wiki/index.md`.
6. Append to `wiki/log.md` if the wiki changed materially.

### Query

1. Read `wiki/index.md` and relevant wiki pages first.
2. Use the wiki as the starting point, not the final authority.
3. Read raw sources for verification, detail, or freshness.
4. Write durable new findings back into the wiki.
5. Update the log when the wiki changes materially.

### Lint

Check the wiki for:

- orphan pages
- stale claims after code or docs changes
- duplicated concepts
- missing source references
- missing pages for frequently touched areas
- contradictions between pages

Prefer restructuring pages over making them longer.

## Repo-Specific Wiki Priorities

Prioritize durable wiki coverage for:

- `packages/egg`, `packages/core`, `packages/utils`, and other foundational packages
- plugins under `plugins/`
- tools under `tools/`
- `tegg/`
- docs structure under `site/docs/`
- loading, lifecycle, plugin model, testing, release, and docs-maintenance concepts

## Change Trigger

Update the wiki when a task materially changes:

- public APIs
- docs structure or contributor guidance
- package responsibilities
- architectural behavior
- repeated workflows used by contributors
- testing or release expectations

For code-only tasks, avoid wiki churn unless durable understanding changed.
