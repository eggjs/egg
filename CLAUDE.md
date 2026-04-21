# CLAUDE.md

This file is the schema for an LLM-maintained wiki about the Egg.js repository.

It is not a full repo handbook. Keep this file short, structural, and stable. Put project knowledge in `wiki/`, not here.

## Purpose

The goal is to maintain a persistent markdown wiki that compounds knowledge about Egg.js over time.

The agent should:

- read raw sources
- synthesize durable knowledge into the wiki
- keep cross-references and summaries current
- answer questions from the wiki first, then fill gaps from raw sources
- write new durable findings back into the wiki

## Three Layers

### 1. Raw Sources

Raw sources are the source of truth.

They include:

- repository code under `packages/`, `plugins/`, `tools/`, `tegg/`, `examples/`, and `scripts/`
- user-facing docs under `site/docs/`
- root documents such as `README.md`, `README.zh-CN.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md`
- explicit external artifacts referenced by the user or task
- extra imported materials placed under `raw/`

Rules:

- do not treat the wiki as the source of truth when raw sources disagree
- do not overwrite or rewrite raw sources unless the user task requires it
- when using an external source, record it in the wiki before relying on it repeatedly

### 2. Wiki

The wiki lives under `wiki/` and is LLM-owned.

The wiki should contain summaries, concepts, package pages, workflows, and decisions that help future sessions avoid rediscovering the same knowledge from scratch.

### 3. Schema

This file defines how the wiki is organized and maintained.

This file should contain:

- the layer model
- page types and directory conventions
- ingest, query, and lint workflows
- citation and freshness rules

This file should not contain:

- long package inventories
- detailed command catalogs
- one-off migration notes
- troubleshooting dumps
- repeated project facts that belong in wiki pages

## Wiki Layout

The wiki uses this layout:

- `wiki/index.md` - content-oriented map of the wiki
- `wiki/log.md` - append-only chronological log
- `wiki/packages/` - package, plugin, tool, and subsystem pages
- `wiki/concepts/` - architecture, lifecycle, loading model, testing model, release model
- `wiki/workflows/` - repeatable procedures
- `wiki/decisions/` - important tradeoffs and architectural decisions
- `wiki/sources/` - summaries of major source documents or external materials

Create additional subdirectories only when the wiki clearly needs them.

## Page Types

Use these page types:

- `package` - one package, plugin, tool, or subsystem
- `concept` - a cross-cutting architectural idea
- `workflow` - a repeatable operational procedure
- `decision` - a tradeoff, rationale, or notable change in direction
- `source` - a summary of a major source document, PR, issue, or external artifact

## Page Format

Every substantive wiki page should start with frontmatter:

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

Then write concise sections with links to related pages.

## Naming Rules

- use lowercase kebab-case filenames
- keep one topic per page
- prefer stable conceptual names over task-specific names
- split a page when it mixes unrelated concerns

Examples:

- `wiki/packages/egg.md`
- `wiki/packages/core.md`
- `wiki/concepts/loader-and-lifecycle.md`
- `wiki/workflows/docs-and-api-updates.md`

## Citation Rules

Every nontrivial claim in the wiki should be traceable.

- cite raw source file paths in `source_files`
- add inline source references in prose when ambiguity matters
- if a statement is an inference, label it as `Inference:`
- if sources disagree, record the conflict explicitly instead of flattening it
- if a claim may be outdated, mark it as stale or unresolved

## Index Rules

`wiki/index.md` is the first wiki file to read.

It should:

- list all durable pages by category
- give each page a one-line summary
- stay concise enough to scan quickly
- help the agent route itself before opening raw sources

Update the index whenever you add, rename, split, or remove wiki pages.

## Log Rules

`wiki/log.md` is append-only and chronological.

Each entry should use this format:

```md
## [YYYY-MM-DD] type | short title

- sources touched:
- pages updated:
- note:
```

Log these actions:

- ingesting a new substantial source
- answering a query that produced durable knowledge
- linting or refactoring the wiki
- major code or docs changes that alter previously recorded understanding

Do not log trivial typo-only edits.

## Standard Workflows

### Ingest

When a task introduces a new source, a major diff, or a significant document:

1. Read `wiki/index.md`.
2. Identify existing pages that should absorb the new information.
3. Create or update a `source` page if the material is substantial.
4. Update impacted package, concept, workflow, or decision pages.
5. Update `wiki/index.md`.
6. Append an entry to `wiki/log.md`.

### Query

When answering a question:

1. Read `wiki/index.md` and the most relevant wiki pages first.
2. Use the wiki as the starting point, not the final authority.
3. Read raw sources only for verification, missing details, or freshness.
4. If the answer produces durable knowledge, write it back into the wiki.
5. Update the log if the wiki changed materially.

### Lint

Periodically check the wiki for:

- orphan pages with no useful inbound references
- stale claims after code or docs changes
- duplicated pages covering the same concept
- missing source references
- missing package or concept pages for frequently touched areas
- contradictions between pages

When linting, prefer restructuring pages over adding more prose.

## Repo-Specific Priorities

Prioritize wiki coverage for:

- `packages/egg`, `packages/core`, `packages/utils`, and other foundational packages
- plugins under `plugins/`
- tools under `tools/`
- `tegg/`
- docs structure under `site/docs/`
- cross-cutting concepts such as loading, lifecycle, plugin model, testing, release, and docs maintenance

## Change Triggers

Update the wiki when a task changes any of these materially:

- public APIs
- docs structure or guidance
- package responsibilities
- workflows used repeatedly by contributors
- architectural behavior
- testing or release expectations

For code-only tasks, do not force wiki churn unless the task changes durable understanding.

## Bootstrap Rule

If the wiki is sparse, seed only the pages needed for the current task. Do not try to document the entire repo in one pass.

## Editing Rule for This File

When editing `CLAUDE.md`:

- optimize for stable rules, not completeness
- remove repo facts that can live in `wiki/`
- keep the file compact enough to reread quickly
- prefer changing workflows and conventions over adding inventories
