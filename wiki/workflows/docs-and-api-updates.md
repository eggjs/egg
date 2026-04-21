---
title: Docs and API Updates
type: workflow
summary: Procedure for handling code changes that may require user-facing docs or wiki updates.
source_files:
  - site/docs/
  - README.md
  - README.zh-CN.md
  - CHANGELOG.md
  - CLAUDE.md
updated_at: 2026-04-21
status: active
---

# Docs and API Updates

Use this workflow when a task touches public APIs, developer-facing behavior, or durable project guidance.

## Procedure

1. Inspect the code or diff to determine whether behavior visible to users or contributors changed.
2. Check the existing docs surface, especially `site/docs/` and relevant root markdown files.
3. If the change affects durable understanding, update the relevant wiki pages as well as the docs.
4. If there is no existing page for the concept, create the smallest useful page instead of expanding `CLAUDE.md`.
5. Update `wiki/index.md` when new pages are added.
6. Append a short entry to `wiki/log.md` for material wiki changes.

## Heuristics

- API exports, lifecycle changes, loading changes, config behavior, testing expectations, and contributor workflows usually need durable docs.
- Tiny internal refactors usually do not need wiki changes unless they alter architectural understanding.
- If a task reveals a repeated maintenance pattern, capture it as a workflow page instead of burying it in a PR comment.
