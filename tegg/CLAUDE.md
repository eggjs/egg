# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Tegg is a modular IoC (Inversion of Control) framework for Egg.js, providing dependency injection, lifecycle management, and plugin architecture. It's designed for building large-scale, maintainable Node.js applications using TypeScript decorators.

**Requirements:**

- Node.js >= 22.18.0
- ESM only (no CommonJS)
- egg >= 4.0.0

## Monorepo Structure

This is a pnpm workspaces monorepo with catalog mode for centralized dependency management:

```
core/          # 24 core packages - decorators, runtime, metadata, loaders
plugin/        # 10 plugin packages - Egg.js plugins that integrate core functionality
standalone/    # 1 standalone package - standalone runtime without Egg.js
```

**Dependency Management:**

- Uses pnpm workspaces with `catalog:` protocol for shared external dependencies
- Uses `workspace:*` protocol for internal monorepo dependencies
- All shared dependency versions centralized in `pnpm-workspace.yaml`
- `catalogMode: prefer` set in `.npmrc` for automatic catalog usage

### Key Core Packages

- **core-decorator**: Basic decorators (`@Inject`, `@ContextProto`, `@SingletonProto`)
- **metadata**: Metadata management for prototypes, modules, and dependency graphs
- **runtime**: Runtime container and object lifecycle management
- **loader**: Module discovery and loading system
- **lifecycle**: Lifecycle hooks and management
- **types**: TypeScript type definitions
- **common-util**: Shared utilities

### Key Plugin Packages

- **plugin/tegg**: Main Egg.js plugin integrating tegg runtime
- **plugin/config**: Module configuration support
- **plugin/controller**: HTTP controller decorator support
- **plugin/aop**: AOP runtime integration
- **plugin/eventbus**: Event bus system
- **plugin/schedule**: Scheduled task support
- **plugin/dal**: Data access layer
- **plugin/orm**: Leoric ORM integration

## Development Commands

### Build & Clean

```bash
pnpm run build               # Build all packages (runs build in all workspaces)
pnpm run clean               # Clean all build artifacts (runs clean in all workspaces)
```

### Testing

```bash
pnpm test                    # Run vitest tests (core packages)
pnpm run test:mocha          # Run mocha tests (plugin packages)
pnpm run cov                 # Run coverage for vitest tests
pnpm run cov:mocha           # Run coverage for mocha tests
pnpm run ci                  # Full CI: cov + cov:mocha
```

### Type Checking & Linting

```bash
pnpm run typecheck           # Type check all workspaces
pnpm run lint                # Run oxlint with type-aware checking
pnpm run lint:fix            # Auto-fix lint issues
```

### Version Management

```bash
pnpm run version:patch       # Bump patch version (0.0.X)
pnpm run version:minor       # Bump minor version (0.X.0)
pnpm run version:major       # Bump major version (X.0.0)
pnpm run version:beta        # Bump prerelease beta version
pnpm run version:alpha       # Bump prerelease alpha version
pnpm run version:rc          # Bump prerelease rc version
```

### Working with Individual Packages

```bash
# Install dependencies
pnpm install                 # Install all dependencies using catalog versions

# Type check a specific package
pnpm -r run typecheck        # Type check all packages recursively

# Test a specific package
pnpm --filter @eggjs/tegg-runtime test

# Build a specific package
pnpm --filter @eggjs/tegg-metadata run build
```

## Architecture Concepts

### Prototype System

Tegg uses a prototype-based system where classes are decorated to define how they should be instantiated:

- **ContextProto**: Instance per request context (scoped to HTTP request)
- **SingletonProto**: Single instance for entire application lifecycle
- **MultiInstanceProto**: Multiple instances of same class with different qualifiers

Each prototype has:

- **AccessLevel**: `PRIVATE` (module-only) or `PUBLIC` (globally accessible)
- **InitType**: Defines lifecycle scope (`CONTEXT`, `SINGLETON`)
- **Name**: Instance identifier (defaults to camelCase class name)

### Dependency Injection

Dependencies are resolved through `@Inject()` decorator:

- Property injection: `@Inject() logger: Logger`
- Constructor injection: `constructor(@Inject() logger: Logger)`
- Optional injection: `@InjectOptional()` or `@Inject({ optional: true })`

**Injection Rules:**

- ContextProto can inject any prototype
- SingletonProto cannot inject ContextProto
- No circular dependencies allowed (between prototypes or modules)
- Cannot inject `ctx`/`app` directly - inject specific services instead

### Qualifiers

When multiple implementations exist, use qualifiers to disambiguate:

- `@InitTypeQualifier(ObjectInitType.CONTEXT)`: Specify init type
- `@ModuleQualifier('moduleName')`: Specify source module
- `@EggQualifier(EggType.CONTEXT)`: Specify egg context vs app
- Custom qualifiers for dynamic injection patterns

### Module System

Modules are organizational units discovered by scanning:

- `app/modules/` directory (auto-discovered)
- `config/module.json` (manual declaration for npm packages)

Each module contains:

- Prototype classes with decorators
- Optional `module.json` or `package.json` with tegg metadata
- Module-level dependencies on other modules

The **GlobalGraph** builds a dependency graph of all modules and validates:

- No circular module dependencies
- All prototype dependencies are resolvable
- Access level constraints are respected

### Lifecycle Hooks

Objects can implement `EggObjectLifecycle` interface or use decorators:

- `@LifecyclePostConstruct()`: After constructor
- `@LifecyclePreInject()`: Before dependency injection
- `@LifecyclePostInject()`: After dependency injection
- `@LifecycleInit()`: Custom async initialization
- `@LifecyclePreDestroy()`: Before object destruction
- `@LifecycleDestroy()`: Resource cleanup

### Runtime Object Management

The runtime manages object instances through:

- **EggObjectFactory**: Creates and retrieves object instances
- **LoadUnitInstance**: Manages module instances and their objects
- **EggContext**: Request-scoped context holding ContextProto instances
- **ContextObjectGraph**: Dependency graph for a specific context

## Testing Patterns

### Testing with MockApplication

```typescript
import { MockApplication } from '@eggjs/mock';

// Create context scope
await app.mockModuleContextScope(async (ctx: Context) => {
  // Get object by class
  const service = await ctx.getEggObject(HelloService);

  // Get object by name with qualifiers
  const logger = await ctx.getEggObjectFromName('logger', {
    qualifier: 'bizLogger',
  });
});
```

### Async Tasks in Tests

Use `BackgroundTaskHelper` instead of `setTimeout`/`setImmediate`:

```typescript
@ContextProto()
class MyService {
  @Inject()
  backgroundTaskHelper: BackgroundTaskHelper;

  async doWork() {
    this.backgroundTaskHelper.run(async () => {
      // Async work here
    });
  }
}
```

## Important Implementation Details

### Metadata Registration

Decorators register metadata on classes that is later used by the loader:

- Prototype metadata: `PrototypeUtil.setXXX()` stores on class
- Injection metadata: `InjectObjectInfo` stored per property/parameter
- Qualifier metadata: `QualifierUtil.addProperQualifier()` for disambiguation

### Loading Process

1. **Loader** scans directories and discovers modules
2. **EggPrototypeFactory** creates `EggPrototype` from decorated classes
3. **GlobalGraph** validates and builds dependency graph
4. **LoadUnitFactory** creates `LoadUnit` for each module
5. **Runtime** instantiates objects on-demand based on graph

### Dynamic Injection

For selecting implementations at runtime:

```typescript
// Define abstract class and enum
abstract class AbstractHello { abstract hello(): string; }
enum HelloType { FOO = 'FOO', BAR = 'BAR' }

// Create decorator
const Hello = QualifierImplDecoratorUtil.generatorDecorator(
  AbstractHello,
  'HELLO_ATTRIBUTE'
);

// Apply to implementations
@ContextProto()
@Hello(HelloType.FOO)
class FooHello extends AbstractHello { ... }

// Get instance dynamically
const impl = await eggObjectFactory.getEggObject(
  AbstractHello,
  HelloType.FOO
);
```

## Common Patterns

### Creating a New Core Package

1. Add to `core/` directory with standard structure
2. Include `tsconfig.json` extending `@eggjs/tsconfig`
3. Add `"typecheck": "tsc --noEmit"` script to `package.json`
4. Export public API through `src/index.ts`

### Creating a New Plugin

1. Add to `plugin/` directory
2. Define `eggPlugin` in `package.json` with dependencies
3. Create `app.ts` for initialization
4. Add tests using `@eggjs/mock`

### Working with TypeScript

- Use `emitDecoratorMetadata` for type inference in injection
- `design:type` and `design:paramtypes` are used for automatic dependency resolution
- All packages target ESM with `.js` extensions in imports
