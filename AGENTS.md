# Repository Guidelines

## Project Structure & Module Organization

Egg is maintained as a pnpm monorepo. Core runtime code lives in `packages/egg`, while supporting modules such as `packages/core`, `packages/cluster`, and `packages/utils` provide shared internals. Optional integrations reside under `plugins/`. Example applications in `examples/` demonstrate CommonJS and TypeScript setups, and the marketing/documentation site is in `site/`. Unit tests sit beside their packages under `test/` directories, often with fixtures in `test/fixtures/`.

## Build, Test, and Development Commands

Run `pnpm install` to hydrate the workspace (Node.js ≥ 20.19.0 is required). Build all packages with `pnpm run build`. Execute `pnpm run test` for the Vitest suite or `pnpm run test:cov` to generate coverage. Lint with `pnpm run lint`; add `pnpm run typecheck` before large refactors to catch TypeScript issues. Use filters for package-specific workflows, e.g. `pnpm --filter=egg run test` or `pnpm --filter=site run dev`.

## Coding Style & Naming Conventions

The repository is ESM-first and TypeScript-heavy; prefer `.ts` sources and exports over CommonJS. `oxfmt` and `oxlint --type-aware` enforce formatting—two-space indentation, trailing commas, and semicolons are the defaults. Name files in lowercase with hyphens (e.g. `loader-context.ts`), classes in PascalCase, and functions/variables in camelCase. Re-export types thoughtfully to keep the public API stable.

## Testing Guidelines

Vitest is configured via `vitest.config.ts` to discover `**/test/**/*.test.ts` within each package. Mirror that pattern when adding suites, and place reusable data under `test/fixtures/`. Run `pnpm run test` locally before submitting; include integration coverage when touching cluster or agent behavior. For features affecting HTTP or process orchestration, add regression cases that exercise both the CommonJS and TypeScript example apps.

## Commit & Pull Request Guidelines

Follow the Angular-style commit format (`type(scope): subject`), mirroring existing history such as `fix(loader): ensure middleware order`. Squash granular work before opening a PR, and describe the change, motivation, test evidence, and any migration notes. Link related issues in the footer and mark breaking changes explicitly. PRs should pass lint, typecheck, and tests; attach screenshots or logs when updating developer tooling or the docs site.

## Security & Configuration Tips

Review `SECURITY.md` before disclosing vulnerabilities; never post exploit details publicly. Keep local Node.js and pnpm versions aligned with the repo’s `packageManager` field. Secrets and credentials belong in application-level configuration, not this repository. When working on the documentation site, scrub generated content before committing to avoid leaking local URLs.
