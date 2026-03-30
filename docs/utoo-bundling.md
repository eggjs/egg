# Utoo Bundling for Egg Projects

## Overview of Utoo

[Utoo](https://github.com/utooland/utoo) (`ut` CLI, v1.0.8) is a unified frontend toolchain with three core components:

1. **Package Manager** (`ut install`) - Rust-based npm-compatible dependency resolver
2. **Bundler** (`@utoo/pack` / `up build`) - Powered by **Turbopack** (from Next.js/Vercel)
3. **Web Version** (`@utoo/web`) - WASM-based browser variant

The bundler is the relevant piece for snapshot construction. It uses Turbopack as its core engine, with SWC for TypeScript/JavaScript transformation and NAPI bindings to Node.js.

### CLI Usage

```bash
# Install @utoo/pack-cli (bundler CLI)
ut x @utoo/pack-cli -- build --help

# Build a project
ut x @utoo/pack-cli -- build -p ./my-project

# Or use the `up` alias
up build
up build --webpack  # webpack.config.js compatibility mode
```

### Configuration (`utoopack.json`)

```json
{
  "entry": [{ "import": "./src/index.ts", "name": "main" }],
  "target": "node 22.18",
  "output": { "path": "./dist", "clean": true },
  "sourceMaps": true,
  "optimization": {
    "moduleIds": "named",
    "minify": false,
    "treeShaking": true
  },
  "externals": {
    "some-native-addon": "commonjs some-native-addon"
  },
  "define": {
    "process.env.NODE_ENV": "\"production\""
  }
}
```

### Key Capabilities

| Feature                  | Support                           |
| ------------------------ | --------------------------------- |
| TypeScript/TSX           | Yes (via SWC)                     |
| ESM output               | Yes                               |
| CommonJS output          | Yes                               |
| Node.js target           | Yes (`target: "node X.Y"`)        |
| Tree-shaking             | Yes                               |
| Code splitting           | Partial                           |
| Externals                | Yes (commonjs/esm format control) |
| Source maps              | Yes                               |
| Webpack compat mode      | Yes (`--webpack` flag)            |
| Dynamic `require()`      | Limited - static analysis only    |
| `globby.sync()` patterns | Not supported at bundle time      |
| Native addons (.node)    | Must be marked as externals       |

---

## Egg Framework Loading Architecture

### How Egg Loads at Runtime

Egg uses a **convention-based, dynamic loading** pattern. The `EggLoader` class (in `@eggjs/core`) discovers and loads files at runtime:

```
1. loadPlugin()      - Read config/plugin.ts, resolve plugin paths from node_modules
2. loadConfig()      - Merge config.default + config.{env} from plugins → framework → app
3. loadExtend()      - Merge app/extend/(context|request|response|application|helper).ts
4. loadCustomLoader() - User-defined custom loaders
5. loadService()     - Discover app/service/**/*.ts via globby
6. loadMiddleware()  - Discover app/middleware/**/*.ts via globby
7. loadController()  - Discover app/controller/**/*.ts via globby
8. loadRouter()      - Import app/router.ts and call with app instance
```

### Critical Dynamic Patterns

#### 1. File Discovery via `globby.sync()`

```typescript
// packages/core/src/loader/file_loader.ts:196
const filepaths = globby.sync(files, { cwd: directory });
```

Controllers, services, and middlewares are discovered by scanning directories at runtime. No static imports exist.

#### 2. Dynamic Import via `importModule()`

```typescript
// packages/core/src/utils/index.ts:86
const obj = await importModule(filepath, { importDefaultOnly: true });
```

Every discovered file is imported dynamically. The bundler cannot trace these imports.

#### 3. Plugin Resolution from `node_modules`

```typescript
// packages/egg/src/config/plugin.ts
export default {
  onerror: { enable: true, package: '@eggjs/onerror' },
  session: { enable: true, package: '@eggjs/session' },
  // 13+ built-in plugins...
};
```

Plugins resolved dynamically from `node_modules` at startup, each providing their own controllers/services/config/extends.

#### 4. Config as Functions

```typescript
// Config files can export functions
export default (appInfo) => ({
  keys: appInfo.name + '_secret',
});
```

Config loading executes functions with runtime app info - not statically analyzable.

#### 5. Multi-Process Architecture

```typescript
// packages/egg/src/lib/start.ts
const agent = new AgentClass({ ...options });
await agent.ready();
const application = new ApplicationClass({ ...options });
```

Agent and Application run separately with different loaders (`AgentWorkerLoader` vs `AppWorkerLoader`).

---

## Bundling Analysis

### What Can Be Bundled

1. **Framework code** - `egg`, `@eggjs/core`, `@eggjs/koa`, `@eggjs/utils` - all are static imports
2. **Plugin packages** - `@eggjs/onerror`, `@eggjs/session`, etc. - statically importable
3. **Third-party dependencies** - lodash, utility, etc.

### What Cannot Be Bundled (without transformation)

1. **App code** (controllers, services, middleware) - discovered via globby at runtime
2. **Config files** - loaded dynamically with `importModule()`, executed as functions
3. **Extend files** - loaded dynamically, merged into prototypes
4. **Router file** - dynamically imported and called
5. **Plugin ordering** - computed at runtime via sequencify algorithm
6. **Native addons** - must remain external

### Root Cause

The fundamental issue is that Egg's loader uses **runtime file system scanning** (`globby.sync`) followed by **dynamic imports** (`importModule`). A bundler performs **static analysis** of import/require statements - it cannot follow these patterns.

---

## Integration Strategy for Snapshot Workflow

### Approach: Two-Phase Bundle

Rather than trying to bundle the entire egg app into a single file (which fights against Egg's architecture), we should use a **two-phase approach**:

#### Phase 1: Bundle Framework Dependencies

Use utoo to bundle all **framework and plugin code** into a single file that can be snapshot-ted:

```json
{
  "entry": [{ "import": "./snapshot-entry.ts", "name": "egg-snapshot" }],
  "target": "node 22.18",
  "output": { "path": "./dist", "clean": true },
  "optimization": { "minify": false, "treeShaking": false },
  "externals": {}
}
```

Where `snapshot-entry.ts` explicitly imports all framework code:

```typescript
// snapshot-entry.ts - Pre-import everything for snapshot
import 'egg';
import '@eggjs/core';
import '@eggjs/koa';
import '@eggjs/utils';
// All built-in plugins
import '@eggjs/onerror';
import '@eggjs/session';
import '@eggjs/security';
// ... etc
```

**Benefit**: All framework code in a single file = faster `--build-snapshot` construction.

#### Phase 2: App Code Loaded Normally

App-specific code (controllers, services, middleware, config) is loaded normally via Egg's existing loader at runtime. This code is typically small and app-specific.

### Alternative Approach: Snapshot-Aware Loader

Instead of bundling, create a **snapshot-aware loader** that:

1. **At build time**: Run the normal Egg loader, collect the file manifest (which files were loaded, in what order, with what exports)
2. **Serialize the manifest**: Write a static module map
3. **At snapshot construction**: Load everything using the pre-computed manifest (no globby needed)
4. **At runtime restore**: Skip the loading phase entirely, use the pre-initialized state from snapshot

This avoids bundling entirely and works with Egg's existing architecture:

```typescript
// snapshot-build.ts
const app = await startEgg({ baseDir: '/app' });
// All files are loaded, all plugins resolved, all configs merged
// Now construct the V8 snapshot from this state
```

### Recommended Approach: Hybrid

1. **Use utoo to bundle framework deps** into a pre-loaded module (Phase 1)
2. **Use snapshot-aware loader** for app code (Phase 2 alternative)
3. **Construct V8 snapshot** after both framework and app code are loaded

This maximizes snapshot coverage while respecting Egg's dynamic loading patterns.

---

## Known Issues and Workarounds

### Issue 1: `globby` at Bundle Time

**Problem**: Bundler can't resolve `globby.sync()` calls.
**Workaround**: Don't bundle the loader. Instead, pre-run the loader and snapshot the result.

### Issue 2: Plugin Inter-Dependencies

**Problem**: Plugins have complex dependency ordering computed by `sequencify()`.
**Workaround**: Pre-compute plugin order at build time, serialize as static data.

### Issue 3: Config Merging

**Problem**: Configs are deep-merged from multiple sources with env-specific overrides.
**Workaround**: Pre-merge all configs at build time for the target environment.

### Issue 4: Prototype Extensions

**Problem**: `app/extend/*.ts` files mutate `Context.prototype`, `Application.prototype`, etc.
**Workaround**: Pre-apply all extensions at build time, include in snapshot.

### Issue 5: Native Addons

**Problem**: Some plugins may use native addons (e.g., `better-sqlite3`).
**Workaround**: Mark as externals in utoo config. These cannot be snapshot-ted anyway.

### Issue 6: `tsconfig-paths` Runtime Registration

**Problem**: Egg registers `tsconfig-paths` at runtime for TypeScript path resolution.
**Workaround**: In bundled mode, all paths are already resolved - skip this step.

---

## Utoo Configuration for Egg Framework Bundle

### Minimal Config (`utoopack.json`)

```json
{
  "entry": [
    {
      "import": "./snapshot-entry.ts",
      "name": "egg-framework"
    }
  ],
  "target": "node 22.18",
  "output": {
    "path": "./dist/snapshot",
    "clean": true
  },
  "sourceMaps": false,
  "optimization": {
    "moduleIds": "named",
    "minify": false,
    "treeShaking": false
  },
  "externals": {
    "fsevents": "commonjs fsevents",
    "cpu-features": "commonjs cpu-features"
  }
}
```

**Important settings**:

- `treeShaking: false` - Egg uses many patterns that look unused but are accessed dynamically
- `minify: false` - Snapshot construction doesn't benefit from minification
- `target: "node 22.18"` - Match Egg's minimum Node.js requirement
- Externalize native addons that can't be bundled

### Snapshot Entry File

```typescript
// snapshot-entry.ts
// Framework core
export * from 'egg';

// Built-in plugins (pre-import to include in bundle)
import '@eggjs/onerror';
import '@eggjs/session';
import '@eggjs/security';
import '@eggjs/static';
import '@eggjs/development';
import '@eggjs/watcher';
import '@eggjs/schedule';
import '@eggjs/multipart';
import '@eggjs/i18n';
import '@eggjs/view';
import '@eggjs/logrotator';
import '@eggjs/tracer';

// Key framework dependencies
import '@eggjs/core';
import '@eggjs/koa';
import '@eggjs/router';
import '@eggjs/utils';
import '@eggjs/cookies';
```

---

## Summary

| Aspect                                 | Feasibility      | Notes                                                             |
| -------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| Bundle framework code with utoo        | **High**         | Static imports, well-defined dependency tree                      |
| Bundle app code (controllers/services) | **Low**          | Dynamic loading via globby + importModule                         |
| Bundle plugin code                     | **Medium**       | Can pre-import but plugin loading logic is dynamic                |
| Bundle configs                         | **Low**          | Functions, env-specific, deep-merged at runtime                   |
| Full single-file bundle                | **Not feasible** | Egg's architecture fundamentally relies on runtime file discovery |

**Recommendation**: Use utoo to bundle framework dependencies for faster snapshot construction, but rely on the snapshot-aware loader (not bundling) for app-specific code. The V8 snapshot should capture the fully-initialized application state after all dynamic loading completes.
