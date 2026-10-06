---
title: 'TypeScript and ESM'
description: 'Typed configuration, module loading, and deployment in Egg 4'
---

# TypeScript and ESM

Egg's convention-based loading lets applications organize controllers, services, and configuration in predictable directories. As TypeScript and ESM become more common, those conventions also need to describe types, module exports, and build output. Egg 4 continues the TypeScript rewrite and improves configuration factories, plugin entry points, and loading rules. Editors can identify interface mismatches earlier, and contributors can check changes across packages against shared type contracts.

ESM publishing, typed configuration factories, file loading, and development transpilation together form the development workflow. Coordinate three decisions: the application's module format, how TypeScript executes during development, and which artifacts production actually loads.

## Choosing an application module format

The egg package declares type: module. Published exports point to JavaScript in dist, while workspace exports point to TypeScript in src, with publishConfig defining release entry points. This lets workspace development use source directly and consumers use built artifacts. When reading the source package.json, inspect both development and publication entries before assuming users will execute src/index.ts.

Applications still have [CommonJS and ESM options](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-commonjs/package.json). The repository retains a complete type: commonjs example, while the new TypeScript template uses type: module and NodeNext. The Node.js baseline is 22.18.0, supporting modern module interoperability. Third-party export shapes, default imports, and initialization behavior still need individual checks. Teams retaining CommonJS can upgrade the runtime and official dependencies first, then migrate modules gradually.

For ESM, review package.json, compiler module settings, relative import extensions, and code using require or __dirname together. Consistent module boundaries matter more than changing every file extension. Reusable plugin authors should also verify root and public subpath exports so consumers have a clear import contract.

## Faster feedback from typed configuration

Configuration is a common source of misspelled keys and incorrect nested field types. [defineConfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts#L7-L45) accepts PartialEggConfig, a deeply optional form of EggAppConfig, so you can specify only the fields you override. This example sets logging levels and the HTTP client's default request timeout, with editor completion and type checking:

```typescript
// config/config.default.ts
import { defineConfig } from 'egg';

export default defineConfig({
  logger: { level: 'INFO', consoleLevel: 'WARN' },
  httpclient: { request: { timeout: 5000 } },
});
```

Use defineConfigFactory when configuration needs the application name, directories, or environment. It accepts a function taking EggAppInfo and returns that function for the framework to call. This example keeps environment-dependent configuration:

```typescript
import { defineConfigFactory } from 'egg';

export default defineConfigFactory((appInfo) => ({
  logger: {
    level: appInfo.env === 'local' ? 'DEBUG' : 'INFO',
    consoleLevel: 'WARN',
  },
}));
```

Both helpers are lightweight: they return the configuration object or factory unchanged. Use defineConfig for objects and defineConfigFactory for functions. They establish types while authoring configuration; environment variables, remote configuration, and other runtime inputs still require explicit parsing and validation.

Custom fields also need stable type declarations. Continue using module augmentation for services, contexts, and business configuration, avoiding broad global any declarations merely to pass compilation. Types that match real contracts give more reliable feedback during renaming and refactoring.

## Plugin factories combine entry points and metadata

[definePluginFactory](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts#L47-L103) puts a plugin's name, enabled state, path, and dependencies behind an importable entry point. For the current Redis plugin, config/plugin.ts can declare:

```typescript
import redisPlugin from '@eggjs/redis';

export default {
  ...redisPlugin({ env: ['local', 'unittest'] }),
};
```

Authors supply name, enable, and path, with optional dependencies, optionalDependencies, and env. Official plugins commonly use import.meta.dirname for their directory. The factory returns a configuration record keyed by the plugin name. Caller options shallowly override metadata, while the name remains fixed by the plugin. It also sets skipMerge to prevent another merge of package.json's eggPlugin fields.

Editors can follow the import to the entry point, reducing scattered package-name strings and making metadata easier to maintain during refactoring. Traditional enable and package declarations remain in compatibility configuration, so existing projects can migrate one plugin at a time. Check environment restrictions and dependencies carefully to preserve the original enabled scope.

## File extensions and output directories

Egg's convention-based directory loading includes .mjs and .cjs by default. With TypeScript enabled, it also loads .ts and excludes .d.ts. When a directory contains a TypeScript source file alongside a same-name .js, .mjs, or .cjs artifact, FileLoader prefers the .ts candidate to avoid loading the property twice. This makes coexistence more robust during development, although a clear output layout remains easier to diagnose.

[EggLoader.resolveModule](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/core/src/loader/egg_loader.ts#L1818-L1869) adds a fallback when an original path cannot be resolved. It first reads egg.outDir from package.json, then tries compilerOptions.outDir declared directly in tsconfig.json if needed. An application can configure:

```json
{
  "egg": {
    "outDir": "dist"
  }
}
```

For example, if config/config.default under the application root cannot be resolved, the loader can try dist/config/config.default.js and .mjs. This supplements failed resolution only for paths within the application's baseDir. Fallback candidates exclude .cjs. It does not compile source or automatically redirect every directory scan to dist.

The automatic tsconfig reader uses JSON.parse, so do not depend on it to handle comments, inheritance, or full TypeScript configuration semantics. For complex configurations, set egg.outDir explicitly and verify directory layout, startup entry points, and plugin files in the deployment package. The fallback helps migration; a clear artifact structure provides a reliable deployment contract.

## Separate transpilation from type checking

egg-bin's default TypeScript loader is @oxc-node/core/register. One --import entry registers TypeScript loading for CommonJS and ESM. The implicit default resolves from the CLI's own dependencies so an older oxc installation in the application does not shadow it. Explicit --tscompiler still permits other compilers, and tsconfig-paths/register continues to support path aliases.

Fast transpilation makes development startup lighter, but a running application does not prove type correctness. Use egg-bin dev for the development server and add a separate check without output to CI. This scripts fragment uses the TypeScript compiler already included by the template:

```json
"scripts": {
  "dev": "egg-bin dev",
  "typecheck": "tsc --noEmit",
  "build": "tsc"
}
```

Keep production builds explicit too. The current production starter does not automatically enable the development transpiler because egg.typescript is set; that field primarily affects source map settings. Generate JavaScript before release and rehearse startup with the actual artifacts to catch missing deployment files or dependencies.

The framework repository uses tsgo --noEmit extensively and configures @typescript/native-preview; workspace TypeScript remains in the 5.9 series. native-preview is a preview toolchain that application teams can evaluate independently. The public [@eggjs/tsconfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/tsconfig/tsconfig.json) defaults to NodeNext and retains decorator settings. isolatedDeclarations and verbatimModuleSyntax default to false, while the repository root adds stricter options for library maintenance. Applications can choose settings appropriate to their own needs.

## Shared contracts and application declarations

[@eggjs/typings](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/typings/src/index.ts) extracts contracts used by several foundational packages, including BundleModuleLoader, ModuleImporter, and related global declarations. These support collaboration between tools and the framework loader. A shared contract, for example, reduces duplicated declarations when a test runner takes over module imports. This is an infrastructure interface layer; ordinary Controller, Context, and application configuration types remain available through egg's public entry point.

Review automatic type generation during upgrades. egg-bin removed egg-ts-helper integration. --declarations and --dts are still accepted but deprecated and have no effect. If service or controller declarations previously depended on these flags, assign responsibility to an explicit tool or maintenance process and check that CI runs it. Keeping an obsolete command can leave declarations stale without an obvious failure.

Start a migration with a small module: confirm the runtime and module format, convert one configuration file, check a group of plugin entry points, then run type checks, development tests, and artifact startup separately. Investigate failures through type contracts, module resolution, and output paths. This gives each change a clearer validation and rollback path.
