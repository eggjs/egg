# Eggjs Framework - GitHub Copilot Development Instructions

**Always reference these instructions first and fallback to search or additional context gathering only when you encounter unexpected information that does not match the information provided here.**

## Overview

Eggjs is a progressive Node.js framework for building enterprise-class server-side applications. Built on top of Koa.js, it provides a plugin system, conventions over configuration, and enterprise-grade features like clustering, logging, and security.

This is a **utoo monorepo** with multiple packages using utoo workspaces and catalog mode for centralized dependency management.

## Prerequisites and Environment Setup

- **Node.js >= 20.19.0 required** - This is a hard requirement
- Enable utoo first: `corepack enable utoo` (installs utoo v10.16.0)
- **NEVER CANCEL** any build or test commands - they can take several minutes to complete

## Bootstrap and Build Process

**Always run these commands in sequence after fresh clone:**

```bash
# 1. Enable utoo (required first)
corepack enable utoo

# 2. Install all dependencies - takes ~63 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
utoo install

# 3. Build all packages - takes ~14 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
utoo run build

# 4. Run linting (optional but recommended) - takes ~2 seconds
utoo run lint
```

## Monorepo Structure

### Key Packages (all in `packages/` directory)

- **`packages/egg/`** - Main Eggjs framework (TypeScript, uses tsdown for builds)
- **`packages/core/`** - Core plugin framework
- **`packages/utils/`** - Utility functions
- **`packages/mock/`** - Testing utilities
- **`packages/cluster/`** - Cluster management
- **`packages/koa/`** - Koa web framework
- **`packages/supertest/`** - HTTP testing utilities
- **`packages/extend2/`** - Object extension utility

### Supporting Directories

- **`examples/`** - Two example apps: `helloworld-commonjs` and `helloworld-typescript` (currently have runtime issues)
- **`site/`** - Documentation website built with Dumi

## Essential Commands and Timing

### Build Commands

- `utoo run build` - **Build all packages (~14 seconds). NEVER CANCEL. Set timeout to 60+ seconds.**
- `utoo run clean` - Clean all dist directories

### Testing Commands

- `utoo run test` - **Run all tests (~2 minutes). NEVER CANCEL. Set timeout to 180+ seconds.**
- `utoo run test:cov` - **Run tests with coverage (~2 minutes). NEVER CANCEL. Set timeout to 180+ seconds.**
- `utoo run ci` - **Run test coverage + build (~2.1 minutes). NEVER CANCEL. Set timeout to 180+ seconds.**

### Linting Commands

- `utoo run lint` - Run oxlint across all packages (~2 seconds)

### Documentation Commands

- `utoo run site:dev` - Start documentation dev server at http://localhost:8000
- `cd site && utoo run build:skip` - **Build documentation site (~24 seconds). NEVER CANCEL. Set timeout to 60+ seconds.**

### Example Applications (Currently Not Working)

- `utoo run example:commonjs` - Start CommonJS example (has runtime issues)
- `utoo run example:typescript` - Start TypeScript example (has runtime issues)

## Package-Specific Commands

Run commands for specific packages using `utoo --filter=<package>`:

```bash
# Examples
utoo --filter=egg run test
utoo --filter=@eggjs/core run build
utoo --filter=site run dev
```

## Development Workflow

### 1. Making Changes

- Always build packages first: `utoo run build`
- Work primarily in `packages/egg/src/` for core framework features
- Use TypeScript throughout - all packages are TypeScript-based
- Follow the existing directory conventions in `packages/egg/src/`:
  - `lib/` - Core classes (Application, Agent, EggApplicationCore)
  - `app/extend/` - Framework extensions (context, helper, request, response)
  - `config/` - Default configurations and plugins
  - `lib/core/` - Core components (httpclient, logger, messenger)
  - `lib/loader/` - Application loaders

### 2. Validation Steps

**Always perform these validation steps after making changes:**

```bash
# 1. Build all packages (required)
utoo run build

# 2. Run linting
utoo run lint

# 3. Run tests (some failures are expected in fresh environment)
utoo run test

# 4. Test documentation site
utoo run site:dev
```

### 3. Testing Strategy

- **All packages use Vitest for testing** - this is the standard test runner
- Test files follow pattern: `test/**/*.test.ts`
- Use `import { describe, it } from 'vitest'` for test functions
- Use Node.js built-in `assert` module for assertions
- Create test fixtures in `packages/egg/test/fixtures/apps/` for scenario testing

## Key Framework Concepts

### Architecture

- **EggApplicationCore** - Base application class with core functionality
- **Application** - Main app class for worker processes
- **Agent** - Agent process class for background tasks
- **Context** - Extended Koa context with Egg-specific features
- **BaseContextClass** - Base for controllers, services, subscriptions

### Loading Convention (Automatic Discovery Order)

1. Plugin system
2. Configurations
3. Application/Request/Response/Context extensions
4. Custom loaders
5. Services
6. Middlewares
7. Controllers
8. Router

### Cluster vs Single Mode

- **Cluster Mode** (default) - Multi-process with master, agent, and worker processes
- **Single Mode** - Single process for development/testing

## Working with TypeScript

- All packages use strict TypeScript mode
- Uses tsdown for unbundled ESM builds (preserves file structure)
- Each package has `tsdown.config.ts` for build configuration
- **All sub-project tsconfig.json files MUST extend from root:** `"extends": "../../tsconfig.json"`
- Root tsconfig.json includes all packages in `references` array

## utoo Workspace & Catalog Dependencies

- Dependencies defined in `pnpm-workspace.yaml` catalog section
- Reference catalog entries: `"package-name": "catalog:"`
- Internal workspace dependencies: `"package-name": "workspace:*"`
- This ensures consistent versions across all packages

## Common Issues and Troubleshooting

### Test Failures

- Some tests may fail in fresh environments - this is normal
- Focus on fixing only failures related to your changes
- Examples may have runtime issues - don't use them for validation

### Build Issues

- Always run `utoo run build` after making changes
- TypeScript compilation errors will show clearly
- Build warnings are generally acceptable

### ESM/CommonJS Issues

- Framework supports both ESM and CommonJS
- Main package exports both formats
- If you see "ERR_UNKNOWN_FILE_EXTENSION" errors, ensure packages are built first

## File Locations Reference

### Key Configuration Files

- `pnpm-workspace.yaml` - Workspace and catalog configuration
- `package.json` - Root monorepo scripts and devDependencies
- `packages/egg/package.json` - Main framework package configuration
- `packages/egg/tsdown.config.ts` - Build configuration
- `packages/egg/src/config/plugin.ts` - Built-in plugin configurations
- `packages/egg/src/config/config.default.ts` - Default framework configuration

### Important Source Files

- `packages/egg/src/lib/application.ts` - Main Application class
- `packages/egg/src/lib/agent.ts` - Agent process manager
- `packages/egg/src/lib/egg.ts` - Core EggApplicationCore
- `packages/egg/src/lib/start.ts` - Application startup logic
- `packages/egg/src/lib/loader/` - Convention-based loaders

### Build Outputs

- `packages/*/dist/` - Built JavaScript and TypeScript definitions
- `site/dist/` - Built documentation site

## Validation Scenarios

After making changes, always verify:

1. **Build Success**: `utoo run build` completes without errors
2. **Linting Passes**: `utoo run lint` shows no new errors
3. **Documentation Loads**: `utoo run site:dev` starts successfully and site loads at http://localhost:8000
4. **Tests Run**: `utoo run test` executes (some failures expected, focus on your changes)

**Remember**: This is a complex enterprise framework. Always build first, validate incrementally, and focus on the core packages (`egg`, `core`, `utils`) for most development work.

## Commit Message Format

**CRITICAL: All commits MUST follow the [Angular Commit Message Format](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) as specified in CONTRIBUTING.md.**

### Required Format Structure

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Mandatory Types

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

- **Package-specific changes**: Use package names like `core`, `mock`, `cluster`, `utils`, `tsconfig`, `extend2`
- **Cross-package changes**: Use feature areas like `loader`, `plugin`, `config`, `build`
- **Component-specific**: Use component names like `application`, `agent`, `context`

### Subject Rules

- Use imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize first letter
- No period (.) at the end
- Be succinct and descriptive

### Examples

```
feat(tsconfig): integrate package into monorepo with vitest

Merge @eggjs/tsconfig repository into packages/tsconfig/ and refactor
to use vitest testing framework instead of Node.js test runner.

- Update all consuming packages to use workspace:* dependencies
- Add vitest configuration and convert test assertions
- Remove external catalog dependency in favor of workspace package

Closes #123
```

```
fix(core): resolve loader initialization race condition

The loader was attempting to initialize plugins before configurations
were fully loaded, causing intermittent startup failures.

Fixes #456
```

```
chore: update dependencies to latest versions

Update catalog dependencies and rebuild packages to ensure
compatibility with latest versions.
```

**NEVER commit without following this format - it breaks the project's automated changelog and release process.**
