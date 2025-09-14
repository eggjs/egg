# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Eggjs** framework - a progressive Node.js framework for building enterprise-class server-side applications. Built on top of Koa.js, it provides a plugin system, conventions over configuration, and enterprise-grade features like clustering, logging, and security.

**This project is structured as a pnpm monorepo** with multiple packages and uses pnpm workspaces for dependency management.

## Monorepo Structure

### Packages

- **`packages/egg/`** - Main Eggjs framework package
  - `src/` - TypeScript source code
  - `test/` - Comprehensive test suite with fixtures
- **`packages/core/`** - Core plugin framework (merged from @eggjs/core)
  - `src/` - Core TypeScript source code
  - `test/` - Core framework test suite with vitest
- **`packages/utils/`** - Utility functions (merged from @eggjs/utils)
  - `src/` - Utils TypeScript source code
  - `test/` - Utils test suite
- **`packages/mock/`** - Testing utilities (merged from @eggjs/mock)
  - `src/` - Mock TypeScript source code
  - `test/` - Mock test suite
- **`packages/cluster/`** - Cluster management (merged from @eggjs/cluster)
  - `src/` - Cluster TypeScript source code
  - `test/` - Cluster test suite
- **`packages/koa/`** - Koa web framework (merged from @eggjs/koa)
  - `src/` - Koa TypeScript source code
  - `test/` - Koa test suite
- **`packages/supertest/`** - HTTP testing utilities (merged from @eggjs/supertest)
  - `src/` - Supertest TypeScript source code
  - `test/` - Supertest test suite
- **`packages/extend2/`** - Object extension utility (merged from extend2)
  - `src/` - Extend2 TypeScript source code
  - `test/` - Extend2 test suite
- **`plugins/`** - Egg framework plugins (all plugins should be located here)
  - `development/` - Development plugin for local development (merged from @eggjs/development)
    - Provides development tools and auto-reload functionality
    - Only enabled in local environment
- **`examples/`** - Example applications
  - `helloworld-commonjs/` - CommonJS example
  - `helloworld-typescript/` - TypeScript example
- **`tools/egg-bin/`** - CLI development tool package (@eggjs/bin)
  - `src/` - TypeScript source code for CLI commands
  - `test/` - Comprehensive test suite with mocha
- **`site/`** - Documentation website built with Dumi

### Core Architecture (packages/egg/)

- **`src/lib/`** - Core framework classes and utilities
  - `application.ts` - Main Application class extending EggApplicationCore
  - `agent.ts` - Agent process manager
  - `egg.ts` - Core EggApplicationCore with shared functionality
  - `start.ts` - Application startup logic for cluster/single mode
- **`src/app/extend/`** - Framework extensions (context, helper, request, response)
- **`src/config/`** - Default configurations and plugins
- **`src/lib/core/`** - Core components (httpclient, logger, messenger, base classes)
- **`src/lib/loader/`** - Application loaders (AppWorkerLoader, AgentWorkerLoader)

### Key Classes

- **EggApplicationCore** - Base application class with core functionality
- **Application** - Main app class for worker processes
- **Agent** - Agent process class for background tasks
- **Context** - Extended Koa context with Egg-specific features
- **BaseContextClass** - Base for controllers, services, subscriptions
- **AppWorkerLoader/AgentWorkerLoader** - Load app components in convention order

### Loading Convention

The framework follows a specific loading order:

1. Plugin system
2. Configurations
3. Application/Request/Response/Context extensions
4. Custom loaders
5. Services
6. Middlewares
7. Controllers
8. Router

## Development Commands

### Monorepo Management

- `pnpm install` - Install dependencies for all packages
- `pnpm -r run <script>` - Run script in all packages
- `pnpm --filter=<package> run <script>` - Run script in specific package

### Testing

- `pnpm test` - Run tests in all packages
- `pnpm --filter=egg run test` - Test main egg package
- `pnpm --filter=@eggjs/extend2 test` - Test extend2 package with vitest
- `pnpm --filter=@eggjs/bin test` - Test egg-bin CLI tool package

### Build & Lint

- `pnpm -r run build` - Build all packages
- `pnpm -r run clean` - Clean dist directories in all packages
- `pnpm lint` - Run ESLint in all packages

### Examples

- `pnpm run example:commonjs` - Run CommonJS example
- `pnpm run example:typescript` - Run TypeScript example

### Documentation Site

- `pnpm run site:dev` - Start documentation development server
- `pnpm run site:build` - Build documentation site
- `pnpm run site:prettier` - Format documentation files
- `pnpm run puml` - Generate PlantUML diagrams

## Key Configuration Files

- **`pnpm-workspace.yaml`** - pnpm workspace configuration with catalog dependencies
- **`package.json`** - Root monorepo configuration with pnpm scripts
- **`packages/egg/package.json`** - Main egg package with hybrid CommonJS/ESM exports
- **`packages/egg/tsconfig.json`** - Extends @eggjs/tsconfig with strict mode enabled
- **`packages/egg/tsdown.config.ts`** - tsdown build configuration for unbundled ESM output
- **`packages/egg/src/config/plugin.ts`** - Built-in plugin configurations
- **`packages/egg/src/config/config.default.ts`** - Default framework configuration

### pnpm Catalog Usage

All packages use pnpm catalog mode for centralized dependency management:

- Dependencies are defined once in `pnpm-workspace.yaml` catalog
- Individual packages reference them using `"package-name": "catalog:"`
- This ensures consistent versions across all packages in the monorepo
- Easy to update versions in one place

## Framework Concepts

### Plugin System

Egg uses a powerful plugin system where plugins are loaded before application code. Each plugin can extend the framework's functionality and is configured in `config/plugin.js`.

### Cluster vs Single Mode

- **Cluster Mode** (default) - Multi-process with master, agent, and worker processes
- **Single Mode** - Single process for development/testing

### Loader Pattern

The framework uses a convention-based loader system that automatically discovers and loads:

- Extensions (app/extend/\*)
- Services (app/service/\*)
- Controllers (app/controller/\*)
- Middlewares (app/middleware/\*)
- Configurations (config/\*)

### Context Extensions

The framework extends Koa's context with Egg-specific features:

- `ctx.service` - Access to service classes
- `ctx.helper` - Utility helper functions
- `ctx.logger` - Request-scoped logger
- `ctx.cookies` - Enhanced cookie handling
- `ctx.curl()` - HTTP client methods

## Working with the Monorepo

### Adding Features

1. Work primarily in the `packages/egg/` directory for core framework features
2. Understand the loading order and conventions
3. Follow the plugin system for extensible features
4. Use BaseContextClass for context-aware components
5. Add comprehensive tests in `packages/egg/test/` directory

### Adding New Packages

1. Create new directory under:
   - `packages/` - for core framework packages
   - `plugins/` - for Egg plugins
   - `tools/` - for development tools
2. Add package.json with workspace dependencies using `workspace:*`
3. Create tsconfig.json that extends from root: `"extends": "../../tsconfig.json"`
4. Add package reference to root tsconfig.json `references` array
5. Update root pnpm-workspace.yaml if needed (plugins/\* is already included)
6. Use `pnpm --filter=<package>` for package-specific commands

### Plugin Packages Structure

All Egg framework plugins should be placed in the `plugins/` directory:

- **`plugins/development/`** - Development environment plugin
  - Provides auto-reload and development tools
  - Only active in local environment
  - Watches file changes and automatically restarts workers
- Follow standard Egg plugin structure with:
  - `src/` - TypeScript source code
  - `test/` - Test suite (use Vitest for new plugins)
  - `package.json` with `eggPlugin` configuration

### Tool Packages Structure

Tool packages (like egg-bin) should be placed in the `tools/` directory:

- **`tools/egg-bin/`** - CLI development tool providing dev, test, and coverage commands
- Built with @oclif/core framework for robust CLI functionality
- Supports TypeScript compilation and execution for Egg.js applications
- Includes comprehensive testing with Mocha and fixtures
- Uses tsdown for TypeScript compilation to maintain fast development builds

### Testing Strategy

- **IMPORTANT: All new packages MUST use Vitest for testing** - this is the standard test runner for the monorepo
- **Exception: egg-bin uses Mocha** - the CLI tool package uses Mocha for consistency with CLI testing patterns
- Use `pnpm --filter=egg run test` for framework tests
- Test fixtures are in `packages/egg/test/fixtures/apps/`
- Create apps in fixtures to test specific scenarios
- Use `pnpm test` to run tests across all packages
- Follow existing test patterns for consistency

#### Vitest Configuration

- Each package should include a `vitest.config.ts` file for test configuration
- Import test functions from vitest: `import { describe, it } from 'vitest'`
- Use standard assertions with Node.js built-in `assert` module
- Test files should follow the pattern `test/**/*.test.ts`

#### Mocha Configuration (egg-bin only)

- The egg-bin package uses Mocha for CLI command testing
- Test files follow the pattern `test/**/*.test.ts`
- Uses comprehensive fixtures in `test/fixtures/` for testing various scenarios
- Includes Coffee.js for process testing and assertion helpers

### TypeScript Support

- Both `packages/egg/` and `packages/core/` written in TypeScript with strict mode
- Uses tsdown for unbundled ESM builds (faster development, preserves file structure)
- Each package configured with `tsdown.config.ts` for optimal build settings
- Type definitions are exported for framework users
- Examples support both .js and .ts application files
- Cross-package TypeScript references configured for proper module resolution

#### TypeScript Configuration Requirements

- **IMPORTANT: All sub-project tsconfig.json files MUST extend from the root project tsconfig.json**
- Use `"extends": "../../tsconfig.json"` in package tsconfig.json files
- Include `"baseUrl": "./"` in compilerOptions for proper path resolution
- Root tsconfig.json must include all packages in the `references` array
- This ensures consistent TypeScript configuration across the entire monorepo

### Documentation

- Main docs are in the `site/` directory using Dumi
- Examples are in the `examples/` directory
- Use `pnpm run site:dev` to work on documentation
- Plugin documentation follows the standardized format

### Workspace Dependencies

- Use `workspace:*` for internal package dependencies
- Use `catalog:` for external dependencies defined in pnpm-workspace.yaml
- All packages share common devDependencies from root
- pnpm automatically handles workspace linking

### Managing Catalog Dependencies

- Add new dependencies to the `catalog` section in `pnpm-workspace.yaml`
- Organize by category (linting, build tools, testing, etc.)
- Update versions in one place to keep consistency across packages
- Use `pnpm update --latest` to update catalog entries
- Reference catalog entries in individual packages with `"package-name": "catalog:"`

## Commit Message Format

**IMPORTANT: All commits MUST follow the [Angular Commit Message Format](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) as specified in CONTRIBUTING.md.**

### Format Structure

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Required Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation-only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation
- **deps**: Updates about dependencies

### Scope Guidelines

- Use package names for package-specific changes: `core`, `mock`, `cluster`, `utils`, etc.
- Use feature areas for cross-package changes: `loader`, `plugin`, `config`, etc.
- Use component names for specific functionality: `application`, `agent`, `context`, etc.

### Subject Guidelines

- Use succinct words to describe what you did in the commit change
- Use imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize first letter
- No period (.) at the end

### Body Guidelines (Optional)

- Add more content if the subject is not self-explanatory enough
- Explain the purpose or reason for the commit
- Include motivation for the change and contrasts with previous behavior

### Footer Guidelines

- **Breaking Changes**: Note clearly with "BREAKING CHANGE:" prefix
- **Related Issues**: Use format like "Closes #1, Closes #2, #3"
- **Cross-references**: Reference related repos like "eggjs/egg-core#123"

### Examples

```
feat(core): add support for async configuration loading

Allow configuration files to export async functions for dynamic config loading.
This enables loading configuration from external services or databases.

Closes #123
```

```
fix(mock): resolve memory leak in test cleanup

The mock cleanup process was not properly disposing of event listeners,
causing memory leaks during test runs.

Fixes #456
```

```
docs(tsconfig): update README with vitest integration examples

Add examples showing how to configure vitest with the tsconfig package.
Include setup instructions and common configuration patterns.
```
