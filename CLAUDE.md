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
- **`examples/`** - Example applications
  - `helloworld-commonjs/` - CommonJS example
  - `helloworld-typescript/` - TypeScript example
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
- `pnpm run ci` - Run CI tests in all packages
- `pnpm --filter=egg run test` - Test main egg package
- `pnpm --filter=egg run ci:app` - Run app-level tests only
- `pnpm --filter=egg run ci:cluster1` - Run cluster tests (part 1)
- `pnpm --filter=egg run ci:cluster2` - Run cluster tests (part 2)  
- `pnpm --filter=egg run ci:lib/core` - Run core library tests
- `pnpm --filter=egg run ci:lib/plugins` - Run plugin tests

### Build & Lint
- `pnpm run build` - Build all packages
- `pnpm run clean` - Clean dist directories in all packages
- `pnpm run lint` - Run ESLint in all packages

### Examples
- `pnpm run example:commonjs` - Run CommonJS example
- `pnpm run example:typescript` - Run TypeScript example

### Documentation Site
- `pnpm run site:dev` - Start documentation development server
- `pnpm run site:build` - Build documentation site
- `pnpm run site:prettier` - Format documentation files
- `pnpm run puml` - Generate PlantUML diagrams

## Key Configuration Files

- **`pnpm-workspace.yaml`** - pnpm workspace configuration
- **`package.json`** - Root monorepo configuration with pnpm scripts  
- **`packages/egg/package.json`** - Main egg package with hybrid CommonJS/ESM exports
- **`packages/egg/tsconfig.json`** - Extends @eggjs/tsconfig with strict mode enabled  
- **`packages/egg/src/config/plugin.ts`** - Built-in plugin configurations
- **`packages/egg/src/config/config.default.ts`** - Default framework configuration

## Framework Concepts

### Plugin System
Egg uses a powerful plugin system where plugins are loaded before application code. Each plugin can extend the framework's functionality and is configured in `config/plugin.js`.

### Cluster vs Single Mode
- **Cluster Mode** (default) - Multi-process with master, agent, and worker processes
- **Single Mode** - Single process for development/testing

### Loader Pattern  
The framework uses a convention-based loader system that automatically discovers and loads:
- Extensions (app/extend/*)
- Services (app/service/*)
- Controllers (app/controller/*)
- Middlewares (app/middleware/*)
- Configurations (config/*)

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
1. Create new directory under `packages/`
2. Add package.json with workspace dependencies using `workspace:*`
3. Update root pnpm-workspace.yaml if needed
4. Use `pnpm --filter=<package>` for package-specific commands

### Testing Strategy
- Use `pnpm --filter=egg run test` for framework tests
- Test fixtures are in `packages/egg/test/fixtures/apps/`
- Create apps in fixtures to test specific scenarios
- Use `pnpm test` to run tests across all packages
- Follow existing test patterns for consistency

### TypeScript Support
- Main framework in `packages/egg/` is written in TypeScript with strict mode
- Uses tshy for dual CommonJS/ESM builds
- Type definitions are exported for framework users
- Examples support both .js and .ts application files

### Documentation
- Main docs are in the `site/` directory using Dumi
- Examples are in the `examples/` directory 
- Use `pnpm run site:dev` to work on documentation
- Plugin documentation follows the standardized format

### Workspace Dependencies
- Use `workspace:*` for internal package dependencies
- All packages share common devDependencies from root
- pnpm automatically handles workspace linking