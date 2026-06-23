# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Tegg is a modular IoC (Inversion of Control) framework for Egg.js, providing dependency injection, lifecycle management, and plugin architecture. It's designed for building large-scale, maintainable Node.js applications using TypeScript decorators.

**Requirements:**

- Node.js >= 22.18.0
- ESM only (no CommonJS)
- egg >= 4.1.0

## Monorepo Structure

**IMPORTANT:** Tegg is part of the main [Egg.js monorepo](https://github.com/eggjs/egg). All build, test, and version management commands should be run from the monorepo root.

The tegg packages are organized as follows within the main monorepo:

```
core/          # 24 core packages - decorators, runtime, metadata, loaders
plugin/        # 10 plugin packages - Egg.js plugins that integrate core functionality
standalone/    # 1 standalone package - standalone runtime without Egg.js
```

**Dependency Management:**

- Uses pnpm workspaces with `catalog:` protocol for shared external dependencies
- Uses `workspace:*` protocol for internal monorepo dependencies (both tegg and egg packages)
- All shared dependency versions centralized in the root `pnpm-workspace.yaml` (not in tegg/)
- `catalogMode: prefer` set in root `.npmrc` for automatic catalog usage
- Tegg packages are defined in root pnpm-workspace.yaml as `tegg/core/*`, `tegg/plugin/*`, `tegg/standalone/*`

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

**Note:** All commands below should be run from the **monorepo root** (`../egg`), not from the tegg directory.

### Build & Clean

```bash
pnpm run build               # Build all packages including tegg (runs build in all workspaces)
pnpm run clean               # Clean all build artifacts including tegg (removes dist, tsbuildinfo)
```

### Testing

All tegg packages use **Vitest** for testing and are integrated with the main Egg.js monorepo test suite.

```bash
pnpm test                    # Run vitest tests for all packages (from monorepo root)
pnpm run test:cov            # Run tests with coverage
pnpm run ci                  # Full CI: vitest with coverage and bail on first failure
```

**Note:** Tests are configured in the monorepo root `vitest.config.ts` which includes all tegg packages (`tegg/core/*`, `tegg/plugin/*`, `tegg/standalone/*`).

### Type Checking & Linting

```bash
pnpm run typecheck           # Clean and type check all workspaces (including tegg)
pnpm run lint                # Run oxlint with type-aware checking on all packages
pnpm run fmtcheck            # Check code formatting with oxfmt
```

**Note:** oxlint automatically runs with `--type-aware` flag for enhanced TypeScript checking.

### Version Management

**Note:** Run these commands from the monorepo root (`../egg`).

```bash
pnpm run version:patch       # Bump patch version (0.0.X)
pnpm run version:minor       # Bump minor version (0.X.0)
pnpm run version:major       # Bump major version (X.0.0)
pnpm run version:prepatch    # Bump to next prerelease patch version
pnpm run version:preminor    # Bump to next prerelease minor version
pnpm run version:premajor    # Bump to next prerelease major version
pnpm run version:alpha       # Bump prerelease alpha version
pnpm run version:beta        # Bump prerelease beta version
pnpm run version:rc          # Bump prerelease rc version
```

### Working with Individual Packages

**Note:** Run from the monorepo root to work with individual tegg packages.

```bash
# Install dependencies
pnpm install                          # Install all dependencies using catalog versions

# Type check specific packages
pnpm -r run typecheck                 # Type check all packages recursively
pnpm --filter @eggjs/tegg-runtime run typecheck

# Build specific packages
pnpm --filter @eggjs/metadata run build
pnpm --filter @eggjs/tegg-runtime run build

# Clean specific package
pnpm --filter @eggjs/tegg-runtime run clean
```

**Note:** Individual tegg packages don't have test scripts in their package.json. Tests are run via the monorepo root vitest configuration.

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

## Multi-App Isolation (TeggScope) — MUST follow

Tegg supports multiple apps booting and serving requests **concurrently in one
process** without cross-talk. This is built on `TeggScope`
(`@eggjs/tegg-types`), a type-free `AsyncLocalStorage<Map<symbol, unknown>>`.
Each app owns a per-app "bag" (`app._teggScopeBag`); per-app state lives in
slots inside that bag, and the active bag is established with
`TeggScope.run(app._teggScopeBag, ...)`. Per-app singletons resolve via the same
old static call sites (e.g. `EggPrototypeFactory.instance`) — they now read the
current scope instead of a process global.

When you touch tegg core/plugins, follow these rules:

1. **Never add new process-global mutable runtime state.** A `static` field /
   `Map` / singleton that holds per-app data WILL leak across concurrent apps.
   If you need such state, back it with a `TeggScope` slot:

   ```ts
   import { TeggScope } from '@eggjs/tegg-types';
   const X_SLOT = Symbol('tegg:<pkg>:<name>'); // module-private, never exported
   export class X {
     static get instance(): X {
       return TeggScope.resolve(X_SLOT, () => new X(), 'X.instance');
     }
   }
   ```

   Import `TeggScope` **only** from `@eggjs/tegg-types`; never import another
   package's slot. A package that imports `TeggScope` must declare
   `@eggjs/tegg-types` as a direct dependency.

2. **Shared, app-agnostic registries stay global.** Class/type-keyed maps
   populated at import time with app-agnostic values (e.g.
   `EggPrototypeCreatorFactory` creator map, `registerEggObjectCreateMethod`,
   `registerLoadUnitInstanceClass`) must NOT be scoped. Only state that holds
   per-app instances/data is scoped. (`LoadUnitFactory`'s creator map is
   two-tier: a global base for import-time creators + a per-app overlay for
   boot-time, app-capturing creators.)

3. **Lifecycle-hook registration must run in the app scope.** Any plugin boot
   that calls `app.{loadUnit,eggPrototype,eggObject,eggContext,loadUnitInstance}LifecycleUtil.registerLifecycle(hook)`
   MUST wrap it in `TeggScope.run(this.app._teggScopeBag, () => { ... })` (and
   the matching `deleteLifecycle` in `beforeClose`). The lifecycle utils are
   per-app, so an unwrapped registration lands in the wrong bag and the hook
   never fires during boot. Do **not** register lifecycle hooks in the boot
   **constructor** — `app._teggScopeBag` does not exist yet; do it in
   `configWillLoad`/`configDidLoad`/`didLoad`.

4. **Resolve egg objects per-app.** To get a proto from a class, prefer
   `EggPrototypeFactory.instance.getPrototypeByClazz(clazz)` (per-app) before
   falling back to `PrototypeUtil.getClazzProto(clazz)` (a process-global slot
   on the class, overwritten by concurrent boot). `ctx.getEggObject` /
   `app.getEggObject` already do this and wrap in the app scope.

5. **Escape points** — code that runs **detached** from the request must
   re-establish the scope. Capture `const bag = TeggScope.current()` at
   registration/scheduling and re-enter `TeggScope.run(bag, cb)` inside the
   callback for: emitter listeners triggered later (`res.on('close')`,
   `signal.addEventListener('abort')`), fire-and-forget `EventBus.emit` from a
   detached context, and timers created outside a scope. Timers/promises created
   **inside** an active scope inherit it automatically — no wrap needed.

6. **Strict-mode fuse.** Under true multi-app (`> 1` live app) any access that
   escapes to the process-default bag throws in dev / warns in prod. If you see
   `[tegg] TeggScope escaped to the process-default bag`, you have an unwrapped
   access — wrap the relevant boot/request/escape path in `TeggScope.run`.

7. **Single app is unchanged.** With one app the default bag is used silently
   and the fuse never fires, so existing single-app behavior and tests are
   unaffected. Add multi-app regression coverage (two concurrent apps sharing a
   module) when you change loader/runtime/lifecycle/eventbus behavior — see
   `tegg/plugin/tegg/test/MultiApp.test.ts`.

**Performance:** `TeggScope.resolve` adds ~8 ns/access and `TeggScope.run`
~5 ns/call over a plain static read (Node 22); egg already runs on
AsyncLocalStorage, so there is no new process-wide async penalty. The cost is
negligible relative to real request work. The per-app lifecycle-util facade is a
`Proxy` (~27 ns/call) — fine in practice; replace with an explicit delegating
object only if a future profile shows it matters.

## Common Patterns

### Creating a New Core Package

1. Add to `tegg/core/` directory within the main monorepo
2. Include `tsconfig.json` extending `@eggjs/tsconfig`
3. Add standard scripts to `package.json`:
   - `"typecheck": "tsgo --noEmit"`
4. Export public API through `src/index.ts`
5. Use `workspace:*` for internal dependencies and `catalog:` for external dependencies

### Creating a New Plugin

1. Add to `tegg/plugin/` directory within the main monorepo
2. Define `eggPlugin` in `package.json` with dependencies
3. Create `app.ts` for initialization
4. Add tests using Vitest and `@eggjs/mock`
5. Tests will be automatically discovered by the root `vitest.config.ts`

### Working with TypeScript

- Use `emitDecoratorMetadata` for type inference in injection
- `design:type` and `design:paramtypes` are used for automatic dependency resolution
- All packages target ESM with `.js` extensions in imports
