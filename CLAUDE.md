# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Eggjs** framework - a progressive Node.js framework for building enterprise-class server-side applications. Built on top of Koa.js, it provides a plugin system, conventions over configuration, and enterprise-grade features like clustering, logging, and security.

**This project is structured as a pnpm monorepo** with multiple packages and uses pnpm workspaces for dependency management.

### Node.js Requirements

**IMPORTANT: All packages in this monorepo require Node.js >= 22.18.0**. This minimum version is enforced across all packages to ensure compatibility with modern JavaScript features and optimal performance.

> Node.js will be able to execute TypeScript files without additional configuration. See https://nodejs.org/en/blog/release/v22.18.0

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
- **`packages/cookies/`** - Cookie handling utilities (merged from @eggjs/cookies)
  - `src/` - Cookies TypeScript source code
  - `test/` - Cookies test suite with Mocha
- **`packages/koa/`** - Koa web framework (merged from @eggjs/koa)
  - `src/` - Koa TypeScript source code
  - `test/` - Koa test suite
- **`packages/supertest/`** - HTTP testing utilities (merged from @eggjs/supertest)
  - `src/` - Supertest TypeScript source code
  - `test/` - Supertest test suite
- **`packages/extend2/`** - Object extension utility (merged from extend2)
  - `src/` - Extend2 TypeScript source code
  - `test/` - Extend2 test suite
- **`packages/koa-static-cache/`** - Static file serving with cache (merged from @eggjs/koa-static-cache)
  - `src/` - TypeScript source code for static cache middleware
  - `test/` - Test suite with Vitest
- **`packages/router/`** - Router middleware for Koa/Egg (merged from @eggjs/router)
  - `src/` - TypeScript source code for router implementation
  - `test/` - Test suite with Vitest
  - Provides RESTful resource routing and middleware composition
  - Supports route parameter matching with path-to-regexp
  - Includes EggRouter class with additional convenience methods
- **`plugins/`** - Egg framework plugins (all plugins should be located here)
  - `development/` - Development plugin for local development (merged from @eggjs/development)
    - Provides development tools and auto-reload functionality
    - Only enabled in local environment
  - `watcher/` - File watcher plugin (merged from @eggjs/watcher)
    - Provides file system watching capabilities
    - Supports multiple event sources for different environments
    - Used by development plugin for auto-reload functionality
  - `schedule/` - Task scheduling plugin (merged from @eggjs/schedule)
    - Provides cron-based task scheduling capabilities
    - Supports interval and cron expression scheduling
    - Manages scheduled tasks across worker processes
  - `static/` - Static file serving plugin (merged from @eggjs/static)
    - Provides static file serving middleware
    - Supports multiple static directories
    - Includes cache control and range request support
    - Built on top of koa-static-cache
  - `security/` - Security plugin (merged from @eggjs/security)
    - Provides comprehensive security middleware and helpers
    - CSRF protection with token and referer validation
    - XSS prevention with content filtering and escape utilities
    - Path traversal protection and safe redirects
    - Security headers (HSTS, CSP, X-Frame-Options, etc.)
    - SSRF protection for HTTP client requests
    - Configurable security policies per environment
  - `session/` - Session management plugin (merged from @eggjs/session)
    - Provides session middleware based on koa-session
    - Supports both cookie and external session stores
    - Built-in memory store for development
    - Configurable session options (maxAge, renew, etc.)
    - Session encryption and signing
  - `logrotator/` - Log rotation plugin (merged from @eggjs/logrotator)
    - Provides automatic log file rotation based on time or size
    - Supports daily rotation with configurable patterns
    - Includes log cleanup to remove old files based on maxDays
    - Manages all application and custom logger files
    - Integrates with schedule plugin for automated rotation tasks
  - `multipart/` - Multipart form data handling plugin (merged from @eggjs/multipart)
    - Provides multipart/form-data parsing for file uploads
    - Supports both stream and file modes for handling uploads
    - Built-in file size and type validation
    - Automatic temporary file cleanup
    - Configurable whitelist/blacklist for file extensions
    - Integration with schedule plugin for tmpdir cleanup
  - `i18n/` - Internationalization plugin (merged from @eggjs/i18n)
    - Provides internationalization support for multi-language applications
    - Supports multiple file formats (JSON, JS, YAML, Properties, INI)
    - Automatic locale detection from query, cookie, or header
    - Context-aware translation helpers
    - Domain-specific locale configurations
    - Built-in pluralization support
  - `view/` - Base view plugin (merged from @eggjs/view)
    - Provides template rendering infrastructure for Egg applications
    - Supports multiple template engines through plugin system
    - Implements ViewManager for managing template engine instances
    - Extends context with render() method for template rendering
    - Built-in mapping configuration for file extensions to engines
    - Template engine agnostic - works with ejs, nunjucks, handlebars, etc.
  - `view-nunjucks/` - Nunjucks template engine plugin (merged from egg-view-nunjucks)
    - Provides Nunjucks template engine integration for Egg applications
    - Built on Mozilla's Nunjucks templating engine
    - Extends ViewHelper with Nunjucks-specific safe string helpers
    - Auto-injects CSRF tokens and CSP nonce attributes
    - Supports custom filters and template caching
    - Includes sandbox protection against prototype pollution attacks
    - Depends on security and view plugins
  - `tracer/` - Request tracing plugin (merged from @eggjs/tracer)
    - Provides distributed tracing capabilities for Egg applications
    - Automatically generates and tracks traceId, spanId, and parentSpanId
    - Extends context with tracer object for request correlation
    - Supports custom tracer implementations via Class configuration
    - Integrates with application and agent processes for full tracing coverage
  - `typebox-validate/` - TypeBox validation plugin (merged from egg-typebox-validate)
    - Provides schema validation for TypeScript Egg projects
    - Built on Ajv with TypeBox schema definitions
    - Extends context with tValidate() and tValidateWithoutThrow() methods
    - Includes decorator support for controller validation
    - Supports custom formats and validation rules
    - Re-exports TypeBox for schema definitions
  - `redis/` - Redis/Valkey plugin (merged from @eggjs/redis)
    - Provides Redis and Valkey client integration for Egg applications
    - Built on ioredis for full Redis feature support
    - Supports single instance, cluster, and sentinel configurations
    - Multi-client support with singleton pattern
    - Weak dependency mode for optional Redis connections
    - Extends Application and Agent with redis property
- **`packages/skills/`** - AI agent skills for Egg framework (@eggjs/skills)
  - Pure markdown documentation package (no source code)
  - Provides structured guidance for AI assistants working with Egg
  - `egg/` - Entry point skill that routes to specialized skills
  - `egg-controller/` - Controller implementation skill (HTTP, MCP, Schedule)
  - `egg-core/` - Core framework concepts skill (modules, DI, lifecycle)
- **`examples/`** - Example applications
  - `helloworld-commonjs/` - CommonJS example
  - `helloworld-typescript/` - TypeScript example
- **`tools/egg-bin/`** - CLI development tool package (@eggjs/bin)
  - `src/` - TypeScript source code for CLI commands
  - `test/` - Comprehensive test suite with mocha
- **`site/`** - Documentation website built with VitePress v2

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
- `pnpm -r run typecheck` - Run TypeScript type checking with `tsc --noEmit`
- `pnpm lint` - Run oxlint with type-aware checking in all packages
- `pnpm lint:fix` - Auto-fix linting issues with oxlint

### Examples

- `pnpm run example:commonjs` - Run CommonJS example
- `pnpm run example:typescript` - Run TypeScript example

### Documentation Site

- `pnpm run site:dev` - Start VitePress documentation development server
- `pnpm run site:build` - Build VitePress documentation site
- `pnpm run site:preview` - Preview built documentation site
- `pnpm run puml` - Generate PlantUML diagrams

## Key Configuration Files

- **`pnpm-workspace.yaml`** - pnpm workspace configuration with catalog dependencies
- **`package.json`** - Root monorepo configuration with pnpm scripts
- **`tsconfig.json`** - Root TypeScript configuration for all packages (extends @eggjs/tsconfig)
- **`packages/egg/package.json`** - Main egg package with hybrid CommonJS/ESM exports
- **`packages/egg/tsconfig.json`** - Extends workspace root tsconfig.json
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
3. Create minimal TypeScript config files:
   - `tsconfig.json` → `{"extends": "../../tsconfig.json"}`
4. Add package reference to root tsconfig.json `references` array
5. Update root pnpm-workspace.yaml if needed (plugins/\* is already included)
6. **CRITICAL: Run `pnpm install` and commit the updated `pnpm-lock.yaml`** — CI uses `--frozen-lockfile` and will fail immediately if the lockfile is out of sync with any package.json
7. Use `pnpm --filter=<package>` for package-specific commands

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
  - `tsdown.config.ts` - Only needed if custom build options required (see below)

#### tsdown Workspace Configuration

**This monorepo uses tsdown workspace mode** for build configuration. The root `/tsdown.config.ts` defines shared defaults for all packages:

- `entry: 'src/**/*.ts'` - Processes all TypeScript files in src directory
- `unbundle: true` - Creates unbundled output (preserves file structure)
- `dts: true` - Generates TypeScript declaration files
- `exports.devExports: true` - Enables development-friendly exports
- `unused.level: 'error'` - Error on unused dependencies
- `publint` - Package linting enabled

**Most plugins do NOT need a `tsdown.config.ts` file** - they inherit all settings from the root workspace config.

**Only create a `tsdown.config.ts` if you need custom options** (e.g., copy assets, custom entry points, ignore unused deps):

```typescript
// plugins/[plugin-name]/tsdown.config.ts - ONLY if custom options needed
import { defineConfig } from 'tsdown';

export default defineConfig({
  // Only specify options that differ from workspace defaults
  copy: [
    {
      from: 'src/assets/template.html',
      to: 'dist/assets',
    },
  ],
});
```

#### Standard Plugin TypeScript Types

**IMPORTANT: All plugins MUST define a `src/types.ts` file** that extends the Egg module declarations:

```typescript
// plugins/[plugin-name]/src/types.ts
import type { PluginConfig } from './config/config.default.ts';
// Import other necessary types from the plugin

declare module 'egg' {
  // Extend EggAppConfig with plugin configuration
  interface EggAppConfig {
    [pluginName]: PluginConfig;
  }

  // Extend Application if the plugin adds application-level features
  interface Application {
    // Add application extensions
  }

  // Extend Context if the plugin adds context-level features
  interface Context {
    // Add context extensions
  }

  // Extend other interfaces as needed (Request, Response, Helper, etc.)
}
```

Key requirements for plugin types:

- **Must use module augmentation** - Extend the 'egg' module using `declare module 'egg'`
- **Export configuration types** - Define and extend `EggAppConfig` with the plugin's configuration
- **Extend appropriate interfaces** - Add type definitions to Application, Context, Request, Response, or Helper as needed
- **Import from relative paths** - Use `.ts` extensions in imports for proper TypeScript resolution
- **Document properties** - Add JSDoc comments for configuration properties

Example from the view plugin:

```typescript
// plugins/view/src/types.ts
import type { ViewConfig } from './config/config.default.ts';
import type { ContextView } from './lib/context_view.ts';
import type { RenderOptions, ViewManager } from './lib/view_manager.ts';

declare module 'egg' {
  interface EggAppConfig {
    view: ViewConfig;
  }

  interface Application {
    get view(): ViewManager;
  }

  interface Context {
    view: ContextView;
    render(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<void>;
    renderView(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string>;
    renderString(tpl: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string>;
  }
}
```

#### Standard Plugin package.json Configuration

Plugins should configure their package.json following this pattern:

```json
{
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./agent": "./src/agent.ts",
    "./app": "./src/app.ts",
    "./package.json": "./package.json"
    // Add other entry points as needed
  },
  "publishConfig": {
    "exports": {
      ".": "./dist/index.js",
      "./types": "./dist/types.js",
      "./agent": "./dist/agent.js",
      "./app": "./dist/app.js",
      "./package.json": "./package.json"
      // Mirror the exports structure for published package
    }
  },
  "peerDependencies": {
    "egg": "workspace:*"
  },
  "files": ["dist"],
  "scripts": {
    "typecheck": "tsgo --noEmit",
    "test": "vitest run"
  }
}
```

Key points:

- **All plugins must include egg in peerDependencies** - Ensures compatibility with the framework
- Development uses TypeScript sources directly (`./src/*.ts`)
- Published packages use compiled JavaScript (`./dist/*.js`)
- The `publishConfig.exports` overrides `exports` during npm publish
- All plugins must include `build`, `clean`, and `prepublishOnly` scripts

### Skills Package Structure

- **`packages/skills/`** - AI agent skills for Egg framework (@eggjs/skills)
  - 纯 markdown 文档包，指导 AI 助手使用 Egg 框架
  - `egg/` — 入口 skill，路由到专业 skill
  - `egg-core/` — 核心概念：模块、依赖注入、生命周期
  - `egg-controller/` — 控制器：HTTPController、MCPController、Schedule、Ajv 校验
  - `eval/` — 评测用例和输出
  - Skill 编写规范、评测流程等详见 `packages/skills/CLAUDE.md`

### Tool Packages Structure

Tool packages (like egg-bin) should be placed in the `tools/` directory:

- **`tools/egg-bin/`** - CLI development tool providing dev, test, and coverage commands
- Built with @oclif/core framework for robust CLI functionality
- Supports TypeScript compilation and execution for Egg.js applications
- Includes comprehensive testing with Mocha and fixtures
- Uses tsdown for TypeScript compilation to maintain fast development builds

### Testing Strategy

- **IMPORTANT: All new packages MUST use Vitest for testing** - this is the standard test runner for the monorepo
- **Exception: egg-bin and cookies use Mocha** - these packages use Mocha for consistency with their testing patterns
- Use `pnpm --filter=egg run test` for framework tests
- Test fixtures are in `packages/egg/test/fixtures/apps/`
- Create apps in fixtures to test specific scenarios
- Use `pnpm test` to run tests across all packages
- Follow existing test patterns for consistency

#### Linting and Type Checking Strategy

- **All packages must include TypeScript type checking** - Use `tsc --noEmit` in `typecheck` script
- **All packages use oxlint for linting** - No ESLint configurations should be present
- Use `oxlint --type-aware` for enhanced TypeScript checking
- oxlint automatically respects `.gitignore` patterns for file exclusion
- Package-specific scripts:
  - `"typecheck": "tsgo --noEmit"` - Pure TypeScript type checking
  - `"lint": "oxlint --type-aware"` - Linting with type awareness
- Remove any `.eslintrc` or `.eslintrc.js` files when migrating packages

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

**IMPORTANT: The monorepo uses a standardized TypeScript configuration pattern where all sub-projects extend from the workspace root.**

**Root Configuration Files:**

- `tsconfig.json` - Base TypeScript configuration for all packages
  - Extends from `@eggjs/tsconfig` with common compiler options
  - Uses `${configDir}` variable for dynamic path resolution
  - Includes project `references` array listing all sub-packages
  - Sets `composite: true` and `incremental: true` for project references

**Sub-Project Configuration Pattern:**

All packages, plugins, and tools MUST follow this minimal pattern:

```json
// packages/*/tsconfig.json, plugins/*/tsconfig.json, tools/*/tsconfig.json
{
  "extends": "../../tsconfig.json"
}
```

**Key Requirements:**

- **Keep it minimal** - Sub-project configs should ONLY contain the `extends` field
- **No additional options** - Don't add `compilerOptions`, `baseUrl`, or other settings
- **Centralized configuration** - All settings are managed at the workspace root
- **Use ${configDir}** - Root configs use this variable for per-package path resolution
- **Update references** - When adding new packages, add them to root tsconfig.json `references` array

This approach ensures:

- Consistent TypeScript configuration across all 31+ sub-projects
- Easy maintenance (change once at root, applies everywhere)
- Proper TypeScript project references for fast builds
- Clean and readable per-package configuration files

### Documentation

- Main docs are in the `site/` directory using VitePress v2
- Documentation structure:
  - `site/.vitepress/config.mts` - VitePress configuration with i18n support
  - `site/docs/` - English documentation (root locale)
  - `site/docs/zh-CN/` - Chinese documentation
  - `site/docs/public/` - Static assets (images, logos, etc.)
- VitePress features:
  - Full i18n support (English and Chinese)
  - Clean URLs without .html extension
  - Local search built-in
  - Responsive design and dark mode support
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

## Code Style and Quality

### Linting and Formatting

- **TypeScript Compiler (tsc)** - Type checking with `tsc --noEmit`
  - Ensures type safety without generating output files
  - Run `pnpm -r run typecheck` for all packages
- **oxlint** - Fast, type-aware linter used across all packages
  - Provides additional linting rules beyond TypeScript checking
  - Significantly faster than ESLint with comparable rules
  - Uses `--type-aware` flag for enhanced TypeScript analysis
- **oxfmt** - Code formatting (primarily for documentation)
- Run `pnpm lint` to check code quality with oxlint
- Run `pnpm lint:fix` to auto-fix linting issues
- Each package uses oxlint which automatically respects `.gitignore` patterns

### TypeScript Best Practices

- Enable strict mode in all TypeScript packages
- Use explicit return types for public APIs
- Prefer interfaces over type aliases for object shapes
- Use readonly modifiers where appropriate
- Avoid `any` type; use `unknown` when type is truly unknown

### TypeScript isolatedDeclarations Support

**IMPORTANT: All packages in this monorepo support TypeScript's `--isolatedDeclarations` flag**, which enables faster type checking and better DTS generation.

#### Requirements for isolatedDeclarations

When writing code, you MUST follow these patterns:

1. **Explicit Return Types**: All exported functions, methods, and getters must have explicit return type annotations

   ```typescript
   // ✅ Good
   export function getData(): Promise<string> { ... }
   export class Foo {
     getBar(): string { ... }
   }

   // ❌ Bad - missing return type
   export function getData() { ... }
   ```

2. **Config File Exports**: Use typed intermediate variables for tsdown and vitest configs

   ```typescript
   // tsdown.config.ts
   import { defineConfig, type UserConfig } from 'tsdown';

   const config: UserConfig = defineConfig({...});
   export default config;

   // vitest.config.ts
   import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

   const config: UserWorkspaceConfig = defineProject({...});
   export default config;
   ```

3. **Symbol-Based Properties**: Avoid computed property names with symbols in class declarations

   ```typescript
   // ✅ Good - use override methods
   protected override customEggLoader(): typeof AppWorkerLoader {
     return AppWorkerLoader;
   }

   // ❌ Bad - computed property not supported
   get [EGG_LOADER]() { return AppWorkerLoader; }
   ```

4. **Explicit Property Types**: Add type annotations for class properties when needed

   ```typescript
   // ✅ Good
   Helper: typeof Helper = Helper;
   mockRestore: typeof restore = restore;

   // ❌ Bad - missing type annotation
   mockRestore = restore;
   ```

5. **Symbol Constants**: Use `unique symbol` type for exported symbols

   ```typescript
   // ✅ Good
   export const MY_SYMBOL: unique symbol = Symbol('my-symbol');

   // ❌ Bad - missing type annotation
   export const MY_SYMBOL = Symbol('my-symbol');
   ```

#### Exceptions

- **@oclif CLI tools** (tools/egg-bin, tools/scripts) have `isolatedDeclarations: false` in their tsconfig.json because @oclif's Flags API is incompatible with this strict mode

### Code Coverage Requirements

- Maintain high test coverage (>90% for core packages)
- Use `pnpm --filter=<package> run cov` to generate coverage reports
- Coverage reports are generated in `coverage/` directory
- Critical paths must have 100% coverage

## Debugging and Development Tips

### Running in Debug Mode

```bash
# Debug main application
NODE_OPTIONS='--inspect' pnpm --filter=egg run dev

# Debug tests
NODE_OPTIONS='--inspect-brk' pnpm --filter=egg run test

# Debug specific test file
NODE_OPTIONS='--inspect-brk' pnpm --filter=egg run test test/app/extend/context.test.ts
```

### Environment Variables

- `EGG_SERVER_ENV` - Set server environment (local/test/prod)
- `NODE_ENV` - Node environment (development/production)
- `EGG_TYPESCRIPT` - Enable TypeScript support (true/false)
- `DEBUG` - Enable debug output (egg:\*)

### Debugging E2E Tests Locally

The `ecosystem-ci/` directory contains E2E test infrastructure for downstream projects (e.g., cnpmcore). To reproduce and debug E2E failures locally:

```bash
# 1. Build all monorepo packages
pnpm run build

# 2. Pack all packages as tgz files (placed at workspace root)
pnpm -r pack

# 3. Clone the downstream project into ecosystem-ci/
git clone https://github.com/cnpmjs/cnpmcore.git ecosystem-ci/cnpmcore

# 4. Patch the project's package.json with local tgz overrides
npx tsx ecosystem-ci/patch-project.ts cnpmcore

# 5. Install (clean cache to avoid stale tgz)
cd ecosystem-ci/cnpmcore
npm cache clean --force
npm install

# 6. Run tests
npm run clean
npx egg-bin test test/path/to/specific.test.ts
```

After making changes to monorepo packages, repeat steps 1-5 (build → pack → patch → clean install).

**Key files:**

- `ecosystem-ci/patch-project.ts` - Generates `overrides` field in target project's package.json pointing to local tgz files
- `ecosystem-ci/repo.json` - Defines which downstream projects can be tested
- `.github/workflows/e2e-test.yml` - CI workflow that runs E2E tests with MySQL/Redis services

### Common Development Patterns

#### Creating a New Service

```typescript
// app/service/example.ts
import { Service } from 'egg';

export default class ExampleService extends Service {
  async getData(id: string) {
    const result = await this.ctx.curl(`/api/data/${id}`);
    return result.data;
  }
}
```

#### Creating a New Controller

```typescript
// app/controller/example.ts
import { Controller } from 'egg';

export default class ExampleController extends Controller {
  async index() {
    const { ctx } = this;
    const data = await ctx.service.example.getData('123');
    ctx.body = { success: true, data };
  }
}
```

#### Creating a New Middleware

```typescript
// app/middleware/example.ts
import { Context, Next } from 'egg';

export default function exampleMiddleware() {
  return async (ctx: Context, next: Next) => {
    const start = Date.now();
    await next();
    ctx.set('X-Response-Time', `${Date.now() - start}ms`);
  };
}
```

## Performance Optimization

### Build Optimization

- Use `pnpm -r run build --parallel` for parallel builds
- tsdown provides fast unbundled builds
- Use `pnpm run clean` before builds to ensure clean state

### Runtime Optimization

- Use cluster mode for production deployments
- Configure worker count based on CPU cores
- Enable graceful shutdown for zero-downtime deployments
- Use agent process for background tasks

### Memory Management

- Monitor memory usage with built-in metrics
- Use weak references for caches when appropriate
- Implement proper cleanup in lifecycle hooks
- Avoid global state in worker processes

## Troubleshooting Guide

### Common Issues

#### Package Resolution Issues

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### TypeScript Build Errors

```bash
# Clean all build artifacts
pnpm -r run clean

# Check TypeScript types across all packages
pnpm -r run typecheck

# Check TypeScript configuration for specific package
pnpm --filter=<package> run typecheck

# Rebuild TypeScript references
pnpm run build:ts
```

#### Test Failures

```bash
# Run tests with verbose output
pnpm --filter=<package> run test -- --verbose

# Run specific test file
pnpm --filter=egg run test test/app/extend/context.test.ts

# Debug test with inspector
NODE_OPTIONS='--inspect-brk' pnpm --filter=egg run test
```

### Development Workflow Issues

- **Auto-reload not working**: Check if development plugin is enabled
- **Port already in use**: Change port in config or kill existing process
- **Module not found**: Ensure proper workspace linking with `pnpm install`
- **Type errors in IDE**: Restart TypeScript service or reload window

## Security Considerations

### Framework Security Features

- Built-in CSRF protection
- XSS prevention helpers
- SQL injection protection via parameterized queries
- Security headers middleware
- Cookie encryption and signing

### Security Best Practices

- Never expose sensitive configuration in logs
- Use environment variables for secrets
- Validate all user inputs
- Implement rate limiting for APIs
- Regular dependency updates via `pnpm update`

## Migration Guide

### Migrating from ESLint to oxlint

1. Remove ESLint dependencies from package.json:
   - Remove `eslint`, `eslint-config-egg`, and any ESLint plugins
   - Add `"oxlint": "catalog:"` to devDependencies
2. Delete `.eslintrc`, `.eslintrc.js`, or `.eslintrc.json` files
3. Update scripts in package.json:
   - Add `"typecheck": "tsgo --noEmit"` for TypeScript type checking
   - Change `"lint": "eslint ..."` to `"lint": "oxlint --type-aware"`
   - Add `"lint:fix": "npm run lint -- --fix"`
4. Ensure both type checking and linting are run:
   - Use `tsc --noEmit` for pure TypeScript type checking
   - Use `oxlint --type-aware` for additional linting rules
5. Run `pnpm install` to update dependencies

### Migrating from Egg v2 to v3

1. Update Node.js to v22.18.0+ (required minimum version)
2. Migrate to ESM syntax where applicable
3. Update plugin configurations
4. Review breaking changes in CHANGELOG.md
5. Run tests to identify compatibility issues

### Converting CommonJS to ESM

1. Add `"type": "module"` to package.json
2. Change `require()` to `import`
3. Change `module.exports` to `export`
4. Update file extensions to `.mjs` if needed
5. Update tsconfig.json module settings

## Release Process

### Version Management

- Follow [Semantic Versioning](https://semver.org/)
- Update CHANGELOG.md with release notes
- Use conventional commits for automatic changelog generation

### Publishing Packages

```bash
# Build all packages
pnpm -r run build

# Run tests
pnpm test

# Bump versions
pnpm changeset

# Publish to npm
pnpm changeset publish
```

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

## Contributing Guidelines

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/egg.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make changes and add tests
6. Run tests: `pnpm test`
7. Submit a pull request

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Follow commit message format
4. Request review from maintainers
5. Address review feedback promptly

### Code Review Checklist

- [ ] Tests added/updated for changes
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes without discussion
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Resources and Links

### Official Documentation

- [Egg.js Official Website](https://www.eggjs.org/)
- [API Documentation](https://www.eggjs.org/api/)
- [Plugin Directory](https://github.com/eggjs/awesome-egg)

### Community

- [GitHub Discussions](https://github.com/eggjs/egg/discussions)
- [Discord Server](https://discord.gg/eggjs)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/eggjs)

### Related Projects

- [Koa.js](https://koajs.com/) - Underlying web framework
- [Midway.js](https://midwayjs.org/) - Enterprise Node.js framework
- [Think.js](https://thinkjs.org/) - Alternative Node.js framework
